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
  const status = searchParams.get('status');

  let sellers: any[] = [];

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin.from('sellers').select('id, name, email, phone, status, created_at, updated_at').order('created_at', { ascending: false });
      if (status && status !== 'todos') {
        query = query.eq('status', status);
      }
      const { data } = await query;
      if (data) sellers = data;
    } catch {}
  }

  if (sellers.length === 0) {
    try {
      const db = getSqliteDb();
      if (status && status !== 'todos') {
        sellers = db.prepare('SELECT id, name, email, phone, status, created_at, updated_at FROM sellers WHERE status = ? ORDER BY id DESC').all(status);
      } else {
        sellers = db.prepare('SELECT id, name, email, phone, status, created_at, updated_at FROM sellers ORDER BY id DESC').all();
      }
    } catch {}
  }

  return NextResponse.json({ success: true, data: sellers });
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, status } = body;

    const numericId = Number(id);
    if (!numericId || !['approved', 'rejected', 'pending', 'suspended'].includes(status)) {
      return NextResponse.json({ success: false, error: 'Datos inválidos' }, { status: 400 });
    }

    const now = new Date().toISOString();

    if (isSupabaseConfigured) {
      try {
        await supabaseAdmin.from('sellers').update({ status, updated_at: now }).eq('id', numericId);
      } catch {}
    }

    try {
      const db = getSqliteDb();
      db.prepare('UPDATE sellers SET status = ?, updated_at = ? WHERE id = ?').run(status, now, numericId);
    } catch {}

    return NextResponse.json({
      success: true,
      message: `Estado de vendedor actualizado a "${status}".`,
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
