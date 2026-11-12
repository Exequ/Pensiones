/** Parámetros del motor del MEI desde /data/parametros del repositorio (Vite o Vitest). */
import { leerParametroDeRepositorio } from '../jubilacion/parametros-datos.ts';
import { construirParametrosMEI, type ParametrosMEI } from './parametros.ts';

let cache: ParametrosMEI | undefined;

export function parametrosMEIDelRepositorio(): ParametrosMEI {
  cache ??= construirParametrosMEI(leerParametroDeRepositorio);
  return cache;
}
