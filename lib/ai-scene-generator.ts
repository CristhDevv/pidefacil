import { GoogleGenAI, Modality } from '@google/genai';

const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-nano-banana-2.1';
// Modelos de imagen soportados por Google AI Studio / Google Flow
const CANDIDATE_IMAGE_MODELS = [
  DEFAULT_IMAGE_MODEL,
  'gemini-nano-banana-2.1',
  'gemini-3.1-flash-image',
  'gemini-3-pro-image',
  'nano-banana-pro-preview',
  'gemini-2.5-flash-image',
].filter((v, idx, arr) => arr.indexOf(v) === idx);

export type SceneInput = {
  apiKey: string;
  productImageBase64: string;
  productImageMime?: string;
  productName: string;
  category: string;
  angle: 'dolor' | 'valor';
  hook: string;
  sceneBrief: string;
};

export type SceneResult =
  | { ok: true; pngBase64: string }
  | { ok: false; reason: string };

function buildScenePrompt(i: SceneInput): string {
  const mood =
    i.angle === 'dolor'
      ? 'Escena cotidiana acogedora que evoca el problema ya resuelto: alivio inmediato, orden, comodidad y tranquilidad en el hogar.'
      : 'Escena aspiracional y premium: iluminación cálida de ambiente (ambiance), elegancia, kit completo, sensación de bienestar y estatus.';

  return `Eres un fotógrafo publicitario y director de arte comercial de respuesta directa.
Recibes UNA foto de referencia de un proveedor de dropshipping. Úsala ÚNICAMENTE para entender cómo es el producto físico real (forma, colores, materiales, botones, accesorios y proporciones).

TAREA: Crea una fotografía publicitaria NUEVA, cuadrada (1:1), del producto "${i.productName}" (categoría: ${i.category}), aplicando la siguiente fórmula de composición publicitaria:

1. FONDO DE USO REAL (CONTEXTO E ILUMINACIÓN AMBIANCE):
- Muestra el producto en su entorno natural y real de uso (sala, habitación, cocina, baño u oficina acogedora), NUNCA sobre fondo blanco neutro ni estudio vacío.
- Escena acogedora de interior bien iluminada, con iluminación ambiental cálida cinematográfica donde la luz interactúa de forma realista con las superficies y el propio producto.
- Transmite calidez, confort, orden y una sensación de bienestar visual que despierta deseo de compra instantáneo.

2. INTEGRACIÓN Y PROTAGONISMO DEL PRODUCTO:
- Protagonismo absoluto: el producto debe cubrir una parte amplia y dominante de la toma (~55% a 65% del encuadre central), mostrándose completamente funcional, activo y encendido si aplica.
- Profundidad de campo: producto enfocado y nítido en primer plano, combinado con elementos decorativos contextuales en segundo plano suavemente desenfocados (bokeh) para dar tridimensionalidad y volumen.
- El producto debe ser IDÉNTICO al de la foto de referencia: mismos colores, formas, accesorios y materiales. No inventes piezas inexistentes.

3. ESPACIO NEGATIVO PARA CAPA GRÁFICA (OVERLAY POR SOFTWARE):
- Deja el 22% superior y el 28% inferior con fondo limpio, desenfocado y de bajo contraste, porque allí se superpondrán por software el titular de beneficio, el bloque de precio flotante y los botones de acción COD.
- La imagen generada NO debe contener letras, palabras, números, precios, logos ni marcas de agua.
- Sin rostros humanos visibles (se permiten manos o siluetas parciales usando el producto si aporta naturalidad).

DIRECCIÓN ESPECÍFICA DE ESCENA:
${mood}
Escena sugerida: ${i.sceneBrief}
Contexto emocional del beneficio: "${i.hook}"`;
}

export async function generateScene(i: SceneInput): Promise<SceneResult> {
  const ai = new GoogleGenAI({ apiKey: i.apiKey });
  const prompt = buildScenePrompt(i);

  let lastReason = 'El modelo no devolvió imagen';

  for (const model of CANDIDATE_IMAGE_MODELS) {
    try {
      const res = await ai.models.generateContent({
        model,
        contents: [
          {
            role: 'user',
            parts: [
              {
                inlineData: {
                  mimeType: i.productImageMime || 'image/jpeg',
                  data: i.productImageBase64,
                },
              },
              {
                text: prompt,
              },
            ],
          },
        ],
        config: {
          responseModalities: [Modality.TEXT, Modality.IMAGE],
        },
      });

      const parts = res.candidates?.[0]?.content?.parts ?? [];
      const img = parts.find((p: any) => p.inlineData?.data);

      if (img?.inlineData?.data) {
        return { ok: true, pngBase64: img.inlineData.data };
      }

      const textPart = parts.find((p: any) => p.text)?.text;
      if (textPart) {
        lastReason = textPart.slice(0, 200);
      }
    } catch (e: any) {
      console.warn(`[AI Scene Generator] Error con modelo ${model}:`, e?.message || e);
      lastReason = e?.message || 'Error generando escena publicitaria con modelo de imagen';
      // Si el error es 404 de modelo, prueba el siguiente candidato; si es cuota 429 continuará con fallback
    }
  }

  return { ok: false, reason: lastReason };
}

export async function generateTwoScenes(
  base: Omit<SceneInput, 'angle' | 'hook' | 'sceneBrief'>,
  angles: { angle: 'dolor' | 'valor'; hook: string; sceneBrief: string }[]
): Promise<SceneResult[]> {
  const settled = await Promise.allSettled(
    angles.map((a) => generateScene({ ...base, ...a }))
  );
  return settled.map((s) =>
    s.status === 'fulfilled' ? s.value : { ok: false as const, reason: String(s.reason) }
  );
}
