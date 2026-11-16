import { describe, expect, it } from 'vitest';
import { aniosFaltantes, empalmarConRuptura, partirPorTramos } from './series-empalme';

const tramoA = {
  clave: 'liquidacion',
  etiqueta: 'Liquidación',
  puntos: [
    { anio: 2011, valor: 20 },
    { anio: 2010, valor: 10 },
  ],
};
const tramoB = {
  clave: 'ejecucion',
  etiqueta: 'Ejecución',
  puntos: [
    { anio: 2012, valor: 30 },
    { anio: 2013, valor: 40 },
  ],
};

describe('empalmarConRuptura', () => {
  it('ordena los años, recuerda el tramo de cada uno y señala el año de ruptura', () => {
    const e = empalmarConRuptura([tramoB, tramoA]);
    expect(e.puntos.map((p) => p.anio)).toEqual([2010, 2011, 2012, 2013]);
    expect(e.puntos.map((p) => p.valor)).toEqual([10, 20, 30, 40]);
    expect(e.tramoDelAnio.get(2011)).toBe('liquidacion');
    expect(e.tramoDelAnio.get(2012)).toBe('ejecucion');
    expect(e.rupturas).toEqual([2012]);
    expect(e.tramos.map((t) => t.clave)).toEqual(['liquidacion', 'ejecucion']);
  });

  it('un solo tramo no tiene ruptura', () => {
    expect(empalmarConRuptura([tramoA]).rupturas).toEqual([]);
  });

  it('falla si dos tramos comparten un año: habría que elegir una cifra', () => {
    const solapado = { ...tramoB, puntos: [{ anio: 2011, valor: 99 }] };
    expect(() => empalmarConRuptura([tramoA, solapado])).toThrow(/2011.*dos tramos/);
  });

  it('falla con un tramo vacío', () => {
    expect(() => empalmarConRuptura([tramoA, { ...tramoB, puntos: [] }])).toThrow(
      /sin puntos|no tiene puntos/,
    );
  });

  it('señala la ruptura aunque falte algún año entre los tramos', () => {
    const lejano = { ...tramoB, puntos: [{ anio: 2015, valor: 5 }] };
    const e = empalmarConRuptura([tramoA, lejano]);
    expect(e.rupturas).toEqual([2015]);
    expect(aniosFaltantes(e.puntos)).toEqual([2012, 2013, 2014]);
  });
});

describe('partirPorTramos', () => {
  it('devuelve cada cálculo en el tramo de su año y descarta los años sin tramo', () => {
    const e = empalmarConRuptura([tramoA, tramoB]);
    const calculo = [
      { anio: 2010, valor: 1 },
      { anio: 2012, valor: 3 },
      { anio: 2013, valor: 4 },
      { anio: 2020, valor: 9 },
    ];
    const partido = partirPorTramos(calculo, e);
    expect(partido.get('liquidacion')).toEqual([{ anio: 2010, valor: 1 }]);
    expect(partido.get('ejecucion')).toEqual([
      { anio: 2012, valor: 3 },
      { anio: 2013, valor: 4 },
    ]);
  });
});

describe('aniosFaltantes', () => {
  it('una serie continua no tiene huecos y una vacía tampoco', () => {
    expect(aniosFaltantes(empalmarConRuptura([tramoA, tramoB]).puntos)).toEqual([]);
    expect(aniosFaltantes([])).toEqual([]);
  });
});
