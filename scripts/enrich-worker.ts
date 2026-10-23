/**
 * ==============================================================================
 * PideFácil - Motor de Enriquecimiento de Catálogo (Dropi v1 Show API)
 * ==============================================================================
 * Trae descripción HTML enriquecida, galería completa y variaciones para cada producto.
 */

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import fs from 'fs';
import path from 'path';
import { db, saveCheckpoint, getCheckpoint } from '../lib/db';
import { buildCloudFrontImageUrl } from './dropi-client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  let cleaned = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/\s*on\w+="[^"]*"/gi, '')
    .replace(/\s*on\w+='[^']*'/gi, '');
  return cleaned.trim() || null;
}

export async function fetchProductDetail(id: number | string, token: string) {
  const url = `https://api.dropi.co/api/products/productlist/v1/show/?id=${id}`;
  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'X-Authorization': 'Bearer ' + token,
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://app.dropi.co',
    'Referer': `https://app.dropi.co/dashboard/product-details/${id}/p`,
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Language': 'es-419,es;q=0.9,en;q=0.8'
  };

  const res = await fetch(url, { headers });
  if (res.status === 401) {
    throw new Error('401_EXPIRED');
  }
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  return await res.json();
}

async function startEnrichment() {
  const token = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const today = new Date().toISOString().slice(0, 10).replace(/-/g, '');
  const rawLogPath = path.join(process.cwd(), `data/raw/dropi_enrichment_${today}.jsonl`);
  fs.mkdirSync(path.dirname(rawLogPath), { recursive: true });

  console.log('===============================================================');
  console.log('🎨 MOTOR DE ENRIQUECIMIENTO DROPI (Descripción + Galería)');
  console.log('===============================================================');

  const updateStmt = db.prepare(`
    UPDATE products
    SET 
      description = @description,
      gallery = COALESCE(@gallery, gallery),
      stock_por_variacion = COALESCE(@variations, stock_por_variacion),
      updated_at = CURRENT_TIMESTAMP
    WHERE id_dropi = @id_dropi
  `);

  // Obtener productos que necesitan enriquecimiento (priorizando activos con costo válido)
  const pendingStmt = db.prepare(`
    SELECT id_dropi, name, cost_cop
    FROM products
    WHERE is_active = 1 AND description IS NULL
    ORDER BY stock_real DESC, id_dropi ASC
  `);

  const pending = pendingStmt.all() as { id_dropi: number; name: string; cost_cop: number }[];
  console.log(`📋 Productos activos pendientes por enriquecer: ${pending.length.toLocaleString('es-CO')}`);

  let enrichedWithDesc = 0;
  let enrichedWithoutDesc = 0;
  let errors = 0;

  for (let i = 0; i < pending.length; i++) {
    const item = pending[i];
    try {
      const data = await fetchProductDetail(item.id_dropi, token);
      
      // Crudo append
      fs.appendFileSync(rawLogPath, JSON.stringify({ timestamp: new Date().toISOString(), id: item.id_dropi, data }) + '\n');

      const obj = data.objects;
      if (!obj) {
        enrichedWithoutDesc++;
        continue;
      }

      const description = sanitizeHtml(obj.description);
      if (description) {
        enrichedWithDesc++;
      } else {
        enrichedWithoutDesc++;
      }

      // Galería completa
      let galleryUrls: string[] = [];
      if (Array.isArray(obj.gallery) && obj.gallery.length > 0) {
        galleryUrls = obj.gallery
          .filter((g: any) => g && g.urlS3)
          .map((g: any) => buildCloudFrontImageUrl(g.urlS3));
      }

      // Variaciones
      let variationsJson: string | null = null;
      if (Array.isArray(obj.variations) && obj.variations.length > 0) {
        variationsJson = JSON.stringify(obj.variations);
      }

      updateStmt.run({
        id_dropi: item.id_dropi,
        description: description || null,
        gallery: galleryUrls.length > 0 ? JSON.stringify(galleryUrls) : null,
        variations: variationsJson,
      });

      if ((i + 1) % 10 === 0 || i === 0) {
        process.stdout.write(
          `✨ [ENRIQUECIMIENTO] Progreso: ${i + 1}/${pending.length} | ` +
          `Con Desc: ${enrichedWithDesc} | Sin Desc (null en origen): ${enrichedWithoutDesc} | Errores: ${errors}\r`
        );
      }

      await sleep(550);
    } catch (e: any) {
      if (e.message === '401_EXPIRED') {
        console.error('\n🚨 Token expirado durante enriquecimiento.');
        break;
      }
      errors++;
      await sleep(1000);
    }
  }

  console.log('\n===============================================================');
  console.log(`🏁 Enriquecimiento finalizado.`);
  console.log(`   Total procesados: ${enrichedWithDesc + enrichedWithoutDesc}`);
  console.log(`   Con descripción rica: ${enrichedWithDesc}`);
  console.log(`   Sin descripción en origen (null): ${enrichedWithoutDesc}`);
  console.log(`   Errores: ${errors}`);
  console.log('===============================================================');
}

if (require.main === module) {
  startEnrichment().catch(console.error);
}
