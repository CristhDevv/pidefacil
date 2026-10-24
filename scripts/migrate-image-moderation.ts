import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

async function migrate() {
  console.log('--- 1. Migrando SQLite local ---');
  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve('./data/pidefacil.db');

  const sqlite = new Database(dbPath);

  try {
    sqlite.exec('ALTER TABLE products ADD COLUMN crop_top_pct INTEGER DEFAULT 0;');
    console.log('Column crop_top_pct added to products');
  } catch (e: any) {
    console.log('crop_top_pct exists or notice:', e.message);
  }

  try {
    sqlite.exec('ALTER TABLE products ADD COLUMN crop_bottom_pct INTEGER DEFAULT 0;');
    console.log('Column crop_bottom_pct added to products');
  } catch (e: any) {
    console.log('crop_bottom_pct exists or notice:', e.message);
  }

  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS product_image_moderation (
      id_dropi INTEGER PRIMARY KEY,
      has_burned_price INTEGER NOT NULL DEFAULT 0,
      detected_text TEXT,
      detected_patterns TEXT,
      line_details TEXT,
      clean_gallery_urls TEXT,
      correction_applied TEXT NOT NULL DEFAULT 'none',
      crop_top_pct INTEGER NOT NULL DEFAULT 0,
      crop_bottom_pct INTEGER NOT NULL DEFAULT 0,
      original_image_url TEXT,
      active_image_url TEXT,
      review_status TEXT NOT NULL DEFAULT 'pending',
      analyzed_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_pim_has_burned ON product_image_moderation(has_burned_price);
    CREATE INDEX IF NOT EXISTS idx_pim_correction ON product_image_moderation(correction_applied);
    CREATE INDEX IF NOT EXISTS idx_pim_review ON product_image_moderation(review_status);
  `);
  console.log('SQLite product_image_moderation table ready!');

  // Migrar Supabase
  const mgmtToken = process.env.SUPABASE_MGMT_TOKEN;
  const projectRef = 'gmxgwtdmsetzjpyqrkgq';

  if (mgmtToken) {
    console.log('--- 2. Migrando Supabase PostgreSQL vía Management API ---');
    const ddl = `
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS crop_top_pct INTEGER DEFAULT 0;
      ALTER TABLE public.products ADD COLUMN IF NOT EXISTS crop_bottom_pct INTEGER DEFAULT 0;

      CREATE TABLE IF NOT EXISTS public.product_image_moderation (
        id_dropi BIGINT PRIMARY KEY,
        has_burned_price INTEGER NOT NULL DEFAULT 0,
        detected_text TEXT,
        detected_patterns JSONB DEFAULT '[]'::jsonb,
        line_details JSONB DEFAULT '[]'::jsonb,
        clean_gallery_urls JSONB DEFAULT '[]'::jsonb,
        correction_applied TEXT NOT NULL DEFAULT 'none',
        crop_top_pct INTEGER NOT NULL DEFAULT 0,
        crop_bottom_pct INTEGER NOT NULL DEFAULT 0,
        original_image_url TEXT,
        active_image_url TEXT,
        review_status TEXT NOT NULL DEFAULT 'pending',
        analyzed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_pim_has_burned ON public.product_image_moderation(has_burned_price);
      CREATE INDEX IF NOT EXISTS idx_pim_correction ON public.product_image_moderation(correction_applied);
      CREATE INDEX IF NOT EXISTS idx_pim_review ON public.product_image_moderation(review_status);
    `;

    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${projectRef}/database/query`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${mgmtToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ query: ddl }),
      });
      const data = await res.json();
      console.log('Supabase DDL status:', res.status, data);
    } catch (err: any) {
      console.error('Error enviando DDL a Supabase:', err.message);
    }
  }

  console.log('Migración completada con éxito.');
}

migrate().catch(console.error);
