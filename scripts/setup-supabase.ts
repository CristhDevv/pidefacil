process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF || 'gmxgwtdmsetzjpyqrkgq';
const SUPABASE_MGMT_TOKEN = process.env.SUPABASE_ACCESS_TOKEN || '';

async function executeSql(sql: string) {
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
    throw new Error(`HTTP ${res.status}: ${text}`);
  }

  return await res.json();
}

async function main() {
  console.log('--- Configurando esquema en Supabase (PostgreSQL) ---');

  const schemaSql = `
    -- Extensión para búsqueda trigram
    CREATE EXTENSION IF NOT EXISTS pg_trgm;

    -- 1. Tabla products
    CREATE TABLE IF NOT EXISTS public.products (
      id_dropi BIGINT PRIMARY KEY,
      sku TEXT,
      name TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('SIMPLE', 'VARIABLE')),
      cost_cop BIGINT NOT NULL,
      suggested_price_cop BIGINT,
      sell_price_cop BIGINT NOT NULL,
      stock_real INTEGER NOT NULL DEFAULT 0,
      stock_por_variacion JSONB,
      supplier_id BIGINT,
      supplier_name TEXT,
      supplier_badge TEXT,
      categories JSONB,
      image_url TEXT,
      gallery JSONB,
      description TEXT,
      description_is_empty SMALLINT NOT NULL DEFAULT 0,
      is_active SMALLINT NOT NULL DEFAULT 0,
      needs_review SMALLINT NOT NULL DEFAULT 0,
      missing_sweeps_count INTEGER NOT NULL DEFAULT 0,
      deactivation_reason TEXT,
      first_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      raw JSONB
    );

    CREATE INDEX IF NOT EXISTS idx_supabase_products_is_active ON public.products(is_active);
    CREATE INDEX IF NOT EXISTS idx_supabase_products_stock ON public.products(stock_real);
    CREATE INDEX IF NOT EXISTS idx_supabase_products_sell_price ON public.products(sell_price_cop);
    CREATE INDEX IF NOT EXISTS idx_supabase_products_name_trgm ON public.products USING gin(name gin_trgm_ops);

    -- 2. Tabla cod_orders
    CREATE TABLE IF NOT EXISTS public.cod_orders (
      id BIGSERIAL PRIMARY KEY,
      order_number TEXT UNIQUE NOT NULL,
      customer_name TEXT NOT NULL,
      customer_phone TEXT NOT NULL,
      department TEXT NOT NULL,
      city TEXT NOT NULL,
      neighborhood TEXT NOT NULL,
      address TEXT NOT NULL,
      reference_point TEXT NOT NULL,
      items JSONB NOT NULL,
      quantity_type TEXT NOT NULL,
      total_cop BIGINT NOT NULL,
      status TEXT NOT NULL DEFAULT 'pendiente_despacho'
        CHECK(status IN ('pendiente_despacho', 'subido_a_dropi', 'en_transito', 'entregado', 'novedad', 'cancelado')),
      dropi_order_id BIGINT,
      notes TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    CREATE INDEX IF NOT EXISTS idx_supabase_orders_status ON public.cod_orders(status);
    CREATE INDEX IF NOT EXISTS idx_supabase_orders_phone ON public.cod_orders(customer_phone);
    CREATE INDEX IF NOT EXISTS idx_supabase_orders_created_at ON public.cod_orders(created_at);

    -- 3. Tabla app_settings
    CREATE TABLE IF NOT EXISTS public.app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );

    -- 4. Tabla sync_checkpoints
    CREATE TABLE IF NOT EXISTS public.sync_checkpoints (
      mode TEXT PRIMARY KEY,
      current_page INTEGER NOT NULL DEFAULT 1,
      current_seed TEXT,
      current_category TEXT,
      extracted_count INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'idle',
      last_error TEXT,
      started_at TIMESTAMPTZ,
      updated_at TIMESTAMPTZ
    );

    -- Configurar RLS (Row Level Security)
    ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.cod_orders ENABLE ROW LEVEL SECURITY;
    ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;

    -- Políticas RLS para productos (lectura pública)
    DROP POLICY IF EXISTS "Public can view active products" ON public.products;
    CREATE POLICY "Public can view active products" ON public.products
      FOR SELECT USING (true);

    -- Políticas RLS para pedidos (inserción pública para checkout)
    DROP POLICY IF EXISTS "Public can insert orders" ON public.cod_orders;
    CREATE POLICY "Public can insert orders" ON public.cod_orders
      FOR INSERT WITH CHECK (true);

    -- Políticas RLS para pedidos (lectura autenticada o service role)
    DROP POLICY IF EXISTS "Anon cannot list all orders" ON public.cod_orders;
    -- Por defecto anon no lee pedidos a menos que sea service_role

    -- Políticas RLS para settings (lectura pública)
    DROP POLICY IF EXISTS "Public can view settings" ON public.app_settings;
    CREATE POLICY "Public can view settings" ON public.app_settings
      FOR SELECT USING (true);
  `;

  console.log('Aplicando DDL...');
  const result = await executeSql(schemaSql);
  console.log('Resultado DDL:', result);

  // Verificar tablas creadas
  const check = await executeSql(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
    ORDER BY table_name;
  `);
  console.log('Tablas en public schema:', check);
}

main().catch(console.error);
