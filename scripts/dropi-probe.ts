/**
 * ==============================================================================
 * PideFácil - Sonda de Paginación Dropi Colombia API v2 (Paso 0)
 * ==============================================================================
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import {
  getDropiConfig,
  dropiFetch,
  buildCloudFrontImageUrl,
  DropiSearchResponse,
} from './dropi-client';

async function runProbe() {
  console.log('\n===============================================================');
  console.log('🔬 PIDEFÁCIL — SONDA DE PAGINACIÓN Y DIAGNÓSTICO DROPI (PASO 0)');
  console.log('===============================================================\n');

  const config = getDropiConfig();

  console.log('📋 Configuración Activa:');
  console.log(`   - API Base: ${config.apiBase}`);
  console.log(`   - País: ${config.country}`);
  console.log(
    `   - Token JWT: ${config.token ? 'Configurado (' + config.token.slice(0, 15) + '...)' : '❌ NO ENCONTRADO'}`
  );
  console.log(`   - User ID Detectado: ${config.userId || '❌ NO DETECTADO'}\n`);

  if (!config.token) {
    console.error('❌ ERROR FATAL: No se encontró DROPI_TOKEN.');
    console.error('Por favor configure DROPI_TOKEN en .env.local o cree el archivo .secrets/dropi_token.txt\n');
    process.exit(1);
  }

  // ----------------------------------------------------------------------------
  // 1. Diagnóstico de Endpoints
  // ----------------------------------------------------------------------------
  console.log('📡 1. Diagnosticando Endpoint Principal: POST /produit/{userId}/search');
  const mainEndpoint = `/produit/${config.userId}/search`;

  const probeP1Body: any = {
    keywords: '',
    pageSize: 40,
    country: config.country,
  };

  const res1 = await dropiFetch<DropiSearchResponse>(mainEndpoint, {
    method: 'POST',
    body: probeP1Body,
  });

  if (!res1.ok || !res1.data) {
    console.warn(`⚠️ Endpoint Principal respondió con status ${res1.status}: ${res1.error || 'Sin datos'}`);
  } else {
    const p1Products = res1.data.data?.products || [];
    const seedP1 = res1.data.data?.seed;
    console.log(`   ✅ Respuesta Exitosa HTTP ${res1.status}`);
    console.log(`   📦 Productos recibidos en Página 1: ${p1Products.length}`);
    console.log(`   🌱 Semilla (seed) devuelta: ${seedP1 || 'null'}`);

    if (p1Products.length > 0) {
      const p = p1Products[0];
      console.log(`   🔍 Muestra Producto #1:`);
      console.log(`      - ID: ${p.id}`);
      console.log(`      - Nombre: ${p.name}`);
      console.log(`      - Costo (sale_price): $${p.sale_price?.toLocaleString('es-CO')}`);
      console.log(`      - Tipo: ${p.type || (p.variation_stock ? 'VARIABLE' : 'SIMPLE')}`);
      console.log(`      - Stock Simple: ${p.stock_simple ?? 'N/A'}`);
      console.log(`      - Stock Variación: ${p.variation_stock ?? 'N/A'}`);
      console.log(`      - Proveedor: ${p.supplier?.name || 'N/A'} (ID: ${p.supplier?.id || 'N/A'})`);
      console.log(`      - Imagen CDN: ${buildCloudFrontImageUrl(p.image)}`);
    }

    // --------------------------------------------------------------------------
    // 2. Prueba de Avance a Página 2 (Comprobación de Disyunción Matemática)
    // --------------------------------------------------------------------------
    console.log('\n📡 2. Solicitando Página 2 (probando propagación de seed y avance)...');

    // Probar avance con página 2 y seed
    const probeP2Body: any = {
      keywords: '',
      pageSize: 40,
      country: config.country,
      page: 2,
      startData: 40,
      seed: seedP1,
    };

    const res2 = await dropiFetch<DropiSearchResponse>(mainEndpoint, {
      method: 'POST',
      body: probeP2Body,
    });

    if (res2.ok && res2.data) {
      const p2Products = res2.data.data?.products || [];
      const seedP2 = res2.data.data?.seed;

      console.log(`   ✅ Página 2 respondió HTTP ${res2.status}`);
      console.log(`   📦 Productos recibidos en Página 2: ${p2Products.length}`);
      console.log(`   🌱 Semilla en Página 2: ${seedP2 || 'null'}`);

      // Comprobación de Disyunción
      const p1Ids = new Set(p1Products.map((p) => p.id));
      const p2Ids = new Set(p2Products.map((p) => p.id));
      const intersection = [...p1Ids].filter((id) => p2Ids.has(id));

      console.log('\n📐 3. Comprobación Matemática de Disyunción:');
      console.log(`   - IDs Únicos Página 1: ${p1Ids.size}`);
      console.log(`   - IDs Únicos Página 2: ${p2Ids.size}`);
      console.log(`   - Coincidencias / Duplicados: ${intersection.length}`);

      if (intersection.length > 0 && intersection.length === p1Ids.size) {
        console.error('\n🚨 ==============================================================');
        console.error('🛑 GUARDRAIL CRÍTICO DISPARADO: LA PAGINACIÓN NO AVANZA');
        console.error('La Página 2 devolvió exactamente los mismos IDs que la Página 1.');
        console.error('El endpoint /produit/{userId}/search ignora los parámetros probados.');
        console.error('Se aborta el barrido masivo para evitar duplicación y consumo inútil.');
        console.error('==============================================================\n');
        process.exit(1);
      } else if (intersection.length === 0) {
        console.log('   🎉 DISYUNCIÓN 100%: Los conjuntos de IDs son perfectamente disjuntos.');
        console.log('   ✅ La paginación avanza de forma correcta y lineal.');
      } else {
        console.log(`   ⚠️ Disyunción parcial: ${intersection.length} IDs repetidos entre páginas consecutivas.`);
      }
    }
  }

  // ----------------------------------------------------------------------------
  // 3. Prueba de Endpoint Alternativo BFF
  // ----------------------------------------------------------------------------
  console.log('\n📡 4. Diagnosticando Endpoint Alternativo: POST /bff/catalog/products/v4/index');
  const bffEndpoint = '/bff/catalog/products/v4/index';

  const resBff = await dropiFetch<any>(bffEndpoint, {
    method: 'POST',
    body: {
      pageSize: 40,
      page: 1,
      country: config.country,
    },
  });

  if (resBff.ok && resBff.data) {
    console.log(`   ✅ Endpoint BFF responde HTTP ${resBff.status}`);
    const bffCount = Array.isArray(resBff.data?.data)
      ? resBff.data.data.length
      : Array.isArray(resBff.data?.products)
      ? resBff.data.products.length
      : 0;
    console.log(`   📦 Elementos devueltos por BFF: ${bffCount}`);
  } else {
    console.log(`   ℹ️ Endpoint BFF respondió HTTP ${resBff.status} (${resBff.error || 'No disponible para este rol'})`);
  }

  console.log('\n===============================================================');
  console.log('🏁 SONDA DE PAGINACIÓN FINALIZADA CON ÉXITO');
  console.log('===============================================================\n');
}

runProbe().catch((err) => {
  console.error('💥 Excepción no controlada durante la sonda:', err);
  process.exit(1);
});
