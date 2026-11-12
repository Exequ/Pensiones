/**
 * Motor de incapacidad permanente con los parámetros de /data del repositorio (solo Vite o Vitest).
 */
import { calcularIncapacidadPermanenteConParametros } from './calculo.ts';
import { parametrosIncapacidadDelRepositorio } from './parametros-datos.ts';
import { revalorizarIncapacidad, type ImporteIncapacidadRevalorizado } from './revalorizacion.ts';
import type {
  Carrera,
  GradoIncapacidad,
  OpcionesIncapacidad,
  OrigenIncapacidad,
  ResultadoIncapacidad,
} from './tipos.ts';

export function calcularIncapacidadPermanente(
  carrera: Carrera,
  nacimiento: string,
  fechaHechoCausante: string,
  grado: GradoIncapacidad,
  origen: OrigenIncapacidad,
  opciones: OpcionesIncapacidad = {},
): ResultadoIncapacidad {
  return calcularIncapacidadPermanenteConParametros(
    parametrosIncapacidadDelRepositorio(),
    carrera,
    nacimiento,
    fechaHechoCausante,
    grado,
    origen,
    opciones,
  );
}

export function revalorizarIncapacidadDelRepositorio(
  resultado: ResultadoIncapacidad,
  anioFinal: number,
  opciones: OpcionesIncapacidad = {},
): ImporteIncapacidadRevalorizado[] {
  return revalorizarIncapacidad(
    parametrosIncapacidadDelRepositorio(),
    resultado,
    anioFinal,
    opciones,
  );
}
