'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { formatCOP } from '@/config/pricing';
import { DROPI_COLOMBIA_GEO, DropiCity } from '@/lib/dropi-geography';
import {
  ShoppingBag,
  Truck,
  Calculator,
  Package,
  Search,
  CheckCircle2,
  AlertTriangle,
  Clock,
  DollarSign,
  ArrowRight,
  ShieldCheck,
  User,
  Phone,
  MapPin,
  LogOut,
  RefreshCw,
  Info,
  Check,
  Layers,
  ChevronRight,
  Sparkles,
} from 'lucide-react';

interface SellerSession {
  id: number;
  name: string;
  email: string;
  phone: string;
  status: 'pending' | 'approved' | 'rejected' | 'suspended';
}

interface ProductSummary {
  id_dropi: number;
  name: string;
  cost_cop: number;
  suggested_price_cop?: number | null;
  sell_price_cop: number;
  supplier_name: string | null;
  image_url: string | null;
  weight_kg?: number | null;
  length_cm?: number | null;
  width_cm?: number | null;
  height_cm?: number | null;
  origin_city_id?: number | null;
  origin_city_name?: string | null;
}

export default function SellerPortalPage() {
  const router = useRouter();
  const [seller, setSeller] = useState<SellerSession | null>(null);
  const [isLoadingSession, setIsLoadingSession] = useState(true);

  // Tabs
  const [activeTab, setActiveTab] = useState<'quote' | 'orders'>('quote');

  // Buscador de productos
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<ProductSummary[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<ProductSummary | null>(null);

  // Parámetros de cotización
  const [quantity, setQuantity] = useState<number>(1);
  const [customSalePrice, setCustomSalePrice] = useState<number>(0);
  const [selectedDept, setSelectedDept] = useState<string>('BOGOTA D.C.');
  const [selectedCityId, setSelectedCityId] = useState<number>(1);
  const [cityOptions, setCityOptions] = useState<DropiCity[]>([]);

  // Estado de cotización en vivo
  const [isQuoting, setIsQuoting] = useState(false);
  const [quoteData, setQuoteData] = useState<any | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);
  const [selectedCarrierName, setSelectedCarrierName] = useState<string>('');

  // Formulario cliente de despacho
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [address, setAddress] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [referencePoint, setReferencePoint] = useState('');
  const [orderNotes, setOrderNotes] = useState('');
  const [isCreatingOrder, setIsCreatingOrder] = useState(false);
  const [orderSuccessMsg, setOrderSuccessMsg] = useState<string | null>(null);

  // Pedidos del vendedor
  const [myOrders, setMyOrders] = useState<any[]>([]);
  const [isLoadingOrders, setIsLoadingOrders] = useState(false);

  // 1. Validar sesión de vendedor
  useEffect(() => {
    async function checkAuth() {
      try {
        const res = await fetch('/api/seller/auth/session');
        const json = await res.json();
        if (json.authenticated && json.seller) {
          setSeller(json.seller);
        } else {
          router.push('/seller/login');
        }
      } catch {
        router.push('/seller/login');
      } finally {
        setIsLoadingSession(false);
      }
    }
    checkAuth();
  }, [router]);

  // 2. Actualizar selector de ciudades al cambiar departamento
  useEffect(() => {
    const deptData = DROPI_COLOMBIA_GEO.find(
      (d) => d.name.toLowerCase() === selectedDept.toLowerCase()
    );
    if (deptData && deptData.cities.length > 0) {
      setCityOptions(deptData.cities);
      setSelectedCityId(deptData.cities[0].id);
    } else {
      setCityOptions([]);
    }
  }, [selectedDept]);

  // 3. Buscar productos para cotizar
  useEffect(() => {
    if (!searchQuery.trim() || searchQuery.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await fetch(`/api/products?search=${encodeURIComponent(searchQuery)}&limit=6`);
        const json = await res.json();
        if (json.success && json.data) {
          setSearchResults(json.data);
        }
      } catch {
      } finally {
        setIsSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // 4. Cargar pedidos del vendedor
  const loadMyOrders = async () => {
    setIsLoadingOrders(true);
    try {
      const res = await fetch('/api/seller/orders');
      const json = await res.json();
      if (json.success) {
        setMyOrders(json.data || []);
      }
    } catch {
    } finally {
      setIsLoadingOrders(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'orders') {
      loadMyOrders();
    }
  }, [activeTab]);

  // Selección de producto
  const handleSelectProduct = (prod: ProductSummary) => {
    setSelectedProduct(prod);
    setSearchQuery('');
    setSearchResults([]);
    setCustomSalePrice(prod.suggested_price_cop || prod.sell_price_cop);
    setQuoteData(null);
    setQuoteError(null);
  };

  // Ejecutar cotización en vivo con Dropi API v2
  const handleQuote = async () => {
    if (!selectedProduct) return;
    setIsQuoting(true);
    setQuoteError(null);
    setQuoteData(null);

    const destCity = cityOptions.find((c) => c.id === selectedCityId);

    try {
      const res = await fetch('/api/seller/quote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          product_id: selectedProduct.id_dropi,
          quantity,
          sale_price: customSalePrice,
          destination_city_id: selectedCityId,
          destination_city_name: destCity ? destCity.name : 'BOGOTA, D.C.',
        }),
      });

      const json = await res.json();
      if (json.success && json.data) {
        setQuoteData(json.data);
        // Preseleccionar transportadora recomendada (Inter Rapidísimo por defecto si está)
        if (json.data.recommended_carrier) {
          setSelectedCarrierName(json.data.recommended_carrier.carrier_name);
        } else if (json.data.carriers && json.data.carriers.length > 0) {
          setSelectedCarrierName(json.data.carriers[0].carrier_name);
        }
      } else {
        setQuoteError(json.error || 'Error al cotizar con Dropi');
      }
    } catch (err: any) {
      setQuoteError('Error de red al consultar cotización');
    } finally {
      setIsQuoting(false);
    }
  };

  // Transportadora seleccionada activa
  const activeCarrier =
    quoteData?.carriers?.find((c: any) => c.carrier_name === selectedCarrierName) ||
    quoteData?.recommended_carrier ||
    null;

  // Recálculo dinámico de Comisión Dropi al cambiar transportadora:
  // Comisión Dropi = 5% × (precioVenta - Flete)
  const dynamicDropiCommission = activeCarrier
    ? Math.max(0, Math.round(0.05 * (customSalePrice - activeCarrier.flete_total)))
    : 0;

  const dynamicAdminFee = selectedProduct
    ? Math.round(selectedProduct.cost_cop * quantity * 0.05)
    : 0;

  const dynamicTotalCost =
    (selectedProduct?.cost_cop || 0) * quantity +
    dynamicAdminFee +
    (activeCarrier?.flete_total || 0) +
    dynamicDropiCommission;

  const dynamicEstimatedSellerProfit = customSalePrice - dynamicTotalCost;

  // Registrar pedido interno
  const handleCreateOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !activeCarrier || !quoteData) return;

    setIsCreatingOrder(true);
    setOrderSuccessMsg(null);

    const destCity = cityOptions.find((c) => c.id === selectedCityId);

    try {
      const res = await fetch('/api/seller/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: customerName,
          customer_phone: customerPhone,
          department: selectedDept,
          city_id: selectedCityId,
          city_name: destCity ? destCity.name : 'BOGOTA, D.C.',
          address,
          neighborhood,
          reference_point: referencePoint,
          product_id: selectedProduct.id_dropi,
          product_name: selectedProduct.name,
          quantity,
          supplier_name: selectedProduct.supplier_name,
          origin_city_id: quoteData.origin_city?.id || 1,
          origin_city_name: quoteData.origin_city?.name || 'BOGOTA, D.C.',
          carrier_name: activeCarrier.carrier_name,
          sale_price_cop: customSalePrice,
          product_cost_cop: selectedProduct.cost_cop * quantity,
          admin_fee_cop: dynamicAdminFee,
          flete_precio_envio: activeCarrier.precio_envio,
          flete_seguro_envio: activeCarrier.seguro_envio,
          flete_total_cop: activeCarrier.flete_total,
          dropi_commission_cop: dynamicDropiCommission,
          total_cost_cop: dynamicTotalCost,
          estimated_seller_profit_cop: dynamicEstimatedSellerProfit,
          quote_snapshot: {
            ...quoteData,
            selected_carrier: activeCarrier,
            dropi_commission: dynamicDropiCommission,
            total_cost: dynamicTotalCost,
            estimated_seller_profit: dynamicEstimatedSellerProfit,
          },
          notes: orderNotes,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setOrderSuccessMsg(`¡Pedido registrado exitosamente! Número: ${json.order?.order_number}`);
        // Reset form
        setCustomerName('');
        setCustomerPhone('');
        setAddress('');
        setNeighborhood('');
        setReferencePoint('');
        setOrderNotes('');
        setSelectedProduct(null);
        setQuoteData(null);
      } else {
        alert(json.error || 'Error al registrar pedido');
      }
    } catch {
      alert('Error de conexión');
    } finally {
      setIsCreatingOrder(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/seller/auth/session', { method: 'POST' });
    router.push('/seller/login');
  };

  if (isLoadingSession) {
    return (
      <div className="min-h-screen bg-[#F8FAFC] flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      {/* Barra Superior del Vendedor */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Link href="/" className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black shadow-xs">
              <ShoppingBag className="w-5 h-5" />
            </Link>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-base font-black text-slate-900 tracking-tight">Portal Vendedores</span>
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md font-bold uppercase">
                  PideFácil COD
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium">
                Vendedor: <strong className="text-slate-800">{seller?.name}</strong> •{' '}
                <span
                  className={`inline-flex items-center gap-1 font-bold ${
                    seller?.status === 'approved' ? 'text-emerald-700' : 'text-amber-700'
                  }`}
                >
                  {seller?.status === 'approved' ? '✅ Aprobado' : '⏳ Pendiente Aprobación'}
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleLogout}
              className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition text-xs font-bold flex items-center gap-1"
              title="Cerrar Sesión"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Salir</span>
            </button>
          </div>
        </div>

        {/* Pestañas */}
        <div className="max-w-6xl mx-auto px-4 flex gap-4 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('quote')}
            className={`py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'quote'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Calculator className="w-4 h-4" />
            <span>Cotizador en Vivo & Nuevo Pedido</span>
          </button>
          <button
            onClick={() => setActiveTab('orders')}
            className={`py-2.5 text-xs font-bold border-b-2 transition flex items-center gap-1.5 ${
              activeTab === 'orders'
                ? 'border-emerald-600 text-emerald-700'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>Mis Pedidos & Liquidaciones</span>
          </button>
        </div>
      </header>

      {/* Banner si el vendedor está pendiente de aprobación */}
      {seller?.status !== 'approved' && (
        <div className="bg-amber-500 text-amber-950 px-4 py-2.5 text-xs font-bold text-center flex items-center justify-center gap-2">
          <AlertTriangle className="w-4 h-4" />
          <span>
            Tu cuenta está en estado <strong>Pendiente de Aprobación</strong> por el administrador. Podrás cotizar una vez el administrador la apruebe.
          </span>
        </div>
      )}

      <main className="max-w-6xl mx-auto px-4 py-6">
        {orderSuccessMsg && (
          <div className="mb-6 bg-emerald-50 border border-emerald-200 text-emerald-900 p-4 rounded-2xl flex items-center gap-2 text-sm font-bold shadow-xs animate-fadeIn">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 flex-shrink-0" />
            <span>{orderSuccessMsg}</span>
          </div>
        )}

        {/* PESTAÑA 1: COTIZADOR EN VIVO & NUEVO PEDIDO */}
        {activeTab === 'quote' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Columna Izquierda: Parámetros del Pedido y Cotización */}
            <div className="lg:col-span-7 space-y-6">
              {/* Paso 1: Selección de Producto */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">
                      1
                    </span>
                    <span>Seleccionar Producto del Catálogo</span>
                  </h3>
                  {selectedProduct && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProduct(null);
                        setQuoteData(null);
                      }}
                      className="text-xs text-rose-600 hover:underline font-bold"
                    >
                      Cambiar Producto
                    </button>
                  )}
                </div>

                {!selectedProduct ? (
                  <div className="space-y-2">
                    <div className="relative">
                      <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar por nombre o Dropi ID (ej: ollas, reloj, colágeno)..."
                        className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
                      />
                      {isSearching && (
                        <RefreshCw className="w-4 h-4 text-slate-400 animate-spin absolute right-3.5 top-3.5" />
                      )}
                    </div>

                    {searchResults.length > 0 && (
                      <div className="border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 bg-white shadow-lg max-h-60 overflow-y-auto">
                        {searchResults.map((prod) => (
                          <div
                            key={prod.id_dropi}
                            onClick={() => handleSelectProduct(prod)}
                            className="p-3 hover:bg-emerald-50/50 cursor-pointer flex items-center justify-between gap-3 transition"
                          >
                            <div className="flex items-center gap-3">
                              {prod.image_url ? (
                                <img
                                  src={prod.image_url}
                                  alt={prod.name}
                                  className="w-10 h-10 object-cover rounded-xl border border-slate-100"
                                />
                              ) : (
                                <div className="w-10 h-10 bg-slate-100 rounded-xl" />
                              )}
                              <div>
                                <p className="text-xs font-bold text-slate-800 line-clamp-1">{prod.name}</p>
                                <p className="text-[10px] text-slate-400">
                                  ID: #{prod.id_dropi} • {prod.supplier_name || 'Proveedor Dropi'}
                                </p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-black text-emerald-700">{formatCOP(prod.cost_cop)}</p>
                              <p className="text-[10px] text-slate-400">Costo base</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      {selectedProduct.image_url && (
                        <img
                          src={selectedProduct.image_url}
                          alt={selectedProduct.name}
                          className="w-14 h-14 object-cover rounded-2xl border border-slate-200"
                        />
                      )}
                      <div>
                        <span className="text-[10px] bg-white border border-slate-200 text-slate-700 font-black px-2 py-0.5 rounded-md">
                          #{selectedProduct.id_dropi}
                        </span>
                        <h4 className="text-xs font-black text-slate-900 mt-1 line-clamp-1">
                          {selectedProduct.name}
                        </h4>
                        <p className="text-[10px] text-slate-500">
                          Proveedor: <strong>{selectedProduct.supplier_name || 'Dropi'}</strong>
                        </p>
                      </div>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">{formatCOP(selectedProduct.cost_cop)}</p>
                      <p className="text-[10px] text-slate-400">Costo Dropi</p>
                    </div>
                  </div>
                )}

                {/* Advertencia si no tiene peso/dimensiones */}
                {selectedProduct &&
                  !selectedProduct.weight_kg &&
                  (!selectedProduct.length_cm || !selectedProduct.width_cm || !selectedProduct.height_cm) && (
                    <div className="bg-amber-50 border border-amber-200 text-amber-900 p-3 rounded-2xl text-xs flex items-start gap-2">
                      <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <strong className="block font-bold">Sin datos de peso o dimensiones</strong>
                        <p className="text-[11px] text-amber-800 mt-0.5">
                          Este producto no tiene configuradas medidas en el catálogo. Pide al administrador que registre el peso real en el panel para cotizar flete en vivo.
                        </p>
                      </div>
                    </div>
                  )}
              </div>

              {/* Paso 2: Destino y Parámetros Comerciales */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                  <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-700 text-xs font-black flex items-center justify-center">
                    2
                  </span>
                  <span>Destino de Envío & Precio de Venta</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Departamento */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      <span>Departamento Destino *</span>
                    </label>
                    <select
                      value={selectedDept}
                      onChange={(e) => setSelectedDept(e.target.value)}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                    >
                      {DROPI_COLOMBIA_GEO.map((d) => (
                        <option key={d.name} value={d.name}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Ciudad */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Ciudad / Municipio Destino (ID Dropi) *
                    </label>
                    <select
                      value={selectedCityId}
                      onChange={(e) => setSelectedCityId(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                    >
                      {cityOptions.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name} (#{c.id})
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                  {/* Cantidad */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Cantidad de Unidades *</label>
                    <input
                      type="number"
                      min="1"
                      max="50"
                      value={quantity}
                      onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value, 10) || 1))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  {/* Precio de Venta Editable */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center justify-between">
                      <span>Precio de Venta a Cobrar *</span>
                      <span className="text-[10px] text-slate-400 font-normal">Editable por vendedor</span>
                    </label>
                    <input
                      type="number"
                      step="1000"
                      value={customSalePrice}
                      onChange={(e) => setCustomSalePrice(Number(e.target.value))}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-emerald-800 focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Botón de Cotización en Vivo */}
                <button
                  type="button"
                  onClick={handleQuote}
                  disabled={!selectedProduct || isQuoting || seller?.status !== 'approved'}
                  className="w-full py-3 bg-slate-900 hover:bg-slate-800 disabled:bg-slate-200 disabled:text-slate-400 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 mt-2"
                >
                  {isQuoting ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                      <span>Cotizando Flete en Vivo con Dropi...</span>
                    </>
                  ) : (
                    <>
                      <Truck className="w-4 h-4 text-emerald-400" />
                      <span>COTIZAR FLETE EN VIVO (DROPI / INTER RAPIDÍSIMO)</span>
                    </>
                  )}
                </button>

                {quoteError && (
                  <div className="bg-rose-50 border border-rose-200 text-rose-800 p-3 rounded-2xl text-xs font-bold flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 flex-shrink-0" />
                    <span>{quoteError}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Columna Derecha: Desglose Financiero y Formulario Cliente */}
            <div className="lg:col-span-5 space-y-6">
              {/* Desglose Financiero en Vivo */}
              <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <Calculator className="w-4 h-4 text-emerald-600" />
                    <span>Desglose de Liquidación en Vivo</span>
                  </h3>
                  {quoteData && (
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(quoteData.quoted_at).toLocaleTimeString('es-CO', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  )}
                </div>

                {quoteData ? (
                  <div className="space-y-3">
                    {/* Alerta de cobertura Inter Rapidísimo */}
                    {quoteData.inter_available ? (
                      <div className="bg-emerald-50 border border-emerald-200/80 p-2.5 rounded-xl text-xs font-bold text-emerald-900 flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
                        <span>Transportadora oficial: Inter Rapidísimo disponible</span>
                      </div>
                    ) : (
                      <div className="bg-amber-50 border border-amber-200/80 p-2.5 rounded-xl text-xs font-bold text-amber-900 flex items-center gap-2">
                        <Info className="w-4 h-4 text-amber-600 flex-shrink-0" />
                        <span>{quoteData.inter_coverage_message || 'Inter Rapidísimo no cubre este destino.'}</span>
                      </div>
                    )}

                    {/* Selector de transportadoras disponibles */}
                    {quoteData.carriers && quoteData.carriers.length > 1 && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                          Cambiar Transportadora:
                        </label>
                        <select
                          value={selectedCarrierName}
                          onChange={(e) => setSelectedCarrierName(e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold"
                        >
                          {quoteData.carriers.map((c: any) => (
                            <option key={c.carrier_name} value={c.carrier_name}>
                              {c.carrier_name} — {formatCOP(c.flete_total)}
                            </option>
                          ))}
                        </select>
                      </div>
                    )}

                    {/* Tabla de Desglose Financiero */}
                    <div className="bg-slate-50 p-4 rounded-2xl border border-slate-100 space-y-2 text-xs">
                      <div className="flex justify-between items-center text-slate-700 font-semibold">
                        <span>Precio de Venta al Cliente:</span>
                        <span className="font-black text-slate-900">{formatCOP(customSalePrice)}</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-500">
                        <span>Costo Base Producto ({quantity} un):</span>
                        <span className="font-mono">-{formatCOP((selectedProduct?.cost_cop || 0) * quantity)}</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-500">
                        <span>Comisión Admin PideFácil (5%):</span>
                        <span className="font-mono">-{formatCOP(dynamicAdminFee)}</span>
                      </div>

                      <div className="flex justify-between items-center text-slate-500">
                        <span>
                          Flete {activeCarrier?.carrier_name} (
                          {activeCarrier?.precio_envio ? formatCOP(activeCarrier.precio_envio) : ''} +{' '}
                          {activeCarrier?.seguro_envio ? `Seguro ${formatCOP(activeCarrier.seguro_envio)}` : ''}):
                        </span>
                        <span className="font-mono">-{formatCOP(activeCarrier?.flete_total || 0)}</span>
                      </div>

                      {/* LÍNEA OBLIGATORIA: Comisión de plataforma Dropi */}
                      <div className="flex justify-between items-center text-indigo-700 font-bold bg-indigo-50/60 p-1.5 rounded-lg border border-indigo-100">
                        <span>Comisión de plataforma Dropi:</span>
                        <span className="font-mono">-{formatCOP(dynamicDropiCommission)}</span>
                      </div>

                      <div className="border-t border-slate-200 pt-2 flex justify-between items-center text-slate-700 font-bold">
                        <span>Costo Total de la Operación:</span>
                        <span className="font-mono text-slate-900">{formatCOP(dynamicTotalCost)}</span>
                      </div>

                      <div className="border-t-2 border-emerald-500 pt-2 flex justify-between items-center bg-emerald-100/60 p-2.5 rounded-xl border border-emerald-300">
                        <span className="text-xs font-black text-emerald-950 uppercase">
                          Parte Estimada del Vendedor:
                        </span>
                        <span className="text-base font-black text-emerald-800">
                          {formatCOP(dynamicEstimatedSellerProfit)}
                        </span>
                      </div>
                    </div>

                    <p className="text-[10px] text-slate-400 leading-tight">
                      * El vendedor no paga por adelantado. Una vez el cliente pague en efectivo al transportador y el dinero ingrese a la cuenta del admin, se liquida tu ganancia neta.
                    </p>
                  </div>
                ) : (
                  <div className="text-center py-8 text-slate-400 space-y-2">
                    <Truck className="w-8 h-8 mx-auto opacity-30" />
                    <p className="text-xs">Selecciona producto y destino para ver la cotización de flete en vivo.</p>
                  </div>
                )}
              </div>

              {/* Formulario de Despacho del Cliente */}
              {quoteData && activeCarrier && (
                <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm space-y-4 animate-fadeIn">
                  <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span>Datos del Cliente (Pago Contra Entrega)</span>
                  </h3>

                  <form onSubmit={handleCreateOrder} className="space-y-3">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Nombre Completo *</label>
                      <input
                        type="text"
                        required
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        placeholder="Ej: Laura Martínez"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Celular de Contacto *</label>
                      <input
                        type="tel"
                        required
                        value={customerPhone}
                        onChange={(e) => setCustomerPhone(e.target.value)}
                        placeholder="Ej: 3109876543"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Dirección Exacta *</label>
                      <input
                        type="text"
                        required
                        value={address}
                        onChange={(e) => setAddress(e.target.value)}
                        placeholder="Ej: Carrera 15 # 45-20 Apto 402"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Barrio *</label>
                        <input
                          type="text"
                          required
                          value={neighborhood}
                          onChange={(e) => setNeighborhood(e.target.value)}
                          placeholder="Ej: Chapinero"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-700 mb-1">Punto Referencia</label>
                        <input
                          type="text"
                          value={referencePoint}
                          onChange={(e) => setReferencePoint(e.target.value)}
                          placeholder="Ej: Frente al parque"
                          className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-700 mb-1">Notas para Dropi / Transportadora</label>
                      <input
                        type="text"
                        value={orderNotes}
                        onChange={(e) => setOrderNotes(e.target.value)}
                        placeholder="Ej: Entregar después de las 2pm"
                        className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:border-emerald-500"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isCreatingOrder}
                      className="w-full py-3 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-xs transition flex items-center justify-center gap-2 mt-2"
                    >
                      {isCreatingOrder ? (
                        <span>Registrando Pedido...</span>
                      ) : (
                        <>
                          <span>REGISTRAR PEDIDO INTERNO EN PIDEFÁCIL</span>
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                    <p className="text-[10px] text-center text-slate-400">
                      El administrador creará este pedido en Dropi contra entrega con estos mismos datos exactos.
                    </p>
                  </form>
                </div>
              )}
            </div>
          </div>
        )}

        {/* PESTAÑA 2: MIS PEDIDOS & LIQUIDACIONES */}
        {activeTab === 'orders' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-black text-slate-900">Historial de Pedidos y Estado de Liquidación</h3>
              <button
                onClick={loadMyOrders}
                disabled={isLoadingOrders}
                className="p-2 bg-white border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl transition text-xs font-bold flex items-center gap-1 shadow-2xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isLoadingOrders ? 'animate-spin' : ''}`} />
                <span>Actualizar</span>
              </button>
            </div>

            {isLoadingOrders ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
                <RefreshCw className="w-8 h-8 text-emerald-600 animate-spin mx-auto" />
                <p className="text-xs text-slate-500 font-bold">Cargando tus pedidos...</p>
              </div>
            ) : myOrders.length === 0 ? (
              <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-2">
                <Package className="w-10 h-10 text-slate-300 mx-auto" />
                <h4 className="text-sm font-black text-slate-800">Aún no tienes pedidos registrados</h4>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Utiliza la pestaña de cotización en vivo para ingresar tu primera orden de venta.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {myOrders.map((ord) => (
                  <div
                    key={ord.id}
                    className="bg-white rounded-3xl border border-slate-200 shadow-2xs p-4 sm:p-5 space-y-3"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-black text-slate-900 bg-slate-100 px-2.5 py-1 rounded-lg">
                          {ord.order_number}
                        </span>
                        <span className="text-xs font-bold text-slate-600">{ord.product_name}</span>
                        <span className="text-xs text-slate-400">({ord.quantity} un)</span>
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
                          <span className="text-[10px] font-mono text-slate-500 bg-slate-50 px-2 py-0.5 rounded border">
                            Dropi #{ord.dropi_order_id}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Destino</span>
                        <span className="font-bold text-slate-800">
                          {ord.city_name}, {ord.department}
                        </span>
                        <p className="text-[10px] text-slate-500 truncate">{ord.customer_name}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Transportadora</span>
                        <span className="font-bold text-slate-800">{ord.carrier_name}</span>
                        <p className="text-[10px] text-slate-500">Flete: {formatCOP(ord.flete_total_cop)}</p>
                      </div>

                      <div>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">Venta Cobrada</span>
                        <span className="font-black text-slate-900">{formatCOP(ord.sale_price_cop)}</span>
                        <p className="text-[10px] text-indigo-600 font-medium">
                          Com. Dropi: {formatCOP(ord.dropi_commission_cop)}
                        </p>
                      </div>

                      <div>
                        <span className="text-[10px] text-emerald-700 font-bold uppercase block">
                          {ord.status === 'liquidado' ? 'Ganancia Liquidada' : 'Parte Estimada'}
                        </span>
                        <span className="text-sm font-black text-emerald-700">
                          {formatCOP(
                            ord.status === 'liquidado'
                              ? ord.final_seller_profit_cop
                              : ord.estimated_seller_profit_cop
                          )}
                        </span>
                        {ord.payout_voucher && (
                          <p className="text-[10px] text-slate-400 truncate">Comp: {ord.payout_voucher}</p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
