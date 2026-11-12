// @vitest-environment node
/**
 * Tests de coherencia de los datos reales de /data.
 * Cargan los ficheros y comprueban reglas que el esquema no puede expresar.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  ArchivoCronologia,
  ArchivoDatos,
  ArchivoPrestaciones,
  type DatoConId,
} from '../src/engine/esquema-datos.ts';
import { aEurosConstantes, serieIPCDesdeArchivo } from '../src/engine/euros-constantes.ts';

const DATA = path.resolve(import.meta.dirname, '../data');

function leer(relativo: string): unknown {
  return JSON.parse(readFileSync(path.join(DATA, relativo), 'utf8')) as unknown;
}

const PARAMETROS = readdirSync(path.join(DATA, 'parametros'))
  .filter((f) => f.endsWith('.json'))
  .sort()
  .map((f) => ({ fichero: f, archivo: ArchivoDatos.parse(leer(`parametros/${f}`)) }));

const porId = new Map(PARAMETROS.map(({ archivo }) => [archivo.id, archivo]));

function valoresPorAnio(id: string): Map<string, DatoConId> {
  const archivo = porId.get(id);
  return new Map((archivo?.data ?? []).map((d) => [d.period, d]));
}

function numero(dato: DatoConId): number {
  if (typeof dato.value !== 'number') throw new Error(`${dato.id}: valor no numérico`);
  return dato.value;
}

/** Reglas de la jubilación de la Fase 2-A: varios parámetros (y unidades) por año o por versión. */
const FICHEROS_REGLAS_2A = [
  'escala-jubilacion-tramos',
  'jubilacion-',
  'complemento-brecha-genero-reglas',
  'pension-maxima-incremento-2051-2065',
];

/** Reglas de la incapacidad permanente de la Fase 2-B-1 (cada dato, con el año de su redacción). */
const FICHEROS_REGLAS_2B1 = ['incapacidad-permanente-reglas'];

/** Reglas de muerte y supervivencia de la Fase 2-B-2 (cada dato, con el año de su redacción). */
const FICHEROS_REGLAS_2B2 = ['supervivencia-reglas'];

/** Series con varias cuantías por año (clase de pensión, situación familiar, tramo). */
const MULTIPLES_POR_ANIO = [
  'pension-minima-',
  'cuota-solidaridad-',
  'actualizacion-bases',
  'lagunas-integracion',
  'revalorizacion-regla',
  'prestamos-',
  'mei-destino',
  ...FICHEROS_REGLAS_2A,
  ...FICHEROS_REGLAS_2B1,
  ...FICHEROS_REGLAS_2B2,
];
/** Ficheros por versión de una regla (el periodo es el año desde el que rige): sin exigir años seguidos. */
const POR_VERSION = [
  'actualizacion-bases',
  'lagunas-integracion',
  'revalorizacion-regla',
  ...FICHEROS_REGLAS_2A,
  ...FICHEROS_REGLAS_2B1,
  ...FICHEROS_REGLAS_2B2,
];
/** Ficheros de reglas con varios parámetros (unidades distintas) en un mismo fichero. */
const VARIAS_UNIDADES = [...POR_VERSION, 'pension-minima-regla', 'prestamos-', 'mei-destino'];
/** Años sin dato por falta de fuente descargada; cada uno consta en docs/PENDIENTE_DATOS.md. */
const HUECOS_DOCUMENTADOS: Record<string, string[]> = {
  'base-minima-rg.json': ['2020', '2021'],
  'tipo-cc-empresa.json': ['2020'],
  'tipo-cc-trabajador.json': ['2020'],
  'iprem-anual.json': ['2019', '2020'],
  'iprem-diario.json': ['2019', '2020'],
  'iprem-mensual.json': ['2019', '2020'],
  'pension-maxima.json': ['2011'],
  'revalorizacion-general.json': ['2011', '2012'],
  'pension-minima-jubilacion.json': ['2000', '2008'],
  'pension-minima-incapacidad.json': ['2000', '2008'],
  'pension-minima-viudedad.json': ['2000', '2008'],
  'pension-minima-orfandad-familiares.json': ['2000', '2008'],
};

