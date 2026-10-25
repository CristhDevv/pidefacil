import { NextRequest, NextResponse } from 'next/server';
import { getSellerFromRequest, clearSellerSessionCookie } from '@/lib/seller-auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  const seller = await getSellerFromRequest(request);
  if (!seller) {
    return NextResponse.json({ authenticated: false, seller: null });
  }

  return NextResponse.json({
    authenticated: true,
    seller: {
      id: seller.id,
      name: seller.name,
      email: seller.email,
      phone: seller.phone,
      status: seller.status,
    },
  });
}

export async function POST() {
  const response = NextResponse.json({ success: true, message: 'Sesión cerrada' });
  clearSellerSessionCookie(response);
  return response;
}
