/**
 * Qué datos de /data se muestran en cada ficha: calendarios de transición y valores puntuales, con
 * los identificadores de /data (años y claves) y los rótulos. Módulo de identificadores: el test de
 * cifras escritas a mano lo exime, igual que el de «Cómo se calcula»; `datos-reformas.test.ts` y
 * `scripts/reformas-fase.test.ts` comprueban que cada identificador existe y que cada norma y cada
 * parámetro están en la cronología.
 *
 * Criterio (decisión documentada en docs/DECISIONES.md): solo se enlaza una serie de /data a una norma
 * cuando el artículo o la disposición transitoria que fija esos años consta en la ubicación del propio
 * dato; el «antes» es el valor del año anterior al primero del calendario si /data lo tiene.
 */
import type { ParametroNormativo } from './tipos.ts';
import type { NombreParametro } from './ficheros.ts';

export type FormatoValor = 'meses' | 'duracion' | 'porcentaje' | 'numero';

export interface ColumnaCalendario {
  readonly rotulo: string;
  readonly fichero: NombreParametro;
  /** Identificador del dato en el fichero; `{anio}` se sustituye por cada año del calendario. */
  readonly id: string;
  readonly formato: FormatoValor;
}

export interface CalendarioConfig {
  /** Identificador de la norma en la cronología. */
  readonly norma: string;
  readonly parametro: ParametroNormativo;
  readonly titulo: string;
  /** Primer y último año del calendario que fija la norma, como identificadores de /data. */
  readonly desde: string;
  readonly hasta: string;
  readonly columnas: readonly ColumnaCalendario[];
}

export interface FilaValor {
  readonly rotulo: string;
  readonly fichero: NombreParametro;
  readonly id: string;
  readonly formato: FormatoValor;
}

export interface ValorConfig {
  readonly norma: string;
  readonly parametro: ParametroNormativo;
  readonly titulo: string;
  readonly filas: readonly FilaValor[];
}

const MESES_Y_DURACION = (fichero: NombreParametro, rotulo: string): ColumnaCalendario[] => [
  { rotulo, fichero, id: '{anio}', formato: 'meses' },
  { rotulo: 'Equivale a', fichero, id: '{anio}', formato: 'duracion' },
];

export const CALENDARIOS: readonly CalendarioConfig[] = [
  {
    norma: 'ley-24-1997',
    parametro: 'periodo-calculo',
    titulo: 'Periodo de cálculo de la base reguladora, años con dato',
    desde: '2000',
    hasta: '2002',
    columnas: MESES_Y_DURACION('periodo-calculo-base-reguladora', 'Periodo de cálculo'),
  },
  {
    norma: 'ley-27-2011',
    parametro: 'edad-ordinaria',
    titulo: 'Edad ordinaria de jubilación por año de jubilación',
    desde: '2013',
    hasta: '2027',
    columnas: MESES_Y_DURACION('edad-ordinaria-jubilacion', 'Edad ordinaria'),
  },
  {
    norma: 'ley-27-2011',
    parametro: 'periodo-calculo',
    titulo: 'Periodo de cálculo de la base reguladora por año del hecho causante',
    desde: '2013',
    hasta: '2022',
    columnas: MESES_Y_DURACION('periodo-calculo-base-reguladora', 'Periodo de cálculo'),
  },
  {
    norma: 'ley-27-2011',
    parametro: 'escala-porcentajes',
    titulo:
      'Cotización con la que se alcanza el porcentaje máximo de la escala por año del hecho causante',
    desde: '2013',
    hasta: '2027',
    columnas: MESES_Y_DURACION('cotizacion-para-100', 'Cotización para el máximo de la escala'),
  },
  {
    norma: 'rdl-2-2023',
    parametro: 'periodo-calculo',
    titulo: 'Periodo de cálculo de la base reguladora por año del hecho causante',
    desde: '2026',
    hasta: '2037',
    columnas: MESES_Y_DURACION('periodo-calculo-base-reguladora', 'Periodo de cálculo'),
  },
  {
    norma: 'rdl-2-2023',
    parametro: 'mei',
    titulo: 'Tipo de cotización del Mecanismo de Equidad Intergeneracional por año',
    desde: '2023',
    hasta: '2029',
    columnas: [
      { rotulo: 'Tipo total', fichero: 'mei-tipo-total', id: '{anio}', formato: 'porcentaje' },
    ],
  },
  {
    norma: 'rdl-2-2023',
    parametro: 'cuota-solidaridad',
    titulo: 'Tipos de la cotización adicional de solidaridad por año y tramo',
    desde: '2025',
    hasta: '2045',
    columnas: [
      {
        rotulo: 'Tramo a',
        fichero: 'cuota-solidaridad-calendario',
        id: '{anio}-tramo-a',
        formato: 'porcentaje',
      },
      {
        rotulo: 'Tramo b',
        fichero: 'cuota-solidaridad-calendario',
        id: '{anio}-tramo-b',
        formato: 'porcentaje',
      },
      {
        rotulo: 'Tramo c',
        fichero: 'cuota-solidaridad-calendario',
        id: '{anio}-tramo-c',
        formato: 'porcentaje',
      },
    ],
  },
];

