/**
 * Helper centralizado para resolver la URL de visualización de producto en la tienda.
 * Si el producto tiene configurado un recorte de franja superior o inferior (por OCR de precios quemados),
 * pasa por el transform de imagen en el proxy (/api/proxy-image) sin alterar la URL original de Dropi.
 */
export function getProductDisplayImageUrl(product: {
  image_url: string | null;
  crop_top_pct?: number | null;
  crop_bottom_pct?: number | null;
}): string {
  if (!product.image_url || product.image_url.trim() === '') {
    return 'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&auto=format&fit=crop&q=80';
  }

  const cropTop = Math.max(0, Math.min(40, Number(product.crop_top_pct || 0)));
  const cropBottom = Math.max(0, Math.min(40, Number(product.crop_bottom_pct || 0)));

  if (cropTop > 0 || cropBottom > 0) {
    return `/api/proxy-image?url=${encodeURIComponent(product.image_url)}&cropTop=${cropTop}&cropBottom=${cropBottom}`;
  }

  return product.image_url;
}

/**
 * Resuelve la URL original sin transformar para vistas comparativas (Antes / Después)
 */
export function getOriginalProductImageUrl(product: {
  image_url?: string | null;
  original_image_url?: string | null;
}): string {
  return (
    product.original_image_url ||
    product.image_url ||
    'https://images.unsplash.com/photo-1560343090-f0409e92791a?w=600&auto=format&fit=crop&q=80'
  );
}
