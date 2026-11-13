/**
 * Regresión del IPC mensual del motor contra los factores de actualización de los informes del
 * autocálculo de la Seguridad Social (Fase 2-E; cierra la pregunta pendiente de la Fase 2-D).
 *
 * El factor de actualización de un mes es índice(mes de referencia) / índice(mes). Los valores de
 * cada caso se copian de los informes del autocálculo de la Seguridad Social (13/11/2026) que
 * aportó Sergio; `ctx.ipc` es la lectura por defecto `mensual-ine` (serie IPC290751 del INE desde
 * 2002-01; 2001 enlazado con las variaciones anuales de 2002, confianza media).
 *
 * Criterio: desde 2002-01, error relativo ≤ 1e-6; en 2001 (tramo enlazado), ≤ 5e-4.
 * Comprobación hecha por el coordinador sobre los factores completos de los informes: desde 2002 la
 * desviación máxima es 0,05 ppm; en 2001, hasta 0,038 % (agosto); efecto en la pensión: céntimos.
 */
import { describe, expect, it } from 'vitest';
import { contexto } from './pruebas.ts';
import { parsearMes } from './tiempo.ts';

const FUENTE = 'informe del autocálculo de la Seguridad Social, 13/11/2026';
const TOLERANCIA_2002 = 1e-6;
const TOLERANCIA_2001 = 5e-4;

interface CasoInforme {
  readonly caso: string;
  readonly referencia: string;
  readonly factores: Readonly<Record<string, number>>;
}

const CASOS: readonly CasoInforme[] = [
  {
    caso: 'jub-ord-2026-plana-40a',
    referencia: '2024-09',
    factores: {
      '2001-06': 1.6659269,
      '2001-08': 1.6767853,
      '2001-09': 1.6684318,
      '2001-10': 1.6596746,
      '2001-11': 1.6561403,
      '2001-12': 1.6518492,
      '2002-01': 1.6540866,
      '2006-07': 1.4217977,
      '2012-03': 1.2574998,
      '2019-12': 1.1724167,
      '2023-01': 1.0486973,
      '2024-01': 1.0141488,
    },
  },
  {
    caso: 'jub-ord-2027-05-plana-40a',
    referencia: '2025-03',
    factores: {
      '2001-08': 1.7095982,
      '2001-09': 1.7010883,
      '2001-10': 1.6921528,
      '2001-11': 1.6885546,
      '2001-12': 1.6841756,
      '2002-01': 1.6864622,
      '2006-07': 1.4496267,
      '2012-03': 1.282113,
      '2019-12': 1.1953646,
      '2023-01': 1.0692235,
      '2024-01': 1.0339988,
    },
  },
  {
    caso: 'jub-ord-2027-11-plana-40a',
    referencia: '2025-09',
    factores: {
      '2006-07': 1.4647782,
      '2012-03': 1.2955137,
      '2019-12': 1.2078585,
      '2023-01': 1.0803991,
      '2024-01': 1.0448062,
    },
  },
  {
    caso: 'jub-ord-2026-carrera-20a',
    referencia: '2024-10',
    factores: {
      '2001-11': 1.6664713,
      '2001-12': 1.6621501,
      '2002-01': 1.6644072,
      '2006-07': 1.430669,
      '2012-03': 1.265346,
      '2019-12': 1.179732,
      '2023-01': 1.0552406,
      '2024-01': 1.0204766,
    },
  },
];

describe(`factor de actualización mensual frente a los informes (${FUENTE})`, () => {
  const ctx = contexto();

  it('usa la lectura por defecto mensual-ine', () => {
    expect(ctx.lecturas.interpolacionIPC).toBe('mensual-ine');
  });

  for (const c of CASOS) {
    describe(`${c.caso}, referencia ${c.referencia}`, () => {
      for (const [mes, factor] of Object.entries(c.factores)) {
        const tolerancia = mes < '2002-01' ? TOLERANCIA_2001 : TOLERANCIA_2002;
        it(`${mes}: factor ${String(factor)} (error relativo ≤ ${String(tolerancia)})`, () => {
          const motor = ctx.ipc(parsearMes(c.referencia)) / ctx.ipc(parsearMes(mes));
          expect(Math.abs(motor / factor - 1)).toBeLessThanOrEqual(tolerancia);
        });
      }
    });
  }

  it('cubre los cuatro casos y todos los meses de los informes', () => {
    expect(CASOS.map((c) => c.caso)).toEqual([
      'jub-ord-2026-plana-40a',
      'jub-ord-2027-05-plana-40a',
      'jub-ord-2027-11-plana-40a',
      'jub-ord-2026-carrera-20a',
    ]);
    expect(CASOS.reduce((n, c) => n + Object.keys(c.factores).length, 0)).toBe(12 + 11 + 5 + 8);
  });
});
