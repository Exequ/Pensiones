// @vitest-environment node
/**
 * Tests de coherencia de los datos de la Fase 1C: comparativa internacional (OCDE y Eurostat), fichas de país,
 * contraste de España, catálogo de afirmaciones circulantes y auditoría de los datos.
 * Incluye sumas de control por tabla y serie (salen de los ficheros publicados en /data en el momento de la verificación).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoMitos, ArchivoTabla } from '../src/engine/esquema-datos.ts';
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
  ['internacional', 'ocde-pag', 'valor', 4923, 2310216.0],
  ['internacional', 'ocde-pag-codigos', 'dimension', 79, 0],
  ['internacional', 'eurostat-indicadores', 'valor', 4335, 314835197.06],
];

// [carpeta, fichero, serie, puntos, primer periodo, último periodo, suma]
const SERIES: [string, string, string, number, string, string, number][] = [
  [
    'internacional',
    'ocde-espana',
    'ciop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65',
    5,
    '2014',
    '2022',
    44.3,
  ],
  ['internacional', 'ocde-espana', 'ediop-no-aplica-y66t75-z-pt-b6n-a', 5, '2014', '2022', 524.5],
  ['internacional', 'ocde-espana', 'ediop-no-aplica-y-ge66-z-pt-b6n-a', 5, '2014', '2022', 485.6],
  ['internacional', 'ocde-espana', 'ediop-no-aplica-y-ge76-z-pt-b6n-a', 5, '2014', '2022', 441.6],
  [
    'internacional',
    'ocde-espana',
    'eiop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65',
    5,
    '2014',
    '2022',
    100.7,
  ],
  ['internacional', 'ocde-espana', 'elmea-mujeres-z-z-y', 55, '1970', '2024', 3495.1],
  ['internacional', 'ocde-espana', 'elmea-hombres-z-z-y', 55, '1970', '2024', 3423.8],
  ['internacional', 'ocde-espana', 'eylme-mujeres-z-z-y', 55, '1970', '2024', 1183.3],
  ['internacional', 'ocde-espana', 'eylme-hombres-z-z-y', 55, '1970', '2024', 1020.7],
  ['internacional', 'ocde-espana', 'oaip-mujeres-y-ge66-z-pt-pop-sex-age', 5, '2014', '2022', 54.7],
  ['internacional', 'ocde-espana', 'oaip-hombres-y-ge66-z-pt-pop-sex-age', 5, '2014', '2022', 42.4],
  ['internacional', 'ocde-espana', 'oaip-total-y66t75-z-pt-pop-sex-age', 5, '2014', '2022', 44.0],
  ['internacional', 'ocde-espana', 'oaip-total-y-ge66-z-pt-pop-sex-age', 5, '2014', '2022', 49.4],
  ['internacional', 'ocde-espana', 'oaip-total-y-ge76-z-pt-pop-sex-age', 5, '2014', '2022', 55.5],
  ['internacional', 'ocde-espana', 'oaip-total-t-z-pt-pop-sex-age', 5, '2014', '2022', 74.1],
  [
    'internacional',
    'ocde-espana',
    'oawar-no-aplica-y-ge65-z-pt-pop-y20t64',
    52,
    '1950',
    '2084',
    1146.2,
  ],
  [
    'internacional',
    'ocde-espana',
    'ocop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65',
    5,
    '2014',
    '2022',
    0.0,
  ],
  ['internacional', 'ocde-espana', 'pep-no-aplica-z-z-pt-b1gq', 5, '1990', '2021', 50.0],
  ['internacional', 'ocde-espana', 'ppep-no-aplica-z-z-pt-b1gq', 9, '2023', '2060', 141.5],
  [
    'internacional',
    'ocde-espana',
    'ptop-no-aplica-y-ge66-z-pt-b6g-a-pop-y-gt65',
    5,
    '2014',
    '2022',
    355.1,
  ],
  [
    'internacional',
    'eurostat-espana',
    'duracion-vida-laboral-hombres-y15-yr',
    26,
    '2000',
    '2025',
    976.2,
  ],
  [
    'internacional',
    'eurostat-espana',
    'duracion-vida-laboral-mujeres-y15-yr',
    26,
    '2000',
    '2025',
    798.1,
  ],
  [
    'internacional',
    'eurostat-espana',
    'duracion-vida-laboral-total-y15-yr',
    26,
    '2000',
    '2025',
    889.8,
  ],
  [
    'internacional',
    'eurostat-espana',
    'empleo-55-64-hombres-y55-64-pc-pop',
    17,
    '2009',
    '2025',
    998.8,
  ],
  [
    'internacional',
    'eurostat-espana',
    'empleo-55-64-mujeres-y55-64-pc-pop',
    17,
    '2009',
    '2025',
    741.2,
  ],
  [
    'internacional',
    'eurostat-espana',
    'empleo-55-64-total-y55-64-pc-pop',
    17,
    '2009',
    '2025',
    867.1,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-old-no-aplica-no-aplica-mio-eur',
    36,
    '1990',
    '2025',
    2919005.92,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-old-no-aplica-no-aplica-pc-gdp',
    31,
    '1995',
    '2025',
    263.47,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-old-srv-no-aplica-no-aplica-mio-eur',
    36,
    '1990',
    '2025',
    3590110.31,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-old-srv-no-aplica-no-aplica-pc-gdp',
    31,
    '1995',
    '2025',
    324.18,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-srv-no-aplica-no-aplica-mio-eur',
    36,
    '1990',
    '2025',
    671104.38,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-srv-no-aplica-no-aplica-pc-gdp',
    31,
    '1995',
    '2025',
    60.71,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-total-no-aplica-no-aplica-mio-eur',
    36,
    '1990',
    '2025',
    7672421.93,
  ],
  [
    'internacional',
    'eurostat-espana',
    'gasto-total-no-aplica-no-aplica-pc-gdp',
    31,
    '1995',
    '2025',
    696.55,
  ],
  [
    'internacional',
    'eurostat-espana',
    'pobreza-o-exclusion-total-total-pc',
    11,
    '2015',
    '2025',
    297.3,
  ],
  [
    'internacional',
    'eurostat-espana',
    'pobreza-o-exclusion-total-y-ge65-pc',
    11,
    '2015',
    '2025',
    211.2,
  ],
  [
    'internacional',
    'contraste-espana',
    'gasto-pensiones-contributivas-sobre-pib',
    9,
    '2017',
    '2025',
    95.93,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-altas-sobre-salario-eaes',
    4,
    '2021',
    '2024',
    2.9594,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-altas-sobre-salario-etcl-x12',
    5,
    '2021',
    '2025',
    3.9459,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-altas-sobre-salario-cn-puesto',
    5,
    '2021',
    '2025',
    2.7516,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-altas-sobre-salario-base-media-x12',
    5,
    '2021',
    '2025',
    4.1259,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-vigor-sobre-salario-eaes',
    17,
    '2008',
    '2024',
    10.5021,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-vigor-sobre-salario-etcl-x12',
    18,
    '2008',
    '2025',
    11.6115,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-vigor-sobre-salario-cn-puesto',
    18,
    '2008',
    '2025',
    8.3636,
  ],
  [
    'internacional',
    'contraste-espana',
    'pension-vigor-sobre-salario-base-media-x12',
    8,
    '2018',
    '2025',
    5.9114,
  ],
];

// [carpeta, fichero, elementos de «data», elementos numéricos, suma de los valores numéricos]
const DATOS: [string, string, number, number, number][] = [
  ['internacional', 'ocde-espana', 51, 51, 67322.8],
  ['internacional', 'contraste-espana', 4, 4, 1840.0],
  ['internacional', 'paises-sistemas', 15, 0, 0],
];

describe('tablas 1C: cabecera, filas y suma de control', () => {
  for (const [carpeta, nombre, columna, filas, suma] of TABLAS) {
    it(`${carpeta}/${nombre}`, () => {
      const t = ArchivoTabla.parse(leeJson(carpeta, nombre));
      const f = csv(carpeta, nombre);
      expect(t.filas).toBe(f.length);
      expect(f.length).toBe(filas);
      expect(Object.keys(f[0] ?? {})).toEqual(t.columnas.map((c) => c.id));
      if (columna !== 'dimension') {
        const s = f.reduce((a, r) => a + Number(r[columna]), 0);
        expect(cerca(s, suma)).toBe(true);
      }
    });
  }
});

describe('series 1C: puntos, rango y suma de control', () => {
  for (const [carpeta, fichero, id, n, primero, ultimo, suma] of SERIES) {
    it(`${carpeta}/${fichero}#${id}`, () => {
      const m = serie(carpeta, fichero, id);
      const periodos = [...m.keys()].sort();
      expect(m.size).toBe(n);
      expect(periodos[0]).toBe(primero);
      expect(periodos[periodos.length - 1]).toBe(ultimo);
      expect(Math.abs([...m.values()].reduce((a, x) => a + x, 0) - suma)).toBeLessThan(0.01);
    });
  }
});

describe('datos de un año 1C: número y suma de control', () => {
  for (const [carpeta, fichero, n, numericos, suma] of DATOS) {
    it(`${carpeta}/${fichero}`, () => {
      const d = ArchivoDatos.parse(leeJson(carpeta, fichero)).data ?? [];
      expect(d.length).toBe(n);
      const nums = d.map((x) => x.value).filter((x): x is number => typeof x === 'number');
      expect(nums.length).toBe(numericos);
      expect(Math.abs(nums.reduce((a, x) => a + x, 0) - suma)).toBeLessThan(0.01);
    });
  }
});

describe('OCDE (A1) y Eurostat (A2)', () => {
  const pag = csv('internacional', 'ocde-pag');
  const PAISES = [
    'ESP',
    'DEU',
    'FRA',
    'ITA',
    'SWE',
    'PRT',
    'NLD',
    'DNK',
    'POL',
    'GBR',
    'USA',
    'OECD_REP',
    'EU27',
  ];
  it('hay tasas de reposición bruta y neta al 50, 100 y 200 % del salario medio para los 13 países y áreas', () => {
    for (const p of PAISES)
      for (const m of ['GPRR50', 'GPRR100', 'GPRR200', 'NPRR50', 'NPRR100', 'NPRR200']) {
        const f = pag.filter(
          (r) =>
            r['pais'] === p &&
            r['medida'] === m &&
            r['opcionalidad'] === 'M' &&
            r['sexo'] === 'hombres',
        );
        expect(f.length, `${p} ${m}`).toBe(1);
      }
  });
  it('España: la tasa bruta al 100 % de la OCDE es 80,4 y la tasa neta es mayor que la bruta al 100 % y al 200 %', () => {
    const g = (m: string) =>
      Number(
        pag.find(
          (r) =>
            r['pais'] === 'ESP' &&
            r['medida'] === m &&
            r['opcionalidad'] === 'M' &&
            r['sexo'] === 'hombres',
        )?.['valor'],
      );
    expect(g('GPRR100')).toBe(80.4);
    expect(g('NPRR100')).toBeGreaterThan(g('GPRR100'));
    expect(g('NPRR200')).toBeGreaterThan(g('GPRR200'));
  });
  it('el fichero de España coincide con la tabla de la OCDE', () => {
    const datos = ArchivoDatos.parse(leeJson('internacional', 'ocde-espana')).data ?? [];
    const x = datos.find((d) => d.id === 'gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024');
    expect(x?.value).toBe(
      Number(
        pag.find(
          (r) =>
            r['pais'] === 'ESP' &&
            r['medida'] === 'GPRR100' &&
            r['opcionalidad'] === 'M' &&
            r['sexo'] === 'hombres',
        )?.['valor'],
      ),
    );
  });
  it('todos los códigos de ocde-pag tienen literal en ocde-pag-codigos', () => {
    const cod = new Set(
      csv('internacional', 'ocde-pag-codigos').map((r) => `${r['dimension']}|${r['codigo']}`),
    );
    for (const r of pag) {
      expect(cod.has(`MEASURE|${r['medida']}`)).toBe(true);
      expect(cod.has(`UNIT_MEASURE|${r['unidad']}`)).toBe(true);
      expect(cod.has(`REF_AREA|${r['pais']}`)).toBe(true);
    }
  });
  it('Eurostat: vejez más supervivencia ≥ vejez en % del PIB en cada país y año', () => {
    const eu = csv('internacional', 'eurostat-indicadores');
    const m = new Map<string, number>();
    for (const r of eu)
      if (r['unidad'] === 'PC_GDP')
        m.set(`${r['indicador']}|${r['pais']}|${r['anio']}`, Number(r['valor']));
    let n = 0;
    for (const [k, x] of m) {
      if (!k.startsWith('gasto-old|')) continue;
      const os = m.get(k.replace('gasto-old|', 'gasto-old-srv|'));
      if (os === undefined) continue;
      expect(os).toBeGreaterThanOrEqual(x - 1e-9);
      n++;
    }
    expect(n).toBeGreaterThan(200);
  });
});

describe('contraste de España (A4)', () => {
  it('el cociente pensión de las altas / EAES de 2024 es 14 × pensión media / salario medio', () => {
    const alta = csv('sistema', 'altas-bajas-anual-clase-sexo').find(
      (r) =>
        r['anio'] === '2024' &&
        r['movimiento'] === 'alta-inicial' &&
        r['clase'] === 'jubilacion' &&
        r['sexo'] === 'ambos',
    );
    const eaes = ArchivoDatos.parse(leeJson('macro', 'salario-medio-definiciones'))
      .series?.find((s) => s.id === 'eaes-ambos')
      ?.points.find((p) => p.period === '2024')?.value;
    const r = v(
      serie('internacional', 'contraste-espana', 'pension-altas-sobre-salario-eaes'),
      '2024',
    );
    expect(
      Math.abs(r - (14 * Number(alta?.['pension_media_eur_mes'])) / Number(eaes)),
    ).toBeLessThan(1e-3);
  });
  it('el gasto contributivo sobre el PIB de 2021 es obligaciones de «suma de pensiones» / PIB', () => {
    const o = csv('sistema', 'presupuesto-ss-ejecucion').find(
      (r) =>
        r['tabla'] === 'gastos-cap4' &&
        r['concepto'] === 'SUMA DE PENSIONES' &&
        r['periodo'] === '2021-T4',
    );
    const pib = v(serie('macro', 'pib-ine', 'pib-corriente'), '2021');
    const r = v(
      serie('internacional', 'contraste-espana', 'gasto-pensiones-contributivas-sobre-pib'),
      '2021',
    );
    expect(Math.abs(r - (100 * Number(o?.['derechos_u_obligaciones_meur'])) / pib)).toBeLessThan(
      1e-3,
    );
  });
  it('la edad de jubilación de la OCDE (65) es compatible con una carrera de 516 meses frente a los meses exigidos para jubilarse a los 65', () => {
    const d = ArchivoDatos.parse(leeJson('internacional', 'contraste-espana')).data ?? [];
    const val = (id: string) => Number(d.find((x) => x.id === id)?.value);
    expect(val('edad-jubilacion-ocde-hombres-2024')).toBe(65);
    expect(val('meses-carrera-completa-desde-22-hasta-65')).toBe(516);
    expect(val('meses-carrera-completa-desde-22-hasta-65')).toBeGreaterThan(
      val('carrera-jubilacion-65-propia-2025'),
    );
  });
  it('el complemento a mínimos explica la diferencia entre el gasto de la ejecución y número × pensión media × 14 (cociente entre 1,00 y 1,03)', () => {
    const ej = csv('sistema', 'presupuesto-ss-ejecucion');
    const bel = csv('sistema', 'mites-bel-pensiones');
    for (let a = 2018; a <= 2025; a++) {
      const t4 = (tabla: string, concepto: (c: string) => boolean) =>
        Number(
          ej.find(
            (r) =>
              r['tabla'] === tabla && r['periodo'] === `${a}-T4` && concepto(r['concepto'] ?? ''),
          )?.['derechos_u_obligaciones_meur'],
        );
      const sp = t4('gastos-cap4', (c) => c === 'SUMA DE PENSIONES');
      const cm = t4('gastos-cap4-no-contributivas', (c) => c.startsWith('COMPL. A M'));
      const b = bel.find(
        (r) =>
          r['tabla'] === 'PEN-1' &&
          r['periodo'] === String(a) &&
          r['tipo_periodo'] === 'anual' &&
          r['concepto'] === 'total',
      );
      const est =
        (Number(b?.['numero_miles']) * 1000 * Number(b?.['importe_medio_eur_mes']) * 14) / 1e6;
      expect(sp / est).toBeLessThan(1);
      expect((sp + cm) / est).toBeGreaterThan(1.0);
      expect((sp + cm) / est).toBeLessThan(1.03);
    }
  });
});

describe('estructura de los sistemas de pensiones (A3)', () => {
  const d = ArchivoDatos.parse(leeJson('internacional', 'paises-sistemas')).data ?? [];
  it('hay quince elementos de nueve países, cada uno con cita literal y su fuente', () => {
    expect(d.length).toBe(15);
    expect(new Set(d.map((x) => x.id.split('-')[1])).size).toBe(9);
    for (const x of d) {
      expect(typeof x.quote).toBe('string');
      expect((x.quote ?? '').length).toBeGreaterThan(30);
      expect(x.source.url.startsWith('https://')).toBe(true);
    }
  });
});

describe('catálogo de afirmaciones circulantes (B)', () => {
  const c = ArchivoMitos.parse(leeJson('mitos', 'afirmaciones-circulantes'));
  it('tiene entre 10 y 12 afirmaciones con identificadores únicos, todas pendientes de revisión actuarial y con pregunta concreta', () => {
    expect(c.mitos.length).toBe(12);
    expect(new Set(c.mitos.map((m) => m.id)).size).toBe(12);
    for (const m of c.mitos) {
      expect(m.revisionActuarial).toBe('pendiente');
      expect(m.preguntaActuarial.length).toBeGreaterThan(80);
      expect(m.definiciones.length).toBeGreaterThanOrEqual(2);
      expect(m.noSePuedeConcluir.length).toBeGreaterThanOrEqual(1);
    }
  });
  it('no emite veredictos: ningún texto del catálogo califica la afirmación de verdadera o falsa', () => {
    const texto = JSON.stringify(
      c.mitos.map((m) => [m.definiciones, m.noSePuedeConcluir, m.faltan, m.preguntaActuarial]),
    ).toLowerCase();
    for (const prohibida of [
      'verdadero',
      'verdadera',
      'falso',
      'falsa',
      'es cierto',
      'es incierto',
      'bulo',
      'desmiente',
      'confirma que',
    ])
      expect(texto.includes(prohibida), prohibida).toBe(false);
  });
  it('los enunciados van entre comillas angulares y las definiciones traen su literal', () => {
    for (const m of c.mitos) {
      expect(m.enunciado.startsWith('«')).toBe(true);
      expect(m.enunciado.endsWith('»')).toBe(true);
      for (const dfn of m.definiciones) expect(dfn.literal.length).toBeGreaterThan(30);
    }
  });
  it('contiene las siete afirmaciones de ejemplo del encargo', () => {
    const ids = new Set(c.mitos.map((m) => m.id));
    for (const id of [
      'hucha-vaciada',
      'pensiones-con-impuestos',
      'menos-cotizantes-por-pensionista',
      'jubilados-cobran-mas-de-lo-cotizado',
      'sistema-en-deficit',
      'edad-real-de-jubilacion-65',
      'pensiones-publicas-insostenibles',
    ])
      expect(ids.has(id), id).toBe(true);
  });
});

describe('auditoría de los datos (C1)', () => {
  const a = JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../docs/auditoria-datos.json'), 'utf8'),
  ) as Record<string, number>;
  it('ningún elemento sin fuente o sin fecha de descarga y ninguna tabla con claves de dimensión repetidas', () => {
    expect(a['sin_fuente']).toBe(0);
    expect(a['sin_fecha']).toBe(0);
    expect(a['dup_tablas']).toBe(0);
  });
});
