import { createWorker, createScheduler, Worker, Scheduler } from 'tesseract.js';
import sharp from 'sharp';

// Patrones comerciales requeridos:
// 1. Símbolo "$"
// 2. Secuencias de precio (49.900, 49,900, 49900)
// 3. Palabras clave: PRECIO, COSTO, OFERTA, MAYORISTA, WHATSAPP, PROMO, DESCUENTO
// 4. Teléfonos colombianos de 10 dígitos (3XX XXX XXXX o 10 dígitos continuos)
const PRICE_DOLLAR_REGEX = /\$/;
const PRICE_DOT_COMMA_REGEX = /\b\d{1,3}[.,]\d{3}\b/;
const PRICE_PLAIN_REGEX = /\b[1-9]\d{4,5}\b/;
const PRICE_PREFIX_REGEX = /\b(?:precio|costo|valor|pesos|paga|pago|combo)\s*[:=]?\s*[\$]?\s*\d+/i;
const KEYWORDS_REGEX = /\b(?:PRECIO|COSTO|OFERTA|MAYORISTA|MAYOREO|DISTRIBUIDOR|DISTRIBUIDORES|WHATSAPP|WSP|PROMOCION|PROMO|DESCUENTO|LIQUIDACION|RETO|OCTUBRE|GANANCIA)\b/i;
const PHONE_10_DIGITS_REGEX = /\b(?:3\d{2}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})\b/;

// Palabras de costo o distribuidor crítico que NUNCA deben mostrarse al comprador final
const CRITICAL_COST_REGEX = /\b(?:COSTO|MAYORISTA|MAYOREO|DISTRIBUIDOR|DISTRIBUIDORES|VALOR\s+DISTRIBUIDOR|PRECIO\s+DISTRIBUIDOR|GANANCIA)\b/i;

export interface LineMatch {
  text: string;
  matchedPatterns: string[];
  bbox: { x0: number; y0: number; x1: number; y1: number };
  zone: 'top' | 'center' | 'bottom';
  topRatio: number;
  bottomRatio: number;
}

export interface OcrDetectionResult {
  hasBurnedPrice: boolean;
  hasCriticalCost: boolean;
  detectedText: string;
  detectedPatterns: string[];
  matchedLines: LineMatch[];
  imageWidth: number;
  imageHeight: number;
}

export interface ModerationDecision {
  has_burned_price: number;
  detected_text: string | null;
  detected_patterns: string[];
  line_details: LineMatch[];
  clean_gallery_urls: string[];
  correction_applied: 'none' | 'swapped_gallery' | 'crop_top' | 'crop_bottom' | 'crop_both' | 'deactivated';
  crop_top_pct: number;
  crop_bottom_pct: number;
  active_image_url: string;
}

let sharedScheduler: Scheduler | null = null;
let isInitializingScheduler = false;

// Inicializa o reutiliza el Scheduler de Tesseract con 2 workers en paralelo para máximo rendimiento
export async function getSharedOcrScheduler(): Promise<Scheduler> {
  if (sharedScheduler) return sharedScheduler;

  if (isInitializingScheduler) {
    while (isInitializingScheduler) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (sharedScheduler) return sharedScheduler;
  }

  isInitializingScheduler = true;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const scheduler = createScheduler();
    const w1 = await createWorker('spa', 1, {
      cachePath: './data/tesseract-cache',
    });
    const w2 = await createWorker('spa', 1, {
      cachePath: './data/tesseract-cache',
    });
    scheduler.addWorker(w1);
    scheduler.addWorker(w2);
    sharedScheduler = scheduler;
    return sharedScheduler;
  } finally {
    isInitializingScheduler = false;
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (sharedScheduler) {
    try {
      await sharedScheduler.terminate();
    } catch {}
    sharedScheduler = null;
  }
}

/**
 * Escanea un buffer de imagen con Tesseract OCR usando DOBLE PASE en paralelo:
 * - Pase 1: Imagen estándar normalizada.
 * - Pase 2: Imagen con realce de contraste y bordes (rescata textos amarillos, neón o sobre degradados).
 */
