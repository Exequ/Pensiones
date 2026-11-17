/**
 * Identificadores de /data y de sus series que usa la página «Mitos y realidades». Solo
 * identificadores (algunos llevan cifras, porque así los nombra la fuente): ningún texto visible.
 */

/** Series del Ageing Report 2024 (`ageing-report-2024-espana`). */
export const AGEING = {
  dependenciaMayores: 'ageing-report-2024-ii-1-59',
  dependenciaEconomicaMayores: 'ageing-report-2024-ii-1-62',
  gastoPensiones: 'ageing-report-2024-ii-1-64',
  balance: 'ageing-report-2024-ii-1-74',
  apoyo: 'ageing-report-2024-ii-1-84',
} as const;

/** Datos sueltos de la disposición adicional segunda del RDL 2/2023 (`mei-reglas`). */
export const DA2 = {
  tope: 'da2-rdl-2023-tope-gasto-pct-pib',
  impacto: 'da2-rdl-2023-impacto-medidas-referencia',
  fraccion: 'da2-rdl-2023-aumento-mei-decimas-del-exceso',
} as const;

/** Series y datos de la OCDE (`ocde-espana`). */
export const OCDE = {
  edadSalidaHombres: 'elmea-hombres-z-z-y',
  edadSalidaMujeres: 'elmea-mujeres-z-z-y',
  edadActualHombres: 'crplf22-hombres-z-z-y-2024',
  gastoPublico: 'pep-no-aplica-z-z-pt-b1gq',
  gastoProyectado: 'ppep-no-aplica-z-z-pt-b1gq',
  riquezaPensiones: 'gpw100-hombres-z-z-fctr-wg-sal-g-i-inc-2024',
  pobrezaMayores: 'oaip-total-y-ge66-z-pt-pop-sex-age',
  pobrezaMayoresHombres: 'oaip-hombres-y-ge66-z-pt-pop-sex-age',
  pobrezaMayoresMujeres: 'oaip-mujeres-y-ge66-z-pt-pop-sex-age',
} as const;

/** Tasas de reposición teóricas de la OCDE (hombres; las de mujeres coinciden en /data). */
export const REPOSICION = {
  bruta: [
    { nivel: '50', id: 'gprr50-hombres-z-m-pt-earn-g-pre-ret-inc-2024' },
    { nivel: '100', id: 'gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024' },
    { nivel: '200', id: 'gprr200-hombres-z-m-pt-earn-g-pre-ret-inc-2024' },
  ],
  neta: [
    { nivel: '50', id: 'nprr50-hombres-z-m-pt-earn-n-pre-ret-inc-2024' },
    { nivel: '100', id: 'nprr100-hombres-z-m-pt-earn-n-pre-ret-inc-2024' },
    { nivel: '200', id: 'nprr200-hombres-z-m-pt-earn-n-pre-ret-inc-2024' },
  ],
} as const;

/** Supuestos de la OCDE (`ocde-supuestos-reposicion`) que se citan como definición. */
export const SUPUESTOS_REPOSICION = [
  'ocde-pag-2025-carrera-completa',
  'ocde-pag-2025-salario-medio-definicion',
  'ocde-pag-2025-tasa-neta-definicion',
] as const;

/** Cocientes empíricos de `contraste-espana`: mismo numerador y cuatro denominadores. */
export const COCIENTES_EN_VIGOR = [
  'pension-vigor-sobre-salario-eaes',
  'pension-vigor-sobre-salario-etcl-x12',
  'pension-vigor-sobre-salario-cn-puesto',
  'pension-vigor-sobre-salario-base-media-x12',
] as const;
export const COCIENTES_ALTAS = [
  'pension-altas-sobre-salario-eaes',
  'pension-altas-sobre-salario-etcl-x12',
  'pension-altas-sobre-salario-cn-puesto',
  'pension-altas-sobre-salario-base-media-x12',
] as const;

/** Cifras y series de `contraste-espana`. */
export const CONTRASTE_MITOS = {
  gastoContributivas: 'gasto-pensiones-contributivas-sobre-pib',
  mesesCarreraCompleta: 'meses-carrera-completa-desde-22-hasta-65',
} as const;

/** Series de Eurostat (`eurostat-espana`) y filtro de la tabla `eurostat-indicadores`. */
export const EUROSTAT = {
  pobrezaMayores: 'pobreza-o-exclusion-total-y-ge65-pc',
  gastoVejezSupervivencia: 'gasto-old-srv',
  unidadPib: 'PC_GDP',
  paisEspana: 'ESP',
  paisUnion: 'EU27',
} as const;

/** Series de las pensiones mínimas y de la PNC. */
export const PENSIONES_MINIMAS = {
  /** Sufijo del id de la mínima de jubilación a los 65 sin cónyuge a cargo (`AAAA-jub65-unipersonal`). */
  sufijoJubilacion: '-jub65-unipersonal',
} as const;

/** Series de demografía. */
export const DEMOGRAFIA = {
  icfObservado: 'icf-ambas',
  icfProyectado: 'icf-proyectado',
  dependenciaIne: 'tasa-dependencia-proyectada',
  dependenciaEuropop: 'europop2025-olddep1',
  saldoMigratorio: 'saldo-exterior-ambos-publicado-emcr',
} as const;

/** Regla vigente de revalorización (`revalorizacion-regla`). */
export const REGLA_REVALORIZACION = {
  ultimoMes: '2024-ultimo-mes-medicion',
  meses: '2024-meses-medicion',
  suelo: '2024-suelo',
} as const;

/** Datos sueltos de `gastos-impropios` y préstamos del Estado. */
export const IMPROPIOS = {
  transferenciaPrevista: 'transferencia-prevista-pge-2021',
  deficitEstimado: 'deficit-estimado-2023',
} as const;

export const PRESTAMOS = { importeMaximo2021: '2021-importe-maximo' } as const;

/** Nivel de renta de la tasa de reposición de la OCDE igual al salario medio (código de la medida). */
export const NIVEL_SALARIO_MEDIO = '100';

/** Rótulo breve de cada denominador de los cocientes de `contraste-espana` (por sufijo del id). */
export const ROTULO_SALARIO: readonly { readonly sufijo: string; readonly rotulo: string }[] = [
  { sufijo: 'eaes', rotulo: 'Salario (Encuesta de Estructura Salarial)' },
  { sufijo: 'etcl-x12', rotulo: 'Coste salarial (Encuesta de Coste Laboral)' },
  { sufijo: 'cn-puesto', rotulo: 'Remuneración (Contabilidad Nacional)' },
  { sufijo: 'base-media-x12', rotulo: 'Base media de cotización' },
];
