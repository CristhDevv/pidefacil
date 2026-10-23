process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
import fs from 'fs';
import path from 'path';
import { db } from '../lib/db';
import { buildCloudFrontImageUrl } from './dropi-client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeHtml(html: string | null | undefined): string | null {
  if (!html) return null;
  // Remove scripts, styles, iframes, and on* handlers
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
  if (!res.ok) {
    throw new Error(`HTTP ${res.status}: ${res.statusText}`);
  }
  const json = await res.json();
  return json;
}

async function runEnrichmentBatch(ids: number[]) {
  const token = fs.readFileSync('.secrets/dropi_token.txt', 'utf8').trim();
  const rawLogPath = path.join(process.cwd(), 'data/raw/dropi_enrichment_20261022.jsonl');
  fs.mkdirSync(path.dirname(rawLogPath), { recursive: true });

  console.log(`Starting enrichment for ${ids.length} products...`);

  const updateStmt = db.prepare(`
    UPDATE products
    SET 
      description = @description,
      gallery = @gallery,
      stock_por_variacion = @variations,
      updated_at = CURRENT_TIMESTAMP
    WHERE id_dropi = @id_dropi
  `);

  const results: any[] = [];

  for (const id of ids) {
    try {
      console.log(`Fetching detail for product ${id}...`);
      const data = await fetchProductDetail(id, token);
      
      // Save raw
      fs.appendFileSync(rawLogPath, JSON.stringify({ timestamp: new Date().toISOString(), id, data }) + '\n');

      const obj = data.objects;
      if (!obj) {
        console.warn(`No objects returned for product ${id}`);
        continue;
      }

      const description = sanitizeHtml(obj.description);

      // Gallery mapping
      let galleryUrls: string[] = [];
      if (Array.isArray(obj.gallery)) {
        galleryUrls = obj.gallery
          .filter((g: any) => g && g.urlS3)
          .map((g: any) => buildCloudFrontImageUrl(g.urlS3));
      }

      // Variations mapping
      let variationsJson: string | null = null;
      if (Array.isArray(obj.variations) && obj.variations.length > 0) {
        variationsJson = JSON.stringify(obj.variations);
      }

      updateStmt.run({
        id_dropi: id,
        description,
        gallery: galleryUrls.length > 0 ? JSON.stringify(galleryUrls) : null,
        variations: variationsJson,
      });

      console.log(`✅ Product ${id} (${obj.name}) enriched! Desc len: ${description?.length || 0}, Gallery: ${galleryUrls.length}`);
      results.push({
        id_dropi: id,
        name: obj.name,
        desc_length: description?.length || 0,
        desc_preview: description?.slice(0, 80),
        gallery_count: galleryUrls.length
      });

      await sleep(600);
    } catch (e: any) {
      console.error(`❌ Error enriching product ${id}:`, e.message);
    }
  }

  console.log('\n--- BATCH ENRICHMENT RESULTS ---');
  console.table(results);
}

const sampleIds = [602501, 2075631, 231, 234, 239, 241, 295, 306, 309, 324];
runEnrichmentBatch(sampleIds).catch(console.error);
