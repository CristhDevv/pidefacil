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
  first_seen_at: string;
  last_seen_at: string;
  updated_at: string;
  raw?: string | null; // JSON
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
  quantity_type: '1x' | '2x';
  total_cop: number;
  status: 'pendiente_despacho' | 'subido_a_dropi' | 'en_transito' | 'entregado' | 'novedad' | 'cancelado';
  dropi_order_id?: number | null;
  notes?: string | null;
  created_at: string;
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
    cost_cop: Number(row.cost_cop),
    suggested_price_cop: row.suggested_price_cop ? Number(row.suggested_price_cop) : null,
    sell_price_cop: Number(row.sell_price_cop),
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
    is_active: Number(row.is_active || 0),
    needs_review: Number(row.needs_review || 0),
    description_is_empty: Number(row.description_is_empty || 0),
  };
}

// ------------------------------------------------------------------------------
// MÉTODOS UNIVERSALES DE ACCESO A DATOS
// ------------------------------------------------------------------------------

/**
 * Consulta un producto por su id Dropi
 */
export async function getProductById(id_dropi: number): Promise<DbProduct | undefined> {
  if (isSupabaseConfigured) {
    try {
      const { data, error } = await supabaseAdmin
        .from('products')
        .select('*')
        .eq('id_dropi', id_dropi)
        .maybeSingle();

      if (error || !data) return undefined;
      return formatProductFromSupabase(data);
    } catch (e) {
      console.error('Error en Supabase getProductById:', e);
    }
  }

  // Fallback SQLite
  try {
    return getSqliteDb()
      .prepare('SELECT * FROM products WHERE id_dropi = ?')
      .get(id_dropi) as DbProduct | undefined;
  } catch {
    return undefined;
  }
}

/**
 * Obtiene los productos activos para el catálogo público Mobile-First
 */
export async function getActiveProducts(options?: {
  category?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<{ products: DbProduct[]; total: number }> {
  const limit = options?.limit ?? 40;
  const offset = options?.offset ?? 0;

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin
        .from('products')
        .select('*', { count: 'exact' })
        .eq('is_active', 1)
        .gt('stock_real', 0);

      if (options?.search && options.search.trim()) {
        query = query.ilike('name', `%${options.search.trim()}%`);
      }

      if (options?.category && options.category.toLowerCase() !== 'todo') {
        query = query.ilike('categories::text', `%${options.category}%`);
      }

      const { data, count, error } = await query
        .order('display_priority', { ascending: true })
        .order('stock_real', { ascending: false })
        .range(offset, offset + limit - 1);

      if (!error && data && data.length > 0) {
        return {
          products: data.map(formatProductFromSupabase),
          total: count || data.length,
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
        .select('id_dropi, name, sell_price_cop, image_url, stock_real, supplier_name')
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
        SELECT p.id_dropi, p.name, p.sell_price_cop, p.image_url, p.stock_real, p.supplier_name
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
