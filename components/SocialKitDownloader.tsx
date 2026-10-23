'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  Bot,
  RefreshCw,
  Download,
  Copy,
  Check,
  CheckCircle2,
  X,
  Share2,
  AlertTriangle,
  Zap,
  Layers,
  ArrowRight,
  ExternalLink,
} from 'lucide-react';

interface AiCreativeStudioProps {
  product: {
    id_dropi: number;
    name: string;
    image_url?: string;
    gallery?: string[];
    sell_price_cop: number;
    cost_cop: number;
    suggested_price_cop?: number;
  };
  selectedOffer: '1x' | '2x';
  singlePrice: number;
  anchorPrice: number;
  duoPrice: number;
  duoSavings: number;
  selectedVariation?: string;
  packInfo: {
    singleTitle: string;
    duoTitle: string;
    singleBadge: string;
    duoBadge: string;
  };
}

interface AngleItem {
  title: string;
  description?: string;
  imageDataUrl: string;
}

interface CreativeResponseData {
  angle1: AngleItem;
  angle2: AngleItem;
  persuasiveCopy: string;
  previousAngles?: string[];
  fromCache?: boolean;
}

export function SocialKitDownloader({
  product,
  selectedOffer,
  singlePrice,
  anchorPrice,
  duoPrice,
  duoSavings,
  selectedVariation,
  packInfo,
}: AiCreativeStudioProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [currentStep, setCurrentStep] = useState<number>(1);
  const [stepLabel, setStepLabel] = useState<string>('');
  const [creativeData, setCreativeData] = useState<CreativeResponseData | null>(null);
  const [previousAnglesList, setPreviousAnglesList] = useState<string[]>([]);
  const [hasCopied, setHasCopied] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const isDuo = selectedOffer === '2x';

  // Texto dinámico del botón principal
  const buttonLabel = isDuo
    ? '✨ Generar 2 Anuncios IA de Alta Conversión (Dúo Pack 2x)'
    : '✨ Generar 2 Anuncios IA de Alta Conversión (1 Unidad)';

  // Helper para descargar DataURL como archivo PNG
  const downloadDataUrl = (dataUrl: string, filename: string) => {
    const a = document.createElement('a');
    a.href = dataUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
    }, 1000);
  };

  // Copiar copy persuasivo al portapapeles
  const handleCopyText = async () => {
    if (!creativeData?.persuasiveCopy) return;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(creativeData.persuasiveCopy);
        setHasCopied(true);
        setTimeout(() => setHasCopied(false), 3000);
      }
    } catch {
      // Fallback
    }
  };

  // Flujo principal de generación con las 3 etapas
  const handleGenerate = async (forceRefresh = false) => {
    setIsOpen(true);
    setIsGenerating(true);
    setErrorMsg(null);
    setCurrentStep(1);
    setStepLabel('🔍 Investigando producto y dolores de clientes en internet (Google Search)...');

    // Simulación fluida de pasos mientras responde el backend
    const stepTimer1 = setTimeout(() => {
      setCurrentStep(2);
      setStepLabel('🧠 Formulando 2 ángulos psicológicos de venta para Colombia...');
    }, 2800);

    const stepTimer2 = setTimeout(() => {
      setCurrentStep(3);
      setStepLabel('🎨 Generando 2 creativos hiperrealistas limpios con Google AI...');
    }, 6000);

    try {
      const res = await fetch('/api/ai/generate-creatives', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productId: product.id_dropi,
          selectedOffer,
          selectedVariation,
          previousAngles: forceRefresh ? previousAnglesList : [],
          forceRefresh,
        }),
      });

      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error || 'Error al generar los creativos con Google AI.');
      }

      setCreativeData({
        angle1: json.data.angle1,
        angle2: json.data.angle2,
        persuasiveCopy: json.data.persuasiveCopy,
        previousAngles: json.data.previousAngles,
        fromCache: Boolean(json.fromCache),
      });

      if (json.data.previousAngles) {
        setPreviousAnglesList(json.data.previousAngles);
      }

      // Auto-copiar copy persuasivo
      if (json.data.persuasiveCopy && navigator.clipboard && navigator.clipboard.writeText) {
        try {
          await navigator.clipboard.writeText(json.data.persuasiveCopy);
          setHasCopied(true);
        } catch {}
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error de conexión con el motor de IA.');
    } finally {
      setIsGenerating(false);
      clearTimeout(stepTimer1);
      clearTimeout(stepTimer2);
    }
  };

  const handleDownloadBoth = () => {
    if (!creativeData) return;
    const cleanName = product.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .slice(0, 30);

    downloadDataUrl(
      creativeData.angle1.imageDataUrl,
      `PideFacil_${cleanName}_Angulo1_${selectedOffer}.png`
    );

    setTimeout(() => {
      downloadDataUrl(
        creativeData.angle2.imageDataUrl,
        `PideFacil_${cleanName}_Angulo2_${selectedOffer}.png`
      );
    }, 450);

    handleCopyText();
  };

  return (
    <>
      {/* Botón Principal Mobile-First en la PDP */}
      <div className="bg-gradient-to-r from-emerald-50 via-amber-50/50 to-emerald-50 border-2 border-emerald-400/80 rounded-3xl p-3.5 shadow-xs transition hover:border-emerald-500">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-600 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
              <Bot className="w-3.5 h-3.5 text-emerald-700 stroke-[2.5]" />
              Motor Creativo IA (Google Gemini + Grounding)
            </span>
          </div>
          <span className="text-[10px] font-bold text-emerald-900 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
            Cero Textos Sucios
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-snug mb-3">
          Genera 2 anuncios profesionales fotorrealistas analizando el producto con IA y buscando
          dolores en internet en tiempo real, adaptados al combo activo (
          <strong className="text-slate-900 font-bold">
            {isDuo ? 'Dúo Pack 2 Unidades' : '1 Unidad'}
          </strong>
          ).
        </p>

        <button
          type="button"
          onClick={() => handleGenerate(false)}
          className="w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 active:scale-[0.99] text-white shadow-md shadow-emerald-700/20 transition"
        >
          <Sparkles className="w-4 h-4 text-amber-300" />
          <span>{buttonLabel}</span>
        </button>
      </div>

      {/* Modal / Estudio Creativo Interactivo */}
      {isOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[92vh] flex flex-col">
            {/* Header del Estudio Creativo */}
            <div className="p-4 bg-gradient-to-r from-slate-900 via-emerald-950 to-slate-900 text-white flex items-center justify-between shrink-0 border-b border-emerald-900/40">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-emerald-500/20 border border-emerald-400 flex items-center justify-center text-emerald-400">
                  <Bot className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-2">
                    <span>Estudio Creativo IA — PideFácil</span>
                    <span className="text-xs font-bold text-amber-300 bg-amber-400/20 px-2 py-0.5 rounded-full">
                      {isDuo ? 'Dúo Pack 2x' : '1 Unidad'}
                    </span>
                    {creativeData?.fromCache && (
                      <span className="text-[10px] font-bold text-emerald-300 bg-emerald-500/20 px-2 py-0.5 rounded-full flex items-center gap-1">
                        <Zap className="w-2.5 h-2.5" />
                        Caché Instantánea
                      </span>
                    )}
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Creativos generados con Google Search Grounding y Marco Tipográfico .900 Colombia.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido Desplazable */}
            <div className="p-4 sm:p-6 overflow-y-auto space-y-5">
              {/* ESTADO 1: GENERACIÓN EN PROCESO (3 ETAPAS) */}
              {isGenerating && (
                <div className="py-12 px-4 text-center space-y-6 max-w-md mx-auto">
                  <div className="relative w-20 h-20 mx-auto">
                    <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 border-t-emerald-600 animate-spin" />
                    <div className="absolute inset-2 rounded-full border-4 border-amber-500/20 border-b-amber-500 animate-spin [animation-direction:reverse]" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Bot className="w-8 h-8 text-emerald-600 animate-pulse" />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <h4 className="text-sm font-black text-slate-800">
                      Agente Creativo IA en Ejecución
                    </h4>
                    <p className="text-xs text-slate-600 font-medium leading-relaxed">
                      {stepLabel}
                    </p>
                  </div>

                  {/* Indicador de 3 Etapas */}
                  <div className="grid grid-cols-3 gap-2 pt-2 text-left">
                    <div
                      className={`p-2 rounded-xl border text-[11px] ${
                        currentStep >= 1
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="block font-black">Paso 1</span>
                      Google Search
                    </div>
                    <div
                      className={`p-2 rounded-xl border text-[11px] ${
                        currentStep >= 2
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="block font-black">Paso 2</span>
                      2 Ángulos
                    </div>
                    <div
                      className={`p-2 rounded-xl border text-[11px] ${
                        currentStep >= 3
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-950 font-bold'
                          : 'border-slate-200 text-slate-400'
                      }`}
                    >
                      <span className="block font-black">Paso 3</span>
                      Imagen 8K
                    </div>
                  </div>
                </div>
              )}

              {/* ESTADO 2: ERROR */}
              {errorMsg && !isGenerating && (
                <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="text-xs font-black text-rose-950">
                      No se pudo completar la generación
                    </h4>
                    <p className="text-xs text-rose-800 leading-snug">{errorMsg}</p>
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => handleGenerate(false)}
                        className="bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs py-1.5 px-3 rounded-lg"
                      >
                        Reintentar
                      </button>
                    </div>
                  </div>
                </div>
              )}

              {/* ESTADO 3: CREATIVOS GENERADOS EXITOSAMENTE */}
              {creativeData && !isGenerating && (
                <>
                  {/* Banner de Copiado */}
                  <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-center justify-between gap-3 shadow-xs">
                    <div className="flex items-center gap-2">
                      <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                      <div>
                        <p className="text-xs font-black text-emerald-950">
                          ¡Texto publicitario para WhatsApp copiado al portapapeles!
                        </p>
                        <p className="text-[11px] text-emerald-800">
                          Listo para pegar en la descripción de tu Estado, Post o Historia.
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyText}
                      className="bg-white hover:bg-emerald-100 text-emerald-900 border border-emerald-300 font-bold text-xs px-2.5 py-1.5 rounded-xl flex items-center gap-1 transition shrink-0"
                    >
                      {hasCopied ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-600" />
                          <span>¡Copiado!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copiar de nuevo</span>
                        </>
                      )}
                    </button>
                  </div>

                  {/* Las 2 Imágenes Generadas Lado a Lado */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* Tarjeta Ángulo 1 */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-3.5 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100/80 px-2.5 py-0.5 rounded-full">
                            Ángulo 1: Dolor / Transformación
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 mb-1">
                          {creativeData.angle1.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                          {creativeData.angle1.description || 'Solución directa en el hogar.'}
                        </p>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-md mb-3 border border-slate-200 aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={creativeData.angle1.imageDataUrl}
                          alt={creativeData.angle1.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          downloadDataUrl(
                            creativeData.angle1.imageDataUrl,
                            `PideFacil_${product.name}_Angulo1_${selectedOffer}.png`
                          )
                        }
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>⬇️ Descargar Imagen HD (Ángulo 1)</span>
                      </button>
                    </div>

                    {/* Tarjeta Ángulo 2 */}
                    <div className="bg-slate-50 border border-slate-200 rounded-3xl p-3.5 flex flex-col justify-between shadow-xs">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-[11px] font-black uppercase tracking-wider text-amber-800 bg-amber-100/90 px-2.5 py-0.5 rounded-full">
                            Ángulo 2: Valor Percibido / Abundancia
                          </span>
                        </div>
                        <h4 className="text-xs font-black text-slate-900 mb-1">
                          {creativeData.angle2.title}
                        </h4>
                        <p className="text-[11px] text-slate-500 mb-3 leading-snug">
                          {creativeData.angle2.description || 'Kit completo y alta calidad.'}
                        </p>
                      </div>

                      <div className="relative rounded-2xl overflow-hidden bg-slate-900 shadow-md mb-3 border border-slate-200 aspect-square">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={creativeData.angle2.imageDataUrl}
                          alt={creativeData.angle2.title}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          downloadDataUrl(
                            creativeData.angle2.imageDataUrl,
                            `PideFacil_${product.name}_Angulo2_${selectedOffer}.png`
                          )
                        }
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>⬇️ Descargar Imagen HD (Ángulo 2)</span>
                      </button>
                    </div>
                  </div>

                  {/* Copywriting Persuasivo Listo para Pegar */}
                  <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black uppercase tracking-wider text-slate-800">
                        Texto Publicitario Generado por IA (Copy WhatsApp / Redes):
                      </span>
                      <button
                        type="button"
                        onClick={handleCopyText}
                        className="text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copiar texto</span>
                      </button>
                    </div>

                    <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-36 overflow-y-auto text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed select-all">
                      {creativeData.persuasiveCopy}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Footer de Acciones del Estudio Creativo */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2">
                {/* Botón de Regeneración Inteligente */}
                <button
                  type="button"
                  onClick={() => handleGenerate(true)}
                  disabled={isGenerating}
                  className="bg-white hover:bg-slate-100 disabled:opacity-40 text-slate-800 border border-slate-300 font-black text-xs py-2.5 px-3.5 rounded-xl flex items-center gap-1.5 shadow-xs transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isGenerating ? 'animate-spin' : ''}`} />
                  <span>🔄 Regenerar con 2 ángulos diferentes</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {creativeData && (
                  <button
                    type="button"
                    onClick={handleDownloadBoth}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2.5 px-4 rounded-xl flex items-center gap-2 shadow-sm transition"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>⬇️ Descargar Ambas + Copiar Copy</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2.5 px-4 rounded-xl transition"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
