import { NextRequest, NextResponse } from 'next/server';
import { getProductById, getAiCreativeCache, saveAiCreativeCache, getGeminiApiKey } from '@/lib/db';
import { calculateDuoPrice } from '@/config/pricing';
import { GoogleGenAI } from '@google/genai';
import {
  buildAngleFormulationSystemPrompt,
  buildAngleFormulationUserPrompt,
  StrategicFormulationResult,
} from '@/lib/ai-creative-skill';
import { compositeAiCreativeImage } from '@/lib/ai-image-compositor';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Helper para descargar imagen y convertirla a Buffer y Base64
async function fetchImageBuffer(url: string): Promise<{ buffer: Buffer; mimeType: string; base64: string }> {
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PideFacilAI/1.0)',
    },
    signal: AbortSignal.timeout(12000),
  });

  if (!res.ok) {
    throw new Error(`Error descargando imagen original: HTTP ${res.status}`);
  }

  const arrayBuffer = await res.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const mimeType = res.headers.get('content-type') || 'image/jpeg';
  const base64 = buffer.toString('base64');

  return { buffer, mimeType, base64 };
}

// Generar escena fotográfica con Imagen 3 de Google AI Studio si está disponible
async function tryGenerateImagenScene(apiKey: string, prompt: string): Promise<Buffer | null> {
  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/imagen-3.0-generate-002:predict?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: {
          sampleCount: 1,
          aspectRatio: '1:1',
          outputMimeType: 'image/jpeg',
        },
      }),
      signal: AbortSignal.timeout(20000),
    });

    if (res.ok) {
      const data = await res.json();
      const b64 = data?.predictions?.[0]?.bytesBase64Encoded;
      if (b64) {
        return Buffer.from(b64, 'base64');
      }
    }
  } catch (err) {
    console.warn('Imagen 3 no disponible o límite de cuota, usando escena fotorrealista directa:', err);
  }
  return null;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      selectedOffer = '2x',
      selectedVariation,
      previousAngles = [],
      forceRefresh = false,
    } = body;

    const numericId = Number(productId);
    if (!numericId || isNaN(numericId)) {
      return NextResponse.json(
        { success: false, error: 'ID de producto inválido' },
        { status: 400 }
      );
    }

    const offerType: '1x' | '2x' = selectedOffer === '1x' ? '1x' : '2x';

    // 1. Verificar Caché en SQLite / Supabase si no se forzó regeneración
    if (!forceRefresh) {
      const cached = await getAiCreativeCache(numericId, offerType);
      if (cached) {
        return NextResponse.json({
          success: true,
          fromCache: true,
          data: {
            productId: numericId,
            selectedOffer: offerType,
            angle1: {
              title: cached.angle_1_title,
              description: cached.angle_1_desc,
              imageDataUrl: cached.angle_1_image,
            },
            angle2: {
              title: cached.angle_2_title,
              description: cached.angle_2_desc,
              imageDataUrl: cached.angle_2_image,
            },
            persuasiveCopy: cached.copy_text,
            previousAngles: cached.previous_angles || [],
            createdAt: cached.created_at,
          },
        });
      }
    }

    // 2. Obtener API Key de Google Gemini
    const apiKey = await getGeminiApiKey();
    if (!apiKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            'No se ha configurado la API Key de Google Gemini. Ingresa a /admin para configurarla en 1 clic.',
        },
        { status: 400 }
      );
    }

    // 3. Consultar datos del producto
    const product = await getProductById(numericId);
    if (!product) {
      return NextResponse.json(
        { success: false, error: 'Producto no encontrado en catálogo' },
        { status: 404 }
      );
    }

    const singlePrice = product.sell_price_cop;
    const duo = calculateDuoPrice(product.sell_price_cop, product.cost_cop);

    // Obtener imagen principal para análisis forense
    const originalImageUrl =
      product.image_url ||
      (product.gallery ? JSON.parse(product.gallery)?.[0] : null) ||
      'https://via.placeholder.com/600';

    const { buffer: originalImgBuffer, mimeType: imgMime, base64: imgBase64 } =
      await fetchImageBuffer(originalImageUrl);

    // 4. ETAPAS 1 & 2: Análisis Forense + Google Search Grounding + Formulación de 2 Ángulos
    const ai = new GoogleGenAI({ apiKey });

    const systemInstruction = buildAngleFormulationSystemPrompt();
    const userPrompt = buildAngleFormulationUserPrompt({
      productName: product.name,
      category: product.categories ? JSON.parse(product.categories)?.[0] : undefined,
      singlePriceCop: singlePrice,
      duoPriceCop: duo.duoPriceCop,
      duoSavingsCop: duo.savingsCop,
      selectedVariation,
      previousAngles,
    });

    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let aiRes: any = null;
    let lastAiError: any = null;

    for (const model of candidateModels) {
      try {
        aiRes = await ai.models.generateContent({
          model,
          contents: [
            {
              role: 'user',
              parts: [
                {
                  inlineData: {
                    mimeType: imgMime,
                    data: imgBase64,
                  },
                },
                {
                  text: userPrompt,
                },
              ],
            },
          ],
          config: {
            systemInstruction,
            tools: [{ googleSearch: {} }],
            responseMimeType: 'application/json',
          },
        });
        if (aiRes) break;
      } catch (err: any) {
        lastAiError = err;
        console.warn(`Modelo ${model} no disponible, intentando siguiente candidato...`, err?.message);
      }
    }

    if (!aiRes) {
      throw lastAiError || new Error('No se pudo generar contenido con ningún modelo de Gemini.');
    }

    let rawJson = aiRes?.text || '{}';
    // Limpieza de bloques de código markdown si los incluye
    rawJson = rawJson.replace(/^```json\s*/, '').replace(/```$/, '').trim();

    let strategicResult: StrategicFormulationResult;
    try {
      strategicResult = JSON.parse(rawJson);
    } catch (parseErr) {
      console.error('Error parseando JSON de Gemini:', parseErr, rawJson);
      throw new Error('La respuesta de Gemini no tuvo el formato JSON esperado.');
    }

    // 5. ETAPA 3: Renderizado de las 2 Imágenes de Nivel Mundial
    // Para cada ángulo, intentar generar escena con Imagen 3 o usar la imagen de estudio del producto
    const baseScene1 =
      (await tryGenerateImagenScene(apiKey, strategicResult.angle1.lifestylePrompt)) ||
      originalImgBuffer;

    const baseScene2 =
      (await tryGenerateImagenScene(apiKey, strategicResult.angle2.lifestylePrompt)) ||
      originalImgBuffer;

    // Superponer el marco de alta precisión tipográfica (.900 y gatillos COD Colombia)
    const compositeBuffer1 = await compositeAiCreativeImage(baseScene1, {
      productName: product.name,
      selectedOffer: offerType,
      singlePriceCop: singlePrice,
      duoPriceCop: duo.duoPriceCop,
      duoSavingsCop: duo.savingsCop,
      selectedVariation,
      angle: strategicResult.angle1,
    });

    const compositeBuffer2 = await compositeAiCreativeImage(baseScene2, {
      productName: product.name,
      selectedOffer: offerType,
      singlePriceCop: singlePrice,
      duoPriceCop: duo.duoPriceCop,
      duoSavingsCop: duo.savingsCop,
      selectedVariation,
      angle: strategicResult.angle2,
    });

    const angle1DataUrl = `data:image/png;base64,${compositeBuffer1.toString('base64')}`;
    const angle2DataUrl = `data:image/png;base64,${compositeBuffer2.toString('base64')}`;

    const newPreviousAngles = Array.from(
      new Set([
        ...previousAngles,
        strategicResult.angle1.title,
        strategicResult.angle2.title,
      ])
    );

    // 6. Guardar en Caché Inteligente (SQLite & Supabase)
    await saveAiCreativeCache({
      product_id: numericId,
      combo_type: offerType,
      angle_1_title: strategicResult.angle1.title,
      angle_1_desc: strategicResult.angle1.subHeadline,
      angle_1_image: angle1DataUrl,
      angle_2_title: strategicResult.angle2.title,
      angle_2_desc: strategicResult.angle2.subHeadline,
      angle_2_image: angle2DataUrl,
      copy_text: strategicResult.persuasiveCopy,
      previous_angles: newPreviousAngles,
    });

    return NextResponse.json({
      success: true,
      fromCache: false,
      data: {
        productId: numericId,
        selectedOffer: offerType,
        angle1: {
          title: strategicResult.angle1.title,
          description: strategicResult.angle1.subHeadline,
          hook: strategicResult.angle1.hookHeadline,
          imageDataUrl: angle1DataUrl,
        },
        angle2: {
          title: strategicResult.angle2.title,
          description: strategicResult.angle2.subHeadline,
          hook: strategicResult.angle2.hookHeadline,
          imageDataUrl: angle2DataUrl,
        },
        persuasiveCopy: strategicResult.persuasiveCopy,
        previousAngles: newPreviousAngles,
      },
    });
  } catch (error: any) {
    console.error('Error en /api/ai/generate-creatives:', error);
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Error interno al procesar creativos con Google AI.',
      },
      { status: 500 }
    );
  }
}
