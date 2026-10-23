import { NextRequest, NextResponse } from 'next/server';
import { getProductById } from '@/lib/db';
import { calculateDuoPrice } from '@/config/pricing';

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

    const duo = calculateDuoPrice(p.sell_price_cop, 25);
    const gallery = p.gallery ? JSON.parse(p.gallery) : p.image_url ? [p.image_url] : [];
    const variations = p.stock_por_variacion ? JSON.parse(p.stock_por_variacion) : [];

    return NextResponse.json({
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
        stock_real: p.stock_real,
        supplier_id: p.supplier_id,
        supplier_name: p.supplier_name,
        supplier_badge: p.supplier_badge,
        image_url: p.image_url,
        gallery,
        variations,
        description: p.description,
        is_active: Boolean(p.is_active),
      },
    });
  } catch (error: any) {
    console.error('Error fetching product by id:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar el producto' },
      { status: 500 }
    );
  }
}
