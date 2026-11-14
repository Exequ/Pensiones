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
