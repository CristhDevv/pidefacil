process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import Database from 'better-sqlite3';
import path from 'path';
import dotenv from 'dotenv';
import fs from 'fs';

if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gmxgwtdmsetzjpyqrkgq.supabase.co';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdteGd3dGRtc2V0empweXFya2dxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc5Mjc1NTM4MSwiZXhwIjoyMTA4MzMxMzgxfQ.IfHS8QPS_JO7-FuHhK3pJ8UHWsNuIL_BSJsft0SfGp4';

const dbPath = path.resolve('data/pidefacil.db');
const db = new Database(dbPath);

function safeJson(str: string | null | undefined) {
  if (!str) return null;
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

async function sendBatch(batch: any[], retries = 3): Promise<boolean> {
  const formatted = batch.map((p) => ({
    id_dropi: p.id_dropi,
    sku: p.sku || null,
    name: p.name,
    type: p.type,
    cost_cop: p.cost_cop,
    suggested_price_cop: p.suggested_price_cop || null,
    sell_price_cop: p.sell_price_cop,
    stock_real: p.stock_real,
    stock_por_variacion: safeJson(p.stock_por_variacion),
    supplier_id: p.supplier_id || null,
    supplier_name: p.supplier_name || null,
    supplier_badge: p.supplier_badge || null,
    categories: safeJson(p.categories),
    image_url: p.image_url || null,
    gallery: safeJson(p.gallery),
    description: p.description || null,
    description_is_empty: p.description_is_empty || 0,
    is_active: p.is_active || 0,
    needs_review: p.needs_review || 0,
    missing_sweeps_count: p.missing_sweeps_count || 0,
    deactivation_reason: p.deactivation_reason || null,
    first_seen_at: p.first_seen_at,
    last_seen_at: p.last_seen_at,
    updated_at: p.updated_at,
  }));

  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
        method: 'POST',
        headers: {
          apikey: SERVICE_ROLE_KEY,
          Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
        },
        body: JSON.stringify(formatted),
      });

      if (res.ok) {
        return true;
      }

      const errText = await res.text();
      if (attempt === retries) {
        console.error(`\n❌ Error HTTP ${res.status} tras ${retries} intentos:`, errText.slice(0, 200));
        return false;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    } catch (e: any) {
      if (attempt === retries) {
        console.error(`\n❌ Excepción de red tras ${retries} intentos:`, e.message);
        return false;
      }
      await new Promise((r) => setTimeout(r, 1000 * attempt));
    }
  }
  return false;
}

async function main() {
  console.log('===============================================================');
  console.log('🚀 MIGRACIÓN MASIVA DE CATÁLOGO COMPLETO A SUPABASE POSTGRESQL');
  console.log('===============================================================');

  const countRow = db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND stock_real > 0').get() as { count: number };
  const totalProducts = countRow.count;
  console.log(`📊 Total productos activos con stock para migrar: ${totalProducts.toLocaleString('es-CO')}`);

  const BATCH_SIZE = 150;
  const CONCURRENCY = 4;
  const startTime = Date.now();

  let processed = 0;
  let offset = 0;

  const selectStmt = db.prepare(`
    SELECT 
      id_dropi, sku, name, type, cost_cop, suggested_price_cop, sell_price_cop,
      stock_real, stock_por_variacion, supplier_id, supplier_name, supplier_badge,
      categories, image_url, gallery, description, description_is_empty,
      is_active, needs_review, missing_sweeps_count, deactivation_reason,
      first_seen_at, last_seen_at, updated_at
    FROM products
    WHERE is_active = 1 AND stock_real > 0
    ORDER BY id_dropi ASC
    LIMIT ? OFFSET ?
  `);

  while (offset < totalProducts) {
    const tasks: Promise<boolean>[] = [];
    const currentBatches: number[] = [];

    for (let c = 0; c < CONCURRENCY && offset < totalProducts; c++) {
      const rows = selectStmt.all(BATCH_SIZE, offset) as any[];
      if (rows.length === 0) break;

      currentBatches.push(rows.length);
      tasks.push(sendBatch(rows));
      offset += rows.length;
    }

    if (tasks.length === 0) break;

    const results = await Promise.all(tasks);
    for (let i = 0; i < results.length; i++) {
      if (results[i]) {
        processed += currentBatches[i];
      }
    }

    const elapsedSec = (Date.now() - startTime) / 1000;
    const rate = Math.round(processed / (elapsedSec || 1));
    const percent = ((processed / totalProducts) * 100).toFixed(1);
    const remainingSec = Math.round((totalProducts - processed) / (rate || 1));
    const remainingMin = (remainingSec / 60).toFixed(1);

    process.stdout.write(
      `⚡ Progreso: ${processed.toLocaleString('es-CO')} / ${totalProducts.toLocaleString('es-CO')} (${percent}%) | ` +
      `Ritmo: ${rate} prod/s | ETA: ${remainingMin} min    \r`
    );
  }

  const totalMinutes = ((Date.now() - startTime) / 60000).toFixed(2);
  console.log(`\n\n✅ MIGRACIÓN FINALIZADA en ${totalMinutes} minutos.`);
  console.log(`📦 Total sincronizados con éxito: ${processed.toLocaleString('es-CO')} productos.`);

  // Auditoría en Supabase
  console.log('\n🔍 Realizando conteo de verificación en Supabase...');
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/products?select=id_dropi`, {
      headers: {
        apikey: SERVICE_ROLE_KEY,
        Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
        Range: '0-0',
        Prefer: 'count=exact',
      },
    });
    console.log('Conteo exacto verificado en Supabase:', res.headers.get('content-range'));
  } catch (e: any) {
    console.error('Error verificando conteo:', e.message);
  }
}

main().catch(console.error);
