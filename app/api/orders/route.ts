import { NextRequest, NextResponse } from 'next/server';
import { createCodOrder, getCodOrders, getProductById } from '@/lib/db';
import { calculateDuoPrice } from '@/config/pricing';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      customer_name,
      customer_phone,
      department,
      city,
      neighborhood,
      address,
      reference_point,
      confirmed_cash,
      product_id,
      quantity_type,
      selected_variation,
      notes,
    } = body;

    // 1. Validaciones estrictas Mobile-First para Colombia
    if (!customer_name || typeof customer_name !== 'string' || customer_name.trim().length < 3) {
      return NextResponse.json(
        { success: false, error: 'Por favor ingresa tu Nombre y Apellido completo.' },
        { status: 400 }
      );
    }

    // Validación Celular Colombia (10 dígitos que inicien en 3)
    const cleanPhone = String(customer_phone || '').replace(/\D/g, '');
    if (!/^3\d{9}$/.test(cleanPhone)) {
      return NextResponse.json(
        {
          success: false,
          error: 'El celular debe tener 10 dígitos y comenzar por 3 (Ejemplo: 3001234567).',
        },
        { status: 400 }
      );
    }

    if (!department || !department.trim()) {
      return NextResponse.json(
        { success: false, error: 'Selecciona el Departamento de entrega.' },
        { status: 400 }
      );
    }

    if (!city || !city.trim()) {
      return NextResponse.json(
        { success: false, error: 'Selecciona la Ciudad o Municipio de entrega.' },
        { status: 400 }
      );
    }

    if (!neighborhood || typeof neighborhood !== 'string' || neighborhood.trim().length < 2) {
      return NextResponse.json(
        {
          success: false,
          error: 'El Barrio es obligatorio para que el transportador no devuelva el paquete.',
        },
        { status: 400 }
      );
    }

    if (!address || typeof address !== 'string' || address.trim().length < 5) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ingresa la dirección exacta (Calle / Carrera, número, casa / apartamento).',
        },
        { status: 400 }
      );
    }

    if (!reference_point || typeof reference_point !== 'string' || reference_point.trim().length < 3) {
      return NextResponse.json(
        {
          success: false,
          error: 'Ingresa un punto de referencia cercano (ej: Frente a tienda, casa esquinera).',
        },
        { status: 400 }
      );
    }

    if (!confirmed_cash) {
      return NextResponse.json(
        {
          success: false,
          error: 'Debes confirmar que habrá alguien en casa para recibir y pagar en efectivo al transportador.',
        },
        { status: 400 }
      );
    }

    // 2. Comprobar producto y calcular total exacto
    const product = await getProductById(Number(product_id));
    if (!product || !product.is_active) {
      return NextResponse.json(
        { success: false, error: 'El producto seleccionado no está disponible o se agotó.' },
        { status: 400 }
      );
    }

    const qtyMode: '1x' | '2x' = quantity_type === '2x' ? '2x' : '1x';
    let totalCop = product.sell_price_cop;

    if (qtyMode === '2x') {
      const duo = calculateDuoPrice(product.sell_price_cop, product.cost_cop);
      totalCop = duo.duoPriceCop;
    }

    // 3. Generar número de orden interno único PF-XXXXXX
    const randomHex = Math.random().toString(36).substring(2, 7).toUpperCase();
    const orderNumber = `PF-${randomHex}`;

    const itemsJson = JSON.stringify([
      {
        id_dropi: product.id_dropi,
        name: product.name,
        image_url: product.image_url,
        quantity: qtyMode === '2x' ? 2 : 1,
        unit_price: product.sell_price_cop,
        total_price: totalCop,
        variation: selected_variation || null,
        supplier_id: product.supplier_id,
        supplier_name: product.supplier_name,
      },
    ]);

    // 4. Guardar pedido en base de datos
    const created = await createCodOrder({
      order_number: orderNumber,
      customer_name: customer_name.trim(),
      customer_phone: cleanPhone,
      department: department.trim(),
      city: city.trim(),
      neighborhood: neighborhood.trim(),
      address: address.trim(),
      reference_point: reference_point.trim(),
      items: itemsJson,
      quantity_type: qtyMode,
      total_cop: totalCop,
      status: 'pendiente_despacho',
      notes: notes ? String(notes).trim() : null,
    });

    return NextResponse.json({
      success: true,
      data: {
        id: created.id,
        order_number: created.order_number,
        customer_name: created.customer_name,
        customer_phone: created.customer_phone,
        department: created.department,
        city: created.city,
        neighborhood: created.neighborhood,
        address: created.address,
        reference_point: created.reference_point,
        total_cop: created.total_cop,
        quantity_type: created.quantity_type,
        status: created.status,
        created_at: created.created_at,
      },
    });
  } catch (error: any) {
    console.error('Error creating COD order:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno al registrar el pedido' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const status = searchParams.get('status') || undefined;
    const orders = await getCodOrders(status);

    return NextResponse.json({
      success: true,
      data: orders.map((o) => ({
        ...o,
        items: JSON.parse(o.items || '[]'),
      })),
    });
  } catch (error: any) {
    console.error('Error listing orders:', error);
    return NextResponse.json(
      { success: false, error: 'Error al listar pedidos' },
      { status: 500 }
    );
  }
}
