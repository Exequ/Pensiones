// @vitest-environment node
/**
 * Fase 3-B1, paso 2: la lista mes a mes de las bases del periodo de cálculo (`basesPeriodo` del
 * resultado de jubilación) reproduce los totales del motor en los casos de jubilación de Sergio:
 * la suma de las bases usadas es la suma que divide el motor y, entre el divisor, la base reguladora.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { crearMotor, type ConfiguracionMotor } from '../src/engine/fachada.ts';
import { entradaDeCaso, leerCasosSergio } from './lib/casos-sergio.ts';
import { RAIZ, leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const texto = readFileSync(path.join(RAIZ, 'data-raw/casos-oro/casos-sergio.md'), 'utf8');
const casos = leerCasosSergio(texto).casos.filter((c) => c.tipo === 'jubilacion');

describe('basesPeriodo reproduce los totales del motor (casos de jubilación de Sergio)', () => {
  it('hay al menos tres casos de jubilación', () => {
    expect(casos.length).toBeGreaterThanOrEqual(3);
  });

  for (const caso of casos) {
    it(`${caso.id}: suma usada = base reguladora × divisor`, () => {
      const cfg = (caso.datos['configuracion'] ?? {}) as ConfiguracionMotor;
      const entrada = entradaDeCaso(caso);
      const r = crearMotor(leerParametroDeDisco, cfg).jubilacion(entrada as never);
      if (!r.ok) throw r.error.original;
      const d = r.detalle;
      const b = d.basesPeriodo;

      // La ventana completa, del más antiguo al más reciente, sin huecos ni repeticiones.
      expect(b.meses).toHaveLength(b.ventana);
      const ordenes = b.meses.map((m) => m.orden);
      expect(ordenes).toEqual([...ordenes].sort((x, y) => y - x));
      expect(new Set(b.meses.map((m) => m.mes)).size).toBe(b.ventana);

      // Cada mes: actualizada = nominal × factor.
      for (const m of b.meses) {
        expect(m.baseActualizada).toBeCloseTo(m.baseNominal * m.factor, 9);
      }

      // Totales: la suma de las usadas es la suma del motor, y su cociente, la base reguladora.
      const usados = b.meses.filter((m) => m.usado);
      expect(usados.length).toBeLessThanOrEqual(b.nBases);
      const suma = usados.reduce((a, m) => a + m.baseActualizada, 0);
      expect(suma).toBeCloseTo(b.sumaBases, 6);
      expect(b.sumaBases / b.divisor).toBeCloseTo(d.baseReguladora, 9);
      expect(b.baseReguladora).toBe(d.baseReguladora);

      // Las descartadas nunca superan a las usadas (se usan las de mayor importe).
      const menorUsada = Math.min(...usados.map((m) => m.baseActualizada));
      for (const m of b.meses.filter((x) => !x.usado && x.tipo !== 'previo-al-alta-ignorado')) {
        expect(m.baseActualizada).toBeLessThanOrEqual(menorUsada + 1e-9);
      }
    });
  }
});
