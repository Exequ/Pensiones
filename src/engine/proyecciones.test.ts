import { describe, expect, it } from 'vitest';
import {
  diferenciasPorAnio,
  esIlustrativo,
  indiceDesdeBase,
  partirIlustrativo,
  razonPorAnio,
  unirObservadoProyeccion,
} from './proyecciones';

const p = (anio: number, valor: number) => ({ anio, valor });

describe('unirObservadoProyeccion', () => {
  it('separa lo observado de la proyección en el año de inicio', () => {
    const r = unirObservadoProyeccion(
      [p(2023, 10), p(2024, 11), p(2025, 12)],
      [p(2026, 13), p(2027, 14)],
    );
    expect(r.anioInicio).toBe(2026);
    expect(r.observado.map((x) => x.anio)).toEqual([2023, 2024, 2025]);
    expect(r.proyeccion.map((x) => x.anio)).toEqual([2026, 2027]);
    expect(r.solapados).toBe(0);
  });

  it('el año de inicio pertenece a la proyección: el observado de ese año no se duplica', () => {
    const r = unirObservadoProyeccion([p(2025, 12), p(2026, 12.5), p(2027, 99)], [p(2026, 13)]);
    expect(r.observado).toEqual([p(2025, 12)]);
    expect(r.proyeccion).toEqual([p(2026, 13)]);
    expect(r.solapados).toBe(2);
    // Nunca hay un año en las dos listas.
    const comunes = r.observado.filter((o) => r.proyeccion.some((q) => q.anio === o.anio));
    expect(comunes).toEqual([]);
  });

  it('ordena los puntos y admite una serie sin histórico', () => {
    const r = unirObservadoProyeccion([], [p(2028, 3), p(2026, 1), p(2027, 2)]);
    expect(r.proyeccion.map((x) => x.anio)).toEqual([2026, 2027, 2028]);
    expect(r.observado).toEqual([]);
  });

  it('falla con una proyección vacía o con años repetidos', () => {
    expect(() => unirObservadoProyeccion([p(2025, 1)], [])).toThrow(RangeError);
    expect(() => unirObservadoProyeccion([], [p(2026, 1), p(2026, 2)])).toThrow(/repite/);
  });
});

describe('partirIlustrativo', () => {
  const proy = [p(2048, 1), p(2049, 2), p(2050, 3), p(2051, 4), p(2052, 5)];

  it('el tramo ilustrativo empieza en el horizonte y repite su punto para unir las líneas', () => {
    const t = partirIlustrativo(proy, 2050);
    expect(t.presentada.map((x) => x.anio)).toEqual([2048, 2049, 2050]);
    expect(t.ilustrativa.map((x) => x.anio)).toEqual([2050, 2051, 2052]);
    expect(t.ilustrativa[0]).toEqual(p(2050, 3));
  });

  it('sin años posteriores o sin horizonte no hay tramo ilustrativo', () => {
    expect(partirIlustrativo(proy.slice(0, 3), 2050).ilustrativa).toEqual([]);
    const t = partirIlustrativo(proy, undefined);
    expect(t.presentada).toHaveLength(5);
    expect(t.ilustrativa).toEqual([]);
  });

  it('esIlustrativo es estricto: el año del horizonte no lo es', () => {
    expect(esIlustrativo(2050, 2050)).toBe(false);
    expect(esIlustrativo(2051, 2050)).toBe(true);
    expect(esIlustrativo(2100, undefined)).toBe(false);
  });
});

describe('diferenciasPorAnio', () => {
  it('calcula la diferencia y la diferencia relativa en los años comunes', () => {
    const modelo = [p(2026, 100), p(2027, 110), p(2028, 126)];
    const referencia = [p(2027, 100), p(2028, 120), p(2029, 130)];
    const d = diferenciasPorAnio(modelo, referencia);
    expect(d.map((x) => x.anio)).toEqual([2027, 2028]);
    expect(d[0]).toEqual({ anio: 2027, a: 110, b: 100, diferencia: 10, relativa: 0.1 });
    expect(d[1]?.diferencia).toBe(6);
    expect(d[1]?.relativa).toBeCloseTo(0.05, 12);
  });

  it('la diferencia relativa es null si la referencia vale cero', () => {
    expect(diferenciasPorAnio([p(2026, 5)], [p(2026, 0)])[0]?.relativa).toBeNull();
  });
});

describe('indiceDesdeBase (base 100)', () => {
  // Cálculo a mano: base 2026 = 50 → 2027: 55/50·100 = 110; 2028: 40/50·100 = 80; 2025 se descarta.
  it('rebasa a 100 en el año base y descarta los años anteriores', () => {
    const idx = indiceDesdeBase([p(2025, 45), p(2026, 50), p(2027, 55), p(2028, 40)], 2026);
    expect(idx.map((x) => x.anio)).toEqual([2026, 2027, 2028]);
    expect(idx[0]?.valor).toBe(100);
    expect(idx[1]?.valor).toBeCloseTo(110, 10);
    expect(idx[2]?.valor).toBeCloseTo(80, 10);
  });

  it('el índice de dos series con distinta escala es comparable', () => {
    // Miles de pensionistas y pensiones: 9.000 → 9.900 y 10.000 → 11.000 dan el mismo índice, 110.
    const a = indiceDesdeBase([p(2026, 9000), p(2030, 9900)], 2026);
    const b = indiceDesdeBase([p(2026, 10000), p(2030, 11000)], 2026);
    expect(a[1]?.valor).toBeCloseTo(110, 10);
    expect(b[1]?.valor).toBeCloseTo(110, 10);
    // Diferencia en puntos de índice entre dos series: 105 − 110 = −5.
    const d = diferenciasPorAnio([p(2030, 105)], [p(2030, 110)]);
    expect(d[0]?.diferencia).toBe(-5);
  });

  it('falla sin año base o con base cero', () => {
    expect(() => indiceDesdeBase([p(2027, 1)], 2026)).toThrow(RangeError);
    expect(() => indiceDesdeBase([p(2026, 0), p(2027, 1)], 2026)).toThrow(RangeError);
  });
});

describe('razonPorAnio', () => {
  it('divide año a año con un factor y salta los denominadores nulos o ausentes', () => {
    const r = razonPorAnio([p(2026, 30), p(2027, 10), p(2028, 8)], [p(2026, 60), p(2027, 0)], 100);
    expect(r).toEqual([p(2026, 50)]);
  });
});
