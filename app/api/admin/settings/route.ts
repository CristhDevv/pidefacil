import { NextRequest, NextResponse } from 'next/server';
import { getCatalogStats, getAppSetting, setAppSetting, db, isSupabaseConfigured } from '@/lib/db';
import { getPricingConfig } from '@/config/pricing';

export const dynamic = 'force-dynamic';

export async function GET(_request: NextRequest) {
  try {
    const stats = await getCatalogStats();
    const config = getPricingConfig();

    const marginVal = await getAppSetting('MARGIN_BASE_COP');
    const duoVal = await getAppSetting('DUO_PACK_DISCOUNT_PERCENT');

    const currentMargin = marginVal ? parseInt(marginVal, 10) : config.marginBaseCop;
    const currentDuoDiscount = duoVal ? parseInt(duoVal, 10) : config.duoPackDiscountPercent;

    let lastSweep: any = null;
    if (!isSupabaseConfigured) {
      try {
        lastSweep = db
          .prepare('SELECT * FROM sync_checkpoints ORDER BY updated_at DESC LIMIT 1')
          .get() as any;
      } catch {}
    }

    return NextResponse.json({
      success: true,
      stats,
      settings: {
        margin_base_cop: currentMargin,
        duo_pack_discount_percent: currentDuoDiscount,
      },
      lastSweep,
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
  try {
    const body = await request.json();
    const { margin_base_cop, duo_pack_discount_percent } = body;

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
