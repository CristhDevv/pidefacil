import { NextRequest, NextResponse } from 'next/server';
import { updateModerationCorrection, revertModerationCorrection } from '@/lib/db';
import { isAdminAuthenticated } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function POST(request: NextRequest) {
  if (!isAdminAuthenticated(request)) {
    return NextResponse.json({ success: false, error: 'No autorizado' }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { action, id_dropi, crop_top_pct, crop_bottom_pct, is_active } = body;

    const numericId = Number(id_dropi);
    if (!numericId || isNaN(numericId)) {
      return NextResponse.json({ success: false, error: 'id_dropi inválido' }, { status: 400 });
    }

    if (action === 'approve') {
      await updateModerationCorrection(numericId, {
        review_status: 'approved',
      });
      return NextResponse.json({ success: true, message: 'Corrección aprobada con éxito.' });
    }

    if (action === 'revert') {
      const ok = await revertModerationCorrection(numericId);
      if (!ok) {
        return NextResponse.json({ success: false, error: 'No se pudo revertir la imagen original.' }, { status: 400 });
      }
      return NextResponse.json({ success: true, message: 'Imagen original de Dropi restaurada.' });
    }

    if (action === 'update_crop') {
      const top = Math.max(0, Math.min(35, Number(crop_top_pct || 0)));
      const bottom = Math.max(0, Math.min(35, Number(crop_bottom_pct || 0)));

      let applied: 'none' | 'crop_top' | 'crop_bottom' | 'crop_both' = 'none';
      if (top > 0 && bottom > 0) applied = 'crop_both';
      else if (top > 0) applied = 'crop_top';
      else if (bottom > 0) applied = 'crop_bottom';

      await updateModerationCorrection(numericId, {
        crop_top_pct: top,
        crop_bottom_pct: bottom,
        correction_applied: applied,
        review_status: 'approved',
      });

      return NextResponse.json({ success: true, message: 'Recorte actualizado y aprobado.' });
    }

    if (action === 'toggle_active') {
      const newActive = is_active ? 1 : 0;
      await updateModerationCorrection(numericId, {
        is_active: newActive,
        correction_applied: newActive === 0 ? 'deactivated' : 'none',
      });
      return NextResponse.json({
        success: true,
        message: newActive ? 'Producto activado' : 'Producto desactivado preventivamente',
      });
    }

    return NextResponse.json({ success: false, error: 'Acción desconocida' }, { status: 400 });
  } catch (error: any) {
    console.error('Error in admin moderation action:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Error procesando acción de moderación' },
      { status: 500 }
    );
  }
}
