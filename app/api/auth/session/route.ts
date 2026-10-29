import { NextRequest, NextResponse } from 'next/server';
import { getSellerFromRequest } from '@/lib/seller-auth';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const seller = await getSellerFromRequest(request);

    if (seller) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: seller.id,
          name: seller.name,
          email: seller.email,
          phone: seller.phone,
          role: seller.role || 'vendedor',
          status: seller.status,
        },
      });
    }

    // Si tiene cookie pf_admin_token pero no pf_seller_token (login previo con master secret)
    const isAdmin = isAdminAuthenticated(request);
    if (isAdmin) {
      return NextResponse.json({
        authenticated: true,
        user: {
          id: 1,
          name: 'Administrador Maestro',
          email: 'admin@pidefacil.co',
          phone: '',
          role: 'admin',
          status: 'approved',
        },
      });
    }

    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  } catch (error) {
    console.error('Error fetching auth session:', error);
    return NextResponse.json({
      authenticated: false,
      user: null,
    });
  }
}
