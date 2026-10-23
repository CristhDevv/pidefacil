'use client';

import React, { useState } from 'react';
import {
  Download,
  Share2,
  Sparkles,
  Check,
  Copy,
  ExternalLink,
  X,
  Smartphone,
  Square,
  Flame,
  CheckCircle2,
  FileText,
} from 'lucide-react';
import {
  renderSocialCreative,
  GeneratedCreative,
  CreativeFormat,
} from '@/lib/social-creatives-generator';
import { generatePersuasiveCopy } from '@/lib/social-copy-generator';

interface SocialKitDownloaderProps {
  product: {
    id_dropi?: number;
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

export function SocialKitDownloader({
  product,
  selectedOffer,
  singlePrice,
  anchorPrice,
  duoPrice,
  duoSavings,
  selectedVariation,
  packInfo,
}: SocialKitDownloaderProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [progressText, setProgressText] = useState('');
  const [progressPercent, setProgressPercent] = useState(0);
  const [creatives, setCreatives] = useState<GeneratedCreative[]>([]);
  const [copiedText, setCopiedText] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFormatTab, setSelectedFormatTab] = useState<CreativeFormat>('9:16');
  const [hasCopied, setHasCopied] = useState(false);

  const isDuo = selectedOffer === '2x';

  // Texto dinámico del botón principal según la oferta activa
  const buttonLabel = isDuo
    ? '📲 Descargar kit promocional Dúo Pack (2 Unidades) para Redes'
    : '📲 Descargar imágenes de esta oferta (1 Unidad) para Redes';

  // Obtener lista de imágenes a procesar (máximo las primeras 3 para velocidad y rendimiento)
  const rawImages = product.gallery && product.gallery.length > 0
    ? product.gallery
    : product.image_url
    ? [product.image_url]
    : ['/placeholder.png'];

  const imagesToProcess = rawImages.slice(0, 3);

  // Helper para descargar un blob directamente en el navegador
  const downloadBlob = (blob: Blob, filename: string) => {
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 1000);
  };

  // Manejar generación y descarga en 1 clic
  const handleGenerateAndDownload = async () => {
    try {
      setIsGenerating(true);
      setProgressPercent(10);
      setProgressText('Generando texto persuasivo de alta conversión...');

      // 1. Generar Copy Persuasivo
      const copy = generatePersuasiveCopy({
        productName: product.name,
        selectedOffer,
        singlePrice,
        anchorPrice,
        duoPrice,
        duoSavings,
        selectedVariation,
        packInfo,
      });
      setCopiedText(copy);

      // Copiar automáticamente al portapapeles
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(copy);
          setHasCopied(true);
        }
      } catch (clipboardErr) {
        console.warn('No se pudo copiar automáticamente al portapapeles:', clipboardErr);
      }

      // 2. Procesar imágenes en ambos formatos: 9:16 (Estados) y 1:1 (Feed)
      const generatedList: GeneratedCreative[] = [];
      const totalOps = imagesToProcess.length * 2;
      let completedOps = 0;

      for (let i = 0; i < imagesToProcess.length; i++) {
        const imgUrl = imagesToProcess[i];

        // Formato 9:16 (Historias y Estados de WhatsApp)
        completedOps++;
        setProgressPercent(Math.round((completedOps / (totalOps + 1)) * 90));
        setProgressText(`Diseñando Estado 9:16 (Foto ${i + 1} de ${imagesToProcess.length})...`);

        const storyCreative = await renderSocialCreative({
          productName: product.name,
          imageUrl: imgUrl,
          selectedOffer,
          singlePrice,
          anchorPrice,
          duoPrice,
          duoSavings,
          selectedVariation,
          packInfo,
          format: '9:16',
          imageIndex: i,
          totalImages: imagesToProcess.length,
        });
        generatedList.push(storyCreative);

        // Formato 1:1 (Feed de Instagram y Facebook)
        completedOps++;
        setProgressPercent(Math.round((completedOps / (totalOps + 1)) * 90));
        setProgressText(`Diseñando Post Cuadrado 1:1 (Foto ${i + 1} de ${imagesToProcess.length})...`);

        const feedCreative = await renderSocialCreative({
          productName: product.name,
          imageUrl: imgUrl,
          selectedOffer,
          singlePrice,
          anchorPrice,
          duoPrice,
          duoSavings,
          selectedVariation,
          packInfo,
          format: '1:1',
          imageIndex: i,
          totalImages: imagesToProcess.length,
        });
        generatedList.push(feedCreative);
      }

