/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: TRANSFORMACIÓN DE IMÁGENES Y DECISIÓN OCR
 * ==============================================================================
 * Verifica las URLs con proxy de recorte (Sharp), detección de patrones
 * comerciales quemados y el árbol de decisión de moderación automática.
 */

import {
  getProductDisplayImageUrl,
  getOriginalProductImageUrl,
} from '../lib/image-url';
import {
  determineAutomaticCorrection,
  OcrDetectionResult,
  LineMatch,
} from '../lib/ocr-detector';
import { TestSuite } from './test-utils';

export function runImageAndOcrTests() {
  const suite = new TestSuite('lib/image-url.ts & lib/ocr-detector.ts (Imágenes y OCR)');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: URLs de Imágenes y Motor de Decisión OCR');
  console.log('===============================================================\n');

  // 1. Transformación de URLs y Recortes Dinámicos
  console.log('📌 Bloque 1: Generación de URLs de Imagen con Transform');

  const placeholder = 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&auto=format&fit=crop&q=80';
  suite.assertEqual(
    getProductDisplayImageUrl({ image_url: '' }),
    placeholder,
    'Retorna placeholder cuando image_url es string vacío'
  );

  suite.assertEqual(
    getProductDisplayImageUrl({ image_url: null }),
    placeholder,
    'Retorna placeholder cuando image_url es null'
  );

  const cleanUrl = 'https://cdn.dropi.co/products/reloj-inteligente.jpg';
  suite.assertEqual(
    getProductDisplayImageUrl({ image_url: cleanUrl, crop_top_pct: 0, crop_bottom_pct: 0 }),
    cleanUrl,
    'Retorna URL original limpia cuando no hay recorte configurado'
  );

  // Con recorte superior del 15%
  const croppedTopUrl = getProductDisplayImageUrl({
    image_url: cleanUrl,
    crop_top_pct: 15,
    crop_bottom_pct: 0,
  });
  suite.assert(
    croppedTopUrl.startsWith('/api/proxy-image?url=') &&
      croppedTopUrl.includes('cropTop=15') &&
      croppedTopUrl.includes('cropBottom=0'),
    'Enruta a /api/proxy-image con parámetros encodeados al tener recorte superior'
  );

  // Con recorte inferior del 20%
  const croppedBottomUrl = getProductDisplayImageUrl({
    image_url: cleanUrl,
    crop_top_pct: 0,
    crop_bottom_pct: 20,
  });
  suite.assert(
    croppedBottomUrl.includes('cropBottom=20'),
    'Enruta a proxy con cropBottom=20'
  );

  // Protección contra sobre-recorte (> 40% se limita a 40%)
  const clampedUrl = getProductDisplayImageUrl({
    image_url: cleanUrl,
    crop_top_pct: 75,
    crop_bottom_pct: 90,
  });
  suite.assert(
    clampedUrl.includes('cropTop=40') && clampedUrl.includes('cropBottom=40'),
    'Limita automáticamente recortes extremos al tope seguro del 40%'
  );

  // 2. Patrones Regex Comerciales
  console.log('\n📌 Bloque 2: Patrones Comerciales de Precios Quemados');

  const testTexts = [
    { text: 'OFERTA SOLO POR HOY $ 49.900', shouldMatch: true, pattern: 'precio con signo $' },
    { text: 'PVP 89,900 COP', shouldMatch: true, pattern: 'precio con coma' },
    { text: 'VALOR 49900 ENVIOS', shouldMatch: true, pattern: 'precio de 5 dígitos planos' },
    { text: 'PEDIDOS AL WHATSAPP 3001234567', shouldMatch: true, pattern: 'palabra WHATSAPP y teléfono' },
    { text: 'PRECIO MAYORISTA EXCLUSIVO', shouldMatch: true, pattern: 'palabra crítica MAYORISTA' },
    { text: 'CAMISETA DE ALGODÓN 100% ORIGINAL', shouldMatch: false, pattern: 'texto limpio de catálogo' },
  ];

  const priceRegex = /\$|\b\d{1,3}[.,]\d{3}\b|\b[1-9]\d{4,5}\b/i;
  const keywordsRegex = /\b(?:PRECIO|COSTO|OFERTA|MAYORISTA|DISTRIBUIDOR|WHATSAPP)\b/i;

  testTexts.forEach((item) => {
    const matched = priceRegex.test(item.text) || keywordsRegex.test(item.text);
    suite.assert(
      matched === item.shouldMatch,
      `Patrón "${item.pattern}": "${item.text}" -> ${matched ? 'Detectado' : 'Limpio'}`
    );
  });

  // 3. Árbol de Decisión de Moderación Automática
  console.log('\n📌 Bloque 3: Árbol de Decisión Automática (Reglas 2a, 2b, 2c)');

  const mockOriginalUrl = 'https://cdn.dropi.co/products/banner-sucio.jpg';
  const mockCleanGallery = ['https://cdn.dropi.co/products/galeria-limpia-1.jpg'];

  // Caso 1: Imagen 100% limpia
  const cleanOcr: OcrDetectionResult = {
    hasBurnedPrice: false,
    hasCriticalCost: false,
    detectedText: '',
    detectedPatterns: [],
    matchedLines: [],
    imageWidth: 800,
    imageHeight: 800,
  };
  const decClean = determineAutomaticCorrection({
    primaryOcr: cleanOcr,
    originalImageUrl: mockOriginalUrl,
    cleanGalleryUrls: [],
  });
  suite.assertEqual(decClean.has_burned_price, 0, 'Imagen limpia reporta has_burned_price = 0');
  suite.assertEqual(decClean.correction_applied, 'none', 'Imagen limpia no aplica corrección (none)');
  suite.assertEqual(decClean.active_image_url, mockOriginalUrl, 'Conserva imagen original');

  // Caso 2 (Regla 2a): Imagen sucia pero hay galería limpia -> Swapped Gallery
  const dirtyOcrWithGallery: OcrDetectionResult = {
    hasBurnedPrice: true,
    hasCriticalCost: false,
    detectedText: 'OFERTA $49.900',
    detectedPatterns: ['$', '49.900'],
    matchedLines: [
      {
        text: 'OFERTA $49.900',
        matchedPatterns: ['$', '49.900'],
        bbox: { x0: 50, y0: 50, x1: 500, y1: 150 },
        zone: 'top',
        topRatio: 0.1,
        bottomRatio: 0.9,
      },
    ],
    imageWidth: 800,
    imageHeight: 800,
  };
  const decSwap = determineAutomaticCorrection({
    primaryOcr: dirtyOcrWithGallery,
    originalImageUrl: mockOriginalUrl,
    cleanGalleryUrls: mockCleanGallery,
  });
  suite.assertEqual(decSwap.correction_applied, 'swapped_gallery', 'Regla 2a: Cambia foto principal por foto limpia de galería');
  suite.assertEqual(decSwap.active_image_url, mockCleanGallery[0], 'Asigna foto de galería como activa');

  // Caso 3: Palabra Crítica ("MAYORISTA" / "COSTO") sin galería -> Desactivar inmediatamente
  const criticalCostOcr: OcrDetectionResult = {
    hasBurnedPrice: true,
    hasCriticalCost: true,
    detectedText: 'PRECIO MAYORISTA 15.000',
    detectedPatterns: ['MAYORISTA'],
    matchedLines: [
      {
        text: 'PRECIO MAYORISTA',
        matchedPatterns: ['MAYORISTA'],
        bbox: { x0: 50, y0: 50, x1: 500, y1: 150 },
        zone: 'top',
        topRatio: 0.08,
        bottomRatio: 0.92,
      },
    ],
    imageWidth: 800,
    imageHeight: 800,
  };
  const decCritical = determineAutomaticCorrection({
    primaryOcr: criticalCostOcr,
    originalImageUrl: mockOriginalUrl,
    cleanGalleryUrls: [],
  });
  suite.assertEqual(decCritical.correction_applied, 'deactivated', 'Desactiva inmediatamente si dice COSTO o MAYORISTA');

  // Caso 4: Texto en el centro de la imagen -> Desactivar
  const centerOcr: OcrDetectionResult = {
    hasBurnedPrice: true,
    hasCriticalCost: false,
    detectedText: '$39.900',
    detectedPatterns: ['$'],
    matchedLines: [
      {
        text: '$39.900',
        matchedPatterns: ['$'],
        bbox: { x0: 200, y0: 350, x1: 600, y1: 450 },
        zone: 'center',
        topRatio: 0.45,
        bottomRatio: 0.45,
      },
    ],
    imageWidth: 800,
    imageHeight: 800,
  };
  const decCenter = determineAutomaticCorrection({
    primaryOcr: centerOcr,
    originalImageUrl: mockOriginalUrl,
    cleanGalleryUrls: [],
  });
  suite.assertEqual(decCenter.correction_applied, 'deactivated', 'Desactiva si el texto quemado está en el centro');

  // Caso 5: Texto en franja superior únicamente (y1 = 90px de 800px -> 11.25%) -> Recorte Superior
  const topBannerOcr: OcrDetectionResult = {
    hasBurnedPrice: true,
    hasCriticalCost: false,
    detectedText: 'OFERTA DE TEMPORADA',
    detectedPatterns: ['OFERTA'],
    matchedLines: [
      {
        text: 'OFERTA DE TEMPORADA',
        matchedPatterns: ['OFERTA'],
        bbox: { x0: 50, y0: 20, x1: 750, y1: 90 },
        zone: 'top',
        topRatio: 0.025,
        bottomRatio: 0.1125,
      },
    ],
    imageWidth: 800,
    imageHeight: 800,
  };
  const decCropTop = determineAutomaticCorrection({
    primaryOcr: topBannerOcr,
    originalImageUrl: mockOriginalUrl,
    cleanGalleryUrls: [],
  });
  suite.assertEqual(decCropTop.correction_applied, 'crop_top', 'Aplica crop_top cuando el texto está confinado arriba');
  suite.assert(decCropTop.crop_top_pct >= 12 && decCropTop.crop_top_pct <= 22, `Calcula porcentaje de recorte superior razonable (${decCropTop.crop_top_pct}%)`);

  // Caso 6: Texto en franja inferior únicamente (10%) -> Recorte Inferior
  const bottomBannerOcr: OcrDetectionResult = {
    hasBurnedPrice: true,
    hasCriticalCost: false,
    detectedText: 'PIDELO HOY 3001234567',
    detectedPatterns: ['3001234567'],
    matchedLines: [
      {
        text: 'PIDELO HOY 3001234567',
        matchedPatterns: ['3001234567'],
        bbox: { x0: 50, y0: 710, x1: 750, y1: 780 },
        zone: 'bottom',
        topRatio: 0.8875,
        bottomRatio: 0.975,
      },
    ],
    imageWidth: 800,
    imageHeight: 800,
  };
  const decCropBottom = determineAutomaticCorrection({
    primaryOcr: bottomBannerOcr,
    originalImageUrl: mockOriginalUrl,
    cleanGalleryUrls: [],
  });
  suite.assertEqual(decCropBottom.correction_applied, 'crop_bottom', 'Aplica crop_bottom cuando el texto está confinado abajo');
  suite.assert(decCropBottom.crop_bottom_pct >= 12 && decCropBottom.crop_bottom_pct <= 22, `Calcula porcentaje de recorte inferior razonable (${decCropBottom.crop_bottom_pct}%)`);

  return suite.summary();
}

if (process.argv[1]?.endsWith('image-and-ocr.test.ts')) {
  const result = runImageAndOcrTests();
  if (result.failed > 0) process.exit(1);
}
