/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: VARIACIONES DE PRODUCTO Y PRECIOS DINÁMICOS
 * ==============================================================================
 * Verifica la extracción de atributos, normalización de stock por bodega,
 * cálculo individual de costos, PVP por variante y estadísticas de varianza.
 */

import {
  getVariationLabel,
  normalizeVariations,
  getVariationsPriceStats,
} from '../lib/variations';
import { TestSuite } from './test-utils';

export function runVariationsTests() {
  const suite = new TestSuite('lib/variations.ts (Variaciones y Precios Dinámicos)');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: lib/variations.ts');
  console.log('===============================================================\n');

  // 1. Detección y formateo de etiquetas de variaciones (Labels)
  console.log('📌 Bloque 1: Generación y Limpieza de Labels');

  const vColor = {
    id: 101,
    attribute_values: [{ value: 'Negro Mate' }],
  };
  suite.assertEqual(
    getVariationLabel(vColor, 0),
    'Negro Mate',
    'Extrae atributo simple de attribute_values'
  );

  const vMultiAttrs = {
    id: 102,
    attribute_values: [{ value: 'Azul' }, { value: 'Talla L' }],
  };
  suite.assertEqual(
    getVariationLabel(vMultiAttrs, 1),
    'Azul / Talla L',
    'Combina múltiples atributos con separador " / "'
  );

  const vFallbackTitle = {
    id: 103,
    title: 'Edición Especial 500ml',
  };
  suite.assertEqual(
    getVariationLabel(vFallbackTitle, 2),
    'Edición Especial 500ml',
    'Fallback a title cuando no hay attribute_values'
  );

  const vFallbackSku = {
    id: 104,
    sku: 'VAR-ROJO-XL',
  };
  suite.assertEqual(
    getVariationLabel(vFallbackSku, 3),
    'VAR-ROJO-XL',
    'Fallback a sku cuando no hay title ni atributos'
  );

  const vEmpty = { id: 105 };
  suite.assertEqual(
    getVariationLabel(vEmpty, 4),
    'Opción 5',
    'Fallback a "Opción X" index-based cuando no hay datos descriptivos'
  );

  // 2. Extracción de Stock Multibodega
  console.log('\n📌 Bloque 2: Normalización de Stock');

  const vWithWarehouses = {
    id: 201,
    title: 'Variante Bodegas',
    sale_price: 25000,
    warehouse_product_variation: [
      { warehouse_id: 1, stock: 15 },
      { warehouse_id: 2, stock: 25 },
    ],
  };

  const norm1 = normalizeVariations([vWithWarehouses], 20000, 79900);
  suite.assertEqual(
    norm1[0].stock,
    40,
    'Suma correctamente el stock distribuido en múltiples almacenes'
  );

  const vDirectStock = {
    id: 202,
    title: 'Variante Stock Directo',
    sale_price: 25000,
    stock: 12,
  };
  const norm2 = normalizeVariations([vDirectStock], 20000, 79900);
  suite.assertEqual(norm2[0].stock, 12, 'Lee stock directo si está disponible');

  // 3. Precios Dinámicos por Variante (Caso crítico Dropi: ej. 120ml vs 1000ml)
  console.log('\n📌 Bloque 3: Cálculo Dinámico de Costo y PVP por Variante');

  const rawVariants = [
    {
      id: 301,
      title: 'Frasco Pequeño 120ml',
      sale_price: 6200, // Costo bajo
      stock: 50,
    },
    {
      id: 302,
      title: 'Galón Grande 1000ml',
      sale_price: 44900, // Costo alto
      stock: 20,
    },
    {
      id: 303,
      title: 'Presentación Estándar',
      sale_price: null, // Hereda parent
      stock: 10,
    },
  ];

  const parentCost = 18000;
  const parentSellPrice = 79900;
  const normalized = normalizeVariations(rawVariants, parentCost, parentSellPrice);

  suite.assertEqual(normalized.length, 3, 'Normaliza exactamente las 3 variantes');

  // Variante 1: Costo 6.200 -> Costo + 55.000 = 61.200 -> Redondeo 9.900 = 69.900
  suite.assertEqual(normalized[0].cost_cop, 6200, 'Variante 1 preserva costo 6.200');
  suite.assertEqual(normalized[0].sell_price_cop, 69900, 'Variante 1 calcula PVP 69.900');
  suite.assert(
    normalized[0].has_custom_price === true,
    'Variante 1 detecta has_custom_price = true'
  );

  // Variante 2: Costo 44.900 -> Costo + 55.000 = 99.900 -> Redondeo 9.900 = 99.900
  suite.assertEqual(normalized[1].cost_cop, 44900, 'Variante 2 preserva costo 44.900');
  suite.assertEqual(normalized[1].sell_price_cop, 99900, 'Variante 2 calcula PVP 99.900');
  suite.assert(
    normalized[1].has_custom_price === true,
    'Variante 2 detecta has_custom_price = true'
  );

  // Variante 3: Sin sale_price -> Hereda costo y precio del producto padre
  suite.assertEqual(
    normalized[2].cost_cop,
    parentCost,
    'Variante 3 hereda costo del producto padre (18.000)'
  );
  suite.assertEqual(
    normalized[2].sell_price_cop,
    parentSellPrice,
    'Variante 3 hereda precio del producto padre (79.900)'
  );
  suite.assert(
    normalized[2].has_custom_price === false,
    'Variante 3 tiene has_custom_price = false al heredar parent'
  );

  // 4. Detección de Varianza de Precios para el Catálogo
  console.log('\n📌 Bloque 4: Detección de Varianza de Precios (getVariationsPriceStats)');

  const statsWithVariance = getVariationsPriceStats(normalized);
  suite.assert(
    statsWithVariance.has_price_variance === true,
    'Detecta variación de precios entre opciones (has_price_variance = true)'
  );
  suite.assertEqual(
    statsWithVariance.min_price,
    69900,
    'Calcula correctamente precio mínimo (69.900 COP)'
  );
  suite.assertEqual(
    statsWithVariance.max_price,
    99900,
    'Calcula correctamente precio máximo (99.900 COP)'
  );

  // Variantes homogéneas (mismo precio para todas)
  const uniformVariants = normalizeVariations(
    [
      { id: 401, title: 'Color Rojo', sale_price: 20000 },
      { id: 402, title: 'Color Azul', sale_price: 20000 },
    ],
    20000,
    79900
  );
  const uniformStats = getVariationsPriceStats(uniformVariants);
  suite.assert(
    uniformStats.has_price_variance === false,
    'Detecta catálogo uniforme sin variación de precio (has_price_variance = false)'
  );
  suite.assertEqual(uniformStats.min_price, 79900, 'Precio mínimo igual a precio base');
  suite.assertEqual(uniformStats.max_price, 79900, 'Precio máximo igual a precio base');

  // Casos vacíos y defensivos
  const emptyNorm = normalizeVariations(null);
  suite.assertEqual(emptyNorm.length, 0, 'normalizeVariations(null) retorna array vacío []');

  const emptyStats = getVariationsPriceStats([]);
  suite.assertEqual(
    emptyStats.has_price_variance,
    false,
    'getVariationsPriceStats([]) retorna has_price_variance = false'
  );

  return suite.summary();
}

if (process.argv[1]?.endsWith('variations.test.ts')) {
  const result = runVariationsTests();
  if (result.failed > 0) process.exit(1);
}
