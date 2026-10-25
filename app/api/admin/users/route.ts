import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import {
  listUsersAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
  UserRole,
} from '@/lib/seller-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || undefined;
    const role = searchParams.get('role') || undefined;
    const status = searchParams.get('status') || undefined;

    const users = await listUsersAdmin({ search, role, status });
    return NextResponse.json({ success: true, data: users });
  } catch (error: any) {
    console.error('Error listando usuarios en admin:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar lista de usuarios' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { name, email, phone, role, password, status } = body;

    if (!name || typeof name !== 'string' || !name.trim()) {
      return NextResponse.json({ success: false, error: 'El nombre es obligatorio.' }, { status: 400 });
    }

    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return NextResponse.json({ success: false, error: 'Correo electrónico válido requerido.' }, { status: 400 });
    }

    if (!password || typeof password !== 'string' || password.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: 'La contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const validRoles: UserRole[] = ['vendedor', 'admin', 'operador'];
    const assignedRole: UserRole = validRoles.includes(role) ? role : 'vendedor';

    // Por defecto: 'approved' (activo inmediatamente, sin confirmación por correo)
    const validStatuses = ['approved', 'pending', 'suspended'];
    const assignedStatus = validStatuses.includes(status) ? status : 'approved';

    const newUser = await createUserAdmin({
      name: name.trim(),
      email: email.trim(),
      phone: (phone || '').trim(),
      password: password.trim(),
      role: assignedRole,
      status: assignedStatus as any,
    });

    return NextResponse.json({
      success: true,
      data: newUser,
      message: 'Usuario creado exitosamente con credenciales activas (sin confirmación por correo requerida).',
    });
  } catch (error: any) {
    console.error('Error creando usuario desde admin:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al crear usuario' },
      { status: 400 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { id, name, email, phone, role, status, password } = body;

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ success: false, error: 'ID de usuario requerido.' }, { status: 400 });
    }

    if (password !== undefined && password.trim().length > 0 && password.trim().length < 6) {
      return NextResponse.json(
        { success: false, error: 'La nueva contraseña debe tener al menos 6 caracteres.' },
        { status: 400 }
      );
    }

    const updated = await updateUserAdmin(Number(id), {
      name,
      email,
      phone,
      role,
      status,
      password: password ? password.trim() : undefined,
    });

    if (!updated) {
      return NextResponse.json({ success: false, error: 'No se pudo actualizar el usuario.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario y credenciales actualizados con éxito.',
    });
  } catch (error: any) {
    console.error('Error actualizando usuario desde admin:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al actualizar usuario' },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');

    if (!id || isNaN(Number(id))) {
      return NextResponse.json({ success: false, error: 'ID de usuario requerido.' }, { status: 400 });
    }

    const deleted = await deleteUserAdmin(Number(id));
    if (!deleted) {
      return NextResponse.json({ success: false, error: 'No se pudo eliminar el usuario.' }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      message: 'Usuario eliminado exitosamente.',
    });
  } catch (error: any) {
    console.error('Error eliminando usuario desde admin:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al eliminar usuario' },
      { status: 500 }
    );
  }
}
