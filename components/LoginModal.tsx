'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import {
  Lock,
  Mail,
  User,
  Phone,
  ArrowRight,
  ShieldCheck,
  Briefcase,
  CheckCircle2,
  AlertCircle,
  X,
  Sparkles,
  ShoppingBag,
  Eye,
  EyeOff,
} from 'lucide-react';

export const LoginModal: React.FC = () => {
  const router = useRouter();
  const { isLoginModalOpen, setIsLoginModalOpen, login, user } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Registro de Vendedor
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<{ role: string; name: string; redirect?: string } | null>(null);

  if (!isLoginModalOpen) return null;

  const handleClose = () => {
    setIsLoginModalOpen(false);
    setErrorMsg(null);
    setSuccessInfo(null);
  };

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const result = await login(email, password);
      if (result.success && result.user) {
        const loggedUser = result.user;
        setSuccessInfo({
          role: loggedUser.role,
          name: loggedUser.name,
          redirect: result.redirect,
        });

        // Dar 1.2 segundos para ver la detección de rol y luego cerrar o redirigir
        setTimeout(() => {
          setIsLoginModalOpen(false);
          if (loggedUser.role === 'admin') {
            router.push('/admin');
          }
        }, 1200);
      } else {
        setErrorMsg(result.error || 'Credenciales inválidas');
      }
    } catch {
      setErrorMsg('Error al conectar con el servidor.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setIsLoading(true);

    try {
      const res = await fetch('/api/seller/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: regName,
          email: regEmail,
          phone: regPhone,
          password: regPassword,
        }),
      });
      const data = await res.json();
      if (data.success) {
        // Auto-login después de registrarse
        const loginRes = await login(regEmail, regPassword);
        if (loginRes.success && loginRes.user) {
          setSuccessInfo({
            role: 'vendedor',
            name: loginRes.user.name,
            redirect: '/seller',
          });
          setTimeout(() => {
            setIsLoginModalOpen(false);
          }, 1200);
        } else {
          setTab('login');
          setEmail(regEmail);
        }
      } else {
        setErrorMsg(data.error || 'No se pudo registrar la cuenta');
      }
    } catch {
      setErrorMsg('Error de red al registrar.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fade-in font-sans">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl border border-slate-100 overflow-hidden">
        {/* Botón Cerrar */}
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-500 hover:text-slate-800 flex items-center justify-center transition"
          aria-label="Cerrar modal"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Encabezado */}
        <div className="p-6 pb-4 border-b border-slate-100 bg-gradient-to-b from-slate-50/80 to-white">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow-xs">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <span className="text-xl font-extrabold text-slate-900 font-heading">
              Pide<span className="text-emerald-600">Fácil</span>
            </span>
          </div>
          <h2 className="text-lg font-black text-slate-900 font-heading tracking-tight">
            Acceso Inteligente por Rol
          </h2>
          <p className="text-xs text-slate-500 mt-0.5 font-medium leading-relaxed">
            Inicia sesión y el sistema detectará automáticamente tu rol (<strong>Vendedor COD</strong>, <strong>Administrador</strong> u <strong>Operador</strong>) para mostrarte los precios y herramientas que te corresponden.
          </p>
        </div>

        {/* Pestañas Login vs Registro */}
        <div className="flex p-2 bg-slate-100/80 mx-6 mt-4 rounded-2xl">
          <button
            type="button"
            onClick={() => {
              setTab('login');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              tab === 'login'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Iniciar Sesión
          </button>
          <button
            type="button"
            onClick={() => {
              setTab('register');
              setErrorMsg(null);
            }}
            className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition ${
              tab === 'register'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Crear Cuenta Vendedor
          </button>
        </div>

        {/* Contenido Modal */}
        <div className="p-6 pt-4">
          {/* Alerta de Éxito con Detección de Rol */}
          {successInfo && (
            <div className="mb-4 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 animate-slide-up">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <div>
                  <p className="text-xs font-black">
                    ¡Rol detectado:{' '}
                    <span className="uppercase text-emerald-700 underline font-extrabold">
                      {successInfo.role}
                    </span>
                    !
                  </p>
                  <p className="text-[11px] text-emerald-700 font-medium">
                    Bienvenido, {successInfo.name}. Precios y permisos adaptados correctamente.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Mensaje de Error */}
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* FORMULARIO LOGIN */}
          {tab === 'login' && !successInfo && (
            <form onSubmit={handleLoginSubmit} className="space-y-3.5">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña o Clave Master
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full pl-9 pr-9 py-2 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Entrar y Activar Precios</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* FORMULARIO REGISTRO VENDEDOR */}
          {tab === 'register' && !successInfo && (
            <form onSubmit={handleRegisterSubmit} className="space-y-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Nombre Completo
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    value={regName}
                    onChange={(e) => setRegName(e.target.value)}
                    placeholder="Ej. Juan Pérez"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  WhatsApp / Celular
                </label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="tel"
                    required
                    value={regPhone}
                    onChange={(e) => setRegPhone(e.target.value)}
                    placeholder="300 123 4567"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Correo Electrónico
                </label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    value={regEmail}
                    onChange={(e) => setRegEmail(e.target.value)}
                    placeholder="tu-correo@ejemplo.com"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Contraseña
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Mínimo 6 caracteres"
                    className="w-full pl-9 pr-3 py-2 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-200 rounded-xl focus:border-emerald-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full mt-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-extrabold text-xs rounded-xl shadow-sm flex items-center justify-center gap-2 transition"
              >
                {isLoading ? (
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                ) : (
                  <>
                    <span>Registrarme como Vendedor COD</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </>
                )}
              </button>
            </form>
          )}

          {/* Resumen de Beneficios de Roles */}
          <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1">
              <Briefcase className="w-3.5 h-3.5 text-blue-500" />
              <span>Vendedores: Costos Dropi & Comisiones</span>
            </div>
            <div className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-500" />
              <span>Admin: Control total</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
