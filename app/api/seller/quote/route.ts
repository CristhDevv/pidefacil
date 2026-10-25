import { NextRequest, NextResponse } from 'next/server';
import { getSellerFromRequest } from '@/lib/seller-auth';
import { isAdminAuthenticated } from '@/lib/auth';
import { getProductById } from '@/lib/db';
import { quoteLiveDropiFreight } from '@/lib/dropi-quote';
import { findDropiCityById } from '@/lib/dropi-geography';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  // 1. Autorización: solo vendedor aprobado o administrador
  const adminAuth = isAdminAuthenticated(request);
  let seller = null;
  if (!adminAuth) {
    seller = await getSellerFromRequest(request);
    if (!seller) {
      return NextResponse.json(
        { success: false, error: 'No autorizado. Inicie sesión como vendedor.' },
        { status: 401, headers: { 'Cache-Control': 'no-store' } }
      );
    }
    if (seller.status !== 'approved') {
      return NextResponse.json(
        {
          success: false,
          error:
            seller.status === 'pending'
              ? 'Tu cuenta de vendedor está en proceso de aprobación por el administrador.'
              : 'Tu cuenta de vendedor no tiene permisos activos.',
          code: 'SELLER_NOT_APPROVED',
        },
        { status: 403, headers: { 'Cache-Control': 'no-store' } }
      );
    }
  }

  try {
    const body = await request.json();
    const { product_id, quantity, sale_price, destination_city_id } = body;

    const numericProductId = Number(product_id);
    const numericQty = Math.max(1, parseInt(quantity || '1', 10));
    const numericSalePrice = Number(sale_price);
    const numericCityId = Number(destination_city_id);

    if (!numericProductId || !numericCityId || !numericSalePrice || numericSalePrice <= 0) {
      return NextResponse.json(
        {
          success: false,
          error: 'Parámetros incompletos: product_id, destination_city_id y sale_price son requeridos.',
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 2. Consultar producto en base de datos
    const product = await getProductById(numericProductId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: `Producto #${numericProductId} no encontrado en el catálogo.` },
        { status: 404, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    // 3. Resolver nombre oficial de la ciudad de destino
    const destCity = findDropiCityById(numericCityId);
    const destCityName = destCity ? destCity.name : body.destination_city_name || 'BOGOTA, D.C.';

    // 4. Ejecutar cotización en vivo con Dropi API v2
    const quote = await quoteLiveDropiFreight({
      product: {
        id_dropi: product.id_dropi,
        name: product.name,
        cost_cop: product.cost_cop,
        weight_kg: product.weight_kg ?? (product as any).weight_kg,
        length_cm: product.length_cm ?? (product as any).length_cm,
        width_cm: product.width_cm ?? (product as any).width_cm,
        height_cm: product.height_cm ?? (product as any).height_cm,
        origin_city_id: product.origin_city_id ?? (product as any).origin_city_id,
        origin_city_name: product.origin_city_name ?? (product as any).origin_city_name,
        supplier_name: product.supplier_name,
      },
      quantity: numericQty,
      sale_price: numericSalePrice,
      destination_city_id: numericCityId,
      destination_city_name: destCityName,
    });

    if (!quote.ok) {
      return NextResponse.json(
        {
          success: false,
          error: quote.error || 'Error al cotizar flete en Dropi.',
          code: quote.code || 'API_ERROR',
          chargeable_weight_kg: quote.chargeable_weight_kg,
          quoted_at: quote.quoted_at,
        },
        { status: 400, headers: { 'Cache-Control': 'no-store' } }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: quote,
      },
      {
        status: 200,
        headers: {
          'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0',
        },
      }
    );
  } catch (error: any) {
    console.error('Error in /api/seller/quote:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error interno al procesar cotización.' },
      { status: 500, headers: { 'Cache-Control': 'no-store' } }
    );
  }
}
