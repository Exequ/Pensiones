import { describe, expect, it } from 'vitest';
import { catalogoPorDefecto } from './referencias-datos';
import {
  mesAbsoluto,
  procesarTramos,
  resumirTramos,
  textoDeHueco,
  type ContextoTramos,
  type TramoFormulario,
} from './tramos';

const catalogo = catalogoPorDefecto();
const CTX: ContextoTramos = {
  catalogo,
  definicionMedia: catalogo.mediaPorDefecto,
  mesPrevio: mesAbsoluto(2026, 10),
  nacimiento: mesAbsoluto(1961, 11),
};

let n = 0;
function tramo(
  desde: [number, number],
  hasta: [number, number],
  base: string | 'minima' | 'media' | 'maxima',
): TramoFormulario {
  n += 1;
  const esReferencia = base === 'minima' || base === 'media' || base === 'maxima';
  return {
    id: `t${String(n)}`,
    desdeMes: String(desde[0]),
    desdeAnio: String(desde[1]),
    hastaMes: String(hasta[0]),
    hastaAnio: String(hasta[1]),
    referencia: esReferencia ? base : 'importe',
    importe: esReferencia ? '' : base,
  };
}

describe('procesarTramos: de los tramos a la carrera del motor', () => {
  it('un importe en euros pasa como base mensual constante', () => {
    const r = procesarTramos([tramo([11, 1986], [10, 2026], '2.500,50')], CTX);
    expect(r.errores).toEqual([]);
    expect(r.carrera).toEqual([{ desde: '1986-11', hasta: '2026-10', baseMensual: 2500.5 }]);
  });

  it('una referencia a serie se expande año a año con los valores de /data', () => {
    const r = procesarTramos([tramo([6, 2001], [1, 2003], 'maxima')], CTX);
    expect(r.errores).toEqual([]);
    const bases = catalogo.referencias.find((x) => x.id === 'base-maxima')?.valores;
    expect(r.carrera).toEqual([
      {
        desde: '2001-06',
        hasta: '2003-01',
        basesPorAnio: {
          '2001': bases?.get(2001),
          '2002': bases?.get(2002),
          '2003': bases?.get(2003),
        },
      },
    ]);
  });

  it('la base media usa la definición elegida y pasa de euros al año a euros al mes', () => {
    const cn = catalogo.referencias.find((x) => x.id === 'media-cn');
    expect(cn?.dividirEntreDoce).toBe(true);
    const r = procesarTramos([tramo([1, 2000], [12, 2000], 'media')], {
      ...CTX,
      definicionMedia: 'media-cn',
    });
    expect(r.errores).toEqual([]);
    const periodo = r.carrera?.[0];
    expect(periodo && 'basesPorAnio' in periodo ? periodo.basesPorAnio['2000'] : undefined).toBe(
      cn?.valores.get(2000),
    );
    // Dos decimales: céntimos.
    expect(Math.round((cn?.valores.get(2000) ?? 0) * 100)).toBeCloseTo(
      (cn?.valores.get(2000) ?? 0) * 100,
      6,
    );
  });

  it('ordena los tramos por fecha aunque se escriban desordenados', () => {
    const r = procesarTramos(
      [tramo([1, 2010], [12, 2010], '2000'), tramo([1, 2000], [12, 2009], '1500')],
      CTX,
    );
    expect(r.carrera?.map((p) => p.desde)).toEqual(['2000-01', '2010-01']);
  });
});

describe('procesarTramos: errores (mensajes en español)', () => {
  it('sin tramos pide añadir uno', () => {
    const r = procesarTramos([], CTX);
    expect(r.errores[0]?.mensaje).toBe('Añade al menos un tramo de cotización.');
    expect(r.carrera).toBeUndefined();
  });

  it('fechas incompletas o con año de menos de cuatro cifras', () => {
    const r = procesarTramos(
      [{ ...tramo([1, 2000], [12, 2005], '1000'), desdeMes: '', hastaAnio: '05' }],
      CTX,
    );
    expect(r.errores.map((e) => e.campo).sort()).toEqual(['desdeMes', 'hastaAnio']);
    expect(r.errores[0]?.mensaje).toMatch(/^Tramo 1: /);
  });

  it('importe vacío, cero o no numérico', () => {
    for (const importe of ['', '0', 'mil']) {
      const r = procesarTramos([tramo([1, 2000], [12, 2005], importe)], CTX);
      expect(r.errores.map((e) => e.campo)).toContain('importe');
    }
  });

  it('desde posterior a hasta', () => {
    const r = procesarTramos([tramo([6, 2010], [5, 2010], '1000')], CTX);
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]?.mensaje).toContain(
      'empieza en junio de 2010, después de su fin (mayo de 2010)',
    );
  });

  it('tramos solapados: el error va en el posterior y nombra los dos tramos y los meses', () => {
    const a = tramo([1, 2000], [12, 2005], '1000');
    const b = tramo([6, 2005], [12, 2010], '2000');
    const r = procesarTramos([a, b], CTX);
    expect(r.carrera).toBeUndefined();
    expect(r.errores).toHaveLength(1);
    expect(r.errores[0]?.tramoId).toBe(b.id);
    expect(r.errores[0]?.mensaje).toBe(
      'Los tramos 1 y 2 se solapan entre junio de 2005 y diciembre de 2005. Los tramos no pueden coincidir en ningún mes: acorta uno de los dos.',
    );
  });

  it('tramo que termina o empieza después del mes anterior a la jubilación', () => {
    const termina = procesarTramos([tramo([1, 2020], [12, 2026], '1000')], CTX);
    expect(termina.errores[0]?.mensaje).toContain(
      'termina en diciembre de 2026, después del mes anterior a la jubilación (octubre de 2026)',
    );
    const empieza = procesarTramos([tramo([1, 2027], [12, 2027], '1000')], CTX);
    expect(empieza.errores[0]?.mensaje).toContain(
      'empieza en enero de 2027, después del mes anterior a la jubilación',
    );
  });

  it('tramo que empieza antes del nacimiento', () => {
    const r = procesarTramos([tramo([1, 1950], [12, 1955], '1000')], CTX);
    expect(r.errores.map((e) => e.campo)).toEqual(['desdeAnio']);
  });

  it('referencia a serie sin cobertura: dice de qué años a qué años hay datos', () => {
    const r = procesarTramos([tramo([1, 1990], [12, 2001], 'maxima')], CTX);
    expect(r.errores).toHaveLength(1);
    const msg = r.errores[0]?.mensaje ?? '';
    expect(msg).toContain('Base máxima de cotización');
    expect(msg).toContain('solo tiene datos de 2000 a 2026');
    expect(msg).toContain('(1990 a 1999)');
    // La base media por defecto empieza más tarde.
    const media = procesarTramos([tramo([1, 2010], [12, 2012], 'media')], CTX);
    expect(media.errores[0]?.mensaje).toContain('(2010 a 2012)');
  });
});

