import { describe, expect, it } from 'vitest';
import type { PuntoAnual } from './series-historicas';
import {
  CLASES_PENSION,
  compararMediaAltasBajas,
  gastoAproximadoPensiones,
  leerEjecucion,
  mesesDeGasto,
  serieEjecucion,
  type ClasePension,
} from './sistema-historico';

const CABECERA =
  'ejercicio,periodo,tabla,concepto,columna,definitivo,prevision_o_presupuesto_meur,derechos_u_obligaciones_meur,recaudacion_o_pagos_meur';

const CSV = [
  CABECERA,
  '2017,2017-T4,gastos-cap4,INVALIDEZ,comparativa,,,100,',
  '2018,2018-T4,gastos-cap4,INVALIDEZ,principal,no,,110,',
  '2018,2018-T4,gastos-cap4,INVALIDEZ,comparativa,no,,99,',
  '2019,2019-T4,gastos-cap4,INCAPACIDAD PERMANENTE,principal,sí,,120,',
  '2019,2019-T4,gastos,INCAPACIDAD PERMANENTE,principal,sí,,7,',
  '2019,2019-T3,gastos-cap4,INCAPACIDAD PERMANENTE,principal,sí,,1,',
  '2020,2020-T4,gastos-cap4,"CON, COMA",principal,sí,,5,',
  '2020,2020-T4,gastos-cap4,SIN IMPORTE,principal,sí,,,',
].join('\n');

describe('serieEjecucion', () => {
  const filas = leerEjecucion(CSV);

  it('toma la cifra principal; la comparativa solo si no hay principal; admite alias', () => {
    const serie = serieEjecucion(filas, {
      tabla: 'gastos-cap4',
      concepto: ['INVALIDEZ', 'INCAPACIDAD PERMANENTE'],
      desde: 2017,
      hasta: 2019,
    });
    expect(serie).toEqual([
      { anio: 2017, valor: 100 },
      { anio: 2018, valor: 110 },
      { anio: 2019, valor: 120 },
    ]);
  });

  it('distingue la tabla y el trimestre', () => {
    const serie = serieEjecucion(filas, {
      tabla: 'gastos',
      concepto: 'INCAPACIDAD PERMANENTE',
      desde: 2019,
      hasta: 2019,
    });
    expect(serie).toEqual([{ anio: 2019, valor: 7 }]);
  });

  it('lee conceptos con comas entre comillas', () => {
    expect(
      serieEjecucion(filas, {
        tabla: 'gastos-cap4',
        concepto: 'CON, COMA',
        desde: 2020,
        hasta: 2020,
      }),
    ).toEqual([{ anio: 2020, valor: 5 }]);
  });

  it('falla si falta la fila, si hay ambigüedad o si no hay importe (no rellena huecos)', () => {
    expect(() =>
      serieEjecucion(filas, {
        tabla: 'gastos-cap4',
        concepto: 'VIUDEDAD',
        desde: 2018,
        hasta: 2018,
      }),
    ).toThrow(/0 filas/);
    const duplicada = leerEjecucion(
      [
        CABECERA,
        '2018,2018-T4,gastos,X,principal,no,,1,',
        '2018,2018-T4,gastos,X,principal,no,,2,',
      ].join('\n'),
    );
    expect(() =>
      serieEjecucion(duplicada, { tabla: 'gastos', concepto: 'X', desde: 2018, hasta: 2018 }),
    ).toThrow(/2 filas/);
    expect(() =>
      serieEjecucion(filas, {
        tabla: 'gastos-cap4',
        concepto: 'SIN IMPORTE',
        desde: 2020,
        hasta: 2020,
      }),
    ).toThrow(/no tiene importe/);
  });
});

function porClase(
  valor: (clase: ClasePension) => PuntoAnual[],
): Record<ClasePension, PuntoAnual[]> {
  return Object.fromEntries(CLASES_PENSION.map((c) => [c, valor(c)])) as Record<
    ClasePension,
    PuntoAnual[]
  >;
}

