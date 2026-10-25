import { NextRequest, NextResponse } from 'next/server';
import { hashSellerPassword, createSellerToken, setSellerSessionCookie } from '@/lib/seller-auth';
import { getSqliteDb } from '@/lib/db';
import { supabaseAdmin, isSupabaseConfigured } from '@/lib/supabase';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, email, phone, password } = body;

    if (!name || !email || !phone || !password) {
      return NextResponse.json(
        { success: false, error: 'Todos los campos son obligatorios.' },
        { status: 400 }
      );
    }

    const cleanEmail = String(email).trim().toLowerCase();
    const cleanPhone = String(phone).trim();
    const cleanName = String(name).trim();

    if (password.length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener mínimo 6 caracteres.' },
        { status: 400 }
      );
    }

    const passwordHash = hashSellerPassword(password);
    const now = new Date().toISOString();

    let newId: number | null = null;

    // 1. Supabase
    if (isSupabaseConfigured) {
      try {
        const { data, error } = await supabaseAdmin
          .from('sellers')
          .insert({
            name: cleanName,
            email: cleanEmail,
            phone: cleanPhone,
            password_hash: passwordHash,
            status: 'pending', // Requiere aprobación del admin
            created_at: now,
            updated_at: now,
          })
          .select('id')
          .single();

        if (error) {
          if (error.code === '23505') {
            return NextResponse.json(
              { success: false, error: 'El correo electrónico ya está registrado como vendedor.' },
              { status: 409 }
            );
          }
          throw error;
        }
        if (data) newId = Number(data.id);
      } catch (err: any) {
        console.warn('Error registrando vendedor en Supabase:', err.message);
      }
    }

    // 2. SQLite
    try {
      const db = getSqliteDb();
      const existing = db.prepare('SELECT id FROM sellers WHERE email = ?').get(cleanEmail);
      if (existing) {
        return NextResponse.json(
          { success: false, error: 'El correo electrónico ya está registrado como vendedor.' },
          { status: 409 }
        );
      }
      const info = db
        .prepare(
          'INSERT INTO sellers (name, email, phone, password_hash, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?)'
        )
        .run(cleanName, cleanEmail, cleanPhone, passwordHash, 'pending', now, now);
      if (!newId) newId = Number(info.lastInsertRowid);
    } catch (err: any) {
      console.warn('Error registrando vendedor en SQLite:', err.message);
    }

    if (!newId) {
      return NextResponse.json(
        { success: false, error: 'No se pudo crear la cuenta de vendedor.' },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: 'Cuenta creada exitosamente. Tu cuenta está pendiente de aprobación por el administrador.',
      seller: {
        id: newId,
        name: cleanName,
        email: cleanEmail,
        status: 'pending',
      },
    });
  } catch (error: any) {
    console.error('Error in seller register:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al procesar registro' },
      { status: 500 }
    );
  }
}
