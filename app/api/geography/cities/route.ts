import { NextRequest, NextResponse } from 'next/server';
import { DROPI_COLOMBIA_GEO } from '@/lib/dropi-geography';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const department = searchParams.get('department');

  if (department) {
    const dept = DROPI_COLOMBIA_GEO.find(
      (d) => d.name.toLowerCase() === department.trim().toLowerCase()
    );
    return NextResponse.json({
      success: true,
      data: dept ? dept.cities : [],
    });
  }

  return NextResponse.json({
    success: true,
    data: DROPI_COLOMBIA_GEO,
  });
}
