/**
 * ==============================================================================
 * PideFácil - Job en Segundo Plano Reanudable de Detección de Precios Quemados
 * ==============================================================================
 * 1. Escanea las fotos de catálogo con Tesseract OCR (Español)
 * 2. Detecta "$", precios (49.900, 49900), palabras comerciales (PRECIO, OFERTA, MAYORISTA, WHATSAPP) y teléfonos (10 dígitos)
 * 3. Aplica corrección automática:
 *    a) Si hay foto de galería limpia -> La pone como principal
 *    b) Si el texto está en franja superior/inferior -> Aplica recorte (12-22%)
 *    c) Si está en el centro sin galería -> Desactiva el producto
 * 4. Prioriza productos vendibles (stock_real > 0 y costo válido)
 * 5. Reanudable: no reprocesa productos ya moderados
 */

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';
import { getSqliteDb, saveProductImageModeration, DbProductImageModeration } from '../lib/db';
import { detectBurnedTextInImage, determineAutomaticCorrection, terminateOcrWorker } from '../lib/ocr-detector';

dotenv.config({ path: '.env.local' });
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface JobStats {
  total_reviewed: number;
  total_clean: number;
  total_marked: number;
  total_swapped: number;
  total_cropped: number;
  total_deactivated: number;
  total_errors: number;
  last_id_dropi: number | null;
  started_at: string;
  updated_at: string;
}

const STATE_FILE = path.resolve('./data/ocr-moderation-state.json');

function loadState(): JobStats {
  try {
    if (fs.existsSync(STATE_FILE)) {
      const c = JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
      return {
        total_reviewed: Number(c.total_reviewed ?? c.totalScanned ?? 0),
        total_clean: Number(c.total_clean ?? c.totalClean ?? 0),
        total_marked: Number(c.total_marked ?? c.totalMarked ?? 0),
        total_swapped: Number(c.total_swapped ?? c.totalSwapped ?? 0),
        total_cropped: Number(c.total_cropped ?? c.totalCropped ?? 0),
        total_deactivated: Number(c.total_deactivated ?? c.totalDeactivated ?? 0),
        total_errors: Number(c.total_errors ?? 0),
        last_id_dropi: c.last_id_dropi ?? c.lastProductId ?? null,
        started_at: c.started_at ?? c.startedAt ?? new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
    }
  } catch {}

  return {
    total_reviewed: 0,
    total_clean: 0,
    total_marked: 0,
    total_swapped: 0,
    total_cropped: 0,
    total_deactivated: 0,
    total_errors: 0,
    last_id_dropi: null,
    started_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };
}

function saveState(stats: JobStats) {
  try {
    stats.updated_at = new Date().toISOString();
    fs.writeFileSync(STATE_FILE, JSON.stringify(stats, null, 2), 'utf-8');
  } catch {}
}

async function fetchImageBuffer(url: string): Promise<Buffer | null> {
  try {
    const cleanUrl = encodeURI(url.trim());
    const res = await fetch(cleanUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PideFacilOcrBot/1.0)',
        'Accept': 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(10000),
    });

    if (!res.ok) return null;
    const arrayBuf = await res.arrayBuffer();
    return Buffer.from(arrayBuf);
  } catch {
    return null;
  }
}

