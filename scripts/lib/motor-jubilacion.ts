/**
 * Parámetros del motor de jubilación leídos del disco (para scripts y tests de Node).
 * La interfaz usa `src/engine/jubilacion/parametros-datos.ts`, que lee lo mismo con Vite.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  construirParametros,
  type ParametrosJubilacion,
} from '../../src/engine/jubilacion/parametros.ts';

export const RAIZ = path.resolve(import.meta.dirname, '../..');

export function leerParametroDeDisco(nombre: string): unknown {
  return JSON.parse(
    readFileSync(path.join(RAIZ, 'data/parametros', `${nombre}.json`), 'utf8'),
  ) as unknown;
}

let cache: ParametrosJubilacion | undefined;

export function parametrosDesdeDisco(): ParametrosJubilacion {
  cache ??= construirParametros(leerParametroDeDisco);
  return cache;
}
