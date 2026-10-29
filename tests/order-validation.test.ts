/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: VALIDACIÓN DE PEDIDOS COD Y CÁLCULO SEGURO
 * ==============================================================================
 * Verifica las reglas estrictas de entrada para pedidos Contra Entrega en Colombia,
 * la normalización de celulares DANE/MinTIC y la protección contra adulteración de precios.
 */

import { calculatePricing, calculateDuoPrice } from '../config/pricing';
import { TestSuite } from './test-utils';

// Helper de validación representativo extraído de app/api/orders/route.ts
export function validateOrderInput(data: any): { isValid: boolean; error?: string; cleanPhone?: string } {
  const {
    customer_name,
    customer_phone,
    department,
    city,
    neighborhood,
    address,
    reference_point,
    confirmed_cash,
  } = data;

  if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 3) {
    return { isValid: false, error: 'Por favor ingresa tu Nombre y Apellido completo.' };
  }

  const cleanPhone = String(customer_phone || '').replace(/\D/g, '');
  if (!/^3\d{9}$/.test(cleanPhone)) {
    return {
      isValid: false,
      error: 'El celular debe tener 10 dígitos y comenzar por 3 (Ejemplo: 3001234567).',
    };
  }

  if (!department || typeof department !== 'string' || !department.trim()) {
    return { isValid: false, error: 'Selecciona el Departamento de entrega.' };
  }

  if (!city || typeof city !== 'string' || !city.trim()) {
    return { isValid: false, error: 'Selecciona la Ciudad o Municipio de entrega.' };
  }

  if (!neighborhood || typeof neighborhood !== 'string' || neighborhood.trim().length < 2) {
    return { isValid: false, error: 'El Barrio es obligatorio para que el transportador no devuelva el paquete.' };
  }

  if (!address || typeof address !== 'string' || address.trim().length < 5) {
    return { isValid: false, error: 'Ingresa la dirección exacta (Calle / Carrera, número, casa / apartamento).' };
  }

  if (!reference_point || typeof reference_point !== 'string' || reference_point.trim().length < 3) {
    return { isValid: false, error: 'Ingresa un punto de referencia cercano (ej: Frente a tienda, casa esquinera).' };
  }

  if (!confirmed_cash) {
    return {
      isValid: false,
      error: 'Debes confirmar que habrá alguien en casa para recibir y pagar en efectivo al transportador.',
    };
  }

  return { isValid: true, cleanPhone };
}

// Helper de cálculo autoritativo de precios en backend (idéntico a app/api/orders/route.ts)
export function calculateAuthoritativeOrderTotal(params: {
  productCost: number;
  parentSellPrice: number;
  qtyMode: '1x' | '2x';
  matchedVariation?: { sale_price?: number | null };
}): { unitPrice: number; totalCop: number; costCop: number } {
  let costCop = params.productCost;
  let unitPrice = params.parentSellPrice;

  if (params.matchedVariation && params.matchedVariation.sale_price) {
    const varSalePrice = Number(params.matchedVariation.sale_price);
    if (!isNaN(varSalePrice) && varSalePrice > 0) {
      costCop = Math.round(varSalePrice);
      const pricing = calculatePricing(costCop);
      unitPrice = pricing.sell_price_cop;
    }
  }

  let totalCop = unitPrice;
  if (params.qtyMode === '2x') {
    const duo = calculateDuoPrice(unitPrice, costCop);
    totalCop = duo.duoPriceCop;
  }

  return { unitPrice, totalCop, costCop };
}

