/**
 * ==============================================================================
 * PideFácil - Módulo de Autenticación de Administrador
 * ==============================================================================
 * Validación criptográfica con HMAC-SHA256, sin dependencias externas pesadas.
 * Válido para Serverless de Vercel y entornos locales.
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';

const ADMIN_SECRET = process.env.ADMIN_SECRET || 'pidefacil_admin_secret_2026';
const TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días de sesión activa

/**
 * Genera un token firmado criptográficamente para la sesión de admin
 */
export function createAdminToken(): string {
  const ts = Date.now().toString();
  const signature = crypto.createHmac('sha256', ADMIN_SECRET).update(ts).digest('hex');
  return `${ts}.${signature}`;
}

/**
 * Valida si un token es auténtico y no ha expirado
 */
export function verifyAdminToken(token: string | null | undefined): boolean {
  if (!token) return false;
  const parts = token.split('.');
  if (parts.length !== 2) return false;
  const [tsStr, signature] = parts;
  const ts = parseInt(tsStr, 10);
  if (isNaN(ts)) return false;

  // Validación de expiración
  if (Date.now() - ts > TOKEN_TTL_MS || Date.now() < ts - 60000) return false;

  const expected = crypto.createHmac('sha256', ADMIN_SECRET).update(tsStr).digest('hex');

  try {
    const a = Buffer.from(signature);
    const b = Buffer.from(expected);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

/**
 * Valida la autenticación de la petición a través de Cookie o Authorization Bearer
 */
export function isAdminAuthenticated(req: NextRequest): boolean {
  const cookie = req.cookies.get('pf_admin_token')?.value;
  if (verifyAdminToken(cookie)) return true;

  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return verifyAdminToken(authHeader.slice(7));
  }

  return false;
}
