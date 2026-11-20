/**
 * Opción de la DT 4.ª.7 TRLGSS (Ajustes actuariales 4, punto 3): resumen desde /data y
 * comprobación de que la opción no usa nunca un periodo más largo que la regla general.
 */
import { describe, expect, it } from 'vitest';
import { resumenOpcion25 } from './opcion25.ts';
import { valorEn } from './parametros.ts';
import { parametrosDelRepositorio } from './parametros-datos.ts';
import { calcularJubilacionConParametros } from './calculo.ts';

const P = parametrosDelRepositorio();

describe('resumenOpcion25', () => {
  const r = resumenOpcion25(P);

  it('lee de /data el periodo y el divisor de la opción, los años de transición y el fin', () => {
    // DT 4.ª.7 (data-raw/boe/trlgss-2015-consolidado.txt): 300 meses entre 350 hasta 2040;
    // 306/357 en 2041, 312/364 en 2042 y 318/371 en 2043; desde 2044, solo la regla general.
    expect(r.primerAnio).toBe(2026);
    expect(r.mesesBase).toBe(300);
    expect(r.divisorBase).toBe(350);
    expect(r.transicion).toEqual([
      { anio: 2041, meses: 306, divisor: 357 },
      { anio: 2042, meses: 312, divisor: 364 },
      { anio: 2043, meses: 318, divisor: 371 },
    ]);
    expect(r.ultimoAnio).toBe(2043);
    expect(r.primerAnioSinOpcion).toBe(2044);
  });

  it('cada divisor es el periodo × 14/12 (todas las bases de la ventana, sin descartar ninguna)', () => {
    expect(r.divisorBase).toBeCloseTo((r.mesesBase * 14) / 12, 6);
    for (const t of r.transicion) expect(t.divisor).toBeCloseTo((t.meses * 14) / 12, 6);
  });

  it('en todos los años con opción, el periodo de la opción es más corto o igual que el de la regla general', () => {
    for (let a = r.primerAnio; a <= r.ultimoAnio; a++) {
      const opcion = valorEn(P.opcion25Ventana, a).valor;
      const general = valorEn(P.periodoCalculo, a).valor;
      expect(opcion, String(a)).toBeLessThanOrEqual(general);
    }
  });
});

describe('opción de 25 años en el motor, de 2040 a 2044', () => {
  const carrera = [{ desde: '1990-01', hasta: '2045-12', baseMensual: 2000 }];
  const calcula = (fecha: string) =>
    calcularJubilacionConParametros(P, carrera, '1960-01-01', fecha, 'ordinaria', {
      escenario: { ipc: 0.02 },
      calcularAunqueNoCumpla: true,
    });
  const paso = (fecha: string) =>
    calcula(fecha).pasos.find((p) => p.id === 'base-reguladora-opcion-25');

  it.each([
    ['2040-06-01', 300, 350],
    ['2041-06-01', 306, 357],
    ['2042-06-01', 312, 364],
    ['2043-06-01', 318, 371],
  ])('%s: la opción usa %i meses entre %i', (fecha, meses, divisor) => {
    const p = paso(fecha);
    expect(p, fecha).toBeDefined();
    expect(p?.detalle).toContain(String(meses));
    expect(p?.detalle).toContain(String(divisor));
  });

  it('2044: no hay opción, solo la regla general', () => {
    expect(paso('2044-06-01')).toBeUndefined();
  });
});
