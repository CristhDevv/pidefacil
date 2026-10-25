'use client';

import React, { useState, useEffect } from 'react';
import { formatCOP } from '@/config/pricing';
import {
  DollarSign,
  Package,
  Truck,
  CheckCircle2,
  Clock,
  AlertTriangle,
  RefreshCw,
  User,
  Phone,
  MapPin,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  ShieldCheck,
  FileText,
  Search,
} from 'lucide-react';

export function SellerLiquidationTab() {
  const [orders, setOrders] = useState<any[]>([]);
  const [kpis, setKpis] = useState<any>(null);
  const [sellers, setSellers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('todos');

  // Modales de acción
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [modalAction, setModalAction] = useState<
    'order_dropi' | 'money_received' | 'liquidate' | null
  >(null);

  // Formulario pedir en Dropi
  const [dropiOrderIdInput, setDropiOrderIdInput] = useState('');

  // Formulario dinero recibido
  const [amountReceivedInput, setAmountReceivedInput] = useState<number>(0);

  // Formulario liquidación final
  const [finalProfitInput, setFinalProfitInput] = useState<number>(0);
  const [adjustmentReasonInput, setAdjustmentReasonInput] = useState('');
  const [payoutVoucherInput, setPayoutVoucherInput] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [ordRes, sellRes] = await Promise.all([
        fetch(`/api/admin/seller-orders?status=${statusFilter}`),
        fetch('/api/admin/sellers'),
      ]);
      const ordJson = await ordRes.json();
      const sellJson = await sellRes.json();

      if (ordJson.success) {
        setOrders(ordJson.data || []);
        setKpis(ordJson.kpis || null);
      }
      if (sellJson.success) {
        setSellers(sellJson.data || []);
      }
    } catch (e) {
      console.error('Error cargando liquidaciones:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [statusFilter]);

  // Actualizar estado de vendedor (Aprobar/Suspender)
  const handleSellerStatus = async (sellerId: number, status: string) => {
    try {
      const res = await fetch('/api/admin/sellers', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: sellerId, status }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg(`Vendedor actualizado a "${status}".`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        loadData();
      }
    } catch {
      alert('Error de conexión');
    }
  };

  // Abrir modal de acción
  const openActionModal = (order: any, action: 'order_dropi' | 'money_received' | 'liquidate') => {
    setSelectedOrder(order);
    setModalAction(action);
    if (action === 'order_dropi') {
      setDropiOrderIdInput(order.dropi_order_id || '');
    } else if (action === 'money_received') {
      setAmountReceivedInput(order.amount_received_cop || order.sale_price_cop);
    } else if (action === 'liquidate') {
      const suggested = order.suggested_seller_profit_cop ?? order.estimated_seller_profit_cop;
      setFinalProfitInput(order.final_seller_profit_cop ?? suggested);
      setAdjustmentReasonInput(order.adjustment_reason || '');
      setPayoutVoucherInput(order.payout_voucher || '');
    }
  };

  // Enviar cambio de estado / liquidación
  const submitOrderAction = async () => {
    if (!selectedOrder || !modalAction) return;
    setIsSubmitting(true);

    const payload: any = { id: selectedOrder.id };

    if (modalAction === 'order_dropi') {
      if (!dropiOrderIdInput.trim()) {
        alert('Debe ingresar el número de pedido de Dropi');
        setIsSubmitting(false);
        return;
      }
      payload.status = 'pedido_en_dropi';
      payload.dropi_order_id = dropiOrderIdInput.trim();
    } else if (modalAction === 'money_received') {
      payload.status = 'dinero_recibido';
      payload.amount_received_cop = amountReceivedInput;
    } else if (modalAction === 'liquidate') {
      payload.status = 'liquidado';
      payload.final_seller_profit_cop = finalProfitInput;
      payload.adjustment_reason = adjustmentReasonInput;
      payload.payout_voucher = payoutVoucherInput;
    }

    try {
      const res = await fetch('/api/admin/seller-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg('Pedido actualizado y liquidado correctamente.');
        setTimeout(() => setActionSuccessMsg(null), 3000);
        setModalAction(null);
        setSelectedOrder(null);
        loadData();
      } else {
        alert(json.error || 'Error al procesar acción');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Cambio rápido a en tránsito o entregado
  const handleQuickStatus = async (orderId: number, newStatus: string) => {
    try {
      const res = await fetch('/api/admin/seller-orders', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: orderId, status: newStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setActionSuccessMsg(`Estado cambiado a "${newStatus}".`);
        setTimeout(() => setActionSuccessMsg(null), 3000);
        loadData();
      }
    } catch {
      alert('Error de conexión');
    }
  };

  return (
    <div className="space-y-6">
      {actionSuccessMsg && (
        <div className="bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs font-bold px-4 py-2.5 rounded-2xl flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>{actionSuccessMsg}</span>
        </div>
      )}

      {/* 1. KPI Cards del Modelo de Liquidaciones */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            1. Por Pedir en Dropi
          </span>
          <p className="text-xl font-black text-slate-900 mt-1">{kpis?.total_creado || 0}</p>
          <p className="text-[10px] text-amber-600 font-semibold mt-0.5">Pedidos nuevos</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            2. En Ruta / Tránsito
          </span>
          <p className="text-xl font-black text-indigo-700 mt-1">
            {(kpis?.total_pedido_en_dropi || 0) + (kpis?.total_en_transito || 0)}
          </p>
          <p className="text-[10px] text-slate-400 mt-0.5">Con transportadora</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-xs">
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
            3. Entregados (Pend. Dinero)
          </span>
          <p className="text-xl font-black text-teal-700 mt-1">{kpis?.total_entregado || 0}</p>
          <p className="text-[10px] text-slate-400 mt-0.5">Cliente ya recibió</p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-blue-200 bg-blue-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-blue-800 uppercase tracking-wider block">
            4. Dinero Recibido
          </span>
          <p className="text-xl font-black text-blue-900 mt-1">{kpis?.total_dinero_recibido || 0}</p>
          <p className="text-[10px] text-blue-600 font-bold mt-0.5">
            Pendiente: {formatCOP(kpis?.monto_pendiente_liquidar || 0)}
          </p>
        </div>

        <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-xs">
          <span className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider block">
            5. Total Liquidado
          </span>
          <p className="text-xl font-black text-emerald-900 mt-1">{kpis?.total_liquidado || 0}</p>
          <p className="text-[10px] text-emerald-700 font-bold mt-0.5">
            Pagado: {formatCOP(kpis?.monto_total_liquidado || 0)}
          </p>
        </div>
      </div>

      {/* 2. Sección: Aprobación de Vendedores Registrados */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
            <User className="w-4 h-4 text-emerald-600" />
            <span>Vendedores Registrados ({sellers.length})</span>
          </h3>
          <span className="text-[11px] text-slate-400">
            Los vendedores deben estar aprobados para cotizar fletes y enviar pedidos.
          </span>
        </div>

        <div className="p-4 overflow-x-auto">
          {sellers.length === 0 ? (
            <p className="text-xs text-slate-400 text-center py-3">No hay vendedores registrados.</p>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-1">
              {sellers.map((s) => (
                <div
                  key={s.id}
                  className="min-w-[240px] bg-slate-50 border border-slate-200 rounded-2xl p-3 flex flex-col justify-between space-y-2"
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <strong className="text-xs font-black text-slate-800">{s.name}</strong>
                      <span
                        className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase ${
                          s.status === 'approved'
                            ? 'bg-emerald-100 text-emerald-800'
                            : s.status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}
                      >
                        {s.status}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{s.email}</p>
                    <p className="text-[10px] text-slate-400">Cel: {s.phone}</p>
                  </div>

                  <div className="flex items-center gap-1.5 pt-1 border-t border-slate-200">
                    {s.status !== 'approved' ? (
                      <button
                        onClick={() => handleSellerStatus(s.id, 'approved')}
                        className="flex-1 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] font-bold transition"
                      >
                        Aprobar Vendedor
                      </button>
                    ) : (
                      <button
                        onClick={() => handleSellerStatus(s.id, 'suspended')}
                        className="flex-1 py-1 bg-slate-200 hover:bg-rose-100 hover:text-rose-700 text-slate-600 rounded-lg text-[10px] font-bold transition"
                      >
                        Suspender
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 3. Filtros y Lista de Pedidos de Vendedores */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-50 border-b border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-1.5">
            {[
              { id: 'todos', label: 'Todos' },
              { id: 'creado', label: '1. Creados' },
              { id: 'pedido_en_dropi', label: '2. En Dropi' },
              { id: 'en_transito', label: '3. En Tránsito' },
              { id: 'entregado', label: '4. Entregados' },
              { id: 'dinero_recibido', label: '5. Dinero Recibido' },
              { id: 'liquidado', label: '6. Liquidados' },
            ].map((f) => (
              <button
                key={f.id}
                onClick={() => setStatusFilter(f.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                  statusFilter === f.id
                    ? 'bg-slate-900 text-white shadow-2xs'
                    : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2 bg-white border border-slate-200 rounded-xl text-slate-600 hover:bg-slate-100 transition shadow-2xs"
            title="Recargar pedidos"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {/* Tabla de Pedidos */}
        <div className="overflow-x-auto">
          {isLoading ? (
            <div className="p-12 text-center space-y-2">
              <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
              <p className="text-xs text-slate-500 font-bold">Cargando pedidos de vendedores...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="p-12 text-center space-y-2">
              <Package className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">No hay pedidos en este estado</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {orders.map((ord) => (
                <div key={ord.id} className="p-4 sm:p-5 hover:bg-slate-50/60 transition space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black text-slate-900 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                        {ord.order_number}
                      </span>
                      <span className="text-xs font-bold text-slate-800">{ord.product_name}</span>
                      <span className="text-xs text-slate-400">({ord.quantity} un)</span>
                      <span className="text-slate-300">•</span>
                      <span className="text-xs text-slate-600">
                        Vendedor: <strong>{ord.seller_name}</strong>
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] font-black px-2.5 py-1 rounded-full uppercase ${
                          ord.status === 'liquidado'
                            ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                            : ord.status === 'dinero_recibido'
                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                            : ord.status === 'entregado'
                            ? 'bg-teal-100 text-teal-800'
                            : ord.status === 'en_transito'
                            ? 'bg-indigo-100 text-indigo-800'
                            : ord.status === 'pedido_en_dropi'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {ord.status.replace(/_/g, ' ')}
                      </span>
                      {ord.dropi_order_id && (
                        <span className="text-[10px] font-mono text-slate-600 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                          Dropi #{ord.dropi_order_id}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Cuadrícula de Datos y Desglose Financiero */}
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs bg-slate-50/70 p-3.5 rounded-2xl border border-slate-100">
                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Cliente & Destino</span>
                      <strong className="text-slate-800 block truncate">{ord.customer_name}</strong>
                      <p className="text-[10px] text-slate-500">{ord.city_name}, {ord.department}</p>
                      <p className="text-[10px] text-slate-400 truncate">{ord.address}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Transportadora</span>
                      <strong className="text-indigo-700 block">{ord.carrier_name}</strong>
                      <p className="text-[10px] text-slate-500">Flete: {formatCOP(ord.flete_total_cop)}</p>
                      <p className="text-[10px] text-slate-400">Origen: {ord.origin_city_name || 'Bogotá'}</p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Venta Cobrada</span>
                      <strong className="text-slate-900 block">{formatCOP(ord.sale_price_cop)}</strong>
                      <p className="text-[10px] text-indigo-600 font-medium">
                        Com. Dropi: -{formatCOP(ord.dropi_commission_cop)}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        Admin 5%: -{formatCOP(ord.admin_fee_cop)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-slate-400 uppercase block">Dinero Recibido</span>
                      <strong className="text-blue-900 block">
                        {ord.amount_received_cop ? formatCOP(ord.amount_received_cop) : 'Pendiente cobro'}
                      </strong>
                      <p className="text-[10px] text-slate-500">
                        Costo producto: -{formatCOP(ord.product_cost_cop)}
                      </p>
                    </div>

                    <div>
                      <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                        {ord.status === 'liquidado' ? 'Liquidado Vendedor' : 'Parte Estimada'}
                      </span>
                      <strong className="text-sm font-black text-emerald-700 block">
                        {formatCOP(
                          ord.status === 'liquidado'
                            ? ord.final_seller_profit_cop
                            : ord.suggested_seller_profit_cop ?? ord.estimated_seller_profit_cop
                        )}
                      </strong>
                      {ord.payout_voucher && (
                        <p className="text-[10px] text-slate-500 font-mono truncate">
                          Comprobante: {ord.payout_voucher}
                        </p>
                      )}
                      {ord.adjustment_reason && (
                        <p className="text-[10px] text-amber-700 italic truncate" title={ord.adjustment_reason}>
                          Motivo: {ord.adjustment_reason}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Botones de Acción según el Estado */}
                  <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
                    {ord.status === 'creado' && (
                      <button
                        onClick={() => openActionModal(ord, 'order_dropi')}
                        className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <span>Pedir en Dropi</span>
                        <ChevronRight className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {ord.status === 'pedido_en_dropi' && (
                      <button
                        onClick={() => handleQuickStatus(ord.id, 'en_transito')}
                        className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Marcar En Tránsito</span>
                      </button>
                    )}

                    {ord.status === 'en_transito' && (
                      <button
                        onClick={() => handleQuickStatus(ord.id, 'entregado')}
                        className="px-3.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Marcar Entregado (Cliente Recibió)</span>
                      </button>
                    )}

                    {ord.status === 'entregado' && (
                      <button
                        onClick={() => openActionModal(ord, 'money_received')}
                        className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1 shadow-2xs"
                      >
                        <DollarSign className="w-3.5 h-3.5" />
                        <span>Registrar Dinero en Billetera Dropi</span>
                      </button>
                    )}

                    {ord.status === 'dinero_recibido' && (
                      <button
                        onClick={() => openActionModal(ord, 'liquidate')}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition flex items-center gap-1 shadow-xs"
                      >
                        <Check className="w-4 h-4" />
                        <span>Liquidar Ganancia al Vendedor</span>
                      </button>
                    )}

                    {ord.status === 'liquidado' && (
                      <span className="text-xs font-bold text-emerald-800 flex items-center gap-1 bg-emerald-50 px-3 py-1 rounded-xl border border-emerald-200">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Liquidado el {new Date(ord.liquidated_at).toLocaleDateString('es-CO')}</span>
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: PEDIR EN DROPI */}
      {modalAction === 'order_dropi' && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Pedir en Dropi Contra Entrega</h3>
              <button onClick={() => setModalAction(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-amber-50 border border-amber-200 p-3 rounded-2xl text-xs space-y-1">
              <strong className="text-amber-950 font-bold block">
                Transportadora Bloqueada: {selectedOrder.carrier_name}
              </strong>
              <p className="text-[11px] text-amber-800">
                Pide este pedido en app.dropi.co seleccionando <strong>{selectedOrder.carrier_name}</strong> para respetar la cotización en vivo del vendedor.
              </p>
            </div>

            <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 text-xs space-y-1 select-all font-mono">
              <p><strong>Cliente:</strong> {selectedOrder.customer_name} ({selectedOrder.customer_phone})</p>
              <p><strong>Destino:</strong> {selectedOrder.city_name}, {selectedOrder.department}</p>
              <p><strong>Dirección:</strong> {selectedOrder.address}</p>
              {selectedOrder.neighborhood && <p><strong>Barrio:</strong> {selectedOrder.neighborhood}</p>}
              <p><strong>Cobro al cliente:</strong> {formatCOP(selectedOrder.sale_price_cop)}</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Número de Orden en Dropi (#) *
              </label>
              <input
                type="text"
                required
                value={dropiOrderIdInput}
                onChange={(e) => setDropiOrderIdInput(e.target.value)}
                placeholder="Ej: 8492041"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={submitOrderAction}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold transition"
            >
              {isSubmitting ? 'Guardando...' : 'Confirmar Pedido Hecho en Dropi'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 2: REGISTRAR DINERO RECIBIDO EN BILLETERA */}
      {modalAction === 'money_received' && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-md w-full space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Dinero Recibido en Billetera Dropi</h3>
              <button onClick={() => setModalAction(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Ingresa el monto neto exacto que ingresó a tu cuenta de Dropi por este pedido entregado.
            </p>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Monto Recibido ($ COP) *</label>
              <input
                type="number"
                step="100"
                value={amountReceivedInput}
                onChange={(e) => setAmountReceivedInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={submitOrderAction}
              disabled={isSubmitting}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition"
            >
              {isSubmitting ? 'Guardando...' : 'Guardar y Calcular Liquidación Sugerida'}
            </button>
          </div>
        </div>
      )}

      {/* MODAL 3: LIQUIDAR GANANCIA AL VENDEDOR */}
      {modalAction === 'liquidate' && selectedOrder && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-3xl p-6 max-w-lg w-full space-y-4 shadow-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Liquidar Parte al Vendedor</h3>
              <button onClick={() => setModalAction(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 text-xs space-y-1.5">
              <div className="flex justify-between">
                <span>Dinero recibido de Dropi:</span>
                <strong className="text-slate-900">
                  {formatCOP(selectedOrder.amount_received_cop || selectedOrder.sale_price_cop)}
                </strong>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Costo producto:</span>
                <span>-{formatCOP(selectedOrder.product_cost_cop)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Flete real:</span>
                <span>-{formatCOP(selectedOrder.flete_total_cop)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Comisión Dropi:</span>
                <span>-{formatCOP(selectedOrder.dropi_commission_cop)}</span>
              </div>
              <div className="flex justify-between text-slate-500">
                <span>Comisión Admin 5%:</span>
                <span>-{formatCOP(selectedOrder.admin_fee_cop)}</span>
              </div>
              <div className="border-t border-slate-200 pt-1.5 flex justify-between font-bold text-emerald-800">
                <span>Parte Sugerida Calculada:</span>
                <span className="text-sm font-black">
                  {formatCOP(
                    selectedOrder.suggested_seller_profit_cop ?? selectedOrder.estimated_seller_profit_cop
                  )}
                </span>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Parte Final a Pagar al Vendedor ($ COP) *
              </label>
              <input
                type="number"
                value={finalProfitInput}
                onChange={(e) => setFinalProfitInput(Number(e.target.value))}
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-black text-emerald-800 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Motivo obligatorio si difiere de lo sugerido */}
            {finalProfitInput !==
              (selectedOrder.suggested_seller_profit_cop ?? selectedOrder.estimated_seller_profit_cop) && (
              <div className="space-y-1">
                <label className="block text-xs font-bold text-amber-900 flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                  <span>Motivo del Ajuste (Obligatorio) *</span>
                </label>
                <textarea
                  required
                  rows={2}
                  value={adjustmentReasonInput}
                  onChange={(e) => setAdjustmentReasonInput(e.target.value)}
                  placeholder="Ej: Se ajustó por diferencia de flete cobrado por transportadora en reexpedición..."
                  className="w-full px-3 py-2 bg-amber-50/50 border border-amber-300 rounded-xl text-xs focus:outline-none"
                />
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Comprobante de Pago al Vendedor *
              </label>
              <input
                type="text"
                required
                value={payoutVoucherInput}
                onChange={(e) => setPayoutVoucherInput(e.target.value)}
                placeholder="Ej: Nequi ref #948201 / Bancolombia #129384"
                className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
              />
            </div>

            <button
              onClick={submitOrderAction}
              disabled={isSubmitting}
              className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-black transition shadow-xs flex items-center justify-center gap-1"
            >
              {isSubmitting ? 'Guardando Liquidación...' : 'Confirmar Liquidación y Marcar Pagado'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
