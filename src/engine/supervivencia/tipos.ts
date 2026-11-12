/**
 * Tipos públicos del motor de las prestaciones de muerte y supervivencia contributivas del Régimen
 * General (viudedad, orfandad y favor de familiares). Importes en euros nominales del año del
 * fallecimiento (hecho causante), salvo que se indique otra cosa.
 */
import type {
  Carrera,
  EstadoPension,
  OpcionesJubilacion,
  Paso,
  Requisito,
  Sexo,
} from '../jubilacion/tipos.ts';

export type { Carrera, EstadoPension, Paso, Requisito, Sexo };

/** Causa de la muerte. */
export type CausaMuerte =
  'enfermedad-comun' | 'accidente-no-laboral' | 'accidente-trabajo' | 'enfermedad-profesional';

/** Situación del causante en la fecha del fallecimiento (art. 217 y 219.1 TRLGSS). */
export type SituacionCausante =
  /** En alta o situación asimilada con obligación de cotizar. */
  | 'alta'
  /** En alta o asimilada sin obligación de cotizar: la ventana de los 500 días acaba al cesar la obligación. */
  | 'alta-sin-obligacion'
  /** Sin alta: exige quince años cotizados. */
  | 'sin-alta'
  /** Pensionista de jubilación o incapacidad permanente contributivas (art. 217.1.c). */
  | 'pensionista';

export interface PensionDelCausante {
  /** Base reguladora mensual que sirvió para determinar su pensión (art. 7.3 Decreto 1646/1972). */
  readonly baseReguladora: number;
  /** Fecha (`AAAA-MM-DD`) del hecho causante de su pensión. */
  readonly fechaHechoCausante: string;
  readonly clase: 'jubilacion' | 'incapacidad-permanente';
}

export interface Causante {
  /** Fecha del fallecimiento (`AAAA-MM-DD`): hecho causante de las prestaciones. */
  readonly fechaFallecimiento: string;
  readonly causa: CausaMuerte;
  readonly situacion: SituacionCausante;
  /** Carrera de cotización (obligatoria salvo pensionista o base profesional facilitada). */
  readonly carrera?: Carrera;
  /** Alta sin obligación de cotizar: fecha (`AAAA-MM-DD`) en que cesó la obligación. */
  readonly finObligacionCotizar?: string;
  /** Pensionista: base reguladora y fecha de su pensión. */
  readonly pension?: PensionDelCausante;
  /**
   * Accidente de trabajo o enfermedad profesional: base reguladora mensual calculada fuera del
   * motor con el salario real (Reglamento de 1956, no descargado). Sin ella, `NoImplementada`.
   */
  readonly baseReguladoraProfesional?: number;
}

/** Rentas y situación económica de un beneficiario (euros/año del ejercicio que corresponda). */
export interface EconomiaBeneficiario {
  /** Rendimientos anuales por todos los conceptos, sin la propia pensión de supervivencia. */
  readonly rendimientosAnuales?: number;
  /** Parte de los rendimientos que procede del trabajo (por cuenta propia o ajena). */
  readonly rentasTrabajoAnuales?: number;
}

export type VinculoViudedad = 'conyuge' | 'pareja-hecho' | 'excónyuge' | 'expareja-hecho';

