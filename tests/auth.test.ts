/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: SEGURIDAD, TOKENS CRIPTOGRÁFICOS Y ROLES
 * ==============================================================================
 * Verifica la firma HMAC-SHA256, hashing PBKDF2, detección de roles y
 * validación contra falsificación (tampering) y expiración de tokens.
 */

import {
  createAdminToken,
  verifyAdminToken,
  getAdminSecret,
} from '../lib/auth';
import {
  hashSellerPassword,
  verifySellerPassword,
  createSellerToken,
  verifySellerToken,
} from '../lib/seller-auth';
import { TestSuite } from './test-utils';

export function runAuthTests() {
  const suite = new TestSuite('lib/auth.ts & lib/seller-auth.ts (Autenticación y Roles)');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: Autenticación y Seguridad Criptográfica');
  console.log('===============================================================\n');

  // 1. Tokens de Administrador (lib/auth.ts)
  console.log('📌 Bloque 1: Tokens Criptográficos de Administrador');

  suite.assertEqual(getAdminSecret(), 'Soloc@li1', 'La clave maestra administrativa debe ser "Soloc@li1"');

  const adminToken = createAdminToken();
  suite.assert(typeof adminToken === 'string' && adminToken.includes('.'), 'createAdminToken genera string formato timestamp.signature');

  const isValidAdmin = verifyAdminToken(adminToken);
  suite.assert(isValidAdmin === true, 'verifyAdminToken valida token legítimo recién generado');

  // Ataques / Tampering
  const [adminTs, adminSig] = adminToken.split('.');
  const tamperedSig = adminSig.slice(0, -2) + (adminSig.endsWith('a') ? 'b' : 'a');
  suite.assert(
    verifyAdminToken(`${adminTs}.${tamperedSig}`) === false,
    'Rechaza token con firma alterada (tampering)'
  );

  const tamperedTs = (parseInt(adminTs, 10) + 1000).toString();
  suite.assert(
    verifyAdminToken(`${tamperedTs}.${adminSig}`) === false,
    'Rechaza token con timestamp alterado'
  );

  // Expiración: Simular token de hace 8 días (> 7 días)
  const eightDaysAgo = Date.now() - 8 * 24 * 60 * 60 * 1000;
  suite.assert(
    verifyAdminToken(`${eightDaysAgo}.${adminSig}`) === false,
    'Rechaza token con expiración vencida (> 7 días)'
  );

  // Casos defensivos
  suite.assert(verifyAdminToken('') === false, 'Rechaza string vacío');
  suite.assert(verifyAdminToken(null) === false, 'Rechaza null');
  suite.assert(verifyAdminToken(undefined) === false, 'Rechaza undefined');
  suite.assert(verifyAdminToken('token_sin_puntos') === false, 'Rechaza formato inválido');

  // 2. Hashing de Contraseñas de Vendedor / Operador (PBKDF2-SHA512)
  console.log('\n📌 Bloque 2: Hash y Verificación de Contraseñas (PBKDF2)');

  const passwordPlain = 'MiClaveSegura2026!';
  const hashedPassword = hashSellerPassword(passwordPlain);

  suite.assert(
    hashedPassword.includes(':') && hashedPassword.split(':')[0].length === 32,
    'hashSellerPassword genera hash con salt hexadecimal de 16 bytes'
  );

  suite.assert(
    verifySellerPassword(passwordPlain, hashedPassword) === true,
    'verifySellerPassword valida correctamente la contraseña original'
  );

  suite.assert(
    verifySellerPassword('ClaveErronea123', hashedPassword) === false,
    'verifySellerPassword rechaza contraseña equivocada'
  );

  // Salting único por hash
  const hash2 = hashSellerPassword(passwordPlain);
  suite.assert(
    hashedPassword !== hash2,
    'Dos hashes de la misma contraseña tienen salts distintos (anti-rainbow table)'
  );
  suite.assert(
    verifySellerPassword(passwordPlain, hash2) === true,
    'El segundo hash también valida con la misma contraseña'
  );

  // Formato corrupto
  suite.assert(
    verifySellerPassword(passwordPlain, 'hash_invalido_sin_separador') === false,
    'Manejo seguro de hash corrupto (retorna false sin explotar)'
  );

  // 3. Tokens de Sesión y Detección de Roles (lib/seller-auth.ts)
  console.log('\n📌 Bloque 3: Sesiones JWT/HMAC y Roles');

  const sellerPayload = {
    id: 42,
    email: 'vendedor@pidefacil.co',
    role: 'vendedor' as const,
  };
  const sellerToken = createSellerToken(sellerPayload);
  suite.assert(sellerToken.includes('.'), 'createSellerToken genera token base64url.signature');

  const verifiedSeller = verifySellerToken(sellerToken);
  suite.assert(verifiedSeller !== null, 'verifySellerToken decodifica y valida firma');
  suite.assertEqual(verifiedSeller?.id, 42, 'Preserva ID del vendedor');
  suite.assertEqual(verifiedSeller?.email, 'vendedor@pidefacil.co', 'Preserva Email');
  suite.assertEqual(verifiedSeller?.role, 'vendedor', 'Preserva Rol vendedor');

  // Token para Operador
  const operatorToken = createSellerToken({ id: 88, email: 'operaciones@pidefacil.co', role: 'operador' });
  const verifiedOp = verifySellerToken(operatorToken);
  suite.assertEqual(verifiedOp?.role, 'operador', 'Preserva Rol operador');

  // Token para Administrador
  const adminSellerToken = createSellerToken({ id: 1, email: 'admin@pidefacil.co', role: 'admin' });
  const verifiedAdmin = verifySellerToken(adminSellerToken);
  suite.assertEqual(verifiedAdmin?.role, 'admin', 'Preserva Rol admin');

  // Detección de Tampering en payload o firma
  const [sPayloadB64, sSig] = sellerToken.split('.');
  const fakeSig = sSig.slice(0, -4) + 'ffff';
  suite.assert(
    verifySellerToken(`${sPayloadB64}.${fakeSig}`) === null,
    'Rechaza sesión con firma alterada'
  );

  // Modificación del payload (escalada de privilegios a admin)
  const decodedPayload = JSON.parse(Buffer.from(sPayloadB64, 'base64url').toString('utf8'));
  decodedPayload.role = 'admin'; // Intento de escalada
  const hackedPayloadB64 = Buffer.from(JSON.stringify(decodedPayload)).toString('base64url');
  suite.assert(
    verifySellerToken(`${hackedPayloadB64}.${sSig}`) === null,
    'Rechaza ataque de escalada de privilegios por manipulación de payload'
  );

  return suite.summary();
}

if (process.argv[1]?.endsWith('auth.test.ts')) {
  const result = runAuthTests();
  if (result.failed > 0) process.exit(1);
}
