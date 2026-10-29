import { NextRequest, NextResponse } from 'next/server';
import { verifySellerPassword, createSellerToken, setSellerSessionCookie } from '@/lib/seller-auth';
import { createAdminToken } from '@/lib/auth';
import { getSqliteDb, getAppSetting } from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password } = body;
    const dbSecret = await getAppSetting('ADMIN_SECRET').catch(() => null);
    const adminSecret = (process.env.ADMIN_SECRET || dbSecret || 'Soloc@li1').trim();

    if (!password) {
      return NextResponse.json(
        { success: false, error: 'La contraseña o clave de acceso es requerida.' },
        { status: 400 }
      );
    }

    const cleanEmail = email ? String(email).trim().toLowerCase() : '';
    const cleanPassword = String(password).trim();

    // 1. Si no hay correo, verificar acceso directo con Master Secret
    if (!cleanEmail) {
      if (cleanPassword === adminSecret || cleanPassword === 'Soloc@li1') {
        const response = NextResponse.json({
          success: true,
          user: {
            id: 1,
            name: 'Administrador Maestro',
            email: 'admin@pidefacil.co',
            role: 'admin',
            status: 'approved',
          },
          redirect: '/admin',
        });

        const adminToken = createAdminToken();
        response.cookies.set('pf_admin_token', adminToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        const sellerToken = createSellerToken({
          id: 1,
          email: 'admin@pidefacil.co',
          role: 'admin',
        });
        setSellerSessionCookie(response, sellerToken);

        return response;
      }

      return NextResponse.json(
        { success: false, error: 'Ingresa tu correo electrónico.' },
        { status: 400 }
      );
    }

    // 2. Buscar usuario en Supabase o SQLite por su correo electrónico
    let userRow: any = null;

    if (isSupabaseConfigured) {
      try {
        const { data } = await supabaseAdmin
          .from('sellers')
          .select('*')
          .eq('email', cleanEmail)
          .maybeSingle();
        if (data) userRow = data;
      } catch (err) {
        console.warn('Error buscando usuario en Supabase:', err);
      }
    }

    if (!userRow) {
      try {
        const db = getSqliteDb();
        const row = db.prepare('SELECT * FROM sellers WHERE email = ?').get(cleanEmail);
        if (row) userRow = row;
      } catch (err) {
        console.warn('Error buscando usuario en SQLite:', err);
      }
    }

    // 3. Si no existe en la base de datos de usuarios
    if (!userRow) {
      // Permitir acceso de emergencia al admin maestro si usa el correo oficial de administración
      if ((cleanPassword === adminSecret || cleanPassword === 'Soloc@li1') && cleanEmail === 'admin@pidefacil.co') {
        const response = NextResponse.json({
          success: true,
          user: {
            id: 1,
            name: 'Administrador Maestro',
            email: 'admin@pidefacil.co',
            role: 'admin',
            status: 'approved',
          },
          redirect: '/admin',
        });

        const adminToken = createAdminToken();
        response.cookies.set('pf_admin_token', adminToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60,
          path: '/',
        });

        const sellerToken = createSellerToken({
          id: 1,
          email: 'admin@pidefacil.co',
          role: 'admin',
        });
        setSellerSessionCookie(response, sellerToken);

        return response;
      }

      return NextResponse.json(
        { success: false, error: 'No encontramos ninguna cuenta registrada con este correo.' },
        { status: 401 }
      );
    }

    // 4. Validar contraseña del usuario (su hash registrado o clave maestra de soporte)
    const isValid = verifySellerPassword(cleanPassword, userRow.password_hash) ||
      cleanPassword === adminSecret ||
      cleanPassword === 'Soloc@li1';

    if (!isValid) {
      return NextResponse.json(
        { success: false, error: 'Contraseña incorrecta. Verifica e intenta nuevamente.' },
        { status: 401 }
      );
    }

    // Validar estado de la cuenta
    if (userRow.status === 'suspended') {
      return NextResponse.json(
        { success: false, error: 'Tu cuenta ha sido suspendida. Comunícate con soporte.' },
        { status: 403 }
      );
    }
    if (userRow.status === 'rejected') {
      return NextResponse.json(
        { success: false, error: 'Tu solicitud de acceso fue rechazada.' },
        { status: 403 }
      );
    }

    // Rol estrictamente tomado de la base de datos (vendedor, operador, o admin)
    const detectedRole = userRow.role || 'vendedor';

    const response = NextResponse.json({
      success: true,
      user: {
        id: Number(userRow.id),
        name: userRow.name,
        email: userRow.email,
        phone: userRow.phone,
        role: detectedRole,
        status: userRow.status,
      },
      redirect: detectedRole === 'admin' ? '/admin' : '/seller',
    });

    // Guardar cookie de sesión unificada con su rol legítimo
    const sellerToken = createSellerToken({
      id: Number(userRow.id),
      email: userRow.email,
      role: detectedRole,
    });
    setSellerSessionCookie(response, sellerToken);

    // Si es admin u operador, otorgar también pf_admin_token para acceso directo
    if (detectedRole === 'admin' || detectedRole === 'operador') {
      const adminToken = createAdminToken();
      response.cookies.set('pf_admin_token', adminToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 7 * 24 * 60 * 60,
        path: '/',
      });
    } else {
      // Para vendedores, limpiar la cookie de admin para evitar escalada accidental
      response.cookies.delete('pf_admin_token');
    }

    return response;
  } catch (error: any) {
    console.error('Error in unified login:', error);
    return NextResponse.json(
      { success: false, error: 'Error interno en inicio de sesión' },
      { status: 500 }
    );
  }
}
