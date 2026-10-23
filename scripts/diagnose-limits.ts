/**
 * ==============================================================================
 * Diagnóstico Riguroso de Límites del API de Dropi
 * ==============================================================================
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { getDropiConfig, dropiFetch } from './dropi-client';

async function diagnose() {
  console.log('\n===============================================================');
  console.log('🔬 DIAGNÓSTICO CIENTÍFICO DE LÍMITES Y TOPES DROPI API v2');
  console.log('===============================================================\n');

  const config = getDropiConfig();
  console.log(`👤 User ID activo: ${config.userId}`);
  console.log(`🔑 Token presente: ${Boolean(config.token)}`);

  const endpoint = `/produit/${config.userId}/search`;

  // 1. Inspeccionar campos completos devueltos en la respuesta con keywords: ""
  console.log('\n--- 1. Inspección de campos y total en Página 1 (keywords: "") ---');
  const resP1 = await dropiFetch<any>(endpoint, {
    method: 'POST',
    body: {
      keywords: '',
      pageSize: 40,
      country: config.country,
      page: 1,
      startData: 0,
    },
  });

  if (!resP1.ok || !resP1.data) {
    console.error('❌ Error en Página 1:', resP1.status, resP1.error);
    process.exit(1);
  }

  const rawKeys = Object.keys(resP1.data);
  console.log('Llaves raíz de la respuesta HTTP:', rawKeys);

  const dataObj = resP1.data.data;
  if (dataObj) {
    console.log('Llaves dentro de response.data:', Object.keys(dataObj));
    console.log('total en response.data:', dataObj.total);
    console.log('count en response.data:', dataObj.count);
    console.log('total_pages en response.data:', dataObj.total_pages);
    console.log('seed devuelta:', dataObj.seed);
    console.log('Cantidad de productos recibidos en pág 1:', dataObj.products?.length);
  }

  // 2. Probar página 50 (producto 2.000) y página 51 (producto 2.040)
  console.log('\n--- 2. Prueba de Frontera: Página 50 (offset 1960) vs Página 51 (offset 2000) ---');
  const seed = dataObj?.seed;

  console.log('Probando Página 50 (startData: 1960)...');
  const resP50 = await dropiFetch<any>(endpoint, {
    method: 'POST',
    body: {
      keywords: '',
      pageSize: 40,
      country: config.country,
      page: 50,
      startData: 1960,
      seed,
    },
  });

  const p50Count = resP50.data?.data?.products?.length ?? 'null';
  console.log(`HTTP ${resP50.status} | Productos en Pág 50: ${p50Count}`);

  console.log('Probando Página 51 (startData: 2000)...');
  const resP51 = await dropiFetch<any>(endpoint, {
    method: 'POST',
    body: {
      keywords: '',
      pageSize: 40,
      country: config.country,
      page: 51,
      startData: 2000,
      seed,
    },
  });

  const p51Products = resP51.data?.data?.products;
  const p51Count = p51Products ? p51Products.length : 'null/vacío';
  console.log(`HTTP ${resP51.status} | Productos en Pág 51: ${p51Count}`);

  if (p51Products && p51Products.length > 0) {
    console.log('✅ El API de Dropi SÍ entrega productos más allá del producto 2.000');
    console.log(`Muestra producto en pág 51: ID ${p51Products[0].id} - ${p51Products[0].name}`);
  } else {
    console.log('🛑 El API de Dropi TRUNCA la consulta en 2.000 productos (página 50).');
  }

  // 3. Probar página 100 (offset 3960) para verificar límite profundo
  console.log('\n--- 3. Prueba de Profundidad: Página 100 (startData: 3960) ---');
  const resP100 = await dropiFetch<any>(endpoint, {
    method: 'POST',
    body: {
      keywords: '',
      pageSize: 40,
      country: config.country,
      page: 100,
      startData: 3960,
      seed,
    },
  });

  const p100Products = resP100.data?.data?.products;
  console.log(`HTTP ${resP100.status} | Productos en Pág 100: ${p100Products ? p100Products.length : 'null/vacío'}`);

  // 4. Probar endpoints de categorías en Dropi
  console.log('\n--- 4. Mapeo de Categorías de Dropi ---');
  const endpointsToTest = [
    '/categories/list',
    '/categories',
    '/category/list',
    '/category/all',
    '/bff/catalog/categories',
    `/produit/${config.userId}/categories`,
  ];

  for (const ep of endpointsToTest) {
    const catRes = await dropiFetch<any>(ep, { method: 'GET' });
    console.log(`GET ${ep} -> HTTP ${catRes.status} (ok: ${catRes.ok})`);
    if (catRes.ok && catRes.data) {
      console.log(`  -> Datos devueltos en ${ep}:`, Array.isArray(catRes.data) ? `Array(${catRes.data.length})` : typeof catRes.data);
    }
  }

  console.log('\n===============================================================');
  console.log('🏁 DIAGNÓSTICO DE LÍMITES COMPLETADO');
  console.log('===============================================================\n');
}

diagnose().catch((err) => {
  console.error('💥 Error en diagnóstico:', err);
  process.exit(1);
});
