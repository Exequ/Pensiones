/** Catálogo de referencias de base de «Tu pensión» leído de /data con Node (para los tests de scripts/). */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import {
  construirCatalogo,
  type CatalogoReferencias,
} from '../../src/modules/tu-pension/referencias.ts';
import { RAIZ } from './motor-jubilacion.ts';

const leer = (ruta: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, 'data', ruta), 'utf8')) as unknown;

export function catalogoDesdeDisco(): CatalogoReferencias {
  return construirCatalogo({
    baseMinima: leer('parametros/base-minima-rg.json'),
    baseMaxima: leer('parametros/base-maxima-rg.json'),
    salarios: leer('macro/salario-medio-definiciones.json'),
  });
}
