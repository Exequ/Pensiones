import { describe, expect, it } from 'vitest';
import type { ArchivoDatos } from './esquema-datos';
import {
  aEurosConstantes,
  factorEurosConstantes,
  mayorDiferenciaEntreIndices,
  rebasarSerie,
  serieAEurosConstantes,
  serieIPCDesdeDatos,
  serieIPCDiciembreDesdeArchivo,
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

describe('IPC de diciembre frente a IPC medio anual (Ajustes actuariales 2)', () => {
  /** Archivo mensual de PRUEBA, inventado: junio y diciembre de 2020, enero y diciembre de 2025. */
  const mensual = {
    id: 'ipc-mensual-prueba',
    title: 'IPC mensual inventado',
    data: [
      { id: '2025-12', value: 130 },
      { id: '2020-06', value: 99 },
      { id: '2020-12', value: 104 },
      { id: '2025-01', value: 120 },
      { id: '2021-12', value: 108 },
    ],
  } as unknown as ArchivoDatos;
  const medias: SerieIPC = {
    id: 'ipc-medias-prueba',
    puntos: [
      { anio: 2020, indice: 100 },
      { anio: 2025, indice: 120 },
    ],
  };

  it('se queda con el mes de diciembre de cada año y los ordena', () => {
    expect(serieIPCDiciembreDesdeArchivo(mensual).puntos).toEqual([
      { anio: 2020, indice: 104 },
      { anio: 2021, indice: 108 },
      { anio: 2025, indice: 130 },
    ]);
  });

  it('caso a mano: 1.000 euros de diciembre de 2020 valen 1.250 euros de diciembre de 2025 (130 ÷ 104)', () => {
    const diciembre = serieIPCDiciembreDesdeArchivo(mensual);
    expect(aEurosConstantes(1000, 2020, 2025, diciembre)).toBeCloseTo(1250, 9);
  });

  it('con la media anual el mismo importe da 1.200 euros (120 ÷ 100): el deflactor cambia el resultado', () => {
    expect(aEurosConstantes(1000, 2020, 2025, medias)).toBeCloseTo(1200, 9);
    const diciembre = serieIPCDiciembreDesdeArchivo(mensual);
    expect(aEurosConstantes(1000, 2020, 2025, diciembre)).not.toBeCloseTo(
      aEurosConstantes(1000, 2020, 2025, medias),
      3,
    );
  });

  it('el año base conserva el importe con cualquiera de los dos deflactores', () => {
    const diciembre = serieIPCDiciembreDesdeArchivo(mensual);
    expect(aEurosConstantes(777, 2025, 2025, diciembre)).toBe(777);
    expect(aEurosConstantes(777, 2025, 2025, medias)).toBe(777);
  });

  it('rechaza un archivo sin diciembres, con diciembre repetido o con valor no numérico', () => {
    const sin = {
      id: 'x',
      title: 't',
      data: [{ id: '2020-06', value: 1 }],
    } as unknown as ArchivoDatos;
    expect(() => serieIPCDiciembreDesdeArchivo(sin)).toThrow(RangeError);
    const doble = {
      id: 'x',
      title: 't',
      data: [
        { id: '2020-12', value: 1 },
        { id: '2020-12', value: 2 },
      ],
    } as unknown as ArchivoDatos;
    expect(() => serieIPCDiciembreDesdeArchivo(doble)).toThrow(RangeError);
    const texto = {
      id: 'x',
      title: 't',
      data: [{ id: '2020-12', value: 'a' }],
    } as unknown as ArchivoDatos;
    expect(() => serieIPCDiciembreDesdeArchivo(texto)).toThrow(RangeError);
  });
});

describe('mayorDiferenciaEntreIndices', () => {
  const dic: SerieIPC = {
    id: 'dic',
    puntos: [
      { anio: 2020, indice: 102 },
      { anio: 2021, indice: 110 },
      { anio: 2022, indice: 121 },
    ],
  };
  const media: SerieIPC = {
    id: 'media',
    puntos: [
      { anio: 2020, indice: 100 },
      { anio: 2021, indice: 100 },
      { anio: 2022, indice: 120 },
      { anio: 2023, indice: 130 },
    ],
  };

  it('devuelve el año de mayor diferencia relativa absoluta entre los años comunes', () => {
    // 2020: 102 ÷ 100 − 1 = 0,02; 2021: 110 ÷ 100 − 1 = 0,10; 2022: 121 ÷ 120 − 1 ≈ 0,00833.
    const r = mayorDiferenciaEntreIndices(dic, media);
    expect(r?.anio).toBe(2021);
    expect(r?.relativa).toBeCloseTo(0.1, 12);
  });

  it('respeta el rango de años y cuenta las diferencias negativas por su valor absoluto', () => {
    const r = mayorDiferenciaEntreIndices(dic, media, 2022, 2022);
    expect(r?.anio).toBe(2022);
    const bajo: SerieIPC = { id: 'bajo', puntos: [{ anio: 2020, indice: 80 }] };
    expect(mayorDiferenciaEntreIndices(bajo, media)?.relativa).toBeCloseTo(-0.2, 12);
  });

  it('sin años comunes devuelve null', () => {
    expect(mayorDiferenciaEntreIndices(dic, media, 2030)).toBeNull();
  });
});
