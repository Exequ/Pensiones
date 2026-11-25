/**
 * Identificadores de los datos de /data que usa la página «Hucha». Algunos llevan en el nombre el
 * año o el rango de años del dato; se declaran aquí, y no en los componentes, para que los textos
 * visibles no contengan ninguna cifra escrita a mano (los rótulos de periodo se obtienen de estos
 * identificadores con `rango.ts`).
 */
export const ID = {
  tcTransferenciasTotal: 'transferencias-corrientes-2018-2022',
  tcTransferenciasEquilibrio: 'transferencias-equilibrio-2018-2021',
  tcTransferenciasImpropios: 'transferencias-costes-impropios-2021-2022',
  tcCovidPrimerAnio: 'transferencias-covid-2020',
  tcCovidSegundoAnio: 'transferencias-covid-2021',
  tcAportacionesNoContributivas: 'aportaciones-no-contributivas-2022',
  tcPrestamosConcedidos: 'prestamos-concedidos-2017-2022',
  tcPrestamosAntiguos: 'prestamos-1992-1999',
  tcSaldoDeuda: 'deuda-ss-con-estado-2022',
  tcPrestamoPrevisto: 'prestamo-previsto-lpge-2023',
  tcTransferenciasPrevistas: 'transferencias-previstas-lpge-2023',
  tcRecomendacionInsalud: 'recomendacion-amortizacion-insalud',
  tcPrestamosInsalud: 'prestamos-insalud-1991',
  tcPrestamosSinDevolver: 'prestamos-sin-devolver-y-prorrogados',
  tcOrigenPrestamos: 'origen-prestamos-gestion-ordinaria',
  tcCondicionesPrestamos: 'condiciones-prestamos-recientes',
  tcCostesImpropios: 'definicion-costes-impropios-pacto-toledo',
  tcObjetivoTransferencias: 'objetivo-transferencias-pacto-toledo',
  tcAcuerdoCortes: 'acuerdo-cortes-endeudamiento',
  gastosImpropiosPrevistos: 'gastos-impropios-previstos-2023',
  trlgssAportaciones: 'aportaciones-estado-presupuestos',
  trlgssNoContributiva: 'no-contributiva-aportaciones-estado',
  trlgssMinimos: 'naturaleza-no-contributiva-minimos',
  leyesImporte2021: '2021-importe-maximo',
  leyesImporte2022: '2022-importe-maximo',
  leyesImporte2023: '2023-importe-maximo',
  plazoApartado1: 'apartado-1-importe',
  plazoApartado2: 'apartado-2-importe',
  plazoApartado3: 'apartado-3-importe',
} as const;

/** Identificadores de la Declaración del Tribunal de Cuentas sobre la CGE de 2023 (Fase 5-A3). */
export const ID23 = {
  transferenciasTotal: 'transferencias-corrientes-2018-2023',
  equilibrio: 'transferencias-equilibrio-2018-2021',
  covid: 'transferencias-covid-2020-2021',
  baseNormativa: 'transferencias-base-normativa-2021-2023',
  transferenciasPosteriores: 'transferencias-misma-finalidad-2024',
  aportacionesNoContributivas: 'aportaciones-no-contributivas-2023',
  paraFinanciarOtrosConceptos: 'lpge-2023-para-financiar-otros-conceptos',
  saldoDeuda: 'deuda-ss-con-estado-2023',
  prestamosAntiguos: 'prestamos-1992-1999',
  prestamosRecientes: 'prestamos-concedidos-2017-2023',
  prestamoPosterior: 'prestamo-concedido-2024',
  reservaFondo: 'frss-reserva-patrimonial-2023',
  tesoreriaFondo: 'frss-tesoreria-cuenta-especifica-2023',
  meiOctubreNoviembre: 'frss-mei-octubre-noviembre-2023',
  condicionesPrestamos: 'condiciones-prestamos-tc2023',
  pibSegunTribunal: 'pib-2023-segun-tribunal',
} as const;

/** Tablas del contraste de la liquidación de 2025 con la ejecución (columna `tabla` del CSV). */
export const TABLA_CONTRASTE = {
  ingresos: 'ingresos',
  ingresosCapitulos: 'ingresos-cap1-cap4',
  gastos: 'gastos',
  gastosCapitulo: 'gastos-cap4',
} as const;

/**
 * Rótulos de la fuente que la página nombra y que, por la regla de «Fuentes», no se escriben en el
 * cuerpo: van como cita del desplegable (fase R8). Están tal como los publican las fuentes.
 */
export const ROTULO_FUENTE = {
  /** Concepto de las transferencias del Estado en la ejecución del presupuesto. */
  transferenciasEjecucion: 'DEL ESTADO Y ORG.AUTÓNOMOS',
  /** Las dos partidas que se suman en las liquidaciones del presupuesto. */
  transferenciasLiquidacion: 'Del Estado; De Organismos Autónomos administrativos',
  /** Concepto del MEI en la ejecución del presupuesto. */
  meiEjecucion: 'MECANISMO DE EQUIDAD INTERGENERACIONAL',
} as const;

/** Ficheros de /data que citan las definiciones y llevan un año en el nombre. */
export const FICHERO_PLAZO_AMPLIADO = 'parametros/prestamos-plazo-ampliado-2026.json';
