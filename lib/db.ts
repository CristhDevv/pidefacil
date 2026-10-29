/**
 * ==============================================================================
 * PideFácil - Capa Universal de Base de Datos y Persistencia
 * ==============================================================================
 * Soporta Supabase (PostgreSQL) para producción en Vercel y SQLite local para scripts.
 * Carga lazy de better-sqlite3 para evitar fallos de binarios nativos en Vercel.
 */

import fs from 'fs';
import path from 'path';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';
export { isSupabaseConfigured } from './supabase';

// ------------------------------------------------------------------------------
// TIPOS DE DATOS DE LA APLICACIÓN
// ------------------------------------------------------------------------------

export interface DbProduct {
  id_dropi: number;
  sku: string | null;
  name: string;
  type: 'SIMPLE' | 'VARIABLE';
  cost_cop: number;
  suggested_price_cop: number | null;
  sell_price_cop: number;
  stock_real: number;
  stock_por_variacion: string | null; // JSON
  supplier_id: number | null;
  supplier_name: string | null;
  supplier_badge: string | null;
  categories: string | null; // JSON
  image_url: string | null;
  gallery: string | null; // JSON
  description: string | null;
  description_is_empty?: number;
  is_active: number; // 0 or 1
  needs_review: number; // 0 or 1
  missing_sweeps_count: number;
  deactivation_reason: string | null;
  crop_top_pct?: number | null;
  crop_bottom_pct?: number | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  origin_city_id?: number | null;
  origin_city_name?: string | null;
  display_priority?: number;
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
  raw?: string | null; // JSON
}

export interface DbProductImageModeration {
  id_dropi: number;
  has_burned_price: number; // 0 or 1
  detected_text: string | null;
  detected_patterns: string[]; // parsed array
  line_details?: any[];
  clean_gallery_urls: string[]; // parsed array
  correction_applied: 'none' | 'swapped_gallery' | 'crop_top' | 'crop_bottom' | 'crop_both' | 'deactivated';
  crop_top_pct: number;
  crop_bottom_pct: number;
  original_image_url: string | null;
  active_image_url: string | null;
  review_status: 'pending' | 'approved' | 'reverted';
  analyzed_at: string;
  updated_at: string;
}

export interface DbProductChangeHistory {
  id?: number;
  id_dropi: number;
  changed_at: string;
  previous_cost_cop: number | null;
  new_cost_cop: number | null;
  previous_sell_price_cop: number | null;
  new_sell_price_cop: number | null;
  previous_stock: number | null;
  new_stock: number | null;
  previous_is_active: number | null;
  new_is_active: number | null;
  reason: string;
}

export interface ProductAiCreative {
  id?: number;
  product_id: number;
  combo_type: '1x' | '2x';
  angle_1_title: string;
  angle_1_desc?: string;
  angle_1_image: string; // Base64 o Data URL
  angle_2_title: string;
  angle_2_desc?: string;
  angle_2_image: string; // Base64 o Data URL
  scene_1_data?: string | null; // Data URL de escena generada por IA
  scene_2_data?: string | null; // Data URL de escena generada por IA
  copy_text: string;
  previous_angles?: string[];
  created_at?: string;
}

export interface DbCodOrder {
  id?: number;
  order_number: string;
  customer_name: string;
  customer_phone: string;
  department: string;
  city: string;
  neighborhood: string;
  address: string;
  reference_point: string;
  items: string; // JSON
  quantity_type: '1x' | '2x' | string;
  total_cop: number;
  status: 'pendiente_despacho' | 'subido_a_dropi' | 'en_transito' | 'entregado' | 'novedad' | 'cancelado';
  dropi_order_id?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CachedCarrierQuote {
  carrier: string;
  carrier_code?: string;
  shipping_price: number;
  insurance_price: number;
  total_freight: number;
  has_coverage: boolean;
  error?: string | null;
}

export interface CachedFreightRoute {
  id?: number;
  origin_city_id: number;
  origin_city_name: string;
  destination_city_id: number;
  destination_city_name: string;
  weight_bracket: string;
  min_freight: number;
  max_freight: number;
  carriers: CachedCarrierQuote[];
  quoted_at: string;
  updated_at: string;
}

// ------------------------------------------------------------------------------
// INSTANCIA LAZY SQLITE (Para scripts locales sin romper serverless de Vercel)
// ------------------------------------------------------------------------------

let sqliteInstance: any = null;

export function getSqliteDb() {
  if (!sqliteInstance) {
    // Require dinámico solo cuando realmente se ejecuta en local
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const Database = require('better-sqlite3');
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    const dbFilePath = process.env.DATABASE_PATH
      ? path.resolve(process.env.DATABASE_PATH)
      : path.join(dataDir, 'pidefacil.db');

    sqliteInstance = new Database(dbFilePath);
    sqliteInstance.pragma('journal_mode = WAL');
    sqliteInstance.pragma('synchronous = NORMAL');
    sqliteInstance.pragma('foreign_keys = ON');
    sqliteInstance.pragma('busy_timeout = 30000');

    // Inicializar tabla de creativos IA si no existe
    try {
      sqliteInstance.exec(`
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
          scene_1_data TEXT,
          scene_2_data TEXT,
          copy_text TEXT NOT NULL,
          previous_angles TEXT,
          created_at TEXT NOT NULL
        );
        CREATE INDEX IF NOT EXISTS idx_ai_creatives_product ON product_ai_creatives (product_id, combo_type);

        CREATE TABLE IF NOT EXISTS freight_quotes_cache (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          origin_city_id INTEGER NOT NULL,
          origin_city_name TEXT NOT NULL,
          destination_city_id INTEGER NOT NULL,
          destination_city_name TEXT NOT NULL,
          weight_bracket TEXT NOT NULL,
          min_freight INTEGER NOT NULL,
          max_freight INTEGER NOT NULL,
          carriers TEXT NOT NULL,
          quoted_at TEXT NOT NULL,
          updated_at TEXT NOT NULL,
          UNIQUE(origin_city_id, destination_city_id, weight_bracket)
        );
        CREATE INDEX IF NOT EXISTS idx_freight_cache_lookup ON freight_quotes_cache(origin_city_id, destination_city_id, weight_bracket);
      `);
    } catch {}
  }
  return sqliteInstance;
}

// Proxy para compatibilidad hacia atrás con scripts existentes que usan `db.prepare(...)`
export const db = new Proxy({} as any, {
  get: (_target, prop) => {
    const s = getSqliteDb();
    const val = s[prop];
    return typeof val === 'function' ? val.bind(s) : val;
  },
});

// Normalizador de formato desde Supabase (convierte JSONB en string JSON para compatibilidad)
function formatProductFromSupabase(row: any): DbProduct {
  return {
    ...row,
    id_dropi: Number(row.id_dropi),
    cost_cop: Number(row.cost_cop || 0),
    suggested_price_cop: row.suggested_price_cop ? Number(row.suggested_price_cop) : null,
    sell_price_cop: Number(row.sell_price_cop || 0),
    stock_real: Number(row.stock_real || 0),
    stock_por_variacion:
      row.stock_por_variacion && typeof row.stock_por_variacion === 'object'
        ? JSON.stringify(row.stock_por_variacion)
        : row.stock_por_variacion || null,
    categories:
      row.categories && typeof row.categories === 'object'
        ? JSON.stringify(row.categories)
        : row.categories || null,
    gallery:
      row.gallery && typeof row.gallery === 'object'
        ? JSON.stringify(row.gallery)
        : row.gallery || null,
    is_active: Number(row.is_active ?? 1),
    needs_review: Number(row.needs_review || 0),
    description_is_empty: Number(row.description_is_empty || 0),
    crop_top_pct: Number(row.crop_top_pct || 0),
    crop_bottom_pct: Number(row.crop_bottom_pct || 0),
    weight_kg: row.weight_kg !== null && row.weight_kg !== undefined ? Number(row.weight_kg) : null,
    length_cm: row.length_cm !== null && row.length_cm !== undefined ? Number(row.length_cm) : null,
    width_cm: row.width_cm !== null && row.width_cm !== undefined ? Number(row.width_cm) : null,
    height_cm: row.height_cm !== null && row.height_cm !== undefined ? Number(row.height_cm) : null,
    origin_city_id: row.origin_city_id !== null && row.origin_city_id !== undefined ? Number(row.origin_city_id) : null,
    origin_city_name: row.origin_city_name || null,
  };
}

// Columnas ligeras para cards de producto (evita descargar 100KB+ de HTML y JSON crudo por producto)
const CARD_COLUMNS =
  'id_dropi, name, sku, type, cost_cop, suggested_price_cop, sell_price_cop, stock_real, supplier_name, supplier_badge, image_url, categories, display_priority, crop_top_pct, crop_bottom_pct, weight_kg, length_cm, width_cm, height_cm, origin_city_id, origin_city_name';

// Caché en memoria para fichas individuales de producto (PDP) con TTL de 5 minutos
interface CachedProduct {
  data: DbProduct;
  expiresAt: number;
}
const productMemoryCache = new Map<number, CachedProduct>();
const PDP_CACHE_TTL_MS = 5 * 60 * 1000;

// ------------------------------------------------------------------------------
// MÉTODOS UNIVERSALES DE ACCESO A DATOS
// ------------------------------------------------------------------------------

/**
 * Consulta un producto por su id Dropi (con caché en memoria ultrarrápida)
 */
export async function getProductById(id_dropi: number): Promise<DbProduct | undefined> {
  const cached = productMemoryCache.get(id_dropi);
  if (cached && Date.now() < cached.expiresAt) {
    return cached.data;
  }

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id_dropi', id_dropi)
        .maybeSingle();

      if (!error && data) {
        const formatted = formatProductFromSupabase(data);
        if (productMemoryCache.size > 1000) {
          const firstKey = productMemoryCache.keys().next().value;
          if (firstKey !== undefined) productMemoryCache.delete(firstKey);
        }
        productMemoryCache.set(id_dropi, {
          data: formatted,
          expiresAt: Date.now() + PDP_CACHE_TTL_MS,
        });
        return formatted;
      }
    } catch (e) {
      console.error('Error en Supabase getProductById:', e);
    }
  }

  // Fallback SQLite
  try {
    const row = getSqliteDb()
      .prepare('SELECT * FROM products WHERE id_dropi = ?')
      .get(id_dropi) as DbProduct | undefined;
    if (row) {
      productMemoryCache.set(id_dropi, {
        data: row,
        expiresAt: Date.now() + PDP_CACHE_TTL_MS,
      });
    }
    return row;
  } catch {
    return undefined;
  }
}

