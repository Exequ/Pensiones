/**
 * Propiedades del motor de incapacidad permanente sobre una rejilla de años (2022-2040, escenario de
 * IPC del 2 % a partir de los últimos datos), edades, carreras y grados: sin NaN, la pensión sin
 * complementos no supera la máxima, no baja de la mínima cuando corresponde, es monótona en el
 * nivel de las bases y en los meses cotizados, y respeta el orden total ≤ absoluta ≤ gran incapacidad.
 */
import { describe, expect, it } from 'vitest';
import { crearContexto } from '../jubilacion/contexto.ts';
import { parametrosIncapacidadDelRepositorio } from './parametros-datos.ts';
import { calcularIncapacidadPermanente } from './repositorio.ts';
import type { Carrera, GradoIncapacidad, OpcionesIncapacidad, OrigenIncapacidad } from './tipos.ts';

// Las propiedades se comprueban con las dos lecturas de las lagunas del accidente no laboral, puestas
// explícitamente (el valor por defecto fue `integrar` desde la Fase 2-E y vuelve a `sin-integrar` el
// 14-11-2026). Con `integrar` y bases inferiores a la mínima (nivel 900) la monotonía en los meses
// cotizados no se cumple en el accidente no laboral: una carrera más corta tiene más meses
// integrados a la base mínima, que supera a esas bases. Esa propiedad solo se exige a `integrar`
// donde la norma la garantiza (enfermedad común, o bases no inferiores a la mínima).
type LecturaLagunas = 'sin-integrar' | 'integrar';
const LECTURAS_LAGUNAS: readonly LecturaLagunas[] = ['sin-integrar', 'integrar'];
const esc = (lectura: LecturaLagunas): OpcionesIncapacidad => ({
  escenario: { ipc: 0.02 },
  huecoBaseMinima: 'anterior',
  lecturasIncapacidad: { lagunasAccidenteNoLaboral: lectura },
});
const P = parametrosIncapacidadDelRepositorio();
const ctx = crearContexto(P, esc('sin-integrar'));

const ANIOS = [2022, 2024, 2026, 2028, 2032, 2036, 2040];
const EDADES = [28, 40, 50, 58, 63];
const NIVELES = [900, 2000, 4000];
const GRADOS: GradoIncapacidad[] = ['total', 'absoluta', 'gran-incapacidad'];
const ORIGENES: OrigenIncapacidad[] = ['enfermedad-comun', 'accidente-no-laboral'];

function carrera(anioHC: number, edad: number, base: number, mesesMenos = 0): Carrera {
  // Desde los 18 años (o 25 años de carrera como máximo) hasta el mes anterior al hecho causante.
  const inicio = Math.max(anioHC - edad + 18, anioHC - 25);
  return [
    {
      desde: `${String(inicio + Math.floor(mesesMenos / 12))}-${String((mesesMenos % 12) + 1).padStart(2, '0')}`,
      hasta: `${String(anioHC)}-05`,
      baseMensual: base,
    },
  ];
}

function calc(
  lectura: LecturaLagunas,
  anio: number,
  edad: number,
  base: number,
  grado: GradoIncapacidad,
  origen: OrigenIncapacidad,
  extra: OpcionesIncapacidad = {},
  mesesMenos = 0,
) {
  return calcularIncapacidadPermanente(
    carrera(anio, edad, base, mesesMenos),
    `${String(anio - edad)}-03-10`,
    `${String(anio)}-06-15`,
    grado,
    origen,
    { ...esc(lectura), ...extra },
  );
}

describe.each(LECTURAS_LAGUNAS)(
  'propiedades del motor de incapacidad permanente con la lectura de lagunas «%s»',
  (lectura) => {
    let comprobaciones = 0;
    it('sin NaN, máxima, mínima, monotonía y orden de grados', () => {
      for (const anio of ANIOS)
        for (const edad of EDADES)
          for (const origen of ORIGENES)
            for (const nivel of NIVELES) {
              const res = GRADOS.map((g) => calc(lectura, anio, edad, nivel, g, origen));
              for (const [k, r] of res.entries()) {
                if (!r.cumpleRequisitos) continue;
                const g = GRADOS[k] ?? 'total';
                expect(Number.isFinite(r.pensionMensual)).toBe(true);
                const sinComplementos = r.pensionMensual - r.complementoGranIncapacidad;
                const maxima = ctx.pensionMaxima(anio).valor;
                if (r.estado !== 'minima')
                  expect(sinComplementos).toBeLessThanOrEqual(maxima + 1e-6);
                // Mínima de la clase cuando la hay (sin rentas): nunca por debajo.
                const clase =
                  g === 'gran-incapacidad'
                    ? 'ip-gran-invalidez'
                    : g === 'absoluta'
                      ? 'ip-absoluta'
                      : edad >= 65
                        ? 'ip-total-65'
                        : edad >= 60
                          ? 'ip-total-60-64'
                          : origen === 'enfermedad-comun'
                            ? 'ip-total-enf-comun-menor60'
                            : undefined;
                if (clase !== undefined) {
                  const minima = ctx.pensionMinimaAnual(anio, `${clase}-unipersonal`).valor / 14;
                  expect(r.pensionMensual).toBeGreaterThanOrEqual(minima - 1e-6);
                }
                // Monotonía en el nivel de las bases (+10 %).
                const mas = calc(lectura, anio, edad, nivel * 1.1, g, origen);
                expect(mas.pensionMensual).toBeGreaterThanOrEqual(r.pensionMensual - 1e-6);
                // Monotonía en los meses cotizados: empezar 12 o 60 meses más tarde no la sube.
                const monotoniaMeses =
                  lectura === 'sin-integrar' ||
                  origen === 'enfermedad-comun' ||
                  nivel >= (NIVELES[1] ?? 0);
                for (const menos of monotoniaMeses ? [12, 60] : []) {
                  const corta = calc(lectura, anio, edad, nivel, g, origen, {}, menos);
                  if (corta.cumpleRequisitos)
                    expect(corta.pensionMensual).toBeLessThanOrEqual(r.pensionMensual + 1e-6);
                }
                comprobaciones += 5;
              }
              const [t, a, gi] = res;
              if (t?.cumpleRequisitos && a?.cumpleRequisitos && gi?.cumpleRequisitos) {
                expect(t.pensionMensual).toBeLessThanOrEqual(a.pensionMensual + 1e-6);
                expect(a.pensionMensual).toBeLessThanOrEqual(gi.pensionMensual + 1e-6);
                comprobaciones += 2;
              }
            }
      expect(comprobaciones).toBeGreaterThan(500);
    });
  },
);
