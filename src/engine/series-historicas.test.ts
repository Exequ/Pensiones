import { describe, expect, it } from 'vitest';
import { ArchivoDatos } from './esquema-datos';
import {
  aniosComunes,
  cociente,
  datoDeArchivo,
  datoDeSerie,
  diferencia,
  encontrarSerie,
  escalar,
  extremos,
  filasCsv,
  indiceBase100,
  mayorCaida,
  mayorVariacionInteranual,
  maximo,
  minimo,
  numeroCsv,
  parsearCsv,
  porcentajeDelPib,
  puntosAnuales,
  puntosDeDatos,
  recortar,
  suma,
  valorEn,
  variacion,
  type PuntoAnual,
} from './series-historicas';

const p = (anio: number, valor: number): PuntoAnual => ({ anio, valor });

const FUENTE = { title: 'T', publisher: 'P', url: 'https://example.org/x' };

const ARCHIVO = ArchivoDatos.parse({
  id: 'prueba',
  title: 'Prueba',
  description: 'Fichero de prueba',
  series: [
    {
      id: 'a',
      title: 'A',
      unit: 'personas',
      source: FUENTE,
      fetchedAt: '2026-11-11',
      confidence: 'alta',
      notes: 'nota',
      points: [
        { period: '2002', value: 30 },
        { period: '2000', value: 10 },
        { period: '2001', value: 20 },
      ],
    },
    {
      id: 'trimestral',
      title: 'T',
      unit: 'x',
      source: FUENTE,
      fetchedAt: '2026-11-11',
      confidence: 'media',
      points: [{ period: '2000-T1', value: 1 }],
    },
  ],
  data: [
    {
      id: '2033',
      value: 0.1,
      unit: '% del PIB',
      period: '2033',
      source: FUENTE,
      fetchedAt: '2026-11-11',
      confidence: 'alta',
    },
    {
      id: '2034',
      value: 0.12,
      unit: '% del PIB',
      period: '2034',
      source: FUENTE,
      fetchedAt: '2026-11-11',
      confidence: 'alta',
    },
  ],
});

describe('lectura de series', () => {
  it('ordena por año y rechaza periodos no anuales', () => {
    const serie = encontrarSerie(ARCHIVO, 'a');
    expect(puntosAnuales(serie)).toEqual([p(2000, 10), p(2001, 20), p(2002, 30)]);
    expect(() => puntosAnuales(encontrarSerie(ARCHIVO, 'trimestral'))).toThrow(/no es anual/);
  });

  it('falla con una serie inexistente', () => {
    expect(() => encontrarSerie(ARCHIVO, 'no-existe')).toThrow(/no-existe/);
  });

  it('lee los datos sueltos de un fichero', () => {
    expect(puntosDeDatos(ARCHIVO)).toEqual([p(2033, 0.1), p(2034, 0.12)]);
  });

  it('construye el Dato de la fuente (último punto o periodo indicado)', () => {
    const serie = encontrarSerie(ARCHIVO, 'a');
    const ultimo = datoDeSerie(serie);
    expect(ultimo.period).toBe('2002');
    expect(ultimo.value).toBe(30);
    expect(ultimo.confidence).toBe('alta');
    expect(ultimo.source.url).toBe(FUENTE.url);
    expect(datoDeSerie(serie, '2000').value).toBe(10);
    expect(() => datoDeSerie(serie, '1999')).toThrow();
    expect(datoDeArchivo(ARCHIVO, '2034').value).toBe(0.12);
    expect(() => datoDeArchivo(ARCHIVO, '1900')).toThrow();
  });
});