describe('series anuales de /data/parametros', () => {
  it('hay series de parámetros', () => {
    expect(PARAMETROS.length).toBeGreaterThan(0);
  });

  for (const { fichero, archivo } of PARAMETROS) {
    it(`${fichero}: años ordenados y sin huecos salvo los documentados en PENDIENTE_DATOS.md`, () => {
      const anios = (archivo.data ?? []).map((d) => d.period);
      expect(anios.length).toBeGreaterThan(0);
      for (const anio of anios) expect(anio).toMatch(/^\d{4}$/);
      const numeros = anios.map(Number);
      const multiples = MULTIPLES_POR_ANIO.some((m) => fichero.startsWith(m));
      const huecos = new Set((HUECOS_DOCUMENTADOS[fichero] ?? []).map(Number));
      for (let i = 1; i < numeros.length; i++) {
        const previo = numeros[i - 1] ?? 0;
        const actual = numeros[i] ?? 0;
        if (multiples && actual === previo) continue;
        expect(actual, `${fichero}: desorden tras ${previo}`).toBeGreaterThanOrEqual(previo);
        if (POR_VERSION.some((m) => fichero.startsWith(m))) continue;
        expect(actual, `${fichero}: año repetido`).toBeGreaterThan(previo);
        for (let a = previo + 1; a < actual; a++) {
          expect(huecos.has(a), `${fichero}: hueco no documentado en ${a}`).toBe(true);
        }
      }
      if (!multiples) expect(new Set(numeros).size).toBe(numeros.length);
    });

    it(`${fichero}: todos los datos numéricos tienen fuente con URL y fecha de descarga`, () => {
      for (const dato of archivo.data ?? []) {
        expect(dato.source.url).toMatch(/^https?:\/\//);
        expect(dato.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}/);
      }
    });

    it(`${fichero}: una sola unidad en toda la serie`, () => {
      if (VARIAS_UNIDADES.some((m) => fichero.startsWith(m))) return;
      expect(new Set((archivo.data ?? []).map((d) => d.unit)).size).toBe(1);
    });

    it(`${fichero}: los porcentajes están en rango`, () => {
      const esVariacion = archivo.id.includes('variacion');
      for (const dato of archivo.data ?? []) {
        if (dato.unit !== '%' || typeof dato.value !== 'number') continue;
        expect(dato.value, `${fichero} ${dato.period}`).toBeLessThanOrEqual(100);
        expect(dato.value, `${fichero} ${dato.period}`).toBeGreaterThanOrEqual(
          esVariacion ? -100 : 0,
        );
      }
    });
  }

  it('la pensión máxima supera a todas las pensiones mínimas cada año', () => {
    const maxima = valoresPorAnio('pension-maxima');
    const minimas = PARAMETROS.filter(({ archivo }) => archivo.id.startsWith('pension-minima-'));
    let comparaciones = 0;
    for (const { archivo } of minimas) {
      for (const minima of archivo.data ?? []) {
        const max = maxima.get(minima.period);
        if (!max) continue;
        // la pensión máxima es mensual (14 pagas) y las mínimas anuales
        const maxima14 =
          max.unit === 'euros/mes' && minima.unit === 'euros/año' ? numero(max) * 14 : numero(max);
        expect(maxima14, `${archivo.id} ${minima.period}`).toBeGreaterThan(numero(minima));
        comparaciones++;
      }
    }
    if (porId.has('pension-maxima') && minimas.length > 0) {
      expect(comparaciones).toBeGreaterThan(0);
    }
  });

  it('la base máxima de cotización supera a la mínima cada año', () => {
    const maxima = valoresPorAnio('base-maxima-rg');
    const minima = valoresPorAnio('base-minima-rg');
    for (const [anio, min] of minima) {
      const max = maxima.get(anio);
      if (!max) continue;
      expect(numero(max), anio).toBeGreaterThan(numero(min));
    }
  });

  it('la edad ordinaria nunca es inferior a 65 años ni a la de la serie anterior', () => {
    const edades = [...valoresPorAnio('edad-ordinaria-jubilacion').values()].map(numero);
    for (const [i, edad] of edades.entries()) {
      expect(edad).toBeGreaterThanOrEqual(65 * 12);
      if (i > 0) expect(edad).toBeGreaterThanOrEqual(edades[i - 1] ?? 0);
    }
  });

  it('la serie de IPC alimenta la conversión a euros constantes', () => {
    const ipc = porId.get('ipc-indice-medio-anual');
    expect(ipc).toBeDefined();
    const serie = serieIPCDesdeArchivo(ipc!);
    const primero = serie.puntos[0]!;
    const ultimo = serie.puntos[serie.puntos.length - 1]!;
    const convertido = aEurosConstantes(100, primero.anio, ultimo.anio, serie);
    expect(convertido).toBeCloseTo((100 * ultimo.indice) / primero.indice, 9);
    expect(convertido).toBeGreaterThan(100);
  });
});

