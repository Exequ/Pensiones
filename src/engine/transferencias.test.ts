import { describe, expect, it } from 'vitest';
import type { FilaEjecucion } from './sistema-historico';
import {
  acumuladaDesde,
  acumuladoTrimestral,
  flujoDelTrimestre,
  flujosTrimestrales,
  aniosConDescenso,
  apoyoFinancieroDelEstado,
  mesesDeFlujo,
  posicionNeta,
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

describe('posicionNeta («Fondo menos deuda»)', () => {
  // Cálculo a mano: 2020: 10 − 25 = −15; 2021: 8 − 25 = −17; 2022: 30 − 20 = +10 (activo mayor que pasivo).
  const fondo = [
    { anio: 2020, valor: 10 },
    { anio: 2021, valor: 8 },
    { anio: 2022, valor: 30 },
    { anio: 2023, valor: 5 },
  ];
  const deuda = [
    { anio: 2019, valor: 99 },
    { anio: 2020, valor: 25 },
    { anio: 2021, valor: 25 },
    { anio: 2022, valor: 20 },
  ];

  it('resta la deuda al Fondo año a año y conserva el signo', () => {
    expect(posicionNeta(fondo, deuda).map((f) => [f.anio, f.neta])).toEqual([
      [2020, -15],
      [2021, -17],
      [2022, 10],
    ]);
  });

  it('solo incluye los años con los dos datos', () => {
    const anios = posicionNeta(fondo, deuda).map((f) => f.anio);
    expect(anios).not.toContain(2019);
    expect(anios).not.toContain(2023);
  });

  it('devuelve también cada componente, para la tabla accesible', () => {
    expect(posicionNeta(fondo, deuda)[0]).toEqual({ anio: 2020, fondo: 10, deuda: 25, neta: -15 });
  });

  it('sin años comunes, no hay filas', () => {
    expect(posicionNeta([{ anio: 2000, valor: 1 }], [{ anio: 2001, valor: 1 }])).toEqual([]);
  });
});

describe('apoyoFinancieroDelEstado («deuda más transferencias acumuladas»)', () => {
  // Cálculo a mano con inicio en 2021: transferencias anuales 2020: 7 (no cuenta), 2021: 4, 2022: 6, 2023: 1.
  // Acumuladas desde 2021: 4, 10, 11. Deuda: 2021: 20, 2022: 22, 2023: 21.
  // Apoyo = deuda + acumuladas: 24, 32, 32.
  const transferenciasAnuales = [
    { anio: 2020, valor: 7 },
    { anio: 2021, valor: 4 },
    { anio: 2022, valor: 6 },
    { anio: 2023, valor: 1 },
  ];
  const deuda = [
    { anio: 2020, valor: 18 },
    { anio: 2021, valor: 20 },
    { anio: 2022, valor: 22 },
    { anio: 2023, valor: 21 },
  ];

  it('suma la deuda de cada año y las transferencias acumuladas desde el año de inicio', () => {
    expect(
      apoyoFinancieroDelEstado({ deuda, transferenciasAnuales }, 2021).map((f) => [
        f.anio,
        f.transferencias,
        f.apoyo,
      ]),
    ).toEqual([
      [2021, 4, 24],
      [2022, 10, 32],
      [2023, 11, 32],
    ]);
  });

  it('con otro año de inicio cambia solo la parte de transferencias', () => {
    // Inicio en 2020: acumuladas 7, 11, 17, 18; apoyo 25, 31, 39, 39.
    expect(
      apoyoFinancieroDelEstado({ deuda, transferenciasAnuales }, 2020).map((f) => f.apoyo),
    ).toEqual([25, 31, 39, 39]);
  });

  it('no incluye años anteriores al de inicio ni años sin deuda', () => {
    const filas = apoyoFinancieroDelEstado(
      { deuda: deuda.filter((p) => p.anio !== 2022), transferenciasAnuales },
      2021,
    );
    expect(filas.map((f) => f.anio)).toEqual([2021, 2023]);
    // La acumulada de 2023 sigue contando 2022 aunque no haya deuda ese año: 4 + 6 + 1 = 11.
    expect(filas[1]?.transferencias).toBe(11);
  });

  it('falla si el año de inicio no tiene dato (no empieza en otro año sin avisar)', () => {
    expect(() => apoyoFinancieroDelEstado({ deuda, transferenciasAnuales }, 2010)).toThrow(
      RangeError,
    );
  });
});
