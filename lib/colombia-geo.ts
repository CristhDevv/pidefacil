/**
 * ==============================================================================
 * PideFácil - Directorio Geográfico de Colombia (DANE / Ciudades Principales)
 * ==============================================================================
 * Optimizado para Checkout COD Mobile: Menú desplegable anidado con búsqueda rápida.
 */

export interface DepartmentData {
  name: string;
  cities: string[];
}

export const COLOMBIA_GEO: DepartmentData[] = [
  {
    name: 'Bogotá D.C.',
    cities: ['Bogotá D.C.'],
  },
  {
    name: 'Antioquia',
    cities: [
      'Medellín',
      'Bello',
      'Itagüí',
      'Envigado',
      'Apartadó',
      'Rionegro',
      'Sabaneta',
      'Copacabana',
      'La Estrella',
      'Caucasia',
      'Turbo',
      'Marinilla',
      'Caldas',
      'Girardota',
      'Guarne',
    ],
  },
  {
    name: 'Valle del Cauca',
    cities: [
      'Cali',
      'Palmira',
      'Buenaventura',
      'Tuluá',
      'Cartago',
      'Buga (Guadalajara de Buga)',
      'Jamundí',
      'Yumbo',
      'Candelaria',
      'Pradera',
      'Florida',
    ],
  },
  {
    name: 'Atlántico',
    cities: [
      'Barranquilla',
      'Soledad',
      'Malambo',
      'Sabanalarga',
      'Baranoa',
      'Galapa',
      'Puerto Colombia',
    ],
  },
  {
    name: 'Santander',
    cities: [
      'Bucaramanga',
      'Floridablanca',
      'Girón',
      'Piedecuesta',
      'Barrancabermeja',
      'San Gil',
      'Socorro',
    ],
  },
  {
    name: 'Cundinamarca',
    cities: [
      'Soacha',
      'Facatativá',
      'Chía',
      'Zipaquirá',
      'Fusagasugá',
      'Mosquera',
      'Madrid',
      'Funza',
      'Cajicá',
      'Girardot',
      'Cota',
      'Tocancipá',
      'Sopó',
      'La Calera',
    ],
  },
  {
    name: 'Bolívar',
    cities: [
      'Cartagena de Indias',
      'Magangué',
      'Turbaco',
      'Arjona',
      'El Carmen de Bolívar',
    ],
  },
  {
    name: 'Norte de Santander',
    cities: [
      'Cúcuta',
      'Villa del Rosario',
      'Los Patios',
      'Ocaña',
      'Pamplona',
    ],
  },
  {
    name: 'Risaralda',
    cities: [
      'Pereira',
      'Dosquebradas',
      'Santa Rosa de Cabal',
      'La Virginia',
    ],
  },
  {
    name: 'Caldas',
    cities: [
      'Manizales',
      'Villamaría',
      'Chinchiná',
      'La Dorada',
      'Riosucio',
    ],
  },
  {
    name: 'Quindío',
    cities: [
      'Armenia',
      'Calarcá',
      'La Tebaida',
      'Montenegro',
      'Quimbaya',
    ],
  },
  {
    name: 'Tolima',
    cities: [
      'Ibagué',
      'Espinal',
      'Melgar',
      'Chaparral',
      'Mariquita',
      'Líbano',
    ],
  },
  {
    name: 'Meta',
    cities: [
      'Villavicencio',
      'Acacías',
      'Granada',
      'Puerto López',
      'Cumaral',
    ],
  },
  {
    name: 'Nariño',
    cities: [
      'Pasto',
      'Tumaco',
      'Ipiales',
      'Túquerres',
      'La Unión',
    ],
  },
  {
    name: 'Córdoba',
    cities: [
      'Montería',
      'Cereté',
      'Lorica',
      'Sahagún',
      'Montelíbano',
      'Planeta Rica',
    ],
  },
  {
    name: 'Huila',
    cities: [
      'Neiva',
      'Pitalito',
      'Garzón',
      'La Plata',
      'Campoalegre',
    ],
  },
  {
    name: 'Cesar',
    cities: [
      'Valledupar',
      'Aguachica',
      'Agustín Codazzi',
      'Bosconia',
    ],
  },
  {
    name: 'Magdalena',
    cities: [
      'Santa Marta',
      'Ciénaga',
      'Fundación',
      'El Banco',
      'Plato',
    ],
  },
  {
    name: 'Boyacá',
    cities: [
      'Tunja',
      'Sogamoso',
      'Duitama',
      'Chiquinquirá',
      'Puerto Boyacá',
      'Paipa',
    ],
  },
  {
    name: 'Cauca',
    cities: [
      'Popayán',
      'Santander de Quilichao',
      'Puerto Tejada',
      'Patía',
    ],
  },
  {
    name: 'Sucre',
    cities: [
      'Sincelejo',
      'Corozal',
      'San Marcos',
      'Sampués',
      'Tolú',
    ],
  },
  {
    name: 'La Guajira',
    cities: [
      'Riohacha',
      'Maicao',
      'Uribia',
      'Fonseca',
      'San Juan del Cesar',
    ],
  },
  {
    name: 'Casanare',
    cities: [
      'Yopal',
      'Aguazul',
      'Villanueva',
      'Tauramena',
      'Paz de Ariporo',
    ],
  },
  {
    name: 'Chocó',
    cities: [
      'Quibdó',
      'Istmina',
      'Tadó',
    ],
  },
  {
    name: 'Caquetá',
    cities: [
      'Florencia',
      'San Vicente del Caguán',
    ],
  },
  {
    name: 'Putumayo',
    cities: [
      'Mocoa',
      'Puerto Asís',
      'Orito',
    ],
  },
  {
    name: 'Arauca',
    cities: [
      'Arauca',
      'Tame',
      'Saravena',
    ],
  },
  {
    name: 'San Andrés y Providencia',
    cities: [
      'San Andrés',
    ],
  },
  {
    name: 'Amazonas',
    cities: [
      'Leticia',
    ],
  },
  {
    name: 'Guaviare',
    cities: [
      'San José del Guaviare',
    ],
  },
];
