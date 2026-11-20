/**
 * Contexto de las reglas de las interpretaciones leído del disco (Node): referencias de /data, fuentes
 * ficticias del laboratorio de diseño y rutas de la web. Lo usan `scripts/validate-interpretaciones.ts`
 * y las pruebas.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import {
  FUNCIONES_MOTOR_INTERPRETACION,
  Interpretacion,
} from '../../src/engine/interpretaciones.ts';
import { SECCIONES } from '../../src/modules/secciones.ts';
import type { ContextoReglas } from './interpretaciones.ts';

export const RAIZ = path.resolve(import.meta.dirname, '../..');
export const CARPETA_INTERPRETACIONES = path.join(RAIZ, 'src/contenido/interpretaciones');

/** Rutas de la web: portada, secciones, páginas auxiliares y laboratorio de diseño. */
export const RUTAS_WEB: readonly string[] = [
  '/',
  ...SECCIONES.map((s) => `/${s.slug}`),
  '/fuentes',
  '/cambios',
  '/diseno',
];

const cache = new Map<string, Set<string> | null>();

/** Ids de datos y series de un fichero de /data (null si no existe). */
function idsDe(fichero: string): Set<string> | null {
  if (!cache.has(fichero)) {
    try {
      const j = JSON.parse(readFileSync(path.join(RAIZ, fichero), 'utf8')) as {
        data?: { id?: string }[];
        series?: { id?: string }[];
      };
      cache.set(
        fichero,
        new Set([...(j.data ?? []), ...(j.series ?? [])].flatMap((d) => (d.id ? [d.id] : []))),
      );
    } catch {
      cache.set(fichero, null);
    }
  }
  return cache.get(fichero) ?? null;
}

export function contextoDelDisco(): ContextoReglas {
  const muestra = JSON.parse(
    readFileSync(path.join(RAIZ, 'src/design-lab/muestra.json'), 'utf8'),
  ) as { fuentes: unknown[] };
  return {
    existeEnData: (ref) => {
      const [fichero, id] = ref.split('#');
      if (fichero === undefined || id === undefined) return false;
      return idsDe(fichero)?.has(id) ?? false;
    },
    existeEnMuestra: (n) => Number.isInteger(n) && n >= 0 && n < muestra.fuentes.length,
    funcionesMotor: Object.keys(FUNCIONES_MOTOR_INTERPRETACION),
    rutas: RUTAS_WEB,
  };
}

/** Registros del disco con su nombre de fichero. */
export function registrosDelDisco(): { fichero: string; json: unknown }[] {
  return readdirSync(CARPETA_INTERPRETACIONES)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((fichero) => ({
      fichero,
      json: JSON.parse(
        readFileSync(path.join(CARPETA_INTERPRETACIONES, fichero), 'utf8'),
      ) as unknown,
    }));
}

export { Interpretacion };
