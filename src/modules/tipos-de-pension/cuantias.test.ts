import { describe, expect, it } from 'vitest';
import {
  etiquetaDeCuantia,
  fechaEnTexto,
  importePorPaga,
  porcentajeDeImporte,
  situacionDeCuantia,
} from './cuantias';

describe('etiquetaDeCuantia', () => {
  it('quita los importes de una fila de tres columnas', () => {
    expect(
      etiquetaDeCuantia('Titular con sesenta y cinco años. | 17.592,40 | 13.106,80 | 12.441,80 |'),
    ).toBe('Titular con sesenta y cinco años.');
  });
  it('conserva los dos segmentos de texto de una fila de orfandad', () => {
    expect(etiquetaDeCuantia('Orfandad | | Por persona beneficiaria. | 4.011,00 |')).toBe(
      'Orfandad · Por persona beneficiaria.',
    );
  });
  it('quita la elisión final con importe', () => {
    expect(
      etiquetaDeCuantia('Una sola persona beneficiaria menor de sesenta y cinco años. … 9.126,60'),
    ).toBe('Una sola persona beneficiaria menor de sesenta y cinco años.');
  });
  it('una frase sin barras se devuelve entera', () => {
    expect(etiquetaDeCuantia('Gran incapacidad.')).toBe('Gran incapacidad.');
  });
  it('una cita que solo trae importes da un rótulo vacío', () => {
    expect(etiquetaDeCuantia('| 1.000,00 | 2.000,50 |')).toBe('');
  });
});

describe('situacionDeCuantia', () => {
  it('lee la situación de la nota, con un nivel de paréntesis anidado', () => {
    expect(situacionDeCuantia('Cuantía mínima anual (con cónyuge a cargo). Cita corregida.')).toBe(
      'Con cónyuge a cargo',
    );
    expect(
      situacionDeCuantia(
        'Cuantía mínima anual (sin cónyuge (unidad económica unipersonal)). Cita corregida (Fase 2).',
      ),
    ).toBe('Sin cónyuge (unidad económica unipersonal)');
  });
  it('devuelve null si la nota no sigue el patrón o no existe', () => {
    expect(situacionDeCuantia('Otra cosa')).toBeNull();
    expect(situacionDeCuantia(undefined)).toBeNull();
  });
});

describe('importes derivados', () => {
  it('importe por paga: anual entre catorce pagas', () => {
    expect(importePorPaga(14000)).toBe(1000);
    expect(importePorPaga(8803.2)).toBeCloseTo(628.8, 6);
    expect(importePorPaga(1200, 12)).toBe(100);
  });
  it('rechaza importes y pagas no válidos', () => {
    expect(() => importePorPaga(-1)).toThrow(RangeError);
    expect(() => importePorPaga(100, 0)).toThrow(RangeError);
    expect(() => importePorPaga(100, 1.5)).toThrow(RangeError);
  });
  it('porcentaje de un importe', () => {
    expect(porcentajeDeImporte(8000, 25)).toBe(2000);
    expect(porcentajeDeImporte(8803.2, 25)).toBeCloseTo(2200.8, 6);
  });
});

describe('fechaEnTexto', () => {
  it('un mes se escribe con su nombre', () => {
    expect(fechaEnTexto('2025-12', false)).toBe('diciembre de 2025');
    expect(fechaEnTexto('2024-03', true)).toBe('marzo de 2024');
  });
  it('un año se escribe a 1 de diciembre si es una foto de fin de año', () => {
    expect(fechaEnTexto('2025', true)).toBe('1 de diciembre de 2025');
    expect(fechaEnTexto('2025', false)).toBe('2025');
  });
});