      setProgressPercent(100);
      setProgressText('¡Creativos persuasivos listos!');
      setCreatives(generatedList);

      // 3. Compartir nativo en móviles si está disponible
      let nativeShared = false;
      if (typeof navigator !== 'undefined' && navigator.canShare) {
        try {
          const filesToShare = generatedList.map(
            (c) => new File([c.blob], c.filename, { type: 'image/png' })
          );
          if (navigator.canShare({ files: filesToShare })) {
            nativeShared = true;
            await navigator.share({
              files: filesToShare,
              title: `${product.name} — ${isDuo ? packInfo.duoTitle : packInfo.singleTitle}`,
              text: copy,
            });
          }
        } catch (shareErr: any) {
          // El usuario canceló la hoja nativa o no completó; continuar con flujo normal
          console.log('Web Share completado o cerrado:', shareErr);
        }
      }

      // Si no se usó Web Share (o en escritorio), descargar automáticamente las fotos principales
      if (!nativeShared) {
        // Descargar la foto principal en 9:16 y 1:1 automáticamente
        const primaryStory = generatedList.find((c) => c.format === '9:16' && c.imageIndex === 0);
        const primaryFeed = generatedList.find((c) => c.format === '1:1' && c.imageIndex === 0);

        if (primaryStory) downloadBlob(primaryStory.blob, primaryStory.filename);
        if (primaryFeed) {
          setTimeout(() => {
            downloadBlob(primaryFeed.blob, primaryFeed.filename);
          }, 400);
        }
      }

