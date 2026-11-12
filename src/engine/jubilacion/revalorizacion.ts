/**
 * Revalorización anual de las pensiones (art. 58.2 TRLGSS) y conversión a euros constantes.
 */
import { aEurosConstantesDelContexto, crearContexto, type Contexto } from './contexto.ts';
import type { ParametrosJubilacion } from './parametros.ts';
import type { OpcionesJubilacion } from './tipos.ts';

export interface ImporteRevalorizado {
  readonly anio: number;
  readonly importe: number;
  /** Revalorización aplicada al comienzo de ese año (en %). */
  readonly revalorizacionPct: number;
}

/**
 * Pensión mensual de cada año desde el del hecho causante hasta `anioFinal`: cada 1 de enero se
 * multiplica por (1 + revalorización/100). La del propio año del hecho causante es la inicial.
 */
export function serieRevalorizada(
  ctx: Contexto,
  pensionInicial: number,
  anioHechoCausante: number,
  anioFinal: number,
): ImporteRevalorizado[] {
  const serie: ImporteRevalorizado[] = [
    { anio: anioHechoCausante, importe: pensionInicial, revalorizacionPct: 0 },
  ];
  let importe = pensionInicial;
  for (let anio = anioHechoCausante + 1; anio <= anioFinal; anio++) {
    const r = ctx.revalorizacionPct(anio);
    importe *= 1 + r / 100;
    serie.push({ anio, importe, revalorizacionPct: r });
  }
  return serie;
}

export function revalorizarPension(
  params: ParametrosJubilacion,
  pensionInicial: number,
  anioHechoCausante: number,
  anioFinal: number,
  opciones: OpcionesJubilacion = {},
): ImporteRevalorizado[] {
  return serieRevalorizada(
    crearContexto(params, opciones),
    pensionInicial,
    anioHechoCausante,
    anioFinal,
  );
}

/** Expresa un importe nominal en euros constantes de otro año (IPC de /data y del escenario). */
export function aEurosConstantesMotor(
  params: ParametrosJubilacion,
  importe: number,
  anioNominal: number,
  anioBase: number,
  opciones: OpcionesJubilacion = {},
): number {
  return aEurosConstantesDelContexto(
    crearContexto(params, opciones),
    importe,
    anioNominal,
    anioBase,
  );
}
