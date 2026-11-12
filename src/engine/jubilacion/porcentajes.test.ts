import { describe, expect, it } from 'vitest';
import { NoImplementada } from './errores.ts';
import { valorEn } from './parametros.ts';
import {
  coeficienteReductor,
  coeficienteSobreLimite,
  mesesPara100,
  porcentajeEscala,
  tramoCotizacion,
  versionEscala,
} from './porcentajes.ts';
import { PARAMS } from './pruebas.ts';

describe('escala de porcentajes (art. 210.1 y DT 9.ª)', () => {
  it('menos de la carencia: 0 %; con 15 años: 50 %', () => {
    const v = versionEscala(PARAMS, 2026);
    expect(porcentajeEscala(v, 179)).toBe(0);
    expect(porcentajeEscala(v, 180)).toBe(50);
  });

  it('versión 2023-2026: 0,21 % los 49 primeros meses y 0,19 % los 209 siguientes', () => {
    const v = versionEscala(PARAMS, 2026);
    expect(v.desde).toBe(2023);
    expect(porcentajeEscala(v, 181)).toBeCloseTo(50.21, 10);
    expect(porcentajeEscala(v, 180 + 49)).toBeCloseTo(60.29, 10);
    expect(porcentajeEscala(v, 180 + 50)).toBeCloseTo(60.48, 10);
    expect(porcentajeEscala(v, 438)).toBeCloseTo(100, 10);
    expect(porcentajeEscala(v, 600)).toBe(100);
  });

  it('versión 2027: 0,19 % los 248 primeros meses y 0,18 % los 16 siguientes', () => {
    const v = versionEscala(PARAMS, 2027);
    expect(v.desde).toBe(2027);
    expect(porcentajeEscala(v, 180 + 248)).toBeCloseTo(97.12, 10);
    expect(porcentajeEscala(v, 444)).toBeCloseTo(100, 10);
  });

  it('transición entre años: 2026 y 2027 dan porcentajes distintos con la misma carrera', () => {
    expect(porcentajeEscala(versionEscala(PARAMS, 2026), 300)).toBeCloseTo(
      50 + 0.21 * 49 + 0.19 * 71,
      10,
    );
    expect(porcentajeEscala(versionEscala(PARAMS, 2027), 300)).toBeCloseTo(50 + 0.19 * 120, 10);
  });

  it('los meses necesarios para el 100 % coinciden con cotizacion-para-100 de /data en todos los años', () => {
    for (let a = 2013; a <= 2027; a++) {
      expect(mesesPara100(versionEscala(PARAMS, a)), String(a)).toBe(
        valorEn(PARAMS.cotizacionPara100, a).valor,
      );
    }
  });

  it('antes de 2013 no hay escala por meses', () => {
    expect(() => versionEscala(PARAMS, 2012)).toThrow();
  });
});

describe('coeficientes reductores (arts. 207.2 y 208.2, DT 34.ª)', () => {
  it('tramos de periodo cotizado: 38 años y 6 meses, 41 y 6, 44 y 6', () => {
    const t = PARAMS.coeficientesVoluntaria;
    expect([461, 462, 497, 498, 533, 534].map((m) => tramoCotizacion(t, m))).toEqual([
      1, 2, 2, 3, 3, 4,
    ]);
  });

  it('cuadro de la voluntaria: 24 meses con menos de 38 años y 6 meses y con 44 y 6 o más', () => {
    expect(coeficienteReductor(PARAMS.coeficientesVoluntaria, 24, 400).pct).toBe(21);
    expect(coeficienteReductor(PARAMS.coeficientesVoluntaria, 24, 540).pct).toBe(13);
    expect(coeficienteReductor(PARAMS.coeficientesVoluntaria, 1, 400).pct).toBe(3.26);
  });

  it('cuadro de la involuntaria: 48 meses y 1 mes', () => {
    expect(coeficienteReductor(PARAMS.coeficientesInvoluntaria, 48, 400).pct).toBe(30);
    expect(coeficienteReductor(PARAMS.coeficientesInvoluntaria, 1, 540).pct).toBe(0.5);
  });

  it('una anticipación fuera del cuadro es un error de datos, no un cero', () => {
    expect(() => coeficienteReductor(PARAMS.coeficientesVoluntaria, 25, 400)).toThrow();
  });

  it('DT 34.ª: gradual de 2024 a 2033 y, desde 2034, el cuadro del art. 208.2', () => {
    expect(coeficienteSobreLimite(PARAMS, 2024, 24, 400).pct).toBe(5.7);
    expect(coeficienteSobreLimite(PARAMS, 2033, 24, 400).pct).toBe(21);
    expect(coeficienteSobreLimite(PARAMS, 2034, 24, 400).pct).toBe(21);
    expect(coeficienteSobreLimite(PARAMS, 2030, 12, 500).pct).toBe(4.1);
  });

  it('DT 34.ª: en 2033 los 96 coeficientes coinciden con los del art. 208.2', () => {
    for (const tramo of [1, 2, 3, 4]) {
      const meses = [462, 498, 534][tramo - 2] ?? 0;
      for (let m = 1; m <= 24; m++) {
        expect(coeficienteSobreLimite(PARAMS, 2033, m, meses).pct).toBe(
          coeficienteReductor(PARAMS.coeficientesVoluntaria, m, meses).pct,
        );
      }
    }
  });

  it('DT 34.ª: en 2022-2023 no está implementada', () => {
    expect(() => coeficienteSobreLimite(PARAMS, 2023, 12, 400)).toThrow(NoImplementada);
  });
});
