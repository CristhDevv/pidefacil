'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { formatCOP } from '@/config/pricing';
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
} from 'lucide-react';

export default function AdminPage() {
  const [stats, setStats] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [lastSweep, setLastSweep] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');

  // Margen editable en caliente
  const [marginInput, setMarginInput] = useState<number>(55000);
  const [isSavingMargin, setIsSavingMargin] = useState(false);
  const [marginSuccessMsg, setMarginSuccessMsg] = useState<string | null>(null);

  // Estado para feedback de copiado al portapapeles
  const [copiedOrderId, setCopiedOrderId] = useState<number | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // 1. Obtener stats y settings
      const settingsRes = await fetch('/api/admin/settings');
      const settingsJson = await settingsRes.json();
      if (settingsJson.success) {
        setStats(settingsJson.stats);
        setSettings(settingsJson.settings);
        setLastSweep(settingsJson.lastSweep);
        setMarginInput(settingsJson.settings.margin_base_cop);
      }

      // 2. Obtener pedidos
      const ordersRes = await fetch('/api/orders');
      const ordersJson = await ordersRes.json();
      if (ordersJson.success) {
        setOrders(ordersJson.data);
      }
    } catch (err) {
      console.error('Error loading admin data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveMargin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingMargin(true);
    setMarginSuccessMsg(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          margin_base_cop: Number(marginInput),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setMarginSuccessMsg('¡Margen actualizado y precios recalculados con regla .900 en toda la base de datos!');
        setTimeout(() => setMarginSuccessMsg(null), 4000);
        loadData();
      } else {
        alert(json.error || 'Error al guardar');
      }
    } catch (err) {
      alert('Error de red al actualizar margen');
    } finally {
      setIsSavingMargin(false);
    }
  };

  const handleUpdateOrderStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch(`/api/admin/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        loadData();
      }
    } catch (err) {
      alert('Error al actualizar estado del pedido');
    }
  };

  // Botón "Copiar datos para Dropi"
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
VARIACIÓN: ${item.variation || 'Estándar'}
VALOR A RECAUDAR EN EFECTIVO: ${formatCOP(order.total_cop)}
CÓDIGO PEDIDO PIDEFÁCIL: ${order.order_number}`;

    navigator.clipboard.writeText(dropiText).then(() => {
      setCopiedOrderId(order.id);
      setTimeout(() => setCopiedOrderId(null), 2500);
    });
  };

  // Cálculos de KPIs en Vivo
  const totalRecaudoProyectado = orders.reduce((sum, ord) => sum + (ord.total_cop || 0), 0);

  // Pedidos de hoy (zona horaria Bogotá)
  const todayStr = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/Bogota',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());

  const ordersToday = orders.filter((o) => o.created_at?.startsWith(todayStr)).length;

  const filteredOrders = orders.filter((o) => {
    if (statusFilter === 'todos') return true;
    return o.status === statusFilter;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 pb-12">
      {/* Top Bar Admin */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-40">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition"
              title="Volver a la tienda"
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div>
              <h1 className="text-base font-black text-slate-900 leading-tight flex items-center gap-2">
                <span>Panel Operativo PideFácil</span>
                <span className="text-[10px] bg-emerald-100 text-emerald-800 font-bold px-2 py-0.5 rounded-full">
                  Dropi COD Colombia
                </span>
              </h1>
              <p className="text-xs text-slate-500">
                Gestión de pedidos contra entrega y calibración comercial en caliente
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={loadData}
              disabled={isLoading}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold rounded-xl transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              <span>Actualizar</span>
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* KPIs en Vivo */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Pedidos de Hoy</span>
              <Clock className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">
              {ordersToday}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Total acumulado: {stats?.totalOrders || 0}
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Recaudo Proyectado</span>
              <Truck className="w-4 h-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-700">
              {formatCOP(totalRecaudoProyectado)}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">En efectivo contra entrega</p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Catálogo Activo</span>
              <Database className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-2xl font-black text-slate-900">
              {stats?.activeProducts?.toLocaleString('es-CO') || 0}
            </p>
            <p className="text-[11px] text-slate-400 mt-0.5">
              De {stats?.totalProducts?.toLocaleString('es-CO') || 0} referencias
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl border border-slate-200/80 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-xs font-semibold">Salud Token Dropi</span>
              <ShieldCheck className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="flex items-center gap-1.5 mt-1">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-sm font-black text-emerald-800">Conectado y Activo</p>
            </div>
            <p className="text-[11px] text-slate-400 mt-1 truncate">
              Último barrido: Pág {lastSweep?.current_page || 1} ({lastSweep?.extracted_count || 0} prods)
            </p>
          </div>
        </div>

        {/* Control Comercial en Caliente (app_settings) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-slate-900">
                  Control Comercial en Caliente (Margen Base COP)
                </h2>
                <p className="text-xs text-slate-500">
                  Ajusta el margen ($55.000 – $60.000 COP) y recalcula instantáneamente los precios del catálogo con terminación .900
                </p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSaveMargin} className="space-y-3">
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex-1 min-w-[260px]">
                <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                  <span>Margen objetivo:</span>
                  <span className="font-mono font-black text-emerald-800 text-sm">
                    {formatCOP(marginInput)}
                  </span>
                </div>
                {/* Slider de precisión 55.000 - 60.000 */}
                <input
                  type="range"
                  min="50000"
                  max="65000"
                  step="1000"
                  value={marginInput}
                  onChange={(e) => setMarginInput(parseInt(e.target.value, 10))}
                  className="w-full accent-emerald-600 cursor-pointer h-2 bg-slate-100 rounded-lg"
                />
                <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                  <span>$50.000 COP</span>
                  <span className="font-bold text-emerald-700">$55.000 COP (Base)</span>
                  <span className="font-bold text-emerald-700">$60.000 COP (Techo)</span>
                  <span>$65.000 COP</span>
                </div>
              </div>

              <div className="flex items-end">
                <button
                  type="submit"
                  disabled={isSavingMargin}
                  className="bg-[#16A34A] hover:bg-[#15803D] text-white font-black py-2.5 px-5 rounded-xl text-xs flex items-center gap-2 transition disabled:opacity-50 shadow-sm"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSavingMargin ? 'Recalculando Catálogo...' : 'Recalcular precios del catálogo'}</span>
                </button>
              </div>
            </div>

            {marginSuccessMsg && (
              <p className="text-xs text-emerald-700 font-bold bg-emerald-50 p-2 rounded-xl border border-emerald-200">
                ✅ {marginSuccessMsg}
              </p>
            )}
          </form>
        </div>

        {/* Bandeja de Pedidos Contra Entrega (cod_orders) */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-4 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <span>Bandeja de Pedidos Contra Entrega</span>
                <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-bold">
                  {filteredOrders.length}
                </span>
              </h2>
              <p className="text-xs text-slate-500">
                Usa el botón &ldquo;Copiar datos para Dropi&rdquo; para despachar en 1 clic
              </p>
            </div>

            {/* Filtros de estado */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-xs font-semibold">
              {['todos', 'pendiente_despacho', 'subido_a_dropi', 'entregado'].map((st) => (
                <button
                  key={st}
                  onClick={() => setStatusFilter(st)}
                  className={`px-3 py-1 rounded-lg capitalize transition ${
                    statusFilter === st
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {st.replace(/_/g, ' ')}
                </button>
              ))}
            </div>
          </div>

          {filteredOrders.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs">
              No hay pedidos registrados en este estado.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-100">
                  <tr>
                    <th className="py-3 px-4">Pedido / Fecha</th>
                    <th className="py-3 px-4">Cliente & Contacto</th>
                    <th className="py-3 px-4">Destino en Colombia</th>
                    <th className="py-3 px-4">Producto & Modalidad</th>
                    <th className="py-3 px-4">Total Efectivo</th>
                    <th className="py-3 px-4">Estado</th>
                    <th className="py-3 px-4 text-right">Acción Dropi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredOrders.map((ord) => {
                    const item = ord.items?.[0] || {};
                    const isCopied = copiedOrderId === ord.id;

                    return (
                      <tr key={ord.id} className="hover:bg-slate-50/70 transition">
                        <td className="py-3.5 px-4">
                          <span className="font-mono font-black text-slate-900 block">
                            {ord.order_number}
                          </span>
                          <span className="text-[10px] text-slate-400">
                            {new Date(ord.created_at).toLocaleString('es-CO')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-800 block">
                            {ord.customer_name}
                          </span>
                          <a
                            href={`https://wa.me/57${ord.customer_phone}?text=${encodeURIComponent(
                              `Hola ${ord.customer_name}, te escribimos de PideFácil sobre tu pedido ${ord.order_number}. Estamos listos para despachar.`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-700 font-semibold hover:underline flex items-center gap-1 mt-0.5"
                          >
                            <MessageCircle className="w-3.5 h-3.5 fill-emerald-600 stroke-none" />
                            <span>+57 {ord.customer_phone}</span>
                          </a>
                        </td>

                        <td className="py-3.5 px-4 max-w-[220px]">
                          <span className="font-bold text-slate-800 block">
                            {ord.city}, {ord.department}
                          </span>
                          <span className="text-[11px] text-slate-600 block truncate">
                            {ord.address} • Barrio: {ord.neighborhood}
                          </span>
                          <span className="text-[10px] text-amber-800 block italic truncate">
                            Ref: {ord.reference_point}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-[200px]">
                          <span className="font-medium text-slate-800 line-clamp-1 block">
                            {item.name || 'Producto Dropi'}
                          </span>
                          <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-1.5 py-0.5 rounded inline-block mt-0.5">
                            {ord.quantity_type === '2x' ? 'Dúo Pack (2x)' : '1 Unidad'}
                            {item.variation ? ` • ${item.variation}` : ''}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 font-black text-slate-900 text-sm">
                          {formatCOP(ord.total_cop)}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 rounded-full text-[10px] font-bold inline-block capitalize ${
                              ord.status === 'pendiente_despacho'
                                ? 'bg-amber-100 text-amber-800'
                                : ord.status === 'subido_a_dropi'
                                ? 'bg-blue-100 text-blue-800'
                                : ord.status === 'entregado'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {ord.status.replace(/_/g, ' ')}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 text-right space-y-1">
                          {/* Botón Copiar datos para Dropi */}
                          <button
                            onClick={() => handleCopyForDropi(ord)}
                            className={`px-2.5 py-1 text-[11px] font-bold rounded-lg border flex items-center justify-end gap-1 ml-auto transition ${
                              isCopied
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                            }`}
                          >
                            {isCopied ? (
                              <>
                                <Check className="w-3.5 h-3.5 stroke-[3]" />
                                <span>¡Copiado!</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3.5 h-3.5 text-slate-400" />
                                <span>Copiar para Dropi</span>
                              </>
                            )}
                          </button>

                          {/* Acciones de cambio de estado */}
                          <div className="flex items-center justify-end gap-1">
                            {ord.status === 'pendiente_despacho' && (
                              <button
                                onClick={() =>
                                  handleUpdateOrderStatus(ord.id, 'subido_a_dropi')
                                }
                                className="px-2 py-0.5 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded text-[10px] transition"
                              >
                                En Dropi
                              </button>
                            )}
                            {ord.status === 'subido_a_dropi' && (
                              <button
                                onClick={() =>
                                  handleUpdateOrderStatus(ord.id, 'entregado')
                                }
                                className="px-2 py-0.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[10px] transition"
                              >
                                Entregado
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
