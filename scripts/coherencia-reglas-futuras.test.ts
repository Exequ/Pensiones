// @vitest-environment node
/**
 * Tests de coherencia de las reglas de evolución futura y de cálculo (Fase 1A-bis):
 * calendarios completos, coincidencia con los datos observados y citas presentes.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, type DatoConId } from '../src/engine/esquema-datos.ts';

const PARAMETROS = path.resolve(import.meta.dirname, '../data/parametros');

function datos(id: string): DatoConId[] {
  const json = JSON.parse(readFileSync(path.join(PARAMETROS, `${id}.json`), 'utf8')) as unknown;
  return ArchivoDatos.parse(json).data ?? [];
}

function porPeriodo(id: string): Map<number, number> {
  return new Map(
    datos(id).map((d) => {
      if (typeof d.value !== 'number') throw new Error(`${id} ${d.id}: valor no numérico`);
      return [Number(d.period), d.value];
    }),
  );
}

function valor(m: Map<number, number>, anio: number): number {
  const v = m.get(anio);
  if (v === undefined) throw new Error(`Falta ${anio}`);
  return v;
}

const rango = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => a + i);

describe('incrementos futuros de la base máxima y de la pensión máxima', () => {
  it('base máxima: 1,2 puntos porcentuales cada año de 2024 a 2050, sin huecos', () => {
    const m = porPeriodo('base-maxima-incremento-futuro');
    expect([...m.keys()]).toEqual(rango(2024, 2050));
    for (const v of m.values()) expect(v).toBe(1.2);
  });

  it('pensión máxima: 0,115 puntos porcentuales cada año de 2025 a 2050, sin huecos', () => {
    const m = porPeriodo('pension-maxima-incremento-futuro');
    expect([...m.keys()]).toEqual(rango(2025, 2050));
    for (const v of m.values()) expect(v).toBe(0.115);
  });

  it('la base máxima de 2024-2026 crece la revalorización más 1,2 puntos (redondeo a céntimos)', () => {
    const base = porPeriodo('base-maxima-rg');
    const reval = porPeriodo('revalorizacion-general');
    for (const a of [2024, 2025, 2026]) {
      const crecimiento = (valor(base, a) / valor(base, a - 1) - 1) * 100;
      expect(crecimiento, String(a)).toBeCloseTo(valor(reval, a) + 1.2, 1);
      expect(Math.abs(crecimiento - (valor(reval, a) + 1.2))).toBeLessThan(0.02);
    }
  });

  it('la pensión máxima de 2025-2026 crece la revalorización más 0,115 puntos', () => {
    const maxima = porPeriodo('pension-maxima');
    const reval = porPeriodo('revalorizacion-general');
    for (const a of [2025, 2026]) {
      const crecimiento = (valor(maxima, a) / valor(maxima, a - 1) - 1) * 100;
      expect(Math.abs(crecimiento - (valor(reval, a) + 0.115)), String(a)).toBeLessThan(0.01);
    }
  });
});

describe('regla de revalorización y de pensiones mínimas', () => {
  const regla = new Map(datos('revalorizacion-regla').map((d) => [d.id, d.value]));
  it('doce meses de IPC que terminan en noviembre, suelo en 0 %', () => {
    expect(regla.get('2024-meses-medicion')).toBe(12);
    expect(regla.get('2024-ultimo-mes-medicion')).toBe(11);
    expect(regla.get('2024-suelo')).toBe(0);
  });

  it('la reducción de la brecha de las mínimas crece de 2024 a 2027 hasta el 100 %', () => {
    const d = datos('pension-minima-regla').filter((x) => x.id.endsWith('-brecha-reducida'));
    expect(d.map((x) => x.period)).toEqual(['2024', '2025', '2026', '2027']);
    expect(d.map((x) => x.value)).toEqual([20, 30, 50, 100]);
  });
});

describe('opción de 25 años y calendario del periodo de cálculo', () => {
  const ventana = porPeriodo('opcion-25-anos-ventana');
  const divisor = porPeriodo('opcion-25-anos-divisor');
  const aplicable = porPeriodo('opcion-25-anos-aplicable');

  it('2026-2040: 300 meses y divisor 350; 2041-2043: 306, 312 y 318 meses', () => {
    for (const a of rango(2026, 2040)) {
      expect(valor(ventana, a)).toBe(300);
      expect(valor(divisor, a)).toBe(350);
    }
    expect([2041, 2042, 2043].map((a) => valor(ventana, a))).toEqual([306, 312, 318]);
    expect([2041, 2042, 2043].map((a) => valor(divisor, a))).toEqual([357, 364, 371]);
    expect([...ventana.keys()]).toEqual(rango(2026, 2043));
  });

  it('el divisor es siempre la ventana × 14/12', () => {
    for (const a of ventana.keys())
      expect(valor(divisor, a)).toBeCloseTo((valor(ventana, a) * 14) / 12, 6);
  });

  it('está disponible de 2026 a 2043 y no en 2044', () => {
    for (const a of rango(2026, 2043)) expect(valor(aplicable, a)).toBe(1);
    expect(valor(aplicable, 2044)).toBe(0);
  });

  it('el calendario de periodo-calculo y divisor sigue la DT 5.ª (2013-2022) y la DT 40.ª (2026-2037)', () => {
    const periodo = porPeriodo('periodo-calculo-base-reguladora');
    const div = porPeriodo('divisor-base-reguladora');
    for (const a of rango(2013, 2022)) {
      expect(valor(periodo, a), String(a)).toBe(180 + 12 * (a - 2012));
      expect(valor(div, a), String(a)).toBeCloseTo((valor(periodo, a) * 14) / 12, 6);
    }
    for (const a of rango(2023, 2025))
      expect([valor(periodo, a), valor(div, a)]).toEqual([300, 350]);
    for (const a of rango(2026, 2036)) {
      const mejores = 302 + 2 * (a - 2026);
      expect(valor(periodo, a), String(a)).toBe(304 + 4 * (a - 2026));
      expect(Math.abs(valor(div, a) - (mejores * 14) / 12), String(a)).toBeLessThan(0.01);
    }
    expect([valor(periodo, 2037), valor(div, 2037)]).toEqual([348, 378]);
  });
});

describe('lagunas y actualización de bases', () => {
  const lagunas = new Map(datos('lagunas-integracion').map((d) => [d.id, d.value]));
  it('desde 2013, 48 meses al 100 % y el resto al 50 % de la base mínima (también en 2016 y 2026)', () => {
    for (const v of [2013, 2016, 2026]) {
      expect([
        lagunas.get(`${v}-tramo1-meses`),
        lagunas.get(`${v}-tramo1-pct-base-minima`),
        lagunas.get(`${v}-tramo2-pct-base-minima`),
      ]).toEqual([48, 100, 50]);
    }
    expect(lagunas.get('2010-tramo1-pct-base-minima')).toBe(100);
    expect(lagunas.has('2010-tramo2-pct-base-minima')).toBe(false);
  });

  it('en todas las versiones, 24 meses en valor nominal y el IPC del mes 25 como referencia', () => {
    const a = datos('actualizacion-bases');
    expect(a.filter((d) => d.id.endsWith('-meses-nominales')).map((d) => d.value)).toEqual([
      24, 24, 24, 24,
    ]);
    expect(a.filter((d) => d.id.endsWith('-mes-indice-referencia')).map((d) => d.value)).toEqual([
      25, 25, 25, 25,
    ]);
  });
});

describe('procedencia de los ficheros de reglas', () => {
  const FICHEROS = [
    'base-maxima-incremento-futuro',
    'pension-maxima-incremento-futuro',
    'revalorizacion-regla',
    'pension-minima-regla',
    'opcion-25-anos-ventana',
    'opcion-25-anos-divisor',
    'opcion-25-anos-aplicable',
    'lagunas-integracion',
    'actualizacion-bases',
  ];
  for (const id of FICHEROS) {
    it(`${id}: cada dato lleva cita literal y localización, y las segundas fuentes coinciden`, () => {
      for (const d of datos(id)) {
        expect(d.quote, `${id} ${d.id}`).toBeTruthy();
        expect(d.location, `${id} ${d.id}`).toBeTruthy();
        if (d.crossCheck) expect(d.crossCheck.matches, `${id} ${d.id}`).toBe(true);
      }
    });
  }
});
