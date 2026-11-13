/**
 * Tipos públicos del motor de la pensión de incapacidad permanente contributiva (Régimen General).
 * Importes en euros nominales del año del hecho causante, salvo que se indique otra cosa.
 */
import type {
  Carrera,
  EstadoPension,
  OpcionesJubilacion,
  Paso,
  Requisito,
} from '../jubilacion/tipos.ts';
import { porDefectoDelMotor } from '../config/lecturas-por-defecto.ts';

export type { Carrera, Paso, Requisito };

/** Grados de la DT 26.ª TRLGSS (redacción aplicable del art. 194). */
export type GradoIncapacidad = 'parcial' | 'total' | 'absoluta' | 'gran-incapacidad';

/** Contingencia de la que deriva la incapacidad. */
export type OrigenIncapacidad =
  'enfermedad-comun' | 'accidente-no-laboral' | 'accidente-trabajo' | 'enfermedad-profesional';

/**
 * Lecturas de la norma que el motor no decide (docs/REVISION_ACTUARIAL.md): cada una es una opción
 * con su valor por defecto, que es la lectura más sencilla, documentada en docs/DECISIONES.md.
 */
export interface LecturasIncapacidad {
  /**
   * Art. 197.1.b): «edad ordinaria de jubilación vigente en cada momento». `carrera-proyectada`:
   * la del art. 205.1.a) con la cotización acreditada más los meses que faltan hasta los 65 años
   * (como las anticipadas de la Fase 2-A); `edad-general`: la edad ordinaria sin la carrera larga.
   */
  readonly edadFiccion: 'carrera-proyectada' | 'edad-general';
  /** Art. 197.1.b): los «años que le resten» se cuentan por meses completos o por años completos. */
  readonly computoFiccion: 'meses' | 'anios-completos';
  /** Art. 195.3: edad en meses cumplidos o con el redondeo a medios años del art. 4.1 del RD 1799/1985. */
  readonly redondeoEdadCarencia: 'sin-redondeo' | 'medio-anio';
  /** Art. 197.2: divisor del periodo corto, meses × 1,1666 (RD 1799/1985) o meses × 14/12. */
  readonly divisorPeriodoCorto: 'coeficiente-rd-1799-1985' | 'catorce-doceavos';
  /** Accidente no laboral en alta (art. 7.1 Decreto 1646/1972): meses sin cotizar a cero o integrados. */
  readonly lagunasAccidenteNoLaboral: 'sin-integrar' | 'integrar';
  /** Parcial (art. 195.2): días cotizados de cada mes, naturales o treinta. */
  readonly diasCotizadosParcial: 'naturales' | 'treinta-por-mes';
}

export const LECTURAS_INCAPACIDAD_POR_DEFECTO: LecturasIncapacidad =
  porDefectoDelMotor<LecturasIncapacidad>('incapacidad');

/** Opciones comunes con la jubilación (escenario, lecturas de la Fase 2-A, mínimos, brecha…). */
type OpcionesComunes = Pick<
  OpcionesJubilacion,
  | 'sexo'
  | 'escenario'
  | 'lecturas'
  | 'topeBases'
  | 'actualizarBases'
  | 'aplicarPensionMaxima'
  | 'aplicarMinimos'
  | 'situacionFamiliar'
  | 'rentasAnuales'
  | 'hijos'
  | 'hombreCumpleArt60'
  | 'huecoBaseMinima'
  | 'calcularAunqueNoCumpla'
>;

export interface OpcionesIncapacidad extends OpcionesComunes {
  readonly lecturasIncapacidad?: Partial<LecturasIncapacidad>;
  /** En alta o situación asimilada en el hecho causante. Por defecto, sí. */
  readonly enAlta?: boolean;
  /**
   * Alta o asimilada sin obligación de cotizar: fecha (`AAAA-MM-DD`) en que cesó la obligación de
   * cotizar; la ventana de diez años de la quinta parte se cuenta desde ella (art. 195.3).
   */
  readonly finObligacionCotizar?: string;
  /** Meses que faltaban para agotar la incapacidad temporal, asimilados a cotizados (art. 4.4 RD 1799/1985). */
  readonly mesesAsimiladosIT?: number;
  /** Incremento del 20 % de la total cualificada; por defecto, si la edad llega al mínimo y no trabaja. */
  readonly totalCualificada?: boolean;
  /** Trabaja por cuenta propia o ajena tras el reconocimiento (art. 198). */
  readonly trabaja?: boolean;
  /** Parcial: mes de inicio de la incapacidad temporal (`AAAA-MM`); su base reguladora es la del mes anterior. */
  readonly inicioIncapacidadTemporal?: string;
  /** Parcial: base reguladora mensual de la incapacidad temporal, si se conoce (obligatoria en contingencias profesionales). */
  readonly baseReguladoraIT?: number;
  /** Accidente no laboral en alta: primer mes (`AAAA-MM`) del periodo de 24 meses elegido; por defecto, el más favorable. */
  readonly periodoElegidoDesde?: string;
  /**
   * Contingencias profesionales: base reguladora mensual calculada fuera del motor con el salario
   * real (Reglamento de 1956, no descargado). Sin ella, el motor lanza `NoImplementada`.
   */
  readonly baseReguladoraProfesional?: number;
  /** Gran incapacidad: última base de cotización de la contingencia; por defecto, la última de la carrera. */
  readonly ultimaBaseCotizacion?: number;
}

export interface ResultadoIncapacidad {
  readonly grado: GradoIncapacidad;
  readonly origen: OrigenIncapacidad;
  readonly fechaHechoCausante: string;
  /** Año cuya normativa se aplica (el del hecho causante). */
  readonly anioNormativa: number;
  readonly cumpleRequisitos: boolean;
  readonly requisitos: readonly Requisito[];
  readonly estado: EstadoPension;
  /** Importe de cada una de las 14 pagas (pensión, complementos e incrementos), euros nominales. */
  readonly pensionMensual: number;
  readonly pensionAnual: number;
  readonly pagas: number;
  /** Parte de la paga mensual que corresponde al complemento de gran incapacidad. */
  readonly complementoGranIncapacidad: number;
  /** Parte de la paga mensual que corresponde al incremento de la total cualificada. */
  readonly incrementoTotalCualificada: number;
  /** Importe mensual cuyo pago se suspende mientras trabaje (art. 198.2), si procede. */
  readonly importeEnSuspenso: number;
  /** Incapacidad permanente parcial: cantidad a tanto alzado (pago único). */
  readonly cantidadTantoAlzado: number;
  readonly edadMeses: number;
  readonly mesesCotizados: number;
  /** Base reguladora (en la enfermedad común, ya multiplicada por el porcentaje del art. 197.1.b). */
  readonly baseReguladora: number;
  /** Porcentaje del grado aplicado a la base reguladora (sin el incremento de la cualificada). */
  readonly porcentajeGrado: number;
  readonly pasos: readonly Paso[];
  readonly avisos: readonly string[];
}
