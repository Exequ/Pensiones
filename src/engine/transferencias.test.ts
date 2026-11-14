import { describe, expect, it } from 'vitest';
import type { FilaEjecucion } from './sistema-historico';
import {
  acumuladaDesde,
  acumuladoTrimestral,
  flujoDelTrimestre,
  flujosTrimestrales,
  aniosConDescenso,
  mesesDeFlujo,
  posicionIlustrativa,
  puntosTrimestrales,
  type PuntoTrimestral,
} from './transferencias';

const fila = (periodo: string, columna: string, reconocido: number | null): FilaEjecucion => ({
  periodo,
  tabla: 'ingresos-cap1-cap4',
  concepto: 'DEL ESTADO Y ORG.AUTÓNOMOS',
  columna,
  reconocido,
});

describe('acumuladoTrimestral', () => {
  it('prefiere la cifra principal y usa la comparativa si no hay otra', () => {
    const filas = [
      fila('2020-T1', 'comparativa', 100),
      fila('2020-T2', 'comparativa', 190),
      fila('2020-T2', 'principal', 200),
      fila('2020-T4', 'principal', 450),
      { ...fila('2020-T3', 'principal', 300), concepto: 'OTRO' },
    ];
    expect(
      acumuladoTrimestral(filas, {
        tabla: 'ingresos-cap1-cap4',
        concepto: 'DEL ESTADO Y ORG.AUTÓNOMOS',
      }),
    ).toEqual([
      { anio: 2020, trimestre: 1, valor: 100 },
      { anio: 2020, trimestre: 2, valor: 200 },
      { anio: 2020, trimestre: 4, valor: 450 },
    ]);
  });

  it('falla si hay dos cifras principales para el mismo periodo', () => {
    const filas = [fila('2020-T1', 'principal', 1), fila('2020-T1', 'principal', 2)];
    expect(() =>
      acumuladoTrimestral(filas, {
        tabla: 'ingresos-cap1-cap4',
        concepto: 'DEL ESTADO Y ORG.AUTÓNOMOS',
      }),
    ).toThrow(RangeError);
  });
});

describe('flujosTrimestrales', () => {
  const acumulado: PuntoTrimestral[] = [
    { anio: 2020, trimestre: 1, valor: 100 },
    { anio: 2020, trimestre: 2, valor: 250 },
    { anio: 2020, trimestre: 3, valor: 330 },
    { anio: 2020, trimestre: 4, valor: 500 },
    // 2021: falta el segundo trimestre, por lo que el tercero no se puede calcular.
    { anio: 2021, trimestre: 1, valor: 40 },
    { anio: 2021, trimestre: 3, valor: 400 },
    { anio: 2021, trimestre: 4, valor: 480 },
  ];

  it('el primer trimestre es su acumulado y los demás, la diferencia con el anterior', () => {
    const flujos = flujosTrimestrales(acumulado);
    expect(flujos.filter((p) => p.anio === 2020).map((p) => p.valor)).toEqual([100, 150, 80, 170]);
  });

  it('omite los trimestres cuyo acumulado anterior falta (no estima)', () => {
    const flujos = flujosTrimestrales(acumulado).filter((p) => p.anio === 2021);
    expect(flujos).toEqual([
      { anio: 2021, trimestre: 1, valor: 40 },
      { anio: 2021, trimestre: 4, valor: 80 },
    ]);
  });

  it('la suma de los cuatro flujos de un año completo es el acumulado de cierre', () => {
    const suma = flujosTrimestrales(acumulado)
      .filter((p) => p.anio === 2020)
      .reduce((s, p) => s + p.valor, 0);
    expect(suma).toBe(500);
  });

  it('flujoDelTrimestre devuelve una serie anual', () => {
    expect(flujoDelTrimestre(flujosTrimestrales(acumulado), 4)).toEqual([
      { anio: 2020, valor: 170 },
      { anio: 2021, valor: 80 },
    ]);
  });
});

describe('acumuladaDesde', () => {
  const flujo = [
    { anio: 2018, valor: 10 },
    { anio: 2019, valor: 20 },
    { anio: 2020, valor: 30 },
    { anio: 2021, valor: 5 },
  ];

  it('suma desde el año de inicio, incluido, y descarta los anteriores', () => {
    expect(acumuladaDesde(flujo, 2019)).toEqual([
      { anio: 2019, valor: 20 },
      { anio: 2020, valor: 50 },
      { anio: 2021, valor: 55 },
    ]);
  });

  it('con el primer año disponible, la acumulada es la suma de todo', () => {
    expect(acumuladaDesde(flujo, 2018).at(-1)?.valor).toBe(65);
  });

  it('un año de inicio distinto cambia el resultado final', () => {
    expect(acumuladaDesde(flujo, 2020).at(-1)?.valor).toBe(35);
    expect(acumuladaDesde(flujo, 2021).at(-1)?.valor).toBe(5);
  });

  it('falla si el año de inicio no tiene dato', () => {
    expect(() => acumuladaDesde(flujo, 2015)).toThrow(RangeError);
  });

  it('no depende del orden de entrada', () => {
    expect(acumuladaDesde([...flujo].reverse(), 2019)).toEqual(acumuladaDesde(flujo, 2019));
  });
});

