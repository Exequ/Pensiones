/**
 * Identificadores de las columnas de `data/proyecciones/m4-escenarios.json` y de las series de /data
 * que usa el bloque financiero. Son nombres de /data, no cifras de datos (algunos llevan dígitos, como
 * las tablas del Ageing Report): por eso viven aparte y el test de «sin cifras escritas a mano» los
 * excluye, igual que `ids-datos.ts`.
 */
export const COL4 = {
  escenario: 'escenario',
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

/** Escenario que se muestra por defecto: el base del LEEME de los escenarios. */
export const ESCENARIO_BASE = 'base';

/** Clases de pensión de la ejecución del presupuesto (tabla de pensiones contributivas) y su identificador en /data. */
export const CLASES_CALIBRACION = [
  { clave: 'jubilacion', clase: 'Jubilación', concepto: 'JUBILACIÓN' },
  { clave: 'viudedad', clase: 'Viudedad', concepto: 'VIUDEDAD' },
  { clave: 'incapacidad', clase: 'Incapacidad permanente', concepto: 'INCAPACIDAD PERMANENTE' },
  { clave: 'orfandad', clase: 'Orfandad', concepto: 'ORFANDAD' },
  { clave: 'favor-familiares', clase: 'A favor de familiares', concepto: 'A FAVOR DE FAMILIARES' },
] as const;

/** Conceptos de la ejecución del presupuesto con los que se calibra el gasto y partida de los complementos a mínimos. */
export const COMPLEMENTOS_MINIMOS = {
  tablaPensiones: 'gastos-cap4',
  conceptoSumaPensiones: 'SUMA DE PENSIONES',
  tabla: 'gastos-cap4-no-contributivas',
  concepto: 'COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS',
} as const;

/** Magnitudes de la fila observada que se muestran en la tabla del punto de partida (columna, rótulo, unidad y decimales). */
export const MAGNITUDES_OBSERVADAS = [
  {
    columna: 'pensiones_oct',
    rotulo: 'Pensiones contributivas en vigor (a primero de diciembre)',
    unidad: 'pensiones',
    decimales: 0,
  },
  {
    columna: 'pension_media_total',
    rotulo: 'Pensión media de todas las clases',
    unidad: 'euros al mes',
    decimales: 1,
  },
  {
    columna: 'gasto_pensiones',
    rotulo: 'Gasto en pensiones contributivas',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'cotizaciones',
    rotulo: 'Cotizaciones sociales, incluido el MEI',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'mei',
    rotulo: 'MEI (parte de las cotizaciones)',
    unidad: 'millones de euros',
    decimales: 0,
  },
  { columna: 'otros_gastos', rotulo: 'Resto de gastos', unidad: 'millones de euros', decimales: 0 },
  {
    columna: 'transferencias_y_otros',
    rotulo: 'Transferencias del Estado y otros ingresos',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'saldo_cotizaciones_menos_pensiones',
    rotulo: 'Saldo de cotizaciones menos pensiones',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'saldo_sin_transferencias',
    rotulo: 'Saldo sin transferencias',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'saldo_no_financiero',
    rotulo: 'Saldo no financiero',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'dotacion_fondo',
    rotulo: 'Dotación al Fondo de Reserva',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'disposicion_fondo',
    rotulo: 'Disposición del Fondo de Reserva',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'fondo_reserva',
    rotulo: 'Fondo de Reserva a fin de año, a precio de adquisición',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'pib_proxy',
    rotulo: 'PIB (en este año, el PIB corriente del INE)',
    unidad: 'millones de euros',
    decimales: 0,
  },
  {
    columna: 'gasto_pensiones_pct_pib',
    rotulo: 'Gasto en pensiones contributivas',
    unidad: '% del PIB',
    decimales: 2,
  },
  {
    columna: 'saldo_cot_pens_pct_pib',
    rotulo: 'Saldo de cotizaciones menos pensiones',
    unidad: '% del PIB',
    decimales: 2,
  },
  {
    columna: 'saldo_no_financiero_pct_pib',
    rotulo: 'Saldo no financiero',
    unidad: '% del PIB',
    decimales: 2,
  },
  {
    columna: 'fondo_pct_pib',
    rotulo: 'Fondo de Reserva a fin de año',
    unidad: '% del PIB',
    decimales: 2,
  },
  {
    columna: 'afiliados_por_pension',
    rotulo: 'Afiliados por pensión',
    unidad: 'afiliados por pensión',
    decimales: 2,
  },
] as const;
