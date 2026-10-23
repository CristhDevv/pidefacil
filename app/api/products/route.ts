import { NextRequest, NextResponse } from 'next/server';
import { getActiveProducts } from '@/lib/db';
import { calculatePricing, calculateDuoPrice } from '@/config/pricing';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('q') || searchParams.get('search') || '';
    const category = searchParams.get('category') || '';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = Math.min(parseInt(searchParams.get('limit') || '40', 10), 100);
    const offset = Math.max(0, (page - 1) * limit);

    const { products, total } = await getActiveProducts({
      search,
      category,
      limit,
      offset,
    });

    // Enriquecer con cálculo de Dúo Pack en tiempo de respuesta
    const enriched = products.map((p) => {
      const duo = calculateDuoPrice(p.sell_price_cop, 25);
      return {
        id_dropi: p.id_dropi,
        sku: p.sku,
        name: p.name,
        type: p.type,
        cost_cop: p.cost_cop,
        suggested_price_cop: p.suggested_price_cop,
        sell_price_cop: p.sell_price_cop,
        duo_price_cop: duo.duoPriceCop,
        duo_savings_cop: duo.savingsCop,
        stock_real: p.stock_real,
        supplier_name: p.supplier_name,
        image_url: p.image_url,
        categories: p.categories ? JSON.parse(p.categories) : [],
      };
    });

    return NextResponse.json({
      success: true,
      data: enriched,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('Error fetching products:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar productos' },
      { status: 500 }
    );
  }
}
