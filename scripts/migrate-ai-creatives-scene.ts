import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

import Database from 'better-sqlite3';
import path from 'path';

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'gmxgwtdmsetzjpyqrkgq';
const SUPABASE_MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN || process.env.SUPABASE_ACCESS_TOKEN || '';

async function executeSqlSupabase(sql: string) {
  if (!SUPABASE_MGMT_TOKEN) {
    console.warn('No SUPABASE_MGMT_TOKEN found, skipping Supabase migration.');
    return;
  }
  const res = await fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/database/query`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${SUPABASE_MGMT_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ query: sql }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.error(`Error en Supabase HTTP ${res.status}: ${text}`);
    return;
  }

  const data = await res.json();
  console.log('Migración Supabase exitosa:', data);
}

async function migrateSqlite() {
  const dbPath = path.join(process.cwd(), 'data', 'pidefacil.db');
  const db = new Database(dbPath);

  // 1. Crear tabla si no existe
  db.exec(`
    CREATE TABLE IF NOT EXISTS product_ai_creatives (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      product_id INTEGER NOT NULL,
      combo_type TEXT NOT NULL,
      angle_1_title TEXT NOT NULL,
      angle_1_desc TEXT,
      angle_1_image TEXT NOT NULL,
      angle_2_title TEXT NOT NULL,
      angle_2_desc TEXT,
      angle_2_image TEXT NOT NULL,
      copy_text TEXT NOT NULL,
      previous_angles TEXT,
      created_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_ai_creatives_product ON product_ai_creatives (product_id, combo_type);
  `);

  // 2. Añadir columnas scene_1_data y scene_2_data de forma segura
  const tableInfo = db.pragma('table_info(product_ai_creatives)') as any[];
  const colNames = tableInfo.map((c) => c.name);

  if (!colNames.includes('scene_1_data')) {
    console.log('Añadiendo columna scene_1_data a SQLite...');
    db.exec('ALTER TABLE product_ai_creatives ADD COLUMN scene_1_data TEXT;');
  }
  if (!colNames.includes('scene_2_data')) {
    console.log('Añadiendo columna scene_2_data a SQLite...');
    db.exec('ALTER TABLE product_ai_creatives ADD COLUMN scene_2_data TEXT;');
  }

  console.log('Migración SQLite completada.');
  db.close();
}

async function migrateSupabase() {
  const ddl = `
    CREATE TABLE IF NOT EXISTS public.product_ai_creatives (
      id BIGSERIAL PRIMARY KEY,
      product_id BIGINT NOT NULL,
      combo_type TEXT NOT NULL,
      angle_1_title TEXT NOT NULL,
      angle_1_desc TEXT,
      angle_1_image TEXT NOT NULL,
      angle_2_title TEXT NOT NULL,
      angle_2_desc TEXT,
      angle_2_image TEXT NOT NULL,
      scene_1_data TEXT,
      scene_2_data TEXT,
      copy_text TEXT NOT NULL,
      previous_angles JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    ALTER TABLE public.product_ai_creatives ADD COLUMN IF NOT EXISTS scene_1_data TEXT;
    ALTER TABLE public.product_ai_creatives ADD COLUMN IF NOT EXISTS scene_2_data TEXT;

    CREATE INDEX IF NOT EXISTS idx_supabase_ai_creatives_product ON public.product_ai_creatives (product_id, combo_type);
    
    ALTER TABLE public.product_ai_creatives ENABLE ROW LEVEL SECURITY;
    DROP POLICY IF EXISTS "Public can view creatives" ON public.product_ai_creatives;
    CREATE POLICY "Public can view creatives" ON public.product_ai_creatives FOR SELECT USING (true);
    DROP POLICY IF EXISTS "Public can insert creatives" ON public.product_ai_creatives;
    CREATE POLICY "Public can insert creatives" ON public.product_ai_creatives FOR INSERT WITH CHECK (true);
  `;
  await executeSqlSupabase(ddl);
}

async function main() {
  console.log('Iniciando migración de product_ai_creatives con scene_1_data y scene_2_data...');
  await migrateSqlite();
  await migrateSupabase();
  console.log('¡Migración lista!');
}

main().catch(console.error);
