/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: REGLA MATEMÁTICA DE PRECIOS PIDEFÁCIL
 * ==============================================================================
 * Verifica con precisión estricta cada caso de borde, regla de seguridad y
 * los 3 casos obligatorios exigidos por la arquitectura comercial.
 */

import {
  roundUpTo9900,
  calculatePricing,
  calculateDuoPrice,
  formatCOP,
} from '../config/pricing';

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  ✅ [PASS] ${testName}`);
  } else {
    failedTests++;
    console.error(`  ❌ [FAIL] ${testName}`);
    if (details) console.error(`     -> Detalle: ${details}`);
  }
}

console.log('\n===============================================================');
console.log('🧪 EJECUTANDO TEST SUITE: config/pricing.ts (PideFácil)');
console.log('===============================================================\n');

// ------------------------------------------------------------------------------
// CASOS DE PRUEBA OBLIGATORIOS (ESPECIFICACIÓN ARQUITECTÓNICA)
// ------------------------------------------------------------------------------
console.log('📌 Bloque 1: Casos Obligatorios de Redondeo a 9.900');

// Caso 1: Si Base = 51.000 -> resultado = 59.900
const r51000 = roundUpTo9900(51000);
assert(
  r51000 === 59900,
  'Base = 51.000 DEBE redondear exactamente a 59.900',
  `Esperado 59900, obtenido: ${r51000}`
);

// Caso 2: Si Base = 59.900 -> resultado = 59.900 (se mantiene)
const r59900 = roundUpTo9900(59900);
assert(
  r59900 === 59900,
  'Base = 59.900 DEBE mantenerse exactamente en 59.900',
  `Esperado 59900, obtenido: ${r59900}`
);

// Caso 3: Si Base = 60.000 -> resultado = 69.900 (sube al siguiente escalón)
const r60000 = roundUpTo9900(60000);
assert(
  r60000 === 69900,
  'Base = 60.000 DEBE subir exactamente a 69.900',
  `Esperado 69900, obtenido: ${r60000}`
);

// ------------------------------------------------------------------------------
// PRUEBAS DE BORDE MATEMÁTICO (LIMITES DE ESCALÓN)
// ------------------------------------------------------------------------------
console.log('\n📌 Bloque 2: Casos de Borde Matemático y Terminación');

assert(
  roundUpTo9900(10000) === 19900,
  'Base = 10.000 -> 19.900',
  `Obtenido: ${roundUpTo9900(10000)}`
);

assert(
  roundUpTo9900(19899) === 19900,
  'Base = 19.899 -> 19.900',
  `Obtenido: ${roundUpTo9900(19899)}`
);

assert(
  roundUpTo9900(19900) === 19900,
  'Base = 19.900 -> 19.900 (exacto)',
  `Obtenido: ${roundUpTo9900(19900)}`
);

assert(
  roundUpTo9900(19901) === 29900,
  'Base = 19.901 -> 29.900 (cruza el umbral hacia arriba)',
  `Obtenido: ${roundUpTo9900(19901)}`
);

assert(
  roundUpTo9900(0) === 0,
  'Base = 0 -> 0 (protección de cero)',
  `Obtenido: ${roundUpTo9900(0)}`
);

assert(
  roundUpTo9900(-500) === 0,
  'Base negativa -> 0',
  `Obtenido: ${roundUpTo9900(-500)}`
);

// ------------------------------------------------------------------------------
// REGLA DE SEGURIDAD DE PRECIO CERO / NULO / NEGATIVO
// ------------------------------------------------------------------------------
console.log('\n📌 Bloque 3: Regla de Seguridad de Precio Cero / Negativo / Nulo');

const zeroPrice = calculatePricing(0);
assert(
  zeroPrice.is_active === false && zeroPrice.needs_review === true && zeroPrice.sell_price_cop === 0,
  'sale_price = 0 -> is_active = false, needs_review = true, sell_price_cop = 0',
  JSON.stringify(zeroPrice)
);

const nullPrice = calculatePricing(null);
assert(
  nullPrice.is_active === false && nullPrice.needs_review === true && nullPrice.sell_price_cop === 0,
  'sale_price = null -> is_active = false, needs_review = true, sell_price_cop = 0',
  JSON.stringify(nullPrice)
);

const negativePrice = calculatePricing(-25000);
assert(
  negativePrice.is_active === false && negativePrice.needs_review === true && negativePrice.sell_price_cop === 0,
  'sale_price = -25.000 -> is_active = false, needs_review = true, sell_price_cop = 0',
  JSON.stringify(negativePrice)
);

// ------------------------------------------------------------------------------
// EVALUACIÓN COMERCIAL COMPLETA CON MARGEN (+55.000 COP)
// ------------------------------------------------------------------------------
console.log('\n📌 Bloque 4: Evaluación Comercial Completa con Margen (+55.000 COP)');

// Costo = 18.000 COP, Margen = 55.000 COP -> Base = 73.000 COP -> sell_price_cop = 79.900 COP
const productA = calculatePricing(18000, 55000, 25);
assert(
  productA.cost_cop === 18000 &&
    productA.base_cop === 73000 &&
    productA.sell_price_cop === 79900 &&
    productA.is_active === true &&
    productA.needs_review === false,
  'Costo 18.000 + Margen 55.000 = Base 73.000 -> Venta 79.900 (Activo)',
  JSON.stringify(productA)
);

// Regla de Stock: Stock 0 desactiva el producto aunque el costo sea válido
const outOfStock = calculatePricing(18000, 55000, 0);
assert(
  outOfStock.is_active === false && outOfStock.deactivation_reason === 'sin_stock',
  'Stock 0 -> is_active = false, deactivation_reason = sin_stock',
  JSON.stringify(outOfStock)
);

// Regla de Cordura de Precio: Costo < 5.000 COP desactiva y marca precio_sospechoso
const suspiciousPrice = calculatePricing(1, 55000, 100);
assert(
  suspiciousPrice.is_active === false &&
    suspiciousPrice.needs_review === true &&
    suspiciousPrice.deactivation_reason === 'precio_sospechoso',
  'Costo 1 COP -> is_active = false, needs_review = true, deactivation_reason = precio_sospechoso',
  JSON.stringify(suspiciousPrice)
);

const suspiciousPrice4999 = calculatePricing(4999, 55000, 100);
assert(
  suspiciousPrice4999.is_active === false &&
    suspiciousPrice4999.needs_review === true &&
    suspiciousPrice4999.deactivation_reason === 'precio_sospechoso',
  'Costo 4.999 COP -> is_active = false, needs_review = true, deactivation_reason = precio_sospechoso',
  JSON.stringify(suspiciousPrice4999)
);

// ------------------------------------------------------------------------------
// ESCALERA DE OFERTAS: DÚO PACK (AOV BOOSTER)
// ------------------------------------------------------------------------------
console.log('\n📌 Bloque 5: Dúo Pack (AOV Booster - 25% descuento en 2da unidad)');

const duo = calculateDuoPrice(79900, 25);
// Regular 2x: 159.800. Unidad 1 (79.900) + Unidad 2 con 25% desc (59.925) = 139.825 -> Redondeo 9.900: 139.900
// Ahorro real cliente: 159.800 - 139.900 = 19.900 COP
assert(
  duo.duoPriceCop === 139900 && duo.savingsCop === 19900,
  'Dúo Pack para 79.900 -> 139.900 con ahorro calculado de 19.900 COP',
  JSON.stringify(duo)
);

// ------------------------------------------------------------------------------
// FORMATEO DE MONEDA COLOMBIANA
// ------------------------------------------------------------------------------
console.log('\n📌 Bloque 6: Formato Visual COP');

assert(formatCOP(59900) === '$59.900', '59900 formatea a $59.900');
assert(formatCOP(149900) === '$149.900', '149900 formatea a $149.900');

console.log('\n===============================================================');
console.log(`📊 RESULTADO DE LA SUITE: ${passedTests}/${totalTests} pruebas superadas.`);
if (failedTests > 0) {
  console.error(`💥 ${failedTests} pruebas fallaron.`);
  process.exit(1);
} else {
  console.log('✨ TODAS LAS REGLAS MATEMÁTICAS Y DE SEGURIDAD ESTÁN VERIFICADAS.');
  console.log('===============================================================\n');
}
