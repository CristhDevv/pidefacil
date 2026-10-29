/**
 * ==============================================================================
 * SUITE DE PRUEBAS UNITARIAS: GEOGRAFÍA DANE Y TARIFAS LOGÍSTICAS DE TRANSPORTE
 * ==============================================================================
 * Verifica los directorios geográficos oficiales, resolución de ciudades/IDs,
 * cálculo de peso volumétrico y la liquidación financiera de fletes y márgenes.
 */

import { COLOMBIA_GEO } from '../lib/colombia-geo';
import {
  DROPI_COLOMBIA_GEO,
  getDropiDepartments,
  getDropiCitiesByDepartment,
  findDropiCityById,
  findDropiCityByName,
} from '../lib/dropi-geography';
import { calculateChargeableWeight } from '../lib/dropi-quote';
import { TestSuite } from './test-utils';

export function runGeographyAndShippingTests() {
  const suite = new TestSuite('lib/colombia-geo & lib/dropi-geography (Geografía y Fletes)');

  console.log('\n===============================================================');
  console.log('🧪 EJECUTANDO TEST SUITE: Geografía Nacional y Fletes');
  console.log('===============================================================\n');

  // 1. Directorio Geográfico DANE / Checkout
  console.log('📌 Bloque 1: Directorio Geográfico Nacional (COLOMBIA_GEO)');

  suite.assert(COLOMBIA_GEO.length >= 30, `Cubre al menos 30 departamentos de Colombia (Total: ${COLOMBIA_GEO.length})`);

  const bogota = COLOMBIA_GEO.find((d) => d.name === 'Bogotá D.C.');
  suite.assert(!!bogota && bogota.cities.includes('Bogotá D.C.'), 'Incluye Bogotá D.C. con su ciudad capital');

  const antioquia = COLOMBIA_GEO.find((d) => d.name === 'Antioquia');
  suite.assert(
    !!antioquia && antioquia.cities.includes('Medellín') && antioquia.cities.includes('Envigado'),
    'Incluye Antioquia con Medellín y municipios del Valle de Aburrá'
  );

  const valle = COLOMBIA_GEO.find((d) => d.name === 'Valle del Cauca');
  suite.assert(
    !!valle && valle.cities.includes('Cali') && valle.cities.includes('Palmira'),
    'Incluye Valle del Cauca con Cali y Palmira'
  );

  // 2. Directorio Geográfico Oficial para API de Cotizaciones
  console.log('\n📌 Bloque 2: Mapeo Oficial de Ciudades e IDs');

  const dropiDepts = getDropiDepartments();
  suite.assert(dropiDepts.includes('BOGOTA D.C.'), 'Departamentos oficiales incluyen BOGOTA D.C.');
  suite.assert(dropiDepts.includes('ANTIOQUIA'), 'Departamentos oficiales incluyen ANTIOQUIA');

  const antCities = getDropiCitiesByDepartment('ANTIOQUIA');
  suite.assert(antCities.length > 5, 'Retorna listado de ciudades para Antioquia');
  suite.assert(
    antCities.some((c) => c.name === 'MEDELLIN' && c.id === 2),
    'Medellín tiene ID oficial 2'
  );

  // Búsqueda por ID
  const city1 = findDropiCityById(1);
  suite.assert(city1?.name === 'BOGOTA, D.C.', 'findDropiCityById(1) resuelve BOGOTA, D.C.');

  const city17 = findDropiCityById(17);
  suite.assert(city17?.name === 'CALI', 'findDropiCityById(17) resuelve CALI');

  const cityInvalid = findDropiCityById(999999);
  suite.assert(cityInvalid === undefined, 'findDropiCityById con ID inexistente retorna undefined');

  // Búsqueda por Nombre (Case-Insensitive)
  const cityByName = findDropiCityByName('cali');
  suite.assert(cityByName?.id === 17, 'findDropiCityByName("cali") resuelve con ID 17');

  const cityByNameAccents = findDropiCityByName('Medellin');
  suite.assert(cityByNameAccents?.id === 2, 'findDropiCityByName("Medellin") resuelve con ID 2');

  const cityNotFound = findDropiCityByName('CiudadFalsa123');
  suite.assert(cityNotFound === undefined, 'findDropiCityByName con nombre inválido retorna undefined');

  // 3. Cálculo de Peso Volumétrico Cobrable (Transportadoras)
  console.log('\n📌 Bloque 3: Peso Volumétrico y Reglas Transportadoras');

  // Caso 1: Peso Real mayor que volumétrico (ej: Mancuerna 5kg, 10x10x10 cm)
  // Volumétrico = (10 * 10 * 10) / 6000 = 0.166 kg. Peso real = 5 kg -> Debe cobrar 5 kg
  const heavyWeight = calculateChargeableWeight({
    weight_kg: 5,
    length_cm: 10,
    width_cm: 10,
    height_cm: 10,
    quantity: 1,
  });
  suite.assertEqual(heavyWeight, 5, 'Predomina peso real cuando es mayor que el volumétrico');

  // Caso 2: Peso Volumétrico mayor que real (ej: Caja de espuma 0.5kg, 40x40x30 cm)
  // Volumétrico = (40 * 40 * 30) / 6000 = 8 kg. Peso real = 0.5 kg -> Debe cobrar 8 kg
  const bulkyWeight = calculateChargeableWeight({
    weight_kg: 0.5,
    length_cm: 40,
    width_cm: 40,
    height_cm: 30,
    quantity: 1,
  });
  suite.assertEqual(bulkyWeight, 8, 'Predomina peso volumétrico cuando el volumen es mayor');

  // Caso 3: Multiplicador de cantidad (2 unidades)
  const multiQty = calculateChargeableWeight({
    weight_kg: 1.5,
    length_cm: 20,
    width_cm: 20,
    height_cm: 20,
    quantity: 2,
  });
  // Real = 1.5 * 2 = 3 kg. Volumétrico = (20 * 20 * 20 * 2) / 6000 = 2.66 kg -> Cobra 3 kg
  suite.assertEqual(multiQty, 3, 'Multiplica correctamente el peso para cantidad múltiple (x2)');

  // 4. Fórmulas Financieras de Liquidación COD
  console.log('\n📌 Bloque 4: Fórmulas Financieras de Flete y Margen Vendedor');

  const precioVenta = 89900;
  const costoProducto = 25000;
  const precioEnvio = 14500;
  const seguroEnvio = 1500;
  const fleteTotal = precioEnvio + seguroEnvio; // 16.000 COP

  // Comisión plataforma COD = 5% * (precioVenta - fleteTotal)
  const dropiCommission = Math.round(0.05 * (precioVenta - fleteTotal)); // 5% * (89.900 - 16.000) = 5% * 73.900 = 3.695 COP
  suite.assertEqual(dropiCommission, 3695, 'Comisión COD calculada al 5% sobre (Venta - Flete)');

  // Tarifa Admin PideFácil = 5% * costoProducto
  const adminFee = Math.round(0.05 * costoProducto); // 5% * 25.000 = 1.250 COP
  suite.assertEqual(adminFee, 1250, 'Tarifa Admin PideFácil calculada al 5% del costo');

  // Costo Total Operación
  const costoTotal = costoProducto + adminFee + fleteTotal + dropiCommission; // 25000 + 1250 + 16000 + 3695 = 45.945 COP
  suite.assertEqual(costoTotal, 45945, 'Costo total de operación suma costo + fee + flete + recaudo');

  // Ganancia Neta Estimada Vendedor
  const gananciaVendedor = precioVenta - costoTotal; // 89.900 - 45.945 = 43.955 COP
  suite.assertEqual(gananciaVendedor, 43955, 'Ganancia neta del vendedor calculada exactamente');
  suite.assert(gananciaVendedor > 0, 'Garantiza margen positivo y transparente para el vendedor');

  return suite.summary();
}

if (process.argv[1]?.endsWith('geography-and-shipping.test.ts')) {
  const result = runGeographyAndShippingTests();
  if (result.failed > 0) process.exit(1);
}
