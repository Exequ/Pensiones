/** Parámetros del motor de PNC desde /data/parametros del repositorio (Vite o Vitest). */
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { construirParametrosPNC, type ParametrosPNC } from './parametros.ts';

let cache: ParametrosPNC | undefined;

export function parametrosPNCDelRepositorio(): ParametrosPNC {
  cache ??= construirParametrosPNC(leerParametroDeRepositorio);
  return cache;
}
