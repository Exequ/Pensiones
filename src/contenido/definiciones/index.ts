/**
 * Definiciones reutilizables (fase R7): un JSON por definición en esta carpeta, con el nombre de su
 * `id`. Se validan con el esquema al cargarlas (`src/engine/definiciones.ts`) y con las pruebas de
 * `scripts/definiciones.test.ts` (sin cifras escritas, referencias que existen en /data, fórmulas
 * coherentes). Para añadir una, basta con añadir su fichero: ninguna página hay que tocar.
 */
import { buscarDefinicion, leerDefinicion, type Definicion } from '../../engine/definiciones';

const FICHEROS = import.meta.glob<unknown>('./*.json', { eager: true, import: 'default' });

export const DEFINICIONES: readonly Definicion[] = Object.entries(FICHEROS)
  .map(([fichero, json]) => leerDefinicion(/\.\/(.+)\.json$/.exec(fichero)?.[1] ?? fichero, json))
  .sort((a, b) => a.id.localeCompare(b.id));

/** Definición por id; falla con un mensaje claro (y la lista de ids válidos) si no existe. */
export function definicionPorId(id: string): Definicion {
  return buscarDefinicion(DEFINICIONES, id);
}