export interface BeneficiarioViudedad extends EconomiaBeneficiario {
  readonly vinculo: VinculoViudedad;
  readonly nacimiento: string;
  readonly sexo?: Sexo;
  /** Cónyuge: fecha del matrimonio (`AAAA-MM-DD`). */
  readonly fechaMatrimonio?: string;
  /** Cónyuge: meses de convivencia (art. 221.2) anteriores al matrimonio. */
  readonly convivenciaPreviaMeses?: number;
  /** Hijos en común con el causante. */
  readonly hijosComunes?: boolean;
  /**
   * Cónyuge: la muerte deriva de una enfermedad común anterior al vínculo (art. 219.2). Por
   * defecto, no (el motor avisa si el matrimonio dura menos de lo exigido).
   */
  readonly enfermedadAnteriorAlVinculo?: boolean;
  /** Pareja de hecho: meses de convivencia estable e ininterrumpida inmediatamente anteriores. */
  readonly convivenciaMeses?: number;
  /** Pareja de hecho: fecha de inscripción en el registro o del documento público (`AAAA-MM-DD`). */
  readonly fechaRegistroPareja?: string;
  /** Excónyuge o expareja: pensión compensatoria que se extingue con la muerte (euros/año). */
  readonly pensionCompensatoriaAnual?: number;
  /** Excónyuge o expareja sin compensatoria: víctima de violencia de género (art. 220.1 y 221.3). */
  readonly victimaViolenciaGenero?: boolean;
  /** Excónyuge o expareja: ha contraído matrimonio o constituido pareja de hecho después. */
  readonly nuevoVinculo?: boolean;
  /** Separación o divorcio anterior al 01/01/2008 (DT 13.ª: no implementada). */
  readonly separacionAnteriorA2008?: boolean;
  /** Meses vividos con el causante (reparto entre varios beneficiarios, art. 220.2). */
  readonly mesesConvividos?: number;
  /** Tiene derecho a otra pensión pública (RD 900/2018, art. 2.b). */
  readonly otraPensionPublica?: boolean;
  /** Rendimientos del capital, actividades económicas o ganancias patrimoniales (RD 900/2018, art. 2.d). */
  readonly rentasCapitalAnuales?: number;
  /** Cargas familiares (art. 31.2 Decreto 3158/1966): convive con hijos menores de 26 años o incapacitados, o menores acogidos. */
  readonly cargasFamiliares?: {
    readonly miembrosUnidadFamiliar: number;
    /** Rendimientos de toda la unidad familiar, incluido el beneficiario (euros/año). */
    readonly rendimientosUnidadFamiliar: number;
  };
  /** Discapacidad igual o superior al 65 % (clase de la mínima). */
  readonly discapacidad65?: boolean;
  /** Número de hijos para el complemento de brecha (art. 60). */
  readonly hijos?: number;
  /** Hombre: alguno de los hijos en común tiene derecho a pensión de orfandad (art. 60.1.a). */
  readonly hijoConOrfandad?: boolean;
  /** El complemento de brecha ya se percibe con otra pensión (art. 60.3.a: uno por hijo). */
  readonly brechaEnOtraPension?: boolean;
}

export interface Huerfano extends EconomiaBeneficiario {
  readonly nacimiento: string;
  /** Incapacitado para el trabajo (art. 224.1). */
  readonly incapacitado?: boolean;
  /** Discapacidad igual o superior al 65 % (clase de la mínima, menores de 18 años). */
  readonly discapacidad65?: boolean;
}

export type ParentescoFamiliar =
  | 'nieto'
  | 'hermano'
  | 'madre'
  | 'abuela'
  | 'padre'
  | 'abuelo'
  /** Hijo o hermano mayor de 45 años de un pensionista de jubilación o incapacidad (art. 226.2). */
  | 'hijo-de-pensionista'
  | 'hermano-de-pensionista';

export interface Familiar extends EconomiaBeneficiario {
  readonly parentesco: ParentescoFamiliar;
  readonly nacimiento: string;
  readonly incapacitado?: boolean;
  /** Meses de convivencia con el causante y a sus expensas antes del fallecimiento. */
  readonly convivenciaMeses: number;
  /** Tiene derecho a pensión pública. */
  readonly pensionPublica?: boolean;
  /** Quedan familiares con obligación y posibilidad de prestarle alimentos (legislación civil). */
  readonly familiaresObligadosAlimentos?: boolean;
  /** Nietos y hermanos: huérfanos de padre y madre. */
  readonly huerfanoDePadreYMadre?: boolean;
  /** Madre y abuelas: viudas, solteras o casadas con marido incapacitado (art. 22.1.2 Orden de 1967). */
  readonly estadoCivilCumple?: boolean;
  /** Hijos y hermanos de pensionistas: solteros, divorciados o viudos, con dedicación prolongada al cuidado. */
  readonly solteroDivorciadoOViudo?: boolean;
  readonly dedicacionCuidado?: boolean;
}

export interface Beneficiarios {
  readonly viudos?: readonly BeneficiarioViudedad[];
  readonly huerfanos?: readonly Huerfano[];
  readonly familiares?: readonly Familiar[];
}

/**
 * Lecturas de la norma que el motor no decide (docs/REVISION_ACTUARIAL.md): cada una es una
 * opción con su valor por defecto (la lectura más sencilla, en docs/DECISIONES.md).
 */
