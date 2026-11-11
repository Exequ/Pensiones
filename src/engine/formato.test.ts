import { describe, expect, it } from 'vitest';
import {
  formatearEuros,
  formatearFechaIso,
  formatearNumero,
  formatearPeriodo,
  formatearPorcentaje,
  formatearPuntosPorcentuales,
} from './formato';

const NBSP = ' ';

describe('formatearNumero', () => {
  it('usa punto de miles y coma decimal', () => {
    expect(formatearNumero(1234567.891)).toBe('1.234.567,89');
  });

  it('agrupa también los números de cuatro cifras', () => {
    expect(formatearNumero(1680)).toBe('1.680');
  });

  it('permite no agrupar cuatro cifras en texto corrido', () => {
    expect(formatearNumero(1680, { agruparCuatroCifras: false })).toBe('1680');
    expect(formatearNumero(16800, { agruparCuatroCifras: false })).toBe('16.800');
  });

  it('respeta los decimales fijos', () => {
    expect(formatearNumero(2, { decimales: 2 })).toBe('2,00');
  });

  it('muestra el signo si se pide', () => {
    expect(formatearNumero(3.5, { conSigno: true })).toBe('+3,5');
    expect(formatearNumero(0, { conSigno: true })).toBe('0');
  });

  it('rechaza valores no finitos', () => {
    expect(() => formatearNumero(Number.NaN)).toThrow(RangeError);
    expect(() => formatearNumero(Number.POSITIVE_INFINITY)).toThrow(RangeError);
  });
});

describe('formatearEuros', () => {
  it('formatea importes con separador de miles en cuatro cifras', () => {
    expect(formatearEuros(1680)).toBe(`1.680${NBSP}€`);
  });

  it('redondea a euros enteros por defecto', () => {
    expect(formatearEuros(1234.56)).toBe(`1.235${NBSP}€`);
  });

  it('admite céntimos', () => {
    expect(formatearEuros(1234.5, { decimales: 2 })).toBe(`1.234,50${NBSP}€`);
  });

  it('formatea negativos', () => {
    expect(formatearEuros(-1500)).toBe(`-1.500${NBSP}€`);
  });
});

describe('formatearPorcentaje', () => {
  it('convierte una fracción en porcentaje con un decimal como máximo', () => {
    expect(formatearPorcentaje(0.125)).toBe(`12,5${NBSP}%`);
    expect(formatearPorcentaje(0.5)).toBe(`50${NBSP}%`);
  });

  it('admite decimales fijos', () => {
    expect(formatearPorcentaje(0.1, { decimales: 2 })).toBe(`10,00${NBSP}%`);
  });

  it('agrupa miles en porcentajes grandes', () => {
    expect(formatearPorcentaje(12.5)).toBe(`1.250${NBSP}%`);
  });
});

describe('otros formatos', () => {
  it('formatea puntos porcentuales', () => {
    expect(formatearPuntosPorcentuales(1.25)).toBe(`1,3${NBSP}p.${NBSP}p.`);
  });

  it('reduce una fecha ISO a AAAA-MM-DD', () => {
    expect(formatearFechaIso('2024-05-01')).toBe('2024-05-01');
    expect(formatearFechaIso('2024-05-01T10:20:00Z')).toBe('2024-05-01');
    expect(() => formatearFechaIso('01/05/2024')).toThrow(RangeError);
  });

  it('formatea periodos anuales y trimestrales', () => {
    expect(formatearPeriodo('2023')).toBe('2023');
    expect(formatearPeriodo('2023-T1')).toBe('1.er trimestre de 2023');
    expect(formatearPeriodo('2023-T2')).toBe('2.º trimestre de 2023');
    expect(() => formatearPeriodo('2023-T5')).toThrow(RangeError);
  });
});
