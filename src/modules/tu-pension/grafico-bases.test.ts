import { describe, expect, it } from 'vitest';
import { calc, continua, ESCENARIO_2PC } from '../../engine/jubilacion/pruebas';
import { filasGraficoBases, ETIQUETA_ESTADO } from './grafico-bases';

describe('filasGraficoBases', () => {
  const r = calc([continua('1987-01', '2028-12', 2500)], '1965-01-01', '2030-01-01', 'ordinaria', {
    sexo: 'hombre',
    escenario: ESCENARIO_2PC,
    usarOpcion25Anos: false,
  });
  const filas = filasGraficoBases(r.basesPeriodo);

  it('una fila por mes de la ventana, de la más antigua a la más reciente, con el estado en texto', () => {
    expect(filas).toHaveLength(r.basesPeriodo.ventana);
    expect(filas[0]!.fecha.getTime()).toBeLessThan(filas.at(-1)!.fecha.getTime());
    const textos = new Set(filas.map((f) => f.estado));
    for (const t of textos) expect(Object.values(ETIQUETA_ESTADO)).toContain(t);
  });

  it('las lagunas descartadas y las sumadas se distinguen de las cotizadas', () => {
    const claves = filas.map((f) => f.clave);
    expect(claves.filter((c) => c === 'se-suma' || c === 'se-descarta').length).toBe(
      r.basesPeriodo.meses.filter((m) => m.tipo === 'cotizado').length,
    );
    expect(claves.filter((c) => c.startsWith('laguna')).length).toBe(11);
    expect(claves.filter((c) => c === 'se-suma' || c === 'laguna-integrada').length).toBe(
      r.basesPeriodo.nBases,
    );
  });

  it('la suma de las filas que se suman entre el divisor es la base reguladora', () => {
    const suma = filas
      .filter((f) => f.clave === 'se-suma' || f.clave === 'laguna-integrada')
      .reduce((a, f) => a + f.baseActualizada, 0);
    expect(suma / r.basesPeriodo.divisor).toBeCloseTo(r.baseReguladora, 9);
  });
});