describe('procesarTramos: avisos de límites (no bloquean)', () => {
  it('base por debajo de la mínima: no se sube', () => {
    const r = procesarTramos([tramo([1, 2020], [12, 2020], '500')], CTX);
    expect(r.errores).toEqual([]);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]?.mensaje).toContain('por debajo de la base mínima');
    expect(r.avisos[0]?.mensaje).toContain('12 meses (2020)');
    expect(r.avisos[0]?.mensaje).toContain('no la sube a la mínima');
  });

  it('base por encima de la máxima: el cálculo la reduce', () => {
    const r = procesarTramos([tramo([1, 2020], [12, 2021], '9000')], CTX);
    expect(r.avisos).toHaveLength(1);
    expect(r.avisos[0]?.mensaje).toContain('24 meses (2020 a 2021)');
    expect(r.avisos[0]?.mensaje).toContain('la reduce a la máxima de cada año');
  });

  it('años sin límites en los datos: se dice que no se comprueban', () => {
    const r = procesarTramos([tramo([1, 2027], [3, 2027], '2000')], {
      ...CTX,
      mesPrevio: mesAbsoluto(2027, 12),
    });
    expect(r.errores).toEqual([]);
    expect(r.avisos[0]?.mensaje).toContain('no hay límites de base en los datos');
  });

  it('una base dentro de los límites no avisa', () => {
    const r = procesarTramos([tramo([1, 2020], [12, 2020], '2000')], CTX);
    expect(r.avisos).toEqual([]);
  });

  it('los límites de la mínima y la máxima de las referencias coinciden con sus propios límites', () => {
    const r = procesarTramos(
      [tramo([1, 2010], [12, 2010], 'minima'), tramo([1, 2011], [12, 2011], 'maxima')],
      CTX,
    );
    expect(r.avisos).toEqual([]);
  });
});

describe('resumirTramos: meses cotizados, sin cotizar y huecos', () => {
  it('sin huecos', () => {
    const r = resumirTramos(
      [{ desde: mesAbsoluto(2000, 1), hasta: mesAbsoluto(2000, 12) }],
      undefined,
    );
    expect(r).toMatchObject({ mesesCotizados: 12, mesesSinCotizar: 0, huecos: [] });
  });

  it('hueco interior y hueco final hasta el mes anterior a la jubilación', () => {
    const r = resumirTramos(
      [
        { desde: mesAbsoluto(2000, 1), hasta: mesAbsoluto(2000, 12) },
        { desde: mesAbsoluto(2002, 1), hasta: mesAbsoluto(2002, 6) },
      ],
      mesAbsoluto(2002, 12),
    );
    expect(r.mesesCotizados).toBe(18);
    expect(r.huecos).toEqual([
      { desde: '2001-01', hasta: '2001-12', meses: 12 },
      { desde: '2002-07', hasta: '2002-12', meses: 6 },
    ]);
    expect(r.mesesSinCotizar).toBe(18);
    expect(r.primerMes).toBe('2000-01');
    expect(textoDeHueco(r.huecos[0]!)).toBe('de enero de 2001 a diciembre de 2001 (12 meses)');
  });

  it('sin jubilación conocida solo cuenta los huecos entre tramos', () => {
    const r = resumirTramos(
      [
        { desde: mesAbsoluto(2000, 1), hasta: mesAbsoluto(2000, 1) },
        { desde: mesAbsoluto(2000, 3), hasta: mesAbsoluto(2000, 3) },
      ],
      undefined,
    );
    expect(r.huecos).toEqual([{ desde: '2000-02', hasta: '2000-02', meses: 1 }]);
    expect(textoDeHueco(r.huecos[0]!)).toBe('febrero de 2000 (1 mes)');
  });
});
