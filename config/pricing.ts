/**
 * ==============================================================================
 * PideFácil - Módulo Centralizado de Precios y Configuración Comercial
 * ==============================================================================
 * Prohibido quemar fórmulas de precios en código disperso. Toda lógica comercial
 * y regla matemática de redondeo psicológico hacia arriba a 9.900 reside aquí.
 */

export interface PricingConfig {
  marginBaseCop: number;
  priceEndingTarget: number;
  duoPackDiscountPercent: number;
}

export interface PricingResult {
  cost_cop: number;
  margin_cop: number;
  base_cop: number;
  sell_price_cop: number;
  duo_price_cop: number;
  savings_duo_cop: number;
  is_active: boolean;
  needs_review: boolean;
  deactivation_reason?: string;
}

/**
 * Obtiene la configuración comercial activa leyendo variables de entorno
 * con validaciones y fallbacks seguros.
 */
export function getPricingConfig(): PricingConfig {
  const envMargin = parseInt(process.env.MARGIN_BASE_COP || '', 10);
  const marginBaseCop = !isNaN(envMargin) && envMargin >= 10000 ? envMargin : 55000;

  const envEnding = parseInt(process.env.PRICE_ENDING_TARGET || '', 10);
  const priceEndingTarget = !isNaN(envEnding) ? envEnding : 9900;

  const envDuoDiscount = parseInt(process.env.DUO_PACK_DISCOUNT_PERCENT || '', 10);
  const duoPackDiscountPercent = !isNaN(envDuoDiscount) && envDuoDiscount >= 0 && envDuoDiscount <= 90
    ? envDuoDiscount
    : 25;

  return {
    marginBaseCop,
    priceEndingTarget,
    duoPackDiscountPercent,
  };
}

/**
 * Regla Matemática de Redondeo Hacia Arriba a 9.900
 *
 * Fórmula estricta:
 *   sell_price_cop = Math.ceil((Base + 100) / 10000) * 10000 - 100
 *
 * Casos de prueba certificados:
 *   - Base = 51.000 -> 59.900
 *   - Base = 59.900 -> 59.900
 *   - Base = 60.000 -> 69.900
 */
export function roundUpTo9900(base: number): number {
  if (base <= 0 || isNaN(base)) {
    return 0;
  }
  return Math.ceil((base + 100) / 10000) * 10000 - 100;
}

/**
 * Calcula el precio para Combo x2 (Más Elegido):
 * Regla de negocio oficial PideFácil:
 * La segunda unidad suma ÚNICAMENTE el valor del costo del producto (cost_cop),
 * redondeando el total hacia arriba con terminación en 9.900.
 *
 * Fórmula:
 *   rawDuoTotal = singleSellPriceCop + unitCost
 *   duoPriceCop = roundUpTo9900(rawDuoTotal)
 *   savingsCop = (singleSellPriceCop * 2) - duoPriceCop
 */
export function calculateDuoPrice(
  singleSellPriceCop: number,
  costCopOrPercent?: number
): { duoPriceCop: number; savingsCop: number } {
  if (singleSellPriceCop <= 0) {
    return { duoPriceCop: 0, savingsCop: 0 };
  }

  const regularTotal = singleSellPriceCop * 2;

  let unitCost: number;

  if (typeof costCopOrPercent === 'number' && costCopOrPercent >= 1000) {
    // Es el costo real del producto en COP
    unitCost = Math.round(costCopOrPercent);
  } else if (typeof costCopOrPercent === 'number' && costCopOrPercent > 0 && costCopOrPercent <= 90) {
    // Si llegara un porcentaje legacy (ej. 25), calculamos costo proporcional
    unitCost = singleSellPriceCop * (1 - costCopOrPercent / 100);
  } else {
    // Fallback: estimación segura de costo descontando margen base
    unitCost = Math.max(10000, singleSellPriceCop - 55000);
  }

  // Unidad 1 (con margen completo) + Unidad 2 (sumando únicamente el valor de costo)
  const rawDuoTotal = singleSellPriceCop + unitCost;

  // Redondeo hacia arriba a 9.900
  const duoPriceCop = roundUpTo9900(rawDuoTotal);
  const savingsCop = Math.max(0, regularTotal - duoPriceCop);

  return { duoPriceCop, savingsCop };
}

/**
 * Módulo Principal de Evaluación Comercial y Precios
 *
 * @param salePrice Costo del producto reportado por Dropi (sale_price en API Dropi)
 * @param customMargin Margen opcional si se requiere sobreescribir el configurado
 * @param stockReal Stock real para validar estado de activación
 */
export function calculatePricing(
  salePrice: number | null | undefined,
  customMargin?: number,
  stockReal?: number
): PricingResult {
  const config = getPricingConfig();
  const effectiveMargin = typeof customMargin === 'number' && customMargin > 0
    ? customMargin
    : config.marginBaseCop;

  // Regla de Seguridad de Precio Cero / Negativo / Nulo
  // "Si sale_price viene en 0, null o negativo desde la API, jamás publiques ni
  // calcules precio: marca el producto con is_active = false y needs_review = true."
  if (
    salePrice === null ||
    salePrice === undefined ||
    isNaN(salePrice) ||
    salePrice <= 0
  ) {
    return {
      cost_cop: 0,
      margin_cop: effectiveMargin,
      base_cop: 0,
      sell_price_cop: 0,
      duo_price_cop: 0,
      savings_duo_cop: 0,
      is_active: false,
      needs_review: true,
      deactivation_reason: 'precio_invalido',
    };
  }

  const costCop = Math.round(salePrice);
  const baseCop = costCop + effectiveMargin;
  const sellPriceCop = roundUpTo9900(baseCop);

  const { duoPriceCop, savingsCop } = calculateDuoPrice(
    sellPriceCop,
    costCop
  );

  // Regla de Cordura de Precio:
  // "Todo producto con costo < $5.000 queda needs_review = 1, is_active = 0,
  // motivo precio_sospechoso, hasta verificación manual. Son listings basura
  // del proveedor (precio marcador), no ofertas reales."
  if (costCop < 5000) {
    return {
      cost_cop: costCop,
      margin_cop: effectiveMargin,
      base_cop: baseCop,
      sell_price_cop: sellPriceCop,
      duo_price_cop: duoPriceCop,
      savings_duo_cop: savingsCop,
      is_active: false,
      needs_review: true,
      deactivation_reason: 'precio_sospechoso',
    };
  }

  // Regla de Stock y Activación
  // "is_active: stock_real > 0 Y cost_cop >= 5000 Y no retirado del catálogo"
  const hasStock = stockReal === undefined || stockReal > 0;
  const isActive = hasStock && costCop >= 5000;

  return {
    cost_cop: costCop,
    margin_cop: effectiveMargin,
    base_cop: baseCop,
    sell_price_cop: sellPriceCop,
    duo_price_cop: duoPriceCop,
    savings_duo_cop: savingsCop,
    is_active: isActive,
    needs_review: false,
    deactivation_reason: !hasStock ? 'sin_stock' : undefined,
  };
}

/**
 * Formatea valores numéricos al estándar visual de Pesos Colombianos
 * Ejemplo: 59900 -> "$59.900"
 */
export function formatCOP(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '$0';
  }
  return '$' + Math.round(amount).toLocaleString('es-CO');
}
