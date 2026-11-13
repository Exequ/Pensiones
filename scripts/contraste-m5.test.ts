// @vitest-environment node
/**
 * Contraste con M5 v2 (modelo simplificado de Python, modelos/m5/m5_v2.py): los 51 casos de oro de
 * data-raw/casos-oro/casos_oro_m5.json reproducidos con el motor. Tolerancia: 1e-6 (relativa).
 * La coincidencia prueba que las dos implementaciones son coherentes entre sí, no que la lectura
 * legal sea correcta (véase docs/CONTRASTE_M5.md).
 */
import { describe, expect, it } from 'vitest';
import { casos, reproducir } from './lib/contraste-m5.ts';

const TOLERANCIA = 1e-6;

describe('contraste con M5 v2 (51 casos de oro)', () => {
  it('hay 51 casos', () => {
    expect(casos).toHaveLength(51);
  });

  for (const c of casos) {
    it(`${c.nombre}: diferencia dentro de ${TOLERANCIA}`, () => {
      const r = reproducir(c);
      expect(Math.abs(r.diferenciaRelativa)).toBeLessThanOrEqual(TOLERANCIA);
      expect(r.estadoMotor).toBe(c.salida.estado);
    });
  }
});
