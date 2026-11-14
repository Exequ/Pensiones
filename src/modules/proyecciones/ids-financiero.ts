/**
 * Identificadores de las columnas de `data/proyecciones/m4-financiero.json` y de las series de /data
 * que usa el bloque financiero. Son nombres de /data, no cifras de datos (algunos llevan dígitos, como
 * las tablas del Ageing Report): por eso viven aparte y el test de «sin cifras escritas a mano» los
 * excluye, igual que `ids-datos.ts`.
 */
export const COL4 = {
  anio: 'anio',
  pensiones: 'pensiones_oct',
  pensionMediaJubilacion: 'pension_media_jub',
  pensionMediaTotal: 'pension_media_total',
  gasto: 'gasto_pensiones',
  cotizaciones: 'cotizaciones',
  mei: 'mei',
  otrosGastos: 'otros_gastos',
  transferencias: 'transferencias_y_otros',
  saldoCotizacionesPensiones: 'saldo_cotizaciones_menos_pensiones',
  saldoSinTransferencias: 'saldo_sin_transferencias',
  saldoNoFinanciero: 'saldo_no_financiero',
  dotacion: 'dotacion_fondo',
  disposicion: 'disposicion_fondo',
  fondo: 'fondo_reserva',
  financiacionAdicional: 'financiacion_adicional',
  pib: 'pib_proxy',
  gastoPctPib: 'gasto_pensiones_pct_pib',
  saldoCotizacionesPensionesPctPib: 'saldo_cot_pens_pct_pib',
  saldoNoFinancieroPctPib: 'saldo_no_financiero_pct_pib',
  fondoPctPib: 'fondo_pct_pib',
} as const;

/** Series del Ageing Report 2024 (España) que usa el bloque. */
export const AGEING = {
  gastoPensionesPib: 'ageing-report-2024-ii-1-64',
  saldoSistemaPensiones: 'ageing-report-2024-ii-1-74',
  tasaReposicionBruta: 'ageing-report-2024-ii-1-80',
  crecimientoPibPotencial: 'ageing-report-2024-ii-1-14',
} as const;

/** Series de /data de los ficheros del Fondo de Reserva y de la pensión media en vigor. */
export const SERIE = {
  fondoValor: 'valor-fin-ano',
  fondoDisposiciones: 'disposiciones-anuales',
  fondoDotacionesMei: 'dotaciones-mei-anuales',
  pensionMediaTotal: 'total-ambos',
  pensionMediaJubilacion: 'jubilacion-ambos',
} as const;

/** Ruta interna y ancla del bloque (para los enlaces cruzados desde otras páginas). */
export const RUTA_PROYECCIONES = '/proyecciones';
export const ANCLA_FINANCIERO = 'proy-financiero';
