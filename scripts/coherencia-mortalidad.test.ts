// @vitest-environment node
/**
 * Tests de coherencia de la Fase 1B-4: defunciones registradas (INE y Eurostat) y triangulación de la mortalidad en edades altas.
 * Incluye sumas de control por tabla y serie (salen de los ficheros publicados en /data en el momento de la verificación).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoTabla } from '../src/engine/esquema-datos.ts';
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
const cerca = (a: number, b: number, tol = 1e-9) =>
  Math.abs(a - b) <= tol * Math.max(1, Math.abs(b));

// [carpeta, tabla, columna sumada, filas, suma]
const TABLAS: [string, string, string, number, number][] = [
  ['demografia', 'defunciones-edad-sexo', 'defunciones', 15150, 36186014.0],
  ['demografia', 'eurostat-defunciones-edad-sexo', 'defunciones', 15150, 36080700.0],
  ['demografia', 'eurostat-defunciones-generacion-sexo', 'defunciones', 15150, 36080704.0],
  ['demografia', 'triangulacion-defunciones', 'registradas', 340, 11012876.0],
  ['demografia', 'triangulacion-cohortes', 'poblacion_inicial', 60, 9389324.0],
  ['demografia', 'triangulacion-factor-qx', 'factor_real_medio_2010_2019', 14, 14.8423],
];

// [carpeta, fichero, elementos de «data», elementos numéricos, suma de los valores numéricos]
const DATOS: [string, string, number, number, number][] = [
  ['demografia', 'triangulacion-mortalidad', 12, 9, 511403.8328],
  ['internacional', 'ocde-supuestos-reposicion', 37, 18, 545.275],
  ['demografia', 'defunciones-2025-estimadas', 1, 1, 443314.0],
];

describe('tablas 1B-4: cabecera, filas y suma de control', () => {
  for (const [carpeta, nombre, columna, filas, suma] of TABLAS) {
    it(`${carpeta}/${nombre}`, () => {
      const t = ArchivoTabla.parse(leeJson(carpeta, nombre));
      const f = csv(carpeta, nombre);
      expect(t.filas).toBe(f.length);
      expect(f.length).toBe(filas);
      expect(Object.keys(f[0] ?? {})).toEqual(t.columnas.map((c) => c.id));
      expect(
        cerca(
          f.reduce((a, r) => a + Number(r[columna]), 0),
          suma,
        ),
      ).toBe(true);
    });
  }
});

describe('datos 1B-4: número y suma de control', () => {
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

describe('defunciones registradas', () => {
  const ine = csv('demografia', 'defunciones-edad-sexo');
  const eu = csv('demografia', 'eurostat-defunciones-edad-sexo');
  const mapa = (f: Fila[]) =>
    new Map(f.map((r) => [`${r['anio']}|${r['sexo']}|${r['edad']}`, Number(r['defunciones'])]));
  it('INE y Eurostat coinciden hasta 2000 (salvo 100 defunciones a los 73 años en 1986) y difieren menos de un 2 % por grupos de edad desde 2001', () => {
    const a = mapa(ine);
    const b = mapa(eu);
    for (const [k, x] of a) {
      const y = b.get(k);
      if (y === undefined || Number(k.split('|')[0]) > 2000) continue;
      if (k === '1986|ambos|73' || k === '1986|mujeres|73') expect(y - x).toBe(100);
      else expect(Math.abs(x - y), k).toBeLessThanOrEqual(5);
    }
    for (let yr = 2001; yr <= 2024; yr++)
      for (const [lo, hi] of [
        [0, 14],
        [15, 64],
        [65, 84],
        [85, 100],
      ] as const) {
        let x = 0;
        let z = 0;
        for (let e = lo; e <= hi; e++) {
          x += a.get(`${yr}|ambos|${e}`) ?? 0;
          z += b.get(`${yr}|ambos|${e}`) ?? 0;
        }
        expect(Math.abs(x / z - 1), `${yr} ${lo}-${hi}`).toBeLessThan(0.05);
        if (lo >= 65) expect(Math.abs(x / z - 1)).toBeLessThan(0.02);
      }
  });
  it('hombres + mujeres = ambos y 2024 tiene entre 400.000 y 460.000 defunciones', () => {
    const a = mapa(ine);
    for (const y of [1990, 2010, 2024]) {
      let h = 0;
      let m = 0;
      let t = 0;
      for (let e = 0; e <= 100; e++) {
        h += a.get(`${y}|hombres|${e}`) ?? 0;
        m += a.get(`${y}|mujeres|${e}`) ?? 0;
        t += a.get(`${y}|ambos|${e}`) ?? 0;
      }
      expect(Math.abs(h + m - t)).toBeLessThanOrEqual(3);
      if (y === 2024) {
        expect(t).toBeGreaterThan(400000);
        expect(t).toBeLessThan(460000);
      }
    }
  });
});

describe('triangulación de la mortalidad en edades altas', () => {
  const pob = new Map(
    csv('demografia', 'poblacion-edad-sexo').map((r) => [
      `${r['anio']}|${r['sexo']}|${r['edad']}`,
      Number(r['poblacion']),
    ]),
  );
  const dea = new Map(
    csv('demografia', 'defunciones-edad-sexo').map((r) => [
      `${r['anio']}|${r['sexo']}|${r['edad']}`,
      Number(r['defunciones']),
    ]),
  );
  const qx = new Map(
    csv('demografia', 'mortalidad-ine')
      .filter((r) => r['edicion'] === '1991-2024')
      .map((r) => [`${r['anio']}|${r['sexo']}|${r['edad']}`, Number(r['qx_por_mil']) / 1000]),
  );
  const mx = new Map(
    csv('demografia', 'mortalidad-ine')
      .filter((r) => r['edicion'] === '1991-2024')
      .map((r) => [`${r['anio']}|${r['sexo']}|${r['edad']}`, Number(r['mx']) / 1000]),
  );
  const g = (m: Map<string, number>, k: string): number => {
    const x = m.get(k);
    if (x === undefined) throw new Error(`Falta ${k}`);
    return x;
  };
  it('las defunciones registradas coinciden con las de las tablas (tasa central × población media) con un 4 % de margen en 65-94 años, 2010-2019', () => {
    for (const sx of ['hombres', 'mujeres'])
      for (let y = 2010; y <= 2019; y++)
        for (const [a, b] of [
          [65, 74],
          [75, 84],
          [85, 94],
        ] as const) {
          let reg = 0;
          let esp = 0;
          for (let e = a; e <= b; e++) {
            reg += g(dea, `${y}|${sx}|${e}`);
            esp +=
              g(mx, `${y}|${sx}|${e}`) *
              ((g(pob, `${y}|${sx}|${e}`) + g(pob, `${y + 1}|${sx}|${e}`)) / 2);
          }
          expect(Math.abs(reg / esp - 1), `${sx} ${y} ${a}-${b}`).toBeLessThan(0.04);
        }
  });
  it('el desfase del modelo se reproduce (publicada ÷ Π(1 − qx) < 1 y decreciente con la edad) y desaparece en gran parte con la convención de Lexis', () => {
    const coh = csv('demografia', 'triangulacion-cohortes').filter(
      (r) => r['ventana'] === '2010-2020',
    );
    for (const sx of ['hombres', 'mujeres']) {
      const q = (x: number) =>
        Number(
          coh.find((r) => r['sexo'] === sx && r['edad_inicial'] === String(x))?.[
            'publicada_sobre_qx'
          ],
        );
      const l = (x: number) =>
        Number(
          coh.find((r) => r['sexo'] === sx && r['edad_inicial'] === String(x))?.[
            'publicada_sobre_qx_lexis'
          ],
        );
      expect(q(65)).toBeGreaterThan(q(75));
      expect(q(75)).toBeGreaterThan(q(85));
      expect(q(85)).toBeLessThan(0.93);
      for (const x of [65, 75, 80, 85]) expect(Math.abs(1 - l(x))).toBeLessThan(Math.abs(1 - q(x)));
    }
  });
  it('el factor real (defunciones de la cohorte / población × qx) coincide con el factor de Lexis dentro de 0,03 entre los 65 y los 90 años', () => {
    for (const r of csv('demografia', 'triangulacion-factor-qx')) {
      const e = Number(r['edad']);
      if (e > 90) continue;
      expect(
        Math.abs(Number(r['factor_real_medio_2010_2019']) - Number(r['factor_lexis_medio'])),
        `${r['sexo']} ${e}`,
      ).toBeLessThan(0.03);
      expect(Number(r['factor_real_medio_2010_2019'])).toBeGreaterThan(1.03);
    }
  });
  it('Lexis: qx de cada edad × factor reproduce (qx + qx+1)/2 (comprobación aritmética de la tabla)', () => {
    for (const sx of ['hombres', 'mujeres']) {
      const a = g(qx, `2015|${sx}|80`);
      const b = g(qx, `2015|${sx}|81`);
      expect(b).toBeGreaterThan(a);
      expect((a + b) / 2 / a).toBeGreaterThan(1.05);
    }
  });
  it('las citas del INE sobre la revisión con el censo de 2021 están y citan noviembre de 2023', () => {
    const d = ArchivoDatos.parse(leeJson('demografia', 'triangulacion-mortalidad')).data ?? [];
    const x = d.find((e) => e.id === 'ine-tablas-recalculo-censo-2021');
    expect(x?.quote).toContain(
      'En noviembre de 2023 se publican las tablas de mortalidad calculadas sobre la base poblacional',
    );
    expect(d.find((e) => e.id === 'ine-tablas-base-poblacional')?.quote).toContain(
      'Estimaciones Intercensales de Población hasta 2020',
    );
  });
});

describe('supuestos de la OCDE', () => {
  const d = ArchivoDatos.parse(leeJson('internacional', 'ocde-supuestos-reposicion')).data ?? [];
  it('el flujo dice que la entrada al mercado laboral es a los 22 años y España tiene edad de jubilación 65', () => {
    expect(d.find((e) => e.id === 'ocde-pag-entrada-mercado-laboral-22')?.quote).toContain(
      'workers entering the labour market at age 22',
    );
    expect(d.find((e) => e.id === 'edad-jubilacion-actual-carrera-desde-22-hombres')?.value).toBe(
      65,
    );
  });
  it('las notas metodológicas del informe de 2025 recogen los supuestos económicos del escenario base y del alternativo', () => {
    const v = (id: string): unknown => d.find((e) => e.id === id)?.value;
    expect(v('ocde-pag-2025-inflacion-base')).toBe(2.0);
    expect(v('ocde-pag-2025-crecimiento-real-salarios-base')).toBe(1.25);
    expect(v('ocde-pag-2025-crecimiento-nominal-salarios-base')).toBe(3.275);
    expect(v('ocde-pag-2025-tipo-descuento-real-base')).toBe(1.5);
    expect(v('ocde-pag-2025-rentabilidad-real-fdc-base')).toBe(2.5);
    expect(v('ocde-pag-2025-inflacion-alternativo')).toBe(1.0);
    expect(v('ocde-pag-2025-crecimiento-real-salarios-alternativo')).toBe(0.75);
    // el crecimiento nominal es el que resulta de componer la inflación y el crecimiento real
    const nominal = (1 + 0.02) * (1 + 0.0125) - 1;
    expect(Math.abs(nominal * 100 - 3.275)).toBeLessThan(0.001);
  });
  it('cada elemento del informe lleva la cita literal en inglés, su página y la fuente del PDF', () => {
    const del2025 = d.filter((e) => e.id.startsWith('ocde-pag-2025-'));
    expect(del2025.length).toBe(32);
    for (const e of del2025) {
      expect((e.quote ?? '').length).toBeGreaterThan(10);
      expect(e.location).toMatch(/^p\. \d+ del informe \(pág\. \d+ del PDF\)/);
      expect(e.source.docId).toBe('OECD-PAG-2025');
      expect(e.source.url.startsWith('https://')).toBe(true);
    }
  });
  it('la tasa bruta del escenario alternativo de España es la de la tabla 5.4 y supera a la del escenario base', () => {
    expect(
      d.find((e) => e.id === 'ocde-pag-2025-tasa-bruta-reposicion-alternativo-esp')?.value,
    ).toBe(88.0);
    expect(
      d.find((e) => e.id === 'ocde-pag-2025-tasa-bruta-reposicion-alternativo-gbr')?.value,
    ).toBe(51.3);
  });
});
