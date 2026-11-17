import { describe, expect, it } from 'vitest';
import { fechaLarga, mesLargo } from './fechas';
import { numerosEnTexto, valorConUnidad } from './formato-pasos';

describe('formato de los textos del motor', () => {
  it('reescribe los decimales con punto en es-ES y deja intactos los artículos', () => {
    expect(numerosEnTexto('310 bases de 320 meses ÷ 361.67')).toBe(
      '310 bases de 320 meses ÷ 361,67',
    );
    expect(numerosEnTexto('14 pagas; importe anual 29999.72 euros.')).toBe(
      '14 pagas; importe anual 29.999,72 euros.',
    );
    expect(numerosEnTexto('art. 197.1.a) y 197.2')).toBe('art. 197.1.a) y 197.2');
    expect(numerosEnTexto('96 bases entre 112.0000')).toBe('96 bases entre 112');
  });
  it('da formato a cada unidad', () => {
    expect(valorConUnidad(2142.84, 'euros/mes')).toBe('2.142,84\u00a0€ al mes');
    expect(valorConUnidad(100, '%')).toBe('100\u00a0%');
    expect(valorConUnidad(5, '%')).toBe('5\u00a0%');
    expect(valorConUnidad(516, 'meses')).toBe('43 años');
    expect(valorConUnidad(802, 'meses de edad')).toBe('66 años y 10 meses');
    expect(valorConUnidad(1826, 'días')).toBe('1.826 días');
    expect(valorConUnidad(true, 'indicador')).toBe('Sí');
    expect(valorConUnidad(1, 'indicador')).toBe('Sí');
    expect(valorConUnidad(0, 'indicador')).toBe('No');
    expect(valorConUnidad(14187.22, 'euros/año')).toBe('14.187,22\u00a0€ al año');
    expect(valorConUnidad('310 bases ÷ 361.67', 'regla')).toBe('310 bases ÷ 361,67');
  });
});

describe('fechas de los ejemplos', () => {
  it('escribe las fechas en lenguaje llano', () => {
    expect(fechaLarga('1965-01-01')).toBe('1 de enero de 1965');
    expect(fechaLarga('2026-03-15')).toBe('15 de marzo de 2026');
    expect(mesLargo('1987-01')).toBe('enero de 1987');
  });
});
