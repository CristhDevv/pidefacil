import { GoogleGenAI, Modality } from '@google/genai';

const DEFAULT_IMAGE_MODEL = process.env.GEMINI_IMAGE_MODEL || 'gemini-3.1-flash-image';
// Modelos de imagen soportados por Google AI Studio
const CANDIDATE_IMAGE_MODELS = [
  DEFAULT_IMAGE_MODEL,
  'gemini-3-pro-image',
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
      ? 'Escena cotidiana colombiana que sugiere el problema ya resuelto: alivio, comodidad, tranquilidad.'
      : 'Escena aspiracional y premium: sensación de calidad, kit completo, buen regalo, estatus.';

  return `Eres un fotógrafo publicitario de producto. Recibes UNA foto de referencia de un proveedor de dropshipping. Úsala ÚNICAMENTE para entender cómo es el producto físico (forma, colores, materiales, accesorios, proporciones).
TAREA: crea una fotografía publicitaria NUEVA, cuadrada (1:1), del producto "${i.productName}" (categoría: ${i.category}).
REGLAS ESTRICTAS

El producto debe ser IDÉNTICO al de la referencia: misma forma, colores, botones, accesorios y proporciones. No lo rediseñes ni inventes partes.
NO copies el fondo, la composición ni el encuadre de la referencia. Cambia por completo el escenario, la iluminación y el ángulo de cámara.
Elimina TODO elemento de la referencia que no sea el producto: textos, precios, marcas de agua, logotipos de terceros, sellos, bordes, iconos.
La imagen final NO debe contener ningún texto, número, letra ni logotipo (el texto se agrega después por software).
Composición: producto grande y nítido, centrado, ~55-65% del alto. Deja el 22% superior y el 28% inferior con fondo limpio, desenfocado y de bajo detalle, porque ahí se superponen textos.
Sin personas con rostro visible. Se permiten manos o siluetas parciales usando el producto.
Sombras y reflejos realistas, producto bien integrado, calidad de fotografía comercial profesional, colores vivos pero naturales.
DIRECCIÓN DE ESCENA
${mood}
Escena sugerida: ${i.sceneBrief}
Contexto emocional del anuncio (NO escribir en la imagen): "${i.hook}"`;
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
