/**
 * Carga los parámetros del motor desde los ficheros de /data/parametros del repositorio.
 * Solo funciona con Vite o Vitest (usa `import.meta.glob`). Los scripts de Node usan
 * `construirParametros` con su propia lectura de ficheros.
 */
import { construirParametros, type ParametrosJubilacion } from './parametros.ts';

const FICHEROS = import.meta.glob<unknown>('../../../data/parametros/*.json', {
  eager: true,
  import: 'default',
});

export function leerParametroDeRepositorio(nombre: string): unknown {
  const clave = `../../../data/parametros/${nombre}.json`;
  const contenido = FICHEROS[clave];
  if (contenido === undefined) throw new Error(`No existe data/parametros/${nombre}.json`);
  return contenido;
}

let cache: ParametrosJubilacion | undefined;

/** Parámetros del repositorio, construidos una sola vez. */
export function parametrosDelRepositorio(): ParametrosJubilacion {
  cache ??= construirParametros(leerParametroDeRepositorio);
  return cache;
}
