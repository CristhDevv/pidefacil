/**
 * ==============================================================================
 * PideFácil - Cliente HTTP Dropi Colombia API v2
 * ==============================================================================
 * Gestiona autenticación JWT, extracción de userId, cabeceras seguras,
 * control de ritmo (rate limiting) y backoff exponencial ante errores 429/5xx.
 */

// Permitir certificados intermedios de api-v2.dropi.co en entornos Node
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import fs from 'fs';
import path from 'path';
import dotenv from 'dotenv';

// Cargar variables de entorno locales
if (fs.existsSync('.env.local')) {
  dotenv.config({ path: '.env.local' });
} else {
  dotenv.config();
}

export interface DropiConfig {
  token: string;
  userId: number | string;
  apiBase: string;
  country: string;
}

export interface DropiProductRaw {
  id: number;
  name: string;
  type?: 'SIMPLE' | 'VARIABLE' | string;
  sku?: string;
  sale_price: number;
  suggested_price?: number;
  stock_simple?: number;
  variation_stock?: number;
  description?: string;
  categories?: any[];
  supplier?: {
    id: number;
    name: string;
    category_user?: string;
  };
  image?: string;
  gallery?: string[];
  [key: string]: any;
}

export interface DropiSearchResponse {
  data: {
    products: DropiProductRaw[] | null;
    seed?: string;
    total?: number;
  } | null;
  status?: string | number;
  message?: string;
}

/**
 * Obtiene el token JWT limpiando comillas externas de localStorage si existen.
 * Prohibición estricta: Nunca almacenar en código ni logs.
 */
export function getDropiToken(): string {
  // 1. Archivo secreto ignorado por Git (.secrets/dropi_token.txt) - prioridad dinámica
  const secretPath = path.resolve('.secrets/dropi_token.txt');
  let token = '';
  if (fs.existsSync(secretPath)) {
    token = fs.readFileSync(secretPath, 'utf8').trim();
  }

  // 2. Variable de entorno si no está en archivo secreto
  if (!token) {
    token = process.env.DROPI_TOKEN || '';
  }

  // Limpiar posibles comillas de serialización de localStorage
  if (token) {
    token = token.trim();
    if (
      (token.startsWith('"') && token.endsWith('"')) ||
      (token.startsWith("'") && token.endsWith("'"))
    ) {
      token = token.slice(1, -1).trim();
    }
  }

  return token;
}

/**
 * Decodifica de forma segura el claim `sub` del payload del JWT sin verificar firma
 */
export function extractUserIdFromJwt(jwt: string): string | null {
  try {
    const parts = jwt.split('.');
    if (parts.length < 2) return null;
    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = Buffer.from(base64, 'base64').toString('utf8');
    const parsed = JSON.parse(jsonPayload);
    return parsed.sub || parsed.id || parsed.user_id || null;
  } catch (err) {
    return null;
  }
}

/**
 * Construye y valida la configuración activa para comunicarse con Dropi API v2
 */
export function getDropiConfig(): DropiConfig {
  const token = getDropiToken();
  const apiBase = process.env.DROPI_API_BASE || 'https://api-v2.dropi.co';
  const country = process.env.DROPI_COUNTRY || 'COLOMBIA';

  let userId: string | number = '';
  if (token) {
    const extracted = extractUserIdFromJwt(token);
    if (extracted) {
      userId = extracted;
    }
  }
  if (!userId) {
    userId = process.env.DROPI_USER_ID || '';
  }

  return {
    token,
    userId,
    apiBase,
    country,
  };
}

/**
 * Normaliza la URL de una imagen al CDN oficial de Dropi en CloudFront
 */
export function buildCloudFrontImageUrl(rawImage: string | null | undefined): string | null {
  if (!rawImage) return null;
  const str = String(rawImage).trim();
  if (!str) return null;
  if (str.startsWith('https://d39ru7awumhhs2.cloudfront.net/')) return str;
  if (str.startsWith('https://dropi.co/')) {
    return `https://d39ru7awumhhs2.cloudfront.net/${str.replace(/^https:\/\/dropi\.co\//, '').replace(/^\/+/, '')}`;
  }
  if (str.startsWith('http://') || str.startsWith('https://')) return str;
  return `https://d39ru7awumhhs2.cloudfront.net/${str.replace(/^\/+/, '')}`;
}

/**
 * Cliente HTTP resiliente con manejo de 401, 429 y reintentos con backoff exponencial
 */
export async function dropiFetch<T>(
  endpoint: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
  } = {}
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  const config = getDropiConfig();
  const token = options.token || config.token;

  if (!token) {
    return {
      ok: false,
      status: 401,
      data: null,
      error: 'DROPI_TOKEN no configurado. Defínalo en .env.local o en .secrets/dropi_token.txt',
    };
  }

  const url = endpoint.startsWith('http') ? endpoint : `${config.apiBase}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
  const method = options.method || (options.body ? 'POST' : 'GET');

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Authorization': `Bearer ${token}`,
    'x-captcha-token': '',
    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  };

  const backoffDelays = [30000, 60000, 120000, 240000, 300000]; // 30s, 60s, 120s...
  let attempt = 0;
  const maxAttempts = 5;

  while (attempt <= maxAttempts) {
    try {
      const res = await fetch(url, {
        method,
        headers,
        body: options.body ? JSON.stringify(options.body) : undefined,
      });

      // Manejo crítico de expiración de sesión (401 Unauthorized)
      if (res.status === 401) {
        console.error('\n🚨 ==============================================================');
        console.error('❌ ERROR 401: TOKEN DE DROPI EXPIRADO O INVÁLIDO');
        console.error('El token de Dropi expira aproximadamente cada 10 horas.');
        console.error('Por favor actualiza DROPI_TOKEN en .env.local o en .secrets/dropi_token.txt');
        console.error('El checkpoint actual ha sido preservado de forma segura.');
        console.error('==============================================================\n');
        return {
          ok: false,
          status: 401,
          data: null,
          error: 'HTTP 401: Token expirado o inválido. Renueve DROPI_TOKEN.',
        };
      }

      // Manejo de Rate Limit (429) o errores temporales del servidor (502, 503, 504)
      if (res.status === 429 || res.status >= 500) {
        attempt++;
        if (attempt > maxAttempts) {
          return {
            ok: false,
            status: res.status,
            data: null,
            error: `HTTP ${res.status}: Límite de reintentos alcanzado (${maxAttempts}).`,
          };
        }
        const delay = backoffDelays[attempt - 1] || 60000;
        console.warn(
          `⚠️ [Dropi HTTP ${res.status}] Rate limit o error temporal. Aplicando Exponential Backoff: reintentando en ${delay / 1000}s (Intento ${attempt}/${maxAttempts})...`
        );
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      // Respuesta exitosa
      const json = await res.json().catch(() => null);
      return {
        ok: res.ok,
        status: res.status,
        data: json as T,
      };
    } catch (networkError: any) {
      attempt++;
      if (attempt > maxAttempts) {
        return {
          ok: false,
          status: 0,
          data: null,
          error: `Error de red crítico tras ${maxAttempts} intentos: ${networkError.message}`,
        };
      }
      const delay = backoffDelays[attempt - 1] || 30000;
      console.warn(
        `⚠️ [Error de Conexión] ${networkError.message}. Reintentando en ${delay / 1000}s...`
      );
      await new Promise((r) => setTimeout(r, delay));
    }
  }

  return {
    ok: false,
    status: 500,
    data: null,
    error: 'Error inesperado en cliente Dropi',
  };
}
