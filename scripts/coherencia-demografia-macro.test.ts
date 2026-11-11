// @vitest-environment node
/**
 * Tests de coherencia de los datos de la Fase 1B-3: demografía (INE, Eurostat), macro y salarios,
 * relación afiliados/pensiones (Alternativa 1) y descargas manuales (MITES, IMSERSO).
 * Incluye sumas de control por tabla y por serie (los valores salen de los ficheros publicados en /data
 * en el momento de la verificación; si un dato cambia, hay que revisar la fuente y actualizar la cifra).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoTabla, RegistroAfirmaciones } from '../src/engine/esquema-datos.ts';
import { celdasCsv } from './lib/validar-datos.ts';

const DATA = path.resolve(import.meta.dirname, '../data');

function leeJson(carpeta: string, nombre: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA, carpeta, `${nombre}.json`), 'utf8')) as unknown;
}
type Fila = Record<string, string>;
function csv(carpeta: string, nombre: string): Fila[] {
  const [cab = '', ...resto] = readFileSync(path.join(DATA, carpeta, `${nombre}.csv`), 'utf8')
    .split('\n')
    .filter((l) => l !== '');
  const columnas = cab.split(',');
  return resto.map((l) => Object.fromEntries(celdasCsv(l).map((v, i) => [columnas[i] ?? '', v])));
}
function serie(carpeta: string, fichero: string, id: string): Map<string, number> {
  const s = ArchivoDatos.parse(leeJson(carpeta, fichero)).series?.find((x) => x.id === id);
  if (!s) throw new Error(`No existe la serie ${id} en ${fichero}`);
  return new Map(s.points.map((p) => [p.period, p.value]));
}
function v(m: Map<string, number>, k: string): number {
  const x = m.get(k);
  if (x === undefined) throw new Error(`Falta ${k}`);
  return x;
}
const cerca = (a: number, b: number, tol = 1e-9) =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// [carpeta, tabla, columna sumada, filas, suma]
const TABLAS: [string, string, string, number, number][] = [
  ['demografia', 'poblacion-edad-sexo', 'poblacion', 16518, 4663924081.0],
  ['demografia', 'mortalidad-ine', 'lx', 14670, 1193897653.3007],
  ['demografia', 'fecundidad-tasas-edad', 'tasa_por_mil', 5250, 139852.72],
  ['demografia', 'migraciones-exterior-edad-sexo', 'personas', 14742, 43922770.0],
  ['demografia', 'proyecciones-poblacion', 'poblacion', 15453, 5450271971.5174],
  ['demografia', 'proyecciones-mortalidad', 'lx', 15150, 1303552721.5369],
  ['demografia', 'proyecciones-fecundidad-edad', 'tasa_por_mil', 1750, 58308.7229],
  ['demografia', 'proyecciones-emigracion-edad', 'personas', 13650, 57193653.9994],
  ['demografia', 'proyecciones-inmigracion-edad', 'personas', 15150, 88106122.0],
  ['demografia', 'eurostat-poblacion-edad-sexo', 'poblacion', 16245, 4572573858.0],
  ['demografia', 'europop2025-poblacion', 'poblacion', 22800, 7886435868.0],
  ['macro', 'epa-trimestral', 'valor', 19202, 18320056.62],
  ['macro', 'epa-anual-media', 'valor', 4621, 4426354.9575],
  ['macro', 'eaes-salario-sexo-edad', 'salario_medio_bruto_anual', 608, 12657728.52],
  ['macro', 'etcl-coste-salarial-trimestral', 'euros_trabajador_mes', 888, 761503.6],
  ['macro', 'base-media-cotizacion-rg-mensual', 'cotizantes', 2346, 4781662002.0],
  ['sistema', 'mites-bel-pensiones', 'numero_miles', 1202, 1284455.37],
  ['sistema', 'mites-bel-pen31-cuantias', 'euros_anio', 720, 6539669.1433],
  ['sistema', 'mites-anuario-pen1-sexo-clase', 'pensiones', 64, 121021641.4167],
  ['sistema', 'imserso-pnc-evolucion', 'pensiones', 57, 17375662.0],
];

// [carpeta, fichero, serie, puntos, primer periodo, último periodo, suma]
const SERIES: [string, string, string, number, string, string, number][] = [
  ['macro', 'pib-ine', 'pib-corriente', 31, '1995', '2025', 31193968],
  ['macro', 'pib-ine', 'pib-volumen-indice-2020', 31, '1995', '2025', 3018.0532],
  ['macro', 'pib-ine', 'pib-volumen-derivado-2020', 31, '1995', '2025', 34080279.1],
  ['macro', 'pib-ine', 'pib-deflactor-derivado-2020', 31, '1995', '2025', 2767.4586],
  ['macro', 'pib-ine', 'pib-per-capita', 31, '1995', '2025', 685446],
  ['macro', 'pib-ine', 'poblacion-media-anual', 31, '1995', '2025', 1388899],
  ['macro', 'cn-remuneracion-empleo', 'remuneracion-asalariados', 31, '1995', '2025', 14813433],
  ['macro', 'cn-remuneracion-empleo', 'asalariados-puestos', 31, '1995', '2025', 502496.1],
  ['macro', 'cn-remuneracion-empleo', 'asalariados-puestos-etc', 31, '1995', '2025', 452661.3],
  ['macro', 'cn-remuneracion-empleo', 'asalariados-personas', 31, '1995', '2025', 492861.7],
  ['macro', 'cn-remuneracion-empleo', 'empleo-puestos', 31, '1995', '2025', 596428.2],
  ['macro', 'salario-medio-definiciones', 'eaes-ambos', 17, '2008', '2024', 412282.55],
  ['macro', 'salario-medio-definiciones', 'eaes-hombres', 17, '2008', '2024', 457261.16],
  ['macro', 'salario-medio-definiciones', 'eaes-mujeres', 17, '2008', '2024', 362696.39],
  [
    'macro',
    'salario-medio-definiciones',
    'etcl-coste-salarial-total',
    18,
    '2008',
    '2025',
    35588.19,
  ],
  [
    'macro',
    'salario-medio-definiciones',
    'etcl-coste-salarial-total-x12',
    18,
    '2008',
    '2025',
    427057.98,
  ],
  [
    'macro',
    'salario-medio-definiciones',
    'cn-remuneracion-por-asalariado-puesto',
    31,
    '1995',
    '2025',
    894006.77,
  ],
  [
    'macro',
    'salario-medio-definiciones',
    'cn-remuneracion-por-asalariado-etc',
    31,
    '1995',
    '2025',
    994888.73,
  ],
  [
    'macro',
    'salario-medio-definiciones',
    'cn-remuneracion-por-asalariado-persona',
    31,
    '1995',
    '2025',
    911179.63,
  ],
  [
    'macro',
    'salario-medio-definiciones',
    'base-media-cotizacion-rg-ambos',
    8,
    '2018',
    '2025',
    16098.43,
  ],
  [
    'macro',
    'salario-medio-definiciones',
    'base-media-cotizacion-rg-hombres',
    8,
    '2018',
    '2025',
    17311.73,
  ],
  [
    'macro',
    'salario-medio-definiciones',
    'base-media-cotizacion-rg-mujeres',
    8,
    '2018',
    '2025',
    14776.87,
  ],
  ['macro', 'salario-medio-razon-base-maxima', 'razon-eaes-ambos', 17, '2008', '2024', 9.2841],
  ['macro', 'salario-medio-razon-base-maxima', 'razon-eaes-hombres', 17, '2008', '2024', 10.3101],
  ['macro', 'salario-medio-razon-base-maxima', 'razon-eaes-mujeres', 17, '2008', '2024', 8.1481],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-etcl-coste-salarial-total',
    18,
    '2008',
    '2025',
    9.4833,
  ],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-etcl-coste-salarial-total-x12',
    18,
    '2008',
    '2025',
    9.4833,
  ],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-cn-remuneracion-por-asalariado-puesto',
    26,
    '2000',
    '2025',
    19.2063,
  ],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-cn-remuneracion-por-asalariado-etc',
    26,
    '2000',
    '2025',
    21.4488,
  ],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-cn-remuneracion-por-asalariado-persona',
    26,
    '2000',
    '2025',
    19.5912,
  ],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-base-media-cotizacion-rg-ambos',
    8,
    '2018',
    '2025',
    3.7643,
  ],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-base-media-cotizacion-rg-hombres',
    8,
    '2018',
    '2025',
    4.0491,
  ],
  [
    'macro',
    'salario-medio-razon-base-maxima',
    'razon-base-media-cotizacion-rg-mujeres',
    8,
    '2018',
    '2025',
    3.4538,
  ],
  ['macro', 'eurostat-pib', 'pib-corriente', 31, '1995', '2025', 31219589.1],
  ['macro', 'eurostat-pib', 'pib-volumen-2020', 31, '1995', '2025', 34080279.0],
  ['macro', 'eurostat-pib', 'pib-deflactor-2020', 31, '1995', '2025', 2770.778],
  [
    'macro',
    'rendimiento-deuda-10-anios',
    'rendimiento-deuda-10-anios',
    48,
    '1978',
    '2025',
    349.4638,
  ],
  [
    'sistema',
    'relacion-afiliados-pensiones-alternativa-1',
    'afiliados-ultimo-dia-diciembre',
    18,
    '2008',
    '2025',
    333589825,
  ],
  [
    'sistema',
    'relacion-afiliados-pensiones-alternativa-1',
    'pensiones-vigor-1-enero-siguiente',
    18,
    '2008',
    '2025',
    170665725.0,
  ],
  [
    'sistema',
    'relacion-afiliados-pensiones-alternativa-1',
    'afiliados-por-pension-alternativa-1',
    18,
    '2008',
    '2025',
    35.166,
  ],
  [
    'sistema',
    'relacion-afiliados-pensiones-alternativa-1',
    'afiliados-por-pensionista-alternativa-1',
    1,
    '2025',
    '2025',
    2.2929,
  ],
  [
    'sistema',
    'relacion-afiliados-pensiones-alternativa-1',
    'pensionistas-enero-2026',
    1,
    '2025',
    '2025',
    9455429,
  ],
  ['demografia', 'esperanza-vida-anual', 'esperanza-vida-0-ambos', 50, '1975', '2024', 3961.9134],
  ['demografia', 'esperanza-vida-anual', 'esperanza-vida-0-hombres', 50, '1975', '2024', 3804.8888],
  ['demografia', 'esperanza-vida-anual', 'esperanza-vida-0-mujeres', 50, '1975', '2024', 4116.4614],
  ['demografia', 'esperanza-vida-anual', 'esperanza-vida-65-ambos', 50, '1975', '2024', 937.2593],
  ['demografia', 'esperanza-vida-anual', 'esperanza-vida-65-hombres', 50, '1975', '2024', 837.5941],
  [
    'demografia',
    'esperanza-vida-anual',
    'esperanza-vida-65-mujeres',
    50,
    '1975',
    '2024',
    1022.5439,
  ],
  ['demografia', 'fecundidad-indicadores', 'icf-ambas', 50, '1975', '2024', 74.56],
  ['demografia', 'fecundidad-indicadores', 'icf-espanola', 23, '2002', '2024', 28.4],
  ['demografia', 'fecundidad-indicadores', 'icf-extranjera', 23, '2002', '2024', 36.89],
  [
    'demografia',
    'fecundidad-indicadores',
    'tasa-global-fecundidad-ambas',
    50,
    '1975',
    '2024',
    2215.31,
  ],
  [
    'demografia',
    'fecundidad-indicadores',
    'tasa-global-fecundidad-espanola',
    23,
    '2002',
    '2024',
    825.24,
  ],
  [
    'demografia',
    'fecundidad-indicadores',
    'tasa-global-fecundidad-extranjera',
    23,
    '2002',
    '2024',
    1200.58,
  ],
  ['demografia', 'fecundidad-indicadores', 'tasa-bruta-natalidad', 50, '1975', '2024', 537.55],
  ['demografia', 'proyecciones-hipotesis', 'icf-proyectado', 50, '2026', '2075', 58.3087],
  [
    'demografia',
    'proyecciones-hipotesis',
    'saldo-migratorio-exterior-por-mil-proyectado',
    50,
    '2026',
    '2075',
    290.9249,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-ambos-total',
    50,
    '2026',
    '2075',
    28596827.0,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-hombres-total',
    50,
    '2026',
    '2075',
    15355256.269,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-mujeres-total',
    50,
    '2026',
    '2075',
    13241570.731,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-ambos-espana',
    50,
    '2026',
    '2075',
    5764999.0,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-hombres-espana',
    50,
    '2026',
    '2075',
    3219135.0866,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-mujeres-espana',
    50,
    '2026',
    '2075',
    2545863.9134,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-ambos-extranjero',
    50,
    '2026',
    '2075',
    22831828.0,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-hombres-extranjero',
    50,
    '2026',
    '2075',
    12136121.1824,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'emigracion-proyectada-mujeres-extranjero',
    50,
    '2026',
    '2075',
    10695706.8176,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-ambos-total',
    50,
    '2026',
    '2075',
    44053061.0,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-hombres-total',
    50,
    '2026',
    '2075',
    22801278.8386,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-mujeres-total',
    50,
    '2026',
    '2075',
    21251782.1614,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-ambos-espana',
    50,
    '2026',
    '2075',
    4247081.0,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-hombres-espana',
    50,
    '2026',
    '2075',
    2358280.914,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-mujeres-espana',
    50,
    '2026',
    '2075',
    1888800.086,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-ambos-extranjero',
    50,
    '2026',
    '2075',
    39805980.0,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-hombres-extranjero',
    50,
    '2026',
    '2075',
    20442997.9247,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'inmigracion-proyectada-mujeres-extranjero',
    50,
    '2026',
    '2075',
    19362982.0753,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'esperanza-vida-0-ambos-proyectada',
    50,
    '2026',
    '2075',
    4331.8602,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'esperanza-vida-0-hombres-proyectada',
    50,
    '2026',
    '2075',
    4231.3745,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'esperanza-vida-0-mujeres-proyectada',
    50,
    '2026',
    '2075',
    4427.4458,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'esperanza-vida-65-ambos-proyectada',
    50,
    '2026',
    '2075',
    1180.7382,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'esperanza-vida-65-hombres-proyectada',
    50,
    '2026',
    '2075',
    1096.5506,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'esperanza-vida-65-mujeres-proyectada',
    50,
    '2026',
    '2075',
    1257.2788,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'tasa-dependencia-proyectada',
    51,
    '2026',
    '2076',
    3393.8436,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'tasa-dependencia-menores-16-proyectada',
    51,
    '2026',
    '2076',
    999.7146,
  ],
  [
    'demografia',
    'proyecciones-hipotesis',
    'tasa-dependencia-mayores-64-proyectada',
    51,
    '2026',
    '2076',
    2394.1291,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'inmigracion-ambos-em-2008-2021',
    14,
    '2008',
    '2021',
    6294281.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'inmigracion-hombres-em-2008-2021',
    14,
    '2008',
    '2021',
    3139988.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'inmigracion-mujeres-em-2008-2021',
    14,
    '2008',
    '2021',
    3154285.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'emigracion-ambos-em-2008-2021',
    14,
    '2008',
    '2021',
    5135493.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'emigracion-hombres-em-2008-2021',
    14,
    '2008',
    '2021',
    2894322.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'emigracion-mujeres-em-2008-2021',
    14,
    '2008',
    '2021',
    2241173.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-ambos-em-2008-2021',
    14,
    '2008',
    '2021',
    1158798.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-hombres-em-2008-2021',
    14,
    '2008',
    '2021',
    245683.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-mujeres-em-2008-2021',
    14,
    '2008',
    '2021',
    913119.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'inmigracion-ambos-emcr-2021-2024',
    4,
    '2021',
    '2024',
    4686407.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'inmigracion-hombres-emcr-2021-2024',
    4,
    '2021',
    '2024',
    2417569.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'inmigracion-mujeres-emcr-2021-2024',
    4,
    '2021',
    '2024',
    2268838.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'emigracion-ambos-emcr-2021-2024',
    4,
    '2021',
    '2024',
    2499744.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'emigracion-hombres-emcr-2021-2024',
    4,
    '2021',
    '2024',
    1339794.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'emigracion-mujeres-emcr-2021-2024',
    4,
    '2021',
    '2024',
    1159950.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-derivado-ambos-emcr-2021-2024',
    4,
    '2021',
    '2024',
    2186663.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-derivado-hombres-emcr-2021-2024',
    4,
    '2021',
    '2024',
    1077775.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-derivado-mujeres-emcr-2021-2024',
    4,
    '2021',
    '2024',
    1108888.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-ambos-publicado-emcr',
    4,
    '2021',
    '2024',
    2186663.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-hombres-publicado-emcr',
    4,
    '2021',
    '2024',
    1077775.0,
  ],
  [
    'demografia',
    'migraciones-exterior-anual',
    'saldo-exterior-mujeres-publicado-emcr',
    4,
    '2021',
    '2024',
    1108888.0,
  ],
  [
    'demografia',
    'eurostat-poblacion-total',
    'poblacion-total-ambos',
    66,
    '1960',
    '2025',
    2632921160,
  ],
  [
    'demografia',
    'eurostat-poblacion-total',
    'poblacion-total-hombres',
    66,
    '1960',
    '2025',
    1291691776,
  ],
  [
    'demografia',
    'eurostat-poblacion-total',
    'poblacion-total-mujeres',
    66,
    '1960',
    '2025',
    1341229384,
  ],
];

describe('tablas 1B-3: cabecera, filas y suma de control', () => {
  for (const [carpeta, nombre, columna, filas, suma] of TABLAS) {
    it(`${carpeta}/${nombre}`, () => {
      const t = ArchivoTabla.parse(leeJson(carpeta, nombre));
      const f = csv(carpeta, nombre);
      expect(t.filas).toBe(f.length);
      expect(f.length).toBe(filas);
      expect(Object.keys(f[0] ?? {})).toEqual(t.columnas.map((c) => c.id));
      const s = f.reduce((a, r) => a + (r[columna] === '' ? 0 : Number(r[columna])), 0);
      expect(cerca(s, suma)).toBe(true);
    });
  }
});

describe('series 1B-3: puntos, rango y suma de control', () => {
  for (const [carpeta, fichero, id, n, primero, ultimo, suma] of SERIES) {
    it(`${carpeta}/${fichero}#${id}`, () => {
      const m = serie(carpeta, fichero, id);
      const periodos = [...m.keys()].sort();
      expect(m.size).toBe(n);
      expect(periodos[0]).toBe(primero);
      expect(periodos[periodos.length - 1]).toBe(ultimo);
      const s = [...m.values()].reduce((a, x) => a + x, 0);
      expect(Math.abs(s - suma)).toBeLessThan(0.01);
    });
  }
});

describe('población (A1) y proyecciones (A5)', () => {
  const pob = csv('demografia', 'poblacion-edad-sexo');
  it('cada año tiene todas las edades, el tramo abierto correcto y hombres + mujeres ≈ ambos', () => {
    const por = new Map<string, number>();
    for (const f of pob) {
      const k = `${f['anio']}|${f['sexo']}`;
      por.set(k, (por.get(k) ?? 0) + Number(f['poblacion']));
    }
    for (let a = 1971; a <= 2026; a++) {
      const filas = pob.filter((f) => f['anio'] === String(a) && f['sexo'] === 'ambos');
      expect(filas.length).toBe(a <= 1980 ? 86 : 101);
      const abierto = filas.filter((f) => f['tramo_abierto'] === '1');
      expect(abierto.map((f) => f['edad'])).toEqual([a <= 1980 ? '85' : '100']);
      const dif =
        (por.get(`${a}|hombres`) ?? 0) +
        (por.get(`${a}|mujeres`) ?? 0) -
        (por.get(`${a}|ambos`) ?? 0);
      expect(Math.abs(dif)).toBeLessThanOrEqual(15);
    }
  });
  it('población total de 2025: Eurostat e INE coinciden salvo diferencias de unidades', () => {
    const suma = (filas: Fila[]) =>
      filas
        .filter((f) => f['anio'] === '2025' && f['sexo'] === 'ambos')
        .reduce((a, f) => a + Number(f['poblacion']), 0);
    const ine = suma(pob);
    const eu = suma(csv('demografia', 'eurostat-poblacion-edad-sexo'));
    expect(Math.abs(ine - eu)).toBeLessThan(500);
    expect(ine).toBeGreaterThan(48_000_000);
  });
  it('la proyección parte de la ECP de 2026 con una diferencia inferior al 0,02 %', () => {
    const suma = (filas: Fila[]) =>
      filas
        .filter((f) => f['anio'] === '2026' && f['sexo'] === 'ambos')
        .reduce((a, f) => a + Number(f['poblacion']), 0);
    const ine = suma(pob);
    const pr = suma(csv('demografia', 'proyecciones-poblacion'));
    expect(Math.abs(ine - pr) / ine).toBeLessThan(0.0002);
  });
  it('la proyección cubre 2026-2076, 101 edades y 3 sexos por año', () => {
    const pr = csv('demografia', 'proyecciones-poblacion');
    expect(pr.length).toBe(51 * 3 * 101);
    expect(new Set(pr.map((f) => f['anio'])).size).toBe(51);
  });
});

describe('mortalidad (A2): funciones de la tabla coherentes entre sí', () => {
  for (const nombre of ['mortalidad-ine', 'proyecciones-mortalidad']) {
    it(`${nombre}: lx(0) = 100.000, l(x+1) = lx (1 − qx), dx = lx − l(x+1) y ex = Tx/lx`, () => {
      const por = new Map<string, Fila[]>();
      for (const f of csv('demografia', nombre)) {
        const k = `${f['anio']}|${f['sexo']}`;
        por.set(k, [...(por.get(k) ?? []), f]);
      }
      let n = 0;
      for (const filas of por.values()) {
        filas.sort((a, b) => Number(a['edad']) - Number(b['edad']));
        expect(Number(filas[0]?.['lx'])).toBeCloseTo(100000, 6);
        for (let i = 0; i < filas.length - 1; i++) {
          const f = filas[i];
          const g = filas[i + 1];
          if (!f || !g) continue;
          const l = Number(f['lx']);
          const l1 = Number(g['lx']);
          expect(Math.abs(l * (1 - Number(f['qx_por_mil']) / 1000) - l1)).toBeLessThan(1.5);
          expect(Math.abs(l - l1 - Number(f['dx']))).toBeLessThan(1.5);
          n++;
        }
        for (const f of filas) {
          const l = Number(f['lx']);
          if (l > 0 && f['ex'] !== '')
            expect(Math.abs(Number(f['tiempo_por_vivir']) / l - Number(f['ex']))).toBeLessThan(
              0.01,
            );
        }
      }
      expect(n).toBeGreaterThan(10000);
    });
  }
  it('esperanza de vida a los 65 años de 2024 (mujeres mayor que hombres) y al nacer entre 80 y 90', () => {
    expect(
      v(serie('demografia', 'esperanza-vida-anual', 'esperanza-vida-65-mujeres'), '2024'),
    ).toBeGreaterThan(
      v(serie('demografia', 'esperanza-vida-anual', 'esperanza-vida-65-hombres'), '2024'),
    );
    const e0 = v(serie('demografia', 'esperanza-vida-anual', 'esperanza-vida-0-ambos'), '2024');
    expect(e0).toBeGreaterThan(80);
    expect(e0).toBeLessThan(90);
  });
});

describe('fecundidad (A3) y migraciones (A4)', () => {
  it('el ICF es la suma de las tasas por edad (ambas nacionalidades), con diferencia < 0,01', () => {
    const suma = new Map<string, number>();
    for (const f of csv('demografia', 'fecundidad-tasas-edad'))
      if (f['nacionalidad'] === 'ambas')
        suma.set(
          f['anio'] ?? '',
          (suma.get(f['anio'] ?? '') ?? 0) + Number(f['tasa_por_mil']) / 1000,
        );
    const icf = serie('demografia', 'fecundidad-indicadores', 'icf-ambas');
    expect(suma.size).toBe(50);
    for (const [a, s] of suma) expect(Math.abs(s - v(icf, a))).toBeLessThan(0.01);
  });
  it('EM 2008-2021: inmigración − emigración = saldo exterior (tolerancia 10 personas por año)', () => {
    const tot = new Map<string, number>();
    for (const f of csv('demografia', 'migraciones-exterior-edad-sexo'))
      if (f['serie'] === 'EM-2008-2021' && f['sexo'] === 'ambos')
        tot.set(
          `${f['flujo']}|${f['anio']}`,
          (tot.get(`${f['flujo']}|${f['anio']}`) ?? 0) + Number(f['personas']),
        );
    for (let a = 2008; a <= 2021; a++)
      expect(
        Math.abs(
          v(tot, `inmigracion|${a}`) - v(tot, `emigracion|${a}`) - v(tot, `saldo-exterior|${a}`),
        ),
      ).toBeLessThanOrEqual(10);
  });
  it('EMCR 2021-2024: el saldo derivado coincide con el saldo exterior publicado', () => {
    const pub = serie(
      'demografia',
      'migraciones-exterior-anual',
      'saldo-exterior-ambos-publicado-emcr',
    );
    const tot = new Map<string, number>();
    for (const f of csv('demografia', 'migraciones-exterior-edad-sexo'))
      if (
        f['serie'] === 'EMCR-2021-2024' &&
        f['sexo'] === 'ambos' &&
        f['flujo'] === 'saldo-exterior-derivado'
      )
        tot.set(f['anio'] ?? '', (tot.get(f['anio'] ?? '') ?? 0) + Number(f['personas']));
    for (const [a, x] of pub) expect(Math.abs(x - v(tot, a))).toBeLessThan(1);
  });
});

describe('macro (B1, B2) y salarios (B3)', () => {
  it('PIB: el INE y Eurostat coinciden al euro desde 1999 y el deflactor es corriente / volumen', () => {
    const ine = serie('macro', 'pib-ine', 'pib-corriente');
    const eu = serie('macro', 'eurostat-pib', 'pib-corriente');
    for (let a = 1999; a <= 2025; a++)
      expect(Math.abs(v(ine, String(a)) - v(eu, String(a)))).toBeLessThan(0.5);
    const vol = serie('macro', 'pib-ine', 'pib-volumen-derivado-2020');
    const def = serie('macro', 'pib-ine', 'pib-deflactor-derivado-2020');
    for (const [a, c] of ine)
      expect(Math.abs((100 * c) / v(vol, a) - v(def, a))).toBeLessThan(1e-3);
    expect(v(def, '2020')).toBeCloseTo(100, 3);
  });
  it('EPA: activos = ocupados + parados en todos los trimestres (tolerancia del redondeo del INE)', () => {
    const m = new Map<string, number>();
    for (const f of csv('macro', 'epa-trimestral'))
      m.set(`${f['periodo']}|${f['magnitud']}|${f['sexo']}|${f['grupo_edad']}`, Number(f['valor']));
    let n = 0;
    for (const [k, x] of m) {
      if (!k.includes('|activos|')) continue;
      const o = m.get(k.replace('|activos|', '|ocupados|'));
      const p = m.get(k.replace('|activos|', '|parados|'));
      if (o === undefined || p === undefined) continue;
      expect(Math.abs(x - o - p)).toBeLessThan(0.31);
      n++;
    }
    expect(n).toBeGreaterThan(2000);
  });
  it('EPA anual: media de cuatro trimestres solo en años completos (2002-2025)', () => {
    const anual = csv('macro', 'epa-anual-media');
    expect(Math.min(...anual.map((f) => Number(f['anio'])))).toBe(2002);
    expect(Math.max(...anual.map((f) => Number(f['anio'])))).toBe(2025);
  });
  it('razones con la base máxima = valor / (base máxima × 12 o × 1 si es mensual)', () => {
    const bmax = new Map(
      ArchivoDatos.parse(leeJson('parametros', 'base-maxima-rg')).data?.map((d) => [
        d.period,
        Number(d.value),
      ]) ?? [],
    );
    const defs = ArchivoDatos.parse(leeJson('macro', 'salario-medio-definiciones')).series ?? [];
    for (const s of defs) {
      const razon = serie('macro', 'salario-medio-razon-base-maxima', `razon-${s.id}`);
      const mensual = s.unit === 'euros/mes';
      for (const p of s.points) {
        const b = bmax.get(p.period);
        if (b === undefined) continue;
        expect(Math.abs(v(razon, p.period) - p.value / (b * (mensual ? 1 : 12)))).toBeLessThan(
          1e-3,
        );
      }
    }
  });
  it('las cuatro definiciones de salario medio están en el mismo orden de magnitud (2018-2024) y ninguna se ha forzado a coincidir', () => {
    const eaes = serie('macro', 'salario-medio-definiciones', 'eaes-ambos');
    const etcl = serie('macro', 'salario-medio-definiciones', 'etcl-coste-salarial-total-x12');
    const cn = serie(
      'macro',
      'salario-medio-definiciones',
      'cn-remuneracion-por-asalariado-puesto',
    );
    const bm = serie('macro', 'salario-medio-definiciones', 'base-media-cotizacion-rg-ambos');
    for (let a = 2018; a <= 2024; a++) {
      const k = String(a);
      for (const x of [v(etcl, k), v(cn, k), 12 * v(bm, k)]) {
        expect(x / v(eaes, k)).toBeGreaterThan(0.7);
        expect(x / v(eaes, k)).toBeLessThan(1.8);
      }
      expect(v(cn, k)).not.toBe(v(eaes, k));
    }
  });
  it('la remuneración de asalariados de la Contabilidad Nacional dividida por puestos da la serie derivada', () => {
    const rem = serie('macro', 'cn-remuneracion-empleo', 'remuneracion-asalariados');
    const pu = serie('macro', 'cn-remuneracion-empleo', 'asalariados-puestos');
    const d = serie('macro', 'salario-medio-definiciones', 'cn-remuneracion-por-asalariado-puesto');
    for (const [a, x] of d)
      expect(Math.abs(x - (v(rem, a) * 1e6) / (v(pu, a) * 1e3))).toBeLessThan(0.01);
  });
  it('base media de cotización: base total / cotizantes en cada fila y total = suma de tramos de edad', () => {
    const f = csv('macro', 'base-media-cotizacion-rg-mensual');
    for (const r of f)
      expect(
        Math.abs(
          Number(r['base_total_eur']) / Number(r['cotizantes']) - Number(r['base_media_eur_mes']),
        ),
      ).toBeLessThan(0.01);
    const t = f.find(
      (r) =>
        r['anio'] === '2025' &&
        r['mes'] === '12' &&
        r['sexo'] === 'ambos' &&
        r['tramo_edad'] === 'total',
    );
    const partes = f.filter(
      (r) =>
        r['anio'] === '2025' &&
        r['mes'] === '12' &&
        r['sexo'] !== 'ambos' &&
        r['tramo_edad'] !== 'total',
    );
    expect(Number(t?.['cotizantes'])).toBe(partes.reduce((a, r) => a + Number(r['cotizantes']), 0));
  });
});

describe('relación afiliados/pensiones, Alternativa 1 (C1)', () => {
  it('el cociente es afiliados de diciembre / pensiones de enero siguiente (2008-2025)', () => {
    const a = serie(
      'sistema',
      'relacion-afiliados-pensiones-alternativa-1',
      'afiliados-ultimo-dia-diciembre',
    );
    const p = serie(
      'sistema',
      'relacion-afiliados-pensiones-alternativa-1',
      'pensiones-vigor-1-enero-siguiente',
    );
    const r = serie(
      'sistema',
      'relacion-afiliados-pensiones-alternativa-1',
      'afiliados-por-pension-alternativa-1',
    );
    expect(r.size).toBe(18);
    for (const [k, x] of r) expect(Math.abs(x - v(a, k) / v(p, k))).toBeLessThan(1e-4);
  });
  it('enero de 2026: pensionistas ≤ pensiones y el cociente por pensionista es mayor que el cociente por pensión', () => {
    const pp = v(
      serie(
        'sistema',
        'relacion-afiliados-pensiones-alternativa-1',
        'afiliados-por-pensionista-alternativa-1',
      ),
      '2025',
    );
    const pn = v(
      serie(
        'sistema',
        'relacion-afiliados-pensiones-alternativa-1',
        'afiliados-por-pension-alternativa-1',
      ),
      '2025',
    );
    expect(pp).toBeGreaterThan(pn);
  });
});

describe('descargas manuales (C2): MITES e IMSERSO', () => {
  it('BEL PEN-1: el total de diciembre de 2025 coincide con el fichero REG de la Seguridad Social (± 60 pensiones)', () => {
    const bel = csv('sistema', 'mites-bel-pensiones').find(
      (f) => f['tabla'] === 'PEN-1' && f['periodo'] === '2025-12' && f['concepto'] === 'total',
    );
    const reg = csv('sistema', 'pensiones-vigor-regimen-clase-sexo').find(
      (f) =>
        f['anio'] === '2025' &&
        f['regimen'] === 'total-sistema' &&
        f['clase'] === 'total' &&
        f['sexo'] === 'ambos',
    );
    expect(Math.abs(Number(bel?.['numero_miles']) * 1000 - Number(reg?.['numero']))).toBeLessThan(
      60,
    );
    expect(Number(bel?.['importe_medio_eur_mes'])).toBeCloseTo(
      Number(reg?.['pension_media_eur_mes']),
      2,
    );
  });
  it('BEL PEN-31 frente a data/parametros: 221 de 306 celdas coinciden; las demás están en DISCREPANCIAS', () => {
    const p = (f: string) =>
      new Map(
        (ArchivoDatos.parse(leeJson('parametros', f)).data ?? []).map((d) => [
          d.id,
          Number(d.value),
        ]),
      );
    const mins = new Map<string, number>();
    for (const f of [
      'pension-minima-jubilacion',
      'pension-minima-incapacidad',
      'pension-minima-viudedad',
      'pension-minima-orfandad-familiares',
    ])
      for (const [k, x] of p(f)) mins.set(k, x);
    const max = p('pension-maxima');
    const MAP: Record<string, string> = {
      'ip-gran-invalidez-conyuge-cargo': 'ip-gran-invalidez-conyuge-cargo',
      'ip-gran-invalidez-unipersonal': 'ip-gran-invalidez-unipersonal',
      'ip-gran-invalidez-conyuge-no-cargo': 'ip-gran-invalidez-conyuge-no-cargo',
      'ip-absoluta-65-conyuge-cargo': 'ip-absoluta-conyuge-cargo',
      'ip-absoluta-65-unipersonal': 'ip-absoluta-unipersonal',
      'ip-absoluta-65-conyuge-no-cargo': 'ip-absoluta-conyuge-no-cargo',
      'jub65-conyuge-cargo': 'jub65-conyuge-cargo',
      'jub65-unipersonal': 'jub65-unipersonal',
      'jub65-conyuge-no-cargo': 'jub65-conyuge-no-cargo',
      'jub-menor65-conyuge-cargo': 'jub-menor65-conyuge-cargo',
      'jub-menor65-unipersonal': 'jub-menor65-unipersonal',
      'jub-menor65-conyuge-no-cargo': 'jub-menor65-conyuge-no-cargo',
      'viud-cargas-familiares': 'viud-cargas-familiares-unipersonal',
    };
    let comparadas = 0;
    let iguales = 0;
    for (const f of csv('sistema', 'mites-bel-pen31-cuantias')) {
      const ref =
        f['concepto'] === 'maxima'
          ? (max.get(f['anio'] ?? '') ?? NaN) * 14
          : mins.get(`${f['anio']}-${MAP[f['concepto'] ?? ''] ?? '_'}`);
      if (ref === undefined || Number.isNaN(ref)) continue;
      comparadas++;
      if (Math.abs(ref - Number(f['euros_anio'])) < 0.05) iguales++;
    }
    expect(comparadas).toBe(306);
    expect(iguales).toBe(221);
  });
  it('IMSERSO: PNC de diciembre de 2025 = jubilación + invalidez y 2019 coincide con el total del informe', () => {
    const e = csv('sistema', 'imserso-pnc-evolucion');
    const n = (per: string, clase: string) =>
      Number(e.find((f) => f['periodo'] === per && f['clase'] === clase)?.['pensiones']);
    expect(n('2025-12', 'jubilacion') + n('2025-12', 'invalidez')).toBe(n('2025-12', 'total'));
    expect(n('2019', 'total')).toBe(452157);
    expect(n('2019', 'invalidez')).toBe(191113);
  });
});

describe('registro de afirmaciones (C3): revisión actuarial', () => {
  const registro = RegistroAfirmaciones.parse(
    JSON.parse(
      readFileSync(path.resolve(import.meta.dirname, '../docs/claims.json'), 'utf8'),
    ) as unknown,
  );
  it('el resto de afirmaciones hereda «no-requiere» y las pendientes llevan pregunta', () => {
    expect(registro.revisionActuarialPorDefecto).toBe('no-requiere');
    const pendientes = registro.claims.filter(
      (c) => (c.revisionActuarial ?? registro.revisionActuarialPorDefecto) === 'pendiente',
    );
    expect(pendientes.length).toBeGreaterThanOrEqual(18);
    expect(pendientes.length).toBeLessThanOrEqual(45);
    for (const c of pendientes) expect(c.preguntaActuarial?.length).toBeGreaterThan(40);
    expect(registro.claims.some((c) => c.revisionActuarial === undefined)).toBe(true);
  });
  it('el esquema rechaza una afirmación pendiente sin pregunta', () => {
    const copia = JSON.parse(JSON.stringify(registro)) as { claims: Record<string, unknown>[] };
    const c = copia.claims[0];
    if (!c) throw new Error('sin afirmaciones');
    c['revisionActuarial'] = 'pendiente';
    delete c['preguntaActuarial'];
    expect(RegistroAfirmaciones.safeParse(copia).success).toBe(false);
  });
});
