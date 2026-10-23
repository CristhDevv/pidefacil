import { NextRequest, NextResponse } from 'next/server';
import { createAdminToken } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const { password } = await request.json();
    const adminSecret = process.env.ADMIN_SECRET || 'pidefacil_admin_secret_2026';

    if (!password || password.trim() !== adminSecret.trim()) {
      return NextResponse.json(
        { success: false, error: 'Contraseña administrativa incorrecta.' },
        { status: 401 }
      );
    }

    const token = createAdminToken();

    const response = NextResponse.json({
      success: true,
      message: 'Inicio de sesión exitoso.',
      token,
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
