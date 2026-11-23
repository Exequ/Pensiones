import { definicionPorId } from '../../contenido/definiciones';

/**
 * Definiciones del módulo de definiciones (fase R7) que muestra la página, por apartado. Solo ids
 * estables: el texto está en `src/contenido/definiciones`.
 */

/** Ids de los tres saldos que se muestran lado a lado. */
export const DEFINICIONES_SALDO = [
  'saldo-presupuestario-no-financiero',
  'saldo-presupuestario-total',
  'capacidad-necesidad-financiacion-sec',
] as const;

/** Ids de las medidas del gasto sobre el PIB, en su orden. */
export const DEFINICIONES_GASTO = [
  'gasto-sobre-pib',
  'gasto-pensiones-contributivas-con-complemento',
  'gasto-pensiones-contributivas-sin-complemento',
  'gasto-pensiones-esspros-vejez',
  'gasto-pensiones-esspros-vejez-supervivientes',
  'gasto-pensiones-ocde',
] as const;

/** Rótulo del saldo no financiero menos las transferencias corrientes: el término de su definición. */
export const ROTULO_SALDO_SIN_TRANSFERENCIAS = definicionPorId(
  'saldo-no-financiero-menos-transferencias',
).termino;
