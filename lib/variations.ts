/**
 * ==============================================================================
 * PideFácil - Normalizador Universal de Variaciones de Producto
 * ==============================================================================
 * Extrae y formatea nombres legibles (Color, Talla, Presentación) desde
 * las estructuras de atributos de Dropi API para todo el sistema.
 */

export interface NormalizedVariation {
  id: number;
  sku: string | null;
  label: string;
  title: string;
  name: string;
  stock: number;
  sale_price: number | null;
  attribute_values?: any[];
  [key: string]: any;
}

/**
 * Genera un texto legible para una variación (ej: "Talla 40 / VERDE PISTACHO", "BLANCO / Talla XL", "220Gr / Negro")
 */
export function getVariationLabel(v: any, index = 0): string {
  if (!v) return `Opción ${index + 1}`;

  // 1. Extraer desde attribute_values (Estructura oficial de Dropi)
  if (Array.isArray(v.attribute_values) && v.attribute_values.length > 0) {
    const parts = v.attribute_values
      .map((attr: any) => {
        const val = String(attr?.value || '').trim();
        const name = String(attr?.attribute_name || '').trim();
        if (!val) return '';

        const nameUpper = name.toUpperCase();
        // Mejorar legibilidad de tallas si no lo incluye
        if ((nameUpper === 'TALLA' || nameUpper === 'TALLAS') && !val.toUpperCase().includes('TALLA')) {
          return `Talla ${val}`;
        }
        // Mejorar legibilidad de volúmenes o unidades
        if (nameUpper === 'ML' && !val.toUpperCase().includes('ML')) {
          return `${val} ml`;
        }
        return val;
      })
      .filter(Boolean);

    if (parts.length > 0) {
      return parts.join(' / ');
    }
  }

  // 2. Extraer desde campos directos de nombre si existen
  if (v.label && typeof v.label === 'string' && v.label.trim()) return v.label.trim();
  if (v.title && typeof v.title === 'string' && v.title.trim()) return v.title.trim();
  if (v.name && typeof v.name === 'string' && v.name.trim()) return v.name.trim();
  if (v.variation_name && typeof v.variation_name === 'string' && v.variation_name.trim()) {
    return v.variation_name.trim();
  }
  if (v.description && typeof v.description === 'string' && v.description.trim()) {
    return v.description.trim();
  }

  // 3. Extraer desde attributes genéricos
  if (Array.isArray(v.attributes) && v.attributes.length > 0) {
    const parts = v.attributes
      .map((a: any) => {
        if (typeof a === 'string') return a.trim();
        return String(a?.value || a?.name || '').trim();
      })
      .filter(Boolean);
    if (parts.length > 0) return parts.join(' / ');
  }

  // 4. Fallback a SKU antes de Opción N
  if (v.sku && typeof v.sku === 'string' && v.sku.trim()) {
    return v.sku.trim();
  }

  return `Opción ${index + 1}`;
}

/**
 * Normaliza una lista completa de variaciones crudas de Dropi
 */
export function normalizeVariations(rawVariations: any[] | null | undefined): NormalizedVariation[] {
  if (!Array.isArray(rawVariations) || rawVariations.length === 0) {
    return [];
  }

  return rawVariations.map((v: any, index: number) => {
    const label = getVariationLabel(v, index);
    
    // Determinar stock real de la variación
    let stock = 0;
    if (typeof v.stock === 'number') {
      stock = v.stock;
    } else if (Array.isArray(v.warehouse_product_variation)) {
      stock = v.warehouse_product_variation.reduce((acc: number, item: any) => acc + (Number(item?.stock) || 0), 0);
    } else if (typeof v.variation_stock === 'number') {
      stock = v.variation_stock;
    }

    return {
      ...v,
      id: Number(v.id || index + 1),
      sku: v.sku ? String(v.sku) : null,
      label,
      title: label,
      name: label,
      stock,
      sale_price: v.sale_price ? Number(v.sale_price) : null,
    };
  });
}
