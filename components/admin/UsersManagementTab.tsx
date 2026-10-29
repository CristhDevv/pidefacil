'use client';

import React, { useState, useEffect, useMemo } from 'react';
import {
  Users,
  UserPlus,
  ShieldCheck,
  Briefcase,
  Package,
  Key,
  Lock,
  Eye,
  EyeOff,
  Search,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Edit2,
  Trash2,
  X,
  Check,
  Phone,
  Mail,
  User,
  Sparkles,
} from 'lucide-react';

export interface UserItem {
  id: number;
  name: string;
  email: string;
  phone: string;
  role: 'admin' | 'vendedor' | 'operador';
  status: 'approved' | 'pending' | 'rejected' | 'suspended';
  created_at: string;
  updated_at: string;
}

export function UsersManagementTab() {
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('todos');
  const [statusFilter, setStatusFilter] = useState<string>('todos');

  // Modales
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedUserForPassword, setSelectedUserForPassword] = useState<UserItem | null>(null);
  const [selectedUserForEdit, setSelectedUserForEdit] = useState<UserItem | null>(null);

  // Formulario Crear Usuario
  const [createName, setCreateName] = useState('');
  const [createEmail, setCreateEmail] = useState('');
  const [createPhone, setCreatePhone] = useState('');
  const [createRole, setCreateRole] = useState<'admin' | 'vendedor' | 'operador'>('vendedor');
  const [createPassword, setCreatePassword] = useState('');
  const [showCreatePassword, setShowCreatePassword] = useState(false);
  const [createStatus, setCreateStatus] = useState<'approved' | 'pending' | 'suspended'>('approved');

  // Formulario Cambiar Contraseña
  const [newPassword, setNewPassword] = useState('');
  const [showNewPassword, setShowNewPassword] = useState(false);

  // Formulario Editar Usuario
  const [editName, setEditName] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editRole, setEditRole] = useState<'admin' | 'vendedor' | 'operador'>('vendedor');
  const [editStatus, setEditStatus] = useState<'approved' | 'pending' | 'suspended'>('approved');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionMessage, setActionMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      }
    } catch (e) {
      console.error('Error cargando usuarios:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Generador de contraseñas seguras
  const generateRandomPassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789!@#$';
    let pwd = 'PF-';
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return pwd;
  };

  // KPIs
  const totalUsers = users.length;
  const sellersCount = users.filter((u) => u.role === 'vendedor').length;
  const adminsCount = users.filter((u) => u.role === 'admin').length;
  const operatorsCount = users.filter((u) => u.role === 'operador').length;

  // Filtrado de usuarios
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      if (roleFilter !== 'todos' && u.role !== roleFilter) return false;
      if (statusFilter !== 'todos' && u.status !== statusFilter) return false;
      if (!searchQuery.trim()) return true;

      const q = searchQuery.toLowerCase().trim();
      return (
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q)
      );
    });
  }, [users, roleFilter, statusFilter, searchQuery]);

  // Handler: Crear usuario
  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: createName,
          email: createEmail,
          phone: createPhone,
          role: createRole,
          password: createPassword,
          status: createStatus,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionMessage({
          type: 'success',
          text: `Usuario "${createName}" creado con éxito. Ya puede iniciar sesión de inmediato con su clave asignada.`,
        });
        setIsCreateModalOpen(false);
        // Reset campos
        setCreateName('');
        setCreateEmail('');
        setCreatePhone('');
        setCreatePassword('');
        setCreateRole('vendedor');
        setCreateStatus('approved');
        loadUsers();
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Error al crear usuario' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error de red al crear usuario' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Actualizar contraseña
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForPassword) return;

    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUserForPassword.id,
          password: newPassword,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionMessage({
          type: 'success',
          text: `Contraseña actualizada con éxito para ${selectedUserForPassword.email}. El usuario ya puede usar su nueva clave.`,
        });
        setSelectedUserForPassword(null);
        setNewPassword('');
        loadUsers();
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Error al cambiar contraseña' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error de red al actualizar contraseña' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Editar rol y estado
  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserForEdit) return;

    setIsSubmitting(true);
    setActionMessage(null);

    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUserForEdit.id,
          name: editName,
          phone: editPhone,
          role: editRole,
          status: editStatus,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setActionMessage({
          type: 'success',
          text: `Usuario ${editName} actualizado con éxito.`,
        });
        setSelectedUserForEdit(null);
        loadUsers();
      } else {
        setActionMessage({ type: 'error', text: json.error || 'Error al actualizar usuario' });
      }
    } catch {
      setActionMessage({ type: 'error', text: 'Error de red al actualizar usuario' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handler: Eliminar usuario
  const handleDeleteUser = async (user: UserItem) => {
    if (!confirm(`¿Estás seguro de eliminar al usuario ${user.name} (${user.email})? Esta acción es irreversible.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/admin/users?id=${user.id}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (json.success) {
        setActionMessage({ type: 'success', text: `Usuario ${user.email} eliminado exitosamente.` });
        loadUsers();
      } else {
        alert(json.error || 'No se pudo eliminar el usuario');
      }
    } catch {
      alert('Error de red al eliminar usuario');
    }
  };

  return (
    <div className="space-y-6">
      {/* Mensaje de feedback global */}
      {actionMessage && (
        <div
          className={`p-4 rounded-2xl border text-xs font-bold flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-red-50 text-red-800 border-red-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button onClick={() => setActionMessage(null)} className="text-slate-400 hover:text-slate-700">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner & Botón Crear */}
      <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-600">
              <Users className="w-4 h-4 stroke-[2.5]" />
            </div>
            <h2 className="text-base font-black text-slate-900">Gestión de Usuarios & Roles</h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Crea usuarios con contraseñas personalizadas y asignación de roles. Quedan <strong>activos de inmediato</strong> sin confirmación por correo.
          </p>
        </div>

        <button
          onClick={() => {
            setCreatePassword(generateRandomPassword());
            setIsCreateModalOpen(true);
          }}
          className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center gap-2 flex-shrink-0 active:scale-95"
        >
          <UserPlus className="w-4 h-4" />
          <span>Crear Nuevo Usuario</span>
        </button>
      </div>

      {/* KPIs Rápidos */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500">Total Usuarios</p>
          <p className="text-2xl font-black text-slate-900 mt-0.5">{totalUsers}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Briefcase className="w-3 h-3 text-emerald-600" />
            <span>Vendedores</span>
          </p>
          <p className="text-2xl font-black text-emerald-600 mt-0.5">{sellersCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3 text-indigo-600" />
            <span>Administradores</span>
          </p>
          <p className="text-2xl font-black text-indigo-600 mt-0.5">{adminsCount}</p>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
          <p className="text-[11px] font-semibold text-slate-500 flex items-center gap-1">
            <Package className="w-3 h-3 text-blue-600" />
            <span>Operadores</span>
          </p>
          <p className="text-2xl font-black text-blue-600 mt-0.5">{operatorsCount}</p>
        </div>
      </div>

      {/* Barra de Filtros & Búsqueda */}
      <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, correo o celular..."
              className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            {/* Filtro por Rol */}
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todos">Todos los Roles</option>
              <option value="vendedor">Solo Vendedores</option>
              <option value="admin">Solo Administradores</option>
              <option value="operador">Solo Operadores</option>
            </select>

            {/* Filtro por Estado */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
            >
              <option value="todos">Todos los Estados</option>
              <option value="approved">Activos (Approved)</option>
              <option value="pending">Pendientes</option>
              <option value="suspended">Suspendidos</option>
            </select>

            <button
              onClick={loadUsers}
              disabled={isLoading}
              className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-xl transition"
              title="Recargar usuarios"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Listado de Usuarios */}
      {isLoading ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
          <p className="text-xs font-bold text-slate-500">Cargando directorio de usuarios...</p>
        </div>
      ) : filteredUsers.length === 0 ? (
        <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
          <Users className="w-10 h-10 text-slate-300 mx-auto mb-2" />
          <p className="text-sm font-bold text-slate-700">No se encontraron usuarios</p>
          <p className="text-xs text-slate-400 mt-1">Prueba con otros términos de búsqueda o filtros.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredUsers.map((u) => {
            const roleBadge = {
              admin: {
                label: 'Administrador',
                bg: 'bg-indigo-50 text-indigo-800 border-indigo-200',
                icon: ShieldCheck,
              },
              vendedor: {
                label: 'Vendedor',
                bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
                icon: Briefcase,
              },
              operador: {
                label: 'Operador Logístico',
                bg: 'bg-blue-50 text-blue-800 border-blue-200',
                icon: Package,
              },
            }[u.role] || {
              label: u.role,
              bg: 'bg-slate-100 text-slate-800 border-slate-200',
              icon: User,
            };

            const RoleIcon = roleBadge.icon;

            return (
              <div
                key={u.id}
                className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
              >
                {/* Datos del Usuario */}
                <div className="flex items-center gap-3.5 min-w-0 flex-1">
                  <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-slate-100 to-slate-200 border border-slate-200 flex items-center justify-center text-slate-700 font-black text-sm flex-shrink-0">
                    {u.name
                      .split(' ')
                      .map((n) => n[0])
                      .slice(0, 2)
                      .join('')
                      .toUpperCase() || 'U'}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="text-xs sm:text-sm font-black text-slate-900 truncate">{u.name}</h4>

                      {/* Badge de Rol */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border inline-flex items-center gap-1 ${roleBadge.bg}`}
                      >
                        <RoleIcon className="w-3 h-3 stroke-[2.5]" />
                        <span>{roleBadge.label}</span>
                      </span>

                      {/* Badge de Estado */}
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                          u.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            : u.status === 'pending'
                            ? 'bg-amber-100 text-amber-800 border-amber-200'
                            : 'bg-red-100 text-red-800 border-red-200'
                        }`}
                      >
                        {u.status === 'approved' ? '● Activo' : u.status === 'pending' ? '● Pendiente' : '● Suspendido'}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 mt-1">
                      <span className="flex items-center gap-1 font-mono">
                        <Mail className="w-3 h-3 text-slate-400" />
                        <span>{u.email}</span>
                      </span>
                      {u.phone && (
                        <span className="flex items-center gap-1">
                          <Phone className="w-3 h-3 text-slate-400" />
                          <span>{u.phone}</span>
                        </span>
                      )}
                      <span className="text-[10px] text-slate-400">
                        Registrado: {new Date(u.created_at).toLocaleDateString('es-CO')}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Acciones */}
                <div className="flex items-center gap-2 self-end sm:self-center flex-shrink-0">
                  {/* Botón: Cambiar Contraseña */}
                  <button
                    onClick={() => {
                      setSelectedUserForPassword(u);
                      setNewPassword(generateRandomPassword());
                      setShowNewPassword(true);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-amber-50 text-slate-700 hover:text-amber-800 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-slate-200/60"
                    title="Definir nueva contraseña directamente"
                  >
                    <Key className="w-3.5 h-3.5 text-amber-600" />
                    <span className="hidden sm:inline">Contraseña</span>
                  </button>

                  {/* Botón: Editar Rol / Estado */}
                  <button
                    onClick={() => {
                      setSelectedUserForEdit(u);
                      setEditName(u.name);
                      setEditPhone(u.phone || '');
                      setEditRole(u.role);
                      setEditStatus(u.status as any);
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition flex items-center gap-1 border border-slate-200/60"
                    title="Editar datos, rol o estado"
                  >
                    <Edit2 className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Editar</span>
                  </button>

                  {/* Botón: Eliminar */}
                  <button
                    onClick={() => handleDeleteUser(u)}
                    className="p-1.5 text-slate-400 hover:text-red-700 hover:bg-red-50 rounded-xl transition border border-transparent hover:border-red-200"
                    title="Eliminar usuario"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 1: CREAR NUEVO USUARIO                                         */}
      {/* ==================================================================== */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-lg shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/30 flex items-center justify-center text-emerald-400">
                  <UserPlus className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Crear Usuario & Rol</h3>
                  <p className="text-[11px] text-slate-300">Activo inmediatamente sin confirmación por correo</p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nombre Completo *</label>
                <input
                  type="text"
                  required
                  placeholder="Ej: Carlos Gómez"
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Correo Electrónico *</label>
                  <input
                    type="email"
                    required
                    placeholder="usuario@pidefacil.co"
                    value={createEmail}
                    onChange={(e) => setCreateEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-1">Celular / WhatsApp</label>
                  <input
                    type="tel"
                    placeholder="Ej: 3001234567"
                    value={createPhone}
                    onChange={(e) => setCreatePhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              {/* Selector de Rol */}
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1.5">Rol del Usuario *</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setCreateRole('vendedor')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      createRole === 'vendedor'
                        ? 'bg-emerald-50 border-emerald-500 text-emerald-900 ring-2 ring-emerald-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Briefcase className="w-4 h-4 text-emerald-600 mb-1" />
                    <span className="text-xs font-black block">Vendedor</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      Cotizador de Fletes & Despachos
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateRole('admin')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      createRole === 'admin'
                        ? 'bg-indigo-50 border-indigo-500 text-indigo-900 ring-2 ring-indigo-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <ShieldCheck className="w-4 h-4 text-indigo-600 mb-1" />
                    <span className="text-xs font-black block">Administrador</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      Acceso total a panel /admin
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setCreateRole('operador')}
                    className={`p-3 rounded-2xl border text-left transition flex flex-col justify-between ${
                      createRole === 'operador'
                        ? 'bg-blue-50 border-blue-500 text-blue-900 ring-2 ring-blue-500/20'
                        : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                    }`}
                  >
                    <Package className="w-4 h-4 text-blue-600 mb-1" />
                    <span className="text-xs font-black block">Operador</span>
                    <span className="text-[10px] text-slate-500 leading-tight block mt-0.5">
                      Despachos y logística COD
                    </span>
                  </button>
                </div>
              </div>

              {/* Contraseña asignada */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">Contraseña Asignada *</label>
                  <button
                    type="button"
                    onClick={() => setCreatePassword(generateRandomPassword())}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar Clave Aleatoria</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showCreatePassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres..."
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCreatePassword(!showCreatePassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showCreatePassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Mensaje de confirmación instantánea */}
              <div className="p-3 bg-emerald-50 border border-emerald-200/80 rounded-2xl flex items-start gap-2.5">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0 mt-0.5" />
                <div className="text-[11px] text-emerald-900 leading-tight">
                  <strong>Sin confirmación por correo:</strong> El usuario se crea en estado <strong>Activo</strong> con su contraseña encriptada (PBKDF2/SHA-512) y puede ingresar de inmediato.
                </div>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !createName.trim() || !createEmail.trim() || !createPassword.trim()}
                  className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs active:scale-95"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Creando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Crear Usuario Activo</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 2: CAMBIAR CONTRASEÑA DIRECTAMENTE                             */}
      {/* ==================================================================== */}
      {selectedUserForPassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 border border-amber-400/30 flex items-center justify-center text-amber-400">
                  <Key className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Cambiar Contraseña</h3>
                  <p className="text-[11px] text-slate-300">{selectedUserForPassword.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForPassword(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleUpdatePassword} className="p-6 space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800">Nueva Contraseña *</label>
                  <button
                    type="button"
                    onClick={() => setNewPassword(generateRandomPassword())}
                    className="text-[11px] font-bold text-emerald-700 hover:underline flex items-center gap-1"
                  >
                    <Sparkles className="w-3 h-3" />
                    <span>Generar Aleatoria</span>
                  </button>
                </div>

                <div className="relative">
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Ingresa la nueva clave..."
                    className="w-full px-3.5 py-2.5 text-xs font-mono font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-amber-500 pr-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNewPassword(!showNewPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 p-1"
                  >
                    {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Se actualizará de inmediato en la base de datos sin enviar correos de confirmación.
                </p>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForPassword(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting || !newPassword.trim()}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Actualizando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Contraseña</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================================================================== */}
      {/* MODAL 3: EDITAR USUARIO (ROL & ESTADO)                                */}
      {/* ==================================================================== */}
      {selectedUserForEdit && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs">
          <div className="bg-white rounded-3xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-blue-500/20 border border-blue-400/30 flex items-center justify-center text-blue-400">
                  <Edit2 className="w-4 h-4 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white">Editar Usuario</h3>
                  <p className="text-[11px] text-slate-300">{selectedUserForEdit.email}</p>
                </div>
              </div>
              <button
                onClick={() => setSelectedUserForEdit(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Nombre</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Teléfono</label>
                <input
                  type="tel"
                  value={editPhone}
                  onChange={(e) => setEditPhone(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs font-semibold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Rol</label>
                <select
                  value={editRole}
                  onChange={(e) => setEditRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="vendedor">💼 Vendedor</option>
                  <option value="admin">🛡️ Administrador</option>
                  <option value="operador">📦 Operador Logístico</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">Estado</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 text-xs font-bold bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="approved">🟢 Activo (Aprobado)</option>
                  <option value="pending">🟡 Pendiente</option>
                  <option value="suspended">🔴 Suspendido</option>
                </select>
              </div>

              <div className="pt-3 flex items-center justify-end gap-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setSelectedUserForEdit(null)}
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 bg-blue-600 hover:bg-blue-500 text-white text-xs font-black rounded-xl transition flex items-center gap-1.5 shadow-xs"
                >
                  {isSubmitting ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Guardando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="w-3.5 h-3.5" />
                      <span>Guardar Cambios</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
