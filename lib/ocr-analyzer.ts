import sharp from 'sharp';
import { createWorker, Worker } from 'tesseract.js';
import path from 'path';

export interface BoundingBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface DetectedLine {
  text: string;
  bbox: BoundingBox;
  zone: 'top' | 'bottom' | 'center';
  lineTopPct: number;
  lineBottomPct: number;
  patternsFound: string[];
}

export interface OcrImageAnalysisResult {
  hasBurnedPrice: boolean;
  detectedText: string;
  matchedPatterns: string[];
  lines: DetectedLine[];
  dimensions: { width: number; height: number };
  hasTopMatches: boolean;
  hasBottomMatches: boolean;
  hasCenterMatches: boolean;
  recommendedCropTopPct: number;
  recommendedCropBottomPct: number;
}

export interface CorrectionDecision {
  correction_applied: 'none' | 'swapped_gallery' | 'crop_top' | 'crop_bottom' | 'crop_both' | 'deactivated';
  crop_top_pct: number;
  crop_bottom_pct: number;
  active_image_url: string;
  reason: string;
}

// Inicializa y reutiliza el Worker de Tesseract en español
let sharedWorker: Worker | null = null;
let isInitializingWorker = false;

export async function getSharedOcrWorker(): Promise<Worker> {
  if (sharedWorker) return sharedWorker;
  while (isInitializingWorker) {
    await new Promise((r) => setTimeout(r, 100));
    if (sharedWorker) return sharedWorker;
  }
  isInitializingWorker = true;
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const cacheDir = path.resolve('./data/tesseract-cache');
    const worker = await createWorker('spa', 1, {
      cachePath: cacheDir,
    });
    sharedWorker = worker;
    return worker;
  } finally {
    isInitializingWorker = false;
  }
}

export async function terminateSharedOcrWorker(): Promise<void> {
  if (sharedWorker) {
    try {
      await sharedWorker.terminate();
    } catch {}
    sharedWorker = null;
  }
}

/**
 * Descarga una imagen desde su URL con timeout y control de errores
 */
export async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PideFacilOcrBot/1.0)',
      },
      signal: AbortSignal.timeout(12000),
    });
    if (!res.ok) return null;
    const arrayBuffer = await res.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } catch {
    return null;
  }
}

/**
 * Expresiones regulares para detectar precios quemados, ganchos comerciales y teléfonos
 */
const PATTERNS = {
  dollarSymbol: /[\$]|US\$|COP\$/i,
  // Precios con punto o coma de miles colombiano (ej: 49.900, 49,900, 129.900)
  colombianThousandPrice: /\b\d{1,3}[.,]\d{3}\b/,
  // Números de 5 a 6 dígitos típicos de precios COP (ej: 49900, 129900, 89900)
  unpunctuatedCopPrice: /\b[1-9]\d{4,5}\b/,
  // Palabras comerciales del proveedor
  commercialKeywords: /\b(?:PRECIO|OFERTA|MAYORISTA|MAYOREO|DISTRIBUIDOR|WHATSAPP|WSP|PROMOCI[OÓ]N|PROMO|LIQUIDACI[OÓ]N|OFERT[OÓ]N)\b/i,
  // Teléfonos colombianos de 10 dígitos (empiezan por 3) o cualquier secuencia de 10 dígitos
  phoneNumbers: /\b3\d{2}[-.\s]?\d{3}[-.\s]?\d{4}\b|\b\d{10}\b/,
  // Prefijos de precio como "Precio: 50.000" o "Valor 45000"
  pricePrefix: /\b(?:precio|pesos|costo|valor|promo)\s*[:=]?\s*[\$]?\s*\d+/i,
};

/**
 * Analiza un buffer de imagen con Tesseract OCR y localiza texto publicitario
 */
