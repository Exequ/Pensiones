import { describe, expect, it } from 'vitest';
import {
  diferenciasRespectoA,
  ordenarPorValor,
  seleccionarPaises,
  separarEtiquetas,
  ultimoPunto,
  valorEnAnio,
} from './comparativa-internacional';

describe('ordenarPorValor', () => {
  const valores = [
    { pais: 'B', valor: 10 },
    { pais: 'A', valor: 12.5 },
    { pais: 'D', valor: null },
    { pais: 'C', valor: 10 },
    { pais: 'E', valor: 3 },
  ];

  it('ordena de mayor a menor, con los países sin dato al final', () => {
    expect(ordenarPorValor(valores).map((v) => v.pais)).toEqual(['A', 'B', 'C', 'E', 'D']);
  });

  it('el empate se rompe por código de país (orden determinista)', () => {
    const otro = [valores[3], valores[0]].filter((v) => v !== undefined);
    expect(ordenarPorValor(otro).map((v) => v.pais)).toEqual(['B', 'C']);
  });

  it('ordena de menor a mayor si se pide, también con los países sin dato al final', () => {
    expect(ordenarPorValor(valores, 'ascendente').map((v) => v.pais)).toEqual([
      'E',
      'B',
      'C',
      'A',
      'D',
    ]);
  });

  it('no modifica la entrada', () => {
    const copia = JSON.stringify(valores);
    ordenarPorValor(valores);
    expect(JSON.stringify(valores)).toBe(copia);
  });
});

describe('seleccionarPaises', () => {
  const datos = [{ pais: 'ESP' }, { pais: 'FRA' }, { pais: 'ITA' }, { pais: 'EU27' }];
  it('conserva el orden de entrada y admite lista o conjunto', () => {
    expect(seleccionarPaises(datos, ['ITA', 'ESP']).map((d) => d.pais)).toEqual(['ESP', 'ITA']);
    expect(seleccionarPaises(datos, new Set(['EU27'])).map((d) => d.pais)).toEqual(['EU27']);
  });
  it('una selección vacía no devuelve nada y un país desconocido se ignora', () => {
    expect(seleccionarPaises(datos, [])).toEqual([]);
    expect(seleccionarPaises(datos, ['XXX'])).toEqual([]);
  });
});

describe('diferenciasRespectoA', () => {
  it('resta el valor de España (caso hecho a mano)', () => {
    const r = diferenciasRespectoA([
      { pais: 'ESP', valor: 12.5 },
      { pais: 'FRA', valor: 14 },
      { pais: 'DEU', valor: 10 },
      { pais: 'GBR', valor: null },
    ]);
    expect(r.map((x) => x.diferencia)).toEqual([0, 1.5, -2.5, null]);
  });
  it('sin dato de la referencia, todas las diferencias son nulas', () => {
    const r = diferenciasRespectoA([
      { pais: 'ESP', valor: null },
      { pais: 'FRA', valor: 14 },
    ]);
    expect(r.every((x) => x.diferencia === null)).toBe(true);
  });
  it('admite otra referencia', () => {
    const r = diferenciasRespectoA(
      [
        { pais: 'ITA', valor: 17 },
        { pais: 'FRA', valor: 14 },
      ],
      'ITA',
    );
    expect(r.map((x) => x.diferencia)).toEqual([0, -3]);
  });
});

describe('valorEnAnio y ultimoPunto', () => {
  const puntos = [
    { anio: 2000, valor: 8.1 },
    { anio: 2021, valor: 12.3 },
    { anio: 2010, valor: 9.1 },
  ];
  it('busca un año y devuelve null si no existe', () => {
    expect(valorEnAnio(puntos, 2010)).toBe(9.1);
    expect(valorEnAnio(puntos, 2011)).toBeNull();
  });
  it('el último punto es el de mayor año, aunque no esté al final', () => {
    expect(ultimoPunto(puntos)).toEqual({ anio: 2021, valor: 12.3 });
    expect(ultimoPunto([])).toBeUndefined();
  });
});

describe('separarEtiquetas', () => {
  it('no mueve etiquetas que ya están separadas', () => {
    expect(separarEtiquetas([10, 50, 90], 20, 0, 100)).toEqual([10, 50, 90]);
  });

  it('separa dos etiquetas pegadas y conserva el orden de entrada', () => {
    // Ideales 50 y 52 con separación 18: la de arriba se queda en 50 y la de abajo baja a 68.
    expect(separarEtiquetas([52, 50], 18, 0, 100)).toEqual([68, 50]);
  });

  it('empuja hacia arriba lo que se sale por abajo', () => {
    // Tres etiquetas en 95 con separación 18 y tope 100: la última queda en 100 y las otras dos
    // retroceden 18 píxeles cada una (82 y 64).
    expect(separarEtiquetas([95, 95, 95], 18, 0, 100)).toEqual([64, 82, 100]);
  });

  it('respeta los límites y reparte si no caben todas', () => {
    // Cuatro etiquetas en 40 píxeles con separación 18: solo caben a 40/3 de distancia.
    const r = separarEtiquetas([5, 6, 7, 8], 18, 0, 40);
    expect(r[0]).toBeCloseTo(0, 6);
    expect(r[3]).toBeCloseTo(40, 6);
    expect(r[1]).toBeCloseTo(40 / 3, 6);
  });

  it('una etiqueta fuera del intervalo se recoloca dentro', () => {
    expect(separarEtiquetas([-10], 18, 0, 100)).toEqual([0]);
    expect(separarEtiquetas([130], 18, 0, 100)).toEqual([100]);
  });

  it('sin etiquetas devuelve una lista vacía', () => {
    expect(separarEtiquetas([], 18, 0, 100)).toEqual([]);
  });
});
