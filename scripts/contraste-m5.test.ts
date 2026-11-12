// @vitest-environment node
/**
 * Contraste con M5 (modelo simplificado de Python): los 37 casos de oro de
 * data-raw/casos-oro/casos_oro_m5.json reproducidos con el motor. Tolerancia: 1,5 %.
 * Toda diferencia mayor del 0,5 % debe estar explicada en docs/CONTRASTE_M5.md y en `EXPLICADOS`.
 */
import { describe, expect, it } from 'vitest';
import { casos, reproducir } from './lib/contraste-m5.ts';

const TOLERANCIA = 0.015;
const UMBRAL_EXPLICACION = 0.005;
/** Casos con una diferencia estructural (no de redondeo) explicada en docs/CONTRASTE_M5.md. */
const EXPLICADOS: Record<string, string> = {
  'carrera corta 15 anios':
    'El motor integra las lagunas anteriores a la primera alta (M5 no); la pensión final coincide porque ambas son la mínima.',
  'lagunas 60':
    'Con 456 meses cotizados (< 462) la ley exige 67 años; M5 usa los meses potenciales hasta los 65. El motor calcula los importes aunque no se cause pensión a los 65.',
};

describe('contraste con M5 (37 casos de oro)', () => {
  it('hay 37 casos', () => {
    expect(casos).toHaveLength(37);
  });

  for (const c of casos) {
    it(`${c.nombre}: diferencia dentro del ${TOLERANCIA * 100} %`, () => {
      const r = reproducir(c);
      expect(Math.abs(r.diferenciaRelativa)).toBeLessThanOrEqual(TOLERANCIA);
      expect(r.estadoMotor).toBe(c.salida.estado);
    });
  }

  it('ninguna diferencia supera el 0,5 %, o está explicada', () => {
    const sinExplicar = casos
      .filter(
        (c) =>
          Math.abs(reproducir(c).diferenciaRelativa) > UMBRAL_EXPLICACION &&
          !(c.nombre in EXPLICADOS),
      )
      .map((c) => c.nombre);
    expect(sinExplicar).toEqual([]);
  });

  it('el motor queda siempre por debajo o igual que M5 en los casos sin topar ni mínima (M5 incluye un mes más reciente en la ventana)', () => {
    for (const c of casos) {
      if (c.salida.estado !== 'contributiva' || c.nombre === 'lagunas 60') continue;
      expect(reproducir(c).diferenciaRelativa, c.nombre).toBeLessThanOrEqual(1e-12);
    }
  });

  it('casos explicados: carrera corta (base reguladora mayor por la integración) y lagunas 60 (no causa pensión a los 65)', () => {
    const corta = casos.find((c) => c.nombre === 'carrera corta 15 anios');
    const sesenta = casos.find((c) => c.nombre === 'lagunas 60');
    if (!corta || !sesenta) throw new Error('faltan casos');
    expect(reproducir(corta).baseReguladora).toBeGreaterThan(
      corta.salida.base_reguladora_mensual * 1.05,
    );
    expect(reproducir(sesenta).cumple).toBe(false);
  });
});