export const VALORES: readonly ValorConfig[] = [
  {
    norma: 'rdleg-1-1994',
    parametro: 'edad-ordinaria',
    titulo: 'Edad ordinaria de jubilación en el primer año con dato',
    filas: [
      {
        rotulo: 'Edad ordinaria',
        fichero: 'edad-ordinaria-jubilacion',
        id: '2000',
        formato: 'duracion',
      },
    ],
  },
  {
    norma: 'rdleg-1-1994',
    parametro: 'carencia',
    titulo: 'Periodo mínimo de cotización en el primer año con dato',
    filas: [
      { rotulo: 'Carencia', fichero: 'carencia-jubilacion', id: '2000', formato: 'duracion' },
    ],
  },
  {
    norma: 'ley-24-1997',
    parametro: 'escala-porcentajes',
    titulo: 'Cotización con la que se alcanza el porcentaje máximo en el primer año con dato',
    filas: [
      {
        rotulo: 'Cotización para el máximo de la escala',
        fichero: 'cotizacion-para-100',
        id: '2000',
        formato: 'duracion',
      },
    ],
  },
  {
    norma: 'ley-21-2021',
    parametro: 'incentivos-demora',
    titulo: 'Complemento por jubilación demorada: porcentaje adicional',
    filas: [
      {
        rotulo: 'Por cada año completo de demora',
        fichero: 'jubilacion-demora-reglas',
        id: 'porcentaje-adicional-anual',
        formato: 'porcentaje',
      },
      {
        rotulo: 'Por un periodo de más de seis meses y menos de un año',
        fichero: 'jubilacion-demora-reglas',
        id: 'porcentaje-adicional-semestre',
        formato: 'porcentaje',
      },
    ],
  },
  {
    norma: 'rdl-28-2012',
    parametro: 'revalorizacion',
    titulo: 'Incremento de las pensiones en el año que fija la norma',
    filas: [
      {
        rotulo: 'Incremento general',
        fichero: 'revalorizacion-general',
        id: '2013',
        formato: 'porcentaje',
      },
    ],
  },
  {
    norma: 'rdl-28-2018',
    parametro: 'revalorizacion',
    titulo: 'Incremento de las pensiones en el año que fija la norma',
    filas: [
      {
        rotulo: 'Incremento general',
        fichero: 'revalorizacion-general',
        id: '2019',
        formato: 'porcentaje',
      },
    ],
  },
  {
    norma: 'rd-316-2025',
    parametro: 'revalorizacion',
    titulo: 'Incremento de las pensiones en el año que fija la norma',
    filas: [
      {
        rotulo: 'Incremento general',
        fichero: 'revalorizacion-general',
        id: '2025',
        formato: 'porcentaje',
      },
    ],
  },
  {
    norma: 'rd-241-2026',
    parametro: 'revalorizacion',
    titulo: 'Incremento de las pensiones en el año que fija la norma',
    filas: [
      {
        rotulo: 'Incremento general',
        fichero: 'revalorizacion-general',
        id: '2026',
        formato: 'porcentaje',
      },
    ],
  },
];

/** Nota con la que se muestra un dato cuyo documento de origen no es la norma de la ficha. */
export const NOTAS_DE_ORIGEN: Readonly<Record<string, string>> = {
  'rdl-28-2012:revalorizacion':
    'El dato cita el Real Decreto-ley 29/2012 (artículo 5.1), cuyo texto remite al Real Decreto-ley 28/2012 y recoge el mismo incremento.',
};

