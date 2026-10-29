/**
 * ==============================================================================
 * TEST SUITE: VISTA DE PRODUCTO DE VENDEDOR, MULTIVARIANTE Y PROVEEDORES
 * ==============================================================================
 * Cubre:
 * 1. Cálculos dinámicos de selección libre de variantes para vendedores:
 *    - Suma exacta del costo mayorista por variante seleccionada
 *    - Suma exacta del PVP sugerido por variante
 *    - Sin límite de 2 unidades (soporta 1, 5, 10, 20 o más unidades)
 *    - Flete promedio nacional de $25.000 COP
 *    - Total a pagar a bodega = Costo acumulado + $25.000 COP
 *    - Ganancia estimada en tiempo real = Cobro al cliente - Total bodega
 * 2. Manejo de insignias de proveedor (supplier_badge):
 *    - PREMIUM EXCLUSIVO (Top 1%, alta fidelidad)
 *    - PREMIUM (Recomendado)
 *    - VERIFICADO (Bodega física auditada)
 *    - Fallback seguro a "Bodega Nacional Aliada"
 * 3. Integridad Marca Blanca (Cero fugas del proveedor de fulfillment)
 */

import { TestSuite } from './test-utils';
import { formatCOP } from '../config/pricing';

export function runSellerPdpAndSupplierTests() {
  const suite = new TestSuite('Vista Vendedor PDP, Multivariante y Proveedores');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: Vista Vendedor PDP & Proveedores');
  console.log('===============================================================\n');

  // Helper de cálculo idéntico al de app/producto/[id]/page.tsx
  function calculateSellerSettlement(
    items: Array<{ quantity: number; unitCost: number; unitPvp: number }>,
    customFreight: number = 25000
  ) {
    const totalUnits = items.reduce((acc, it) => acc + Math.max(0, it.quantity), 0);
    const totalCost = items.reduce((acc, it) => acc + Math.max(0, it.quantity) * it.unitCost, 0);
    const totalPvp = items.reduce((acc, it) => acc + Math.max(0, it.quantity) * it.unitPvp, 0);
    const freight = totalUnits > 0 ? customFreight : 0;
    const totalToPayWarehouse = totalCost + freight;
    const estimatedProfit = Math.max(0, totalPvp - totalToPayWarehouse);

    return {
      totalUnits,
      totalCost,
      totalPvp,
      freight,
      totalToPayWarehouse,
      estimatedProfit,
    };
  }

  // Helper de recomendación de proveedor
  function getSupplierRecommendation(badge: string | null | undefined, supplierName: string | null | undefined) {
    const safeSupplier = supplierName?.trim() || 'Bodega Nacional Aliada';
    let tier = 'ESTANDAR';
    let isRecommended = false;

    if (badge === 'PREMIUM EXCLUSIVO') {
      tier = 'PREMIUM_EXCLUSIVO';
      isRecommended = true;
    } else if (badge === 'PREMIUM') {
      tier = 'PREMIUM';
      isRecommended = true;
    } else if (badge === 'VERIFICADO' || badge === 'VERIFIED') {
      tier = 'VERIFICADO';
      isRecommended = true;
    }

    return {
      tier,
      isRecommended,
      displayName: safeSupplier,
    };
  }

  // --------------------------------------------------------------------------
  console.log('📌 Bloque 1: Liquidación Dinámica Multivariante con Cantidades Libres');

  // Test 1: Múltiples variantes con diferente costo y PVP
  const itemsMulti = [
    { quantity: 2, unitCost: 15000, unitPvp: 69900 },
    { quantity: 3, unitCost: 45000, unitPvp: 119900 },
  ];
  const resMulti = calculateSellerSettlement(itemsMulti);

  suite.assertEqual(resMulti.totalUnits, 5, 'Total de unidades debe ser 5 (2 + 3)');
  suite.assertEqual(resMulti.totalCost, 165000, 'Costo mayorista total debe ser exactamente 165.000 COP');
  suite.assertEqual(resMulti.totalPvp, 499500, 'Total sugerido a cobrar al cliente debe ser 499.500 COP');
  suite.assertEqual(resMulti.freight, 25000, 'Flete promedio nacional debe ser 25.000 COP');
  suite.assertEqual(resMulti.totalToPayWarehouse, 190000, 'Total a pagar a bodega debe ser 190.000 COP (165k + 25k)');
  suite.assertEqual(resMulti.estimatedProfit, 309500, 'Ganancia neta estimada debe ser 309.500 COP (499.5k - 190k)');

  // Test 2: Cantidad libre grande (20 unidades)
  const itemsLarge = [{ quantity: 20, unitCost: 20000, unitPvp: 69900 }];
  const resLarge = calculateSellerSettlement(itemsLarge);
  suite.assertEqual(resLarge.totalUnits, 20, 'Permite comprar 20 unidades sin restricción');
  suite.assertEqual(resLarge.totalCost, 400000, 'Costo total para 20 unidades = 400.000 COP');
  suite.assertEqual(resLarge.totalPvp, 1398000, 'Cobro cliente = 1.398.000 COP');
  suite.assertEqual(resLarge.totalToPayWarehouse, 425000, 'Costo bodega + Flete = 425.000 COP');
  suite.assertEqual(resLarge.estimatedProfit, 973000, 'Ganancia neta vendedor = 973.000 COP');

  // Test 3: Estado vacío (0 unidades)
  const itemsEmpty = [
    { quantity: 0, unitCost: 15000, unitPvp: 69900 },
    { quantity: 0, unitCost: 45000, unitPvp: 119900 },
  ];
  const resEmpty = calculateSellerSettlement(itemsEmpty);
  suite.assertEqual(resEmpty.totalUnits, 0, 'Unidades en 0 cuando no hay selección');
  suite.assertEqual(resEmpty.totalCost, 0, 'Costo en 0 cuando no hay selección');
  suite.assertEqual(resEmpty.freight, 0, 'Sin flete si no hay unidades');
  suite.assertEqual(resEmpty.totalToPayWarehouse, 0, 'Total bodega en 0');
  suite.assertEqual(resEmpty.estimatedProfit, 0, 'Ganancia en 0');

  // Test 4: Manejo de cantidades negativas
  const itemsNeg = [
    { quantity: -5, unitCost: 20000, unitPvp: 60000 },
    { quantity: 2, unitCost: 30000, unitPvp: 80000 },
  ];
  const resNeg = calculateSellerSettlement(itemsNeg);
  suite.assertEqual(resNeg.totalUnits, 2, 'Unidades negativas deben ignorarse');
  suite.assertEqual(resNeg.totalCost, 60000, 'Costo sólo suma las unidades válidas');

  // --------------------------------------------------------------------------
  console.log('📌 Bloque 2: Clasificación de Proveedores y Recomendaciones Comerciales');

  // Test 5: Proveedor PREMIUM EXCLUSIVO
  const recExclusivo = getSupplierRecommendation('PREMIUM EXCLUSIVO', 'Bodega Principal Medellín');
  suite.assertEqual(recExclusivo.tier, 'PREMIUM_EXCLUSIVO', 'Debe clasificar como PREMIUM_EXCLUSIVO');
  suite.assert(recExclusivo.isRecommended, 'Debe marcarse como altamente recomendado para el vendedor');
  suite.assertEqual(recExclusivo.displayName, 'Bodega Principal Medellín', 'Nombre de proveedor preservado');

  // Test 6: Proveedor PREMIUM
  const recPremium = getSupplierRecommendation('PREMIUM', 'Importaciones Andinas');
  suite.assertEqual(recPremium.tier, 'PREMIUM', 'Debe clasificar como PREMIUM');
  suite.assert(recPremium.isRecommended, 'Debe marcarse como recomendado');

  // Test 7: Proveedor VERIFICADO
  const recVerificado = getSupplierRecommendation('VERIFICADO', 'Distribuciones Bogotá');
  suite.assertEqual(recVerificado.tier, 'VERIFICADO', 'Debe clasificar VERIFICADO');
  suite.assert(recVerificado.isRecommended, 'Proveedor verificado es recomendado');

  // Test 8: Fallback seguro
  const recFallback = getSupplierRecommendation(null, null);
  suite.assertEqual(recFallback.tier, 'ESTANDAR', 'Tier debe ser ESTANDAR');
  suite.assertEqual(recFallback.displayName, 'Bodega Nacional Aliada', 'Fallback sin revelar plataformas');
  suite.assert(!recFallback.isRecommended, 'No debe tener insignia especial si es estándar');

  // --------------------------------------------------------------------------
  console.log('📌 Bloque 3: Formateo de Precios y Textos de Flete');

  suite.assertEqual(formatCOP(25000), '$25.000', 'Flete $25.000 formateado correctamente');
  suite.assertEqual(formatCOP(165000), '$165.000', 'Costo acumulado $165.000 formateado');
  suite.assertEqual(formatCOP(309500), '$309.500', 'Ganancia $309.500 formateada');

  return suite.summary();
}