describe('gastoAproximadoPensiones', () => {
  it('suma número × media × 14 ÷ 1.000.000 de las cinco clases', () => {
    // Cada clase: 1.000.000 de pensiones de 100 €/mes → 1.400 M€ por clase, 7.000 M€ en total.
    const numero = porClase(() => [{ anio: 2020, valor: 1_000_000 }]);
    const media = porClase(() => [{ anio: 2020, valor: 100 }]);
    expect(gastoAproximadoPensiones(numero, media)).toEqual([{ anio: 2020, valor: 7000 }]);
  });

  it('con otro número de pagas cambia en proporción', () => {
    const numero = porClase(() => [{ anio: 2020, valor: 1_000_000 }]);
    const media = porClase(() => [{ anio: 2020, valor: 100 }]);
    expect(gastoAproximadoPensiones(numero, media, 12)).toEqual([{ anio: 2020, valor: 6000 }]);
  });

  it('descarta los años en que alguna clase no tiene número o pensión media', () => {
    const numero = porClase((c) => [
      { anio: 2020, valor: 1_000_000 },
      ...(c === 'orfandad' ? [] : [{ anio: 2021, valor: 1_000_000 }]),
    ]);
    const media = porClase(() => [
      { anio: 2020, valor: 100 },
      { anio: 2021, valor: 100 },
    ]);
    expect(gastoAproximadoPensiones(numero, media).map((p) => p.anio)).toEqual([2020]);
  });
});

describe('mesesDeGasto', () => {
  it('un fondo igual a un doceavo del gasto anual son un mes', () => {
    expect(mesesDeGasto([{ anio: 2020, valor: 100 }], [{ anio: 2020, valor: 1200 }])).toEqual([
      { anio: 2020, valor: 1 },
    ]);
  });

  it('solo años comunes y falla con gasto no positivo', () => {
    expect(
      mesesDeGasto(
        [
          { anio: 2019, valor: 600 },
          { anio: 2020, valor: 100 },
        ],
        [{ anio: 2019, valor: 1200 }],
      ),
    ).toEqual([{ anio: 2019, valor: 6 }]);
    expect(() => mesesDeGasto([{ anio: 2020, valor: 1 }], [{ anio: 2020, valor: 0 }])).toThrow();
  });
});

describe('compararMediaAltasBajas', () => {
  const f = (anio: number, movimiento: string, clase: string, pensionMedia: number | null, sexo = 'ambos') => ({
    anio,
    movimiento,
    clase,
    sexo,
    pensionMedia,
  });
  const filas = [
    // Clase A: altas por encima de bajas en los dos años (1.200 > 900 y 1.300 > 1.000).
    f(2024, 'alta-inicial', 'a', 1200),
    f(2024, 'baja-definitiva', 'a', 900),
    f(2025, 'alta-inicial', 'a', 1300),
    f(2025, 'baja-definitiva', 'a', 1000),
    // Clase B: altas por debajo de bajas en los dos años.
    f(2024, 'alta-inicial', 'b', 400),
    f(2024, 'baja-definitiva', 'b', 450),
    f(2025, 'alta-inicial', 'b', 410),
    f(2025, 'baja-definitiva', 'b', 460),
    // Clase C: signo distinto según el año.
    f(2024, 'alta-inicial', 'c', 500),
    f(2024, 'baja-definitiva', 'c', 400),
    f(2025, 'alta-inicial', 'c', 500),
    f(2025, 'baja-definitiva', 'c', 600),
    // Clase D: solo hay media de las altas; no se puede comparar. Otro sexo: se ignora.
    f(2025, 'alta-inicial', 'd', 700),
    f(2025, 'alta-inicial', 'a', 1, 'mujeres'),
  ];

  it('clasifica cada clase según el signo de la diferencia en todos los años con dato', () => {
    const r = compararMediaAltasBajas(filas, ['a', 'b', 'c', 'd']);
    expect(r.altasSuperior).toEqual(['a']);
    expect(r.altasInferior).toEqual(['b']);
    expect(r.mixtas).toEqual(['c', 'd']);
  });

  it('informa del primer y el último año comparados y no usa otro sexo que «ambos»', () => {
    const r = compararMediaAltasBajas(filas, ['a']);
    expect(r.desde).toBe(2024);
    expect(r.hasta).toBe(2025);
    expect(r.altasSuperior).toEqual(['a']);
  });

  it('sin datos devuelve años cero y todas las clases como mixtas', () => {
    const r = compararMediaAltasBajas([], ['a']);
    expect(r).toEqual({ altasSuperior: [], altasInferior: [], mixtas: ['a'], desde: 0, hasta: 0 });
  });
});
