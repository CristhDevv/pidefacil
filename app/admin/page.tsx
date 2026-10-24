'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { formatCOP } from '@/config/pricing';
import { getProductDisplayImageUrl } from '@/lib/image-url';
import { ImageModerationTab } from '@/components/admin/ImageModerationTab';
import {
  Package,
  Sliders,
  Database,
  CheckCircle2,
  Clock,
  Truck,
  AlertTriangle,
  ArrowLeft,
  RefreshCw,
  Save,
  Copy,
  Check,
  MessageCircle,
  ShieldCheck,
  Flame,
  Search,
  Lock,
  LogOut,
  Eye,
  EyeOff,
  ExternalLink,
  Download,
  BarChart3,
  Settings,
  Filter,
  Phone,
  MapPin,
  User,
  DollarSign,
  Store,
  Tag,
  Sparkles,
  ShoppingBag,
  Layers,
  Bot,
  Zap,
  Key,
} from 'lucide-react';

export default function AdminPage() {
  // --- AUTENTICACIÓN ---
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [passwordInput, setPasswordInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // --- NAVEGACIÓN DE PESTAÑAS ---
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'moderation' | 'metrics' | 'settings'>('orders');

  // --- DATOS GLOBALES ---
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [heartbeat, setHeartbeat] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // --- FILTROS DE PEDIDOS ---
  const [orderStatusFilter, setOrderStatusFilter] = useState('todos');
  const [orderSearchQuery, setOrderSearchQuery] = useState('');
  const [copiedOrderId, setCopiedOrderId] = useState<number | null>(null);
  const [updatingOrderId, setUpdatingOrderId] = useState<number | null>(null);
  const [orderNotesInput, setOrderNotesInput] = useState<Record<number, string>>({});
  const [orderDropiIdInput, setOrderDropiIdInput] = useState<Record<number, string>>({});

  // --- GESTIÓN DE PRODUCTOS ---
  const [adminProducts, setAdminProducts] = useState<any[]>([]);
  const [productSearch, setProductSearch] = useState('');
  const [productStatusFilter, setProductStatusFilter] = useState<'todos' | 'activos' | 'inactivos'>('todos');
  const [isLoadingProducts, setIsLoadingProducts] = useState(false);
  const [updatingProductId, setUpdatingProductId] = useState<number | null>(null);
  const [productPage, setProductPage] = useState(1);
  const [productTotal, setProductTotal] = useState(0);

  // --- AJUSTES COMERCIALES ---
  const [marginInput, setMarginInput] = useState<number>(55000);
  const [storeNameInput, setStoreNameInput] = useState('PideFácil');
  const [whatsappInput, setWhatsappInput] = useState('573009123456');
  const [geminiApiKeyInput, setGeminiApiKeyInput] = useState('');
  const [showGeminiKey, setShowGeminiKey] = useState(false);
  const [isTestingAi, setIsTestingAi] = useState(false);
  const [aiTestResult, setAiTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [settingsSuccessMsg, setSettingsSuccessMsg] = useState<string | null>(null);

  // 1. Verificar sesión activa al montar
  useEffect(() => {
    async function checkSession() {
      try {
        const res = await fetch('/api/admin/auth/session');
        const json = await res.json();
        setIsAuthenticated(Boolean(json.authenticated));
      } catch {
        setIsAuthenticated(false);
      }
    }
    checkSession();
  }, []);

  // 2. Cargar datos cuando esté autenticado
  const loadAdminData = async () => {
    setIsLoading(true);
    try {
      // Configuración y stats
      const settingsRes = await fetch('/api/admin/settings');
      if (settingsRes.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const settingsJson = await settingsRes.json();
      if (settingsJson.success) {
        setStats(settingsJson.stats);
        setSettings(settingsJson.settings);
        setHeartbeat(settingsJson.heartbeat);
        setMarginInput(settingsJson.settings.margin_base_cop);
        setStoreNameInput(settingsJson.settings.store_name || 'PideFácil');
        setWhatsappInput(settingsJson.settings.whatsapp_number || '573009123456');
        setGeminiApiKeyInput(settingsJson.settings.gemini_api_key || '');
      }

      // Pedidos
      const ordersRes = await fetch('/api/orders');
      const ordersJson = await ordersRes.json();
      if (ordersJson.success) {
        setOrders(ordersJson.data);
      }
    } catch (err) {
      console.error('Error cargando datos de admin:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      loadAdminData();
    }
  }, [isAuthenticated]);

  // Cargar productos cuando se abre la pestaña de productos
  const loadAdminProducts = async (page = 1, search = productSearch, status = productStatusFilter) => {
    setIsLoadingProducts(true);
    try {
      const res = await fetch(
        `/api/admin/products?page=${page}&limit=20&search=${encodeURIComponent(search)}&status=${status}`
      );
      if (res.status === 401) {
        setIsAuthenticated(false);
        return;
      }
      const json = await res.json();
      if (json.success) {
        setAdminProducts(json.data);
        setProductTotal(json.pagination?.total || 0);
        setProductPage(page);
      }
    } catch (err) {
      console.error('Error cargando productos admin:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated && activeTab === 'products') {
      loadAdminProducts(1, productSearch, productStatusFilter);
    }
  }, [isAuthenticated, activeTab]);

  // Handler de Login
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setAuthError(null);
    try {
      const res = await fetch('/api/admin/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: passwordInput }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAuthenticated(true);
        setPasswordInput('');
      } else {
        setAuthError(json.error || 'Contraseña incorrecta');
      }
    } catch {
      setAuthError('Error de conexión al iniciar sesión');
    } finally {
      setIsLoggingIn(false);
    }
  };

  // Handler de Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/admin/auth/logout', { method: 'POST' });
    } catch {}
    setIsAuthenticated(false);
  };

  // Handler para actualizar estado de un pedido
  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    setUpdatingOrderId(orderId);
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: newStatus,
          notes: orderNotesInput[orderId] !== undefined ? orderNotesInput[orderId] : undefined,
          dropi_order_id: orderDropiIdInput[orderId] ? Number(orderDropiIdInput[orderId]) : undefined,
        }),
      });
      const json = await res.json();
      if (json.success) {
        // Actualizar estado local
        setOrders((prev) =>
          prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
        );
      } else {
        alert(json.error || 'Error al actualizar pedido');
      }
    } catch {
      alert('Error de red al actualizar pedido');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handler para guardar notas / id dropi de un pedido
  const handleSaveOrderMeta = async (orderId: number) => {
    setUpdatingOrderId(orderId);
    try {
      const currentOrder = orders.find((o) => o.id === orderId);
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: currentOrder?.status || 'pendiente_despacho',
          notes: orderNotesInput[orderId] ?? currentOrder?.notes ?? null,
          dropi_order_id: orderDropiIdInput[orderId] ? Number(orderDropiIdInput[orderId]) : currentOrder?.dropi_order_id ?? null,
        }),
      });
      const json = await res.json();
      if (json.success) {
        alert('Datos de seguimiento Dropi guardados con éxito');
        loadAdminData();
      }
    } catch {
      alert('Error al guardar datos de seguimiento');
    } finally {
      setUpdatingOrderId(null);
    }
  };

  // Handler para alternar estado de producto (Activar / Desactivar)
  const handleToggleProductActive = async (id_dropi: number, currentActive: number) => {
    setUpdatingProductId(id_dropi);
    const newActive = currentActive === 1 ? 0 : 1;
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_dropi,
          is_active: newActive,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAdminProducts((prev) =>
          prev.map((p) => (p.id_dropi === id_dropi ? { ...p, is_active: newActive } : p))
        );
      } else {
        alert(json.error || 'Error al actualizar producto');
      }
    } catch {
      alert('Error de red al actualizar producto');
    } finally {
      setUpdatingProductId(null);
    }
  };

  // Handler para cambiar prioridad de visualización
  const handleChangePriority = async (id_dropi: number, newPriority: number) => {
    setUpdatingProductId(id_dropi);
    try {
      const res = await fetch('/api/admin/products', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id_dropi,
          display_priority: newPriority,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setAdminProducts((prev) =>
          prev.map((p) => (p.id_dropi === id_dropi ? { ...p, display_priority: newPriority } : p))
        );
      }
    } catch {
      alert('Error al cambiar prioridad');
    } finally {
      setUpdatingProductId(null);
    }
  };

  // Copiar datos formateados para montar en Dropi
  const handleCopyForDropi = (order: any) => {
    const item = order.items?.[0] || {};
    const dropiText = `DESTINATARIO: ${order.customer_name}
CELULAR / WHATSAPP: ${order.customer_phone}
DEPARTAMENTO: ${order.department}
CIUDAD: ${order.city}
BARRIO: ${order.neighborhood}
DIRECCIÓN EXACTA: ${order.address}
PUNTO DE REFERENCIA: ${order.reference_point}
PRODUCTO: ${item.name || 'N/A'} (ID Dropi: ${item.id_dropi || 'N/A'})
CANTIDAD: ${order.quantity_type === '2x' ? '2 Unidades (Dúo Pack)' : '1 Unidad'}
VARIACIÓN / TALLA: ${item.variation || 'Estándar'}
VALOR A RECAUDAR EN EFECTIVO: ${formatCOP(order.total_cop)}
CÓDIGO PEDIDO PIDEFÁCIL: ${order.order_number}`;

    navigator.clipboard.writeText(dropiText).then(() => {
      setCopiedOrderId(order.id);
      setTimeout(() => setCopiedOrderId(null), 2500);
    });
  };

  // Exportar pedidos a CSV
  const handleExportOrdersCsv = () => {
    if (orders.length === 0) {
      alert('No hay pedidos para exportar');
      return;
    }
    const headers = [
      'Orden',
      'Fecha',
      'Cliente',
      'Celular',
      'Departamento',
      'Ciudad',
      'Barrio',
      'Direccion',
      'Referencia',
      'Producto',
      'Cantidad',
      'Variacion',
      'Total_COP',
      'Estado',
      'ID_Dropi',
      'Notas',
    ];

    const rows = orders.map((o) => {
      const item = o.items?.[0] || {};
      return [
        `"${o.order_number}"`,
        `"${o.created_at?.slice(0, 19)}"`,
        `"${(o.customer_name || '').replace(/"/g, '""')}"`,
        `"${o.customer_phone || ''}"`,
        `"${o.department || ''}"`,
        `"${o.city || ''}"`,
        `"${(o.neighborhood || '').replace(/"/g, '""')}"`,
        `"${(o.address || '').replace(/"/g, '""')}"`,
        `"${(o.reference_point || '').replace(/"/g, '""')}"`,
        `"${(item.name || '').replace(/"/g, '""')}"`,
        `"${o.quantity_type === '2x' ? '2 Unidades' : '1 Unidad'}"`,
        `"${(item.variation || '').replace(/"/g, '""')}"`,
        o.total_cop,
        `"${o.status}"`,
        `"${o.dropi_order_id || ''}"`,
        `"${(o.notes || '').replace(/"/g, '""')}"`,
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,\uFEFF' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `PideFacil_Pedidos_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Guardar configuración general
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSettings(true);
    setSettingsSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          margin_base_cop: Number(marginInput),
          store_name: storeNameInput.trim(),
          whatsapp_number: whatsappInput.trim(),
          gemini_api_key: geminiApiKeyInput.trim(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSettingsSuccessMsg('Configuración comercial y Motor IA actualizados con éxito.');
        setTimeout(() => setSettingsSuccessMsg(null), 4000);
        loadAdminData();
      } else {
        alert(json.error || 'Error al guardar configuración');
      }
    } catch {
      alert('Error de red al guardar configuración');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Probar conexión con Google Gemini AI
  const handleTestAi = async () => {
    setIsTestingAi(true);
    setAiTestResult(null);
    try {
      const res = await fetch('/api/admin/ai/test-key', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: geminiApiKeyInput.trim() }),
      });
      const data = await res.json();
      if (data.success) {
        setAiTestResult({ success: true, message: data.message });
      } else {
        setAiTestResult({ success: false, message: data.error || 'Error al conectar' });
      }
    } catch {
      setAiTestResult({ success: false, message: 'Error de red al probar conexión con Google AI' });
    } finally {
      setIsTestingAi(false);
    }
  };

  // --- FILTRADO DE PEDIDOS ---
  const filteredOrders = useMemo(() => {
    return orders.filter((o) => {
      const matchStatus = orderStatusFilter === 'todos' || o.status === orderStatusFilter;
      if (!matchStatus) return false;

      if (!orderSearchQuery.trim()) return true;
      const q = orderSearchQuery.toLowerCase().trim();
      const name = (o.customer_name || '').toLowerCase();
      const phone = (o.customer_phone || '').toLowerCase();
      const orderNum = (o.order_number || '').toLowerCase();
      const city = (o.city || '').toLowerCase();
      const itemTitle = (o.items?.[0]?.name || '').toLowerCase();

      return (
        name.includes(q) ||
        phone.includes(q) ||
        orderNum.includes(q) ||
        city.includes(q) ||
        itemTitle.includes(q)
      );
    });
  }, [orders, orderStatusFilter, orderSearchQuery]);

  // Cálculos KPIs
  const totalRevenue = orders.reduce((sum, o) => sum + (o.total_cop || 0), 0);
  const pendingOrdersCount = orders.filter((o) => o.status === 'pendiente_despacho').length;
  const inTransitCount = orders.filter((o) => o.status === 'en_transito' || o.status === 'subido_a_dropi').length;
  const deliveredCount = orders.filter((o) => o.status === 'entregado').length;

  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  const ordersToday = orders.filter((o) => o.created_at?.startsWith(todayStr)).length;

  // --------------------------------------------------------------------------
  // ESTADO: PANTALLA DE CARGA INICIAL
  // --------------------------------------------------------------------------
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center p-4">
        <div className="text-center text-white">
          <div className="w-10 h-10 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-xs font-bold text-slate-400">Verificando sesión segura...</p>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ESTADO: PANTALLA DE LOGIN CON CONTRASEÑA
  // --------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-4 text-white">
        <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 sm:p-8 shadow-2xl">
          <div className="text-center mb-6">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-emerald-400 flex items-center justify-center mx-auto mb-3 shadow-lg shadow-emerald-500/20">
              <Lock className="w-7 h-7 text-white stroke-[2.5]" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white">
              Panel Administrativo
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              Acceso exclusivo para el equipo de PideFácil.co
            </p>
          </div>

          {authError && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-2 text-xs text-red-400 font-semibold">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{authError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">
                Contraseña de Administrador
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={passwordInput}
                  onChange={(e) => setPasswordInput(e.target.value)}
                  placeholder="Ingresa la clave maestra..."
                  required
                  autoFocus
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition p-1"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoggingIn || !passwordInput.trim()}
              className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-3 px-4 rounded-xl shadow-lg shadow-emerald-600/30 transition flex items-center justify-center gap-2 text-sm active:scale-[0.98]"
            >
              {isLoggingIn ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Validando credenciales...</span>
                </>
              ) : (
                <span>Ingresar al Sistema</span>
              )}
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-white/10 text-center">
            <Link
              href="/"
              className="text-xs text-slate-400 hover:text-emerald-400 transition inline-flex items-center gap-1 font-semibold"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Volver a la tienda pública</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // --------------------------------------------------------------------------
  // ESTADO: DASHBOARD COMPLETO (AUTENTICADO)
  // --------------------------------------------------------------------------
  return (
    <div className="min-h-screen bg-[#F8FAFC] text-slate-900 pb-16">
      {/* Top Bar Superior */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white font-black text-sm shadow-xs hover:bg-emerald-700 transition"
              title="Ir a la tienda"
            >
              PF
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm sm:text-base font-black text-slate-900 leading-none">
                  PideFácil • Panel de Control
                </h1>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-200 hidden sm:inline-block">
                  Sesión Admin Activa
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Gestión operativa Dropi COD & Catálogo Colombia
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/"
              target="_blank"
              className="hidden sm:flex items-center gap-1 px-3 py-1.5 text-xs font-bold text-slate-600 hover:text-emerald-700 bg-slate-100 hover:bg-emerald-50 rounded-xl transition"
            >
              <span>Ver Tienda</span>
              <ExternalLink className="w-3 h-3" />
            </Link>

            <button
              onClick={loadAdminData}
              disabled={isLoading}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
              title="Refrescar datos"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Actualizar</span>
            </button>

            <button
              onClick={handleLogout}
              className="flex items-center gap-1 px-3 py-1.5 bg-red-50 hover:bg-red-100 text-red-700 text-xs font-bold rounded-xl border border-red-200/60 transition"
              title="Cerrar sesión"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Pestañas Principales de Gestión */}
        <div className="max-w-7xl mx-auto px-4 flex gap-1 sm:gap-2 overflow-x-auto no-scrollbar border-t border-slate-100">
          <button
            onClick={() => setActiveTab('orders')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Gestión de Pedidos</span>
            {pendingOrdersCount > 0 && (
              <span className="ml-1 px-1.5 py-0.2 bg-amber-500 text-white text-[10px] font-black rounded-full">
                {pendingOrdersCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('products')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'products'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>Catálogo & Productos</span>
            <span className="text-[10px] text-slate-400 font-semibold hidden sm:inline">
              (232k+)
            </span>
          </button>

          <button
            onClick={() => setActiveTab('moderation')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'moderation'
                ? 'border-rose-600 text-rose-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <ShieldCheck className="w-4 h-4 text-rose-600" />
            <span>🖼️ Moderación Fotos (OCR)</span>
          </button>

          <button
            onClick={() => setActiveTab('metrics')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'metrics'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            <span>Métricas & Auditoría</span>
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold border-b-2 transition whitespace-nowrap ${
              activeTab === 'settings'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Settings className="w-4 h-4" />
            <span>Ajustes Comerciales</span>
          </button>
        </div>
      </header>

      {/* Contenido Principal según Pestaña */}
      <main className="max-w-7xl mx-auto px-4 py-5 space-y-6">
        {/* ==================================================================== */}
        {/* PESTAÑA 1: GESTIÓN DE PEDIDOS COD                                   */}
        {/* ==================================================================== */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            {/* KPI Rápido de Pedidos */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">Pedidos Hoy (Bogotá)</p>
                <p className="text-xl font-black text-slate-900 mt-0.5">{ordersToday}</p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">Pendientes por Montar</p>
                <p className="text-xl font-black text-amber-600 mt-0.5">{pendingOrdersCount}</p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">En Tránsito / Dropi</p>
                <p className="text-xl font-black text-blue-600 mt-0.5">{inTransitCount}</p>
              </div>
              <div className="bg-white p-3.5 rounded-2xl border border-slate-200/80 shadow-xs">
                <p className="text-[11px] font-semibold text-slate-500">Recaudo Proyectado</p>
                <p className="text-xl font-black text-emerald-600 mt-0.5">{formatCOP(totalRevenue)}</p>
              </div>
            </div>

            {/* Barra de Filtros, Búsqueda y Exportación */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                {/* Buscador de pedidos */}
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={orderSearchQuery}
                    onChange={(e) => setOrderSearchQuery(e.target.value)}
                    placeholder="Buscar por cliente, celular, orden (PF-...), ciudad o producto..."
                    className="w-full pl-9 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  {orderSearchQuery && (
                    <button
                      onClick={() => setOrderSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                    >
                      Limpiar
                    </button>
                  )}
                </div>

                {/* Botón Exportar CSV */}
                <button
                  onClick={handleExportOrdersCsv}
                  className="flex items-center justify-center gap-1.5 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Exportar CSV</span>
                </button>
              </div>

              {/* Píldoras de Estado */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pt-1">
                {[
                  { id: 'todos', label: 'Todos' },
                  { id: 'pendiente_despacho', label: '⏳ Pendientes' },
                  { id: 'subido_a_dropi', label: '🚀 En Dropi' },
                  { id: 'en_transito', label: '🚚 En Tránsito' },
                  { id: 'entregado', label: '✅ Entregados' },
                  { id: 'novedad', label: '⚠️ Novedad' },
                  { id: 'cancelado', label: '❌ Cancelados' },
                ].map((tab) => {
                  const isSelected = orderStatusFilter === tab.id;
                  const count =
                    tab.id === 'todos'
                      ? orders.length
                      : orders.filter((o) => o.status === tab.id).length;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setOrderStatusFilter(tab.id)}
                      className={`flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                        isSelected
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                      }`}
                    >
                      <span>{tab.label}</span>
                      <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'}`}>
                        {count}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Listado de Pedidos */}
            {filteredOrders.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <Package className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No se encontraron pedidos</p>
                <p className="text-xs text-slate-400 mt-1">
                  Intenta cambiar el filtro de estado o la búsqueda.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredOrders.map((ord) => {
                  const item = ord.items?.[0] || {};
                  const isCopied = copiedOrderId === ord.id;
                  const isUpdating = updatingOrderId === ord.id;
                  const cleanPhone = (ord.customer_phone || '').replace(/\D/g, '');
                  const waLink = `https://wa.me/57${cleanPhone}?text=${encodeURIComponent(
                    `¡Hola ${ord.customer_name}! Te saludamos de PideFácil.co 📦 Confirmamos tu pedido #${ord.order_number} de: ${item.name} por valor de ${formatCOP(ord.total_cop)} con pago en efectivo al recibir en ${ord.city}. ¿La dirección ${ord.address} está correcta para despacho inmediato?`
                  )}`;

                  return (
                    <div
                      key={ord.id}
                      className="bg-white rounded-3xl p-4 sm:p-5 border border-slate-200/80 shadow-xs hover:border-emerald-300 transition-all space-y-3.5"
                    >
                      {/* Cabecera de la Orden */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-xs font-black bg-slate-100 text-slate-800 px-2.5 py-1 rounded-lg">
                            {ord.order_number}
                          </span>
                          <span className="text-xs text-slate-400">
                            {new Date(ord.created_at).toLocaleString('es-CO', {
                              timeZone: 'America/Bogota',
                              dateStyle: 'medium',
                              timeStyle: 'short',
                            })}
                          </span>
                        </div>

                        {/* Selector de Estado en Vivo */}
                        <div className="flex items-center gap-2">
                          <label className="text-xs text-slate-400 font-semibold hidden sm:inline">
                            Estado:
                          </label>
                          <select
                            value={ord.status}
                            disabled={isUpdating}
                            onChange={(e) => handleUpdateOrderStatus(ord.id, e.target.value)}
                            className="text-xs font-bold rounded-xl border border-slate-300 px-3 py-1.5 bg-white text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500"
                          >
                            <option value="pendiente_despacho">⏳ Pendiente Despacho</option>
                            <option value="subido_a_dropi">🚀 Subido a Dropi</option>
                            <option value="en_transito">🚚 En Tránsito</option>
                            <option value="entregado">✅ Entregado</option>
                            <option value="novedad">⚠️ Novedad</option>
                            <option value="cancelado">❌ Cancelado</option>
                          </select>
                        </div>
                      </div>

                      {/* Cuerpo: Datos del Cliente vs Producto */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Datos del Cliente y Envío */}
                        <div className="space-y-1.5 text-xs text-slate-700 bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                          <p className="font-black text-slate-900 text-sm flex items-center gap-1.5">
                            <User className="w-3.5 h-3.5 text-slate-500" />
                            <span>{ord.customer_name}</span>
                          </p>
                          <p className="flex items-center gap-1.5 font-bold text-slate-800">
                            <Phone className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{ord.customer_phone}</span>
                          </p>
                          <p className="flex items-center gap-1.5 text-slate-600">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            <span>
                              {ord.address} • Barrio: {ord.neighborhood}
                            </span>
                          </p>
                          <p className="text-[11px] text-slate-500 pl-5">
                            Ciudad: <strong className="text-slate-800">{ord.city}</strong> ({ord.department})
                          </p>
                          <p className="text-[11px] text-amber-800 bg-amber-50 px-2 py-1 rounded-lg border border-amber-200/50">
                            📍 Ref: {ord.reference_point}
                          </p>
                        </div>

                        {/* Datos del Producto y Cobro */}
                        <div className="space-y-2 bg-emerald-50/40 p-3.5 rounded-2xl border border-emerald-100/60 flex flex-col justify-between">
                          <div>
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <p className="text-xs font-black text-slate-900 line-clamp-2">
                                  {item.name || 'Producto Dropi'}
                                </p>
                                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                                  ID Dropi: {item.id_dropi} • Prov: {item.supplier_name || 'N/A'}
                                </p>
                              </div>
                              <span className="text-[10px] font-black uppercase bg-emerald-600 text-white px-2 py-0.5 rounded-md">
                                {ord.quantity_type === '2x' ? 'Combo 2x' : '1 Unidad'}
                              </span>
                            </div>

                            {item.variation && (
                              <p className="text-xs font-bold text-emerald-800 mt-1">
                                Opción elegida: {item.variation}
                              </p>
                            )}
                          </div>

                          <div className="pt-2 border-t border-emerald-200/50 flex items-baseline justify-between">
                            <span className="text-xs font-bold text-slate-600">Total en Efectivo (COD):</span>
                            <span className="text-base font-black text-emerald-700">
                              {formatCOP(ord.total_cop)}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Seguimiento Dropi y Acciones Rápidas */}
                      <div className="pt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2 border-t border-slate-100">
                        {/* ID Dropi y Notas */}
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="number"
                            placeholder="ID Orden Dropi..."
                            defaultValue={ord.dropi_order_id || ''}
                            onChange={(e) =>
                              setOrderDropiIdInput((prev) => ({ ...prev, [ord.id]: e.target.value }))
                            }
                            className="w-36 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          <input
                            type="text"
                            placeholder="Notas / Guía de envío..."
                            defaultValue={ord.notes || ''}
                            onChange={(e) =>
                              setOrderNotesInput((prev) => ({ ...prev, [ord.id]: e.target.value }))
                            }
                            className="flex-1 px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          />
                          {(orderDropiIdInput[ord.id] !== undefined || orderNotesInput[ord.id] !== undefined) && (
                            <button
                              onClick={() => handleSaveOrderMeta(ord.id)}
                              className="px-3 py-1.5 bg-slate-900 text-white text-xs font-bold rounded-xl hover:bg-slate-800 transition"
                            >
                              Guardar
                            </button>
                          )}
                        </div>

                        {/* Botones de Acción: WhatsApp & Copiar para Dropi */}
                        <div className="flex items-center gap-2 justify-end">
                          <a
                            href={waLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#25D366] hover:bg-[#20ba5a] text-white text-xs font-bold rounded-xl shadow-xs transition"
                          >
                            <MessageCircle className="w-3.5 h-3.5" />
                            <span>WhatsApp</span>
                          </a>

                          <button
                            onClick={() => handleCopyForDropi(ord)}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-xs transition"
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 text-emerald-400" />
                                <span className="text-emerald-300">¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5" />
                                <span>Copiar p/ Dropi</span>
                              </>
                            )}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA 2: GESTIÓN DE CATÁLOGO Y PRODUCTOS                           */}
        {/* ==================================================================== */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            {/* Buscador de Catálogo */}
            <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') loadAdminProducts(1, productSearch, productStatusFilter);
                    }}
                    placeholder="Buscar producto por nombre, SKU o ID Dropi..."
                    className="w-full pl-9 pr-24 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                  <button
                    onClick={() => loadAdminProducts(1, productSearch, productStatusFilter)}
                    className="absolute right-2 top-1/2 -translate-y-1/2 px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-bold rounded-lg transition"
                  >
                    Buscar
                  </button>
                </div>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setProductStatusFilter('todos');
                      loadAdminProducts(1, productSearch, 'todos');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      productStatusFilter === 'todos'
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Todos
                  </button>
                  <button
                    onClick={() => {
                      setProductStatusFilter('activos');
                      loadAdminProducts(1, productSearch, 'activos');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      productStatusFilter === 'activos'
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Activos
                  </button>
                  <button
                    onClick={() => {
                      setProductStatusFilter('inactivos');
                      loadAdminProducts(1, productSearch, 'inactivos');
                    }}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                      productStatusFilter === 'inactivos'
                        ? 'bg-red-600 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    Pausados
                  </button>
                </div>
              </div>
            </div>

            {/* Tabla de Productos */}
            {isLoadingProducts ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto mb-2" />
                <p className="text-xs font-bold text-slate-500">Cargando productos de Supabase...</p>
              </div>
            ) : adminProducts.length === 0 ? (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 shadow-xs">
                <Tag className="w-10 h-10 text-slate-300 mx-auto mb-2" />
                <p className="text-sm font-bold text-slate-700">No se encontraron productos</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {adminProducts.map((p) => {
                  const isUpdating = updatingProductId === p.id_dropi;
                  return (
                    <div
                      key={p.id_dropi}
                      className="bg-white rounded-2xl p-3 sm:p-4 border border-slate-200/80 shadow-xs hover:border-slate-300 transition flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3"
                    >
                      <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Miniatura */}
                        <div className="relative w-12 h-12 rounded-xl bg-slate-50 overflow-hidden flex-shrink-0 border border-slate-100">
                          {p.image_url ? (
                            <Image
                              src={getProductDisplayImageUrl(p)}
                              alt={p.name}
                              fill
                              unoptimized
                              className="object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center text-xs text-slate-400">
                              📷
                            </div>
                          )}
                        </div>

                        <div className="min-w-0 flex-1">
                          <h4 className="text-xs font-bold text-slate-900 truncate">
                            {p.name}
                          </h4>
                          <div className="flex flex-wrap items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                            <span className="font-mono">ID: {p.id_dropi}</span>
                            <span>•</span>
                            <span>Stock: <strong className={p.stock_real > 0 ? 'text-slate-800' : 'text-red-600'}>{p.stock_real}</strong></span>
                            <span>•</span>
                            <span>Costo: {formatCOP(p.cost_cop)}</span>
                            <span>•</span>
                            <span>Venta: <strong className="text-emerald-700 font-bold">{formatCOP(p.sell_price_cop)}</strong></span>
                          </div>
                        </div>
                      </div>

                      {/* Controles de Gestión: Activar/Pausar & Prioridad */}
                      <div className="flex items-center gap-2 justify-end flex-shrink-0">
                        {/* Selector de Prioridad */}
                        <div className="flex items-center gap-1">
                          <label className="text-[10px] text-slate-400 font-semibold hidden md:inline">
                            Prioridad:
                          </label>
                          <select
                            value={p.display_priority ?? 0}
                            disabled={isUpdating}
                            onChange={(e) => handleChangePriority(p.id_dropi, Number(e.target.value))}
                            className="text-[11px] font-bold rounded-lg border border-slate-200 px-2 py-1 bg-slate-50 text-slate-700"
                          >
                            <option value={0}>Normal (0)</option>
                            <option value={1}>Belleza (1)</option>
                            <option value={2}>Íntimo/Final (2)</option>
                          </select>
                        </div>

                        {/* Botón Activar / Pausar */}
                        <button
                          onClick={() => handleToggleProductActive(p.id_dropi, p.is_active)}
                          disabled={isUpdating}
                          className={`px-3 py-1 rounded-xl text-xs font-bold transition ${
                            p.is_active === 1
                              ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                              : 'bg-red-100 text-red-800 hover:bg-red-200'
                          }`}
                        >
                          {p.is_active === 1 ? 'Activo' : 'Pausado'}
                        </button>

                        {/* Enlace para ver en tienda */}
                        <Link
                          href={`/producto/${p.id_dropi}`}
                          target="_blank"
                          className="p-1.5 text-slate-400 hover:text-emerald-700 hover:bg-slate-100 rounded-lg transition"
                          title="Ver en tienda"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </Link>
                      </div>
                    </div>
                  );
                })}

                {/* Paginación de Productos */}
                <div className="flex items-center justify-between pt-2 px-1">
                  <span className="text-xs text-slate-500 font-medium">
                    Página {productPage}
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      disabled={productPage <= 1 || isLoadingProducts}
                      onClick={() => loadAdminProducts(productPage - 1)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40"
                    >
                      Anterior
                    </button>
                    <button
                      disabled={adminProducts.length < 20 || isLoadingProducts}
                      onClick={() => loadAdminProducts(productPage + 1)}
                      className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold disabled:opacity-40"
                    >
                      Siguiente
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA 3: MODERACIÓN DE FOTOS Y PRECIOS QUEMADOS (OCR)             */}
        {/* ==================================================================== */}
        {activeTab === 'moderation' && <ImageModerationTab />}

        {/* ==================================================================== */}
        {/* PESTAÑA 4: MÉTRICAS Y AUDITORÍA                                      */}
        {/* ==================================================================== */}
        {activeTab === 'metrics' && (
          <div className="space-y-5">
            {/* Tarjetas Principales de KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500">Recaudo Total Proyectado</span>
                <p className="text-2xl font-black text-emerald-700">{formatCOP(totalRevenue)}</p>
                <p className="text-[10px] text-slate-400">Total acumulado en pedidos COD</p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500">Total Pedidos Registrados</span>
                <p className="text-2xl font-black text-slate-900">{orders.length}</p>
                <p className="text-[10px] text-slate-400">{ordersToday} recibidos el día de hoy</p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500">Ticket Promedio</span>
                <p className="text-2xl font-black text-blue-700">
                  {orders.length > 0 ? formatCOP(Math.round(totalRevenue / orders.length)) : '$0'}
                </p>
                <p className="text-[10px] text-slate-400">Valor promedio por comprador</p>
              </div>

              <div className="bg-white p-4 rounded-3xl border border-slate-200/80 shadow-xs space-y-1">
                <span className="text-xs font-bold text-slate-500">Tasa de Entrega Exitosa</span>
                <p className="text-2xl font-black text-emerald-600">
                  {orders.length > 0 ? `${Math.round((deliveredCount / orders.length) * 100)}%` : '0%'}
                </p>
                <p className="text-[10px] text-slate-400">{deliveredCount} pedidos entregados</p>
              </div>
            </div>

            {/* Salud del Catálogo y Estado de Supabase */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-4">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                <Database className="w-4 h-4 text-emerald-600" />
                <span>Salud del Catálogo PostgreSQL (Supabase Cloud)</span>
              </h3>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Productos Totales</p>
                  <p className="text-lg font-black text-slate-900 mt-0.5">
                    {stats?.totalProducts?.toLocaleString() || '232.278'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Productos Activos</p>
                  <p className="text-lg font-black text-emerald-700 mt-0.5">
                    {stats?.activeProducts?.toLocaleString() || '232.278'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Con Descripción Extraída</p>
                  <p className="text-lg font-black text-blue-700 mt-0.5">
                    {heartbeat?.database_stats?.total_with_description?.toLocaleString() || '7.080+'}
                  </p>
                </div>
                <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100">
                  <p className="text-[10px] text-slate-500 font-bold uppercase">Vacíos en Origen Dropi</p>
                  <p className="text-lg font-black text-amber-700 mt-0.5">
                    {heartbeat?.database_stats?.total_empty_in_source?.toLocaleString() || '422'}
                  </p>
                </div>
              </div>
            </div>

            {/* Pulso del Demonio de Enriquecimiento en Vivo */}
            <div className="bg-white p-5 rounded-3xl border border-slate-200/80 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-amber-500" />
                  <span>Pulso del Demonio Permanente Dropi</span>
                </h3>
                <span className={`text-[10px] font-black px-2.5 py-0.5 rounded-full ${
                  heartbeat?.status === 'running'
                    ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                    : 'bg-amber-100 text-amber-800'
                }`}>
                  {heartbeat?.status === 'running' ? '● ACTIVO EN VIVO' : '● EN REPOSO'}
                </span>
              </div>

              {heartbeat && (
                <div className="text-xs text-slate-600 space-y-1.5 bg-slate-50 p-3.5 rounded-2xl border border-slate-100 font-medium">
                  <p>
                    Último latido registrado: <strong>{new Date(heartbeat.timestamp).toLocaleString('es-CO', { timeZone: 'America/Bogota' })}</strong>
                  </p>
                  <p>
                    Último producto enriquecido: <strong>{heartbeat.last_product?.name || 'N/A'}</strong> (ID: {heartbeat.last_product?.id || 'N/A'})
                  </p>
                  <p>
                    Sesión actual: <strong>{heartbeat.session_stats?.processed || 0} productos</strong> procesados en esta corrida.
                  </p>
                  {heartbeat.last_error && (
                    <p className="text-amber-800 bg-amber-100/60 p-2 rounded-xl text-[11px] font-bold">
                      Nota operativa: {heartbeat.last_error}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ==================================================================== */}
        {/* PESTAÑA 4: AJUSTES COMERCIALES                                       */}
        {/* ==================================================================== */}
        {activeTab === 'settings' && (
          <div className="max-w-2xl bg-white p-6 rounded-3xl border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h2 className="text-base font-black text-slate-900">
                Calibración Comercial & Configuración
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Ajusta los parámetros comerciales y datos de contacto de la tienda.
              </p>
            </div>

            {settingsSuccessMsg && (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-center gap-2 text-xs text-emerald-800 font-bold">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                <span>{settingsSuccessMsg}</span>
              </div>
            )}

            <form onSubmit={handleSaveSettings} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Margen Base de Ganancia por Producto (COP)
                </label>
                <div className="relative">
                  <DollarSign className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="number"
                    value={marginInput}
                    min={20000}
                    max={150000}
                    step={1000}
                    onChange={(e) => setMarginInput(Number(e.target.value))}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Valor base sumado al costo Dropi. Actualmente fijado en $55.000 COP con redondeo hacia arriba a 9.900.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Nombre Comercial de la Tienda
                </label>
                <div className="relative">
                  <Store className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={storeNameInput}
                    onChange={(e) => setStoreNameInput(e.target.value)}
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-1">
                  Número de WhatsApp de Atención al Cliente (con código de país)
                </label>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={whatsappInput}
                    onChange={(e) => setWhatsappInput(e.target.value)}
                    placeholder="Ej: 573009123456"
                    className="w-full pl-9 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                  />
                </div>
                <p className="text-[11px] text-slate-400 mt-1">
                  Aparece en el botón de confirmación tras realizar el pedido y en soporte.
                </p>
              </div>

              {/* Tarjeta Destacada: Motor Creativo IA (Google Gemini Pro / Imagen) */}
              <div className="p-4 bg-gradient-to-br from-slate-900 via-slate-800 to-emerald-950 text-white rounded-2xl border-2 border-emerald-500/40 shadow-md space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 border border-emerald-400/40 flex items-center justify-center text-emerald-400">
                      <Bot className="w-4 h-4 stroke-[2.5]" />
                    </div>
                    <div>
                      <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                        <span>🤖 Motor Creativo IA (Google Gemini Pro / Imagen)</span>
                        <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full">
                          En Caliente
                        </span>
                      </h3>
                      <p className="text-[10px] text-slate-300">
                        Investigación con Google Search Grounding y generación multimodal @google/genai.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-200 mb-1">
                    Google AI Studio API Key (Gemini & Imagen)
                  </label>
                  <div className="relative">
                    <Key className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type={showGeminiKey ? 'text' : 'password'}
                      value={geminiApiKeyInput}
                      onChange={(e) => setGeminiApiKeyInput(e.target.value)}
                      placeholder="AIzaSy..."
                      className="w-full pl-9 pr-10 py-2.5 bg-slate-950/80 border border-slate-700 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
                    />
                    <button
                      type="button"
                      onClick={() => setShowGeminiKey(!showGeminiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      {showGeminiKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400">
                    <span>Se almacena de forma segura en Base de Datos sin reiniciar el servidor.</span>
                    <a
                      href="https://aistudio.google.com/app/apikey"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-emerald-400 hover:text-emerald-300 underline flex items-center gap-0.5"
                    >
                      <span>Obtener API Key en Google AI Studio</span>
                      <ExternalLink className="w-2.5 h-2.5" />
                    </a>
                  </div>
                </div>

                {/* Feedback de Prueba de Conexión */}
                {aiTestResult && (
                  <div
                    className={`p-2.5 rounded-xl text-xs font-bold flex items-center gap-2 ${
                      aiTestResult.success
                        ? 'bg-emerald-900/60 border border-emerald-500 text-emerald-200'
                        : 'bg-rose-900/60 border border-rose-500 text-rose-200'
                    }`}
                  >
                    {aiTestResult.success ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    ) : (
                      <AlertTriangle className="w-4 h-4 text-rose-400 flex-shrink-0" />
                    )}
                    <span className="text-[11px] leading-snug">{aiTestResult.message}</span>
                  </div>
                )}

                <div className="pt-1 flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleTestAi}
                    disabled={isTestingAi || !geminiApiKeyInput.trim()}
                    className="w-full bg-slate-700/80 hover:bg-slate-700 disabled:opacity-40 text-emerald-300 font-bold py-2 px-3 rounded-xl border border-emerald-500/30 transition flex items-center justify-center gap-2 text-xs"
                  >
                    {isTestingAi ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Probando conexión con Gemini...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Probar Conexión IA</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  disabled={isSavingSettings}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-black py-3 px-4 rounded-xl shadow-md transition flex items-center justify-center gap-2 text-xs"
                >
                  {isSavingSettings ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Guardando cambios...</span>
                    </>
                  ) : (
                    <>
                      <Save className="w-4 h-4" />
                      <span>Guardar Ajustes de Tienda</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </main>
    </div>
  );
}
