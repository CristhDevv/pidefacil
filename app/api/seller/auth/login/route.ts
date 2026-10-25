import { NextRequest, NextResponse } from 'next/server';
import { verifySellerPassword, createSellerToken, setSellerSessionCookie } from '@/lib/seller-auth';
import { getSqliteDb } from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email y contraseña requeridos' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();

    let sellerRow: any = null;

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabaseAdmin
          .from('sellers')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();
        if (data) sellerRow = data;
      } catch {}
    }

    if (!sellerRow) {
      try {
        const db = getSqliteDb();
        const row = db.prepare('SELECT * FROM sellers WHERE email = ?').get(cleanEmail);
        if (row) sellerRow = row;
      } catch {}
    }

    if (!sellerRow) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    const isMatch = verifySellerPassword(password, sellerRow.password_hash);
    if (!isMatch) {
      return NextResponse.json(
        { success: false, error: 'Credenciales inválidas.' },
        { status: 401 }
      );
    }

    const token = createSellerToken({ id: Number(sellerRow.id), email: sellerRow.email });
    const response = NextResponse.json({
      success: true,
      seller: {
        id: Number(sellerRow.id),
        name: sellerRow.name,
        email: sellerRow.email,
        phone: sellerRow.phone,
        status: sellerRow.status,
      },
    });

    setSellerSessionCookie(response, token);
    return response;
  } catch (error: any) {
    console.error('Error in seller login:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno en inicio de sesión' },
      { status: 500 }
    );
  }
}
