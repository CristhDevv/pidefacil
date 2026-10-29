/**
 * ==============================================================================
 * PideFácil - Motor Oficial de Cotización de Flete en Vivo (Dropi API v2)
 * ==============================================================================
 * Fuente Única: Dropi (/bff/orders/quote).
 * NO usa APIs públicas no autorizadas ni tarifas minoristas externas.
 *
 * Fórmula oficial de desglose:
 * - Flete = precioEnvio + seguroEnvio
 * - Comisión de plataforma Dropi = 5% × (precioVenta - Flete)
 * - Comisión Admin PideFácil = 5% × costoProducto
 * - Costo Total = costoProducto + Comisión Admin + Flete + Comisión Dropi
 * - Parte Estimada Vendedor = precioVenta - Costo Total
 */

import fs from 'fs';
import path from 'path';
import { getAppSetting } from './db';
import { findDropiCityById } from './dropi-geography';
import { extractDropiTokenFromChrome } from './chrome-token-extractor';

export interface QuoteInputCarrier {
  carrier_name: string;
  is_inter: boolean;
  precio_envio: number;
  seguro_envio: number;
  flete_total: number;
  dropi_commission: number;
  admin_fee: number;
  costo_total: number;
  parte_estimada_vendedor: number;
  available: boolean;
  error_message?: string | null;
}

export interface QuoteResult {
  ok: boolean;
  quoted_at: string;
  sale_price: number;
  product_cost: number;
  quantity: number;
  chargeable_weight_kg: number;
  inter_available: boolean;
  inter_coverage_message?: string | null;
  recommended_carrier: QuoteInputCarrier | null;
  carriers: QuoteInputCarrier[];
  origin_city: { id: number; name: string };
  destination_city: { id: number; name: string };
  raw_objects?: any[];
  error?: string;
  code?: 'MISSING_WEIGHT' | 'TOKEN_EXPIRED' | 'NO_COVERAGE' | 'API_ERROR';
}

/**
 * Calcula el peso volumétrico cobrable según estándar transportadoras:
 * pesoCobrable = max(pesoReal, (largo * ancho * alto) / 6000)
 */
export function calculateChargeableWeight(params: {
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  quantity?: number;
}): number {
  const qty = Math.max(1, params.quantity || 1);
  const realWeight = Number(params.weight_kg || 0) * qty;
  const l = Number(params.length_cm || 0);
  const w = Number(params.width_cm || 0);
  const h = Number(params.height_cm || 0);

  const volumetricWeight = (l * w * h * qty) / 6000;
  return Math.max(realWeight, volumetricWeight);
}

/**
 * Resuelve el token activo de Dropi desde archivo secreto (.secrets/dropi_token.txt),
 * configuración en BD (app_settings) o variable de entorno.
 */
