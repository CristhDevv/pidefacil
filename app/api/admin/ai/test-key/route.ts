import { NextRequest, NextResponse } from 'next/server';
import { isAdminAuthenticated } from '@/lib/auth';
import { getGeminiApiKey, setGeminiApiKey } from '@/lib/db';
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

    // Ping rápido con gemini-2.5-flash
    const testRes = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: 'Ping test PideFacil. Responde únicamente con OK.',
    });

    const responseText = testRes?.text?.trim() || 'OK';

    return NextResponse.json({
      success: true,
      message: 'API Key activa y con acceso a generación multimodal (Gemini 2.5)',
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
