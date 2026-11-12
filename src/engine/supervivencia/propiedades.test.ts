/**
 * Propiedades del motor de muerte y supervivencia sobre una rejilla de casos: sin NaN, límite
 * conjunto del art. 229 (con su excepción), pensión máxima, mínimos, monotonía en las bases y en el
 * número de huérfanos.
 */
import { describe, expect, it } from 'vitest';
import { calcularSupervivencia } from './repositorio.ts';
import type { BeneficiarioViudedad, Beneficiarios, Causante } from './tipos.ts';

const ANIOS = [2022, 2024, 2026];
const NIVELES = [700, 1500, 3000, 4500];
const N_HUERFANOS = [0, 1, 2, 3, 5];
const VIUDAS: readonly (BeneficiarioViudedad | undefined)[] = [
  undefined,
  { vinculo: 'conyuge', nacimiento: '1980-01-01', fechaMatrimonio: '2005-01-01' },
  { vinculo: 'conyuge', nacimiento: '1950-01-01', fechaMatrimonio: '1975-01-01' },
  {
    vinculo: 'conyuge',
    nacimiento: '1982-01-01',
    fechaMatrimonio: '2006-01-01',
    cargasFamiliares: { miembrosUnidadFamiliar: 4, rendimientosUnidadFamiliar: 8000 },
  },
];
const TOL = 1e-6;

const causante = (anio: number, base: number): Causante => ({
  fechaFallecimiento: `${anio}-06-15`,
  causa: 'enfermedad-comun',
  situacion: 'alta',
  carrera: [{ desde: '2005-01', hasta: `${anio}-05`, baseMensual: base }],
});

function beneficiarios(viuda: BeneficiarioViudedad | undefined, n: number): Beneficiarios {
  return {
    ...(viuda ? { viudos: [viuda] } : {}),
    huerfanos: Array.from({ length: n }, (_, k) => ({ nacimiento: `${2008 + k}-03-01` })),
    familiares: [
      {
        parentesco: 'madre',
        nacimiento: '1945-01-01',
        convivenciaMeses: 40,
        estadoCivilCumple: true,
      },
    ],
  };
}

describe('Propiedades del motor de supervivencia', () => {
  it('rejilla: sin NaN, límite conjunto, máxima y mínimos', () => {
    let comprobaciones = 0;
    for (const anio of ANIOS)
      for (const base of NIVELES)
        for (const viuda of VIUDAS)
          for (const n of N_HUERFANOS)
            for (const absoluta of [false, true]) {
              const r = calcularSupervivencia(causante(anio, base), beneficiarios(viuda, n), {
                orfandadAbsoluta: absoluta && viuda === undefined,
              });
              const todas = [...r.viudedad, ...r.orfandad, ...r.favorFamiliares];
              for (const p of todas) {
                expect(Number.isFinite(p.pensionMensual)).toBe(true);
                expect(p.pensionMensual).toBeGreaterThanOrEqual(0);
                // La contributiva nunca supera la pensión máxima del año.
                const maxima = { 2022: 2819.18, 2024: 3175.04, 2026: 3359.6 }[anio] ?? 0;
                expect(p.pensionContributiva).toBeLessThanOrEqual(maxima + TOL);
                // Con rentas nulas, quien tiene derecho no baja de la mínima de su clase (la menor: orfandad).
                if (p.cumpleRequisitos) expect(p.pensionMensual).toBeGreaterThan(0);
                comprobaciones++;
              }
              // Límite conjunto: la suma de pensiones contributivas no supera la base reguladora,
              // salvo la excepción del art. 229.3 (viudedad > 52 % y varias orfandades ≤ 48 %).
              const v = r.viudedad.reduce((a, p) => a + p.pensionContributiva, 0);
              const o = r.orfandad.reduce((a, p) => a + p.pensionContributiva, 0);
              const f = r.favorFamiliares.reduce((a, p) => a + p.pensionContributiva, 0);
              const pctV = Math.max(0, ...r.viudedad.map((p) => p.porcentaje));
              if (pctV > 52 && r.orfandad.filter((p) => p.cumpleRequisitos).length > 1) {
                expect(o).toBeLessThanOrEqual(
                  Math.max(r.baseReguladora - v, 0.48 * r.baseReguladora) + TOL,
                );
                expect(f).toBeLessThanOrEqual(Math.max(0, r.baseReguladora - v - o) + TOL);
              } else {
                expect(v + o + f).toBeLessThanOrEqual(r.baseReguladora + TOL);
              }
              comprobaciones++;
            }
    expect(comprobaciones).toBeGreaterThan(500);
  });

  it('monotonía: la pensión de viudedad y la suma de orfandades no bajan al subir las bases', () => {
    for (const anio of ANIOS)
      for (const n of N_HUERFANOS) {
        let previaV = 0;
        let previaO = 0;
        for (const base of [600, 900, 1200, 1800, 2400, 3600, 4800]) {
          const r = calcularSupervivencia(causante(anio, base), beneficiarios(VIUDAS[1], n));
          const vv = r.viudedad[0]?.pensionMensual ?? 0;
          const oo = r.orfandad.reduce((a, p) => a + p.pensionMensual, 0);
          expect(vv).toBeGreaterThanOrEqual(previaV - TOL);
          expect(oo).toBeGreaterThanOrEqual(previaO - TOL);
          previaV = vv;
          previaO = oo;
        }
      }
  });

  it('más huérfanos: la suma de orfandades no baja y la pensión de cada uno no sube', () => {
    for (const anio of ANIOS)
      for (const base of NIVELES) {
        let suma = 0;
        let cada = Infinity;
        for (const n of [1, 2, 3, 4, 5, 6]) {
          const r = calcularSupervivencia(causante(anio, base), beneficiarios(VIUDAS[1], n), {
            aplicarMinimos: false,
          });
          const s = r.orfandad.reduce((a, p) => a + p.pensionMensual, 0);
          const c0 = r.orfandad[0]?.pensionMensual ?? 0;
          expect(s).toBeGreaterThanOrEqual(suma - TOL);
          expect(c0).toBeLessThanOrEqual(cada + TOL);
          suma = s;
          cada = c0;
        }
      }
  });

  it('el límite conjunto no reduce nunca la viudedad (lectura por defecto)', () => {
    for (const n of N_HUERFANOS) {
      const sola = calcularSupervivencia(causante(2026, 2000), {
        viudos: [VIUDAS[1] as BeneficiarioViudedad],
      });
      const con = calcularSupervivencia(causante(2026, 2000), beneficiarios(VIUDAS[1], n));
      expect(con.viudedad[0]?.pensionMensual).toBeCloseTo(
        sola.viudedad[0]?.pensionMensual ?? -1,
        6,
      );
    }
  });
});
