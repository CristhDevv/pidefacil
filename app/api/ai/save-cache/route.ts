import { NextRequest, NextResponse } from 'next/server';
import { saveAiCreativeCache } from '@/lib/db';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      productId,
      comboType,
      angle1Title,
      angle1Desc,
      angle1Image,
      angle2Title,
      angle2Desc,
      angle2Image,
      copyText,
      previousAngles,
    } = body;

    if (!productId || !angle1Image || !angle2Image) {
      return NextResponse.json({ success: false, error: 'Datos incompletos' }, { status: 400 });
    }

    await saveAiCreativeCache({
      product_id: Number(productId),
      combo_type: comboType === '1x' ? '1x' : '2x',
      angle_1_title: angle1Title || 'Ángulo 1',
      angle_1_desc: angle1Desc || '',
      angle_1_image: angle1Image,
      angle_2_title: angle2Title || 'Ángulo 2',
      angle_2_desc: angle2Desc || '',
      angle_2_image: angle2Image,
      copy_text: copyText || '',
      previous_angles: Array.isArray(previousAngles) ? previousAngles : [],
    });

    return NextResponse.json({ success: true, message: 'Caché guardada' });
  } catch (error: any) {
    console.error('Error guardando en caché:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