export async function analyzeImageBuffer(
  buffer: Buffer,
  worker?: Worker
): Promise<OcrImageAnalysisResult> {
  const ocrWorker = worker || (await getSharedOcrWorker());

  // 1. Normalizar imagen con Sharp a JPEG estándar para evitar errores de decodificación WebP/GIF en Tesseract
  let safeBuffer: Buffer;
  let width = 1000;
  let height = 1000;

  try {
    const sharpInstance = sharp(buffer);
    const metadata = await sharpInstance.metadata();
    width = metadata.width || 1000;
    height = metadata.height || 1000;
    // Si es GIF animado o WebP complejo, extraer el primer frame y convertir a JPEG nítido
    safeBuffer = await sharpInstance.jpeg({ quality: 90 }).toBuffer();
  } catch (convErr: any) {
    console.warn('[OCR] Buffer de imagen no soportado o corrupto por proveedor:', convErr.message);
    return {
      hasBurnedPrice: false,
      detectedText: '',
      matchedPatterns: [],
      lines: [],
      dimensions: { width: 1000, height: 1000 },
      hasTopMatches: false,
      hasBottomMatches: false,
      hasCenterMatches: false,
      recommendedCropTopPct: 0,
      recommendedCropBottomPct: 0,
    };
  }

  // 2. Ejecutar OCR con captura de errores
  let rawText = '';
  let ocrResult: any = null;

  try {
    ocrResult = await ocrWorker.recognize(safeBuffer, {}, { blocks: true });
    rawText = ocrResult?.data?.text || '';
  } catch (recErr: any) {
    console.warn('[OCR] Fallo reconocimiento en worker:', recErr.message);
    return {
      hasBurnedPrice: false,
      detectedText: '',
      matchedPatterns: [],
      lines: [],
      dimensions: { width, height },
      hasTopMatches: false,
      hasBottomMatches: false,
      hasCenterMatches: false,
      recommendedCropTopPct: 0,
      recommendedCropBottomPct: 0,
    };
  }

  const matchedPatternsSet = new Set<string>();
  const detectedLines: DetectedLine[] = [];

  let hasTopMatches = false;
  let hasBottomMatches = false;
  let hasCenterMatches = false;

  let maxTopBottomPct = 0;
  let minBottomTopPct = 1.0;

  // 3. Inspeccionar líneas y cuadros delimitadores
  for (const block of ocrResult.data.blocks || []) {
    for (const para of block.paragraphs || []) {
      for (const line of para.lines || []) {
        const lineText = (line.text || '').trim();
        if (!lineText) continue;

        const patternsInLine: string[] = [];

        if (PATTERNS.dollarSymbol.test(lineText)) {
          patternsInLine.push('$ (Símbolo moneda)');
        }

        const thousandMatch = lineText.match(PATTERNS.colombianThousandPrice);
        if (thousandMatch) {
          patternsInLine.push(thousandMatch[0]);
        }

        const unpuncMatch = lineText.match(PATTERNS.unpunctuatedCopPrice);
        if (unpuncMatch) {
          patternsInLine.push(unpuncMatch[0]);
        }

        const kwMatch = lineText.match(PATTERNS.commercialKeywords);
        if (kwMatch) {
          patternsInLine.push(kwMatch[0].toUpperCase());
        }

        const phoneMatch = lineText.match(PATTERNS.phoneNumbers);
        if (phoneMatch) {
          patternsInLine.push(`Tel: ${phoneMatch[0]}`);
        }

        const prefixMatch = lineText.match(PATTERNS.pricePrefix);
        if (prefixMatch) {
          patternsInLine.push(prefixMatch[0]);
        }

        if (patternsInLine.length > 0) {
          patternsInLine.forEach((p) => matchedPatternsSet.add(p));

          const lineTopPct = line.bbox.y0 / height;
          const lineBottomPct = line.bbox.y1 / height;

          // Franjas: 22% superior, 22% inferior, resto es centro
          let zone: 'top' | 'bottom' | 'center' = 'center';
          if (lineBottomPct <= 0.22) {
            zone = 'top';
            hasTopMatches = true;
            if (lineBottomPct > maxTopBottomPct) {
              maxTopBottomPct = lineBottomPct;
            }
          } else if (lineTopPct >= 0.78) {
            zone = 'bottom';
            hasBottomMatches = true;
            if (lineTopPct < minBottomTopPct) {
              minBottomTopPct = lineTopPct;
            }
          } else {
            zone = 'center';
            hasCenterMatches = true;
          }

          detectedLines.push({
            text: lineText,
            bbox: line.bbox,
            zone,
            lineTopPct,
            lineBottomPct,
            patternsFound: patternsInLine,
          });
        }
      }
    }
  }

  const hasBurnedPrice = matchedPatternsSet.size > 0;

  // Cálculo de recortes recomendados (mínimo 12%, máximo 22%)
  let recommendedCropTopPct = 0;
  let recommendedCropBottomPct = 0;

  if (hasTopMatches && !hasCenterMatches) {
    recommendedCropTopPct = Math.min(22, Math.max(12, Math.ceil(maxTopBottomPct * 100) + 3));
  }
  if (hasBottomMatches && !hasCenterMatches) {
    recommendedCropBottomPct = Math.min(22, Math.max(12, Math.ceil((1 - minBottomTopPct) * 100) + 3));
  }

  return {
    hasBurnedPrice,
    detectedText: rawText,
    matchedPatterns: Array.from(matchedPatternsSet),
    lines: detectedLines,
    dimensions: { width, height },
    hasTopMatches,
    hasBottomMatches,
    hasCenterMatches,
    recommendedCropTopPct,
    recommendedCropBottomPct,
  };
}

