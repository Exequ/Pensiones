/** Motor de PNC con los parámetros de /data del repositorio (solo Vite o Vitest). */
import {
  calcularPNCInvalidezConParametros,
  calcularPNCJubilacionConParametros,
} from './calculo.ts';
import { parametrosPNCDelRepositorio } from './parametros-datos.ts';
import type { OpcionesPNC, ResultadoPNC, SolicitantePNC } from './tipos.ts';

export function calcularPNCJubilacion(
  solicitante: SolicitantePNC,
  opciones: OpcionesPNC = {},
): ResultadoPNC {
  return calcularPNCJubilacionConParametros(parametrosPNCDelRepositorio(), solicitante, opciones);
}

export function calcularPNCInvalidez(
  solicitante: SolicitantePNC,
  opciones: OpcionesPNC = {},
): ResultadoPNC {
  return calcularPNCInvalidezConParametros(parametrosPNCDelRepositorio(), solicitante, opciones);
}
