import { describe, expect, it } from 'vitest';
import {
  aEurosConstantesConIpcSupuesto,
  diferenciasPorAnio,
  esIlustrativo,
  indiceDesdeBase,
  partirIlustrativo,
  porcentajeAImporte,
  razonPorAnio,
  tasaDeVariacionAnual,
  tasaReal,
  unirObservadoProyeccion,
} from './proyecciones';
import { porcentajeDelPib } from './series-historicas';

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

describe('Fase 5-B2: euros constantes con el IPC supuesto', () => {
  it('con un IPC del 2 % y base 2025: 2025 no cambia, 2026 se divide entre 1,02 y 2027 entre 1,02²', () => {
    // Casos calculados a mano: 1.020 / 1,02 = 1.000; 1.040,4 / 1,0404 = 1.000.
    const r = aEurosConstantesConIpcSupuesto(
      [p(2025, 1000), p(2026, 1020), p(2027, 1040.4)],
      0.02,
      2025,
    );
    expect(r[0]?.valor).toBeCloseTo(1000, 9);
    expect(r[1]?.valor).toBeCloseTo(1000, 9);
    expect(r[2]?.valor).toBeCloseTo(1000, 9);
  });

  it('un año anterior a la base se revaloriza hasta ella y un IPC nulo no cambia nada', () => {
    // 1.000 de 2024 son 1.020 euros de 2025 con un 2 % de inflación.
    expect(aEurosConstantesConIpcSupuesto([p(2024, 1000)], 0.02, 2025)[0]?.valor).toBeCloseTo(
      1020,
      9,
    );
    expect(aEurosConstantesConIpcSupuesto([p(2030, 1234)], 0, 2025)[0]?.valor).toBe(1234);
  });

  it('un IPC de −100 % o inferior no es válido', () => {
    expect(() => aEurosConstantesConIpcSupuesto([p(2026, 1)], -1, 2025)).toThrow(RangeError);
  });

  it('coincide con la fórmula del euro constante con un índice de precios que crece a la misma tasa', () => {
    const indice = (anio: number) => 100 * 1.03 ** (anio - 2025);
    const importe = 5000;
    const esperado = (importe * indice(2025)) / indice(2030);
    expect(aEurosConstantesConIpcSupuesto([p(2030, importe)], 0.03, 2025)[0]?.valor).toBeCloseTo(
      esperado,
      9,
    );
  });
});

describe('Fase 5-B2: porcentaje del PIB y límites en euros', () => {
  it('importe ÷ PIB × 100: 11 de 200 es el 5,5 %', () => {
    const r = porcentajeDelPib([p(2026, 11), p(2027, 30)], [p(2026, 200), p(2027, 400)]);
    expect(r.map((x) => x.valor)).toEqual([5.5, 7.5]);
  });

  it('un límite del 0,5 % de un PIB de 200.000 son 1.000, y solo en los años comunes', () => {
    const r = porcentajeAImporte(
      [p(2033, 0.5), p(2034, 0.25), p(2099, 1)],
      [p(2033, 200000), p(2034, 400000)],
    );
    expect(r).toEqual([p(2033, 1000), p(2034, 1000)]);
  });

  it('el porcentaje y su paso inverso son coherentes', () => {
    const pib = [p(2040, 3_000_000)];
    const importe = porcentajeAImporte([p(2040, 0.28)], pib);
    expect(porcentajeDelPib(importe, pib)[0]?.valor).toBeCloseTo(0.28, 12);
  });
});

describe('Fase 5-B2: índice base cien del gasto sobre el PIB', () => {
  it('11, 12,1 y 13,2 con base en el primero dan 100, 110 y 120', () => {
    const r = indiceDesdeBase([p(2026, 11), p(2027, 12.1), p(2028, 13.2)], 2026);
    expect(r[0]?.valor).toBeCloseTo(100, 9);
    expect(r[1]?.valor).toBeCloseTo(110, 9);
    expect(r[2]?.valor).toBeCloseTo(120, 9);
  });

  it('dos series con niveles distintos (11 y 13,7) y el mismo crecimiento tienen el mismo índice y diferencia nula', () => {
    const a = indiceDesdeBase([p(2026, 11), p(2030, 12.1)], 2026);
    const b = indiceDesdeBase([p(2026, 13.7), p(2030, 15.07)], 2026);
    const d = diferenciasPorAnio(a, b);
    expect(d).toHaveLength(2);
    for (const x of d) expect(x.diferencia).toBeCloseTo(0, 9);
  });

  it('la diferencia es modelo menos referencia: 120 frente a 110 son +10 puntos de índice', () => {
    const d = diferenciasPorAnio([p(2040, 120)], [p(2040, 110)]);
    expect(d[0]?.diferencia).toBe(10);
  });
});

describe('Fase 5-B2: tasas anuales', () => {
  it('100, 110 y 121 crecen un 10 % cada año; el primer año no tiene tasa', () => {
    const r = tasaDeVariacionAnual([p(2026, 100), p(2027, 110), p(2028, 121)]);
    expect(r.map((x) => x.anio)).toEqual([2027, 2028]);
    expect(r[0]?.valor).toBeCloseTo(0.1, 12);
    expect(r[1]?.valor).toBeCloseTo(0.1, 12);
  });

  it('salta los años sin el anterior inmediato y los saltos por un valor previo nulo', () => {
    expect(tasaDeVariacionAnual([p(2026, 100), p(2028, 121)])).toEqual([]);
    expect(tasaDeVariacionAnual([p(2026, 0), p(2027, 5)])).toEqual([]);
  });

  it('tasa real: un 3,02 % nominal con un 2 % de IPC es un 1 % real (1,0302 / 1,02 = 1,01)', () => {
    expect(tasaReal(0.0302, 0.02)).toBeCloseTo(0.01, 12);
    expect(tasaReal(0.02, 0.02)).toBeCloseTo(0, 12);
    expect(() => tasaReal(0.01, -1)).toThrow(RangeError);
  });
});
