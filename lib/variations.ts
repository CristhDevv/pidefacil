/**
 * ==============================================================================
 * PideFácil - Normalizador Universal de Variaciones de Producto
 * ==============================================================================
 * Extrae y formatea nombres legibles (Color, Talla, Presentación) desde
 * las estructuras de atributos de Dropi API para todo el sistema,
 * y calcula dinámicamente precios, costos y márgenes individuales por variante.
 */

import { calculatePricing, calculateDuoPrice } from '@/config/pricing';

export interface NormalizedVariation {
  id: number;
  sku: string | null;
  label: string;
  title: string;
  name: string;
  stock: number;
  sale_price: number | null;
  cost_cop: number;
  sell_price_cop: number;
  duo_price_cop: number;
  duo_savings_cop: number;
  has_custom_price: boolean;
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
 * Normaliza una lista completa de variaciones crudas de Dropi,
 * calculando para CADA VARIANTE su propio costo Dropi, PVP sugerido y precio Combo 2x.
 */
export function normalizeVariations(
  rawVariations: any[] | null | undefined,
  parentCostCop: number = 0,
  parentSellPriceCop: number = 0
): NormalizedVariation[] {
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

    // Costo Dropi específico de esta variante
    const rawCost = Number(v.sale_price);
    const hasCustomSalePrice = !isNaN(rawCost) && rawCost > 0;
    const cost_cop = hasCustomSalePrice ? Math.round(rawCost) : parentCostCop;

    // Calcular precio de venta al público (PVP) y Combo 2x para esta variante
    let sell_price_cop = parentSellPriceCop;
    let duo_price_cop = 0;
    let duo_savings_cop = 0;

    if (cost_cop > 0) {
      const pricing = calculatePricing(cost_cop);
      sell_price_cop = pricing.sell_price_cop;
      const duo = calculateDuoPrice(pricing.sell_price_cop, cost_cop);
      duo_price_cop = duo.duoPriceCop;
      duo_savings_cop = duo.savingsCop;
    } else if (parentSellPriceCop > 0) {
      const duo = calculateDuoPrice(parentSellPriceCop, parentCostCop);
      duo_price_cop = duo.duoPriceCop;
      duo_savings_cop = duo.savingsCop;
    }

    const has_custom_price = hasCustomSalePrice && parentSellPriceCop > 0 && sell_price_cop !== parentSellPriceCop;

    return {
      ...v,
      id: Number(v.id || index + 1),
      sku: v.sku ? String(v.sku) : null,
      label,
      title: label,
      name: label,
      stock,
      sale_price: hasCustomSalePrice ? rawCost : null,
      cost_cop,
      sell_price_cop,
      duo_price_cop,
      duo_savings_cop,
      has_custom_price,
    };
  });
}

/**
 * Analiza si un conjunto de variaciones tiene variación de precios
 */
export function getVariationsPriceStats(variations: NormalizedVariation[]) {
  if (!variations || variations.length <= 1) {
    return {
      has_price_variance: false,
      min_price: variations?.[0]?.sell_price_cop || 0,
      max_price: variations?.[0]?.sell_price_cop || 0,
    };
  }

  const prices = variations.map((v) => v.sell_price_cop).filter((p) => p > 0);
  if (prices.length === 0) {
    return { has_price_variance: false, min_price: 0, max_price: 0 };
  }

  const min_price = Math.min(...prices);
  const max_price = Math.max(...prices);

  return {
    has_price_variance: min_price !== max_price,
    min_price,
    max_price,
  };
}
