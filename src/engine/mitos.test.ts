import { describe, expect, it } from 'vitest';
import {
  aniosSinDato,
  diferenciasEntreMedidas,
  filasRevalorizacion,
  mediaPeriodo,
  mesesAAnios,
  minimoPorValor,
  proporcion,
  razonAPorcentaje,
  tramosDeAnios,
} from './mitos';

const p = (anio: number, valor: number) => ({ anio, valor });

describe('aniosSinDato y tramosDeAnios', () => {
  it('encuentra los huecos de una serie y los agrupa en tramos', () => {
    const serie = [p(2009, 1), p(2010, 1), p(2013, 1), p(2014, 1)];
    expect(aniosSinDato(serie, 2009, 2014)).toEqual([2011, 2012]);
    expect(aniosSinDato(serie, 2013, 2014)).toEqual([]);
    expect(tramosDeAnios([2011, 2012, 2015])).toEqual([
      [2011, 2012],
      [2015, 2015],
    ]);
    expect(tramosDeAnios([])).toEqual([]);
  });
});

describe('mediaPeriodo', () => {
  it('promedia los valores anuales del intervalo', () => {
    expect(mediaPeriodo([p(2022, 10), p(2023, 20), p(2024, 30)], 2022, 2024)).toBe(20);
    expect(mediaPeriodo([p(2022, 10), p(2023, 20), p(2024, 30)], 2023, 2024)).toBe(25);
  });
  it('falla si falta algún año: no promedia un subconjunto', () => {
    expect(() => mediaPeriodo([p(2022, 10), p(2024, 30)], 2022, 2024)).toThrow(/2023/);
  });
});

describe('filasRevalorizacion', () => {
  const revalorizacion = [p(2010, 1), p(2013, 1), p(2014, 0.25)];
  const media = [p(2010, 1.8), p(2011, 3.2), p(2013, 1.4), p(2014, -0.2)];
  const diciembre = [p(2010, 3), p(2013, 0.3), p(2014, -1)];
  const filas = filasRevalorizacion(revalorizacion, media, diciembre, 2010, 2014);

  it('una fila por año, con huecos como null y sin rellenar', () => {
    expect(filas.map((f) => f.anio)).toEqual([2010, 2011, 2012, 2013, 2014]);
    expect(filas[1]).toMatchObject({
      anio: 2011,
      revalorizacion: null,
      ipcMedia: 3.2,
      ipcDiciembre: null,
      diferenciaMedia: null,
      diferenciaDiciembre: null,
    });
    expect(filas[2]?.ipcMedia).toBeNull();
  });
  it('las diferencias solo existen donde están las dos cifras', () => {
    expect(filas[0]?.diferenciaMedia).toBeCloseTo(-0.8, 10);
    expect(filas[0]?.diferenciaDiciembre).toBeCloseTo(-2, 10);
    expect(filas[4]?.diferenciaMedia).toBeCloseTo(0.45, 10);
    expect(filas[4]?.diferenciaDiciembre).toBeCloseTo(1.25, 10);
  });
  it('no existe ningún campo de acumulado', () => {
    expect(Object.keys(filas[0] ?? {}).some((k) => /acumul/i.test(k))).toBe(false);
  });
});

describe('proporcion, diferenciasEntreMedidas y conversiones', () => {
  it('proporción de la parte sobre el total en los años comunes', () => {
    expect(proporcion([p(2020, 50), p(2021, 30)], [p(2020, 200), p(2022, 5)])).toEqual([
      p(2020, 0.25),
    ]);
    expect(() => proporcion([p(2020, 1)], [p(2020, 0)])).toThrow(RangeError);
  });
  it('diferencias por pares con la etiqueta de cada par', () => {
    const d = diferenciasEntreMedidas([
      { etiqueta: 'A', puntos: [p(2020, -10)] },
      { etiqueta: 'B', puntos: [p(2020, -4)] },
      { etiqueta: 'C', puntos: [p(2020, -7)] },
    ]);
    expect(d.map((x) => x.etiqueta)).toEqual(['A − B', 'A − C', 'B − C']);
    expect(d[0]?.puntos).toEqual([p(2020, -6)]);
  });
  it('meses a años, razón a porcentaje y mínimo', () => {
    expect(mesesAAnios([p(2025, 800)])[0]?.valor).toBeCloseTo(66 + 8 / 12, 10);
    expect(razonAPorcentaje([p(2024, 0.5)])[0]?.valor).toBeCloseTo(50, 10);
    expect(minimoPorValor([p(2020, 3), p(2021, -2), p(2022, 0)])).toEqual(p(2021, -2));
    expect(() => minimoPorValor([])).toThrow(RangeError);
  });
});
