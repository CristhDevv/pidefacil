process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_PROJECT_REF = 'gmxgwtdmsetzjpyqrkgq';
const SUPABASE_MGMT_TOKEN = process.env.SUPABASE_MGMT_TOKEN || '';

async function main() {
  console.log('--- Creando columna generada categories_text e índice trigram ---');

  const sql = `
    -- 1. Columna generada categories_text para búsquedas de categoría instantáneas
    ALTER TABLE public.products 
    ADD COLUMN IF NOT EXISTS categories_text TEXT 
    GENERATED ALWAYS AS (categories::text) STORED;

    -- 2. Índice Trigram para búsquedas de categoría insensibles a mayúsculas
    CREATE INDEX IF NOT EXISTS idx_products_categories_text_trgm 
    ON public.products USING gin (categories_text gin_trgm_ops);

    -- 3. Actualizar estadísticas del optimizador de PostgreSQL
    ANALYZE public.products;
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
  console.log('Resultado creación categories_text:', resJson);
}

main().catch(console.error);