export async function detectBurnedTextInImage(imageBuffer: Buffer): Promise<OcrDetectionResult> {
  let normalizedBuf: Buffer;
  let enhancedBuf: Buffer;
  let width = 1000;
  let height = 1000;

  try {
    const sharpInstance = sharp(imageBuffer, { failOn: 'none' });
    const meta = await sharpInstance.metadata();
    width = meta.width || 1000;
    height = meta.height || 1000;

    let pipeline = sharpInstance;
    if (width > 1600 || height > 1600) {
      pipeline = pipeline.resize(1600, 1600, { fit: 'inside' });
    }

    normalizedBuf = await pipeline.png().toBuffer();
    // Pase de alto contraste para rescatar cajas de texto con estilos Dropi
    enhancedBuf = await sharp(normalizedBuf).grayscale().normalize().sharpen().png().toBuffer();
  } catch (err: any) {
    console.warn('[OCR] Imagen corrupta o ilegible por Sharp:', err?.message || err);
    return {
      hasBurnedPrice: false,
      hasCriticalCost: false,
      detectedText: '',
      detectedPatterns: [],
      matchedLines: [],
      imageWidth: 0,
      imageHeight: 0,
    };
  }

  let ret1: any;
  let ret2: any;
  try {
    const scheduler = await getSharedOcrScheduler();
    const results = await Promise.all([
      scheduler.addJob('recognize', normalizedBuf, {}, { blocks: true }),
      scheduler.addJob('recognize', enhancedBuf, {}, { blocks: true }),
    ]);
    ret1 = results[0];
    ret2 = results[1];
  } catch (workerErr: any) {
    console.warn('[OCR] Error en reconocimiento Tesseract, reiniciando scheduler:', workerErr?.message || workerErr);
    await terminateOcrWorker();
    return {
      hasBurnedPrice: false,
      hasCriticalCost: false,
      detectedText: '',
      detectedPatterns: [],
      matchedLines: [],
      imageWidth: width,
      imageHeight: height,
    };
  }

  const combinedText = `${ret1?.data?.text || ''}\n${ret2?.data?.text || ''}`.trim();
  const matchedLines: LineMatch[] = [];
  const allDetectedPatterns: Set<string> = new Set();
  const seenLineKeys = new Set<string>();
  let hasCriticalCost = false;

  const processBlocks = (blocks: any[]) => {
    for (const block of blocks || []) {
      for (const para of block.paragraphs || []) {
        for (const line of para.lines || []) {
          const rawLineText = (line.text || '').trim();
          if (!rawLineText || rawLineText.length < 2) continue;

          const linePatterns: string[] = [];

          // 1. Check "$"
          if (PRICE_DOLLAR_REGEX.test(rawLineText)) {
            linePatterns.push('$');
          }

          // 2. Check precio con punto/coma (ej: 49.900, 129,900)
          const dotMatch = rawLineText.match(PRICE_DOT_COMMA_REGEX);
          if (dotMatch) {
            linePatterns.push(dotMatch[0]);
          }

          // 3. Check precio plano de 5 a 6 dígitos (ej: 49900)
          const plainMatch = rawLineText.match(PRICE_PLAIN_REGEX);
          if (plainMatch && !dotMatch) {
            linePatterns.push(plainMatch[0]);
          }

          // 4. Check prefijo de precio
          const prefixMatch = rawLineText.match(PRICE_PREFIX_REGEX);
          if (prefixMatch) {
            linePatterns.push(prefixMatch[0]);
          }

          // 5. Check palabras clave (PRECIO, COSTO, OFERTA, MAYORISTA, WHATSAPP, etc.)
          const kwMatch = rawLineText.match(KEYWORDS_REGEX);
          if (kwMatch) {
            linePatterns.push(kwMatch[0].toUpperCase());
          }

          // 6. Check palabras críticas de costo/proveedor
          if (CRITICAL_COST_REGEX.test(rawLineText)) {
            hasCriticalCost = true;
          }

          // 7. Check teléfono de 10 dígitos
          const phoneMatch = rawLineText.match(PHONE_10_DIGITS_REGEX);
          if (phoneMatch) {
            linePatterns.push(phoneMatch[0]);
          }

          if (linePatterns.length > 0) {
            linePatterns.forEach((p) => allDetectedPatterns.add(p));

            const topRatio = Math.max(0, Math.min(1, line.bbox.y0 / height));
            const bottomRatio = Math.max(0, Math.min(1, line.bbox.y1 / height));

            // Evitar duplicar la misma línea detectada en ambos pases
            const lineKey = `${Math.round(topRatio * 50)}_${rawLineText.slice(0, 15).toLowerCase()}`;
            if (seenLineKeys.has(lineKey)) continue;
            seenLineKeys.add(lineKey);

            // Franja superior: <= 22% del alto
            // Franja inferior: >= 78% del alto
            // Centro: 22% a 78%
            let zone: 'top' | 'center' | 'bottom' = 'center';
            if (bottomRatio <= 0.22) {
              zone = 'top';
            } else if (topRatio >= 0.78) {
              zone = 'bottom';
            } else {
              zone = 'center';
            }

            matchedLines.push({
              text: rawLineText,
              matchedPatterns: linePatterns,
              bbox: line.bbox,
              zone,
              topRatio,
              bottomRatio,
            });
          }
        }
      }
    }
  };

  processBlocks(ret1?.data?.blocks);
  processBlocks(ret2?.data?.blocks);

  return {
    hasBurnedPrice: allDetectedPatterns.size > 0,
    hasCriticalCost,
    detectedText: combinedText,
    detectedPatterns: Array.from(allDetectedPatterns),
    matchedLines,
    imageWidth: width,
    imageHeight: height,
  };
}

/**
 * Motor de decisión de corrección automática según las reglas de negocio de PideFácil:
 * a) Si otra imagen de la galería está limpia, ponerla como imagen principal.
 * b) Si el texto detectado está en la franja superior o inferior (UN SOLO EXTREMO y <= 18%), aplicar recorte dinámico.
 * c) Si el texto dice "COSTO" / "MAYORISTA", o está en ambos extremos (volante publicitario), o en el centro: DESACTIVAR.
 */
