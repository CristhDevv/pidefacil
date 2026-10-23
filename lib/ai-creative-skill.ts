/**
 * ==============================================================================
 * SKILL MAESTRA DE CREATIVOS DROPSHIPPING (DIRECT RESPONSE MARKETING COLOMBIA)
 * ==============================================================================
 * Define los lineamientos psicológicos, reglas de composición visual de 3 tercios
 * y prompts de generación multimodal para Google Gemini y modelos de imagen.
 */

export interface ProductCommercialContext {
  productName: string;
  category?: string;
  type?: 'SIMPLE' | 'VARIABLE';
  singlePriceCop: number;
  duoPriceCop: number;
  duoSavingsCop: number;
  selectedVariation?: string;
  previousAngles?: string[];
}

export interface AngleFormulation {
  angleNumber: 1 | 2;
  angleType: 'dolor_solucion' | 'valor_percibido' | 'otro';
  title: string;
  hookHeadline: string; // Máximo 5 palabras de impacto en español
  subHeadline: string; // Subtítulo o promesa clave
  settingDescription: string; // Descripción del escenario hiperrealista
  sceneBrief: string; // Una frase describiendo la escena fotográfica publicitaria ideal (sin rostros humanos visibles)
  lifestylePrompt: string; // Prompt optimizado en inglés/español para el modelo de imagen
}

export interface StrategicFormulationResult {
  productAnalysis: {
    physicalDescription: string;
    targetPainPoints: string[];
    coreBenefits: string[];
    marketDesire: string;
  };
  angle1: AngleFormulation;
  angle2: AngleFormulation;
  persuasiveCopy: string;
}

/**
 * System Prompt que instruye a Gemini para investigar el producto con Google Search
 * y formular los 2 ángulos psicológicos distintos.
 */
export function buildAngleFormulationSystemPrompt(): string {
  return `Eres el Director Creativo de Performance Marketing y Especialista en Comercio Electrónico Contra Entrega (COD) más exitoso de Colombia y Latinoamérica.

Tu especialidad es tomar productos físicos de catálogos dropshipping y transformarlos en campañas publicitarias de respuesta directa con ROAS superior a 4.0 en Facebook Ads, Instagram y TikTok.

REGLAS INQUEBRANTABLES:
1. NUNCA menciones ni conserves precios antiguos, textos en inglés o marcas de agua que puedan venir en la fotografía del proveedor.
2. Identifica con visión forense los componentes reales del producto, sus materiales, colores y accesorios.
3. Utiliza la herramienta de Google Search Grounding para investigar qué es exactamente el producto en el mercado real, qué dolores resuelve en un hogar promedio, y cuáles son sus usos más populares.
4. Formula exactamente 2 ángulos de venta psicológicos completamente distintos:
   - ÁNGULO 1: DOLOR / SOLUCIÓN DIRECTA (Enfocado en resolver un problema urgente, frustración o molestia cotidiana en un hogar real).
   - ÁNGULO 2: VALOR PERCIBIDO / KIT COMPLETO / ESTILO DE VIDA (Enfocado en la abundancia del paquete, calidad de materiales, elegancia o sensación de bienestar y estatus).
5. Si recibes una lista de "ángulos previos", TIENES ESTRICTAMENTE PROHIBIDO repetir cualquiera de ellos. Debes buscar enfoques nuevos (ejemplo: ángulo de ahorro de dinero, ángulo de regalo para familiares, ángulo de rapidez y ahorro de tiempo, ángulo de durabilidad).
6. Cada ángulo debe incluir un "sceneBrief": una frase concisa en español describiendo la escena fotográfica publicitaria ideal donde el producto es el protagonista, sin personas con rostro visible (solo manos o siluetas parciales si aplica), coherente con el gancho comercial. Las 2 escenas deben ser claramente distintas (Ángulo 1 dolor = entorno real donde ocurre el problema ya resuelto, como baño, cocina, cama u oficina; Ángulo 2 valor = ambiente premium, de regalo o estudio fotográfico impecable).
7. Cada ángulo debe incluir un "lifestylePrompt" detallado y descriptivo para el modelo de imagen: fotografía comercial de estudio o estilo de vida hiperrealista, iluminación cinematográfica cálida, 8k, sin textos basura de Canva.

Debes responder ÚNICAMENTE con un objeto JSON válido respetando el esquema indicado.`;
}

/**
 * Prompt para la fase de formulación estratégica de ángulos con Google Search Grounding
 */
