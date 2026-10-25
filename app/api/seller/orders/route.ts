import { NextRequest, NextResponse } from 'next/server';
import { getSellerFromRequest } from '@/lib/seller-auth';
import { getSqliteDb } from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');

  // 1. Supabase
  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin
        .from('seller_orders')
        .select('*')
        .eq('seller_id', seller.id)
        .order('created_at', { ascending: false });

      if (status && status !== 'todos') {
        query = query.eq('status', status);
      }

      const { data, error } = await query;
      if (!error && data) {
        return NextResponse.json({ success: true, data });
      }
    } catch {}
  }

  // 2. Fallback SQLite
  try {
    const db = getSqliteDb();
    let rows: any[];
    if (status && status !== 'todos') {
      rows = db
        .prepare('SELECT * FROM seller_orders WHERE seller_id = ? AND status = ? ORDER BY id DESC')
        .all(seller.id, status);
    } else {
      rows = db
        .prepare('SELECT * FROM seller_orders WHERE seller_id = ? ORDER BY id DESC')
        .all(seller.id);
    }

    const parsed = rows.map((r: any) => ({
      ...r,
      quote_snapshot: r.quote_snapshot ? JSON.parse(r.quote_snapshot) : null,
    }));

    return NextResponse.json({ success: true, data: parsed });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  if (seller.status !== 'approved') {
    return NextResponse.json(
      { success: false, error: 'Solo vendedores aprobados pueden crear pedidos.' },
      { status: 403 }
    );
  }

  try {
    const body = await request.json();
    const {
      customer_name,
      customer_phone,
      department,
      city_id,
      city_name,
      address,
      neighborhood,
      reference_point,
      product_id,
      product_name,
      quantity,
      supplier_name,
      origin_city_id,
      origin_city_name,
      carrier_name,
      sale_price_cop,
      product_cost_cop,
      admin_fee_cop,
      flete_precio_envio,
      flete_seguro_envio,
      flete_total_cop,
      dropi_commission_cop,
      total_cost_cop,
      estimated_seller_profit_cop,
      quote_snapshot,
      notes,
    } = body;

    if (
      !customer_name ||
      !customer_phone ||
      !department ||
      !city_id ||
      !city_name ||
      !address ||
      !product_id ||
      !carrier_name ||
      !sale_price_cop
    ) {
      return NextResponse.json(
        { success: false, error: 'Faltan campos obligatorios para el despacho del pedido.' },
        { status: 400 }
      );
    }

    const now = new Date().toISOString();
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    const orderNumber = `PF-V-${Date.now().toString().slice(-4)}${randomSuffix}`;

    const quoteSnapshotStr =
      typeof quote_snapshot === 'object' ? JSON.stringify(quote_snapshot) : quote_snapshot || null;

    let createdId: number | null = null;

    // 1. Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('seller_orders')
          .insert({
            order_number: orderNumber,
            seller_id: seller.id,
            seller_name: seller.name,
            seller_phone: seller.phone,
            customer_name: customer_name.trim(),
            customer_phone: customer_phone.trim(),
            department: department.trim(),
            city_id: Number(city_id),
            city_name: city_name.trim(),
            address: address.trim(),
            neighborhood: neighborhood ? neighborhood.trim() : null,
            reference_point: reference_point ? reference_point.trim() : null,
            product_id: Number(product_id),
            product_name: product_name.trim(),
            quantity: Math.max(1, Number(quantity || 1)),
            supplier_name: supplier_name ? supplier_name.trim() : null,
            origin_city_id: origin_city_id ? Number(origin_city_id) : null,
            origin_city_name: origin_city_name ? origin_city_name.trim() : null,
            carrier_name: carrier_name.trim().toUpperCase(),
            sale_price_cop: Number(sale_price_cop),
            product_cost_cop: Number(product_cost_cop || 0),
            admin_fee_cop: Number(admin_fee_cop || 0),
            flete_precio_envio: Number(flete_precio_envio || 0),
            flete_seguro_envio: Number(flete_seguro_envio || 0),
            flete_total_cop: Number(flete_total_cop || 0),
            dropi_commission_cop: Number(dropi_commission_cop || 0),
            total_cost_cop: Number(total_cost_cop || 0),
            estimated_seller_profit_cop: Number(estimated_seller_profit_cop || 0),
            quote_snapshot: quoteSnapshotStr,
            quoted_at: now,
            status: 'creado',
            notes: notes ? notes.trim() : null,
            created_at: now,
            updated_at: now,
          })
          .select('id')
          .single();

        if (!error && data) {
          createdId = Number(data.id);
        }
      } catch (err: any) {
        console.warn('Error insert seller order Supabase:', err.message);
      }
    }

    // 2. SQLite
    try {
      const db = getSqliteDb();
      const info = db
        .prepare(`
          INSERT INTO seller_orders (
            order_number, seller_id, seller_name, seller_phone, customer_name, customer_phone,
            department, city_id, city_name, address, neighborhood, reference_point,
            product_id, product_name, quantity, supplier_name, origin_city_id, origin_city_name,
            carrier_name, sale_price_cop, product_cost_cop, admin_fee_cop, flete_precio_envio,
            flete_seguro_envio, flete_total_cop, dropi_commission_cop, total_cost_cop,
            estimated_seller_profit_cop, quote_snapshot, quoted_at, status, notes, created_at, updated_at
          ) VALUES (
            @order_number, @seller_id, @seller_name, @seller_phone, @customer_name, @customer_phone,
            @department, @city_id, @city_name, @address, @neighborhood, @reference_point,
            @product_id, @product_name, @quantity, @supplier_name, @origin_city_id, @origin_city_name,
            @carrier_name, @sale_price_cop, @product_cost_cop, @admin_fee_cop, @flete_precio_envio,
            @flete_seguro_envio, @flete_total_cop, @dropi_commission_cop, @total_cost_cop,
            @estimated_seller_profit_cop, @quote_snapshot, @quoted_at, @status, @notes, @created_at, @updated_at
          )
        `)
        .run({
          order_number: orderNumber,
          seller_id: seller.id,
          seller_name: seller.name,
          seller_phone: seller.phone,
          customer_name: customer_name.trim(),
          customer_phone: customer_phone.trim(),
          department: department.trim(),
          city_id: Number(city_id),
          city_name: city_name.trim(),
          address: address.trim(),
          neighborhood: neighborhood ? neighborhood.trim() : null,
          reference_point: reference_point ? reference_point.trim() : null,
          product_id: Number(product_id),
          product_name: product_name.trim(),
          quantity: Math.max(1, Number(quantity || 1)),
          supplier_name: supplier_name ? supplier_name.trim() : null,
          origin_city_id: origin_city_id ? Number(origin_city_id) : null,
          origin_city_name: origin_city_name ? origin_city_name.trim() : null,
          carrier_name: carrier_name.trim().toUpperCase(),
          sale_price_cop: Number(sale_price_cop),
          product_cost_cop: Number(product_cost_cop || 0),
          admin_fee_cop: Number(admin_fee_cop || 0),
          flete_precio_envio: Number(flete_precio_envio || 0),
          flete_seguro_envio: Number(flete_seguro_envio || 0),
          flete_total_cop: Number(flete_total_cop || 0),
          dropi_commission_cop: Number(dropi_commission_cop || 0),
          total_cost_cop: Number(total_cost_cop || 0),
          estimated_seller_profit_cop: Number(estimated_seller_profit_cop || 0),
          quote_snapshot: quoteSnapshotStr,
          quoted_at: now,
          status: 'creado',
          notes: notes ? notes.trim() : null,
          created_at: now,
          updated_at: now,
        });

      if (!createdId) createdId = Number(info.lastInsertRowid);
    } catch (err: any) {
      console.warn('Error insert seller order SQLite:', err.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido registrado en PideFácil con éxito.',
      order: {
        id: createdId,
        order_number: orderNumber,
        carrier_name: carrier_name.trim().toUpperCase(),
        sale_price_cop: Number(sale_price_cop),
        estimated_seller_profit_cop: Number(estimated_seller_profit_cop || 0),
        status: 'creado',
      },
    });
  } catch (error: any) {
    console.error('Error creating seller order:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al registrar pedido' },
      { status: 500 }
    );
  }
}
