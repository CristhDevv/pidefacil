import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import {
  getSharedOcrWorker,
  terminateSharedOcrWorker,
  fetchImageBuffer,
  analyzeImageBuffer,
  decideCorrection,
} from '../lib/ocr-analyzer';
import { saveProductImageModeration, DbProductImageModeration } from '../lib/db';

dotenv.config({ path: '.env.local' });
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

interface ScanState {
  totalScanned: number;
  totalMarked: number;
  totalSwapped: number;
  totalCropped: number;
  totalDeactivated: number;
  totalClean: number;
  lastProductId: number | null;
  startedAt: string;
  lastUpdatedAt: string;
}

const STATE_FILE = path.resolve('./data/ocr-moderation-state.json');

function loadState(): ScanState {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
    } catch {}
  }
  return {
    totalScanned: 0,
    totalMarked: 0,
    totalSwapped: 0,
    totalCropped: 0,
    totalDeactivated: 0,
    totalClean: 0,
    lastProductId: null,
    startedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
  };
}

function saveState(state: ScanState) {
  state.lastUpdatedAt = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf-8');
}

async function main() {
  console.log('================================================================');
  console.log('🤖 PIDEFÁCIL - DETECCIÓN Y CORRECCIÓN DE PRECIOS QUEMADOS (OCR)');
  console.log('================================================================');

  const state = loadState();
  console.log(`Estado previo: ${state.totalScanned} escaneados | ${state.totalMarked} marcados (${state.totalSwapped} cambiados, ${state.totalCropped} recortados, ${state.totalDeactivated} desactivados)`);

  const dbPath = process.env.DATABASE_PATH
    ? path.resolve(process.env.DATABASE_PATH)
    : path.resolve('./data/pidefacil.db');

  const sqlite = new Database(dbPath);

  // Consulta de productos pendientes
  // Prioridad: 1. Vendibles (stock > 0 y costo > 0 y activos) ordenados por stock DESC
  //            2. Resto de productos activos
  const query = `
    SELECT
      p.id_dropi,
      p.name,
      p.image_url,
      p.gallery,
      p.cost_cop,
      p.sell_price_cop,
      p.stock_real,
      p.is_active
    FROM products p
    WHERE p.image_url IS NOT NULL
      AND p.image_url != ''
      AND p.id_dropi NOT IN (
        SELECT id_dropi FROM product_image_moderation
      )
    ORDER BY
      (CASE WHEN p.stock_real > 0 AND p.cost_cop > 0 AND p.is_active = 1 THEN 0 ELSE 1 END) ASC,
      p.stock_real DESC,
      p.id_dropi ASC
  `;

  const pendingProducts = sqlite.prepare(query).all() as any[];
  console.log(`Productos pendientes por escanear: ${pendingProducts.length}`);

  if (pendingProducts.length === 0) {
    console.log('✅ No hay productos pendientes por moderar. Todo el catálogo está al día.');
    return;
  }

  const worker = await getSharedOcrWorker();
  let processedInThisRun = 0;
  let isShuttingDown = false;

  const handleShutdown = async () => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    console.log('\n🛑 Guardando estado y cerrando proceso limpiamente...');
    saveState(state);
    await terminateSharedOcrWorker();
    process.exit(0);
  };

  process.on('SIGINT', handleShutdown);
  process.on('SIGTERM', handleShutdown);

  for (const product of pendingProducts) {
    if (isShuttingDown) break;

    const id = product.id_dropi;
    const name = product.name?.slice(0, 45) || `Prod #${id}`;
    const mainImageUrl = product.image_url;

    process.stdout.write(`[${state.totalScanned + 1}] Escaneando #${id} "${name}"... `);

    try {
      // 1. Descargar imagen principal
      const imgBuf = await fetchImageBuffer(mainImageUrl);
      if (!imgBuf) {
        console.log('⚠️ No se pudo descargar imagen principal, omitiendo temporalmente.');
        continue;
      }

      // 2. Analizar con OCR
      const primaryAnalysis = await analyzeImageBuffer(imgBuf, worker);

      const cleanGalleryUrls: string[] = [];

      // 3. Si la principal tiene texto quemado, inspeccionar galería
      if (primaryAnalysis.hasBurnedPrice) {
        console.log(`🚨 MARCADO [${primaryAnalysis.matchedPatterns.join(', ')}]`);

        let galleryList: string[] = [];
        try {
          if (product.gallery) {
            const parsed = JSON.parse(product.gallery);
            if (Array.isArray(parsed)) {
              galleryList = parsed.filter((u: string) => u && u !== mainImageUrl);
            }
          }
        } catch {}

        // Revisar hasta 3 imágenes de galería para buscar una limpia
        for (const galUrl of galleryList.slice(0, 3)) {
          const galBuf = await fetchImageBuffer(galUrl);
          if (!galBuf) continue;
          try {
            const galAnalysis = await analyzeImageBuffer(galBuf, worker);
            if (!galAnalysis.hasBurnedPrice) {
              cleanGalleryUrls.push(galUrl);
              break; // Encontramos la primera limpia, suficiente para la regla 2a
            }
          } catch {}
        }
      } else {
        console.log('✅ LIMPIO');
        state.totalClean++;
      }

      // 4. Tomar decisión de corrección
      const decision = decideCorrection(mainImageUrl, primaryAnalysis, cleanGalleryUrls);

      // 5. Guardar en BD (SQLite + Supabase)
      const moderationItem: DbProductImageModeration = {
        id_dropi: id,
        has_burned_price: primaryAnalysis.hasBurnedPrice ? 1 : 0,
        detected_text: primaryAnalysis.detectedText,
        detected_patterns: primaryAnalysis.matchedPatterns,
        line_details: primaryAnalysis.lines,
        clean_gallery_urls: cleanGalleryUrls,
        correction_applied: decision.correction_applied,
        crop_top_pct: decision.crop_top_pct,
        crop_bottom_pct: decision.crop_bottom_pct,
        original_image_url: mainImageUrl,
        active_image_url: decision.active_image_url,
        review_status: 'pending',
        analyzed_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await saveProductImageModeration(moderationItem);

      // Actualizar contadores
      state.totalScanned++;
      state.lastProductId = id;

      if (primaryAnalysis.hasBurnedPrice) {
        state.totalMarked++;
        if (decision.correction_applied === 'swapped_gallery') {
          state.totalSwapped++;
          console.log(`   ↪️ CORRECCIÓN: Foto cambiada por imagen limpia de galería.`);
        } else if (decision.correction_applied === 'crop_top') {
          state.totalCropped++;
          console.log(`   ↪️ CORRECCIÓN: Recorte superior aplicado (-${decision.crop_top_pct}%).`);
        } else if (decision.correction_applied === 'crop_bottom') {
          state.totalCropped++;
          console.log(`   ↪️ CORRECCIÓN: Recorte inferior aplicado (-${decision.crop_bottom_pct}%).`);
        } else if (decision.correction_applied === 'crop_both') {
          state.totalCropped++;
          console.log(`   ↪️ CORRECCIÓN: Recorte doble aplicado (Top -${decision.crop_top_pct}%, Btm -${decision.crop_bottom_pct}%).`);
        } else if (decision.correction_applied === 'deactivated') {
          state.totalDeactivated++;
          console.log(`   ↪️ CORRECCIÓN: Desactivado preventivamente (texto en el centro).`);
        }
      }
    } catch (itemErr: any) {
      console.log(`❌ Error procesando #${id}: ${itemErr.message}`);
    }

    processedInThisRun++;

    if (processedInThisRun % 5 === 0) {
      saveState(state);
      console.log(`--- [CHECKPOINT] Total escaneados: ${state.totalScanned} | Marcados: ${state.totalMarked} (Cambiados: ${state.totalSwapped}, Recortados: ${state.totalCropped}, Desactivados: ${state.totalDeactivated}) ---`);
    }
  }

  saveState(state);
  await terminateSharedOcrWorker();

  console.log('\n================================================================');
  console.log('🎉 RESUMEN FINAL DE MODERACIÓN OCR:');
  console.log(`- Total de productos revisados: ${state.totalScanned}`);
  console.log(`- Productos limpios sin texto: ${state.totalClean}`);
  console.log(`- Productos marcados con texto/precio: ${state.totalMarked}`);
  console.log(`  * Corregidos con foto de galería: ${state.totalSwapped}`);
  console.log(`  * Corregidos con recorte de franja: ${state.totalCropped}`);
  console.log(`  * Desactivados preventivamente: ${state.totalDeactivated}`);
  console.log('================================================================');
}

main().catch(async (e) => {
  console.error('Error fatal en scanner OCR:', e);
  await terminateSharedOcrWorker();
  process.exit(1);
});
