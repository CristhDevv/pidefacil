import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';
import { verifySellerPassword } from '@/lib/seller-auth';
import { getSqliteDb } from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { password, email } = body;
    const adminSecret = process.env.ADMIN_SECRET || 'pidefacil_admin_secret_2026';

    let authorized = false;
    let userName = 'Administrador Maestro';
    let userRole = 'admin';

    // 1. Verificación directa con Master Secret
    if (password && password.trim() === adminSecret.trim()) {
      authorized = true;
    } else if (email && password) {
      // 2. Verificación con usuario creado en la plataforma (roles: admin o operador)
      const cleanEmail = String(email).trim().toLowerCase();
      let userRow: any = null;

      if (isSupabaseConfigured) {
        try {
          const { data } = await supabaseAdmin
            .from('sellers')
            .select('*')
            .eq('email', cleanEmail)
            .maybeSingle();
          if (data) userRow = data;
        } catch {}
      }

      if (!userRow) {
        try {
          userRow = getSqliteDb().prepare('SELECT * FROM sellers WHERE email = ?').get(cleanEmail);
        } catch {}
      }

      if (userRow) {
        if (userRow.role !== 'admin' && userRow.role !== 'operador') {
          return NextResponse.json(
            { success: false, error: 'Este usuario no tiene permisos administrativos (su rol es vendedor).' },
            { status: 403 }
          );
        }

        if (userRow.status !== 'approved') {
          return NextResponse.json(
            { success: false, error: 'Esta cuenta se encuentra inactiva o suspendida.' },
            { status: 403 }
          );
        }

        if (verifySellerPassword(password, userRow.password_hash)) {
          authorized = true;
          userName = userRow.name;
          userRole = userRow.role;
        }
      }
    }

    if (!authorized) {
      return NextResponse.json(
        { success: false, error: 'Credenciales administrativas incorrectas.' },
        { status: 401 }
      );
    }

    const token = createAdminToken();

    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
      user: {
        name: userName,
        role: userRole,
      },
    });

    // Cookie segura persistente por 7 días
    response.cookies.set('pf_admin_token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60,
    });

    return response;
  } catch (error: any) {
    console.error('Error en login admin:', error);
    return NextResponse.json(
      { success: false, error: 'Error al procesar autenticación.' },
      { status: 500 }
    );
  }
}
