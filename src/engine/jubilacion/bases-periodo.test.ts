/**
 * `basesPeriodo`: lista mes a mes de la ventana de cálculo (solo lectura). Casos sintéticos que
 * cubren lagunas integradas, bases descartadas, meses anteriores al alta y la opción de 25 años.
 */
import { describe, expect, it } from 'vitest';
import { calc, continua, ESCENARIO_2PC } from './pruebas.ts';

const OPC = { sexo: 'hombre', escenario: ESCENARIO_2PC } as const;

describe('basesPeriodo', () => {
  it('lagunas al final: son meses «laguna-integrada», con su porcentaje, y entran en la suma', () => {
    const r = calc(
      [continua('1987-01', '2028-12', 2500)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      {
        ...OPC,
        usarOpcion25Anos: false,
      },
    );
    const b = r.basesPeriodo;
    expect(b.regla).toBe('general');
    expect(b.meses).toHaveLength(b.ventana);
    const lagunas = b.meses.filter((m) => m.tipo === 'laguna-integrada');
    expect(lagunas).toHaveLength(11);
    expect(lagunas.every((m) => m.porcentajeIntegracion === 100)).toBe(true);
    // Hay más meses con base que bases computables: se descartan las de menor importe.
    expect(b.meses.filter((m) => !m.usado)).toHaveLength(b.ventana - b.nBases);
    expect(b.meses.filter((m) => m.usado)).toHaveLength(b.nBases);
    // Los meses se ordenan del más antiguo al más reciente, con los últimos al mes previo menos uno.
    expect(b.meses.at(-1)?.mes).toBe('2029-11');
    expect((b.meses[0]?.mes ?? '') < (b.meses.at(-1)?.mes ?? '')).toBe(true);
  });

  it('los meses recientes van por su valor nominal (factor uno) y los antiguos se actualizan', () => {
    const r = calc(
      [continua('1987-01', '2029-12', 2500)],
      '1965-01-01',
      '2030-01-01',
      'ordinaria',
      {
        ...OPC,
        usarOpcion25Anos: false,
      },
    );
    const b = r.basesPeriodo;
    expect(b.meses.at(-1)?.factor).toBe(1);
    const antiguo = b.meses[0];
    expect(antiguo?.factor).toBeGreaterThan(1);
    expect(antiguo?.baseActualizada).toBeCloseTo(
      (antiguo?.baseNominal ?? 0) * (antiguo?.factor ?? 0),
      9,
    );
  });

  it('meses anteriores a la primera alta con la lectura «ignorar»: valen cero y no cuentan', () => {
    const r = calc(
      [continua('2006-11', '2026-10', 2000)],
      '1960-02-15',
      '2026-12-15',
      'ordinaria',
      {
        ...OPC,
        usarOpcion25Anos: false,
        lecturas: { lagunasAnterioresAlPrimerAlta: 'ignorar' },
      },
    );
    const ignorados = r.basesPeriodo.meses.filter((m) => m.tipo === 'previo-al-alta-ignorado');
    expect(ignorados.length).toBeGreaterThan(0);
    expect(ignorados.every((m) => m.baseActualizada === 0 && !m.usado)).toBe(true);
  });

  it('con la opción de 25 años más favorable, la lista es la de esa regla', () => {
    // Bases crecientes y poca carrera a favor: la ventana de 25 años puede ganar a la general.
    const r = calc(
      [continua('2006-11', '2026-10', 2000)],
      '1960-02-15',
      '2026-12-15',
      'ordinaria',
      {
        ...OPC,
      },
    );
    const b = r.basesPeriodo;
    expect(b.meses).toHaveLength(b.ventana);
    const suma = b.meses.filter((m) => m.usado).reduce((a, m) => a + m.baseActualizada, 0);
    expect(suma / b.divisor).toBeCloseTo(r.baseReguladora, 9);
  });
});