export function buildAngleFormulationUserPrompt(context: ProductCommercialContext): string {
  const {
    productName,
    category,
    singlePriceCop,
    duoPriceCop,
    duoSavingsCop,
    selectedVariation,
    previousAngles,
  } = context;

  const previousAnglesSection = previousAngles && previousAngles.length > 0
    ? `\n⚠️ ATENCIÓN - ÁNGULOS PREVIOS QUE ESTÁN PROHIBIDOS DE REPETIR:\n${previousAngles
        .map((a, i) => `${i + 1}. "${a}"`)
        .join('\n')}\nCrea dos ángulos completamente distintos y frescos a los anteriores.\n`
    : '';

  return `Analiza la imagen adjunta del producto físico y realiza una investigación con Google Search para estructurar la estrategia creativa.

DATOS DEL PRODUCTO:
- Nombre: "${productName}"
- Categoría: "${category || 'General / Hogar / Belleza / Tecnología'}"
- Precio 1 Unidad (PideFácil): $${singlePriceCop.toLocaleString('es-CO')} COP
- Precio Dúo Pack 2 Unidades: $${duoPriceCop.toLocaleString('es-CO')} COP
- Ahorro al comprar 2 Unidades: $${duoSavingsCop.toLocaleString('es-CO')} COP
${selectedVariation ? `- Opción / Referencia seleccionada: "${selectedVariation}"` : ''}
${previousAnglesSection}

INSTRUCCIONES DE SALIDA:
Genera un JSON con la siguiente estructura exacta:
{
  "productAnalysis": {
    "physicalDescription": "Descripción concisa de lo que se ve físicamente en el producto real",
    "targetPainPoints": ["Dolor 1 que resuelve", "Dolor 2 que resuelve"],
    "coreBenefits": ["Beneficio 1", "Beneficio 2"],
    "marketDesire": "Por qué la gente en Colombia quiere comprar esto hoy"
  },
  "angle1": {
    "angleNumber": 1,
    "angleType": "dolor_solucion",
    "title": "Nombre corto del ángulo (ej: Solución Antimoho Rápida)",
    "hookHeadline": "TITULAR DE IMPACTO (MÁXIMO 5 PALABRAS EN MAYÚSCULAS)",
    "subHeadline": "Subtítulo explicativo de máximo 8 palabras",
    "settingDescription": "Descripción de la escena de hogar latinoamericano donde se usa",
    "sceneBrief": "Escena cotidiana en baño o cocina real donde el problema ya quedó resuelto, iluminación natural diurna, sin rostros",
    "lifestylePrompt": "Detailed English image generation prompt for photorealistic commercial product photography in 8k, warm cinematic lighting, studio or realistic domestic setting, showing the product clearly in action without any text, logos or watermarks."
  },
  "angle2": {
    "angleNumber": 2,
    "angleType": "valor_percibido",
    "title": "Nombre corto del ángulo (ej: Kit Premium de Cuidado Diario)",
    "hookHeadline": "TITULAR DE IMPACTO (MÁXIMO 5 PALABRAS EN MAYÚSCULAS)",
    "subHeadline": "Subtítulo explicativo de máximo 8 palabras",
    "settingDescription": "Descripción de la escena aspiracional o de abundancia del kit",
    "sceneBrief": "Escena de estudio publicitario o mesa de lujo con iluminación cinematográfica cálida y accesorios completos, sin rostros",
    "lifestylePrompt": "Detailed English image generation prompt for commercial product advertising photography in 8k, pristine studio setting or modern luxury interior, spotlight illumination, showing complete product kit neatly arranged, crisp details, zero text, zero watermarks."
  },
  "persuasiveCopy": "Texto persuasivo de alta conversión con emojis para WhatsApp y redes, destacando la oferta de 1 unidad ($${singlePriceCop.toLocaleString('es-CO')}) y Dúo Pack ($${duoPriceCop.toLocaleString('es-CO')}), Envío Gratis a toda Colombia y Pago Contra Entrega en casa."
}`;
}

/**
 * Reglas visuales para el Híbrido de Precisión Tipográfica (Canvas Overlay Server/Client)
 */
export const TYPOGRAPHY_PRECISION_RULES = {
  header: {
    heightRatio: 0.18, // 18% superior
    bgGradient: ['#022C22', '#064E3B'],
    titleFont: 'bold 44px sans-serif',
    hookFont: '900 52px sans-serif',
  },
  hero: {
    heightRatio: 0.52, // 52% central
    backgroundCard: '#FFFFFF',
    cornerRadius: 32,
  },
  commercialFooter: {
    heightRatio: 0.30, // 30% inferior
    bgGradient: ['#064E3B', '#022C22', '#0B132B'],
    borderGreen: '#22C55E',
    guaranteeBadge: 'ALTA CALIDAD ★★★★★',
    triggers: [
      { icon: '💵', label: 'PAGO EN CASA', sub: 'Pagas al recibir' },
      { icon: '🚚', label: 'ENVÍO GRATIS', sub: 'Toda Colombia' },
      { icon: '🛒', label: '¡PÍDELO HOY!', sub: 'POR MENSAJE »' },
    ],
  },
};