describe('mesesDeFlujo', () => {
  it('saldo ÷ (flujo anual ÷ 12)', () => {
    // 6.000 de saldo con 12.000 al año (1.000 al mes) = 6 meses.
    expect(mesesDeFlujo([{ anio: 2020, valor: 6000 }], [{ anio: 2020, valor: 12000 }], 12)).toEqual(
      [{ anio: 2020, valor: 6 }],
    );
  });

  it('saldo ÷ (flujo trimestral ÷ 3): los mismos datos dan otro resultado según el periodo', () => {
    // 3.000 en el trimestre = 1.000 al mes: 6.000 de saldo equivalen a 6 meses; con 6.000 en el
    // trimestre (2.000 al mes) equivalen a 3 meses.
    const saldo = [{ anio: 2020, valor: 6000 }];
    expect(mesesDeFlujo(saldo, [{ anio: 2020, valor: 3000 }], 3)[0]?.valor).toBe(6);
    expect(mesesDeFlujo(saldo, [{ anio: 2020, valor: 6000 }], 3)[0]?.valor).toBe(3);
  });

  it('solo calcula los años comunes y no inventa los que faltan', () => {
    const saldo = [
      { anio: 2019, valor: 100 },
      { anio: 2020, valor: 200 },
    ];
    expect(mesesDeFlujo(saldo, [{ anio: 2020, valor: 1200 }], 12)).toEqual([
      { anio: 2020, valor: 2 },
    ]);
  });

  it('falla con un flujo cero o negativo', () => {
    expect(() => mesesDeFlujo([{ anio: 2020, valor: 1 }], [{ anio: 2020, valor: 0 }], 12)).toThrow(
      RangeError,
    );
  });
});

describe('posicionIlustrativa', () => {
  const entrada = {
    fondo: [
      { anio: 2018, valor: 100 },
      { anio: 2019, valor: 90 },
      { anio: 2020, valor: 80 },
    ],
    deuda: [
      { anio: 2018, valor: 1000 },
      { anio: 2019, valor: 1100 },
      { anio: 2020, valor: 1300 },
    ],
    transferenciasAnuales: [
      { anio: 2018, valor: 10 },
      { anio: 2019, valor: 20 },
      { anio: 2020, valor: 30 },
    ],
  };
  const todo = { fondo: true, deuda: true, transferencias: true } as const;

  it('suma Fondo, deuda y transferencias acumuladas desde el año de inicio', () => {
    const filas = posicionIlustrativa(entrada, 2018, todo);
    expect(filas.map((f) => f.transferencias)).toEqual([10, 30, 60]);
    expect(filas.map((f) => f.suma)).toEqual([1110, 1220, 1440]);
  });

  it('desactivar un componente lo excluye de la suma pero conserva sus valores', () => {
    const filas = posicionIlustrativa(entrada, 2018, { ...todo, deuda: false });
    expect(filas.map((f) => f.suma)).toEqual([110, 120, 140]);
    expect(filas.map((f) => f.deuda)).toEqual([1000, 1100, 1300]);
  });

  it('solo las transferencias: la suma es la acumulada', () => {
    const filas = posicionIlustrativa(entrada, 2019, {
      fondo: false,
      deuda: false,
      transferencias: true,
    });
    expect(filas.map((f) => [f.anio, f.suma])).toEqual([
      [2019, 20],
      [2020, 50],
    ]);
  });

  it('sin ningún componente seleccionado, la suma es nula', () => {
    const filas = posicionIlustrativa(entrada, 2018, {
      fondo: false,
      deuda: false,
      transferencias: false,
    });
    expect(filas.every((f) => f.suma === null)).toBe(true);
  });

  it('omite los años en que falta el Fondo o la deuda', () => {
    const filas = posicionIlustrativa(
      { ...entrada, fondo: entrada.fondo.filter((p) => p.anio !== 2019) },
      2018,
      todo,
    );
    expect(filas.map((f) => f.anio)).toEqual([2018, 2020]);
  });

  it('el año de inicio cambia las transferencias acumuladas y la suma', () => {
    const a = posicionIlustrativa(entrada, 2018, todo).at(-1);
    const b = posicionIlustrativa(entrada, 2020, todo).at(-1);
    expect(a?.transferencias).toBe(60);
    expect(b?.transferencias).toBe(30);
    expect((a?.suma ?? 0) - (b?.suma ?? 0)).toBe(30);
  });
});

describe('puntosTrimestrales y aniosConDescenso', () => {
  const serie = {
    id: 'x',
    title: 'x',
    unit: 'x',
    source: { title: 't', publisher: 'p', url: 'https://example.org' },
    fetchedAt: '2026-01-01',
    confidence: 'alta' as const,
    points: [
      { period: '2020-T2', value: 2 },
      { period: '2020-T1', value: 1 },
    ],
  };

  it('lee y ordena los periodos trimestrales', () => {
    expect(puntosTrimestrales(serie).map((p) => [p.anio, p.trimestre, p.valor])).toEqual([
      [2020, 1, 1],
      [2020, 2, 2],
    ]);
  });

  it('rechaza una serie anual', () => {
    expect(() => puntosTrimestrales({ ...serie, points: [{ period: '2020', value: 1 }] })).toThrow(
      RangeError,
    );
  });

  it('detecta los años con descenso respecto al año anterior', () => {
    expect(
      aniosConDescenso([
        { anio: 2018, valor: 10 },
        { anio: 2019, valor: 12 },
        { anio: 2020, valor: 11 },
        { anio: 2021, valor: 11 },
        { anio: 2023, valor: 5 },
      ]),
    ).toEqual([2020]);
  });
});
