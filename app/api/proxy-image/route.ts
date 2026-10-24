import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';

export const runtime = 'nodejs';

// Endpoint Proxy Anti-CORS y Transformador de Recortes para imágenes de catálogo
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const imageUrl = searchParams.get('url');

    if (!imageUrl) {
      return NextResponse.json(
        { error: 'Parámetro url es requerido' },
        { status: 400 }
      );
    }

    // Validar protocolo
    let parsedUrl: URL;
    try {
      parsedUrl = new URL(imageUrl);
    } catch {
      return NextResponse.json(
        { error: 'URL inválida' },
        { status: 400 }
      );
    }

    if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
      return NextResponse.json(
        { error: 'Protocolo no soportado' },
        { status: 400 }
      );
    }

    // Parámetros de recorte en porcentaje (ej: cropTop=15 -> recorta 15% superior)
    const cropTop = Math.max(0, Math.min(40, parseInt(searchParams.get('cropTop') || '0', 10) || 0));
    const cropBottom = Math.max(0, Math.min(40, parseInt(searchParams.get('cropBottom') || '0', 10) || 0));

    // Fetch hacia la imagen original (CloudFront u otros CDN)
    const upstreamRes = await fetch(imageUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; PideFacilImageProxy/1.0)',
        'Accept': 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
      },
      signal: AbortSignal.timeout(12000),
    });

    if (!upstreamRes.ok) {
      return NextResponse.json(
        { error: `Error obteniendo imagen de origen: ${upstreamRes.status}` },
        { status: upstreamRes.status }
      );
    }

    const contentType = upstreamRes.headers.get('content-type') || 'image/jpeg';
    const arrayBuffer = await upstreamRes.arrayBuffer();
    let outputBuffer: Buffer = Buffer.from(arrayBuffer);

    // Si se solicitó recorte de franjas superior o inferior
    if (cropTop > 0 || cropBottom > 0) {
      try {
        const image = sharp(outputBuffer);
        const metadata = await image.metadata();

        if (metadata.width && metadata.height) {
          const topPx = Math.round(metadata.height * (cropTop / 100));
          const btmPx = Math.round(metadata.height * (cropBottom / 100));
          const newHeight = Math.max(30, metadata.height - topPx - btmPx);

          outputBuffer = await sharp(outputBuffer)
            .extract({
              left: 0,
              top: topPx,
              width: metadata.width,
              height: newHeight,
            })
            .jpeg({ quality: 90 })
            .toBuffer();
        }
      } catch (cropErr: any) {
        console.warn('Error aplicando recorte en proxy-image:', cropErr.message);
      }
    }

    return new NextResponse(new Uint8Array(outputBuffer), {
      status: 200,
      headers: {
        'Content-Type': cropTop > 0 || cropBottom > 0 ? 'image/jpeg' : contentType,
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Cache-Control': 'public, max-age=604800, s-maxage=604800, stale-while-revalidate=2592000',
      },
    });
  } catch (error: any) {
    console.error('Error en proxy de imagen:', error);
    return NextResponse.json(
      { error: 'Error interno en proxy de imagen', details: error.message },
      { status: 500 }
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
