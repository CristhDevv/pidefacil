import { resolveDropiToken } from './dropi-quote';
import { extractDropiTokenFromChrome } from './chrome-token-extractor';
import { buildCloudFrontImageUrl } from './image-url';
import { updateProductEnrichment } from './db';

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

/**
 * Enriquecimiento al vuelo (Just-In-Time) para un producto que no tiene descripción.
 * Consulta la API v1/show de Dropi, sanitiza el HTML, extrae la galería completa
 * y actualiza Supabase y SQLite para que quede guardado permanentemente.
 */
export async function enrichProductJustInTime(
  id_dropi: number,
  name?: string
): Promise<{
  description: string | null;
  gallery: string[] | null;
  variationsJson: string | null;
} | null> {
  let token = await resolveDropiToken();
  if (!token) {
    token = extractDropiTokenFromChrome() || '';
  }
  if (!token) return null;

  const slug = (name || 'producto')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'producto';

  const url = `https://api.dropi.co/api/products/productlist/v1/show/?id=${id_dropi}`;
  const headers: Record<string, string> = {
    'Accept': 'application/json, text/plain, */*',
    'X-Authorization': 'Bearer ' + token,
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    'Origin': 'https://app.dropi.co',
    'Referer': `https://app.dropi.co/dashboard/product-details/${id_dropi}/${slug}`,
    'Sec-Fetch-Site': 'same-site',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Dest': 'empty',
    'Accept-Language': 'es-419,es;q=0.9,en;q=0.8',
  };

  try {
    let res = await fetch(url, { headers });
    if (res.status === 401) {
      const freshToken = extractDropiTokenFromChrome();
      if (freshToken && freshToken !== token) {
        token = freshToken;
        headers['X-Authorization'] = 'Bearer ' + token;
        res = await fetch(url, { headers });
      }
    }

    if (!res.ok) {
      console.warn(`[Enricher JIT] Dropi respondió ${res.status} para producto ${id_dropi}`);
      return null;
    }

    const data = await res.json();
    if (!data || !data.objects) {
      return null;
    }

    const obj = data.objects;
    const sanitized = sanitizeHtml(obj.description);
    const isEmptyInSource = sanitized ? 0 : 1;

    // Galería
    let galleryUrls: string[] = [];
    if (Array.isArray(obj.gallery) && obj.gallery.length > 0) {
      galleryUrls = obj.gallery
        .filter((g: any) => g && g.urlS3)
        .map((g: any) => buildCloudFrontImageUrl(g.urlS3))
        .filter(Boolean) as string[];
    }

    // Variaciones
    let variationsJson: string | null = null;
    if (Array.isArray(obj.variations) && obj.variations.length > 0) {
      variationsJson = JSON.stringify(obj.variations);
    }

    // Guardar inmediatamente en Supabase y SQLite
    await updateProductEnrichment(id_dropi, {
      description: sanitized || null,
      description_is_empty: isEmptyInSource,
      gallery: galleryUrls.length > 0 ? galleryUrls : null,
      stock_por_variacion: variationsJson,
    });

    return {
      description: sanitized || null,
      gallery: galleryUrls.length > 0 ? galleryUrls : null,
      variationsJson,
    };
  } catch (err: any) {
    console.error(`[Enricher JIT] Error enriqueciendo producto ${id_dropi}:`, err?.message || err);
    return null;
  }
}