describe('normativa', () => {
  const ficheros = readdirSync(path.join(DATA, 'normativa')).filter((f) => f.endsWith('.json'));

  it('cada norma de la cronología tiene ID BOE y URL del BOE coherentes', () => {
    if (!ficheros.includes('cronologia.json')) return;
    const cronologia = ArchivoCronologia.parse(leer('normativa/cronologia.json'));
    for (const norma of cronologia.normas) {
      expect(norma.boeId, norma.id).toMatch(/^BOE-A-\d{4}-\d+$/);
      expect(norma.source.url, norma.id).toMatch(/^https:\/\/www\.boe\.es\//);
      expect(norma.source.url, norma.id).toContain(norma.boeId);
      expect(norma.fechaPublicacion >= norma.fecha, norma.id).toBe(true);
    }
    const fechas = cronologia.normas.map((n) => n.fecha);
    expect([...fechas].sort()).toEqual(fechas);
  });

  it('cada prestación cita artículos y fuente', () => {
    if (!ficheros.includes('prestaciones.json')) return;
    const prestaciones = ArchivoPrestaciones.parse(leer('normativa/prestaciones.json'));
    const ids = prestaciones.prestaciones.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const prestacion of prestaciones.prestaciones) {
      expect(prestacion.articulos.length, prestacion.id).toBeGreaterThan(0);
      expect(prestacion.source.url, prestacion.id).toMatch(/^https?:\/\//);
    }
  });
});

describe('cotización 2013-2026, MEI y cuota de solidaridad', () => {
  it('el tipo de contingencias comunes suma lo mismo cada año (empresa + trabajador)', () => {
    const emp = valoresPorAnio('tipo-cc-empresa');
    const tra = valoresPorAnio('tipo-cc-trabajador');
    for (const [anio, e] of emp) {
      const t = tra.get(anio);
      expect(t, `falta el tipo del trabajador de ${anio}`).toBeDefined();
      if (t) expect(Math.round((numero(e) + numero(t)) * 100) / 100).toBe(28.3);
    }
  });

  it('la base máxima supera a la mínima y ambas son positivas', () => {
    const max = valoresPorAnio('base-maxima-rg');
    const min = valoresPorAnio('base-minima-rg');
    for (const [anio, m] of min) {
      const mx = max.get(anio);
      expect(mx, `falta la base máxima de ${anio}`).toBeDefined();
      if (mx) expect(numero(mx)).toBeGreaterThan(numero(m));
    }
  });

  it('el MEI total es la suma de las partes de empresa y trabajador y crece hasta 2029', () => {
    const total = valoresPorAnio('mei-tipo-total');
    const emp = valoresPorAnio('mei-tipo-empresa');
    const tra = valoresPorAnio('mei-tipo-trabajador');
    let previo = 0;
    for (const anio of ['2023', '2024', '2025', '2026', '2027', '2028', '2029']) {
      const t = total.get(anio);
      expect(t, `falta el MEI de ${anio}`).toBeDefined();
      if (!t) continue;
      const suma = numero(emp.get(anio) as DatoConId) + numero(tra.get(anio) as DatoConId);
      expect(Math.round(suma * 100) / 100).toBe(numero(t));
      expect(numero(t)).toBeGreaterThan(previo);
      previo = numero(t);
    }
  });

  it('los tipos de la cuota de solidaridad crecen con el tramo', () => {
    const archivo = porId.get('cuota-solidaridad-tipos');
    expect((archivo?.data ?? []).length).toBe(6);
    for (const anio of ['2025', '2026']) {
      const t = ['a', 'b', 'c'].map((l) =>
        numero((archivo?.data ?? []).find((d) => d.id === `${anio}-tramo-${l}`) as DatoConId),
      );
      expect(t[0]).toBeLessThan(t[1] as number);
      expect(t[1]).toBeLessThan(t[2] as number);
    }
  });
});

describe('revalorización, pensiones máxima y mínimas, SMI e IPREM', () => {
  it('el SMI mensual no baja de un año a otro', () => {
    const smi = [...valoresPorAnio('smi-mensual').entries()].sort(([a], [b]) => a.localeCompare(b));
    for (let i = 1; i < smi.length; i++) {
      expect(numero(smi[i]?.[1] as DatoConId)).toBeGreaterThanOrEqual(
        numero(smi[i - 1]?.[1] as DatoConId),
      );
    }
  });

  it('la pensión máxima crece cada año disponible y la pensión mínima de jubilación respeta el orden por situación familiar', () => {
    const pm = [...valoresPorAnio('pension-maxima').entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    for (let i = 1; i < pm.length; i++) {
      expect(numero(pm[i]?.[1] as DatoConId)).toBeGreaterThan(numero(pm[i - 1]?.[1] as DatoConId));
    }
    const jub = porId.get('pension-minima-jubilacion');
    const get = (id: string) => numero((jub?.data ?? []).find((d) => d.id === id) as DatoConId);
    for (const anio of ['2010', '2015', '2020', '2023', '2025', '2026']) {
      const c = get(`${anio}-jub65-conyuge-cargo`);
      const u = get(`${anio}-jub65-unipersonal`);
      expect(c).toBeGreaterThan(u);
      if ((jub?.data ?? []).some((d) => d.id === `${anio}-jub65-conyuge-no-cargo`)) {
        expect(u).toBeGreaterThan(get(`${anio}-jub65-conyuge-no-cargo`));
      }
    }
  });

  it('la revalorización general está en un rango razonable y la pensión no contributiva crece', () => {
    for (const d of valoresPorAnio('revalorizacion-general').values()) {
      expect(numero(d)).toBeGreaterThanOrEqual(0);
      expect(numero(d)).toBeLessThan(10);
    }
    const pnc = [...valoresPorAnio('pnc-importe-anual').entries()].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    for (let i = 1; i < pnc.length; i++) {
      expect(numero(pnc[i]?.[1] as DatoConId)).toBeGreaterThan(
        numero(pnc[i - 1]?.[1] as DatoConId),
      );
    }
  });

  it('el IPREM mensual, anual y diario son coherentes (anual = 12 × mensual con redondeo)', () => {
    const m = valoresPorAnio('iprem-mensual');
    const a = valoresPorAnio('iprem-anual');
    for (const [anio, dm] of m) {
      expect(Math.abs(numero(a.get(anio) as DatoConId) - 12 * numero(dm))).toBeLessThan(0.1);
    }
  });
});

describe('cronología y prestaciones', () => {
  it('cubre las normas pedidas (ley 26/1985 a RDL 2/2023) y todas tienen fuente y módulos', () => {
    const c = ArchivoCronologia.parse(leer('normativa/cronologia.json'));
    const ids = new Set(c.normas.map((n) => n.id));
    for (const id of [
      'ley-26-1985',
      'ley-24-1997',
      'ley-35-2002',
      'ley-40-2007',
      'ley-27-2011',
      'rdl-5-2013',
      'ley-23-2013',
      'rdleg-8-2015',
      'rdl-28-2018',
      'ley-21-2021',
      'rdl-2-2023',
    ]) {
      expect(ids.has(id), `falta ${id}`).toBe(true);
    }
    const fechas = c.normas.map((n) => n.fecha);
    expect([...fechas].sort()).toEqual(fechas);
  });

  it('las reglas de prestaciones incluyen jubilación, incapacidad, supervivencia, no contributivas, mínimos y Clases Pasivas', () => {
    const p = ArchivoPrestaciones.parse(leer('normativa/prestaciones.json'));
    const ids = new Set(p.prestaciones.map((x) => x.id));
    for (const id of [
      'jubilacion-ordinaria',
      'jubilacion-parcial',
      'jubilacion-activa',
      'jubilacion-flexible',
      'incapacidad-permanente',
      'viudedad',
      'orfandad',
      'favor-de-familiares',
      'pnc-incapacidad',
      'pnc-jubilacion',
      'complemento-minimos',
      'clases-pasivas',
    ]) {
      expect(ids.has(id), `falta ${id}`).toBe(true);
    }
  });
});
