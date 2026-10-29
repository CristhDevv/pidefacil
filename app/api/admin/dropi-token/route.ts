import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { isAdminAuthenticated } from '@/lib/auth';
import { getAppSetting, setAppSetting } from '@/lib/db';
import { resolveDropiToken } from '@/lib/dropi-quote';

export const dynamic = 'force-dynamic';

function getJwtExpiry(token: string) {
  try {
    const payload = JSON.parse(Buffer.from(token.split('.')[1], 'base64').toString('utf8'));
    if (payload.exp) {
      const expMs = payload.exp * 1000;
      return {
        expires_at: new Date(expMs).toISOString(),
        hours_remaining: Number(((expMs - Date.now()) / (1000 * 60 * 60)).toFixed(1)),
        is_expired: Date.now() > expMs,
      };
    }
  } catch {}
  return { expires_at: null, hours_remaining: null, is_expired: false };
}

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
      storage_location: 'Ninguna',
      message: 'No hay token de Dropi configurado en el servidor.',
    });
  }

  const expiry = getJwtExpiry(token);

  // Determinar ubicación de almacenamiento
  const dbToken = await getAppSetting('DROPI_TOKEN');
  const envToken = process.env.DROPI_TOKEN || '';
  const storageLocation = (dbToken && dbToken.trim() === token)
    ? 'Supabase (Base de datos en la nube de producción)'
    : (envToken && envToken.trim() === token)
    ? 'Variable de entorno Vercel (DROPI_TOKEN)'
    : 'Archivo local (.secrets/dropi_token.txt)';

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
        products: [
          { id: 1, name: 'TEST', price: 50000, quantity: 1, type: 'SIMPLE' },
        ],
      }),
    });

    if (res.status === 401 || res.status === 403) {
      return NextResponse.json({
        success: true,
        has_token: true,
        status: 'expired',
        storage_location: storageLocation,
        expires_at: expiry.expires_at,
        hours_remaining: expiry.hours_remaining,
        message: '🔴 Token de Dropi expirado o rechazado por Dropi (401/403). Ingrese un token fresco desde app.dropi.co.',
        token_preview: `${token.slice(0, 10)}...${token.slice(-6)}`,
      });
    }

    return NextResponse.json({
      success: true,
      has_token: true,
      status: 'valid',
      storage_location: storageLocation,
      expires_at: expiry.expires_at,
      hours_remaining: expiry.hours_remaining,
      message: `🟢 Token de Dropi activo y verificado en vivo (${expiry.hours_remaining !== null ? `${expiry.hours_remaining}h restantes` : 'vigente'}).`,
      token_preview: `${token.slice(0, 10)}...${token.slice(-6)}`,
    });
  } catch (err: any) {
    return NextResponse.json({
      success: true,
      has_token: true,
      status: 'unknown',
      storage_location: storageLocation,
      expires_at: expiry.expires_at,
      hours_remaining: expiry.hours_remaining,
      message: `Error de red al verificar con Dropi: ${err.message}`,
      token_preview: `${token.slice(0, 10)}...${token.slice(-6)}`,
    });
  }
}

export async function POST(request: NextRequest) {
  // Autenticación: Admin por cookie o por cabecera de relevo autorizada
  const isAdmin = isAdminAuthenticated(request);
  const relayKey = request.headers.get('x-relay-key');
  const expectedRelayKey = process.env.ADMIN_RELAY_KEY || 'pidefacil-dropi-relay-secure-2026';

  if (!isAdmin && relayKey !== expectedRelayKey) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { token } = body;

    if (!token || typeof token !== 'string') {
      return NextResponse.json({ success: false, error: 'Token inválido' }, { status: 400 });
    }

    const cleanToken = token.trim().replace(/^["']|["']$/g, '');

    // 1. Validar token en vivo contra Dropi API v2 antes de aceptarlo
    process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
    const testRes = await fetch('https://api-v2.dropi.co/bff/orders/quote', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Authorization': `Bearer ${cleanToken}`,
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
        products: [
          { id: 1, name: 'TEST', price: 50000, quantity: 1, type: 'SIMPLE' },
        ],
      }),
    });

    if (testRes.status === 401 || testRes.status === 403) {
      return NextResponse.json(
        {
          success: false,
          status: 'expired',
          error: 'El token ingresado fue rechazado por Dropi (HTTP 401/403 No Autorizado). Verifica que hayas iniciado sesión activa en app.dropi.co.',
        },
        { status: 400 }
      );
    }

    // 2. Guardar en Supabase app_settings (persistente en producción para todos los serverless lambdas)
    await setAppSetting('DROPI_TOKEN', cleanToken);

    // 3. Guardar en .secrets/dropi_token.txt para desarrollo local si la ruta es escribible
    try {
      const secretDir = path.resolve('.secrets');
      if (!fs.existsSync(secretDir)) {
        fs.mkdirSync(secretDir, { recursive: true });
      }
      fs.writeFileSync(path.join(secretDir, 'dropi_token.txt'), cleanToken, 'utf8');
    } catch {}

    const expiry = getJwtExpiry(cleanToken);

    return NextResponse.json({
      success: true,
      status: 'valid',
      storage_location: 'Supabase (Base de datos en la nube de producción)',
      expires_at: expiry.expires_at,
      hours_remaining: expiry.hours_remaining,
      message: `Token verificado en vivo con Dropi API v2 y guardado exitosamente en producción.${
        expiry.hours_remaining !== null ? ` Vigente por ${expiry.hours_remaining} horas.` : ''
      }`,
    });
  } catch (error: any) {
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
