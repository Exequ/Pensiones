import { describe, expect, it } from 'vitest';
import { ticksAnuales, tramoDelEje } from './grafico-series';

describe('ticksAnuales', () => {
  it('años enteros con paso uniforme y sin pasar del máximo de marcas', () => {
    expect(ticksAnuales(2000, 2010, 6)).toEqual([2000, 2002, 2004, 2006, 2008, 2010]);
  });

  it('con pocos años, una marca por año', () => {
    expect(ticksAnuales(2021, 2025, 8)).toEqual([2021, 2022, 2023, 2024, 2025]);
  });

  it('añade el último año solo si no queda pegado a la última marca', () => {
    // paso 4 desde 2000: 2000, 2004, 2008; el último año (2010) está a 2 = paso/2 → se añade.
    expect(ticksAnuales(2000, 2010, 4)).toEqual([2000, 2004, 2008, 2010]);
    // paso 3 desde 2000 hasta 2013: 2012 y 2013 distan 1 < 1,5 → no se añade.
    expect(ticksAnuales(2000, 2013, 6)).toEqual([2000, 2003, 2006, 2009, 2012]);
  });

  it('un único año', () => {
    expect(ticksAnuales(2025, 2025, 5)).toEqual([2025]);
  });
});

describe('tramoDelEje', () => {
  const base = { apilado: false, incluirCero: false, alturaReservadaPx: 50, alturaTotalPx: 250 };

  it('deja un quinto del eje libre arriba cuando se reserva el 20 % de la altura', () => {
    // datos de 10 a 20, rango 10; fracción 0,2 → máximo = 20 + 10 × 0,2 / 0,8 = 22,5
    const [min, max] = tramoDelEje({ ...base, series: [[10, 20]] });
    expect(min).toBe(10);
    expect(max).toBeCloseTo(22.5, 10);
  });

  it('incluye el cero cuando se pide', () => {
    const [min, max] = tramoDelEje({ ...base, incluirCero: true, series: [[10, 20]] });
    expect(min).toBe(0);
    expect(max).toBeCloseTo(25, 10);
  });

  it('con valores negativos deja un margen del 4 % del rango bajo el mínimo y lleva el máximo a cero', () => {
    // rango = 0 − (−10) = 10 → mínimo = −10 − 0,4 = −10,4
    const [min, max] = tramoDelEje({ ...base, incluirCero: true, series: [[-10, -2]] });
    expect(min).toBeCloseTo(-10.4, 10);
    expect(max).toBeGreaterThan(0);
  });

  it('en barras apiladas el máximo es la suma por posición', () => {
    const [, max] = tramoDelEje({
      ...base,
      apilado: true,
      incluirCero: true,
      series: [
        [1, 2],
        [3, 4],
      ],
    });
    // máximo apilado 6; fracción 0,2 → 6 + 6 × 0,25 = 7,5
    expect(max).toBeCloseTo(7.5, 10);
  });

  it('sin datos devuelve un tramo válido', () => {
    expect(tramoDelEje({ ...base, series: [] })).toEqual([0, 1]);
  });
});
