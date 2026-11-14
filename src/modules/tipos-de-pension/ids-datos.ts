/**
 * Configuración de las fichas de «Tipos de pensión» e identificadores de /data. Solo
 * identificadores y rótulos sin cifras: ningún dato visible se escribe aquí (algunos
 * identificadores llevan cifras porque así los nombra la fuente).
 */
import type { ClasePension } from '../../engine/sistema-historico';

/** Fichero de cuantías mínimas que corresponde a cada familia de prestación. */
export type FicheroMinimas = 'jubilacion' | 'incapacidad' | 'viudedad' | 'orfandad-familiares';

export interface ConfigFicha {
  /** Identificador de la prestación en `normativa/prestaciones`. */
  readonly id: string;
  /** Ancla de la ficha y base de los identificadores de sus elementos. */
  readonly ancla: string;
  readonly titulo: string;
  readonly modalidad: 'contributiva' | 'no-contributiva';
  /** Clase en las series de pensiones contributivas en vigor; `null` si no es contributiva. */
  readonly clase: ClasePension | null;
  /** Clase en las estadísticas de pensiones no contributivas del IMSERSO. */
  readonly clasePnc: 'jubilacion' | 'invalidez' | null;
  /** Cuantías mínimas del Anexo I: fichero y patrón del identificador (año-clase-situación). */
  readonly minimas: { readonly fichero: FicheroMinimas; readonly patron: RegExp } | null;
  /** Elementos de `supervivencia-reglas` con el porcentaje de la base reguladora. */
  readonly porcentajes: readonly string[];
  /** La ficha enlaza a «Tu pensión» solo si el simulador admite la prestación. */
  readonly tuPension: boolean;
  /** Otras modalidades (identificadores de prestaciones) que se listan dentro de la ficha. */
  readonly modalidades: readonly string[];
}

export const FICHAS: readonly ConfigFicha[] = [
  {
    id: 'jubilacion-ordinaria',
    ancla: 'jubilacion',
    titulo: 'Jubilación',
    modalidad: 'contributiva',
    clase: 'jubilacion',
    clasePnc: null,
    minimas: { fichero: 'jubilacion', patron: /^\d{4}-jub/ },
    porcentajes: [],
    tuPension: true,
    modalidades: [
      'jubilacion-anticipada-involuntaria',
      'jubilacion-anticipada-voluntaria',
      'jubilacion-demorada',
      'jubilacion-activa',
      'jubilacion-flexible',
      'jubilacion-parcial',
    ],
  },
  {
    id: 'incapacidad-permanente',
    ancla: 'incapacidad',
    titulo: 'Incapacidad permanente',
    modalidad: 'contributiva',
    clase: 'incapacidad',
    clasePnc: null,
    minimas: { fichero: 'incapacidad', patron: /^\d{4}-ip-/ },
    porcentajes: [],
    tuPension: true,
    modalidades: [],
  },
  {
    id: 'viudedad',
    ancla: 'viudedad',
    titulo: 'Viudedad',
    modalidad: 'contributiva',
    clase: 'viudedad',
    clasePnc: null,
    minimas: { fichero: 'viudedad', patron: /^\d{4}-viud-/ },
    porcentajes: ['viudedad-pct', 'viudedad-65-pct', 'viudedad-cargas-pct'],
    tuPension: false,
    modalidades: [],
  },
  {
    id: 'orfandad',
    ancla: 'orfandad',
    titulo: 'Orfandad',
    modalidad: 'contributiva',
    clase: 'orfandad',
    clasePnc: null,
    minimas: { fichero: 'orfandad-familiares', patron: /^\d{4}-(orf|prest-orf)-/ },
    porcentajes: ['orfandad-pct', 'orfandad-absoluta-incremento-pct'],
    tuPension: false,
    modalidades: [],
  },
  {
    id: 'favor-de-familiares',
    ancla: 'familiares',
    titulo: 'En favor de familiares',
    modalidad: 'contributiva',
    clase: 'favor-familiares',
    clasePnc: null,
    minimas: { fichero: 'orfandad-familiares', patron: /^\d{4}-fam/ },
    porcentajes: [],
    tuPension: false,
    modalidades: [],
  },
  {
    id: 'pnc-jubilacion',
    ancla: 'pnc-jubilacion',
    titulo: 'Pensión no contributiva de jubilación',
    modalidad: 'no-contributiva',
    clase: null,
    clasePnc: 'jubilacion',
    minimas: null,
    porcentajes: [],
    tuPension: false,
    modalidades: [],
  },
  {
    id: 'pnc-incapacidad',
    ancla: 'pnc-invalidez',
    titulo: 'Pensión no contributiva de invalidez',
    modalidad: 'no-contributiva',
    clase: null,
    clasePnc: 'invalidez',
    minimas: null,
    porcentajes: [],
    tuPension: false,
    modalidades: [],
  },
];

/** Reglas de las pensiones no contributivas (`pnc-reglas`): cuantía mínima y paga. */
export const PNC_REGLA_MINIMA = 'cuantia-minima-pct';
export const PNC_REGLA_PAGAS = 'pagas-anuales';

/** Clases de las pensiones en vigor en el orden de las fichas. */
export const SERIE_AMBOS = (clase: ClasePension): string => `${clase}-ambos`;
export const SERIE_HOMBRES = (clase: ClasePension): string => `${clase}-hombres`;
export const SERIE_MUJERES = (clase: ClasePension): string => `${clase}-mujeres`;

/** Identificadores del perfil del IMSERSO por clase (`imserso-pnc-perfil-2025`). */
export const PERFIL_PNC = {
  jubilacion: 'jubilacion-total-2025',
  invalidez: 'invalidez-total-2025',
} as const;

/** Rótulo de cada tipo de requisito de `prestaciones`. */
export const ETIQUETA_REQUISITO = {
  alta: 'Alta o situación asimilada',
  edad: 'Edad',
  carencia: 'Cotización mínima',
  'cotizacion-previa': 'Cotización previa',
  rentas: 'Rentas',
  residencia: 'Residencia',
  otros: 'Otro requisito',
} as const;
