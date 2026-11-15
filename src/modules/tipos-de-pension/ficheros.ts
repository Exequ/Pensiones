/**
 * Ficheros de /data que lee la página «Tipos de pensión» (Fase 5-C). Es la lista que comprueba el
 * test de procedencia (`scripts/sistemas-tipos-5c.test.ts`): cada fichero debe tener fuente, fecha
 * de descarga y confianza, y `datos-tipos.ts` debe importar exactamente estos. Sin dependencias.
 * Las tablas se listan por su JSON; el CSV hermano tiene el mismo nombre.
 */
export const FICHEROS_TIPOS_DE_PENSION = [
  'data/normativa/prestaciones.json',
  'data/parametros/pension-maxima.json',
  'data/parametros/pension-minima-incapacidad.json',
  'data/parametros/pension-minima-jubilacion.json',
  'data/parametros/pension-minima-orfandad-familiares.json',
  'data/parametros/pension-minima-viudedad.json',
  'data/parametros/pnc-importe-anual.json',
  'data/parametros/pnc-reglas.json',
  'data/parametros/supervivencia-reglas.json',
  'data/sistema/imserso-pnc-evolucion.json',
  'data/sistema/imserso-pnc-perfil-2025.json',
  'data/sistema/pensiones-vigor-numero.json',
  'data/sistema/pensiones-vigor-pension-media.json',
] as const;
