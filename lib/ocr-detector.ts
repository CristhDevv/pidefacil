import { createWorker, Worker } from 'tesseract.js';
import sharp from 'sharp';

// Patrones comerciales requeridos:
// 1. Símbolo "$"
// 2. Secuencias de precio (49.900, 49,900, 49900)
// 3. Palabras clave: PRECIO, OFERTA, MAYORISTA, WHATSAPP, PROMO, DESCUENTO
// 4. Teléfonos colombianos de 10 dígitos (3XX XXX XXXX o 10 dígitos continuos)
const PRICE_DOLLAR_REGEX = /\$/;
const PRICE_DOT_COMMA_REGEX = /\b\d{1,3}[.,]\d{3}\b/;
const PRICE_PLAIN_REGEX = /\b[1-9]\d{4,5}\b/;
const PRICE_PREFIX_REGEX = /\b(?:precio|costo|valor|pesos|paga|pago|combo)\s*[:=]?\s*[\$]?\s*\d+/i;
const KEYWORDS_REGEX = /\b(?:PRECIO|OFERTA|MAYORISTA|MAYOREO|DISTRIBUIDOR|WHATSAPP|WSP|PROMOCION|PROMO|DESCUENTO|LIQUIDACION)\b/i;
const PHONE_10_DIGITS_REGEX = /\b(?:3\d{2}[-.\s]?\d{3}[-.\s]?\d{4}|\d{10})\b/;

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

let sharedWorker: Worker | null = null;
let isInitializingWorker = false;

// Inicializa o reutiliza el Worker de Tesseract para máximo rendimiento
export async function getSharedOcrWorker(): Promise<Worker> {
  if (sharedWorker) return sharedWorker;

  if (isInitializingWorker) {
    while (isInitializingWorker) {
      await new Promise((r) => setTimeout(r, 100));
    }
    if (sharedWorker) return sharedWorker;
  }

  isInitializingWorker = true;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    sharedWorker = await createWorker('spa', 1, {
      cachePath: './data/tesseract-cache',
    });
    return sharedWorker;
  } finally {
    isInitializingWorker = false;
  }
}

export async function terminateOcrWorker(): Promise<void> {
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch {}
    sharedWorker = null;
  }
}

/**
 * Escanea un buffer de imagen con Tesseract OCR y busca patrones comerciales y sus posiciones verticales
 */
export async function detectBurnedTextInImage(imageBuffer: Buffer): Promise<OcrDetectionResult> {
  const meta = await sharp(imageBuffer).metadata();
  const width = meta.width || 1000;
  const height = meta.height || 1000;

  const worker = await getSharedOcrWorker();
  const ret = await worker.recognize(imageBuffer, {}, { blocks: true });

  const fullText = (ret.data.text || '').trim();
  const matchedLines: LineMatch[] = [];
  const allDetectedPatterns: Set<string> = new Set();

  // Recorrer los bloques y líneas con coordenadas precisas
  for (const block of ret.data.blocks || []) {
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

        // 5. Check palabras clave (PRECIO, OFERTA, MAYORISTA, WHATSAPP, etc.)
        const kwMatch = rawLineText.match(KEYWORDS_REGEX);
        if (kwMatch) {
          linePatterns.push(kwMatch[0].toUpperCase());
        }

        // 6. Check teléfono de 10 dígitos
        const phoneMatch = rawLineText.match(PHONE_10_DIGITS_REGEX);
        if (phoneMatch) {
          linePatterns.push(phoneMatch[0]);
        }

        if (linePatterns.length > 0) {
          linePatterns.forEach((p) => allDetectedPatterns.add(p));

          const topRatio = Math.max(0, Math.min(1, line.bbox.y0 / height));
          const bottomRatio = Math.max(0, Math.min(1, line.bbox.y1 / height));

          // Clasificación de Zona:
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

  return {
    hasBurnedPrice: allDetectedPatterns.size > 0,
    detectedText: fullText,
    detectedPatterns: Array.from(allDetectedPatterns),
    matchedLines,
    imageWidth: width,
    imageHeight: height,
  };
}

/**
 * Motor de decisión de corrección automática según las reglas del usuario:
 * a) Si otra imagen de la galería está limpia, ponerla como imagen principal.
 * b) Si el texto está en franja superior o inferior (fuera del centro), aplicar recorte (12-22%).
 * c) Si ninguna imagen sirve ni se puede recortar sin dañar el producto (centro), desactivar el producto.
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

  // 2. REGLA 2b: Evaluar si el texto está en franjas recortables (superior o inferior)
  const hasCenterLines = primaryOcr.matchedLines.some((l) => l.zone === 'center');
  const topLines = primaryOcr.matchedLines.filter((l) => l.zone === 'top');
  const bottomLines = primaryOcr.matchedLines.filter((l) => l.zone === 'bottom');

  if (!hasCenterLines && (topLines.length > 0 || bottomLines.length > 0)) {
    let cropTopPct = 0;
    let cropBottomPct = 0;

    if (topLines.length > 0) {
      const maxBottom = Math.max(...topLines.map((l) => l.bottomRatio));
      // Margen de seguridad +3%, clamped entre 12% y 22%
      cropTopPct = Math.min(22, Math.max(12, Math.ceil(maxBottom * 100) + 3));
    }

    if (bottomLines.length > 0) {
      const minTop = Math.min(...bottomLines.map((l) => l.topRatio));
      // Margen de seguridad +3%, clamped entre 12% y 22%
      cropBottomPct = Math.min(22, Math.max(12, Math.ceil((1 - minTop) * 100) + 3));
    }

    const correctionType =
      cropTopPct > 0 && cropBottomPct > 0
        ? 'crop_both'
        : cropTopPct > 0
        ? 'crop_top'
        : 'crop_bottom';

    return {
      has_burned_price: 1,
      detected_text: primaryOcr.detectedText,
      detected_patterns: primaryOcr.detectedPatterns,
      line_details: primaryOcr.matchedLines,
      clean_gallery_urls: [],
      correction_applied: correctionType,
      crop_top_pct: cropTopPct,
      crop_bottom_pct: cropBottomPct,
      active_image_url: originalImageUrl,
    };
  }

  // 3. REGLA 2c: Texto en el centro o recorte invasivo -> Desactivar producto
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