async function runModerationJob() {
  console.log('================================================================');
  console.log('🤖 INICIANDO JOB DE DETECCIÓN Y CORRECCIÓN DE PRECIOS QUEMADOS');
  console.log('================================================================');

  const stats = loadState();
  const db = getSqliteDb();

  // Parsear argumentos CLI (ej: --limit=100)
  const args = process.argv.slice(2);
  let maxProducts = Infinity;
  for (const arg of args) {
    if (arg.startsWith('--limit=')) {
      maxProducts = parseInt(arg.split('=')[1], 10) || Infinity;
    }
  }

  // Consulta reanudable priorizando vendibles:
  // 1. Vendibles (stock > 0 y cost > 0)
  // 2. Mayor stock primero
  // 3. Excluyendo productos ya analizados en product_image_moderation
  const query = `
    SELECT
      id_dropi,
      name,
      supplier_name,
      cost_cop,
      sell_price_cop,
      stock_real,
      image_url,
      gallery,
      is_active
    FROM products
    WHERE id_dropi NOT IN (SELECT id_dropi FROM product_image_moderation)
      AND is_active = 1
      AND image_url IS NOT NULL
      AND TRIM(image_url) != ''
    ORDER BY
      (CASE WHEN stock_real > 0 AND cost_cop > 0 THEN 0 ELSE 1 END) ASC,
      stock_real DESC,
      id_dropi ASC
  `;

  const pendingProducts = db.prepare(query).all() as any[];
  const totalPending = pendingProducts.length;

  console.log(`📦 Productos pendientes por analizar: ${totalPending}`);
  console.log(`🎯 Meta de este ciclo: ${maxProducts === Infinity ? 'Todos' : maxProducts} productos`);
  console.log(`📊 Acumulado previo: ${stats.total_reviewed} revisados, ${stats.total_marked} marcados\n`);

  let processedInThisRun = 0;

  for (const prod of pendingProducts) {
    if (processedInThisRun >= maxProducts) {
      console.log(`🛑 Límite alcanzado (${maxProducts} productos). Pausando job.`);
      break;
    }

    processedInThisRun++;
    stats.total_reviewed++;
    stats.last_id_dropi = prod.id_dropi;

    const shortName = prod.name.length > 36 ? `${prod.name.slice(0, 33)}...` : prod.name;
    const isVendible = prod.stock_real > 0 && prod.cost_cop > 0;
    const tag = isVendible ? `[Vendible Stock:${prod.stock_real}]` : `[Catálogo]`;

    try {
      // 1. Descargar imagen principal
      const primaryBuf = await fetchImageBuffer(prod.image_url);
      if (!primaryBuf) {
        console.warn(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} ⚠️ Foto principal no disponible en CDN, buscando en galería...`);
        stats.total_errors++;

        // Intentar rescatar con imagen de galería
        let galleryUrls: string[] = [];
        try {
          if (prod.gallery) {
            const parsed = JSON.parse(prod.gallery);
            if (Array.isArray(parsed)) {
              galleryUrls = parsed.filter((u: string) => u && typeof u === 'string' && u !== prod.image_url);
            }
          }
        } catch {}

        let rescuedGalleryUrl: string | null = null;
        for (const gUrl of galleryUrls.slice(0, 3)) {
          const gBuf = await fetchImageBuffer(gUrl);
          if (gBuf) {
            const gOcr = await detectBurnedTextInImage(gBuf);
            if (!gOcr.hasBurnedPrice) {
              rescuedGalleryUrl = gUrl;
              break;
            }
          }
        }

        if (rescuedGalleryUrl) {
          stats.total_marked++;
          stats.total_swapped++;
          await saveProductImageModeration({
            id_dropi: prod.id_dropi,
            has_burned_price: 1,
            detected_text: 'FOTO_PRINCIPAL_ROTA_REEMPLAZADA_POR_GALERIA',
            detected_patterns: ['IMAGEN_ROTA_DROP_S3'],
            line_details: [],
            clean_gallery_urls: [rescuedGalleryUrl],
            correction_applied: 'swapped_gallery',
            crop_top_pct: 0,
            crop_bottom_pct: 0,
            original_image_url: prod.image_url,
            active_image_url: rescuedGalleryUrl,
            review_status: 'pending',
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          console.log(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} "${shortName}" -> 🔄 FOTO ROTA RESCATADA CON GALERÍA LIMPIA`);
        } else {
          // Marcar como procesado para que el job continúe avanzando sin atascarse
          await saveProductImageModeration({
            id_dropi: prod.id_dropi,
            has_burned_price: 0,
            detected_text: 'ERROR_DESCARGA_CDN_404',
            detected_patterns: [],
            line_details: [],
            clean_gallery_urls: [],
            correction_applied: 'none',
            crop_top_pct: 0,
            crop_bottom_pct: 0,
            original_image_url: prod.image_url,
            active_image_url: prod.image_url,
            review_status: 'pending',
            analyzed_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
        continue;
      }

      // 2. Ejecutar OCR en imagen principal
      const primaryOcr = await detectBurnedTextInImage(primaryBuf);

      const cleanGalleryUrls: string[] = [];

      // 3. Si la foto principal tiene precio quemado, verificar si alguna foto de galería está limpia (Regla 2a)
      if (primaryOcr.hasBurnedPrice) {
        let galleryUrls: string[] = [];
        try {
          if (prod.gallery) {
            const parsed = JSON.parse(prod.gallery);
            if (Array.isArray(parsed)) {
              galleryUrls = parsed.filter((u: string) => u && typeof u === 'string' && u !== prod.image_url);
            }
          }
        } catch {}

        // Probar hasta 3 imágenes de galería
        for (const gUrl of galleryUrls.slice(0, 3)) {
          const gBuf = await fetchImageBuffer(gUrl);
          if (gBuf) {
            const gOcr = await detectBurnedTextInImage(gBuf);
            if (!gOcr.hasBurnedPrice) {
              cleanGalleryUrls.push(gUrl);
              break; // Encontramos una limpia, suficiente para la regla 2a
            }
          }
        }
      }

      // 4. Tomar decisión de corrección automática
      const decision = determineAutomaticCorrection({
        primaryOcr,
        originalImageUrl: prod.image_url,
        cleanGalleryUrls,
      });

      // 5. Persistir en Base de Datos (SQLite + Supabase)
      const modRecord: DbProductImageModeration = {
        id_dropi: prod.id_dropi,
        has_burned_price: decision.has_burned_price,
        detected_text: decision.detected_text,
        detected_patterns: decision.detected_patterns,
        line_details: decision.line_details,
        clean_gallery_urls: decision.clean_gallery_urls,
        correction_applied: decision.correction_applied,
        crop_top_pct: decision.crop_top_pct,
        crop_bottom_pct: decision.crop_bottom_pct,
        original_image_url: prod.image_url,
        active_image_url: decision.active_image_url,
        review_status: 'pending',
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveProductImageModeration(modRecord);

      // 6. Actualizar métricas y loguear acción
      if (!decision.has_burned_price) {
        stats.total_clean++;
        console.log(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} "${shortName}" -> ✅ LIMPIA`);
      } else {
        stats.total_marked++;
        const patternsStr = decision.detected_patterns.slice(0, 3).join(', ');

        if (decision.correction_applied === 'swapped_gallery') {
          stats.total_swapped++;
          console.log(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} "${shortName}" -> 🔄 GALERÍA LIMPIA DETECTADA (Patrones: [${patternsStr}])`);
        } else if (decision.correction_applied === 'crop_top') {
          stats.total_cropped++;
          console.log(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} "${shortName}" -> ✂️ RECORTE SUPERIOR ${decision.crop_top_pct}% (Patrones: [${patternsStr}])`);
        } else if (decision.correction_applied === 'crop_bottom') {
          stats.total_cropped++;
          console.log(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} "${shortName}" -> ✂️ RECORTE INFERIOR ${decision.crop_bottom_pct}% (Patrones: [${patternsStr}])`);
        } else if (decision.correction_applied === 'crop_both') {
          stats.total_cropped++;
          console.log(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} "${shortName}" -> ✂️ RECORTE SUPERIOR ${decision.crop_top_pct}% + INFERIOR ${decision.crop_bottom_pct}%`);
        } else if (decision.correction_applied === 'deactivated') {
          stats.total_deactivated++;
          console.log(`[#${stats.total_reviewed}] ID ${prod.id_dropi} ${tag} "${shortName}" -> 🚫 DESACTIVADO (Texto en el centro: [${patternsStr}])`);
        }
      }

      // Guardar estado cada 5 productos
      if (processedInThisRun % 5 === 0) {
        saveState(stats);
      }

      // Resumen visual en consola cada 10 productos
      if (processedInThisRun % 10 === 0) {
        console.log(`----------------------------------------------------------------`);
        console.log(`📊 AVANCE: ${stats.total_reviewed} analizados | ${stats.total_clean} limpios | ⚠️ ${stats.total_marked} marcados (${stats.total_swapped} reemplazados por galería, ${stats.total_cropped} recortados, ${stats.total_deactivated} desactivados)`);
        console.log(`----------------------------------------------------------------\n`);
      }
    } catch (err: any) {
      console.error(`Error procesando producto ${prod.id_dropi}:`, err.message);
      stats.total_errors++;
    }
  }

  saveState(stats);
  await terminateOcrWorker();

  console.log('\n================================================================');
  console.log('🏁 CICLO DE DETECCIÓN FINALIZADO');
  console.log(`Total revisados:      ${stats.total_reviewed}`);
  console.log(`Total limpios:        ${stats.total_clean}`);
  console.log(`Total marcados:       ${stats.total_marked}`);
  console.log(`  - Galería cambiada: ${stats.total_swapped}`);
  console.log(`  - Recortados:       ${stats.total_cropped}`);
  console.log(`  - Desactivados:     ${stats.total_deactivated}`);
  console.log(`Errores de descarga:  ${stats.total_errors}`);
  console.log('================================================================\n');
}

runModerationJob().catch(async (e) => {
  console.error('Fallo fatal en runModerationJob:', e);
  await terminateOcrWorker();
  process.exit(1);
});