export function runOrderValidationTests() {
  const suite = new TestSuite('app/api/orders (Validaciones y Reglas Anti-Adulteración)');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: Pedidos Contra Entrega y Precios Seguros');
  console.log('===============================================================\n');

  // 1. Validación de Celulares en Colombia (10 dígitos arrancando en 3)
  console.log('📌 Bloque 1: Validación Móvil Colombia');

  const validPhones = [
    '3001234567',
    '315-987-6543',
    '(320) 456 7890',
    '310.222.3344',
    ' 301 555 6677 ',
  ];

  validPhones.forEach((phone) => {
    const res = validateOrderInput({
      customer_name: 'Juan Perez',
      customer_phone: phone,
      department: 'Antioquia',
      city: 'Medellín',
      neighborhood: 'El Poblado',
      address: 'Calle 10 # 40-20 Apto 301',
      reference_point: 'Cerca al parque',
      confirmed_cash: true,
    });
    suite.assert(
      res.isValid === true && res.cleanPhone?.startsWith('3') && res.cleanPhone?.length === 10,
      `Acepta y limpia formato celular válido: "${phone}" -> "${res.cleanPhone}"`
    );
  });

  const invalidPhones = [
    '6012345678', // Fijo de Bogotá (empieza por 6)
    '2345678',    // Fijo corto
    '30012345',   // 8 dígitos (incompleto)
    '300123456789', // 12 dígitos (excedido)
    'abc-def-ghij', // Letras
    '573001234567', // Con prefijo de país 57 (12 dígitos)
  ];

  invalidPhones.forEach((phone) => {
    const res = validateOrderInput({
      customer_name: 'Juan Perez',
      customer_phone: phone,
      department: 'Antioquia',
      city: 'Medellín',
      neighborhood: 'El Poblado',
      address: 'Calle 10 # 40-20',
      reference_point: 'Cerca al parque',
      confirmed_cash: true,
    });
    suite.assert(res.isValid === false, `Rechaza correctamente celular inválido: "${phone}"`);
  });

  // 2. Validación de campos obligatorios
  console.log('\n📌 Bloque 2: Integridad de Campos de Destino');

  const baseValid = {
    customer_name: 'Carlos Rodriguez',
    customer_phone: '3119876543',
    department: 'Cundinamarca',
    city: 'Soacha',
    neighborhood: 'San Mateo',
    address: 'Carrera 5 # 12-30',
    reference_point: 'Frente a la panadería',
    confirmed_cash: true,
  };

  // Nombre muy corto
  suite.assert(
    validateOrderInput({ ...baseValid, customer_name: 'Al' }).isValid === false,
    'Rechaza nombre de menos de 3 caracteres'
  );

  // Barrio vacío
  suite.assert(
    validateOrderInput({ ...baseValid, neighborhood: ' ' }).isValid === false,
    'Rechaza barrio vacío (evita devoluciones por falta de nomenclatura)'
  );

  // Dirección muy corta
  suite.assert(
    validateOrderInput({ ...baseValid, address: 'Cra' }).isValid === false,
    'Rechaza dirección incompleta (< 5 caracteres)'
  );

  // Sin punto de referencia
  suite.assert(
    validateOrderInput({ ...baseValid, reference_point: '' }).isValid === false,
    'Rechaza punto de referencia vacío'
  );

  // Sin confirmación de efectivo
  suite.assert(
    validateOrderInput({ ...baseValid, confirmed_cash: false }).isValid === false,
    'Rechaza pedido si no se confirma disponibilidad de dinero en efectivo'
  );

  // 3. Reglas Antifraude y Recálculo Seguro de Precios
  console.log('\n📌 Bloque 3: Recálculo Seguro de Precios en Backend (Anti-Tampering)');

  // Caso: Producto base Costo 18.000, PVP 79.900
  const order1x = calculateAuthoritativeOrderTotal({
    productCost: 18000,
    parentSellPrice: 79900,
    qtyMode: '1x',
  });
  suite.assertEqual(order1x.totalCop, 79900, 'Calcula autoritativamente total 1x = 79.900 COP');

  const order2x = calculateAuthoritativeOrderTotal({
    productCost: 18000,
    parentSellPrice: 79900,
    qtyMode: '2x',
  });
  // Combo 2x: Unidad 1 (79.900) + Costo (18.000) = 97.900 -> Redondeo 9.900 = 99.900
  suite.assertEqual(order2x.totalCop, 99900, 'Calcula autoritativamente total combo 2x = 99.900 COP');

  // Caso: Variante con precio diferente (Costo mayor: 44.900 COP)
  const orderVarCustom1x = calculateAuthoritativeOrderTotal({
    productCost: 18000,
    parentSellPrice: 79900,
    qtyMode: '1x',
    matchedVariation: { sale_price: 44900 },
  });
  // 44.900 + 55.000 = 99.900 -> Redondeo 9.900 = 99.900 COP
  suite.assertEqual(
    orderVarCustom1x.unitPrice,
    99900,
    'Calcula autoritativamente precio unitario según variante seleccionada (99.900 COP)'
  );
  suite.assertEqual(
    orderVarCustom1x.totalCop,
    99900,
    'Total orden 1x se ajusta al costo de la variante'
  );

  // Combo 2x con variante de costo 44.900
  const orderVarCustom2x = calculateAuthoritativeOrderTotal({
    productCost: 18000,
    parentSellPrice: 79900,
    qtyMode: '2x',
    matchedVariation: { sale_price: 44900 },
  });
  // Unidad 1 (99.900) + Costo Variante (44.900) = 144.800 -> Redondeo 9.900 = 149.900 COP
  suite.assertEqual(
    orderVarCustom2x.totalCop,
    149900,
    'Total orden 2x para variante mayor calcula exactamente 149.900 COP'
  );

  return suite.summary();
}

if (process.argv[1]?.endsWith('order-validation.test.ts')) {
  const result = runOrderValidationTests();
  if (result.failed > 0) process.exit(1);
}
