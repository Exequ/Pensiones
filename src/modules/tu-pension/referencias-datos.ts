/**
 * Catálogo de referencias de base leído de /data con Vite (importación de JSON). Solo lo usa la
 * interfaz y los tests de componentes; la lógica (`tramos.ts`, `mapeador.ts`) recibe el catálogo.
 */
import salarios from '../../../data/macro/salario-medio-definiciones.json';
import baseMaxima from '../../../data/parametros/base-maxima-rg.json';
import baseMinima from '../../../data/parametros/base-minima-rg.json';
import { construirCatalogo, type CatalogoReferencias } from './referencias';

let memoria: CatalogoReferencias | undefined;

/** Catálogo del repositorio, construido (y validado con el esquema de /data) una sola vez. */
export function catalogoPorDefecto(): CatalogoReferencias {
  memoria ??= construirCatalogo({ baseMinima, baseMaxima, salarios });
  return memoria;
}
