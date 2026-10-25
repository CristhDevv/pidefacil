import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSqliteDb } from './db';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';

const SELLER_COOKIE_NAME = 'pf_seller_token';
const SELLER_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'pidefacil-seller-secret-key-2026';

export interface DbSeller {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
  created_at: string;
  updated_at: string;
}

export function hashSellerPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

export function verifySellerPassword(password: string, combinedHash: string): boolean {
  try {
    const [salt, originalHash] = combinedHash.split(':');
    if (!salt || !originalHash) return false;
    const testHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return testHash === originalHash;
  } catch {
    return false;
  }
}

export function createSellerToken(seller: { id: number; email: string }): string {
  const payload = JSON.stringify({
    id: seller.id,
    email: seller.email,
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
  });
  const hmac = crypto.createHmac('sha256', SELLER_SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  const b64 = Buffer.from(payload).toString('base64url');
  return `${b64}.${signature}`;
}

export function verifySellerToken(token: string): { id: number; email: string } | null {
  try {
    const [b64, signature] = token.split('.');
    if (!b64 || !signature) return null;
    const payload = Buffer.from(b64, 'base64url').toString('utf8');
    const hmac = crypto.createHmac('sha256', SELLER_SESSION_SECRET);
    hmac.update(payload);
    const expectedSig = hmac.digest('hex');
    if (signature !== expectedSig) return null;
    const data = JSON.parse(payload);
    if (data.exp && Date.now() > data.exp) return null;
    return { id: Number(data.id), email: data.email };
  } catch {
    return null;
  }
}

export async function getSellerById(id: number): Promise<DbSeller | null> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabaseAdmin
        .from('sellers')
        .select('id, name, email, phone, status, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        return {
          id: Number(data.id),
          name: data.name,
          email: data.email,
          phone: data.phone,
          status: data.status,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {}
  }

  try {
    const row = getSqliteDb()
      .prepare('SELECT id, name, email, phone, status, created_at, updated_at FROM sellers WHERE id = ?')
      .get(id) as any;
    if (row) return row;
  } catch {}

  return null;
}

export async function getSellerFromRequest(request: NextRequest): Promise<DbSeller | null> {
  const token = request.cookies.get(SELLER_COOKIE_NAME)?.value;
  if (!token) return null;
  const verified = verifySellerToken(token);
  if (!verified) return null;
  return getSellerById(verified.id);
}

export function setSellerSessionCookie(response: NextResponse, token: string): void {
  response.cookies.set(SELLER_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 30 * 24 * 60 * 60, // 30 días
    path: '/',
  });
}

export function clearSellerSessionCookie(response: NextResponse): void {
  response.cookies.delete(SELLER_COOKIE_NAME);
}
