/**
 * ==============================================================================
 * PideFácil - Directorio Geográfico Oficial de Dropi Colombia
 * ==============================================================================
 * Mapeo oficial de Departamentos y Ciudades con sus IDs Dropi para /bff/orders/quote.
 * Permite selección anidada Departamento -> Ciudad y búsqueda instantánea.
 */

export interface DropiCity {
  id: number;
  name: string;
  department_name: string;
}

export interface DropiDepartment {
  name: string;
  cities: DropiCity[];
}

export const DROPI_COLOMBIA_GEO: DropiDepartment[] = [
  {
    name: 'BOGOTA D.C.',
    cities: [
      { id: 1, name: 'BOGOTA, D.C.', department_name: 'BOGOTA D.C.' },
    ],
  },
  {
    name: 'ANTIOQUIA',
    cities: [
      { id: 2, name: 'MEDELLIN', department_name: 'ANTIOQUIA' },
      { id: 3, name: 'BELLO', department_name: 'ANTIOQUIA' },
      { id: 4, name: 'ITAGUI', department_name: 'ANTIOQUIA' },
      { id: 5, name: 'ENVIGADO', department_name: 'ANTIOQUIA' },
      { id: 6, name: 'SABANETA', department_name: 'ANTIOQUIA' },
      { id: 7, name: 'RIONEGRO', department_name: 'ANTIOQUIA' },
      { id: 8, name: 'APARTADO', department_name: 'ANTIOQUIA' },
      { id: 9, name: 'COPACABANA', department_name: 'ANTIOQUIA' },
      { id: 10, name: 'LA ESTRELLA', department_name: 'ANTIOQUIA' },
      { id: 11, name: 'CALDAS', department_name: 'ANTIOQUIA' },
      { id: 12, name: 'GIRARDOTA', department_name: 'ANTIOQUIA' },
      { id: 13, name: 'MARINILLA', department_name: 'ANTIOQUIA' },
      { id: 14, name: 'CAUCASIA', department_name: 'ANTIOQUIA' },
      { id: 15, name: 'TURBO', department_name: 'ANTIOQUIA' },
      { id: 16, name: 'GUARNE', department_name: 'ANTIOQUIA' },
    ],
  },
  {
    name: 'VALLE DEL CAUCA',
    cities: [
      { id: 17, name: 'CALI', department_name: 'VALLE DEL CAUCA' },
      { id: 18, name: 'PALMIRA', department_name: 'VALLE DEL CAUCA' },
      { id: 19, name: 'BUENAVENTURA', department_name: 'VALLE DEL CAUCA' },
      { id: 20, name: 'TULUA', department_name: 'VALLE DEL CAUCA' },
      { id: 21, name: 'CARTAGO', department_name: 'VALLE DEL CAUCA' },
      { id: 22, name: 'BUGA', department_name: 'VALLE DEL CAUCA' },
      { id: 23, name: 'JAMUNDI', department_name: 'VALLE DEL CAUCA' },
      { id: 24, name: 'YUMBO', department_name: 'VALLE DEL CAUCA' },
      { id: 25, name: 'CANDELARIA', department_name: 'VALLE DEL CAUCA' },
    ],
  },
  {
    name: 'ATLANTICO',
    cities: [
      { id: 26, name: 'BARRANQUILLA', department_name: 'ATLANTICO' },
      { id: 27, name: 'SOLEDAD', department_name: 'ATLANTICO' },
      { id: 28, name: 'MALAMBO', department_name: 'ATLANTICO' },
      { id: 29, name: 'SABANALARGA', department_name: 'ATLANTICO' },
      { id: 30, name: 'PUERTO COLOMBIA', department_name: 'ATLANTICO' },
    ],
  },
  {
    name: 'SANTANDER',
    cities: [
      { id: 31, name: 'BUCARAMANGA', department_name: 'SANTANDER' },
      { id: 32, name: 'FLORIDABLANCA', department_name: 'SANTANDER' },
      { id: 33, name: 'GIRON', department_name: 'SANTANDER' },
      { id: 34, name: 'PIEDECUESTA', department_name: 'SANTANDER' },
      { id: 35, name: 'BARRANCABERMEJA', department_name: 'SANTANDER' },
      { id: 36, name: 'SAN GIL', department_name: 'SANTANDER' },
    ],
  },
  {
    name: 'CUNDINAMARCA',
    cities: [
      { id: 37, name: 'SOACHA', department_name: 'CUNDINAMARCA' },
      { id: 38, name: 'CHIA', department_name: 'CUNDINAMARCA' },
      { id: 39, name: 'ZIPAQUIRA', department_name: 'CUNDINAMARCA' },
      { id: 40, name: 'FACATATIVA', department_name: 'CUNDINAMARCA' },
      { id: 41, name: 'MOSQUERA', department_name: 'CUNDINAMARCA' },
      { id: 42, name: 'MADRID', department_name: 'CUNDINAMARCA' },
      { id: 43, name: 'FUNZA', department_name: 'CUNDINAMARCA' },
      { id: 44, name: 'FUSAGASUGA', department_name: 'CUNDINAMARCA' },
      { id: 45, name: 'GIRARDOT', department_name: 'CUNDINAMARCA' },
      { id: 46, name: 'CAJICA', department_name: 'CUNDINAMARCA' },
    ],
  },
  {
    name: 'BOLIVAR',
    cities: [
      { id: 47, name: 'CARTAGENA', department_name: 'BOLIVAR' },
      { id: 48, name: 'MAGANGUE', department_name: 'BOLIVAR' },
      { id: 49, name: 'TURBACO', department_name: 'BOLIVAR' },
      { id: 50, name: 'ARJONA', department_name: 'BOLIVAR' },
    ],
  },
  {
    name: 'RISARALDA',
    cities: [
      { id: 51, name: 'PEREIRA', department_name: 'RISARALDA' },
      { id: 52, name: 'DOSQUEBRADAS', department_name: 'RISARALDA' },
      { id: 53, name: 'SANTA ROSA DE CABAL', department_name: 'RISARALDA' },
    ],
  },
  {
    name: 'CALDAS',
    cities: [
      { id: 54, name: 'MANIZALES', department_name: 'CALDAS' },
      { id: 55, name: 'VILLAMARIA', department_name: 'CALDAS' },
      { id: 56, name: 'CHINCHINA', department_name: 'CALDAS' },
      { id: 57, name: 'LA DORADA', department_name: 'CALDAS' },
    ],
  },
  {
    name: 'QUINDIO',
    cities: [
      { id: 58, name: 'ARMENIA', department_name: 'QUINDIO' },
      { id: 59, name: 'CALARCA', department_name: 'QUINDIO' },
      { id: 60, name: 'MONTENEGRO', department_name: 'QUINDIO' },
      { id: 61, name: 'QUIMBAYA', department_name: 'QUINDIO' },
    ],
  },
  {
    name: 'TOLIMA',
    cities: [
      { id: 62, name: 'IBAGUE', department_name: 'TOLIMA' },
      { id: 63, name: 'ESPINAL', department_name: 'TOLIMA' },
      { id: 64, name: 'MELGAR', department_name: 'TOLIMA' },
      { id: 65, name: 'CHAPARRAL', department_name: 'TOLIMA' },
    ],
  },
  {
    name: 'HUILA',
    cities: [
      { id: 66, name: 'NEIVA', department_name: 'HUILA' },
      { id: 67, name: 'PITALITO', department_name: 'HUILA' },
      { id: 68, name: 'GARZON', department_name: 'HUILA' },
      { id: 69, name: 'LA PLATA', department_name: 'HUILA' },
    ],
  },
  {
    name: 'META',
    cities: [
      { id: 70, name: 'VILLAVICENCIO', department_name: 'META' },
      { id: 71, name: 'ACACIAS', department_name: 'META' },
      { id: 72, name: 'GRANADA', department_name: 'META' },
    ],
  },
  {
    name: 'NORTE DE SANTANDER',
    cities: [
      { id: 73, name: 'CUCUTA', department_name: 'NORTE DE SANTANDER' },
      { id: 74, name: 'LOS PATIOS', department_name: 'NORTE DE SANTANDER' },
      { id: 75, name: 'VILLA DEL ROSARIO', department_name: 'NORTE DE SANTANDER' },
      { id: 76, name: 'OCAÑA', department_name: 'NORTE DE SANTANDER' },
      { id: 77, name: 'PAMPLONA', department_name: 'NORTE DE SANTANDER' },
    ],
  },
  {
    name: 'CORDOBA',
    cities: [
      { id: 78, name: 'MONTERIA', department_name: 'CORDOBA' },
      { id: 79, name: 'CERETE', department_name: 'CORDOBA' },
      { id: 80, name: 'SAHAGUN', department_name: 'CORDOBA' },
      { id: 81, name: 'LORICA', department_name: 'CORDOBA' },
    ],
  },
  {
    name: 'CESAR',
    cities: [
      { id: 82, name: 'VALLEDUPAR', department_name: 'CESAR' },
      { id: 83, name: 'AGUACHICA', department_name: 'CESAR' },
      { id: 84, name: 'AGUSTIN CODAZZI', department_name: 'CESAR' },
    ],
  },
  {
    name: 'MAGDALENA',
    cities: [
      { id: 85, name: 'SANTA MARTA', department_name: 'MAGDALENA' },
      { id: 86, name: 'CIENAGA', department_name: 'MAGDALENA' },
      { id: 87, name: 'FUNDACION', department_name: 'MAGDALENA' },
    ],
  },
  {
    name: 'NARINO',
    cities: [
      { id: 88, name: 'PASTO', department_name: 'NARINO' },
      { id: 89, name: 'IPIALES', department_name: 'NARINO' },
      { id: 90, name: 'TUMACO', department_name: 'NARINO' },
    ],
  },
  {
    name: 'CAUCA',
    cities: [
      { id: 91, name: 'POPAYAN', department_name: 'CAUCA' },
      { id: 92, name: 'SANTANDER DE QUILICHAO', department_name: 'CAUCA' },
      { id: 93, name: 'PUERTO TEJADA', department_name: 'CAUCA' },
    ],
  },
  {
    name: 'BOYACA',
    cities: [
      { id: 94, name: 'TUNJA', department_name: 'BOYACA' },
      { id: 95, name: 'SOGAMOSO', department_name: 'BOYACA' },
      { id: 96, name: 'DUITAMA', department_name: 'BOYACA' },
      { id: 97, name: 'CHIQUINQUIRA', department_name: 'BOYACA' },
    ],
  },
  {
    name: 'SUCRE',
    cities: [
      { id: 98, name: 'SINCELEJO', department_name: 'SUCRE' },
      { id: 99, name: 'COROZAL', department_name: 'SUCRE' },
    ],
  },
  {
    name: 'LA GUAJIRA',
    cities: [
      { id: 100, name: 'RIOHACHA', department_name: 'LA GUAJIRA' },
      { id: 101, name: 'MAICAO', department_name: 'LA GUAJIRA' },
    ],
  },
  {
    name: 'CASANARE',
    cities: [
      { id: 102, name: 'YOPAL', department_name: 'CASANARE' },
      { id: 103, name: 'AGUAZUL', department_name: 'CASANARE' },
    ],
  },
  {
    name: 'CHOCO',
    cities: [
      { id: 104, name: 'QUIBDO', department_name: 'CHOCO' },
    ],
  },
  {
    name: 'CAQUETA',
    cities: [
      { id: 105, name: 'FLORENCIA', department_name: 'CAQUETA' },
    ],
  },
  {
    name: 'PUTUMAYO',
    cities: [
      { id: 106, name: 'MOCOA', department_name: 'PUTUMAYO' },
      { id: 107, name: 'PUERTO ASIS', department_name: 'PUTUMAYO' },
    ],
  },
  {
    name: 'ARAUCA',
    cities: [
      { id: 108, name: 'ARAUCA', department_name: 'ARAUCA' },
      { id: 109, name: 'SARAVENA', department_name: 'ARAUCA' },
    ],
  },
  {
    name: 'SAN ANDRES',
    cities: [
      { id: 110, name: 'SAN ANDRES', department_name: 'SAN ANDRES' },
    ],
  },
  {
    name: 'AMAZONAS',
    cities: [
      { id: 111, name: 'LETICIA', department_name: 'AMAZONAS' },
    ],
  },
  {
    name: 'GUAVIARE',
    cities: [
      { id: 112, name: 'SAN JOSE DEL GUAVIARE', department_name: 'GUAVIARE' },
    ],
  },
  {
    name: 'VICHADA',
    cities: [
      { id: 113, name: 'PUERTO CARREÑO', department_name: 'VICHADA' },
    ],
  },
  {
    name: 'GUAINIA',
    cities: [
      { id: 114, name: 'INIRIDA', department_name: 'GUAINIA' },
    ],
  },
  {
    name: 'VAUPES',
    cities: [
      { id: 115, name: 'MITU', department_name: 'VAUPES' },
    ],
  },
];

export function getDropiDepartments(): string[] {
  return DROPI_COLOMBIA_GEO.map((d) => d.name);
}

export function getDropiCitiesByDepartment(departmentName: string): DropiCity[] {
  const dept = DROPI_COLOMBIA_GEO.find(
    (d) => d.name.toLowerCase() === departmentName.trim().toLowerCase()
  );
  return dept ? dept.cities : [];
}

export function findDropiCityById(id: number): DropiCity | undefined {
  for (const dept of DROPI_COLOMBIA_GEO) {
    const found = dept.cities.find((c) => c.id === id);
    if (found) return found;
  }
  return undefined;
}

export function findDropiCityByName(name: string): DropiCity | undefined {
  const clean = name.trim().toLowerCase();
  for (const dept of DROPI_COLOMBIA_GEO) {
    const found = dept.cities.find((c) => c.name.toLowerCase() === clean);
    if (found) return found;
  }
  return undefined;
}
