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
  /** Elementos de `supervivencia-reglas` con el porcentaje de la base reguladora y su rótulo. */
  readonly porcentajes: readonly PorcentajeFicha[];
  /** La ficha enlaza a «Tu pensión» solo si el simulador admite la prestación. */
  readonly tuPension: boolean;
  /** La ficha remite a «Cómo se calcula» para las modalidades que ajustan la cuantía (Fase R5). */
  readonly remiteAModalidades: boolean;
}

/** Porcentaje de la base reguladora que fija el reglamento y la situación a la que se aplica (sin cifras). */
export interface PorcentajeFicha {
  readonly id: string;
  readonly rotulo: string;
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
    remiteAModalidades: true,
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
    remiteAModalidades: false,
  },
  {
    id: 'viudedad',
    ancla: 'viudedad',
    titulo: 'Viudedad',
    modalidad: 'contributiva',
    clase: 'viudedad',
    clasePnc: null,
    minimas: { fichero: 'viudedad', patron: /^\d{4}-viud-/ },
    porcentajes: [
      { id: 'viudedad-pct', rotulo: 'Regla general' },
      {
        id: 'viudedad-65-pct',
        rotulo:
          'Mejora para determinadas personas viudas de edad avanzada que cumplen los requisitos del reglamento que la regula',
      },
      {
        id: 'viudedad-cargas-pct',
        rotulo:
          'Con cargas familiares, cuando la pensión es la principal o única fuente de ingresos',
      },
    ],
    tuPension: false,
    remiteAModalidades: false,
  },
  {
    id: 'orfandad',
    ancla: 'orfandad',
    titulo: 'Orfandad',
    modalidad: 'contributiva',
    clase: 'orfandad',
    clasePnc: null,
    minimas: { fichero: 'orfandad-familiares', patron: /^\d{4}-(orf|prest-orf)-/ },
    porcentajes: [
      { id: 'orfandad-pct', rotulo: 'Pensión de orfandad' },
      {
        id: 'orfandad-absoluta-incremento-pct',
        rotulo: 'Incremento cuando no hay beneficiario de pensión de viudedad',
      },
    ],
    tuPension: false,
    remiteAModalidades: false,
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
    remiteAModalidades: false,
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
    remiteAModalidades: false,
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
    remiteAModalidades: false,
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

/** Columnas de tramos de hijos del CSV de complementos (Fase 5-A4), de menos a más hijos. */
export const COLUMNAS_TRAMOS_HIJOS = {
  brecha: ['hijos_1', 'hijos_2', 'hijos_3', 'hijos_4_o_mas'],
  maternidad: ['hijos_2', 'hijos_3', 'hijos_4_o_mas'],
} as const;
