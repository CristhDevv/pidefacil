'use client';

import React, { useState } from 'react';
import { COLOMBIA_GEO } from '@/lib/colombia-geo';
import { formatCOP } from '@/config/pricing';
import { detectPackOfferInfo } from '@/lib/pack-detector';
import { ProductSummary } from './ProductGrid';
import {
  X,
  ShieldCheck,
  Truck,
  MapPin,
  User,
  Phone,
  Home,
  AlertCircle,
  Loader2,
} from 'lucide-react';

interface CodCheckoutModalProps {
  product: ProductSummary;
  quantityType: '1x' | '2x';
  selectedVariation?: string;
  selectedVariationId?: number | null;
  totalAmount: number;
  onClose: () => void;
  onSuccess: (orderData: any) => void;
}

export const CodCheckoutModal: React.FC<CodCheckoutModalProps> = ({
  product,
  quantityType,
  selectedVariation,
  selectedVariationId,
  totalAmount,
  onClose,
  onSuccess,
}) => {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [department, setDepartment] = useState('Bogotá D.C.');
  const [city, setCity] = useState('Bogotá D.C.');
  const [neighborhood, setNeighborhood] = useState('');
  const [address, setAddress] = useState('');
  const [reference, setReference] = useState('');
  const [confirmedCash, setConfirmedCash] = useState(true);
  const [notes, setNotes] = useState('');

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [apiError, setApiError] = useState<string | null>(null);

  // Lista dinámica de ciudades del departamento seleccionado
  const selectedDeptData = COLOMBIA_GEO.find((d) => d.name === department);
  const cityOptions = selectedDeptData ? selectedDeptData.cities : [];

  const handleDepartmentChange = (dept: string) => {
    setDepartment(dept);
    const found = COLOMBIA_GEO.find((d) => d.name === dept);
    if (found && found.cities.length > 0) {
      setCity(found.cities[0]);
    } else {
      setCity('');
    }
  };

  const validateForm = () => {
    const errs: Record<string, string> = {};

    if (!name.trim() || name.trim().length < 3) {
      errs.name = 'Ingresa tu nombre y apellido completo.';
    }

    const cleanPhone = phone.replace(/\D/g, '');
    if (!/^3\d{9}$/.test(cleanPhone)) {
      errs.phone = 'Ingresa un número de celular de 10 dígitos que inicie por 3 (ej: 3001234567).';
    }

    if (!department) {
      errs.department = 'Selecciona el departamento.';
    }

    if (!city) {
      errs.city = 'Selecciona la ciudad o municipio.';
    }

    if (!neighborhood.trim() || neighborhood.trim().length < 2) {
      errs.neighborhood = 'El barrio es obligatorio para evitar devoluciones de la transportadora.';
    }

    if (!address.trim() || address.trim().length < 5) {
      errs.address = 'Ingresa tu dirección completa (calle/carrera, número, casa/apto).';
    }

    if (!reference.trim() || reference.trim().length < 3) {
      errs.reference = 'El punto de referencia es obligatorio (ej: Frente a panadería, casa reja blanca).';
    }

    if (!confirmedCash) {
      errs.confirmedCash = 'Debes confirmar que habrá alguien para recibir y pagar en efectivo.';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setApiError(null);

    if (!validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          customer_name: name.trim(),
          customer_phone: phone.replace(/\D/g, ''),
          department,
          city,
          neighborhood: neighborhood.trim(),
          address: address.trim(),
          reference_point: reference.trim(),
          confirmed_cash: confirmedCash,
          product_id: product.id_dropi,
          quantity_type: quantityType,
          selected_variation: selectedVariation,
          selected_variation_id: selectedVariationId,
          notes: notes.trim(),
        }),
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        setApiError(data.error || 'Ocurrió un error al procesar tu pedido. Inténtalo de nuevo.');
        setIsSubmitting(false);
        return;
      }

      onSuccess(data.data);
    } catch (err: any) {
      console.error('Submit error:', err);
      setApiError('Error de red al conectar con el servidor. Verifica tu conexión.');
      setIsSubmitting(false);
    }
  };

  const packInfo = detectPackOfferInfo(product.name);
  const quantityOfferLabel =
    quantityType === '2x'
      ? packInfo.isPack
        ? `Lleva 2 Paquetes (${packInfo.packSize * 2} unidades en total)`
        : '2 Unidades (Dúo Pack — Más Elegido)'
      : packInfo.isPack
      ? `1 Paquete (${packInfo.packSize} unidades)`
      : '1 Unidad';

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        className="fixed inset-0"
        onClick={onClose}
        aria-hidden="true"
      />

      <div className="relative w-full max-w-lg bg-white rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden z-10 max-h-[92vh] flex flex-col animate-slide-up">
        {/* Header Modal */}
        <div className="bg-emerald-600 text-white px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xl">🇨🇴</span>
            <div>
              <h2 className="text-sm font-extrabold leading-none font-heading">
                Pide Fácil — Pago Contra Entrega
              </h2>
              <p className="text-[10px] text-emerald-100 font-medium font-sans">
                Pagas en efectivo al transportador en tu casa
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-white/80 hover:text-white p-1 rounded-full hover:bg-emerald-700 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Resumen Compacto del Pedido */}
        <div className="bg-emerald-50/70 border-b border-emerald-100 px-4 py-2.5 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-slate-800 line-clamp-1 font-heading">
              {product.name}
            </p>
            <p className="text-[11px] text-emerald-800 font-medium font-sans">
              Oferta: {quantityOfferLabel}
              {selectedVariation ? ` • Opción: ${selectedVariation}` : ''}
            </p>
          </div>
          <div className="text-right flex-shrink-0 ml-3">
            <span className="price-tag font-price text-base sm:text-lg font-extrabold text-emerald-800 tracking-tight">
              {formatCOP(totalAmount)}
            </span>
            <p className="text-[9px] text-slate-500 font-bold font-sans">TOTAL A PAGAR</p>
          </div>
        </div>

        {/* Formulario Mobile-First */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-4 space-y-3.5">
          {apiError && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-xl flex items-center gap-2 text-xs text-red-700 font-medium">
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
              <span>{apiError}</span>
            </div>
          )}

          {/* Nombre y Apellido */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-slate-500" />
              <span>Nombre y Apellido de quien recibe *</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (errors.name) setErrors((prev) => ({ ...prev, name: '' }));
              }}
              placeholder="Ej: Carlos Gómez"
              className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                errors.name
                  ? 'border-red-400 focus:ring-red-200 bg-red-50/30'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {errors.name && (
              <p className="text-[11px] text-red-600 font-medium mt-1">{errors.name}</p>
            )}
          </div>

          {/* Celular con WhatsApp */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
              <Phone className="w-3.5 h-3.5 text-slate-500" />
              <span>Celular / WhatsApp (10 dígitos) *</span>
            </label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-xs font-bold text-slate-400">
                +57
              </span>
              <input
                type="tel"
                value={phone}
                maxLength={10}
                onChange={(e) => {
                  setPhone(e.target.value.replace(/\D/g, ''));
                  if (errors.phone) setErrors((prev) => ({ ...prev, phone: '' }));
                }}
                placeholder="3001234567"
                className={`w-full pl-12 pr-3.5 py-2.5 bg-slate-50 rounded-xl border text-sm font-semibold tracking-wide focus:outline-none focus:ring-2 transition ${
                  errors.phone
                    ? 'border-red-400 focus:ring-red-200 bg-red-50/30'
                    : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
                }`}
              />
            </div>
            {errors.phone ? (
              <p className="text-[11px] text-red-600 font-medium mt-1">{errors.phone}</p>
            ) : (
              <p className="text-[10px] text-slate-500 mt-1">
                Te escribiremos por WhatsApp para confirmar tu despacho.
              </p>
            )}
          </div>

          {/* Departamento y Ciudad (Anidados) */}
          <div className="grid grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-slate-500" />
                <span>Departamento *</span>
              </label>
              <select
                value={department}
                onChange={(e) => handleDepartmentChange(e.target.value)}
                className="w-full px-2.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                {COLOMBIA_GEO.map((dept) => (
                  <option key={dept.name} value={dept.name}>
                    {dept.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1">
                <Home className="w-3.5 h-3.5 text-slate-500" />
                <span>Ciudad / Mpio *</span>
              </label>
              <select
                value={city}
                onChange={(e) => {
                  setCity(e.target.value);
                  if (errors.city) setErrors((prev) => ({ ...prev, city: '' }));
                }}
                className="w-full px-2.5 py-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs font-medium focus:outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-200"
              >
                {cityOptions.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Barrio (Obligatorio para evitar devoluciones) */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Barrio * <span className="text-[10px] text-amber-700 font-normal">(Indispensable para entrega)</span>
            </label>
            <input
              type="text"
              value={neighborhood}
              onChange={(e) => {
                setNeighborhood(e.target.value);
                if (errors.neighborhood) setErrors((prev) => ({ ...prev, neighborhood: '' }));
              }}
              placeholder="Ej: Modelia, El Poblado, Kennedy..."
              className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                errors.neighborhood
                  ? 'border-red-400 focus:ring-red-200 bg-red-50/30'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {errors.neighborhood && (
              <p className="text-[11px] text-red-600 font-medium mt-1">{errors.neighborhood}</p>
            )}
          </div>

          {/* Dirección Exacta */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Dirección exacta *
            </label>
            <input
              type="text"
              value={address}
              onChange={(e) => {
                setAddress(e.target.value);
                if (errors.address) setErrors((prev) => ({ ...prev, address: '' }));
              }}
              placeholder="Ej: Calle 45 # 12-34, Apto 302, Torre 1"
              className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                errors.address
                  ? 'border-red-400 focus:ring-red-200 bg-red-50/30'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {errors.address && (
              <p className="text-[11px] text-red-600 font-medium mt-1">{errors.address}</p>
            )}
          </div>

          {/* Punto de Referencia Cercano */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Punto de referencia cercano *
            </label>
            <input
              type="text"
              value={reference}
              onChange={(e) => {
                setReference(e.target.value);
                if (errors.reference) setErrors((prev) => ({ ...prev, reference: '' }));
              }}
              placeholder="Ej: Frente a la droguería, casa de rejas blancas"
              className={`w-full px-3.5 py-2.5 bg-slate-50 rounded-xl border text-sm focus:outline-none focus:ring-2 transition ${
                errors.reference
                  ? 'border-red-400 focus:ring-red-200 bg-red-50/30'
                  : 'border-slate-200 focus:border-emerald-500 focus:ring-emerald-200'
              }`}
            />
            {errors.reference && (
              <p className="text-[11px] text-red-600 font-medium mt-1">{errors.reference}</p>
            )}
          </div>

          {/* Casilla de Confirmación Explícita */}
          <div className="bg-amber-50/80 p-3 rounded-xl border border-amber-200/80">
            <label className="flex items-start gap-2.5 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={confirmedCash}
                onChange={(e) => {
                  setConfirmedCash(e.target.checked);
                  if (errors.confirmedCash) setErrors((prev) => ({ ...prev, confirmedCash: '' }));
                }}
                className="mt-0.5 h-4 w-4 rounded text-emerald-600 focus:ring-emerald-500 border-amber-300"
              />
              <span className="text-xs text-amber-950 font-semibold leading-snug">
                Confirmo que habrá alguien en casa para recibir el paquete y pagar en efectivo al transportador.
              </span>
            </label>
            {errors.confirmedCash && (
              <p className="text-[11px] text-red-600 font-medium mt-1">{errors.confirmedCash}</p>
            )}
          </div>

          {/* Botón de Confirmación de Pedido */}
          <div className="pt-2">
            <button
              type="submit"
              disabled={isSubmitting}
              className="btn-cta font-heading w-full bg-emerald-600 hover:bg-emerald-700 disabled:bg-slate-300 text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 text-base active:scale-[0.98]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  <span>Procesando tu pedido...</span>
                </>
              ) : (
                <>
                  <span className="font-heading font-extrabold">CONFIRMAR PEDIDO CONTRA ENTREGA</span>
                  <span>—</span>
                  <span className="font-price font-extrabold text-lg">{formatCOP(totalAmount)}</span>
                </>
              )}
            </button>
            <p className="text-[10px] text-center text-slate-500 font-medium mt-2 flex items-center justify-center gap-1 font-sans">
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Despacho exprés desde bodega oficial en Colombia</span>
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
