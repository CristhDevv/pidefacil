import { NextRequest, NextResponse } from 'next/server';
import { getCatalogStats, getAppSetting, setAppSetting, db, isSupabaseConfigured } from '@/lib/db';
import { getPricingConfig } from '@/config/pricing';
import { isAdminAuthenticated } from '@/lib/auth';
import fs from 'fs';
import path from 'path';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const stats = await getCatalogStats();
    const config = getPricingConfig();

    const marginVal = await getAppSetting('MARGIN_BASE_COP');
    const duoVal = await getAppSetting('DUO_PACK_DISCOUNT_PERCENT');
    const storeNameVal = await getAppSetting('STORE_NAME');
    const storePhoneVal = await getAppSetting('WHATSAPP_NUMBER');

    const currentMargin = marginVal ? parseInt(marginVal, 10) : config.marginBaseCop;
    const currentDuoDiscount = duoVal ? parseInt(duoVal, 10) : config.duoPackDiscountPercent;

    let heartbeat: any = null;
    const hbPath = path.join(process.cwd(), 'data', 'enrich-heartbeat.json');
    if (fs.existsSync(hbPath)) {
      try {
        heartbeat = JSON.parse(fs.readFileSync(hbPath, 'utf8'));
      } catch {}
    }

    return NextResponse.json({
      success: true,
      stats,
      settings: {
        margin_base_cop: currentMargin,
        duo_pack_discount_percent: currentDuoDiscount,
        store_name: storeNameVal || process.env.NEXT_PUBLIC_STORE_NAME || 'PideFácil',
        whatsapp_number: storePhoneVal || process.env.NEXT_PUBLIC_WHATSAPP_NUMBER || '573009123456',
      },
      heartbeat,
    });
  } catch (error: any) {
    console.error('Error in admin settings GET:', error);
    return NextResponse.json(
      { success: false, error: 'Error al consultar configuración' },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { margin_base_cop, duo_pack_discount_percent, store_name, whatsapp_number } = body;

    if (typeof margin_base_cop === 'number') {
      if (margin_base_cop < 20000 || margin_base_cop > 150000) {
        return NextResponse.json(
          { success: false, error: 'El margen debe estar en un rango razonable (entre $20.000 y $150.000 COP).' },
          { status: 400 }
        );
      }
      await setAppSetting('MARGIN_BASE_COP', String(margin_base_cop));
    }

    if (typeof duo_pack_discount_percent === 'number') {
      await setAppSetting('DUO_PACK_DISCOUNT_PERCENT', String(duo_pack_discount_percent));
    }

    if (typeof store_name === 'string' && store_name.trim()) {
      await setAppSetting('STORE_NAME', store_name.trim());
    }

    if (typeof whatsapp_number === 'string' && whatsapp_number.trim()) {
      await setAppSetting('WHATSAPP_NUMBER', whatsapp_number.trim().replace(/\D/g, ''));
    }

    return NextResponse.json({
      success: true,
      message: 'Configuración actualizada correctamente.',
    });
  } catch (error: any) {
    console.error('Error in admin settings POST:', error);
    return NextResponse.json(
      { success: false, error: 'Error al actualizar configuración' },
      { status: 500 }
    );
  }
}
