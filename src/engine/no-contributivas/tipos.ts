/**
 * Tipos públicos del motor de las pensiones no contributivas (PNC) de jubilación y de incapacidad
 * (arts. 363 a 372 TRLGSS). Importes en euros nominales del año de los efectos económicos.
 */
import type { Paso, Requisito } from '../jubilacion/tipos.ts';
import { porDefectoDelMotor } from '../config/lecturas-por-defecto.ts';

export type { Paso, Requisito };

export type ClasePNC = 'jubilacion' | 'incapacidad';

export interface SolicitantePNC {
  readonly nacimiento: string;
  /** Fecha de la solicitud (`AAAA-MM-DD`): los efectos económicos son del día primero del mes siguiente. */
  readonly fechaSolicitud: string;
  /**
   * Meses de residencia legal en territorio español. Incapacidad: en total; jubilación: los
   * comprendidos entre los 16 años y la edad de devengo.
   */
  readonly residenciaLegalMeses: number;
  /** Meses de residencia legal inmediatamente anteriores a la solicitud (consecutivos). */
  readonly residenciaRecienteMeses: number;
  /** Grado de discapacidad o enfermedad crónica en % (incapacidad). */
  readonly gradoDiscapacidad?: number;
  /** Necesita el concurso de otra persona para los actos más esenciales de la vida (art. 364.6). */
  readonly necesitaTerceraPersona?: boolean;
  /**
   * Rentas o ingresos computables propios, en cómputo anual (euros/año), incluidos los de una
   * actividad lucrativa si la hay (`opciones.trabajo`).
   */
  readonly rentasAnuales: number;
}

export interface UnidadEconomicaPNC {
  /** Personas de la unidad económica, incluido el solicitante (1 = convive solo). */
  readonly convivientes: number;
  /** Beneficiarios de pensión no contributiva en la unidad económica, incluido el solicitante. */
  readonly beneficiarios?: number;
  /** Suma de las rentas o ingresos computables de todos los integrantes, incluidas las del solicitante (euros/año). */
  readonly rentasUnidadAnuales?: number;
  /** Convive con descendientes o ascendientes en primer grado (límite de 2,5 veces; art. 363.3). */
  readonly convivenciaAscendientesDescendientes?: boolean;
}

export interface TrabajoPNC {
  /** Ingresos anuales de la actividad lucrativa iniciada (euros/año). */
  readonly ingresosActividadAnuales: number;
  /** Meses transcurridos desde el inicio de la actividad. */
  readonly mesesDesdeInicio: number;
}

export interface AlquilerPNC {
  readonly sinViviendaEnPropiedad: boolean;
  readonly titularDelContrato: boolean;
  /** El arrendador es cónyuge, pareja o pariente hasta el tercer grado. */
  readonly arrendadorFamiliarOPareja: boolean;
  readonly mesesVigenciaContrato: number;
  readonly diasResidenciaEnLaVivienda: number;
  /** Convive con otro pensionista no contributivo que ya es el titular (primero) del contrato. */
  readonly otroPensionistaEsTitular?: boolean;
}

/** Lecturas de la norma que el motor no decide (docs/REVISION_ACTUARIAL.md). */
export interface LecturasPNC {
  /** Art. 364.2: el 35 % se calcula sobre la cuantía íntegra o sobre la cuantía por beneficiario de la unidad económica. */
  readonly baseRentasCompatibles: 'cuantia-integra' | 'cuantia-por-beneficiario';
  /** Art. 366: el límite suma el IPREM anual y la cuantía íntegra o la pensión reconocida. */
  readonly limiteTrabajo: 'cuantia-integra' | 'pension-reconocida';
  /**
   * Incapacidad con actividad lucrativa en los cuatro primeros años: el art. 364.2 termina con «salvo
   * lo dispuesto en el artículo 366», y el motor lee que el art. 366 sustituye a la reducción del
   * 35 % para los ingresos de la actividad (`sustituye-364-2`); alternativa: aplicar ambas (`se-suman`).
   */
  readonly rentasConTrabajoEnCuatroAnios: 'sustituye-364-2' | 'se-suman';
  /**
   * Art. 363.2: con derecho al complemento de tercera persona, el límite de acumulación de recursos
   * de la unidad económica se calcula sobre la cuantía íntegra incrementada con el complemento
   * (`con-complemento`, aplicación publicada por el IMSERSO) o solo sobre la íntegra (`sin-complemento`,
   * lectura literal).
   */
  readonly limiteConTerceraPersona: 'con-complemento' | 'sin-complemento';
}

export const LECTURAS_PNC_POR_DEFECTO: LecturasPNC =
  porDefectoDelMotor<LecturasPNC>('no-contributivas');

export interface OpcionesPNC {
  readonly lecturasPNC?: Partial<LecturasPNC>;
  readonly unidadEconomica?: UnidadEconomicaPNC;
  readonly trabajo?: TrabajoPNC;
  readonly alquiler?: AlquilerPNC;
  /** Año cuyas cuantías se aplican; por defecto, el de los efectos económicos. */
  readonly anio?: number;
}

export type EstadoPNC = 'no-causa-derecho' | 'cuantia-integra' | 'reducida' | 'minimo-25';

export interface ResultadoPNC {
  readonly clase: ClasePNC;
  readonly anioNormativa: number;
  /** Primer día del mes siguiente al de la solicitud (`AAAA-MM-DD`). */
  readonly fechaEfectos: string;
  readonly cumpleRequisitos: boolean;
  readonly requisitos: readonly Requisito[];
  readonly estado: EstadoPNC;
  readonly cuantiaIntegraAnual: number;
  /** Cuantía de cada beneficiario en la unidad económica (art. 364.1), sin rentas. */
  readonly cuantiaPorBeneficiarioAnual: number;
  /** Límite de acumulación de recursos de la unidad económica; 0 si convive solo. */
  readonly limiteAcumulacionAnual: number;
  readonly reduccionPorRentas: number;
  readonly reduccionPorLimite: number;
  readonly reduccionPorTrabajo: number;
  /** Pensión anual tras los límites, sin complementos. */
  readonly pensionAnual: number;
  readonly complementoTerceraPersonaAnual: number;
  readonly complementoAlquilerAnual: number;
  /** Pensión más complemento de tercera persona, por paga (14 pagas); el de alquiler se informa aparte. */
  readonly pensionMensual: number;
  readonly pagas: number;
  /** Pensión anual más los dos complementos. */
  readonly totalAnual: number;
  readonly pasos: readonly Paso[];
  readonly avisos: readonly string[];
}
