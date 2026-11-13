import type { MesVentana } from '../comun/base-reguladora.ts';
import { porDefectoDelMotor } from '../config/lecturas-por-defecto.ts';
/**
 * Tipos públicos del motor de la pensión de jubilación contributiva.
 * Todas las cantidades son euros nominales del año de la jubilación, salvo que se indique otra cosa.
 */

export type Modalidad =
  'ordinaria' | 'anticipada-voluntaria' | 'anticipada-involuntaria' | 'demorada' | 'parcial';

export type Sexo = 'mujer' | 'hombre';

/**
 * Periodo de cotización. Los meses (`AAAA-MM`) son inclusivos. Se da una sola forma de base:
 * una base mensual constante, una base mensual por año o una base por mes. Los meses sin
 * periodo que los cubra son meses sin obligación de cotizar (lagunas). Si dos periodos se
 * solapan (pluriempleo) las bases se suman, con el tope de la base máxima.
 */
export type PeriodoCarrera =
  | { readonly desde: string; readonly hasta: string; readonly baseMensual: number }
  | {
      readonly desde: string;
      readonly hasta: string;
      /** Base mensual de cotización de cada año (clave: año). */
      readonly basesPorAnio: Readonly<Record<string, number>>;
    }
  | {
      readonly desde: string;
      readonly hasta: string;
      /** Base mensual de cada mes (clave: `AAAA-MM`). */
      readonly basesPorMes: Readonly<Record<string, number>>;
    };

export type Carrera = readonly PeriodoCarrera[];

/** Paso del desglose: lo que se calcula, con el parámetro de /data y el artículo que lo sostienen. */
export interface Paso {
  readonly id: string;
  readonly titulo: string;
  readonly valor: number | string | boolean;
  readonly unidad: string;
  /** Referencias «parametros/fichero.json#id» de /data que sostienen el paso. */
  readonly parametros: readonly string[];
  readonly articulo: string;
  readonly detalle?: string;
}

export interface Requisito {
  readonly id: string;
  readonly descripcion: string;
  readonly cumple: boolean;
  /** Valor acreditado y valor exigido, en `unidad`. */
  readonly valor: number;
  readonly exigido: number;
  readonly unidad: string;
  readonly parametros: readonly string[];
  readonly articulo: string;
}

/**
 * Lecturas abiertas de la revisión actuarial (docs/REVISION_ACTUARIAL.md). El valor por defecto de
 * cada una es la lectura que ya reflejan los ficheros de /data.
 */
export interface LecturasAbiertas {
  /** DT 38.ª (base máxima): incrementos compuestos año a año, o sumados sobre la cifra inicial. */
  readonly baseMaxima: 'compuesto' | 'sobre-cifra-inicial';
  /** DT 39.ª (pensión máxima): 0,115 puntos cada año, o un incremento que crece 0,115 cada año. */
  readonly pensionMaxima: 'compuesto' | 'incremento-creciente';
  /** Integración de lagunas (art. 209.1.b): base mínima del mes de la laguna o la del hecho causante. */
  readonly referenciaBaseMinimaLagunas: 'mes-de-la-laguna' | 'hecho-causante';
  /** DT 4.ª.7: el propio 31/12/2040, ¿está cubierto por la opción de 25 años? */
  readonly opcion25EnUltimoDia2040: 'incluida' | 'excluida';
  /** Lagunas en meses anteriores a la primera alta (dentro de la ventana de cálculo). */
  readonly lagunasAnterioresAlPrimerAlta: 'integrar' | 'ignorar';
  /**
   * Índice mensual del IPC: el índice mensual real del INE (`mensual-ine`, mejora de datos y no una
   * lectura legal) o, a partir de las medias anuales, interpolado o en escalón anual.
   */
  readonly interpolacionIPC: 'mensual-ine' | 'interpolada' | 'escalon-anual';
  /**
   * Factor de actualización de una base (cociente de índices): sin suelo, o con suelo de uno (cuando
   * el índice del mes de referencia es menor que el del mes de la base, el factor es uno, como en los
   * informes del autocálculo de la Seguridad Social). Rige también en incapacidad y supervivencia.
   */
  readonly actualizacionFactorMinimo: 'sin-suelo' | 'suelo-1';
  /** Demora (art. 210.2.a): las fracciones de más de 6 meses cuentan desde el primer o el segundo año. */
  readonly fraccionDemora: 'desde-segundo-anio' | 'desde-primer-anio';
  /** DT 39.ª.4 (pensión máxima desde 2051): tabla como incremento acumulado total o anual literal. */
  readonly maximaDesde2051: 'incremento-acumulado' | 'incremento-anual-literal';
}

export const LECTURAS_POR_DEFECTO: LecturasAbiertas =
  porDefectoDelMotor<LecturasAbiertas>('jubilacion');

/**
 * Escenario económico para los años en que /data no tiene dato (a partir de 2026 y, para el IPC,
 * antes de 2002 si falta la variación de diciembre). Nada de esto está fijo en el motor.
 */
export interface Escenario {
  /** IPC anual (fracción: 0,02 = 2 %) o función del año. */
  readonly ipc: number | ((anio: number) => number);
  /** Si es `true`, el escenario sustituye también a la serie histórica del IPC (modelos teóricos). */
  readonly sustituirHistoricoIPC?: boolean;
}

