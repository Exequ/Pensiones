import { describe, expect, it } from 'vitest';
import {
  mesesCumplidos,
  mesesHastaRedondeandoArriba,
  parsearFecha,
  parsearMes,
  sumarMeses,
  formatearMes,
} from './tiempo.ts';

const f = parsearFecha;

describe('fechas y meses', () => {
  it('rechaza fechas con formato o valores no válidos', () => {
    expect(() => parsearFecha('2026-1-1')).toThrow(RangeError);
    expect(() => parsearFecha('2026-02-30')).toThrow(RangeError);
    expect(() => parsearMes('2026-13')).toThrow(RangeError);
  });

  it('acepta el 29 de febrero solo en bisiestos', () => {
    expect(f('2024-02-29').dia).toBe(29);
    expect(() => parsearFecha('2025-02-29')).toThrow(RangeError);
  });

  it('suma meses y usa el último día del mes de destino', () => {
    expect(sumarMeses(f('2026-01-31'), 1)).toEqual(f('2026-02-28'));
    expect(sumarMeses(f('2026-11-15'), 3)).toEqual(f('2027-02-15'));
    expect(sumarMeses(f('2026-01-01'), -780)).toEqual(f('1961-01-01'));
  });

  it('cuenta meses completos cumplidos', () => {
    expect(mesesCumplidos(f('1961-01-01'), f('2026-01-01'))).toBe(780);
    expect(mesesCumplidos(f('1961-01-02'), f('2026-01-01'))).toBe(779);
    expect(mesesCumplidos(f('2000-01-31'), f('2000-02-29'))).toBe(1);
  });

  it('redondea hacia arriba la fracción de mes (anticipación)', () => {
    expect(mesesHastaRedondeandoArriba(f('2026-01-01'), f('2026-01-01'))).toBe(0);
    expect(mesesHastaRedondeandoArriba(f('2026-01-01'), f('2026-02-01'))).toBe(1);
    expect(mesesHastaRedondeandoArriba(f('2026-01-01'), f('2026-02-02'))).toBe(2);
    expect(mesesHastaRedondeandoArriba(f('2026-01-15'), f('2027-01-14'))).toBe(12);
  });

  it('formatea meses absolutos', () => {
    expect(formatearMes(parsearMes('2026-03'))).toBe('2026-03');
  });
});
