import { NextRequest, NextResponse } from 'next/server';
import { getAdminProducts, updateProductAdmin } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';
    const status = (searchParams.get('status') as any) || 'todos';
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '25', 10);
    const offset = Math.max(0, (page - 1) * limit);

    const { products, total } = await getAdminProducts({
      search,
      status,
      limit,
      offset,
    });

    return NextResponse.json({
      success: true,
      data: products,
      pagination: {
        page,
        limit,
        total,
      },
    });
  } catch (error: any) {
    console.error('Error in admin products GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar productos' },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id_dropi, is_active, display_priority, sell_price_cop } = body;

    if (!id_dropi) {
      return NextResponse.json(
        { success: false, error: 'ID Dropi es obligatorio' },
        { status: 400 }
      );
    }

    const updated = await updateProductAdmin(Number(id_dropi), {
      is_active,
      display_priority,
      sell_price_cop,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'No se pudo actualizar el producto' },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Producto actualizado con éxito',
    });
  } catch (error: any) {
    console.error('Error in admin products PATCH:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar producto' },
      { status: 500 }
    );
  }
}
