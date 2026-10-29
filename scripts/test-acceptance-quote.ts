import { quoteLiveDropiFreight } from '../lib/dropi-quote';
import { getProductById } from '../lib/db';
import { formatCOP } from '../config/pricing';

async function runAcceptanceTest() {
  console.log('================================================================');
  console.log('🧪 PRUEBA DE ACEPTACIÓN: COTIZACIÓN DE FLETES EN VIVO (ROL VENDEDOR)');
  console.log('================================================================\n');

  // Caso 1: Producto SIN medidas (debe fallar ANTES de llamar a Dropi sin inventar 1kg)
  console.log('--- TEST 1: PRODUCTO SIN MEDIDAS (Combo Reloj X8 #1935829) ---');
  const prodSinMedidas = await getProductById(1935829);
  console.log(`Producto: #${prodSinMedidas?.id_dropi} - "${prodSinMedidas?.name}"`);
  console.log(`Medidas en DB: weight=${prodSinMedidas?.weight_kg}, l=${prodSinMedidas?.length_cm}, w=${prodSinMedidas?.width_cm}, h=${prodSinMedidas?.height_cm}`);

  const resSinMedidas = await quoteLiveDropiFreight({
    product: {
      id_dropi: prodSinMedidas!.id_dropi,
      name: prodSinMedidas!.name,
      cost_cop: prodSinMedidas!.cost_cop,
      weight_kg: prodSinMedidas?.weight_kg,
      length_cm: prodSinMedidas?.length_cm,
      width_cm: prodSinMedidas?.width_cm,
      height_cm: prodSinMedidas?.height_cm,
      origin_city_id: prodSinMedidas?.origin_city_id,
      origin_city_name: prodSinMedidas?.origin_city_name,
    },
    quantity: 1,
    sale_price: 99900,
    destination_city_id: 1,
    destination_city_name: 'BOGOTA, D.C.',
  });

  console.log(`¿Cotización exitosa? ${resSinMedidas.ok}`);
  console.log(`Código de error: ${resSinMedidas.code}`);
  console.log(`Mensaje de error: "${resSinMedidas.error}"`);
  if (!resSinMedidas.ok && resSinMedidas.code === 'MISSING_WEIGHT') {
    console.log('✅ RECHAZO CORRECTO: El cotizador rechazó antes de llamar a Dropi y NO inventó peso de 1kg.');
  }

  // Caso 2: Producto CON medidas reales (#2246366: Set Ollas Nia x6)
  console.log('\n--- TEST 2: PRODUCTO CON MEDIDAS REALES (#2246366: Set Ollas Nia x6) ---');
  const prodConMedidas = await getProductById(2246366);
  console.log(`Producto: #${prodConMedidas?.id_dropi} - "${prodConMedidas?.name}"`);
  console.log(`Medidas en DB: weight=${prodConMedidas?.weight_kg} kg, l=${prodConMedidas?.length_cm} cm, w=${prodConMedidas?.width_cm} cm, h=${prodConMedidas?.height_cm} cm`);
  console.log(`Origen en DB: ${prodConMedidas?.origin_city_name} (ID: ${prodConMedidas?.origin_city_id})`);

  const salePrice = 350000;
  const quantity = 1;

  const quote = await quoteLiveDropiFreight({
    product: {
      id_dropi: prodConMedidas!.id_dropi,
      name: prodConMedidas!.name,
      type: prodConMedidas!.type,
      cost_cop: prodConMedidas!.cost_cop,
      weight_kg: prodConMedidas?.weight_kg,
      length_cm: prodConMedidas?.length_cm,
      width_cm: prodConMedidas?.width_cm,
      height_cm: prodConMedidas?.height_cm,
      origin_city_id: prodConMedidas?.origin_city_id,
      origin_city_name: prodConMedidas?.origin_city_name,
    },
    quantity,
    sale_price: salePrice,
    destination_city_id: 1,
    destination_city_name: 'BOGOTA, D.C.',
  });

  console.log('\nFull quote object:', JSON.stringify(quote, null, 2));

  if (!quote.ok) {
    console.error('Error en cotización:', quote.error, quote.code);
    return;
  }

  console.log(`\nFecha/Hora cotización: ${quote.quoted_at}`);
  console.log(`Precio de venta: ${formatCOP(quote.sale_price)}`);
  console.log(`Costo de fábrica: ${formatCOP(quote.product_cost)}`);
  console.log(`Peso cobrable calculado: ${quote.chargeable_weight_kg} kg`);
  console.log(`Ciudad remitente: ${quote.origin_city.name} (ID: ${quote.origin_city.id})`);
  console.log(`Ciudad destino: ${quote.destination_city.name} (ID: ${quote.destination_city.id})`);

  console.log('\n📊 DESGLOSE OFICIAL POR TRANSPORTADORA RECIBIDO DE DROPI:');
  console.log('----------------------------------------------------------------');
  quote.carriers.forEach((c, idx) => {
    console.log(`\n[${idx + 1}] ${c.carrier_name} ${c.is_inter ? '(⭐ RECOMENDADA - INTER)' : ''}`);
    console.log(`    Disponible: ${c.available ? '✅ SÍ' : '❌ NO'}`);
    if (!c.available) {
      console.log(`    Motivo: ${c.error_message}`);
      return;
    }
    console.log(`    • Precio Envío: ${formatCOP(c.precio_envio)}`);
    console.log(`    • Seguro Envío: ${formatCOP(c.seguro_envio)}`);
    console.log(`    • Flete Total: ${formatCOP(c.flete_total)}`);
    console.log(`    • Comisión Admin (5% s/ costo): ${formatCOP(c.admin_fee)}`);
    console.log(`    • Comisión Dropi (5% s/ venta-flete): ${formatCOP(c.dropi_commission)}`);
    console.log(`    • Costo Total Liquidado: ${formatCOP(c.costo_total)}`);
    console.log(`    • Ganancia Neta Estimada Vendedor: +${formatCOP(c.parte_estimada_vendedor)}`);
  });

  console.log('\n================================================================');
  console.log('🎉 PRUEBA DE ACEPTACIÓN COMPLETADA EXITOSAMENTE');
  console.log('================================================================');
}

runAcceptanceTest().catch(console.error);