export async function resolveDropiToken(): Promise<string> {
  // 1. Archivo secreto ignorado por Git (.secrets/dropi_token.txt)
  try {
    const secretPath = path.resolve('.secrets/dropi_token.txt');
    if (fs.existsSync(secretPath)) {
      const t = fs.readFileSync(secretPath, 'utf8').trim();
      if (t) return t.replace(/^["']|["']$/g, '').trim();
    }
  } catch {}

  // 2. Base de datos (app_settings)
  try {
    const dbToken = await getAppSetting('DROPI_TOKEN');
    if (dbToken && dbToken.trim()) {
      return dbToken.replace(/^["']|["']$/g, '').trim();
    }
  } catch {}

  // 3. Variable de entorno
  const envToken = process.env.DROPI_TOKEN || '';
  return envToken.replace(/^["']|["']$/g, '').trim();
}

/**
 * Cotiza flete en vivo exclusivamente contra POST https://api-v2.dropi.co/bff/orders/quote
 */
export async function quoteLiveDropiFreight(options: {
  product: {
    id_dropi: number;
    name: string;
    cost_cop: number;
    type?: string;
    weight_kg?: number | null;
    length_cm?: number | null;
    width_cm?: number | null;
    height_cm?: number | null;
    origin_city_id?: number | null;
    origin_city_name?: string | null;
    supplier_name?: string | null;
  };
  quantity: number;
  sale_price: number;
  destination_city_id: number;
  destination_city_name: string;
}): Promise<QuoteResult> {
  const now = new Date().toISOString();
  const { product, quantity, sale_price, destination_city_id, destination_city_name } = options;

  // 1. Validación estricta de peso/dimensiones reales:
  // REGLA: Si no hay datos completos (peso > 0 Y largo > 0 Y ancho > 0 Y alto > 0),
  // PROHIBIDO inventar valores por defecto (ej: 1 kg): rechazar explícitamente.
  const w = Number(product.weight_kg);
  const l = Number(product.length_cm);
  const width = Number(product.width_cm);
  const h = Number(product.height_cm);

  const hasFullRealMeasurements =
    !isNaN(w) && w > 0 &&
    !isNaN(l) && l > 0 &&
    !isNaN(width) && width > 0 &&
    !isNaN(h) && h > 0;

  if (!hasFullRealMeasurements) {
    return {
      ok: false,
      quoted_at: now,
      sale_price,
      product_cost: product.cost_cop * quantity,
      quantity,
      chargeable_weight_kg: 0,
      inter_available: false,
      recommended_carrier: null,
      carriers: [],
      origin_city: { id: 1, name: 'BOGOTA, D.C.' },
      destination_city: { id: destination_city_id, name: destination_city_name },
      error: 'Sin datos de peso o dimensiones registrados en el catálogo para este producto.',
      code: 'MISSING_WEIGHT',
    };
  }

  const chargeableWeight = calculateChargeableWeight({
    weight_kg: w,
    length_cm: l,
    width_cm: width,
    height_cm: h,
    quantity,
  });

  // 2. Ciudad remitente por proveedor (NO Popayán por defecto)
  const originCityId = product.origin_city_id || 1; // Default Bogotá si no se especifica, pero configurable por proveedor
  const originCityName = product.origin_city_name || 'BOGOTA, D.C.';

  let token = await resolveDropiToken();
  if (!token) {
    const extracted = extractDropiTokenFromChrome();
    if (extracted) token = extracted;
  }

  if (!token) {
    return {
      ok: false,
      quoted_at: now,
      sale_price,
      product_cost: product.cost_cop * quantity,
      quantity,
      chargeable_weight_kg: chargeableWeight,
      inter_available: false,
      recommended_carrier: null,
      carriers: [],
      origin_city: { id: originCityId, name: originCityName },
      destination_city: { id: destination_city_id, name: destination_city_name },
      error: 'Cotización en vivo no disponible: token de Dropi no configurado. Contacte al administrador.',
      code: 'TOKEN_EXPIRED',
    };
  }

  // 3. Preparar payload oficial Dropi
  const lExact = Math.max(1, Math.round(l));
  const wExact = Math.max(1, Math.round(width));
  const hExact = Math.max(1, Math.round(h));
  const pesoFinal = Math.max(0.1, Number(chargeableWeight.toFixed(2)));

  const payload = {
    peso: pesoFinal,
    largo: lExact,
    ancho: wExact,
    alto: hExact,
    ciudad_remitente: { id: originCityId, name: originCityName },
    ciudad_destino: { id: destination_city_id, name: destination_city_name },
    EnvioConCobro: true,
    ValorDeclarado: sale_price,
    amount: sale_price,
    products: [
      {
        id: product.id_dropi,
        name: product.name,
        price: sale_price,
        quantity,
        type: product.type || 'SIMPLE',
      },
    ],
  };

  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    let dropiRes = await fetch('https://api-v2.dropi.co/bff/orders/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${token}`,
        'X-Host': 'co',
        'Origin': 'https://app.dropi.co',
      },
      body: JSON.stringify(payload),
    });

    if (dropiRes.status === 401 || dropiRes.status === 403) {
      // Auto-heal: intentar recuperar token fresco de Chrome si el actual expiró
      const freshToken = extractDropiTokenFromChrome();
      if (freshToken && freshToken !== token) {
        token = freshToken;
        dropiRes = await fetch('https://api-v2.dropi.co/bff/orders/quote', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Authorization': `Bearer ${token}`,
            'X-Host': 'co',
            'Origin': 'https://app.dropi.co',
          },
          body: JSON.stringify(payload),
        });
      }
    }

    if (dropiRes.status === 401 || dropiRes.status === 403) {
      return {
        ok: false,
        quoted_at: now,
        sale_price,
        product_cost: product.cost_cop * quantity,
        quantity,
        chargeable_weight_kg: pesoFinal,
        inter_available: false,
        recommended_carrier: null,
        carriers: [],
        origin_city: { id: originCityId, name: originCityName },
        destination_city: { id: destination_city_id, name: destination_city_name },
        error: 'Cotización en vivo no disponible: token de Dropi expirado o inválido.',
        code: 'TOKEN_EXPIRED',
      };
    }

    const json = await dropiRes.json();
    const rawObjects: any[] = json.data?.objects || json.objects || [];

    if (!Array.isArray(rawObjects) || rawObjects.length === 0) {
      return {
        ok: false,
        quoted_at: now,
        sale_price,
        product_cost: product.cost_cop * quantity,
        quantity,
        chargeable_weight_kg: pesoFinal,
        inter_available: false,
        recommended_carrier: null,
        carriers: [],
        origin_city: { id: originCityId, name: originCityName },
        destination_city: { id: destination_city_id, name: destination_city_name },
        error: 'Dropi no devolvió transportadoras disponibles para este trayecto.',
        code: 'NO_COVERAGE',
      };
    }

    const carriers: QuoteInputCarrier[] = [];
    const costProductTotal = product.cost_cop * quantity;
    const adminFee = Math.round(costProductTotal * 0.05);

    for (const obj of rawObjects) {
      const carrierName = (
        obj.distributionCompany?.name ||
        obj.distribution_company?.name ||
        obj.transportadora ||
        obj.name ||
        'TRANSPORTADORA'
      ).toUpperCase();

      const hasError = Boolean(obj.error && String(obj.error).trim() !== '');
      const innerObj = obj.objects && typeof obj.objects === 'object' ? obj.objects : {};
      const precioEnvio = Number(
        innerObj.precioEnvio ?? innerObj.precio_envio ?? obj.precioEnvio ?? obj.precio_envio ?? obj.shipping_price ?? 0
      );
      const seguroEnvio = Number(
        innerObj.seguroEnvio ?? innerObj.seguro_envio ?? obj.seguroEnvio ?? obj.seguro_envio ?? obj.insurance_price ?? 0
      );
      const fleteTotal = precioEnvio + seguroEnvio;

      // Comisión de plataforma Dropi: Tomada de la respuesta si está disponible;
      // si no: 5% × (precio de venta - flete)
      const dropiCommissionFromApi = Number(obj.comision_dropi ?? obj.dropiCommission ?? 0);
      const dropiCommission =
        dropiCommissionFromApi > 0
          ? dropiCommissionFromApi
          : Math.max(0, Math.round(0.05 * (sale_price - fleteTotal)));

      const costoTotal = costProductTotal + adminFee + fleteTotal + dropiCommission;
      const parteEstimadaVendedor = sale_price - costoTotal;

      const isInter = carrierName.includes('INTER');

      carriers.push({
        carrier_name: carrierName,
        is_inter: isInter,
        precio_envio: precioEnvio,
        seguro_envio: seguroEnvio,
        flete_total: fleteTotal,
        dropi_commission: dropiCommission,
        admin_fee: adminFee,
        costo_total: costoTotal,
        parte_estimada_vendedor: parteEstimadaVendedor,
        available: !hasError && fleteTotal > 0,
        error_message: hasError ? String(obj.error) : null,
      });
    }

    // Filtrar y destacar INTER RAPIDISIMO
    const interCarrier = carriers.find((c) => c.is_inter && c.available);
    const availableCarriers = carriers.filter((c) => c.available);

    let recommendedCarrier: QuoteInputCarrier | null = null;
    let interAvailable = false;
    let interCoverageMessage: string | null = null;

    if (interCarrier) {
      recommendedCarrier = interCarrier;
      interAvailable = true;
    } else if (availableCarriers.length > 0) {
      // Si Inter no cubre ese destino, mostrar la disponible y decir que Inter no cubre ese destino
      recommendedCarrier = availableCarriers[0];
      interAvailable = false;
      interCoverageMessage = 'Inter Rapidísimo no cubre este destino (se muestra la transportadora disponible).';
    } else {
      interAvailable = false;
      interCoverageMessage = 'Ninguna transportadora cubre este trayecto.';
    }

    return {
      ok: availableCarriers.length > 0,
      quoted_at: now,
      sale_price,
      product_cost: costProductTotal,
      quantity,
      chargeable_weight_kg: pesoFinal,
      inter_available: interAvailable,
      inter_coverage_message: interCoverageMessage,
      recommended_carrier: recommendedCarrier,
      carriers,
      origin_city: { id: originCityId, name: originCityName },
      destination_city: { id: destination_city_id, name: destination_city_name },
      raw_objects: rawObjects,
    };
  } catch (err: any) {
    console.error('Error llamando /bff/orders/quote Dropi:', err);
    return {
      ok: false,
      quoted_at: now,
      sale_price,
      product_cost: product.cost_cop * quantity,
      quantity,
      chargeable_weight_kg: pesoFinal,
      inter_available: false,
      recommended_carrier: null,
      carriers: [],
      origin_city: { id: originCityId, name: originCityName },
      destination_city: { id: destination_city_id, name: destination_city_name },
      error: `Error de conexión con Dropi: ${err.message}`,
      code: 'API_ERROR',
    };
  }
}
