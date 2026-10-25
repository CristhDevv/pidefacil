import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAppSetting, setAppSetting } from '@/lib/db';
import { resolveDropiToken } from '@/lib/dropi-quote';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  const token = await resolveDropiToken();
  if (!token) {
    return NextResponse.json({
      success: true,
      has_token: false,
      status: 'missing',
      message: 'No hay token de Dropi configurado en el servidor.',
    });
  }

  // Comprobar token en vivo con Dropi API v2
  try {
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const res = await fetch('https://api-v2.dropi.co/bff/orders/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${token}`,
        'X-Host': 'co',
        'Origin': 'https://app.dropi.co',
      },
      body: JSON.stringify({
        peso: 1,
        largo: 10,
        ancho: 10,
        alto: 10,
        ciudad_remitente: { id: 1, name: 'BOGOTA, D.C.' },
        ciudad_destino: { id: 2, name: 'MEDELLIN' },
        EnvioConCobro: true,
        ValorDeclarado: 50000,
        amount: 50000,
      }),
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        success: true,
        has_token: true,
        status: 'expired',
        message: '🔴 Token de Dropi expirado o inválido. Ingrese un token fresco desde app.dropi.co.',
        token_preview: `${token.slice(0, 10)}...${token.slice(-6)}`,
      });
    }

    return NextResponse.json({
      success: true,
      has_token: true,
      status: 'valid',
      message: '🟢 Token de Dropi activo y funcionando correctamente para cotización en vivo.',
      token_preview: `${token.slice(0, 10)}...${token.slice(-6)}`,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      has_token: true,
      status: 'unknown',
      message: `Error al verificar con Dropi: ${err.message}`,
    });
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 400 });
    }

    const cleanToken = token.trim().replace(/^["']|["']$/g, '');

    // 1. Guardar en .secrets/dropi_token.txt
    try {
      const secretDir = path.resolve('.secrets');
      if (!fs.existsSync(secretDir)) {
        fs.mkdirSync(secretDir, { recursive: true });
      }
      fs.writeFileSync(path.join(secretDir, 'dropi_token.txt'), cleanToken, 'utf8');
    } catch (e: any) {
      console.warn('Error guardando token en .secrets:', e.message);
    }

    // 2. Guardar en app_settings (SQLite + Supabase)
    await setAppSetting('DROPI_TOKEN', cleanToken);

    return NextResponse.json({
      success: true,
      message: 'Token de Dropi actualizado y guardado en el servidor con éxito.',
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
