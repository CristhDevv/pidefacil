import { NextRequest, NextResponse } from 'next/server';
import { searchActiveProducts } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q') || '';

    if (!query || query.trim().length === 0) {
      return NextResponse.json({ success: true, data: [] });
    }

    const results = await searchActiveProducts(query, 10);

    return NextResponse.json({
      success: true,
      data: results,
    });
  } catch (error: any) {
    console.error('Error in products search:', error);
    return NextResponse.json(
      { success: false, error: 'Error al buscar en el catálogo' },
      { status: 500 }
    );
  }
}