export interface LecturasSupervivencia {
  /**
   * Ventana de quince años de la base reguladora: anterior al mes previo al del hecho causante
   * (art. 228 TRLGSS) o hasta el mes anterior al hecho causante (art. 7.2 Decreto 1646/1972).
   */
  readonly ventanaBaseReguladora: 'anterior-al-mes-previo' | 'decreto-1646-1972';
  /** Días cotizados de cada mes para los 500 días: naturales o treinta. */
  readonly diasCotizados: 'naturales' | 'treinta-por-mes';
  /** Orfandad con causante en alta: sin periodo previo (art. 224.1) o 500 días (art. 9.1 RD 1647/1997). */
  readonly carenciaOrfandad: 'sin-carencia' | 'rd-1647-1997';
  /** Familiares y accidente no laboral: 500 días (art. 22 Orden de 1967) o exento (art. 219.1). */
  readonly carenciaFamiliaresAccidenteNoLaboral: 'exigir' | 'exenta';
  /** Comparación de la viudedad con la pensión compensatoria: importes anuales o mensuales. */
  readonly comparacionCompensatoria: 'anual' | 'mensual';
  /** Reducción del 70 % por el límite de rendimientos: sin bajar del 52 % o sin suelo. */
  readonly reduccionViudedad70: 'no-inferior-52' | 'sin-suelo';
  /** Incremento de familiares sin viudo (art. 23.2 Orden de 1967): el porcentaje de viudedad o ninguno. */
  readonly incrementoFamiliares: 'porcentaje-viudedad' | 'sin-incremento';
  /** Límite conjunto viudedad + orfandad: se reducen las orfandades o todas proporcionalmente. */
  readonly reduccionLimiteConjunto: 'orfandad' | 'proporcional';
}

export const LECTURAS_SUPERVIVENCIA_POR_DEFECTO: LecturasSupervivencia = {
  ventanaBaseReguladora: 'anterior-al-mes-previo',
  diasCotizados: 'naturales',
  carenciaOrfandad: 'sin-carencia',
  carenciaFamiliaresAccidenteNoLaboral: 'exigir',
  comparacionCompensatoria: 'anual',
  reduccionViudedad70: 'no-inferior-52',
  incrementoFamiliares: 'porcentaje-viudedad',
  reduccionLimiteConjunto: 'orfandad',
};

type OpcionesComunes = Pick<
  OpcionesJubilacion,
  | 'escenario'
  | 'lecturas'
  | 'topeBases'
  | 'aplicarPensionMaxima'
  | 'aplicarMinimos'
  | 'huecoBaseMinima'
>;

export interface OpcionesSupervivencia extends OpcionesComunes {
  readonly lecturasSupervivencia?: Partial<LecturasSupervivencia>;
  /** Orfandad absoluta (no sobrevive ningún progenitor, o solo uno conocido; art. 38 Decreto 3158/1966). */
  readonly orfandadAbsoluta?: boolean;
  /** Cálculo aislado de familiares: hay pensionistas de viudedad u orfandad del mismo causante. */
  readonly hayViudoOHuerfanosPensionistas?: boolean;
  /** Accidente no laboral en alta: primer mes (`AAAA-MM`) del periodo de 24 meses elegido; por defecto, el más favorable. */
  readonly periodoElegidoDesde?: string;
}

export type ClasePrestacion =
  'viudedad' | 'prestacion-temporal-viudedad' | 'orfandad' | 'favor-familiares';

export interface ResultadoPrestacion {
  readonly clase: ClasePrestacion;
  /** Posición del beneficiario en su lista de entrada. */
  readonly indice: number;
  readonly cumpleRequisitos: boolean;
  readonly requisitos: readonly Requisito[];
  readonly estado: EstadoPension;
  /** Porcentaje de la base reguladora (con el incremento de la orfandad absoluta o de familiares). */
  readonly porcentaje: number;
  /** Pensión contributiva por paga tras los límites (máxima, compensatoria, reparto y límite conjunto). */
  readonly pensionContributiva: number;
  readonly complementoMinimos: number;
  readonly complementoBrecha: number;
  /** Importe de cada paga (contributiva + complementos). */
  readonly pensionMensual: number;
  readonly pensionAnual: number;
  readonly pagas: number;
  /** Prestación temporal de viudedad: duración en meses. */
  readonly duracionMeses?: number;
  readonly edadMeses: number;
  readonly pasos: readonly Paso[];
}

export interface ResultadoSupervivencia {
  readonly fechaHechoCausante: string;
  readonly anioNormativa: number;
  readonly causanteCumpleRequisitos: boolean;
  /** Requisitos del causante (viudedad y familiares; los de la orfandad van en cada prestación). */
  readonly requisitosCausante: readonly Requisito[];
  /** Base reguladora mensual (en el pensionista, con las revalorizaciones desde su pensión). */
  readonly baseReguladora: number;
  readonly viudedad: readonly ResultadoPrestacion[];
  readonly orfandad: readonly ResultadoPrestacion[];
  readonly favorFamiliares: readonly ResultadoPrestacion[];
  /** Suma de las pensiones contributivas iniciales sujetas al límite del art. 229 (euros/mes). */
  readonly sumaSujetaAlLimite: number;
  readonly limiteConjunto: number;
  readonly pasos: readonly Paso[];
  readonly avisos: readonly string[];
}
