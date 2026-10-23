import { NextRequest, NextResponse } from 'next/server';
import { getProductById, getAiCreativeCache, saveAiCreativeCache, getGeminiApiKey } from '@/lib/db';
import { calculateDuoPrice } from '@/config/pricing';
import { GoogleGenAI } from '@google/genai';
import {
  buildAngleFormulationSystemPrompt,
  buildAngleFormulationUserPrompt,
  StrategicFormulationResult,
} from '@/lib/ai-creative-skill';
import { generateTwoScenes } from '@/lib/ai-scene-generator';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const maxDuration = 60;

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
              sceneDataUrl: cached.scene_1_data || null,
            },
            angle2: {
              title: cached.angle_2_title,
              description: cached.angle_2_desc,
              imageDataUrl: cached.angle_2_image,
              sceneDataUrl: cached.scene_2_data || null,
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

    const candidateModels = ['gemini-3.5-flash', 'gemini-3-flash-preview', 'gemini-3.8-flash'];
    let aiRes: any = null;
    let lastAiError: any = null;

    for (const model of candidateModels) {
      try {
        // 1. Intentar con Google Search Grounding
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
        console.warn(`Modelo ${model} con Google Search no disponible (${err?.message}), reintentando sin tool...`);
        // 2. Fallback de alta resiliencia sin Google Search para no bloquear al usuario por cuota
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
              responseMimeType: 'application/json',
            },
          });
          if (aiRes) break;
        } catch (retryErr: any) {
          lastAiError = retryErr;
        }
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

    // 5. ETAPA 3: Generación de Escenas Hiperrealistas con Gemini Image Models
    let scene1DataUrl: string | null = null;
    let scene1Error: string | null = null;
    let scene2DataUrl: string | null = null;
    let scene2Error: string | null = null;

    try {
      const productCategory = product.categories
        ? JSON.parse(product.categories)?.[0] || 'General'
        : 'General';

      const sceneResults = await generateTwoScenes(
        {
          apiKey,
          productImageBase64: imgBase64,
          productImageMime: imgMime,
          productName: product.name,
          category: productCategory,
        },
        [
          {
            angle: 'dolor',
            hook: strategicResult.angle1.hookHeadline,
            sceneBrief: strategicResult.angle1.sceneBrief || strategicResult.angle1.settingDescription,
          },
          {
            angle: 'valor',
            hook: strategicResult.angle2.hookHeadline,
            sceneBrief: strategicResult.angle2.sceneBrief || strategicResult.angle2.settingDescription,
          },
        ]
      );

      if (sceneResults[0]?.ok) {
        scene1DataUrl = `data:image/png;base64,${sceneResults[0].pngBase64}`;
      } else {
        scene1Error = sceneResults[0]?.reason || 'No se pudo generar la escena nueva';
      }

      if (sceneResults[1]?.ok) {
        scene2DataUrl = `data:image/png;base64,${sceneResults[1].pngBase64}`;
      } else {
        scene2Error = sceneResults[1]?.reason || 'No se pudo generar la escena nueva';
      }
    } catch (sceneErr: any) {
      console.warn('Fallo en generación de escenas con IA, continuando con fallback:', sceneErr);
      scene1Error = sceneErr?.message || 'Error generando escena';
      scene2Error = sceneErr?.message || 'Error generando escena';
    }

    // 6. Formulación Estratégica Completa
    const newPreviousAngles = Array.from(
      new Set([
        ...previousAngles,
        strategicResult.angle1.title,
        strategicResult.angle2.title,
      ])
    );

    return NextResponse.json({
      success: true,
      fromCache: false,
      data: {
        productId: numericId,
        productName: product.name,
        imageUrl: originalImageUrl,
        selectedOffer: offerType,
        singlePriceCop: singlePrice,
        duoPriceCop: duo.duoPriceCop,
        duoSavingsCop: duo.savingsCop,
        selectedVariation,
        angle1: {
          title: strategicResult.angle1.title,
          hookHeadline: strategicResult.angle1.hookHeadline,
          subHeadline: strategicResult.angle1.subHeadline,
          description: strategicResult.angle1.subHeadline,
          sceneBrief: strategicResult.angle1.sceneBrief,
          sceneDataUrl: scene1DataUrl,
          sceneError: scene1Error,
          angleNumber: 1,
          angleType: 'dolor_solucion',
        },
        angle2: {
          title: strategicResult.angle2.title,
          hookHeadline: strategicResult.angle2.hookHeadline,
          subHeadline: strategicResult.angle2.subHeadline,
          description: strategicResult.angle2.subHeadline,
          sceneBrief: strategicResult.angle2.sceneBrief,
          sceneDataUrl: scene2DataUrl,
          sceneError: scene2Error,
          angleNumber: 2,
          angleType: 'valor_percibido',
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