/**
 * Obtiene los productos activos para el catálogo público Mobile-First
 * Optimizado: columnas ligeras + índice compuesto feed + cero overhead de count(*)
 */
export async function getActiveProducts(options?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ products: DbProduct[]; total: number }> {
  const limit = options?.limit ?? 40;
  const offset = options?.offset ?? 0;
  const hasSearch = Boolean(options?.search && options.search.trim());
  const hasCategory = Boolean(options?.category && options.category.toLowerCase() !== 'todo');

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin
        .from('products')
        .select(CARD_COLUMNS)
        .eq('is_active', 1)
        .gt('stock_real', 0);

      if (hasSearch) {
        query = query.ilike('name', `%${options!.search!.trim()}%`);
      }

      if (hasCategory) {
        query = query.ilike('categories_text', `%${options!.category!.trim()}%`);
      }

      const { data, error } = await query
        .order('display_priority', { ascending: true })
        .order('stock_real', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        let total = 232278;
        if (hasSearch || hasCategory) {
          total = data.length === limit ? offset + limit + 100 : offset + data.length;
        }

        return {
          products: data.map(formatProductFromSupabase),
          total,
        };
      }
    } catch (e) {
      console.error('Error en Supabase getActiveProducts:', e);
    }
  }

  // Fallback SQLite
  try {
    const conditions: string[] = ['is_active = 1'];
    const params: (string | number)[] = [];

    if (options?.search && options.search.trim()) {
      const cleanSearch = options.search.trim().replace(/['"]/g, '');
      const searchTerms = cleanSearch.split(/\s+/).map((t) => `${t}*`).join(' ');
      conditions.push(
        `id_dropi IN (SELECT id_dropi FROM products_fts WHERE products_fts MATCH ?)`
      );
      params.push(searchTerms);
    }

    if (options?.category && options.category.toLowerCase() !== 'todo') {
      conditions.push(`categories LIKE ?`);
      params.push(`%${options.category}%`);
    }

    const whereClause = conditions.join(' AND ');

    const totalRow = getSqliteDb()
      .prepare(`SELECT COUNT(*) as count FROM products WHERE ${whereClause}`)
      .get(...params) as { count: number };

    const products = getSqliteDb()
      .prepare(
        `SELECT * FROM products WHERE ${whereClause} ORDER BY display_priority ASC, stock_real DESC, updated_at DESC LIMIT ? OFFSET ?`
      )
      .all(...params, limit, offset) as DbProduct[];

    return { products, total: totalRow.count };
  } catch {
    return { products: [], total: 0 };
  }
}

/**
 * Búsqueda rápida de productos para autocompletado en el buscador
 */
export async function searchActiveProducts(queryText: string, limit = 10) {
  if (!queryText || !queryText.trim()) return [];

  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('id_dropi, name, sell_price_cop, image_url, crop_top_pct, crop_bottom_pct, stock_real, supplier_name')
        .eq('is_active', 1)
        .gt('stock_real', 0)
        .ilike('name', `%${queryText.trim()}%`)
        .order('display_priority', { ascending: true })
        .order('stock_real', { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data.map((p) => ({
          ...p,
          id_dropi: Number(p.id_dropi),
          sell_price_cop: Number(p.sell_price_cop),
          stock_real: Number(p.stock_real),
          crop_top_pct: Number(p.crop_top_pct || 0),
          crop_bottom_pct: Number(p.crop_bottom_pct || 0),
        }));
      }
    } catch (e) {
      console.error('Error en Supabase searchActiveProducts:', e);
    }
  }

  // Fallback SQLite FTS5
  try {
    const cleanQuery = queryText.trim().replace(/['"]/g, '');
    const searchTerms = cleanQuery
      .split(/\s+/)
      .filter(Boolean)
      .map((term) => `${term}*`)
      .join(' ');

    return getSqliteDb()
      .prepare(`
        SELECT p.id_dropi, p.name, p.sell_price_cop, p.image_url, p.crop_top_pct, p.crop_bottom_pct, p.stock_real, p.supplier_name
        FROM products p
        JOIN products_fts fts ON p.id_dropi = fts.id_dropi
        WHERE products_fts MATCH ? AND p.is_active = 1 AND p.stock_real > 0
        ORDER BY p.stock_real DESC
        LIMIT ?
      `)
      .all(searchTerms, limit);
  } catch {
    return [];
  }
}

/**
 * Registra un nuevo pedido Contra Entrega (COD)
 */
export async function createCodOrder(order: Omit<DbCodOrder, 'id' | 'created_at' | 'updated_at'>): Promise<DbCodOrder> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      let parsedItems = order.items;
      try {
        if (typeof order.items === 'string') {
          parsedItems = JSON.parse(order.items);
        }
      } catch {}

      const orderData = {
        order_number: order.order_number,
        customer_name: order.customer_name,
        customer_phone: order.customer_phone,
        department: order.department,
        city: order.city,
        neighborhood: order.neighborhood,
        address: order.address,
        reference_point: order.reference_point,
        items: parsedItems,
        quantity_type: order.quantity_type,
        total_cop: order.total_cop,
        status: order.status || 'pendiente_despacho',
        dropi_order_id: order.dropi_order_id || null,
        notes: order.notes || null,
        created_at: now,
        updated_at: now,
      };

      const { data, error } = await supabaseAdmin
        .from('cod_orders')
        .insert([orderData])
        .select()
        .single();

      if (!error && data) {
        return {
          ...data,
          id: Number(data.id),
          total_cop: Number(data.total_cop),
          items: typeof data.items === 'object' ? JSON.stringify(data.items) : data.items,
        };
      }
    } catch (e) {
      console.error('Error insertando pedido en Supabase:', e);
    }
  }

  // Fallback SQLite
  const stmt = getSqliteDb().prepare(`
    INSERT INTO cod_orders (
      order_number, customer_name, customer_phone, department, city,
      neighborhood, address, reference_point, items, quantity_type,
      total_cop, status, dropi_order_id, notes, created_at, updated_at
    ) VALUES (
      @order_number, @customer_name, @customer_phone, @department, @city,
      @neighborhood, @address, @reference_point, @items, @quantity_type,
      @total_cop, @status, @dropi_order_id, @notes, @created_at, @updated_at
    )
  `);

  const orderData = {
    dropi_order_id: null,
    notes: null,
    ...order,
    created_at: now,
    updated_at: now,
  };

  const info = stmt.run(orderData);
  return { ...orderData, id: Number(info.lastInsertRowid) };
}

