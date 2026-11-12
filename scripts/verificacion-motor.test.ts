// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { ejecutarVerificacion } from './lib/verificacion-motor.ts';

describe('verificación independiente del motor de jubilación', () => {
  it('30 combinaciones (año 2026-2050 × perfil): sin NaN, entre mínimo y máximo y monótona', () => {
    const informe = ejecutarVerificacion();
    expect(informe.combinaciones).toBe(30);
    expect(informe.comprobaciones).toBeGreaterThan(300);
    expect(informe.violaciones).toEqual([]);
  });
});
