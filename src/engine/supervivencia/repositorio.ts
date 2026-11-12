/**
 * Motor de muerte y supervivencia con los parámetros de /data del repositorio (solo Vite o Vitest).
 */
import type { ImporteRevalorizado } from '../jubilacion/revalorizacion.ts';
import { calcularSupervivenciaConParametros } from './calculo.ts';
import { parametrosSupervivenciaDelRepositorio } from './parametros-datos.ts';
import {
  calcularFavorFamiliaresConParametros,
  calcularOrfandadConParametros,
  calcularViudedadConParametros,
} from './prestaciones.ts';
import { revalorizarSupervivencia } from './revalorizacion.ts';
import type {
  BeneficiarioViudedad,
  Beneficiarios,
  Causante,
  Familiar,
  Huerfano,
  OpcionesSupervivencia,
  ResultadoPrestacion,
  ResultadoSupervivencia,
} from './tipos.ts';

const p = parametrosSupervivenciaDelRepositorio;

export function calcularSupervivencia(
  causante: Causante,
  beneficiarios: Beneficiarios,
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  return calcularSupervivenciaConParametros(p(), causante, beneficiarios, opciones);
}

export function calcularViudedad(
  causante: Causante,
  viudos: readonly BeneficiarioViudedad[],
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  return calcularViudedadConParametros(p(), causante, viudos, opciones);
}

export function calcularOrfandad(
  causante: Causante,
  huerfanos: readonly Huerfano[],
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  return calcularOrfandadConParametros(p(), causante, huerfanos, opciones);
}

export function calcularFavorFamiliares(
  causante: Causante,
  familiares: readonly Familiar[],
  opciones: OpcionesSupervivencia = {},
): ResultadoSupervivencia {
  return calcularFavorFamiliaresConParametros(p(), causante, familiares, opciones);
}

export function revalorizarSupervivenciaDelRepositorio(
  prestacion: ResultadoPrestacion,
  anioHechoCausante: number,
  anioFinal: number,
  opciones: OpcionesSupervivencia = {},
): ImporteRevalorizado[] {
  return revalorizarSupervivencia(p(), prestacion, anioHechoCausante, anioFinal, opciones);
}
