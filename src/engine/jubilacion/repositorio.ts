/**
 * Motor de jubilación con los parámetros de /data del repositorio (solo Vite o Vitest).
 * Es la entrada que usará la interfaz del simulador «Tu pensión».
 */
import { calcularJubilacionConParametros, fechaEdadOrdinaria } from './calculo.ts';
import { parametrosDelRepositorio } from './parametros-datos.ts';
import {
  aEurosConstantesMotor,
  revalorizarPension,
  type ImporteRevalorizado,
} from './revalorizacion.ts';
import type { Carrera, Modalidad, OpcionesJubilacion, ResultadoJubilacion } from './tipos.ts';

export function calcularJubilacion(
  carrera: Carrera,
  nacimiento: string,
  fechaJubilacion: string,
  modalidad: Modalidad,
  opciones: OpcionesJubilacion = {},
): ResultadoJubilacion {
  return calcularJubilacionConParametros(
    parametrosDelRepositorio(),
    carrera,
    nacimiento,
    fechaJubilacion,
    modalidad,
    opciones,
  );
}

export function fechaOrdinaria(
  carrera: Carrera,
  nacimiento: string,
  opciones: OpcionesJubilacion = {},
): string | undefined {
  return fechaEdadOrdinaria(parametrosDelRepositorio(), carrera, nacimiento, opciones);
}

export function revalorizar(
  pensionInicial: number,
  anioHechoCausante: number,
  anioFinal: number,
  opciones: OpcionesJubilacion = {},
): ImporteRevalorizado[] {
  return revalorizarPension(
    parametrosDelRepositorio(),
    pensionInicial,
    anioHechoCausante,
    anioFinal,
    opciones,
  );
}

export function aEurosConstantesDe(
  importe: number,
  anioNominal: number,
  anioBase: number,
  opciones: OpcionesJubilacion = {},
): number {
  return aEurosConstantesMotor(
    parametrosDelRepositorio(),
    importe,
    anioNominal,
    anioBase,
    opciones,
  );
}
