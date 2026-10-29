import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { setAppSetting, getAppSetting } from '../lib/db';

async function main() {
  console.log('--- Configurando Clave Maestra en app_settings (Supabase & SQLite) ---');
  const newSecret = 'Soloc@li1';

  const ok = await setAppSetting('ADMIN_SECRET', newSecret);
  console.log('Resultado de setAppSetting:', ok ? 'Éxito' : 'Fallo');

  const verified = await getAppSetting('ADMIN_SECRET');
  console.log('Valor verificado en app_settings:', verified);

  if (verified === newSecret) {
    console.log('✅ Clave maestra persistida exitosamente como "Soloc@li1"');
  } else {
    console.error('❌ Inconsistencia en la verificación');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error al configurar clave maestra:', err);
  process.exit(1);
});
