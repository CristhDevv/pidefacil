process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import Database from 'better-sqlite3';
import path from 'path';

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'gmxgwtdmsetzjpyqrkgq';
const SUPABASE_MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

async function main() {
  console.log('--- Aplicando display_priority en Supabase (PostgreSQL) ---');

  const sql = `
    ALTER TABLE public.products ADD COLUMN IF NOT EXISTS display_priority SMALLINT NOT NULL DEFAULT 0;

    UPDATE public.products 
    SET display_priority = 1
    WHERE (name ~* '(belleza|shampoo|aclarante|antiarrugas|s[eé]rum|pestañ|keratina|crema.*facial|dermatol|dermocosm|maquillaje|labial|esmalt)'
       OR categories::text ~* 'belleza');

    UPDATE public.products 
    SET display_priority = 2
    WHERE (name ~* '(boxer|bóxer|lencer[ií]a|[ií]ntim[oa]|pantys?|brasier|faja|tanga|cachetero|er[oó]tic|vibrador|afrodisiac|lubricante|cond[oó]n|preservativo|levanta.*gl[uú]teo|levanta.*cola)'
       OR categories::text ~* '(lencer[ií]a|[ií]ntim[oa]|er[oó]tic)');

    CREATE INDEX IF NOT EXISTS idx_supabase_products_priority ON public.products(display_priority, stock_real DESC);
  `;

  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${SUPABASE_MGMT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  const resJson = await res.json();
  console.log('Resultado en Supabase:', resJson);

  // También actualizar SQLite local si la columna no existe
  console.log('\n--- Actualizando SQLite local ---');
  try {
    const dbPath = path.resolve('data/pidefacil.db');
    const db = new Database(dbPath);
    try {
      db.exec('ALTER TABLE products ADD COLUMN display_priority INTEGER NOT NULL DEFAULT 0');
    } catch {}

    db.exec(`
      UPDATE products 
      SET display_priority = 1
      WHERE (lower(name) LIKE '%belleza%' OR lower(name) LIKE '%shampoo%' OR lower(name) LIKE '%aclarante%' OR lower(name) LIKE '%serum%' OR lower(name) LIKE '%pestañ%' OR lower(categories) LIKE '%belleza%');

      UPDATE products 
      SET display_priority = 2
      WHERE (lower(name) LIKE '%boxer%' OR lower(name) LIKE '%bóxer%' OR lower(name) LIKE '%lenceria%' OR lower(name) LIKE '%lencería%' OR lower(name) LIKE '%intimo%' OR lower(name) LIKE '%íntimo%' OR lower(name) LIKE '%intima%' OR lower(name) LIKE '%íntima%' OR lower(name) LIKE '%pantys%' OR lower(name) LIKE '%panty%' OR lower(name) LIKE '%brasier%' OR lower(name) LIKE '%faja%' OR lower(name) LIKE '%tanga%' OR lower(name) LIKE '%erotico%' OR lower(name) LIKE '%erótico%' OR lower(name) LIKE '%vibrador%' OR lower(categories) LIKE '%lenceria%' OR lower(categories) LIKE '%lencería%');
    `);
    console.log('SQLite actualizado.');
  } catch (e: any) {
    console.log('SQLite error (no crítico):', e.message);
  }
}

main().catch(console.error);
