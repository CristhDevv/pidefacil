process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import Database from 'better-sqlite3';
import path from 'path';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

const dbPath = path.resolve('data/pidefacil.db');
const db = new Database(dbPath);

async function syncProducts(limitTotal = 20000) {
  console.log(`\n===============================================================`);
  console.log(`🚀 SINCRONIZANDO PRODUCTOS A SUPABASE (POSTGRESQL)`);
  console.log(`===============================================================`);

  // Priorizar: 1) Productos con descripción, 2) Alto stock, activos
  const query = db.prepare(`
    SELECT 
      id_dropi, sku, name, type, cost_cop, suggested_price_cop, sell_price_cop,
      stock_real, stock_por_variacion, supplier_id, supplier_name, supplier_badge,
      categories, image_url, gallery, description, description_is_empty,
      is_active, needs_review, missing_sweeps_count, deactivation_reason,
      first_seen_at, last_seen_at, updated_at
    FROM products
    WHERE is_active = 1 AND stock_real > 0
    ORDER BY 
      CASE WHEN description IS NOT NULL AND length(description) > 0 THEN 0 ELSE 1 END ASC,
      stock_real DESC
    LIMIT ?
  `);

  const rows = query.all(limitTotal);
  console.log(`📦 Obtenidos ${rows.length} productos prioritarios de SQLite.`);

  const batchSize = 500;
  let inserted = 0;

  for (let i = 0; i < rows.length; i += batchSize) {
    const batch = rows.slice(i, i + batchSize);
    const formatted = batch.map((p: any) => ({
      ...p,
      stock_por_variacion: p.stock_por_variacion ? safeJson(p.stock_por_variacion) : null,
      categories: p.categories ? safeJson(p.categories) : null,
      gallery: p.gallery ? safeJson(p.gallery) : null,
    }));

    const res = await fetch(`${SUPABASE_URL}/rest/v1/products`, {
      method: 'POST',
      headers: {
        'apikey': SERVICE_ROLE_KEY,
        'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates',
      },
      body: JSON.stringify(formatted),
    });

    if (!res.ok) {
      console.error(`❌ Error en lote ${i}-${i + batch.length}:`, await res.text());
    } else {
      inserted += batch.length;
      process.stdout.write(`⚡ Sincronizados ${inserted}/${rows.length} productos en Supabase...\r`);
    }
  }

  console.log(`\n✅ ¡${inserted} productos sincronizados exitosamente a Supabase!`);
}

function safeJson(str: string) {
  try {
    return JSON.parse(str);
  } catch {
    return null;
  }
}

// Ejecutar sincronización de los primeros 10.000 productos top
syncProducts(10000).catch(console.error);
