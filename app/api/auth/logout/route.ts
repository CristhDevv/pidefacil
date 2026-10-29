import { NextResponse } from 'next/server';
import { clearSellerSessionCookie } from '@/lib/seller-auth';

export const dynamic = 'force-dynamic';

export async function POST() {
  const response = NextResponse.json({
    success: true,
    message: 'Sesión cerrada correctamente',
  });

  clearSellerSessionCookie(response);
  response.cookies.delete('pf_admin_token');

  return response;
}
