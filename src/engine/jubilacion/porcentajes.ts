/**
 * Porcentaje de la base reguladora por meses cotizados (art. 210.1 y DT 9.ª) y coeficientes
 * reductores por anticipación (arts. 207.2 y 208.2, DT 34.ª). Funciones puras sobre tablas de /data.
 */
import { DatoNoDisponible, NoImplementada } from './errores.ts';
import type { ParametrosJubilacion, TablaCoeficientes, VersionEscala } from './parametros.ts';
import { ref, versionEn } from './parametros.ts';

export function versionEscala(p: ParametrosJubilacion, anio: number): VersionEscala {
  return versionEn(p.escala, anio, 'escala-jubilacion-tramos');
}

/** Porcentaje (0-100) de la base reguladora que corresponde a `meses` meses cotizados. */
export function porcentajeEscala(v: VersionEscala, meses: number): number {
  if (meses < v.baseMeses) return 0;
  const extra = meses - v.baseMeses;
  const p =
    v.basePct +
    v.tramo1Pct * Math.min(extra, v.tramo1Meses) +
    v.tramo2Pct * Math.min(Math.max(extra - v.tramo1Meses, 0), v.tramo2Meses);
  return Math.min(p, v.maximoPct);
}

/** Menor número de meses cotizados con el que la escala llega al máximo. */
export function mesesPara100(v: VersionEscala): number {
  const tope = v.baseMeses + v.tramo1Meses + v.tramo2Meses + 12;
  for (let m = v.baseMeses; m <= tope; m++)
    if (porcentajeEscala(v, m) >= v.maximoPct - 1e-9) return m;
  throw new DatoNoDisponible('la escala no llega al máximo con los tramos de /data');
}

/** Tramo de periodo cotizado (1-4) de las tablas de coeficientes. */
export function tramoCotizacion(tabla: TablaCoeficientes, mesesCotizados: number): 1 | 2 | 3 | 4 {
  const [u2, u3, u4] = tabla.umbralesMeses;
  if (mesesCotizados >= u4) return 4;
  if (mesesCotizados >= u3) return 3;
  if (mesesCotizados >= u2) return 2;
  return 1;
}

export interface CoeficienteReductor {
  /** Porcentaje de reducción (0-100). */
  readonly pct: number;
  readonly tramo: 1 | 2 | 3 | 4;
  readonly ref: string;
}

/** Coeficiente de reducción para `mesesAnticipo` meses (cada mes o fracción cuenta como uno). */
export function coeficienteReductor(
  tabla: TablaCoeficientes,
  mesesAnticipo: number,
  mesesCotizados: number,
): CoeficienteReductor {
  const tramo = tramoCotizacion(tabla, mesesCotizados);
  const id = `t${tramo}-${mesesAnticipo}`;
  const pct = tabla.coeficientes.get(id);
  if (pct === undefined)
    throw new DatoNoDisponible(`${tabla.fichero}#${id}: anticipación fuera del cuadro`);
  return { pct, tramo, ref: ref(tabla.fichero, id) };
}

/**
 * Coeficiente que se aplica sobre el límite de pensión en la jubilación voluntaria (art. 210.3,
 * párrafo 2.º): gradual de 2024 a 2033 (DT 34.ª); desde 2034, el del art. 208.2.
 */
export function coeficienteSobreLimite(
  p: ParametrosJubilacion,
  anio: number,
  mesesAnticipo: number,
  mesesCotizados: number,
): CoeficienteReductor {
  const tramo = tramoCotizacion(p.coeficientesVoluntaria, mesesCotizados);
  const anios = [...p.coeficientesVoluntariaLimite.keys()].map((k) => Number(k.slice(0, 4)));
  const primero = Math.min(...anios);
  const ultimo = Math.max(...anios);
  if (anio < primero) {
    throw new NoImplementada(
      'Coeficientes sobre el límite de pensión en 2022-2023',
      'Rige la redacción original del art. 210.3 (RDLeg 8/2015), no transcrita en /data.',
    );
  }
  if (anio > ultimo)
    return coeficienteReductor(p.coeficientesVoluntaria, mesesAnticipo, mesesCotizados);
  const id = `${anio}-t${tramo}-${mesesAnticipo}`;
  const pct = p.coeficientesVoluntariaLimite.get(id);
  if (pct === undefined)
    throw new DatoNoDisponible(`jubilacion-coeficientes-voluntaria-limite#${id}`);
  return { pct, tramo, ref: ref('jubilacion-coeficientes-voluntaria-limite', id) };
}