/**
 * Consulta pedidos COD con filtros para el panel de administración
 */
export async function getCodOrders(status?: string): Promise<DbCodOrder[]> {
  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin.from('cod_orders').select('*').order('id', { ascending: false });
      if (status && status !== 'todos') {
        query = query.eq('status', status);
      }
      const { data, error } = await query;
      if (!error && data) {
        return data.map((o: any) => ({
          ...o,
          id: Number(o.id),
          total_cop: Number(o.total_cop),
          items: typeof o.items === 'object' ? JSON.stringify(o.items) : o.items,
        }));
      }
    } catch (e) {
      console.error('Error listando pedidos en Supabase:', e);
    }
  }

  // Fallback SQLite
  if (status && status !== 'todos') {
    return getSqliteDb()
      .prepare('SELECT * FROM cod_orders WHERE status = ? ORDER BY id DESC')
      .all(status) as DbCodOrder[];
  }
  return getSqliteDb()
    .prepare('SELECT * FROM cod_orders ORDER BY id DESC')
    .all() as DbCodOrder[];
}

/**
 * Actualiza el estado de un pedido COD
 */
export async function updateCodOrderStatus(
  id: number,
  updates: { status: string; dropi_order_id?: number | null; notes?: string | null }
): Promise<boolean> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin
        .from('cod_orders')
        .update({
          status: updates.status,
          dropi_order_id: updates.dropi_order_id || null,
          notes: updates.notes || null,
          updated_at: now,
        })
        .eq('id', id);

      if (!error) return true;
    } catch (e) {
      console.error('Error actualizando pedido en Supabase:', e);
    }
  }

  // Fallback SQLite
  try {
    const info = getSqliteDb().prepare(`
      UPDATE cod_orders SET
        status = ?,
        dropi_order_id = COALESCE(?, dropi_order_id),
        notes = COALESCE(?, notes),
        updated_at = ?
      WHERE id = ?
    `).run(updates.status, updates.dropi_order_id || null, updates.notes || null, now, id);

    return info.changes > 0;
  } catch {
    return false;
  }
}

/**
 * Estadísticas consolidadas del catálogo
 */
export async function getCatalogStats() {
  if (isSupabaseConfigured) {
    try {
      const [totalRes, activeRes, pendingRes, totalOrdersRes] = await Promise.all([
        supabaseAdmin.from('products').select('*', { count: 'exact', head: true }),
        supabaseAdmin.from('products').select('*', { count: 'exact', head: true }).eq('is_active', 1),
        supabaseAdmin.from('cod_orders').select('*', { count: 'exact', head: true }).eq('status', 'pendiente_despacho'),
        supabaseAdmin.from('cod_orders').select('*', { count: 'exact', head: true }),
      ]);

      const total = totalRes.count || 0;
      const active = activeRes.count || 0;

      return {
        totalProducts: total,
        activeProducts: active,
        inactiveProducts: Math.max(0, total - active),
        needsReview: 0,
        pendingOrders: pendingRes.count || 0,
        totalOrders: totalOrdersRes.count || 0,
      };
    } catch (e) {
      console.error('Error calculando stats en Supabase:', e);
    }
  }

  // Fallback SQLite
  try {
    const total = (getSqliteDb().prepare('SELECT COUNT(*) as count FROM products').get() as { count: number }).count;
    const active = (getSqliteDb().prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1').get() as { count: number }).count;
    const inactive = total - active;
    const needsReview = (getSqliteDb().prepare('SELECT COUNT(*) as count FROM products WHERE needs_review = 1').get() as { count: number }).count;
    const pendingOrders = (getSqliteDb().prepare("SELECT COUNT(*) as count FROM cod_orders WHERE status = 'pendiente_despacho'").get() as { count: number }).count;
    const totalOrders = (getSqliteDb().prepare('SELECT COUNT(*) as count FROM cod_orders').get() as { count: number }).count;

    return {
      totalProducts: total,
      activeProducts: active,
      inactiveProducts: inactive,
      needsReview,
      pendingOrders,
      totalOrders,
    };
  } catch {
    return {
      totalProducts: 0,
      activeProducts: 0,
      inactiveProducts: 0,
      needsReview: 0,
      pendingOrders: 0,
      totalOrders: 0,
    };
  }
}

/**
 * Obtiene un parámetro de configuración desde app_settings
 */
export async function getAppSetting(key: string, defaultValue?: string): Promise<string | undefined> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabaseAdmin
        .from('app_settings')
        .select('value')
        .eq('key', key)
        .maybeSingle();
      if (data) return data.value;
    } catch (e) {
      console.error(`Error leyendo setting ${key} en Supabase:`, e);
    }
  }

  try {
    const row = getSqliteDb().prepare('SELECT value FROM app_settings WHERE key = ?').get(key) as { value: string } | undefined;
    return row?.value ?? defaultValue;
  } catch {
    return defaultValue;
  }
}

/**
 * Guarda un parámetro de configuración en app_settings
 */
export async function setAppSetting(key: string, value: string): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin.from('app_settings').upsert({
        key,
        value,
        updated_at: now,
      });
      if (!error) return true;
    } catch (e) {
      console.error(`Error guardando setting ${key} en Supabase:`, e);
    }
  }

  try {
    getSqliteDb().prepare(`
      INSERT INTO app_settings (key, value, updated_at)
      VALUES (?, ?, ?)
      ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = excluded.updated_at
    `).run(key, value, now);
    return true;
  } catch {
    return false;
  }
}

/**
 * Guarda o actualiza una cotización de flete en la caché histórica (Supabase + SQLite)
 */
