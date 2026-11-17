/**
 * Ficheros de /data que lee la página «Reformas». Es la lista que comprueba el test de procedencia
 * (`scripts/reformas-fase.test.ts`): `datos-reformas.ts` es el único módulo de la página que importa
 * /data y debe importar exactamente estos. Sin dependencias.
 */
export const FICHERO_CRONOLOGIA = 'data/normativa/cronologia.json';

/** Ficheros de `data/parametros/` de los que salen los valores antes y después y los gráficos. */
export const FICHEROS_PARAMETROS_REFORMAS = [
  'data/parametros/carencia-jubilacion.json',
  'data/parametros/cotizacion-para-100.json',
  'data/parametros/cuota-solidaridad-calendario.json',
  'data/parametros/edad-ordinaria-jubilacion.json',
  'data/parametros/jubilacion-demora-reglas.json',
  'data/parametros/mei-tipo-total.json',
  'data/parametros/periodo-calculo-base-reguladora.json',
  'data/parametros/revalorizacion-general.json',
] as const;

export const FICHEROS_REFORMAS = [FICHERO_CRONOLOGIA, ...FICHEROS_PARAMETROS_REFORMAS] as const;

/** Nombre del fichero de parámetros sin carpeta ni extensión (`periodo-calculo-base-reguladora`). */
export type NombreParametro =
  (typeof FICHEROS_PARAMETROS_REFORMAS)[number] extends `data/parametros/${infer N}.json`
    ? N
    : never;

/** Identificadores de los ficheros de parámetros que usan los gráficos (nombre sin carpeta ni extensión). */
export const FICHERO_GRAFICO = {
  edad: 'edad-ordinaria-jubilacion',
  periodo: 'periodo-calculo-base-reguladora',
  maximo: 'cotizacion-para-100',
} as const satisfies Record<string, NombreParametro>;