/**
 * Motor de decisión automática en el orden estricto exigido:
 * a) Si otra imagen de la galería está limpia, ponerla como imagen principal.
 * b) Si el texto detectado está en la franja superior o inferior (fuera del centro), aplicar recorte (12-22%).
 * c) Si ninguna imagen sirve ni se puede recortar sin dañar el centro del producto, desactivar el producto.
 */
export function decideCorrection(
  originalImageUrl: string,
  primaryAnalysis: OcrImageAnalysisResult,
  cleanGalleryUrls: string[]
): CorrectionDecision {
  // Si la imagen principal está limpia, no requiere corrección
  if (!primaryAnalysis.hasBurnedPrice) {
    return {
      correction_applied: 'none',
      crop_top_pct: 0,
      crop_bottom_pct: 0,
      active_image_url: originalImageUrl,
      reason: 'Imagen original limpia, sin textos ni precios quemados.',
    };
  }

  // REGLA 2a: Si otra imagen de la galería está limpia, usarla como principal
  if (cleanGalleryUrls.length > 0) {
    return {
      correction_applied: 'swapped_gallery',
      crop_top_pct: 0,
      crop_bottom_pct: 0,
      active_image_url: cleanGalleryUrls[0],
      reason: `Imagen original con texto quemado (${primaryAnalysis.matchedPatterns.join(', ')}). Reemplazada por foto limpia de galería.`,
    };
  }

  // REGLA 2b: Si el texto está en franja superior o inferior y el centro está limpio, aplicar recorte
  if (!primaryAnalysis.hasCenterMatches) {
    const cropTop = primaryAnalysis.recommendedCropTopPct;
    const cropBottom = primaryAnalysis.recommendedCropBottomPct;

    if (cropTop > 0 && cropBottom > 0) {
      return {
        correction_applied: 'crop_both',
        crop_top_pct: cropTop,
        crop_bottom_pct: cropBottom,
        active_image_url: originalImageUrl,
        reason: `Recorte automático superior (-${cropTop}%) e inferior (-${cropBottom}%) para remover textos sin tocar producto.`,
      };
    } else if (cropTop > 0) {
      return {
        correction_applied: 'crop_top',
        crop_top_pct: cropTop,
        crop_bottom_pct: 0,
        active_image_url: originalImageUrl,
        reason: `Recorte automático franja superior (-${cropTop}%) para remover textos comerciales del proveedor.`,
      };
    } else if (cropBottom > 0) {
      return {
        correction_applied: 'crop_bottom',
        crop_top_pct: 0,
        crop_bottom_pct: cropBottom,
        active_image_url: originalImageUrl,
        reason: `Recorte automático franja inferior (-${cropBottom}%) para remover precios o números de WhatsApp.`,
      };
    }
  }

  // REGLA 2c: Si ninguna imagen sirve ni se puede recortar sin dañar el producto (texto en el centro), desactivar
  return {
    correction_applied: 'deactivated',
    crop_top_pct: 0,
    crop_bottom_pct: 0,
    active_image_url: originalImageUrl,
    reason: `Texto comercial invasivo en el centro de la imagen (${primaryAnalysis.matchedPatterns.join(', ')}). Desactivado preventivamente para proteger la tienda.`,
  };
}
