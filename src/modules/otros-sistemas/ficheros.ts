/**
 * Ficheros de /data que lee la página «Otros sistemas» (Fase 5-C). Es la lista que comprueba el
 * test de procedencia (`scripts/sistemas-tipos-5c.test.ts`): cada fichero debe tener fuente, fecha
 * de descarga y confianza, y `datos-sistemas.ts` debe importar exactamente estos. Sin dependencias.
 * Las tablas se listan por su JSON; el CSV hermano tiene el mismo nombre.
 */
export const FICHEROS_OTROS_SISTEMAS = [
  'data/internacional/contraste-espana.json',
  'data/internacional/eurostat-indicadores.json',
  'data/internacional/ocde-pag-codigos.json',
  'data/internacional/ocde-pag.json',
  'data/internacional/ocde-supuestos-reposicion.json',
  'data/internacional/paises-sistemas.json',
] as const;
