/**
 * ==============================================================================
 * PideFácil - Demonio Permanente de Enriquecimiento (Dropi v1 Show API)
 * ==============================================================================
 * Características de Grado de Producción:
 * 1. Cola Viva: Procesa productos con description IS NULL y description_is_empty = 0.
 * 2. Reposo inteligente: Al vaciar la cola, duerme 10 min y vuelve a consultar.
 * 3. Checkpoint por producto: Inmediato en SQLite.
 * 4. Candado de instancia única: File lock data/enrich.lock.
 * 5. Auto-renovación de token: Ante 401, extrae token fresco de Chrome LevelDB.
 * 6. Heartbeat persistente: data/enrich-heartbeat.json actualizado en cada producto.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
dotenv.config();

import { execFileSync } from 'child_process';
import { db } from '../lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '../lib/supabase';
import { buildCloudFrontImageUrl } from './dropi-client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const DATA_DIR = path.join(process.cwd(), 'data');
const LOCK_FILE = path.join(DATA_DIR, 'enrich.lock');
const HEARTBEAT_FILE = path.join(DATA_DIR, 'enrich-heartbeat.json');
const RAW_DIR = path.join(DATA_DIR, 'raw');

if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
if (!fs.existsSync(RAW_DIR)) fs.mkdirSync(RAW_DIR, { recursive: true });

// --- Candado de Instancia Única ---
function acquireLock(): boolean {
  if (fs.existsSync(LOCK_FILE)) {
    try {
      const pidStr = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      const pid = parseInt(pidStr, 10);
      if (!isNaN(pid)) {
        // Verificar si el proceso con este PID sigue vivo
        try {
          process.kill(pid, 0); // Lanza error si no existe
          console.error(`🔒 Ya existe una instancia activa del motor de enriquecimiento (PID: ${pid}).`);
          return false;
        } catch {
          console.log(`🔓 Candado previo obsoleto detectado (PID ${pid} ya no existe). Reclamando candado...`);
        }
      }
    } catch {}
  }

  fs.writeFileSync(LOCK_FILE, process.pid.toString());
  return true;
}

function releaseLock() {
  try {
    if (fs.existsSync(LOCK_FILE)) {
      const currentPid = fs.readFileSync(LOCK_FILE, 'utf8').trim();
      if (currentPid === process.pid.toString()) {
        fs.unlinkSync(LOCK_FILE);
      }
    }
  } catch {}
}

// Limpieza de candado en cierre
process.on('SIGINT', () => {
  console.log('\n🛑 Recibido SIGINT. Liberando candado y cerrando limpiamente...');
  writeHeartbeat('stopped_sigint', null, 'Cierre por SIGINT');
  releaseLock();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n🛑 Recibido SIGTERM. Liberando candado y cerrando limpiamente...');
  writeHeartbeat('stopped_sigterm', null, 'Cierre por SIGTERM');
  releaseLock();
  process.exit(0);
});

process.on('exit', () => {
  releaseLock();
});

// --- Estado y Pulso (Heartbeat) ---
let sessionProcessed = 0;
let sessionWithDesc = 0;
let sessionEmptyInSource = 0;
const startEpoch = Date.now();

function writeHeartbeat(
  status: 'running' | 'idle_sleeping' | 'recovering_token' | 'paused_token_expired' | 'stopped_error' | 'stopped_sigint' | 'stopped_sigterm',
  lastProduct?: { id: number; name: string } | null,
  lastError?: string | null
) {
  try {
    // Conteo global en SQLite
    const totalInDb = (db.prepare('SELECT COUNT(*) as count FROM products').get() as any).count;
    const totalWithDesc = (db.prepare('SELECT COUNT(*) as count FROM products WHERE description IS NOT NULL').get() as any).count;
    const totalEmptyInSource = (db.prepare('SELECT COUNT(*) as count FROM products WHERE description_is_empty = 1').get() as any).count;
    const pendingQueueCount = (db.prepare('SELECT COUNT(*) as count FROM products WHERE is_active = 1 AND description IS NULL AND description_is_empty = 0').get() as any).count;

    const payload = {
      timestamp: new Date().toISOString(),
      status,
      pid: process.pid,
      uptime_seconds: Math.floor((Date.now() - startEpoch) / 1000),
      session_stats: {
        processed: sessionProcessed,
        with_description: sessionWithDesc,
        empty_in_source: sessionEmptyInSource,
      },
      database_stats: {
        total_products: totalInDb,
        total_with_description: totalWithDesc,
        total_empty_in_source: totalEmptyInSource,
        pending_queue: pendingQueueCount,
      },
      last_product: lastProduct || null,
      last_error: lastError || null,
    };

    fs.writeFileSync(HEARTBEAT_FILE, JSON.stringify(payload, null, 2));
  } catch (err: any) {
    console.error('Error al escribir heartbeat:', err.message);
  }
}

// --- Sanitización HTML Fiel ---
function sanitizeHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  const cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*on\w+="[^"]*"/gi, '')
    .replace(/\s*on\w+='[^']*'/gi, '');
  return cleaned.trim() || null;
}

// --- Auto-Renovación de Token desde Chrome LevelDB ---
function renewTokenFromChrome(): string | null {
  try {
    console.log('🔄 Ejecutando extracción de token fresco desde Chrome LevelDB...');
    const out = execFileSync('python', ['scripts/extract_chrome_token.py'], { encoding: 'utf8' });
    const match = out.match(/SUCCESS_TOKEN:(eyJ[A-Za-z0-9_\-\.]+)/);
    if (match) {
      const freshToken = match[1].trim();
      console.log(`🎉 Token renovado con éxito desde Chrome! (Length: ${freshToken.length})`);
      return freshToken;
    }
  } catch (e: any) {
    console.error('Error al ejecutar extractor de Chrome:', e.message);
  }
  return null;
}

// --- Llamada API Replicada ---
async function fetchProductDetail(id: number | string, token: string, name?: string): Promise<{ status: number; data?: any }> {
  const slug = (name || 'producto').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'producto';
  const url = `https://api.dropi.co/api/products/productlist/v1/show/?id=${id}`;
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'X-Authorization': 'Bearer ' + token,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://app.dropi.co',
    'Referer': `https://app.dropi.co/dashboard/product-details/${id}/${slug}`,
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
  };

  try {
    const res = await fetch(url, { headers });
    if (res.status === 401) {
      return { status: 401 };
    }
    if (!res.ok) {
      return { status: res.status };
    }
    const data = await res.json();
    return { status: 200, data };
  } catch (e: any) {
    console.error(`Fetch exception for product ${id}:`, e.message);
    return { status: 500 };
  }
}

// --- Bucle Principal del Servicio Permanente ---
async function main() {
  if (!acquireLock()) {
    process.exit(0);
  }

  console.log('===============================================================');
  console.log(`🚀 DEMONIO PERMANENTE DE ENRIQUECIMIENTO PIDEFÁCIL`);
  console.log(`   PID: ${process.pid} | Registro Heartbeat: ${HEARTBEAT_FILE}`);
  console.log('===============================================================');

  let activeToken = fs.existsSync('.secrets/dropi_token.txt')
    ? fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim()
    : (process.env.DROPI_TOKEN || '').trim();

  if (!activeToken) {
    const fromChrome = renewTokenFromChrome();
    if (fromChrome) activeToken = fromChrome;
    else {
      console.error('🚨 No se encontró ningún token inicial ni en .secrets ni en Chrome.');
      writeHeartbeat('paused_token_expired', null, 'Sin token inicial');
      releaseLock();
      process.exit(2);
    }
  }

  writeHeartbeat('running', null, null);

  const updateProductStmt = db.prepare(`
    UPDATE products
    SET 
      description = @description,
      description_is_empty = @description_is_empty,
      gallery = COALESCE(@gallery, gallery),
      stock_por_variacion = COALESCE(@variations, stock_por_variacion),
      updated_at = CURRENT_TIMESTAMP
    WHERE id_dropi = @id_dropi
  `);

  while (true) {
    // 1. Consultar lote de la cola viva
    const pendingStmt = db.prepare(`
      SELECT id_dropi, name, cost_cop, stock_real
      FROM products
      WHERE is_active = 1 
        AND description IS NULL 
        AND description_is_empty = 0
      ORDER BY stock_real DESC, id_dropi ASC
      LIMIT 100
    `);

    const batch = pendingStmt.all() as { id_dropi: number; name: string; cost_cop: number; stock_real: number }[];

    if (batch.length === 0) {
      console.log('\n💤 Cola vacía (todos los productos activos tienen descripción o fueron validados vacíos en origen).');
      console.log('   Entrando en reposo de 10 minutos esperando nuevos productos del barrido continuo...');
      
      const sleepStart = Date.now();
      const tenMinutesMs = 10 * 60 * 1000;

      while (Date.now() - sleepStart < tenMinutesMs) {
        writeHeartbeat('idle_sleeping', null, null);
        await sleep(15000); // Latido cada 15 segundos durante el reposo
      }
      continue;
    }

    console.log(`\n📋 Procesando lote de ${batch.length} productos pendientes...`);
    const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const rawLogPath = path.join(RAW_DIR, `dropi_enrichment_${today}.jsonl`);

    for (const item of batch) {
      let response = await fetchProductDetail(item.id_dropi, activeToken, item.name);

      // Manejo estricto de Error 401 (Auto-renovación inteligente)
      if (response.status === 401) {
        console.warn(`\n⚠️  [HTTP 401] Token expirado en producto [${item.id_dropi}]. Intentando auto-renovar desde Chrome...`);
        writeHeartbeat('recovering_token', { id: item.id_dropi, name: item.name }, 'HTTP 401 Token Expirado');

        const freshToken = renewTokenFromChrome();
        if (freshToken) {
          activeToken = freshToken;
          // Reintentar de inmediato con el token fresco
          response = await fetchProductDetail(item.id_dropi, activeToken, item.name);
        } else {
          console.error('🛑 [CRÍTICO] No hay sesión activa en Chrome. Deteniendo en pausa limpia.');
          writeHeartbeat('paused_token_expired', { id: item.id_dropi, name: item.name }, 'Token expirado y sin sesión válida en Chrome');
          releaseLock();
          process.exit(2);
        }
      }

      if (response.status === 429) {
        console.warn(`⚠️  [HTTP 429] Rate limit detectado. Aplicando backoff de 5s...`);
        await sleep(5000);
        continue;
      }

      if (response.status !== 200 || !response.data) {
        console.warn(`⚠️  [HTTP ${response.status}] No se pudo obtener detalle para [${item.id_dropi}].`);
        await sleep(1000);
        continue;
      }

      // Guardar crudo en JSONL
      fs.appendFileSync(
        rawLogPath,
        JSON.stringify({ timestamp: new Date().toISOString(), id: item.id_dropi, data: response.data }) + '\n'
      );

      const obj = response.data.objects;
      const sanitized = obj ? sanitizeHtml(obj.description) : null;
      const isEmptyInSource = sanitized ? 0 : 1;

      // Galería completa
      let galleryUrls: string[] = [];
      if (obj && Array.isArray(obj.gallery) && obj.gallery.length > 0) {
        galleryUrls = obj.gallery
          .filter((g: any) => g && g.urlS3)
          .map((g: any) => buildCloudFrontImageUrl(g.urlS3));
      }

      // Variaciones
      let variationsJson: string | null = null;
      if (obj && Array.isArray(obj.variations) && obj.variations.length > 0) {
        variationsJson = JSON.stringify(obj.variations);
      }

      // Actualización inmediata en SQLite (checkpoint por producto)
      updateProductStmt.run({
        id_dropi: item.id_dropi,
        description: sanitized || null,
        description_is_empty: isEmptyInSource,
        gallery: galleryUrls.length > 0 ? JSON.stringify(galleryUrls) : null,
        variations: variationsJson,
      });

      // Sincronización inmediata en Supabase (para que la tienda en vivo lo refleje al instante)
      if (isSupabaseConfigured) {
        try {
          await supabaseAdmin
            .from('products')
            .update({
              description: sanitized || null,
              description_is_empty: isEmptyInSource,
              gallery: galleryUrls.length > 0 ? galleryUrls : null,
              stock_por_variacion: variationsJson ? JSON.parse(variationsJson) : null,
              updated_at: new Date().toISOString(),
            })
            .eq('id_dropi', item.id_dropi);
        } catch (supaErr: any) {
          console.error(`Error sincronizando producto ${item.id_dropi} a Supabase:`, supaErr.message);
        }
      }

      sessionProcessed++;
      if (sanitized) sessionWithDesc++;
      else sessionEmptyInSource++;

      writeHeartbeat('running', { id: item.id_dropi, name: item.name }, null);

      process.stdout.write(
        `✨ [PID ${process.pid}] ID: ${item.id_dropi} | Con Desc: ${sessionWithDesc} | Vacíos origen: ${sessionEmptyInSource} | Sesión: ${sessionProcessed}\r`
      );

      await sleep(550);
    }
  }
}

main().catch((err) => {
  console.error('\n💥 Error no recuperable en enriquecimiento:', err);
  writeHeartbeat('stopped_error', null, err.message);
  releaseLock();
  process.exit(1);
});
