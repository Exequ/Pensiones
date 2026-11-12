/**
 * Cálculo de cada prestación por separado. Son atajos de `calcularSupervivenciaConParametros` con
 * un solo grupo de beneficiarios: el límite conjunto del art. 229 se aplica solo dentro del grupo.
 * Para combinar varias prestaciones de un mismo causante, usar la función conjunta.
 */
import { calcularSupervivenciaConParametros } from './calculo.ts';
import type { ParametrosSupervivencia } from './parametros.ts';
import type {
  BeneficiarioViudedad,
  Causante,
  Familiar,
  Huerfano,
  OpcionesSupervivencia,
  ResultadoSupervivencia,
} from './tipos.ts';

export function calcularViudedadConParametros(
  params: ParametrosSupervivencia,
  causante: Causante,
  viudos: readonly BeneficiarioViudedad[],
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  return calcularSupervivenciaConParametros(params, causante, { viudos }, opciones);
}

/** Orfandad sin viudedad en el cálculo (con `opciones.orfandadAbsoluta`, el incremento del 52 %). */
export function calcularOrfandadConParametros(
  params: ParametrosSupervivencia,
  causante: Causante,
  huerfanos: readonly Huerfano[],
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  return calcularSupervivenciaConParametros(params, causante, { huerfanos }, opciones);
}

/**
 * Favor de familiares sin viudedad ni orfandad en el cálculo; si las hay, indicarlo con
 * `opciones.hayViudoOHuerfanosPensionistas` (sin incremento y con la mínima general).
 */
export function calcularFavorFamiliaresConParametros(
  params: ParametrosSupervivencia,
  causante: Causante,
  familiares: readonly Familiar[],
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  return calcularSupervivenciaConParametros(params, causante, { familiares }, opciones);
}