export async function saveFreightQuoteToCache(item: CachedFreightRoute): Promise<boolean> {
  const now = new Date().toISOString();
  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin.from('freight_quotes_cache').upsert(
        {
          origin_city_id: item.origin_city_id,
          origin_city_name: item.origin_city_name,
          destination_city_id: item.destination_city_id,
          destination_city_name: item.destination_city_name,
          weight_bracket: item.weight_bracket,
          min_freight: item.min_freight,
          max_freight: item.max_freight,
          carriers: item.carriers,
          quoted_at: item.quoted_at || now,
          updated_at: now,
        },
        { onConflict: 'origin_city_id,destination_city_id,weight_bracket' }
      );
      if (error) {
        console.warn('[DB] Error guardando freight_quotes_cache en Supabase:', error.message);
      }
    } catch (e: any) {
      console.warn('[DB] Excepción guardando freight_quotes_cache en Supabase:', e.message);
    }
  }

  try {
    const s = getSqliteDb();
    s.prepare(`
      INSERT INTO freight_quotes_cache (
        origin_city_id, origin_city_name, destination_city_id, destination_city_name,
        weight_bracket, min_freight, max_freight, carriers, quoted_at, updated_at
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(origin_city_id, destination_city_id, weight_bracket) DO UPDATE SET
        min_freight = excluded.min_freight,
        max_freight = excluded.max_freight,
        carriers = excluded.carriers,
        quoted_at = excluded.quoted_at,
        updated_at = excluded.updated_at
    `).run(
      item.origin_city_id,
      item.origin_city_name,
      item.destination_city_id,
      item.destination_city_name,
      item.weight_bracket,
      item.min_freight,
      item.max_freight,
      typeof item.carriers === 'string' ? item.carriers : JSON.stringify(item.carriers),
      item.quoted_at || now,
      now
    );
    return true;
  } catch (err: any) {
    console.warn('[DB] Error guardando freight_quotes_cache en SQLite:', err.message);
    return false;
  }
}

/**
 * Consulta la cotización histórica más reciente para una ruta y rango de peso (Supabase -> SQLite)
 */
export async function getFreightQuoteFromCache(
  originCityId: number,
  destinationCityId: number,
  weightBracket: string
): Promise<CachedFreightRoute | null> {
  // 1. Consultar en Supabase (PostgreSQL en la nube de producción)
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('freight_quotes_cache')
        .select('*')
        .eq('origin_city_id', originCityId)
        .eq('destination_city_id', destinationCityId)
        .eq('weight_bracket', weightBracket)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          carriers: typeof data.carriers === 'string' ? JSON.parse(data.carriers) : data.carriers,
        };
      }
    } catch (e: any) {
      console.warn('[DB] Error consultando freight_quotes_cache en Supabase:', e.message);
    }
  }

  // 2. Fallback a SQLite local
  try {
    const s = getSqliteDb();
    const row = s.prepare(`
      SELECT * FROM freight_quotes_cache
      WHERE origin_city_id = ? AND destination_city_id = ? AND weight_bracket = ?
    `).get(originCityId, destinationCityId, weightBracket) as any;

    if (row) {
      return {
        ...row,
        carriers: typeof row.carriers === 'string' ? JSON.parse(row.carriers) : row.carriers,
      };
    }
  } catch (e: any) {
    console.warn('[DB] Error consultando freight_quotes_cache en SQLite:', e.message);
  }

  return null;
}

/**
 * Obtiene la API Key de Google Gemini/AI Studio (Prioridad: BD app_settings -> Variable de entorno)
 */
export async function getGeminiApiKey(): Promise<string> {
  const dbKey = await getAppSetting('gemini_api_key');
  if (dbKey && dbKey.trim() !== '') {
    return dbKey.trim();
  }
  return process.env.GEMINI_API_KEY?.trim() || '';
}

/**
 * Guarda la API Key de Google Gemini/AI Studio en app_settings
 */
export async function setGeminiApiKey(key: string): Promise<boolean> {
  return setAppSetting('gemini_api_key', key.trim());
}

/**
 * Obtiene el último kit creativo IA almacenado en caché para un producto y combo
 */
export async function getAiCreativeCache(
  productId: number,
  comboType: '1x' | '2x'
): Promise<ProductAiCreative | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_ai_creatives')
        .select('*')
        .eq('product_id', productId)
        .eq('combo_type', comboType)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data) {
        return {
          id: data.id,
          product_id: Number(data.product_id),
          combo_type: data.combo_type,
          angle_1_title: data.angle_1_title,
          angle_1_desc: data.angle_1_desc,
          angle_1_image: data.angle_1_image,
          angle_2_title: data.angle_2_title,
          angle_2_desc: data.angle_2_desc,
          angle_2_image: data.angle_2_image,
          scene_1_data: data.scene_1_data || null,
          scene_2_data: data.scene_2_data || null,
          copy_text: data.copy_text,
          previous_angles: Array.isArray(data.previous_angles) ? data.previous_angles : [],
          created_at: data.created_at,
        };
      }
    } catch (e) {
      console.error('Error obteniendo creativo IA en Supabase:', e);
    }
  }

  try {
    const s = getSqliteDb();
    const row = s
      .prepare(
        'SELECT * FROM product_ai_creatives WHERE product_id = ? AND combo_type = ? ORDER BY created_at DESC LIMIT 1'
      )
      .get(productId, comboType) as any;

    if (row) {
      let previous_angles: string[] = [];
      try {
        previous_angles = row.previous_angles ? JSON.parse(row.previous_angles) : [];
      } catch {}
      return {
        id: row.id,
        product_id: Number(row.product_id),
        combo_type: row.combo_type,
        angle_1_title: row.angle_1_title,
        angle_1_desc: row.angle_1_desc,
        angle_1_image: row.angle_1_image,
        angle_2_title: row.angle_2_title,
        angle_2_desc: row.angle_2_desc,
        angle_2_image: row.angle_2_image,
        scene_1_data: row.scene_1_data || null,
        scene_2_data: row.scene_2_data || null,
        copy_text: row.copy_text,
        previous_angles,
        created_at: row.created_at,
      };
    }
  } catch (e) {
    console.error('Error obteniendo creativo IA en SQLite:', e);
  }

  return null;
}

/**
 * Guarda un kit de creativos IA en la caché persistente
 */
