import { NextRequest, NextResponse } from 'next/server';
import { updateCodOrderStatus } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }
  try {
    const { id } = await params;
    const orderId = parseInt(id, 10);
    const body = await request.json();
    const { status, dropi_order_id, notes } = body;

    const allowedStatuses = [
      'pendiente_despacho',
      'subido_a_dropi',
      'en_transito',
      'entregado',
      'novedad',
      'cancelado',
    ];

    if (!allowedStatuses.includes(status)) {
      return NextResponse.json(
        { success: false, error: 'Estado de pedido no válido' },
        { status: 400 }
      );
    }

    const updated = await updateCodOrderStatus(orderId, {
      status,
      dropi_order_id,
      notes,
    });

    if (!updated) {
      return NextResponse.json(
        { success: false, error: 'Pedido no encontrado' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Estado de orden actualizado con éxito',
    });
  } catch (error: any) {
    console.error('Error updating order status:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno del servidor al actualizar pedido' },
      { status: 500 }
    );
  }
}
