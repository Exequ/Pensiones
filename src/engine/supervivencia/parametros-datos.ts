/**
 * Parámetros del motor de supervivencia desde /data/parametros del repositorio (Vite o Vitest). Los
 * scripts de Node usan `construirParametrosSupervivencia` con su propia lectura.
 */
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { construirParametrosSupervivencia, type ParametrosSupervivencia } from './parametros.ts';

let cache: ParametrosSupervivencia | undefined;

export function parametrosSupervivenciaDelRepositorio(): ParametrosSupervivencia {
  cache ??= construirParametrosSupervivencia(leerParametroDeRepositorio);
  return cache;
}
