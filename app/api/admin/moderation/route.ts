import { NextRequest, NextResponse } from 'next/server';
import { listModeratedProducts, getModerationStats } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(request.url);
    const filter = searchParams.get('filter') || 'marked';
    const status = searchParams.get('status') || 'all';
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '30', 10)));
    const offset = (page - 1) * limit;

    const [stats, listResult] = await Promise.all([
      getModerationStats(),
      listModeratedProducts({
        filter,
        status,
        limit,
        offset,
      }),
    ]);

    return NextResponse.json({
      success: true,
      stats,
      data: listResult.items,
      pagination: {
        page,
        limit,
        total: listResult.total,
        totalPages: Math.ceil(listResult.total / limit) || 1,
      },
    });
  } catch (error: any) {
    console.error('Error in admin moderation GET:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error al consultar productos moderados' },
      { status: 500 }
    );
  }
}
