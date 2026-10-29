import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
dotenv.config();

process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

import { NextRequest } from 'next/server';
import { POST as adminLoginHandler } from '../app/api/admin/auth/login/route';
import { POST as authLoginHandler } from '../app/api/auth/login/route';

async function testMasterLogin() {
  console.log('===============================================================');
  console.log('🧪 VERIFICACIÓN DE LOGIN CON NUEVA CLAVE MAESTRA');
  console.log('===============================================================\n');

  // 1. Probar login en /api/admin/auth/login con la nueva clave "Soloc@li1"
  console.log('📌 1. Test /api/admin/auth/login con "Soloc@li1":');
  const reqAdminSuccess = new NextRequest('http://localhost:3000/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'Soloc@li1' }),
  });
  const resAdminSuccess = await adminLoginHandler(reqAdminSuccess);
  const dataAdminSuccess = await resAdminSuccess.json();
  console.log('  Status:', resAdminSuccess.status);
  console.log('  Response:', dataAdminSuccess);
  if (resAdminSuccess.status !== 200 || !dataAdminSuccess.success) {
    throw new Error('Fallo al autenticar con Soloc@li1 en /api/admin/auth/login');
  }
  console.log('  ✅ Autenticación exitosa en panel admin con token generado.');

  // 2. Probar que la clave vieja "pidefacil_admin_secret_2026" sea rechazada
  console.log('\n📌 2. Test /api/admin/auth/login con clave vieja (debe ser rechazada):');
  const reqAdminOld = new NextRequest('http://localhost:3000/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'pidefacil_admin_secret_2026' }),
  });
  const resAdminOld = await adminLoginHandler(reqAdminOld);
  const dataAdminOld = await resAdminOld.json();
  console.log('  Status:', resAdminOld.status);
  console.log('  Response:', dataAdminOld);
  if (resAdminOld.status !== 401) {
    throw new Error('La clave vieja no fue rechazada en /api/admin/auth/login');
  }
  console.log('  ✅ Clave vieja correctamente rechazada (401).');

  // 3. Probar login en /api/auth/login con la nueva clave "Soloc@li1"
  console.log('\n📌 3. Test /api/auth/login con "Soloc@li1":');
  const reqAuthSuccess = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'Soloc@li1' }),
  });
  const resAuthSuccess = await authLoginHandler(reqAuthSuccess);
  const dataAuthSuccess = await resAuthSuccess.json();
  console.log('  Status:', resAuthSuccess.status);
  console.log('  Response:', dataAuthSuccess);
  if (resAuthSuccess.status !== 200 || !dataAuthSuccess.success || dataAuthSuccess.user?.role !== 'admin') {
    throw new Error('Fallo al autenticar con Soloc@li1 en /api/auth/login');
  }
  console.log('  ✅ Autenticación exitosa en /api/auth/login con redirección a /admin.');

  // 4. Probar que la clave vieja en /api/auth/login sea rechazada
  console.log('\n📌 4. Test /api/auth/login con clave vieja (debe ser rechazada):');
  const reqAuthOld = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ password: 'pidefacil_admin_secret_2026' }),
  });
  const resAuthOld = await authLoginHandler(reqAuthOld);
  const dataAuthOld = await resAuthOld.json();
  console.log('  Status:', resAuthOld.status);
  console.log('  Response:', dataAuthOld);
  if (resAuthOld.status === 200) {
    throw new Error('La clave vieja no fue rechazada en /api/auth/login');
  }
  console.log('  ✅ Clave vieja correctamente rechazada.');

  // 5. Probar que el vendedor usuariodeprueba@pidefacil.com mantenga su rol "vendedor" al loguearse en /api/auth/login
  console.log('\n📌 5. Test login vendedor usuariodeprueba@pidefacil.com (debe ser rol vendedor y redirect /seller):');
  const reqSellerLogin = new NextRequest('http://localhost:3000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'usuariodeprueba@pidefacil.com', password: 'Soloc@li1' }),
  });
  const resSellerLogin = await authLoginHandler(reqSellerLogin);
  const dataSellerLogin = await resSellerLogin.json();
  console.log('  Status:', resSellerLogin.status);
  console.log('  Response:', dataSellerLogin);
  if (resSellerLogin.status !== 200 || dataSellerLogin.user?.role !== 'vendedor' || dataSellerLogin.redirect !== '/seller') {
    throw new Error(`El vendedor no fue detectado correctamente como rol vendedor: ${JSON.stringify(dataSellerLogin)}`);
  }
  console.log('  ✅ Vendedor correctamente detectado como rol "vendedor" y enviado a /seller.');

  // 6. Probar que el vendedor sea rechazado si intenta entrar directamente al panel /admin
  console.log('\n📌 6. Test vendedor en /api/admin/auth/login (debe ser rechazado con 403):');
  const reqAdminForbidden = new NextRequest('http://localhost:3000/api/admin/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'usuariodeprueba@pidefacil.com', password: 'Soloc@li1' }),
  });
  const resAdminForbidden = await adminLoginHandler(reqAdminForbidden);
  const dataAdminForbidden = await resAdminForbidden.json();
  console.log('  Status:', resAdminForbidden.status);
  console.log('  Response:', dataAdminForbidden);
  if (resAdminForbidden.status !== 403) {
    throw new Error('El vendedor no fue rechazado de /api/admin/auth/login');
  }
  console.log('  ✅ Acceso denegado a vendedor en panel administrativo (403 correcto).');

  console.log('\n🎉 ¡TODAS LAS VERIFICACIONES DE LA CLAVE MAESTRA Y ROLES PASARON EXITOSAMENTE!');
}

testMasterLogin().catch((err) => {
  console.error('Error durante la prueba:', err);
  process.exit(1);
});
