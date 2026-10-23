import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getGeminiApiKey } from '@/lib/db';
import { GoogleGenAI } from '@google/genai';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json().catch(() => ({}));
    let apiKey = body?.apiKey?.trim();

    // Si no enviaron una clave en el body, usar la guardada en BD
    if (!apiKey) {
      apiKey = await getGeminiApiKey();
    }

    if (!apiKey) {
      return NextResponse.json({
        success: false,
        error: 'No se ha configurado ninguna API Key de Google Gemini.',
      });
    }

    // Inicializar GoogleGenAI SDK oficial
    const ai = new GoogleGenAI({ apiKey });

    // Modelos candidatos según versión de Google AI Studio
    const candidateModels = ['gemini-3.8-flash', 'gemini-flash-latest', 'gemini-2.5-flash'];
    let workingModel = '';
    let responseText = '';
    let lastError: any = null;

    for (const model of candidateModels) {
      try {
        const testRes = await ai.models.generateContent({
          model,
          contents: 'Ping test PideFacil. Responde únicamente con OK.',
        });
        responseText = testRes?.text?.trim() || 'OK';
        workingModel = model;
        break;
      } catch (err: any) {
        lastError = err;
      }
    }

    if (!workingModel) {
      throw lastError || new Error('No se pudo conectar con ningún modelo disponible de Gemini');
    }

    return NextResponse.json({
      success: true,
      message: `API Key activa y con acceso a generación multimodal (${workingModel})`,
      model: workingModel,
      response: responseText,
    });
  } catch (error: any) {
    console.error('Error probando Gemini API Key:', error);
    return NextResponse.json({
      success: false,
      error: `Error al conectar con Google AI: ${error?.message || 'Clave inválida o sin cuota'}`,
    });
  }
}
