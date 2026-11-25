import { describe, expect, it } from 'vitest';
import {
  componentesDotacion,
  estadoDePlazos,
  plazoDePrestamo,
  type FilaDotacionAcumulada,
} from './fondo-reserva';

const fila = (
  anio: number,
  entidades: number,
  mutuas: number,
  mei: number,
  disposiciones = 0,
): FilaDotacionAcumulada => ({
  anio,
  entidades,
  mutuas,
  mei,
  total: entidades + mutuas + mei,
  disposiciones,
});

describe('componentes de dotación del Fondo de Reserva', () => {
  const filas = [
    fila(2000, 100, 1, 0),
    fila(2001, 150, 2, 0),
    fila(2002, 150, 3, 0, -10),
    fila(2003, 150, 3, 0, -20),
    fila(2004, 150, 3, 0, -20),
    fila(2005, 150, 4, 0),
    fila(2006, 150, 5, 7),
  ];

  it('lee el último año de las entidades, el primero del MEI y los años sin mutuas', () => {
    const c = componentesDotacion(filas);
    expect(c.sumaCuadra).toBe(true);
    expect(c.ultimoAnioEntidades).toBe(2001);
    expect(c.primerAnioMei).toBe(2006);
    expect(c.tramosSinMutuas).toEqual([[2003, 2004]]);
    expect(c.aniosConMutuas).toEqual([2001, 2002, 2005, 2006]);
    expect(c.aniosConDisposicion).toEqual([2002, 2003]);
  });

  it('avisa si los componentes no suman la dotación acumulada', () => {
    const rota = filas.map((f) => (f.anio === 2004 ? { ...f, total: 999 } : f));
    expect(componentesDotacion(rota).sumaCuadra).toBe(false);
  });

  it('sin años sin mutuas, el tramo está vacío', () => {
    const todos = [fila(2000, 1, 1, 0), fila(2001, 2, 2, 0), fila(2002, 2, 3, 1)];
    expect(componentesDotacion(todos).tramosSinMutuas).toEqual([]);
  });

  it('falla si no hay aportación de las entidades o del MEI', () => {
    expect(() => componentesDotacion([fila(2000, 1, 1, 0), fila(2001, 1, 2, 0)])).toThrow(
      /Sin aportaciones/,
    );
  });
});

describe('plazos de los préstamos del anexo', () => {
  it('lee «10 años a partir de 2018» (con y sin «a») y acaba el último día del año diez', () => {
    expect(plazoDePrestamo('10 años a partir de 2018')).toEqual({
      anios: 10,
      desde: 2018,
      hasta: 2027,
    });
    expect(plazoDePrestamo('10 años partir de 2014')?.hasta).toBe(2023);
    expect(plazoDePrestamo('No se indica')).toBeNull();
  });

  it('ninguno de los recientes ha vencido a fin del año de referencia si todos acaban después', () => {
    const lineas = [
      { vencimiento: '10 años a partir de 2018', anioConcesion: 2017 },
      { vencimiento: '10 años a partir de 2019', anioConcesion: 2018 },
      { vencimiento: '10 años partir de 2014', anioConcesion: null },
      { vencimiento: '10 años a partir de 2015', anioConcesion: null },
      { vencimiento: 'No se indica', anioConcesion: null },
    ];
    const e = estadoDePlazos(lineas, 2023);
    expect(e.recientes).toEqual({ desde: 2017, hasta: 2018 });
    expect(e.primerVencimientoReciente).toBe(2027);
    expect(e.ningunoRecienteVencido).toBe(true);
    expect(e.antiguosVencidos).toBe(1);
    expect(e.antiguosSinPlazo).toBe(1);
    expect(estadoDePlazos(lineas, 2027).ningunoRecienteVencido).toBe(false);
  });
});