describe('derivados', () => {
  const a = [p(2000, 10), p(2001, 20), p(2002, 40)];
  const b = [p(2001, 5), p(2002, 8), p(2003, 9)];

  it('valorEn, extremos, recortar y aniosComunes', () => {
    expect(valorEn(a, 2001)).toBe(20);
    expect(valorEn(a, 1990)).toBeUndefined();
    expect(extremos(a)).toEqual({ primero: p(2000, 10), ultimo: p(2002, 40) });
    expect(() => extremos([])).toThrow();
    expect(recortar(a, 2001, 2005)).toEqual([p(2001, 20), p(2002, 40)]);
    expect(aniosComunes(a, b)).toEqual([2001, 2002]);
  });

  it('índice base 100: base 2001 = 100, 2000 = 50, 2002 = 200', () => {
    expect(indiceBase100(a, 2001)).toEqual([p(2000, 50), p(2001, 100), p(2002, 200)]);
    expect(() => indiceBase100(a, 1999)).toThrow(/año base/);
    expect(() => indiceBase100([p(2000, 0)], 2000)).toThrow(/cero/);
  });

  it('cociente, suma y diferencia solo con los años comunes', () => {
    expect(cociente(a, b)).toEqual([p(2001, 4), p(2002, 5)]);
    expect(suma(a, b)).toEqual([p(2001, 25), p(2002, 48)]);
    expect(diferencia(a, b)).toEqual([p(2001, 15), p(2002, 32)]);
    expect(() => cociente(a, [p(2001, 0)])).toThrow(/cero/);
  });

  it('porcentaje del PIB: 50 M€ sobre 2.000 M€ son 2,5 puntos', () => {
    expect(porcentajeDelPib([p(2020, 50)], [p(2020, 2000)])).toEqual([p(2020, 2.5)]);
  });

  it('escalar multiplica cada valor', () => {
    expect(escalar([p(2000, 3)], 14)).toEqual([p(2000, 42)]);
  });

  it('variación absoluta y relativa; relativa nula si parte de cero', () => {
    expect(variacion(a)).toEqual({
      desde: 2000,
      hasta: 2002,
      valorDesde: 10,
      valorHasta: 40,
      absoluta: 30,
      relativa: 3,
    });
    expect(variacion(a, 2001, 2002).relativa).toBe(1);
    expect(variacion([p(2000, 0), p(2001, 5)]).relativa).toBeNull();
    expect(() => variacion(a, 1990, 2001)).toThrow();
  });

  it('máximo y mínimo', () => {
    const s = [p(2000, 3), p(2001, 9), p(2002, 1), p(2003, 9)];
    expect(maximo(s)).toEqual(p(2001, 9));
    expect(minimo(s)).toEqual(p(2002, 1));
  });
});

describe('mayorCaida', () => {
  it('encuentra la caída de pico a valle más profunda', () => {
    // pico 10 (2001) → valle 4 (2003): caída 6; pico 12 (2005) → valle 9 (2006): caída 3.
    const s = [
      p(2000, 8),
      p(2001, 10),
      p(2002, 7),
      p(2003, 4),
      p(2004, 11),
      p(2005, 12),
      p(2006, 9),
    ];
    expect(mayorCaida(s)).toEqual({
      maximo: p(2001, 10),
      minimo: p(2003, 4),
      absoluta: 6,
      relativa: 0.6,
    });
  });

  it('una serie que nunca baja no tiene caída', () => {
    expect(mayorCaida([p(2000, 1), p(2001, 1), p(2002, 5)])).toBeNull();
    expect(mayorCaida([])).toBeNull();
  });
});

describe('mayorVariacionInteranual', () => {
  it('devuelve el salto relativo más grande entre años consecutivos', () => {
    // 100→110 (+10 %), 110→330 (+200 %), 330→300 (−9,09 %)
    const salto = mayorVariacionInteranual([
      p(2000, 100),
      p(2001, 110),
      p(2002, 330),
      p(2003, 300),
    ]);
    expect(salto?.desde).toBe(2001);
    expect(salto?.hasta).toBe(2002);
    expect(salto?.relativa).toBeCloseTo(2, 10);
    expect(salto?.absoluta).toBe(220);
  });

  it('cuenta las bajadas por su valor absoluto y salta los huecos de años', () => {
    const s = [p(2000, 100), p(2001, 20), p(2003, 1000)];
    expect(mayorVariacionInteranual(s)?.relativa).toBeCloseTo(-0.8, 10);
  });

  it('sin pares válidos devuelve null', () => {
    expect(mayorVariacionInteranual([p(2000, 0), p(2001, 5)])).toBeNull();
    expect(mayorVariacionInteranual([p(2000, 1)])).toBeNull();
  });
});

describe('CSV', () => {
  it('lee celdas con comas entre comillas y comillas dobles escapadas', () => {
    expect(parsearCsv('a,b,c\n1,"x, y","dice ""hola"""\n')).toEqual([
      ['a', 'b', 'c'],
      ['1', 'x, y', 'dice "hola"'],
    ]);
  });

  it('admite CRLF, última fila sin salto y celdas vacías', () => {
    expect(parsearCsv('a,b\r\n1,\r\n2,3')).toEqual([
      ['a', 'b'],
      ['1', ''],
      ['2', '3'],
    ]);
  });

  it('filasCsv devuelve objetos con las cabeceras', () => {
    expect(filasCsv('anio,valor\n2020,5\n2021,')).toEqual([
      { anio: '2020', valor: '5' },
      { anio: '2021', valor: '' },
    ]);
    expect(filasCsv('')).toEqual([]);
  });

  it('numeroCsv: vacío es null y un texto no numérico falla', () => {
    expect(numeroCsv('12.5')).toBe(12.5);
    expect(numeroCsv('')).toBeNull();
    expect(numeroCsv(undefined)).toBeNull();
    expect(() => numeroCsv('abc')).toThrow();
  });
});