export type OpcionDemora = 'porcentaje' | 'tanto-alzado' | 'mixta';

export interface OpcionesJubilacion {
  readonly sexo?: Sexo;
  readonly escenario?: Escenario;
  readonly lecturas?: Partial<LecturasAbiertas>;
  /** Usa la opción de 25 años (DT 4.ª.7) si es más favorable. Por defecto, sí. */
  readonly usarOpcion25Anos?: boolean;
  /** Reduce cada base mensual a la base máxima de su mes. Por defecto, sí. */
  readonly topeBases?: boolean;
  /** Actualiza las bases con el IPC (art. 209.1.c-d). Por defecto, sí. */
  readonly actualizarBases?: boolean;
  /** Aplica el límite de pensión máxima (art. 57). Por defecto, sí. */
  readonly aplicarPensionMaxima?: boolean;
  /** Aplica el complemento a mínimos (art. 59). Por defecto, sí. */
  readonly aplicarMinimos?: boolean;
  readonly situacionFamiliar?: 'unipersonal' | 'conyuge-a-cargo' | 'conyuge-no-a-cargo';
  /** Rendimientos anuales que cuentan para el límite de ingresos de los mínimos (sin la pensión). */
  readonly rentasAnuales?: number;
  /** Hijos o hijas (complemento de brecha de género). */
  readonly hijos?: number;
  /** Un hombre que acredita las condiciones del art. 60.1.b). */
  readonly hombreCumpleArt60?: boolean;
  /** Fuerza o impide la integración reforzada de la DT 41.ª; por defecto según sexo. */
  readonly integracionReforzadaLagunas?: boolean;
  /**
   * Qué hacer si una laguna cae en un año intermedio sin base mínima en /data. Con los datos
   * actuales no hay huecos (2020 y 2021 ya constan); la opción se mantiene para series de
   * parámetros con huecos.
   */
  readonly huecoBaseMinima?: 'error' | 'anterior';
  readonly demora?: { readonly opcion: OpcionDemora };
  readonly parcial?: {
    /** Reducción de jornada (25-75). */
    readonly reduccionJornadaPct: number;
    readonly conRelevo: boolean;
    readonly antiguedadEmpresaMeses?: number;
    readonly discapacidad33?: boolean;
  };
  /** Meses de demanda de empleo inmediatamente anteriores a la solicitud (involuntaria). */
  readonly mesesDemandanteEmpleo?: number;
  /** Cese por una de las causas tasadas del art. 207.1.d) (involuntaria). */
  readonly ceseCausaTasada?: boolean;
  /**
   * Calcula los importes aunque no se cumplan los requisitos (para simular «¿qué pasaría si…?»):
   * el resultado conserva `cumpleRequisitos: false` y `estado: 'no-causa-derecho'` es sustituido
   * por el estado calculado. Por defecto, no.
   */
  readonly calcularAunqueNoCumpla?: boolean;
  /** Meses con subsidio por desempleo del art. 274 al acogerse a la voluntaria (art. 208.3). */
  readonly mesesSubsidioDesempleo?: number;
}

export type EstadoPension = 'contributiva' | 'minima' | 'maxima' | 'no-causa-derecho';

/**
 * Bases de la ventana de cálculo de la regla que da la base reguladora aplicada (solo lectura): mes a
 * mes, base nominal, factor de actualización, base actualizada y si cuenta entre las usadas. La suma
 * de las usadas es `sumaBases` y `sumaBases / divisor` es `baseReguladora` (docs/MOTOR_JUBILACION.md).
 */
export interface BasesPeriodoCalculo {
  /** Regla que resulta más favorable y se aplica. */
  readonly regla: 'general' | 'opcion-25-anos';
  readonly ventana: number;
  readonly nBases: number;
  readonly divisor: number;
  /** Meses más recientes que entran por su valor nominal. */
  readonly mesesNominales: number;
  readonly sumaBases: number;
  readonly baseReguladora: number;
  /** Del mes más antiguo al más reciente. */
  readonly meses: readonly MesVentana[];
}

export interface ResultadoJubilacion {
  readonly modalidad: Modalidad;
  readonly fechaJubilacion: string;
  /** Año cuya normativa se aplica (el del hecho causante). */
  readonly anioNormativa: number;
  readonly cumpleRequisitos: boolean;
  readonly requisitos: readonly Requisito[];
  readonly estado: EstadoPension;
  /** Importe de cada una de las 14 pagas (pensión + complementos mensuales), euros nominales. */
  readonly pensionMensual: number;
  readonly pensionAnual: number;
  readonly pagas: number;
  /** Edad al hecho causante, en meses cumplidos. */
  readonly edadMeses: number;
  readonly mesesCotizados: number;
  readonly baseReguladora: number;
  /** Bases mes a mes de la ventana de la regla aplicada (para explicar y representar el cálculo). */
  readonly basesPeriodo: BasesPeriodoCalculo;
  /** Porcentaje total aplicado a la base reguladora (sin coeficientes reductores). */
  readonly porcentaje: number;
  /** Complemento de demora a tanto alzado (pago único), si se elige. */
  readonly pagoUnicoDemora: number;
  /** Cantidad anual de demora por el porcentaje que excede el límite (art. 210.2.a, párr. 4.º). */
  readonly cantidadAnualDemora: number;
  readonly pasos: readonly Paso[];
  readonly avisos: readonly string[];
}