export function determineAutomaticCorrection(options: {
  primaryOcr: OcrDetectionResult;
  originalImageUrl: string;
  cleanGalleryUrls: string[];
}): ModerationDecision {
  const { primaryOcr, originalImageUrl, cleanGalleryUrls } = options;

  // Si la imagen principal ya está 100% limpia:
  if (!primaryOcr.hasBurnedPrice || primaryOcr.matchedLines.length === 0) {
    return {
      has_burned_price: 0,
      detected_text: primaryOcr.detectedText || null,
      detected_patterns: [],
      line_details: [],
      clean_gallery_urls: cleanGalleryUrls,
      correction_applied: 'none',
      crop_top_pct: 0,
      crop_bottom_pct: 0,
      active_image_url: originalImageUrl,
    };
  }

  // 1. REGLA 2a: Si otra foto de la galería está limpia, cambiar la foto principal
  if (cleanGalleryUrls.length > 0) {
    return {
      has_burned_price: 1,
      detected_text: primaryOcr.detectedText,
      detected_patterns: primaryOcr.detectedPatterns,
      line_details: primaryOcr.matchedLines,
      clean_gallery_urls: cleanGalleryUrls,
      correction_applied: 'swapped_gallery',
      crop_top_pct: 0,
      crop_bottom_pct: 0,
      active_image_url: cleanGalleryUrls[0],
    };
  }

  // Si tiene palabras explícitas de costo proveedor ("COSTO", "MAYORISTA", "DISTRIBUIDOR"),
  // NO se arriesga recorte parcial en la tienda del cliente: Desactivar directamente si no hay galería limpia.
  if (primaryOcr.hasCriticalCost) {
    return {
      has_burned_price: 1,
      detected_text: primaryOcr.detectedText,
      detected_patterns: primaryOcr.detectedPatterns,
      line_details: primaryOcr.matchedLines,
      clean_gallery_urls: [],
      correction_applied: 'deactivated',
      crop_top_pct: 0,
      crop_bottom_pct: 0,
      active_image_url: originalImageUrl,
    };
  }

  const hasCenterLines = primaryOcr.matchedLines.some((l) => l.zone === 'center');
  const topLines = primaryOcr.matchedLines.filter((l) => l.zone === 'top');
  const bottomLines = primaryOcr.matchedLines.filter((l) => l.zone === 'bottom');

  // Si tiene textos en AMBOS extremos (arriba y abajo), es un banner/flyer publicitario completo:
  // Recortar arriba y abajo destruiría el producto (~40% recortado). Se desactiva.
  if (topLines.length > 0 && bottomLines.length > 0) {
    return {
      has_burned_price: 1,
      detected_text: primaryOcr.detectedText,
      detected_patterns: primaryOcr.detectedPatterns,
      line_details: primaryOcr.matchedLines,
      clean_gallery_urls: [],
      correction_applied: 'deactivated',
      crop_top_pct: 0,
      crop_bottom_pct: 0,
      active_image_url: originalImageUrl,
    };
  }

  // 2. REGLA 2b: Si el texto está confinado en un SOLO extremo (superior o inferior)
  if (!hasCenterLines) {
    // Caso 1: Solo en franja superior
    if (topLines.length > 0 && bottomLines.length === 0) {
      const maxBottom = Math.max(...topLines.map((l) => l.bottomRatio));
      const cropTopPct = Math.ceil(maxBottom * 100) + 3;

      if (cropTopPct <= 18) {
        return {
          has_burned_price: 1,
          detected_text: primaryOcr.detectedText,
          detected_patterns: primaryOcr.detectedPatterns,
          line_details: primaryOcr.matchedLines,
          clean_gallery_urls: [],
          correction_applied: 'crop_top',
          crop_top_pct: Math.max(12, cropTopPct),
          crop_bottom_pct: 0,
          active_image_url: originalImageUrl,
        };
      }
    }

    // Caso 2: Solo en franja inferior
    if (bottomLines.length > 0 && topLines.length === 0) {
      const minTop = Math.min(...bottomLines.map((l) => l.topRatio));
      const cropBottomPct = Math.ceil((1 - minTop) * 100) + 3;

      if (cropBottomPct <= 18) {
        return {
          has_burned_price: 1,
          detected_text: primaryOcr.detectedText,
          detected_patterns: primaryOcr.detectedPatterns,
          line_details: primaryOcr.matchedLines,
          clean_gallery_urls: [],
          correction_applied: 'crop_bottom',
          crop_top_pct: 0,
          crop_bottom_pct: Math.max(12, cropBottomPct),
          active_image_url: originalImageUrl,
        };
      }
    }
  }

  // 3. REGLA 2c: Texto en el centro, costo invasivo o recorte > 18% -> Desactivar producto
  return {
    has_burned_price: 1,
    detected_text: primaryOcr.detectedText,
    detected_patterns: primaryOcr.detectedPatterns,
    line_details: primaryOcr.matchedLines,
    clean_gallery_urls: [],
    correction_applied: 'deactivated',
    crop_top_pct: 0,
    crop_bottom_pct: 0,
    active_image_url: originalImageUrl,
  };
}
