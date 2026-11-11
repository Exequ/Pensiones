import { describe, expect, it } from 'vitest';
import {
  aEurosConstantes,
  factorEurosConstantes,
  rebasarSerie,
  serieAEurosConstantes,
  serieIPCDesdeDatos,
  type SerieIPC,
} from './euros-constantes';

/** Serie de PRUEBA, inventada: no son datos reales del IPC. */
const SERIE_PRUEBA: SerieIPC = {
  id: 'ipc-prueba',
  descripcion: 'Serie inventada para tests',
  puntos: [
    { anio: 2020, indice: 100 },
    { anio: 2021, indice: 102 },
    { anio: 2022, indice: 110 },
    { anio: 2023, indice: 125 },
  ],
};

describe('euros constantes', () => {
  it('el factor es el cociente de índices', () => {
    expect(factorEurosConstantes(SERIE_PRUEBA, 2020, 2023)).toBeCloseTo(1.25, 12);
    expect(factorEurosConstantes(SERIE_PRUEBA, 2023, 2020)).toBeCloseTo(0.8, 12);
  });

  it('un importe del propio año base no cambia', () => {
    expect(aEurosConstantes(1000, 2022, 2022, SERIE_PRUEBA)).toBe(1000);
  });

  it('lleva importes pasados a euros del año base', () => {
    expect(aEurosConstantes(1000, 2020, 2023, SERIE_PRUEBA)).toBeCloseTo(1250, 9);
    expect(aEurosConstantes(1100, 2022, 2020, SERIE_PRUEBA)).toBeCloseTo(1000, 9);
  });

  it('convierte una serie de importes', () => {
    const resultado = serieAEurosConstantes(
      [
        { anio: 2020, importe: 1000 },
        { anio: 2023, importe: 1250 },
      ],
      2023,
      SERIE_PRUEBA,
    );
    expect(resultado[0]?.importe).toBeCloseTo(1250, 9);
    expect(resultado[1]?.importe).toBeCloseTo(1250, 9);
  });

  it('es transitiva: ir de A a B y de B a C equivale a ir de A a C', () => {
    const directo = aEurosConstantes(500, 2020, 2023, SERIE_PRUEBA);
    const enDosPasos = aEurosConstantes(
      aEurosConstantes(500, 2020, 2021, SERIE_PRUEBA),
      2021,
      2023,
      SERIE_PRUEBA,
    );
    expect(enDosPasos).toBeCloseTo(directo, 9);
  });

  it('rebasa la serie a 100 en el año elegido sin cambiar los factores', () => {
    const rebasada = rebasarSerie(SERIE_PRUEBA, 2022);
    expect(rebasada.puntos.find((p) => p.anio === 2022)?.indice).toBeCloseTo(100, 12);
    expect(factorEurosConstantes(rebasada, 2020, 2023)).toBeCloseTo(
      factorEurosConstantes(SERIE_PRUEBA, 2020, 2023),
      12,
    );
  });

  it('falla con años sin dato o series mal formadas', () => {
    expect(() => aEurosConstantes(1000, 2019, 2023, SERIE_PRUEBA)).toThrow(
      /no tiene dato para 2019/,
    );
    expect(() =>
      aEurosConstantes(1, 2020, 2020, { id: 'x', puntos: [{ anio: 2020, indice: 0 }] }),
    ).toThrow(/índice no válido/);
    expect(() =>
      aEurosConstantes(1, 2020, 2020, {
        id: 'x',
        puntos: [
          { anio: 2020, indice: 1 },
          { anio: 2020, indice: 2 },
        ],
      }),
    ).toThrow(/repetido/);
    expect(() => aEurosConstantes(Number.NaN, 2020, 2021, SERIE_PRUEBA)).toThrow(RangeError);
  });

  it('adapta una serie anual de /data y rechaza una trimestral', () => {
    const base = {
      id: 'ipc-prueba',
      title: 'IPC de prueba',
      unit: 'índice',
      source: { title: 'Prueba', publisher: 'Prueba', url: 'https://example.org/' },
      fetchedAt: '2024-01-01',
      confidence: 'alta' as const,
    };
    const anual = serieIPCDesdeDatos({
      ...base,
      points: [
        { period: '2020', value: 100 },
        { period: '2021', value: 103 },
      ],
    });
    expect(anual.puntos).toEqual([
      { anio: 2020, indice: 100 },
      { anio: 2021, indice: 103 },
    ]);
    expect(() =>
      serieIPCDesdeDatos({ ...base, points: [{ period: '2020-T1', value: 100 }] }),
    ).toThrow(/no es anual/);
  });
});