/** Rótulo de cada parámetro normativo de la cronología. */
export const ROTULOS_PARAMETRO: Readonly<Record<ParametroNormativo, string>> = {
  'periodo-calculo': 'Periodo de cálculo de la base reguladora',
  carencia: 'Periodo mínimo de cotización (carencia)',
  'edad-ordinaria': 'Edad ordinaria de jubilación',
  'escala-porcentajes': 'Escala de porcentajes de la base reguladora',
  'coeficientes-reductores': 'Coeficientes reductores de la jubilación anticipada',
  'incentivos-demora': 'Complemento por jubilación demorada',
  'pension-maxima': 'Pensión máxima',
  'pension-minima': 'Pensiones mínimas',
  revalorizacion: 'Revalorización de las pensiones',
  'tipos-cotizacion': 'Tipos de cotización',
  'bases-cotizacion': 'Bases de cotización',
  mei: 'Mecanismo de Equidad Intergeneracional',
  'complemento-brecha-genero': 'Complemento para la reducción de la brecha de género',
  'cuota-solidaridad': 'Cotización adicional de solidaridad',
  'fondo-reserva': 'Fondo de Reserva de la Seguridad Social',
  'factor-sostenibilidad': 'Factor de sostenibilidad',
  'jubilacion-anticipada': 'Jubilación anticipada',
  'jubilacion-parcial': 'Jubilación parcial',
  'jubilacion-activa': 'Compatibilidad de la pensión de jubilación con el trabajo',
  viudedad: 'Pensión de viudedad',
  orfandad: 'Pensión de orfandad',
  incapacidad: 'Incapacidad permanente',
  'no-contributivas': 'Pensiones no contributivas',
  'integracion-lagunas': 'Integración de lagunas de cotización',
  gobernanza: 'Gobernanza del sistema',
  otros: 'Otras reglas',
};

export type Destino = 'como-se-calcula' | 'tipos-de-pension' | 'hucha';

/** Dónde se explica cada parámetro en la web (solo donde la página de destino lo trata). */
export const DESTINOS: Readonly<Record<ParametroNormativo, readonly Destino[]>> = {
  'periodo-calculo': ['como-se-calcula'],
  carencia: ['como-se-calcula', 'tipos-de-pension'],
  'edad-ordinaria': ['como-se-calcula', 'tipos-de-pension'],
  'escala-porcentajes': ['como-se-calcula'],
  'coeficientes-reductores': ['como-se-calcula'],
  'incentivos-demora': ['como-se-calcula'],
  'pension-maxima': ['como-se-calcula', 'tipos-de-pension'],
  'pension-minima': ['como-se-calcula', 'tipos-de-pension'],
  revalorizacion: [],
  'tipos-cotizacion': [],
  'bases-cotizacion': ['como-se-calcula'],
  mei: ['hucha'],
  'complemento-brecha-genero': ['como-se-calcula', 'tipos-de-pension'],
  'cuota-solidaridad': [],
  'fondo-reserva': ['hucha'],
  'factor-sostenibilidad': [],
  'jubilacion-anticipada': ['como-se-calcula', 'tipos-de-pension'],
  'jubilacion-parcial': ['tipos-de-pension'],
  'jubilacion-activa': ['tipos-de-pension'],
  viudedad: ['como-se-calcula', 'tipos-de-pension'],
  orfandad: ['como-se-calcula', 'tipos-de-pension'],
  incapacidad: ['como-se-calcula', 'tipos-de-pension'],
  'no-contributivas': ['tipos-de-pension'],
  'integracion-lagunas': ['como-se-calcula'],
  gobernanza: [],
  otros: [],
};

export const ETIQUETA_DESTINO: Readonly<Record<Destino, string>> = {
  'como-se-calcula': 'Cómo se calcula',
  'tipos-de-pension': 'Tipos de pensión',
  hucha: 'La «hucha»',
};

export const RUTA_DESTINO: Readonly<Record<Destino, string>> = {
  'como-se-calcula': '/como-se-calcula',
  'tipos-de-pension': '/tipos-de-pension',
  hucha: '/hucha',
};