      // Abrir modal interactivo con todas las imágenes y copy listo
      setIsModalOpen(true);
    } catch (error: any) {
      console.error('Error generando creativos:', error);
      alert('Hubo un inconveniente al generar los creativos. Por favor intenta de nuevo.');
    } finally {
      setIsGenerating(false);
      setProgressPercent(0);
      setProgressText('');
    }
  };

  const handleCopyAgain = async () => {
    if (!copiedText) return;
    try {
      await navigator.clipboard.writeText(copiedText);
      setHasCopied(true);
      setTimeout(() => setHasCopied(false), 3000);
    } catch {
      // Fallback
    }
  };

  const filteredCreatives = creatives.filter((c) => c.format === selectedFormatTab);

  return (
    <>
      {/* Botón Principal Secundario Mobile-First (Ubicado justo bajo la escalera de ofertas) */}
      <div className="bg-gradient-to-r from-amber-50/70 via-emerald-50/40 to-amber-50/70 border-2 border-amber-300/80 rounded-3xl p-3.5 shadow-xs transition hover:border-amber-400">
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-black uppercase tracking-wider text-slate-800 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-600" />
              Kit Publicitario para Redes Sociales
            </span>
          </div>
          <span className="text-[10px] font-bold text-amber-900 bg-amber-100/90 px-2 py-0.5 rounded-full border border-amber-200">
            Descarga en 1 Clic
          </span>
        </div>

        <p className="text-xs text-slate-600 leading-snug mb-3">
          Descarga al instante las fotos del producto ya editadas con el combo activo (
          <strong className="text-slate-900 font-bold">
            {isDuo ? 'Dúo Pack 2 Unidades' : '1 Unidad'}
          </strong>
          ), marco de respuesta directa y el texto listo para pegar en Estados de WhatsApp, Instagram y Facebook.
        </p>

        <button
          type="button"
          onClick={handleGenerateAndDownload}
          disabled={isGenerating}
          className={`w-full py-3 px-4 rounded-2xl font-black text-xs sm:text-sm flex items-center justify-center gap-2.5 transition shadow-sm active:scale-[0.99] ${
            isGenerating
              ? 'bg-slate-200 text-slate-600 cursor-wait'
              : 'bg-white hover:bg-amber-100/40 text-emerald-950 border-2 border-emerald-500/80 hover:border-emerald-600 shadow-emerald-500/10'
          }`}
        >
          {isGenerating ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin" />
              <span>{progressText || 'Generando creativos persuasivos...'}</span>
            </div>
          ) : (
            <>
              <Share2 className="w-4 h-4 text-emerald-600 stroke-[2.5]" />
              <span className="text-center">{buttonLabel}</span>
            </>
          )}
        </button>

        {isGenerating && (
          <div className="mt-2.5 space-y-1">
            <div className="w-full bg-slate-200 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-emerald-600 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
            <p className="text-[10px] text-center text-slate-500 font-medium">
              Inyectando marco de respuesta directa Colombia y precio psicológico...
            </p>
          </div>
        )}
      </div>

      {/* Modal / Drawer con Creativos Generados y Copy Copiado */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden my-auto max-h-[90vh] flex flex-col">
            {/* Header del Modal */}
            <div className="p-4 bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-full bg-emerald-500/20 border border-emerald-400 flex items-center justify-center">
                  <Check className="w-4 h-4 text-emerald-400 stroke-[3]" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-white flex items-center gap-1.5">
                    <span>¡Kit Publicitario Generado!</span>
                    <span className="text-xs font-bold text-amber-300 bg-amber-400/20 px-2 py-0.2 rounded-full">
                      {isDuo ? 'Dúo Pack' : '1 Unidad'}
                    </span>
                  </h3>
                  <p className="text-[11px] text-emerald-200">
                    Fotos editadas en alta resolución con marco de respuesta directa Colombia.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Contenido Desplazable */}
            <div className="p-4 overflow-y-auto space-y-4">
              {/* Alerta de Copy Copiado al Portapapeles */}
              <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3 flex items-start justify-between gap-3 shadow-xs">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-black text-emerald-950">
                      ¡Texto persuasivo copiado al portapapeles automáticamente!
                    </p>
                    <p className="text-[11px] text-emerald-800 leading-snug">
                      Listo para pegar en la descripción de tu Estado de WhatsApp, Post de Facebook o Historia.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleCopyAgain}
                  className="shrink-0 bg-white hover:bg-emerald-100 text-emerald-800 border border-emerald-300 px-2.5 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition"
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

              {/* Pestañas de Formato (Historias 9:16 vs Feed 1:1) */}
              <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
                <button
                  type="button"
                  onClick={() => setSelectedFormatTab('9:16')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition ${
                    selectedFormatTab === '9:16'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Smartphone className="w-3.5 h-3.5" />
                  <span>Para Estados y Stories (9:16 Vertical)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedFormatTab('1:1')}
                  className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-black transition ${
                    selectedFormatTab === '1:1'
                      ? 'bg-emerald-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Square className="w-3.5 h-3.5" />
                  <span>Para Feed y Marketplace (1:1 Cuadrado)</span>
                </button>
              </div>

              {/* Galería de Creativos Generados */}
              <div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filteredCreatives.map((creative, idx) => (
                    <div
                      key={idx}
                      className="bg-slate-50 border border-slate-200 rounded-2xl p-2.5 flex flex-col justify-between shadow-xs"
                    >
                      <div className="relative rounded-xl overflow-hidden bg-slate-900 mb-2 border border-slate-200">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={creative.dataUrl}
                          alt={creative.filename}
                          className={`w-full object-contain mx-auto ${
                            creative.format === '9:16' ? 'max-h-72' : 'max-h-60'
                          }`}
                        />
                        <span className="absolute top-2 left-2 bg-black/70 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                          Foto {creative.imageIndex + 1} • {creative.format}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 pt-1">
                        <button
                          type="button"
                          onClick={() => downloadBlob(creative.blob, creative.filename)}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black py-2 px-3 rounded-xl flex items-center justify-center gap-1.5 shadow-xs transition active:scale-98"
                        >
                          <Download className="w-3.5 h-3.5" />
                          <span>Descargar Imagen</span>
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Cuadro con el Copy Publicitario Generado */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Texto de la Publicación (Copywriting Persuasivo):</span>
                  </label>
                  <button
                    type="button"
                    onClick={handleCopyAgain}
                    className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copiar texto</span>
                  </button>
                </div>

                <div className="bg-white border border-slate-200 rounded-xl p-3 max-h-40 overflow-y-auto text-xs text-slate-700 font-mono whitespace-pre-wrap leading-relaxed select-all">
                  {copiedText}
                </div>
              </div>
            </div>

            {/* Footer del Modal */}
            <div className="p-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => {
                  creatives.forEach((c, i) => {
                    setTimeout(() => downloadBlob(c.blob, c.filename), i * 350);
                  });
                }}
                className="bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs py-2 px-3.5 rounded-xl flex items-center gap-1.5 transition"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Descargar las {creatives.length} Fotos</span>
              </button>

              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs py-2 px-4 rounded-xl transition"
              >
                Listo / Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
