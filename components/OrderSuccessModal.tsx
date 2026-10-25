'use client';

import React from 'react';
import { formatCOP } from '@/config/pricing';
import { CheckCircle2, MessageCircle, Home, Truck, ShieldCheck, X } from 'lucide-react';

interface OrderSuccessModalProps {
  order: any;
  onClose: () => void;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  order,
  onClose,
}) => {
  if (!order) return null;

  const whatsappNumber =
    process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573009123456';

  const waMessage = encodeURIComponent(
    `Hola PideFácil! Acabo de realizar el pedido *#${order.order_number}* por valor de *${formatCOP(
      order.total_cop
    )}* con Pago Contra Entrega en ${order.city}, ${order.department}.\n\nNombre: ${
      order.customer_name
    }\nDirección: ${order.address} (${order.neighborhood})\n\nConfirmo que estaré atento a la entrega en efectivo.`
  );

  const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${waMessage}`;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="relative w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 text-center animate-slide-up border border-emerald-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-600 rounded-full"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Ícono de Éxito */}
        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto mb-3 shadow-inner">
          <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
        </div>

        <span className="inline-block bg-emerald-50 text-emerald-800 text-xs font-bold px-3 py-1 rounded-full border border-emerald-200 mb-2 font-sans">
          🇨🇴 ¡Pedido Recibido con Éxito!
        </span>

        <h2 className="text-xl font-extrabold text-slate-900 mb-1 font-heading">
          ¡Gracias por tu compra!
        </h2>
        <p className="text-xs text-slate-500 mb-4 font-sans">
          Estamos alistando tu paquete en bodega para despachar a tu dirección.
        </p>

        {/* Tarjeta de Resumen */}
        <div className="bg-slate-50 rounded-2xl p-4 text-left border border-slate-100 space-y-2 mb-4 text-xs font-sans">
          <div className="flex justify-between items-center pb-2 border-b border-slate-200/60">
            <span className="text-slate-500 font-medium">Número de Pedido:</span>
            <span className="font-mono font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
              {order.order_number}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Destinatario:</span>
            <span className="font-semibold text-slate-800">{order.customer_name}</span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Destino:</span>
            <span className="font-medium text-slate-800">
              {order.city}, {order.department}
            </span>
          </div>

          <div className="flex justify-between items-center">
            <span className="text-slate-500 font-medium">Dirección / Barrio:</span>
            <span className="font-medium text-slate-800 text-right truncate max-w-[200px]">
              {order.address} ({order.neighborhood})
            </span>
          </div>

          <div className="flex justify-between items-center pt-2 border-t border-slate-200/60">
            <span className="text-emerald-900 font-bold font-sans">Total en Efectivo al Recibir:</span>
            <span className="price-tag font-price text-lg font-extrabold text-emerald-700">
              {formatCOP(order.total_cop)}
            </span>
          </div>
        </div>

        {/* Urgencia / Confianza */}
        <div className="bg-amber-50 rounded-xl p-2.5 mb-5 text-[11px] text-amber-900 font-medium border border-amber-200/60 flex items-center gap-2 text-left">
          <Truck className="w-4 h-4 text-amber-700 flex-shrink-0" />
          <span>
            Recuerda tener listo el dinero en efectivo para pagar al mensajero al momento de recibir.
          </span>
        </div>

        {/* Botón WhatsApp 1-Clic */}
        <a
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full bg-[#25D366] hover:bg-[#20bd5a] text-white font-extrabold py-3.5 px-4 rounded-2xl shadow-md hover:shadow-lg transition flex items-center justify-center gap-2 text-sm mb-2"
        >
          <MessageCircle className="w-5 h-5 fill-white stroke-none" />
          <span>CONFIRMAR POR WHATSAPP EN 1 CLIC</span>
        </a>

        <button
          onClick={onClose}
          className="w-full py-2.5 text-xs font-semibold text-slate-500 hover:text-slate-700 transition"
        >
          Volver a la tienda
        </button>
      </div>
    </div>
  );
};