export async function saveAiCreativeCache(data: ProductAiCreative): Promise<void> {
  const now = new Date().toISOString();

  if (isSupabaseConfigured) {
    try {
      await supabaseAdmin.from('product_ai_creatives').insert({
        product_id: data.product_id,
        combo_type: data.combo_type,
        angle_1_title: data.angle_1_title,
        angle_1_desc: data.angle_1_desc || '',
        angle_1_image: data.angle_1_image,
        angle_2_title: data.angle_2_title,
        angle_2_desc: data.angle_2_desc || '',
        angle_2_image: data.angle_2_image,
        scene_1_data: data.scene_1_data || null,
        scene_2_data: data.scene_2_data || null,
        copy_text: data.copy_text,
        previous_angles: data.previous_angles || [],
        created_at: now,
      });
    } catch (e) {
      console.error('Error guardando creativo IA en Supabase:', e);
    }
  }

  try {
    const s = getSqliteDb();
    s.prepare(`
      INSERT INTO product_ai_creatives (
        product_id, combo_type, angle_1_title, angle_1_desc, angle_1_image,
        angle_2_title, angle_2_desc, angle_2_image, scene_1_data, scene_2_data,
        copy_text, previous_angles, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      data.product_id,
      data.combo_type,
      data.angle_1_title,
      data.angle_1_desc || '',
      data.angle_1_image,
      data.angle_2_title,
      data.angle_2_desc || '',
      data.angle_2_image,
      data.scene_1_data || null,
      data.scene_2_data || null,
      data.copy_text,
      JSON.stringify(data.previous_angles || []),
      now
    );
  } catch (e) {
    console.error('Error guardando creativo IA en SQLite:', e);
  }
}

/**
 * Consulta de productos para el Panel de Gestión Administrativa
 */
export async function getAdminProducts(options?: {
  search?: string;
  status?: 'todos' | 'activos' | 'inactivos';
  limit?: number;
  offset?: number;
}): Promise<{ products: DbProduct[]; total: number }> {
  const limit = options?.limit ?? 25;
  const offset = options?.offset ?? 0;
  const search = options?.search?.trim() || '';
  const status = options?.status || 'todos';

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin
        .from('products')
        .select('id_dropi, name, sku, type, cost_cop, suggested_price_cop, sell_price_cop, stock_real, supplier_name, image_url, categories, display_priority, is_active, description_is_empty, description, weight_kg, length_cm, width_cm, height_cm, origin_city_id, origin_city_name');

      if (status === 'activos') {
        query = query.eq('is_active', 1);
      } else if (status === 'inactivos') {
        query = query.eq('is_active', 0);
      }

      if (search) {
        const isNumeric = /^\d+$/.test(search);
        if (isNumeric) {
          query = query.eq('id_dropi', parseInt(search, 10));
        } else {
          query = query.ilike('name', `%${search}%`);
        }
      }

      const { data, error } = await query
        .order('display_priority', { ascending: true })
        .order('stock_real', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        return {
          products: data.map(formatProductFromSupabase),
          total: data.length === limit ? offset + limit + 50 : offset + data.length,
        };
      }
    } catch (e) {
      console.error('Error en Supabase getAdminProducts:', e);
    }
  }

  // Fallback SQLite
  try {
    const conditions: string[] = ['1=1'];
    const params: (string | number)[] = [];

    if (status === 'activos') conditions.push('is_active = 1');
    if (status === 'inactivos') conditions.push('is_active = 0');

    if (search) {
      const isNumeric = /^\d+$/.test(search);
      if (isNumeric) {
        conditions.push('id_dropi = ?');
        params.push(parseInt(search, 10));
      } else {
        conditions.push('name LIKE ?');
        params.push(`%${search}%`);
      }
    }

    const whereClause = conditions.join(' AND ');
    const products = getSqliteDb()
      .prepare(`SELECT * FROM products WHERE ${whereClause} ORDER BY display_priority ASC, stock_real DESC LIMIT ? OFFSET ?`)
      .all(...params, limit, offset) as DbProduct[];

    return {
      products,
      total: products.length === limit ? offset + limit + 50 : offset + products.length,
    };
  } catch {
    return { products: [], total: 0 };
  }
}

/**
 * Actualiza atributos de un producto desde el panel administrativo
 */
export async function updateProductAdmin(
  id_dropi: number,
  updates: {
    is_active?: number;
    display_priority?: number;
    sell_price_cop?: number;
    weight_kg?: number | null;
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
    origin_city_id?: number | null;
    origin_city_name?: string | null;
  }
): Promise<boolean> {
  const now = new Date().toISOString();

  // Invalidar caché en memoria
  productMemoryCache.delete(id_dropi);

  if (isSupabaseConfigured) {
    try {
      const payload: any = { updated_at: now };
      if (updates.is_active !== undefined) payload.is_active = updates.is_active;
      if (updates.display_priority !== undefined) payload.display_priority = updates.display_priority;
      if (updates.sell_price_cop !== undefined) payload.sell_price_cop = updates.sell_price_cop;
      if (updates.weight_kg !== undefined) payload.weight_kg = updates.weight_kg;
      if (updates.length_cm !== undefined) payload.length_cm = updates.length_cm;
      if (updates.width_cm !== undefined) payload.width_cm = updates.width_cm;
      if (updates.height_cm !== undefined) payload.height_cm = updates.height_cm;
      if (updates.origin_city_id !== undefined) payload.origin_city_id = updates.origin_city_id;
      if (updates.origin_city_name !== undefined) payload.origin_city_name = updates.origin_city_name;

      const { error } = await supabaseAdmin
        .from('products')
        .update(payload)
        .eq('id_dropi', id_dropi);

      if (!error) return true;
    } catch (e) {
      console.error('Error actualizando producto en Supabase:', e);
    }
  }

  // Fallback SQLite
  try {
    const sets: string[] = ['updated_at = ?'];
    const params: (string | number | null)[] = [now];

    if (updates.is_active !== undefined) {
      sets.push('is_active = ?');
      params.push(updates.is_active);
    }
    if (updates.display_priority !== undefined) {
      sets.push('display_priority = ?');
      params.push(updates.display_priority);
    }
    if (updates.sell_price_cop !== undefined) {
      sets.push('sell_price_cop = ?');
      params.push(updates.sell_price_cop);
    }
    if (updates.weight_kg !== undefined) {
      sets.push('weight_kg = ?');
      params.push(updates.weight_kg);
    }
    if (updates.length_cm !== undefined) {
      sets.push('length_cm = ?');
      params.push(updates.length_cm);
    }
    if (updates.width_cm !== undefined) {
      sets.push('width_cm = ?');
      params.push(updates.width_cm);
    }
    if (updates.height_cm !== undefined) {
      sets.push('height_cm = ?');
      params.push(updates.height_cm);
    }
    if (updates.origin_city_id !== undefined) {
      sets.push('origin_city_id = ?');
      params.push(updates.origin_city_id);
    }
    if (updates.origin_city_name !== undefined) {
      sets.push('origin_city_name = ?');
      params.push(updates.origin_city_name);
    }

    params.push(id_dropi);
    getSqliteDb()
      .prepare(`UPDATE products SET ${sets.join(', ')} WHERE id_dropi = ?`)
      .run(...params);
    return true;
  } catch {
    return false;
  }
}

/**
 * Checkpoints persistentes de sincronización
 */
export function getCheckpoint(mode: string) {
  return getSqliteDb().prepare('SELECT * FROM sync_checkpoints WHERE mode = ?').get(mode) as any;
}

export function saveCheckpoint(checkpoint: {
  mode: string;
  currentPage: number;
  currentSeed?: string;
  currentCategory?: string;
  extractedCount: number;
  status: string;
  lastError?: string;
}) {
  const now = new Date().toISOString();
  getSqliteDb().prepare(`
    INSERT INTO sync_checkpoints (
      mode, current_page, current_seed, current_category, extracted_count, status, last_error, started_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(mode) DO UPDATE SET
      current_page = excluded.current_page,
      current_seed = excluded.current_seed,
      current_category = excluded.current_category,
      extracted_count = excluded.extracted_count,
      status = excluded.status,
      last_error = excluded.last_error,
      updated_at = excluded.updated_at
  `).run(
    checkpoint.mode,
    checkpoint.currentPage,
    checkpoint.currentSeed || null,
    checkpoint.currentCategory || null,
    checkpoint.extractedCount,
    checkpoint.status,
    checkpoint.lastError || null,
    now,
    now
  );
}

/**
 * Inserta o actualiza un producto (Upsert) en SQLite registrando cambios en auditoría
 */
export function upsertProduct(product: DbProduct): { isNew: boolean; hasChanged: boolean } {
  const s = getSqliteDb();
  const existing = s.prepare('SELECT * FROM products WHERE id_dropi = ?').get(product.id_dropi) as DbProduct | undefined;
  const now = new Date().toISOString();

  if (!existing) {
    const insertStmt = s.prepare(`
      INSERT INTO products (
        id_dropi, sku, name, type, cost_cop, suggested_price_cop, sell_price_cop,
        stock_real, stock_por_variacion, supplier_id, supplier_name, supplier_badge,
        categories, image_url, gallery, description, is_active, needs_review,
        missing_sweeps_count, deactivation_reason, first_seen_at, last_seen_at,
        updated_at, raw
      ) VALUES (
        @id_dropi, @sku, @name, @type, @cost_cop, @suggested_price_cop, @sell_price_cop,
        @stock_real, @stock_por_variacion, @supplier_id, @supplier_name, @supplier_badge,
        @categories, @image_url, @gallery, @description, @is_active, @needs_review,
        0, @deactivation_reason, @first_seen_at, @last_seen_at, @updated_at, @raw
      )
    `);

    insertStmt.run(product);

    s.prepare(`
      INSERT INTO products_fts (id_dropi, name, supplier_name)
      VALUES (?, ?, ?)
    `).run(product.id_dropi, product.name, product.supplier_name || '');

    return { isNew: true, hasChanged: true };
  }

  const costChanged = existing.cost_cop !== product.cost_cop;
  const stockChanged = existing.stock_real !== product.stock_real;
  const activeChanged = existing.is_active !== product.is_active;
  const priceChanged = existing.sell_price_cop !== product.sell_price_cop;
  const hasChanged = costChanged || stockChanged || activeChanged || priceChanged;

  if (hasChanged) {
    s.prepare(`
      INSERT INTO product_changes_history (
        id_dropi, changed_at, previous_cost_cop, new_cost_cop,
        previous_sell_price_cop, new_sell_price_cop, previous_stock, new_stock,
        previous_is_active, new_is_active, reason
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?
      )
    `).run(
      product.id_dropi,
      now,
      existing.cost_cop,
      product.cost_cop,
      existing.sell_price_cop,
      product.sell_price_cop,
      existing.stock_real,
      product.stock_real,
      existing.is_active,
      product.is_active,
      costChanged ? 'cambio_costo' : stockChanged ? 'cambio_stock' : 'actualizacion_sync'
    );
  }

  const updateStmt = s.prepare(`
    UPDATE products SET
      sku = @sku,
      name = @name,
      type = @type,
      cost_cop = @cost_cop,
      suggested_price_cop = @suggested_price_cop,
      sell_price_cop = @sell_price_cop,
      stock_real = @stock_real,
      stock_por_variacion = COALESCE(@stock_por_variacion, stock_por_variacion),
      supplier_id = @supplier_id,
      supplier_name = @supplier_name,
      supplier_badge = @supplier_badge,
      categories = @categories,
      image_url = @image_url,
      gallery = COALESCE(@gallery, gallery),
      description = COALESCE(@description, description),
      is_active = @is_active,
      needs_review = @needs_review,
      missing_sweeps_count = 0,
      deactivation_reason = @deactivation_reason,
      last_seen_at = @last_seen_at,
      updated_at = @updated_at,
      raw = @raw
    WHERE id_dropi = @id_dropi
  `);

  updateStmt.run(product);

  s.prepare(`DELETE FROM products_fts WHERE id_dropi = ?`).run(product.id_dropi);
  s.prepare(`
    INSERT INTO products_fts (id_dropi, name, supplier_name)
    VALUES (?, ?, ?)
  `).run(product.id_dropi, product.name, product.supplier_name || '');

  return { isNew: false, hasChanged };
}

/**
 * Regla de Conservación Histórica (Soft-Deactivation)
 */
export function applySoftDeactivationRule(seenDropiIds: Set<number>): {
  incremented: number;
  deactivated: number;
} {
  const s = getSqliteDb();
  const allActive = s
    .prepare('SELECT id_dropi, missing_sweeps_count FROM products WHERE is_active = 1')
    .all() as { id_dropi: number; missing_sweeps_count: number }[];

  let incremented = 0;
  let deactivated = 0;
  const now = new Date().toISOString();

  const updateMissingStmt = s.prepare(`
    UPDATE products
    SET missing_sweeps_count = missing_sweeps_count + 1,
        updated_at = ?
    WHERE id_dropi = ?
  `);

  const deactivateStmt = s.prepare(`
    UPDATE products
    SET is_active = 0,
        missing_sweeps_count = missing_sweeps_count + 1,
        deactivation_reason = 'no_en_catalogo',
        updated_at = ?
    WHERE id_dropi = ?
  `);

  const auditStmt = s.prepare(`
    INSERT INTO product_changes_history (
      id_dropi, changed_at, previous_is_active, new_is_active, reason
    ) VALUES (?, ?, 1, 0, 'no_en_catalogo_2_barridos')
  `);

  const tx = s.transaction(() => {
    for (const prod of allActive) {
      if (!seenDropiIds.has(prod.id_dropi)) {
        if (prod.missing_sweeps_count + 1 >= 2) {
          deactivateStmt.run(now, prod.id_dropi);
          auditStmt.run(prod.id_dropi, now);
          deactivated++;
        } else {
          updateMissingStmt.run(now, prod.id_dropi);
          incremented++;
        }
      }
    }
  });

  tx();
  return { incremented, deactivated };
}

// ------------------------------------------------------------------------------
// MODERACIÓN DE FOTOS Y DETECCIÓN DE PRECIOS QUEMADOS (OCR)
// ------------------------------------------------------------------------------

/**
 * Guarda o actualiza un registro de moderación de imagen OCR (Supabase + SQLite)
 * y actualiza de forma atómica el estado del producto (crop_top_pct, crop_bottom_pct, image_url o desactivación).
 */
export async function saveProductImageModeration(item: DbProductImageModeration): Promise<boolean> {
  const now = new Date().toISOString();
  const patternsJson = JSON.stringify(item.detected_patterns || []);
  const lineDetailsJson = JSON.stringify(item.line_details || []);
  const cleanGalleryJson = JSON.stringify(item.clean_gallery_urls || []);

  // 1. Actualizar SQLite
  try {
    const s = getSqliteDb();
    s.prepare(`
      INSERT INTO product_image_moderation (
        id_dropi, has_burned_price, detected_text, detected_patterns, line_details,
        clean_gallery_urls, correction_applied, crop_top_pct, crop_bottom_pct,
        original_image_url, active_image_url, review_status, analyzed_at, updated_at
      ) VALUES (
        @id_dropi, @has_burned_price, @detected_text, @detected_patterns, @line_details,
        @clean_gallery_urls, @correction_applied, @crop_top_pct, @crop_bottom_pct,
        @original_image_url, @active_image_url, @review_status, @analyzed_at, @updated_at
      )
      ON CONFLICT(id_dropi) DO UPDATE SET
        has_burned_price = excluded.has_burned_price,
        detected_text = excluded.detected_text,
        detected_patterns = excluded.detected_patterns,
        line_details = excluded.line_details,
        clean_gallery_urls = excluded.clean_gallery_urls,
        correction_applied = excluded.correction_applied,
        crop_top_pct = excluded.crop_top_pct,
        crop_bottom_pct = excluded.crop_bottom_pct,
        original_image_url = excluded.original_image_url,
        active_image_url = excluded.active_image_url,
        review_status = excluded.review_status,
        analyzed_at = excluded.analyzed_at,
        updated_at = excluded.updated_at
    `).run({
      id_dropi: item.id_dropi,
      has_burned_price: item.has_burned_price ? 1 : 0,
      detected_text: item.detected_text || null,
      detected_patterns: patternsJson,
      line_details: lineDetailsJson,
      clean_gallery_urls: cleanGalleryJson,
      correction_applied: item.correction_applied || 'none',
      crop_top_pct: item.crop_top_pct || 0,
      crop_bottom_pct: item.crop_bottom_pct || 0,
      original_image_url: item.original_image_url || null,
      active_image_url: item.active_image_url || null,
      review_status: item.review_status || 'pending',
      analyzed_at: item.analyzed_at || now,
      updated_at: item.updated_at || now,
    });

    if (item.correction_applied === 'deactivated') {
      s.prepare(`
        UPDATE products SET is_active = 0, deactivation_reason = 'imagen_con_precio_no_recortable', updated_at = ?
        WHERE id_dropi = ?
      `).run(now, item.id_dropi);
    } else {
      s.prepare(`
        UPDATE products SET
          image_url = COALESCE(?, image_url),
          crop_top_pct = ?,
          crop_bottom_pct = ?,
          updated_at = ?
        WHERE id_dropi = ?
      `).run(item.active_image_url, item.crop_top_pct || 0, item.crop_bottom_pct || 0, now, item.id_dropi);
    }
  } catch (sqlErr: any) {
    console.warn('[DB] Error guardando moderación en SQLite:', sqlErr.message);
  }

  // 2. Actualizar Supabase si está configurado
  if (isSupabaseConfigured) {
    try {
      await supabaseAdmin.from('product_image_moderation').upsert({
        id_dropi: item.id_dropi,
        has_burned_price: item.has_burned_price ? 1 : 0,
        detected_text: item.detected_text || null,
        detected_patterns: item.detected_patterns || [],
        line_details: item.line_details || [],
        clean_gallery_urls: item.clean_gallery_urls || [],
        correction_applied: item.correction_applied || 'none',
        crop_top_pct: item.crop_top_pct || 0,
        crop_bottom_pct: item.crop_bottom_pct || 0,
        original_image_url: item.original_image_url || null,
        active_image_url: item.active_image_url || null,
        review_status: item.review_status || 'pending',
        analyzed_at: item.analyzed_at || now,
        updated_at: item.updated_at || now,
      });

      if (item.correction_applied === 'deactivated') {
        await supabaseAdmin.from('products').update({
          is_active: 0,
          deactivation_reason: 'imagen_con_precio_no_recortable',
          updated_at: now,
        }).eq('id_dropi', item.id_dropi);
      } else {
        const prodUpdate: any = {
          crop_top_pct: item.crop_top_pct || 0,
          crop_bottom_pct: item.crop_bottom_pct || 0,
          updated_at: now,
        };
        if (item.active_image_url) {
          prodUpdate.image_url = item.active_image_url;
        }
        await supabaseAdmin.from('products').update(prodUpdate).eq('id_dropi', item.id_dropi);
      }
    } catch (supaErr: any) {
      console.warn('[DB] Error guardando moderación en Supabase:', supaErr.message);
    }
  }

  // Limpiar caché de memoria del PDP
  productMemoryCache.delete(item.id_dropi);
  return true;
}

/**
 * Consulta el estado de moderación OCR de un producto
 */
export async function getProductImageModeration(id_dropi: number): Promise<DbProductImageModeration | null> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('product_image_moderation')
        .select('*')
        .eq('id_dropi', id_dropi)
        .maybeSingle();

      if (!error && data) {
        return {
          ...data,
          id_dropi: Number(data.id_dropi),
          has_burned_price: Number(data.has_burned_price || 0),
          detected_patterns: Array.isArray(data.detected_patterns)
            ? data.detected_patterns
            : typeof data.detected_patterns === 'string'
            ? JSON.parse(data.detected_patterns)
            : [],
          clean_gallery_urls: Array.isArray(data.clean_gallery_urls)
            ? data.clean_gallery_urls
            : typeof data.clean_gallery_urls === 'string'
            ? JSON.parse(data.clean_gallery_urls)
            : [],
          crop_top_pct: Number(data.crop_top_pct || 0),
          crop_bottom_pct: Number(data.crop_bottom_pct || 0),
        };
      }
    } catch {}
  }

  try {
    const s = getSqliteDb();
    const row = s.prepare('SELECT * FROM product_image_moderation WHERE id_dropi = ?').get(id_dropi);
    if (!row) return null;
    return {
      ...row,
      id_dropi: Number(row.id_dropi),
      has_burned_price: Number(row.has_burned_price || 0),
      detected_patterns: row.detected_patterns ? JSON.parse(row.detected_patterns) : [],
      clean_gallery_urls: row.clean_gallery_urls ? JSON.parse(row.clean_gallery_urls) : [],
      crop_top_pct: Number(row.crop_top_pct || 0),
      crop_bottom_pct: Number(row.crop_bottom_pct || 0),
    };
  } catch {
    return null;
  }
}

/**
 * Lista los productos moderados para la vista de /admin
 */
export async function listModeratedProducts(options?: {
  filter?: string; // 'all' | 'marked' | 'swapped_gallery' | 'crop' | 'deactivated'
  status?: string; // 'all' | 'pending' | 'approved' | 'reverted'
  limit?: number;
  offset?: number;
}): Promise<{ items: any[]; total: number }> {
  const limit = options?.limit ?? 50;
  const offset = options?.offset ?? 0;
  const filter = options?.filter || 'marked';
  const status = options?.status || 'all';

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin
        .from('product_image_moderation')
        .select(`
          *,
          products:id_dropi (
            name,
            supplier_name,
            sell_price_cop,
            stock_real,
            is_active
          )
        `, { count: 'exact' });

      if (filter === 'marked') {
        query = query.eq('has_burned_price', 1);
      } else if (filter === 'swapped_gallery') {
        query = query.eq('correction_applied', 'swapped_gallery');
      } else if (filter === 'crop') {
        query = query.in('correction_applied', ['crop_top', 'crop_bottom', 'crop_both']);
      } else if (filter === 'deactivated') {
        query = query.eq('correction_applied', 'deactivated');
      }

      if (status !== 'all') {
        query = query.eq('review_status', status);
      }

      const { data, count, error } = await query
        .order('updated_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data) {
        const items = data.map((d: any) => ({
          id_dropi: Number(d.id_dropi),
          has_burned_price: Number(d.has_burned_price),
          detected_text: d.detected_text,
          detected_patterns: Array.isArray(d.detected_patterns) ? d.detected_patterns : [],
          correction_applied: d.correction_applied,
          crop_top_pct: Number(d.crop_top_pct || 0),
          crop_bottom_pct: Number(d.crop_bottom_pct || 0),
          original_image_url: d.original_image_url,
          active_image_url: d.active_image_url,
          review_status: d.review_status,
          analyzed_at: d.analyzed_at,
          updated_at: d.updated_at,
          product_name: d.products?.name || `Producto #${d.id_dropi}`,
          supplier_name: d.products?.supplier_name || 'Desconocido',
          sell_price_cop: Number(d.products?.sell_price_cop || 0),
          stock_real: Number(d.products?.stock_real || 0),
          is_active: Number(d.products?.is_active ?? 1),
        }));
        return { items, total: count || items.length };
      }
    } catch (e: any) {
      console.warn('Error en listModeratedProducts Supabase:', e.message);
    }
  }

  // Fallback SQLite
  try {
    const s = getSqliteDb();
    let whereClauses: string[] = [];
    const params: any[] = [];

    if (filter === 'marked') {
      whereClauses.push('m.has_burned_price = 1');
    } else if (filter === 'swapped_gallery') {
      whereClauses.push("m.correction_applied = 'swapped_gallery'");
    } else if (filter === 'crop') {
      whereClauses.push("m.correction_applied IN ('crop_top', 'crop_bottom', 'crop_both')");
    } else if (filter === 'deactivated') {
      whereClauses.push("m.correction_applied = 'deactivated'");
    }

    if (status !== 'all') {
      whereClauses.push('m.review_status = ?');
      params.push(status);
    }

    const whereStr = whereClauses.length > 0 ? `WHERE ${whereClauses.join(' AND ')}` : '';

    const countRow = s.prepare(`SELECT COUNT(*) as total FROM product_image_moderation m ${whereStr}`).get(...params) as any;
    const total = countRow?.total || 0;

    const rows = s.prepare(`
      SELECT
        m.*,
        p.name as product_name,
        p.supplier_name,
        p.sell_price_cop,
        p.stock_real,
        p.is_active
      FROM product_image_moderation m
      LEFT JOIN products p ON m.id_dropi = p.id_dropi
      ${whereStr}
      ORDER BY m.updated_at DESC
      LIMIT ? OFFSET ?
    `).all(...params, limit, offset) as any[];

    const items = rows.map((r: any) => ({
      ...r,
      id_dropi: Number(r.id_dropi),
      detected_patterns: r.detected_patterns ? JSON.parse(r.detected_patterns) : [],
      clean_gallery_urls: r.clean_gallery_urls ? JSON.parse(r.clean_gallery_urls) : [],
      crop_top_pct: Number(r.crop_top_pct || 0),
      crop_bottom_pct: Number(r.crop_bottom_pct || 0),
    }));

    return { items, total };
  } catch (err: any) {
    console.error('Error listModeratedProducts SQLite:', err);
    return { items: [], total: 0 };
  }
}

