import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/db';
import { calculateDuoPrice } from '@/config/pricing';
import { normalizeVariations } from '@/lib/variations';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const dropiId = parseInt(id, 10);
    if (isNaN(dropiId)) {
      return NextResponse.json(
        { success: false, error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    const p = await getProductById(dropiId);
    if (!p) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado' },
        { status: 404 }
      );
    }

    const duo = calculateDuoPrice(p.sell_price_cop, p.cost_cop);
    const gallery = p.gallery ? JSON.parse(p.gallery) : p.image_url ? [p.image_url] : [];
    const rawVariations = p.stock_por_variacion ? JSON.parse(p.stock_por_variacion) : [];
    const variations = normalizeVariations(rawVariations, p.cost_cop, p.sell_price_cop);

    // Determinar rango de precios si hay variación entre variantes
    const variationPrices = variations.map((v) => v.sell_price_cop).filter((pr) => pr > 0);
    const minPrice = variationPrices.length > 0 ? Math.min(...variationPrices) : p.sell_price_cop;
    const maxPrice = variationPrices.length > 0 ? Math.max(...variationPrices) : p.sell_price_cop;
    const hasPriceVariance = minPrice !== maxPrice;

    // Validación unificada de medidas reales para cotización
    const w = Number(p.weight_kg);
    const l = Number(p.length_cm);
    const wd = Number(p.width_cm);
    const h = Number(p.height_cm);
    const has_real_measures = !isNaN(w) && w > 0 && !isNaN(l) && l > 0 && !isNaN(wd) && wd > 0 && !isNaN(h) && h > 0;

    return NextResponse.json(
      {
        success: true,
        data: {
          id_dropi: p.id_dropi,
          sku: p.sku,
          name: p.name,
          type: p.type,
          cost_cop: p.cost_cop,
          suggested_price_cop: p.suggested_price_cop,
          sell_price_cop: p.sell_price_cop,
          duo_price_cop: duo.duoPriceCop,
          duo_savings_cop: duo.savingsCop,
          min_price_cop: minPrice,
          max_price_cop: maxPrice,
          has_price_variance: hasPriceVariance,
          stock_real: p.stock_real,
          supplier_id: p.supplier_id,
          supplier_name: p.supplier_name,
          supplier_badge: p.supplier_badge,
          image_url: p.image_url,
          crop_top_pct: p.crop_top_pct || 0,
          crop_bottom_pct: p.crop_bottom_pct || 0,
          gallery,
          variations,
          description: p.description,
          is_active: Boolean(p.is_active),
          weight_kg: !isNaN(w) && w > 0 ? w : null,
          length_cm: !isNaN(l) && l > 0 ? l : null,
          width_cm: !isNaN(wd) && wd > 0 ? wd : null,
          height_cm: !isNaN(h) && h > 0 ? h : null,
          origin_city_id: p.origin_city_id ? Number(p.origin_city_id) : null,
          origin_city_name: p.origin_city_name || null,
          has_real_measures,
        },
      },
      {
        headers: {
          'Cache-Control': 'public, s-maxage=5, stale-while-revalidate=15',
        },
      }
    );
  } catch (error: any) {
    console.error('Error fetching product by id:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar el producto' },
      { status: 500 }
    );
  }
}
