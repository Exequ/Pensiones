/**
 * Ficheros de /data que lee la página «Cómo se calcula». Es la lista que comprueba el test de
 * procedencia (`scripts/como-se-calcula-fase.test.ts`): cada fichero debe tener fuente, fecha de
 * descarga y confianza en cada dato, y los módulos de la página solo pueden leer estos. Los
 * ficheros de `data/parametros/` los lee además el motor (a través de `leerParametroDeRepositorio`).
 * Sin dependencias.
 */
export const FICHEROS_COMO_SE_CALCULA = [
  'data/ejemplos/como-se-calcula.json',
  'data/parametros/actualizacion-bases.json',
  'data/parametros/base-maxima-rg.json',
  'data/parametros/base-minima-rg.json',
  'data/parametros/carencia-jubilacion.json',
  'data/parametros/carrera-jubilacion-65.json',
  'data/parametros/complemento-brecha-genero.json',
  'data/parametros/divisor-base-reguladora.json',
  'data/parametros/edad-ordinaria-jubilacion.json',
  'data/parametros/escala-jubilacion-tramos.json',
  'data/parametros/incapacidad-permanente-reglas.json',
  'data/parametros/jubilacion-anticipada-reglas.json',
  'data/parametros/jubilacion-coeficientes-involuntaria.json',
  'data/parametros/jubilacion-coeficientes-voluntaria.json',
  'data/parametros/jubilacion-demora-reglas.json',
  'data/parametros/jubilacion-edad-65.json',
  'data/parametros/jubilacion-periodo-previo.json',
  'data/parametros/lagunas-integracion.json',
  'data/parametros/pension-maxima.json',
  'data/parametros/pension-minima-incapacidad.json',
  'data/parametros/pension-minima-jubilacion.json',
  'data/parametros/pension-minima-orfandad-familiares.json',
  'data/parametros/pension-minima-viudedad.json',
  'data/parametros/periodo-calculo-base-reguladora.json',
  'data/parametros/revalorizacion-general.json',
  'data/parametros/smi-anual.json',
  'data/parametros/supervivencia-reglas.json',
] as const;

/** Nombre del fichero de parámetros sin carpeta ni extensión (`divisor-base-reguladora`). */
export const nombreParametro = (ruta: string): string =>
  ruta.replace(/^data\/parametros\//, '').replace(/\.json$/, '');