/**
 * Actualiza la corrección o el estado de aprobación por el dueño en /admin
 */
export async function updateModerationCorrection(
  id_dropi: number,
  update: {
    correction_applied?: string;
    crop_top_pct?: number;
    crop_bottom_pct?: number;
    review_status?: 'approved' | 'pending' | 'reverted';
    is_active?: number;
    active_image_url?: string;
  }
): Promise<boolean> {
  const now = new Date().toISOString();

  // 1. SQLite
  try {
    const s = getSqliteDb();
    const existing = s.prepare('SELECT * FROM product_image_moderation WHERE id_dropi = ?').get(id_dropi) as any;
    if (existing) {
      const newCorrection = update.correction_applied ?? existing.correction_applied;
      const newCropTop = update.crop_top_pct ?? existing.crop_top_pct;
      const newCropBottom = update.crop_bottom_pct ?? existing.crop_bottom_pct;
      const newReview = update.review_status ?? existing.review_status;
      const newActiveImg = update.active_image_url ?? existing.active_image_url;

      s.prepare(`
        UPDATE product_image_moderation SET
          correction_applied = ?,
          crop_top_pct = ?,
          crop_bottom_pct = ?,
          review_status = ?,
          active_image_url = ?,
          updated_at = ?
        WHERE id_dropi = ?
      `).run(newCorrection, newCropTop, newCropBottom, newReview, newActiveImg, now, id_dropi);

      if (update.is_active !== undefined) {
        s.prepare('UPDATE products SET is_active = ?, updated_at = ? WHERE id_dropi = ?')
          .run(update.is_active, now, id_dropi);
      }
      s.prepare('UPDATE products SET crop_top_pct = ?, crop_bottom_pct = ?, image_url = COALESCE(?, image_url), updated_at = ? WHERE id_dropi = ?')
        .run(newCropTop, newCropBottom, newActiveImg, now, id_dropi);
    }
  } catch (e: any) {
    console.warn('Error updateModerationCorrection SQLite:', e.message);
  }

  // 2. Supabase
  if (isSupabaseConfigured) {
    try {
      const supaUpdate: any = { updated_at: now };
      if (update.correction_applied !== undefined) supaUpdate.correction_applied = update.correction_applied;
      if (update.crop_top_pct !== undefined) supaUpdate.crop_top_pct = update.crop_top_pct;
      if (update.crop_bottom_pct !== undefined) supaUpdate.crop_bottom_pct = update.crop_bottom_pct;
      if (update.review_status !== undefined) supaUpdate.review_status = update.review_status;
      if (update.active_image_url !== undefined) supaUpdate.active_image_url = update.active_image_url;

      await supabaseAdmin.from('product_image_moderation').update(supaUpdate).eq('id_dropi', id_dropi);

      const prodUpdate: any = { updated_at: now };
      if (update.crop_top_pct !== undefined) prodUpdate.crop_top_pct = update.crop_top_pct;
      if (update.crop_bottom_pct !== undefined) prodUpdate.crop_bottom_pct = update.crop_bottom_pct;
      if (update.is_active !== undefined) prodUpdate.is_active = update.is_active;
      if (update.active_image_url) prodUpdate.image_url = update.active_image_url;

      await supabaseAdmin.from('products').update(prodUpdate).eq('id_dropi', id_dropi);
    } catch (e: any) {
      console.warn('Error updateModerationCorrection Supabase:', e.message);
    }
  }

  productMemoryCache.delete(id_dropi);
  return true;
}

