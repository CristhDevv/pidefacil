/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: DETECTOR DE PACKS Y GENERADOR DE COPY PUBLICITARIO
 * ==============================================================================
 * Verifica la resolución de packs múltiples (evitando ambigüedades en combos 2x)
 * y la generación de copies persuasivos para redes sociales y WhatsApp.
 */

import { detectPackOfferInfo } from '../lib/pack-detector';
import { generatePersuasiveCopy } from '../lib/social-copy-generator';
import { TestSuite } from './test-utils';

export function runPackDetectorAndCopyTests() {
  const suite = new TestSuite('lib/pack-detector.ts & lib/social-copy-generator.ts');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: Packs Múltiples y Copies Comerciales');
  console.log('===============================================================\n');

  // 1. Detección Inteligente de Packs
  console.log('📌 Bloque 1: Detector de Packs vs Unidades Individuales');

  // Caso: Boxer x10 unidades
  const packBoxer = detectPackOfferInfo('Boxer Calvin Klein x10 unidades microfibra');
  suite.assert(packBoxer.isPack === true, 'Detecta correctamente "x10 unidades" como pack');
  suite.assertEqual(packBoxer.packSize, 10, 'Detecta tamaño de pack = 10 unidades');
  suite.assertEqual(packBoxer.unitWord, 'Paquete', 'unitWord asignado como "Paquete"');
  suite.assert(packBoxer.duoBadge.includes('20 uds'), 'El dúo pack calcula 20 uds en total');

  // Caso: Pack x3
  const pack3 = detectPackOfferInfo('Camisillas Deportivas Pack x3 Hombre');
  suite.assert(pack3.isPack === true && pack3.packSize === 3, 'Detecta "Pack x3"');
  suite.assert(pack3.duoTitle.includes('6 unidades'), 'El combo x2 ofrece 6 unidades');

  // Caso: Kit x 4
  const kit4 = detectPackOfferInfo('Kit x 4 Cámaras de Seguridad HD');
  suite.assert(kit4.isPack === true && kit4.packSize === 4, 'Detecta "Kit x 4"');

  // Caso: 12 pares de medias
  const pares12 = detectPackOfferInfo('12 pares de medias tobilleras');
  suite.assert(pares12.isPack === true && pares12.packSize === 12, 'Detecta "12 pares"');

  // Caso: Producto individual (Reloj Smartwatch)
  const singleWatch = detectPackOfferInfo('Smartwatch Reloj T500 Serie 8 Deportivo');
  suite.assert(singleWatch.isPack === false, 'Producto estándar sin pack: isPack = false');
  suite.assertEqual(singleWatch.packSize, 1, 'Tamaño = 1');
  suite.assertEqual(singleWatch.unitWord, 'Unidad', 'unitWord = "Unidad"');

  // Caso límite: cantidad absurda (ej: 500 unidades no es un pack estándar)
  const extremeQty = detectPackOfferInfo('Tornillos industriales x500 piezas');
  suite.assert(extremeQty.isPack === false, 'Descarta cantidades extremas (> 200) como pack B2C');

  // 2. Generador de Copy Persuasivo (WhatsApp / Redes)
  console.log('\n📌 Bloque 2: Generación de Copies Publicitarios de Alta Conversión');

  // Oferta 1x
  const copy1x = generatePersuasiveCopy({
    productName: 'Cepillo Alisador Cerámica Pro',
    selectedOffer: '1x',
    singlePrice: 69900,
    anchorPrice: 99900,
    duoPrice: 99900,
    duoSavings: 39900,
    selectedVariation: 'Color Rosa',
  });

  suite.assert(copy1x.includes('Cepillo Alisador Cerámica Pro'), 'Copy incluye nombre del producto');
  suite.assert(copy1x.includes('$69.900'), 'Copy incluye precio de 1 unidad ($69.900)');
  suite.assert(copy1x.includes('Antes: ~$99.900 COP~'), 'Copy incluye precio de ancla tachado (~$99.900 COP~)');
  suite.assert(copy1x.includes('Color Rosa'), 'Copy incluye variante seleccionada');
  suite.assert(copy1x.includes('PAGO EN CASA (Contra Entrega)'), 'Copy enfatiza Pago en Casa (Contra Entrega)');

  // Oferta 2x Combo
  const copy2x = generatePersuasiveCopy({
    productName: 'Boxer Microfibra x10',
    selectedOffer: '2x',
    singlePrice: 59900,
    anchorPrice: 89900,
    duoPrice: 79900,
    duoSavings: 39900,
    packInfo: {
      singleTitle: '1 Paquete (10 unidades)',
      duoTitle: 'Lleva 2 Paquetes (20 unidades en total)',
    },
  });

  suite.assert(copy2x.includes('DÚO PACK'), 'Copy 2x destaca OFERTA ESPECIAL DÚO PACK');
  suite.assert(copy2x.includes('$79.900'), 'Copy 2x incluye precio combo ($79.900)');
  suite.assert(copy2x.includes('AHORRAS $39.900'), 'Copy 2x resalta el ahorro exacto');
  suite.assert(copy2x.includes('20 unidades en total'), 'Copy 2x adopta la nomenclatura personalizada del pack');

  return suite.summary();
}

if (process.argv[1]?.endsWith('pack-detector-and-copy.test.ts')) {
  const result = runPackDetectorAndCopyTests();
  if (result.failed > 0) process.exit(1);
}
