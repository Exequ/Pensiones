/**
 * Parámetros del motor de incapacidad permanente desde /data/parametros del repositorio (Vite o
 * Vitest). Los scripts de Node usan `construirParametrosIncapacidad` con su propia lectura.
 */
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { construirParametrosIncapacidad, type ParametrosIncapacidad } from './parametros.ts';

let cache: ParametrosIncapacidad | undefined;

export function parametrosIncapacidadDelRepositorio(): ParametrosIncapacidad {
  cache ??= construirParametrosIncapacidad(leerParametroDeRepositorio);
  return cache;
}
