/**
 * Ficheros de /data que lee la página «Proyecciones» (Fase 5-B1). Es la lista que comprueba el test
 * de procedencia (`scripts/proyecciones-5b1.test.ts` y `datos.test.ts`): cada fichero debe tener
 * fuente, fecha de descarga y confianza, y `datos-proyecciones.ts` debe importar exactamente estos.
 * Las tablas se listan por su JSON; el CSV hermano tiene el mismo nombre. Sin dependencias.
 */

/** Salidas de los modelos M1, M2 y M3 (naturaleza «proyección de modelo»). */
export const FICHEROS_MODELOS = [
  'data/proyecciones/m1-backtest.json',
  'data/proyecciones/m1-contraste-ine.json',
  'data/proyecciones/m1-escenarios.json',
  'data/proyecciones/m2-cotizantes.json',
  'data/proyecciones/m2-relacion-pensiones.json',
  'data/proyecciones/m3-pensiones.json',
  'data/proyecciones/m3-resumen.json',
] as const;

/** Datos observados o de otras proyecciones publicadas con los que se comparan los modelos. */
export const FICHEROS_CONTRASTE = [
  'data/demografia/ageing-report-2024-espana.json',
  'data/demografia/poblacion-edad-sexo.json',
  'data/demografia/proyecciones-poblacion.json',
  'data/macro/base-media-cotizacion-rg-mensual.json',
  'data/parametros/ipc-indice-medio-anual.json',
  'data/sistema/afiliacion-anual.json',
  'data/sistema/pensiones-vigor-numero.json',
  'data/sistema/relacion-afiliados-pensiones.json',
] as const;

export const FICHEROS_PROYECCIONES = [...FICHEROS_MODELOS, ...FICHEROS_CONTRASTE] as const;

/**
 * Ficheros de /data que lee el bloque «Sistema financiero (M4)» de la página (Fase 5-B2), en el módulo
 * `datos-financiero.ts` (carga diferida). La ejecución del presupuesto, el PIB del INE y el saldo
 * presupuestario llegan a través de `historico/datos-financiacion.ts` (lista `FICHEROS_FINANCIACION`,
 * ya comprobada por `historico-5a.test.ts`).
 */
export const FICHEROS_FINANCIERO_MODELO = ['data/proyecciones/m4-financiero.json'] as const;

export const FICHEROS_FINANCIERO_CONTRASTE = [
  'data/demografia/ageing-report-2024-espana.json',
  'data/parametros/fondo-reserva-desembolso-maximo.json',
  'data/parametros/ipc-indice-medio-anual.json',
  'data/sistema/fondo-reserva-series.json',
  'data/sistema/pensiones-vigor-pension-media.json',
] as const;

export const FICHEROS_FINANCIERO = [
  ...FICHEROS_FINANCIERO_MODELO,
  ...FICHEROS_FINANCIERO_CONTRASTE,
] as const;
