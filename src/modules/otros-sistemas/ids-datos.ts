/**
 * Códigos de medida y identificadores de /data que usa la página «Otros sistemas». Solo
 * identificadores (algunos llevan cifras, porque así los nombra la fuente): ningún texto visible.
 */

/** Medidas de la OCDE (`ocde-pag`). */
export const MEDIDA = {
  gasto: 'PEP',
  edadActual: 'CRPLF22',
  edadFutura: 'FRPLF22',
  edadSalida: 'ELMEA',
} as const;

/** Unidades de la OCDE y de Eurostat usadas para filtrar. */
export const UNIDAD_REPOSICION_BRUTA = 'PT_EARN_G_PRE_RET_INC';
export const UNIDAD_REPOSICION_NETA = 'PT_EARN_N_PRE_RET_INC';
export const INDICADOR_EUROSTAT_GASTO = 'gasto-old-srv';
export const UNIDAD_EUROSTAT_PIB = 'PC_GDP';

/** Niveles de renta de la tasa de reposición: múltiplo del salario medio y sufijo del código. */
export const NIVELES_REPOSICION = [
  { codigo: '50', veces: 0.5 },
  { codigo: '100', veces: 1 },
  { codigo: '200', veces: 2 },
] as const;
export type CodigoNivel = (typeof NIVELES_REPOSICION)[number]['codigo'];

export const medidaReposicion = (tipo: 'bruta' | 'neta', nivel: CodigoNivel): string =>
  `${tipo === 'bruta' ? 'GPRR' : 'NPRR'}${nivel}`;

/** Nivel de referencia de la tabla del escenario alternativo (tabla 5.4 de la OCDE: salario medio). */
export const NIVEL_ESCENARIO: CodigoNivel = '100';

/** Supuestos de la tasa de reposición (`ocde-supuestos-reposicion`), en el orden en que se muestran. */
export const SUPUESTOS_TEXTO = [
  'ocde-pag-2025-trabajador-que-entra-en-2024',
  'ocde-pag-2025-carrera-completa',
  'ocde-pag-2025-duracion-carrera',
  'ocde-pag-2025-salario-relativo-constante',
  'ocde-pag-2025-salario-medio-definicion',
  'ocde-pag-2025-mortalidad',
  'ocde-pag-2025-renta-vitalicia-indexada',
  'ocde-pag-2025-politica-fiscal-constante',
  'ocde-pag-2025-tasa-neta-definicion',
  'ocde-pag-2025-cotizaciones-pensionistas-general',
  'ocde-pag-2025-impuestos-pensionistas-en-perfiles',
] as const;

/** Supuestos numéricos del escenario base y del alternativo, por concepto. */
export const SUPUESTOS_NUMERICOS = [
  {
    concepto: 'Inflación',
    base: 'ocde-pag-2025-inflacion-base',
    alternativo: 'ocde-pag-2025-inflacion-alternativo',
  },
  {
    concepto: 'Crecimiento real de los salarios',
    base: 'ocde-pag-2025-crecimiento-real-salarios-base',
    alternativo: 'ocde-pag-2025-crecimiento-real-salarios-alternativo',
  },
  {
    concepto: 'Tipo de descuento real',
    base: 'ocde-pag-2025-tipo-descuento-real-base',
    alternativo: 'ocde-pag-2025-tipo-descuento-real-alternativo',
  },
  {
    concepto: 'Rentabilidad real de los planes de capitalización de aportación definida',
    base: 'ocde-pag-2025-rentabilidad-real-fdc-base',
    alternativo: 'ocde-pag-2025-rentabilidad-real-fdc-alternativo',
  },
] as const;

/** Tasa bruta de reposición del escenario alternativo (tabla 5.4) por país. */
export const SUPUESTO_ESCENARIO_PAIS = {
  ESP: 'ocde-pag-2025-tasa-bruta-reposicion-alternativo-esp',
  GBR: 'ocde-pag-2025-tasa-bruta-reposicion-alternativo-gbr',
  USA: 'ocde-pag-2025-tasa-bruta-reposicion-alternativo-usa',
} as const;

/** Cifras de `contraste-espana`. */
export const CONTRASTE = {
  gastoPropio: 'gasto-pensiones-contributivas-sobre-pib',
  cocientes: [
    'pension-altas-sobre-salario-eaes',
    'pension-altas-sobre-salario-etcl-x12',
    'pension-altas-sobre-salario-cn-puesto',
    'pension-altas-sobre-salario-base-media-x12',
    'pension-vigor-sobre-salario-eaes',
    'pension-vigor-sobre-salario-etcl-x12',
    'pension-vigor-sobre-salario-cn-puesto',
    'pension-vigor-sobre-salario-base-media-x12',
  ],
  edadOcde: 'edad-jubilacion-ocde-hombres-2024',
  edadPropia: 'edad-ordinaria-propia-2025',
  carrera65: 'carrera-jubilacion-65-propia-2025',
  carreraCompleta: 'meses-carrera-completa-desde-22-hasta-65',
} as const;

/** Definiciones y notas de `ocde-supuestos-reposicion` que se muestran como nota de definición. */
export const SUPUESTO_DEFINICION = {
  edadNormal: 'ocde-pag-2025-definicion-edad-normal-jubilacion',
  edadEfectiva: 'ocde-pag-2025-definicion-edad-efectiva-salida',
  sensibilidadEspana: 'ocde-pag-2025-sensibilidad-espana-valorizacion-precios',
  tasaNeta: 'ocde-pag-2025-tasa-neta-definicion',
} as const;
