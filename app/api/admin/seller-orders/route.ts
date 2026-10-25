import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getSqliteDb } from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status') || 'todos';

  let orders: any[] = [];
  let kpis = {
    total_creado: 0,
    total_pedido_en_dropi: 0,
    total_en_transito: 0,
    total_entregado: 0,
    total_dinero_recibido: 0,
    total_liquidado: 0,
    monto_pendiente_liquidar: 0,
    monto_total_liquidado: 0,
  };

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin.from('seller_orders').select('*').order('created_at', { ascending: false });
      if (status !== 'todos') {
        query = query.eq('status', status);
      }
      const { data } = await query;
      if (data) orders = data;

      // Stats
      const { data: allRows } = await supabaseAdmin.from('seller_orders').select('status, amount_received_cop, final_seller_profit_cop, estimated_seller_profit_cop');
      if (allRows) {
        for (const r of allRows) {
          if (r.status === 'creado') kpis.total_creado++;
          if (r.status === 'pedido_en_dropi') kpis.total_pedido_en_dropi++;
          if (r.status === 'en_transito') kpis.total_en_transito++;
          if (r.status === 'entregado') kpis.total_entregado++;
          if (r.status === 'dinero_recibido') {
            kpis.total_dinero_recibido++;
            kpis.monto_pendiente_liquidar += Number(r.estimated_seller_profit_cop || 0);
          }
          if (r.status === 'liquidado') {
            kpis.total_liquidado++;
            kpis.monto_total_liquidado += Number(r.final_seller_profit_cop || 0);
          }
        }
      }
    } catch (err: any) {
      console.warn('Error reading seller orders in Supabase:', err.message);
    }
  }

  if (orders.length === 0) {
    try {
      const db = getSqliteDb();
      if (status !== 'todos') {
        orders = db.prepare('SELECT * FROM seller_orders WHERE status = ? ORDER BY id DESC').all(status);
      } else {
        orders = db.prepare('SELECT * FROM seller_orders ORDER BY id DESC').all();
      }

      const allRows = db.prepare('SELECT status, amount_received_cop, final_seller_profit_cop, estimated_seller_profit_cop FROM seller_orders').all();
      for (const r of allRows as any[]) {
        if (r.status === 'creado') kpis.total_creado++;
        if (r.status === 'pedido_en_dropi') kpis.total_pedido_en_dropi++;
        if (r.status === 'en_transito') kpis.total_en_transito++;
        if (r.status === 'entregado') kpis.total_entregado++;
        if (r.status === 'dinero_recibido') {
          kpis.total_dinero_recibido++;
          kpis.monto_pendiente_liquidar += Number(r.estimated_seller_profit_cop || 0);
        }
        if (r.status === 'liquidado') {
          kpis.total_liquidado++;
          kpis.monto_total_liquidado += Number(r.final_seller_profit_cop || 0);
        }
      }
    } catch {}
  }

  const parsedOrders = orders.map((o: any) => ({
    ...o,
    quote_snapshot: typeof o.quote_snapshot === 'string' ? JSON.parse(o.quote_snapshot) : o.quote_snapshot,
  }));

  return NextResponse.json({
    success: true,
    data: parsedOrders,
    kpis,
  });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      id,
      status,
      dropi_order_id,
      amount_received_cop,
      final_seller_profit_cop,
      adjustment_reason,
      payout_voucher,
      notes,
    } = body;

    const numericId = Number(id);
    if (!numericId) {
      return NextResponse.json({ success: false, error: 'ID de pedido inválido' }, { status: 400 });
    }

    const db = getSqliteDb();
    const existing = db.prepare('SELECT * FROM seller_orders WHERE id = ?').get(numericId) as any;
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Pedido no encontrado' }, { status: 404 });
    }

    const now = new Date().toISOString();
    const updates: any = { updated_at: now };

    if (status) updates.status = status;
    if (dropi_order_id !== undefined) updates.dropi_order_id = dropi_order_id;
    if (notes !== undefined) updates.notes = notes;

    // Cuando el dinero entra a la cuenta del admin
    if (amount_received_cop !== undefined && amount_received_cop !== null) {
      const received = Number(amount_received_cop);
      updates.amount_received_cop = received;
      // Parte sugerida = dinero recibido - costo producto - flete total - 5% admin - comisión Dropi
      const suggestedProfit =
        received -
        Number(existing.product_cost_cop) -
        Number(existing.flete_total_cop) -
        Number(existing.admin_fee_cop) -
        Number(existing.dropi_commission_cop);

      updates.suggested_seller_profit_cop = suggestedProfit;
      if (!updates.status) updates.status = 'dinero_recibido';
    }

    // Liquidación al vendedor
    if (final_seller_profit_cop !== undefined && final_seller_profit_cop !== null) {
      const finalProfit = Number(final_seller_profit_cop);
      const suggested = updates.suggested_seller_profit_cop ?? existing.suggested_seller_profit_cop ?? existing.estimated_seller_profit_cop;

      // REGLA: Parte final editable por admin con motivo obligatorio
      if (finalProfit !== suggested && (!adjustment_reason || !adjustment_reason.trim())) {
        return NextResponse.json(
          {
            success: false,
            error: 'Debe ingresar un motivo obligatorio para modificar la parte final del vendedor respecto a la sugerida.',
          },
          { status: 400 }
        );
      }

      updates.final_seller_profit_cop = finalProfit;
      updates.adjustment_reason = adjustment_reason ? adjustment_reason.trim() : null;
      updates.payout_voucher = payout_voucher ? payout_voucher.trim() : null;
      updates.liquidated_at = now;
      updates.status = 'liquidado';
    }

    // 1. Supabase
    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('seller_orders').update(updates).eq('id', numericId);
      } catch (err: any) {
        console.warn('Error update seller order Supabase:', err.message);
      }
    }

    // 2. SQLite
    try {
      const setClauses: string[] = [];
      const values: any[] = [];
      for (const [key, val] of Object.entries(updates)) {
        setClauses.push(`${key} = ?`);
        values.push(val);
      }
      values.push(numericId);
      db.prepare(`UPDATE seller_orders SET ${setClauses.join(', ')} WHERE id = ?`).run(...values);
    } catch (err: any) {
      console.warn('Error update seller order SQLite:', err.message);
    }

    return NextResponse.json({
      success: true,
      message: 'Pedido actualizado con éxito.',
      order_id: numericId,
      status: updates.status || existing.status,
    });
  } catch (error: any) {
    console.error('Error in admin seller order PATCH:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