/**
 * Revierte cualquier corrección aplicada por OCR, devolviendo la foto y estado original de Dropi
 */
export async function revertModerationCorrection(id_dropi: number): Promise<boolean> {
  const mod = await getProductImageModeration(id_dropi);
  if (!mod || !mod.original_image_url) return false;

  return updateModerationCorrection(id_dropi, {
    correction_applied: 'none',
    crop_top_pct: 0,
    crop_bottom_pct: 0,
    review_status: 'reverted',
    is_active: 1,
    active_image_url: mod.original_image_url,
  });
}

/**
 * Obtiene métricas y conteos de moderación para el resumen en /admin
 */
export async function getModerationStats(): Promise<{
  total_reviewed: number;
  total_marked: number;
  total_swapped: number;
  total_cropped: number;
  total_deactivated: number;
  total_approved: number;
}> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabaseAdmin.from('product_image_moderation').select('has_burned_price, correction_applied, review_status');
      if (data) {
        let total_marked = 0;
        let total_swapped = 0;
        let total_cropped = 0;
        let total_deactivated = 0;
        let total_approved = 0;

        for (const row of data) {
          if (row.has_burned_price === 1) total_marked++;
          if (row.correction_applied === 'swapped_gallery') total_swapped++;
          if (row.correction_applied === 'crop_top' || row.correction_applied === 'crop_bottom' || row.correction_applied === 'crop_both') total_cropped++;
          if (row.correction_applied === 'deactivated') total_deactivated++;
          if (row.review_status === 'approved') total_approved++;
        }

        return {
          total_reviewed: data.length,
          total_marked,
          total_swapped,
          total_cropped,
          total_deactivated,
          total_approved,
        };
      }
    } catch {}
  }

  try {
    const s = getSqliteDb();
    const rows = s.prepare(`
      SELECT
        COUNT(*) as total_reviewed,
        SUM(CASE WHEN has_burned_price = 1 THEN 1 ELSE 0 END) as total_marked,
        SUM(CASE WHEN correction_applied = 'swapped_gallery' THEN 1 ELSE 0 END) as total_swapped,
        SUM(CASE WHEN correction_applied IN ('crop_top', 'crop_bottom', 'crop_both') THEN 1 ELSE 0 END) as total_cropped,
        SUM(CASE WHEN correction_applied = 'deactivated' THEN 1 ELSE 0 END) as total_deactivated,
        SUM(CASE WHEN review_status = 'approved' THEN 1 ELSE 0 END) as total_approved
      FROM product_image_moderation
    `).get() as any;

    return {
      total_reviewed: Number(rows?.total_reviewed || 0),
      total_marked: Number(rows?.total_marked || 0),
      total_swapped: Number(rows?.total_swapped || 0),
      total_cropped: Number(rows?.total_cropped || 0),
      total_deactivated: Number(rows?.total_deactivated || 0),
      total_approved: Number(rows?.total_approved || 0),
    };
  } catch {
    return {
      total_reviewed: 0,
      total_marked: 0,
      total_swapped: 0,
      total_cropped: 0,
      total_deactivated: 0,
      total_approved: 0,
    };
  }
}

