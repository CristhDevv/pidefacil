import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { getSqliteDb } from './db';
import { supabaseAdmin, isSupabaseConfigured } from './supabase';

const SELLER_COOKIE_NAME = 'pf_seller_token';
const SELLER_SESSION_SECRET = process.env.ADMIN_SESSION_SECRET || 'pidefacil-seller-secret-key-2026';

export type UserRole = 'admin' | 'vendedor' | 'operador';

export interface DbSeller {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: UserRole;
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

export function createSellerToken(seller: { id: number; email: string; role?: string }): string {
  const payload = JSON.stringify({
    id: seller.id,
    email: seller.email,
    role: seller.role || 'vendedor',
    exp: Date.now() + 30 * 24 * 60 * 60 * 1000, // 30 días
  });
  const hmac = crypto.createHmac('sha256', SELLER_SESSION_SECRET);
  hmac.update(payload);
  const signature = hmac.digest('hex');
  const b64 = Buffer.from(payload).toString('base64url');
  return `${b64}.${signature}`;
}

export function verifySellerToken(token: string): { id: number; email: string; role: UserRole } | null {
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
    return { id: Number(data.id), email: data.email, role: (data.role as UserRole) || 'vendedor' };
  } catch {
    return null;
  }
}

export async function getSellerById(id: number): Promise<DbSeller | null> {
  if (isSupabaseConfigured) {
    try {
      const { data } = await supabaseAdmin
        .from('sellers')
        .select('id, name, email, phone, role, status, created_at, updated_at')
        .eq('id', id)
        .maybeSingle();
      if (data) {
        return {
          id: Number(data.id),
          name: data.name,
          email: data.email,
          phone: data.phone,
          role: (data.role as UserRole) || 'vendedor',
          status: data.status,
          created_at: data.created_at,
          updated_at: data.updated_at,
        };
      }
    } catch {}
  }

  try {
    const row = getSqliteDb()
      .prepare('SELECT id, name, email, phone, role, status, created_at, updated_at FROM sellers WHERE id = ?')
      .get(id) as any;
    if (row) {
      return {
        ...row,
        role: (row.role as UserRole) || 'vendedor',
      };
    }
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

/**
 * ==============================================================================
 * GESTIÓN ADMINISTRATIVA DE USUARIOS Y ROLES (CREACIÓN SIN CONFIRMACIÓN POR CORREO)
 * ==============================================================================
 */

export async function listUsersAdmin(options?: {
  search?: string;
  role?: string;
  status?: string;
}): Promise<DbSeller[]> {
  const search = options?.search?.trim().toLowerCase() || '';
  const roleFilter = options?.role || 'todos';
  const statusFilter = options?.status || 'todos';

  if (isSupabaseConfigured) {
    try {
      let query = supabaseAdmin
        .from('sellers')
        .select('id, name, email, phone, role, status, created_at, updated_at')
        .order('created_at', { ascending: false });

      if (roleFilter !== 'todos') {
        query = query.eq('role', roleFilter);
      }
      if (statusFilter !== 'todos') {
        query = query.eq('status', statusFilter);
      }
      if (search) {
        query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,phone.ilike.%${search}%`);
      }

      const { data, error } = await query;
      if (!error && Array.isArray(data)) {
        return data.map((d: any) => ({
          id: Number(d.id),
          name: d.name,
          email: d.email,
          phone: d.phone,
          role: (d.role as UserRole) || 'vendedor',
          status: d.status,
          created_at: d.created_at,
          updated_at: d.updated_at,
        }));
      }
    } catch (e) {
      console.error('Error listando usuarios en Supabase:', e);
    }
  }

  // Fallback SQLite
  try {
    const conditions: string[] = ['1=1'];
    const params: any[] = [];

    if (roleFilter !== 'todos') {
      conditions.push('role = ?');
      params.push(roleFilter);
    }
    if (statusFilter !== 'todos') {
      conditions.push('status = ?');
      params.push(statusFilter);
    }
    if (search) {
      conditions.push('(LOWER(name) LIKE ? OR LOWER(email) LIKE ? OR phone LIKE ?)');
      params.push(`%${search}%`, `%${search}%`, `%${search}%`);
    }

    const rows = getSqliteDb()
      .prepare(
        `SELECT id, name, email, phone, role, status, created_at, updated_at 
         FROM sellers 
         WHERE ${conditions.join(' AND ')} 
         ORDER BY id DESC`
      )
      .all(...params) as any[];

    return rows.map((r) => ({
      ...r,
      role: (r.role as UserRole) || 'vendedor',
    }));
  } catch {
    return [];
  }
}

export async function createUserAdmin(data: {
  name: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
  status?: 'approved' | 'pending' | 'suspended';
}): Promise<DbSeller> {
  const now = new Date().toISOString();
  const cleanEmail = data.email.trim().toLowerCase();
  const cleanName = data.name.trim();
  const cleanPhone = (data.phone || '').trim();
  const role: UserRole = data.role || 'vendedor';
  const status = data.status || 'approved'; // Por defecto activo de inmediato sin confirmación por correo
  const passwordHash = hashSellerPassword(data.password.trim());

  let insertedId: number = 0;

  if (isSupabaseConfigured) {
    try {
      const { data: created, error } = await supabaseAdmin
        .from('sellers')
        .insert({
          name: cleanName,
          email: cleanEmail,
          phone: cleanPhone,
          password_hash: passwordHash,
          role,
          status,
          created_at: now,
          updated_at: now,
        })
        .select('id, name, email, phone, role, status, created_at, updated_at')
        .single();

      if (error) {
        if (error.code === '23505' || error.message?.includes('duplicate key')) {
          throw new Error('Ya existe un usuario registrado con este correo electrónico.');
        }
        throw new Error(`Error en Supabase: ${error.message}`);
      }

      if (created) {
        insertedId = Number(created.id);
      }
    } catch (e: any) {
      if (e.message?.includes('Ya existe')) throw e;
      console.error('Error insertando usuario en Supabase:', e);
    }
  }

  // Sincronizar o crear en SQLite
  try {
    const db = getSqliteDb();
    const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(cleanEmail) as any;
    if (existing) {
      if (!insertedId) {
        throw new Error('Ya existe un usuario registrado con este correo electrónico.');
      }
      // Actualizar registro existente si ya vino de Supabase
      db.prepare(
        `UPDATE sellers 
         SET name = ?, phone = ?, password_hash = ?, role = ?, status = ?, updated_at = ? 
         WHERE email = ?`
      ).run(cleanName, cleanPhone, passwordHash, role, status, now, cleanEmail);
    } else {
      const stmt = db.prepare(`
        INSERT INTO sellers (name, email, phone, password_hash, role, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const info = stmt.run(cleanName, cleanEmail, cleanPhone, passwordHash, role, status, now, now);
      if (!insertedId) {
        insertedId = Number(info.lastInsertRowid);
      }
    }
  } catch (err: any) {
    if (err.message?.includes('UNIQUE constraint failed')) {
      throw new Error('Ya existe un usuario registrado con este correo electrónico.');
    }
    if (!insertedId) throw err;
  }

  return {
    id: insertedId,
    name: cleanName,
    email: cleanEmail,
    phone: cleanPhone,
    role,
    status,
    created_at: now,
    updated_at: now,
  };
}

export async function updateUserAdmin(
  id: number,
  data: {
    name?: string;
    email?: string;
    phone?: string;
    role?: UserRole;
    status?: 'approved' | 'pending' | 'rejected' | 'suspended';
    password?: string;
  }
): Promise<boolean> {
  const now = new Date().toISOString();
  const updates: any = { updated_at: now };

  if (data.name !== undefined) updates.name = data.name.trim();
  if (data.email !== undefined) updates.email = data.email.trim().toLowerCase();
  if (data.phone !== undefined) updates.phone = data.phone.trim();
  if (data.role !== undefined) updates.role = data.role;
  if (data.status !== undefined) updates.status = data.status;
  if (data.password && data.password.trim().length > 0) {
    updates.password_hash = hashSellerPassword(data.password.trim());
  }

  if (isSupabaseConfigured) {
    try {
      const { error } = await supabaseAdmin.from('sellers').update(updates).eq('id', id);
      if (error) {
        console.error('Error actualizando usuario en Supabase:', error);
      }
    } catch (e) {
      console.error('Error actualizando usuario en Supabase:', e);
    }
  }

  // SQLite
  try {
    const sets: string[] = ['updated_at = ?'];
    const params: any[] = [now];

    if (updates.name !== undefined) {
      sets.push('name = ?');
      params.push(updates.name);
    }
    if (updates.email !== undefined) {
      sets.push('email = ?');
      params.push(updates.email);
    }
    if (updates.phone !== undefined) {
      sets.push('phone = ?');
      params.push(updates.phone);
    }
    if (updates.role !== undefined) {
      sets.push('role = ?');
      params.push(updates.role);
    }
    if (updates.status !== undefined) {
      sets.push('status = ?');
      params.push(updates.status);
    }
    if (updates.password_hash !== undefined) {
      sets.push('password_hash = ?');
      params.push(updates.password_hash);
    }

    params.push(id);
    getSqliteDb()
      .prepare(`UPDATE sellers SET ${sets.join(', ')} WHERE id = ?`)
      .run(...params);
    return true;
  } catch (e) {
    console.error('Error actualizando usuario en SQLite:', e);
    return false;
  }
}

export async function deleteUserAdmin(id: number): Promise<boolean> {
  if (isSupabaseConfigured) {
    try {
      await supabaseAdmin.from('sellers').delete().eq('id', id);
    } catch (e) {
      console.error('Error eliminando usuario de Supabase:', e);
    }
  }

  try {
    getSqliteDb().prepare('DELETE FROM sellers WHERE id = ?').run(id);
    return true;
  } catch (e) {
    console.error('Error eliminando usuario de SQLite:', e);
    return false;
  }
}
