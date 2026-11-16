/**
 * Tipos del formulario de viudedad y orfandad de «Tu pensión» (Fase 3-C2). Como el resto del
 * formulario, todos los valores son texto o casillas tal como los escribe la persona; la validación
 * y la conversión a la entrada del motor están en `supervivencia-mapeador.ts`.
 *
 * La causa de la muerte reutiliza el campo `origen` del formulario (los cuatro valores coinciden con
 * los del origen de la incapacidad: enfermedad común, accidente no laboral, accidente de trabajo y
 * enfermedad profesional) y la base reguladora escrita por la persona reutiliza `baseReguladora`
 * (contingencia profesional del fallecimiento, o base de la pensión del causante pensionista).
 */
import type { VinculoViudedad } from '../../engine/supervivencia/tipos.ts';
import type { Sexo } from './tipos.ts';

export type { VinculoViudedad };

/** Situación del causante en la fecha del fallecimiento (`alta-sin-obligacion` no se ofrece). */
export type SituacionCausanteFormulario = 'alta' | 'sin-alta' | 'pensionista';
export type ClasePensionCausante = 'jubilacion' | 'incapacidad-permanente';

/** Quién es la persona que pregunta: la que cobraría la viudedad o la que cobraría la orfandad. */
export type QuienSupervivencia = 'viudedad' | 'orfandad';

/** Datos de la persona viuda (o del cónyuge o pareja superviviente en la pantalla de orfandad). */
export interface FormularioViudo {
  readonly vinculo: VinculoViudedad | '';
  readonly nacimientoMes: string;
  readonly nacimientoAnio: string;
  readonly sexo: Sexo | '';
  readonly hijos: string;
  /** Cónyuge. */
  readonly matrimonioMes: string;
  readonly matrimonioAnio: string;
  readonly convivenciaPreviaMeses: string;
  readonly enfermedadAnterior: boolean;
  /** Cónyuge y pareja de hecho. */
  readonly hijosComunes: boolean;
  /** Pareja de hecho. */
  readonly convivenciaMeses: string;
  readonly registroMes: string;
  readonly registroAnio: string;
  /** Excónyuge y expareja de hecho. */
  readonly compensatoriaAnual: string;
  readonly violenciaGenero: boolean;
  readonly nuevoVinculo: boolean;
  readonly separacionAnterior: boolean;
  /** Rentas y otras pensiones. */
  readonly otraPensionPublica: boolean;
  readonly discapacidad65: boolean;
  readonly rentasTrabajo: string;
  readonly rentasCapital: string;
  readonly rendimientos: string;
  readonly rendimientosAnterior: string;
  /** Complemento por hijos. */
  readonly hijoConOrfandad: boolean;
  readonly brechaEnOtraPension: boolean;
  /** Cargas familiares (viudedad del 70 %). */
  readonly cargas: boolean;
  readonly miembros: string;
  readonly rendimientosUnidad: string;
}

export interface FormularioHuerfano {
  readonly id: string;
  readonly nacimientoMes: string;
  readonly nacimientoAnio: string;
  readonly incapacitado: boolean;
  readonly discapacidad65: boolean;
  readonly rentasTrabajo: string;
  readonly rendimientos: string;
}

export interface FormularioSupervivencia {
  readonly situacion: SituacionCausanteFormulario | '';
  /** Causante pensionista: clase y fecha (mes y año) de su pensión; su base va en `baseReguladora`. */
  readonly clasePension: ClasePensionCausante;
  readonly pensionMes: string;
  readonly pensionAnio: string;
  /** Viudedad: la persona que pregunta. Orfandad: el cónyuge o pareja superviviente, si `hayViudo`. */
  readonly viudo: FormularioViudo;
  /** Orfandad: sobrevive un cónyuge o pareja con derecho a viudedad. */
  readonly hayViudo: boolean;
  /** Orfandad: la persona que pregunta. */
  readonly huerfano: FormularioHuerfano;
  /** Otros huérfanos del mismo causante con posible derecho (en la viudedad, los hijos del causante). */
  readonly otrosHuerfanos: readonly FormularioHuerfano[];
  /** Orfandad absoluta: no sobrevive ningún progenitor (o solo se conoce a uno). */
  readonly orfandadAbsoluta: boolean;
}

export const VIUDO_VACIO: FormularioViudo = {
  vinculo: '',
  nacimientoMes: '',
  nacimientoAnio: '',
  sexo: '',
  hijos: '0',
  matrimonioMes: '',
  matrimonioAnio: '',
  convivenciaPreviaMeses: '0',
  enfermedadAnterior: false,
  hijosComunes: false,
  convivenciaMeses: '',
  registroMes: '',
  registroAnio: '',
  compensatoriaAnual: '',
  violenciaGenero: false,
  nuevoVinculo: false,
  separacionAnterior: false,
  otraPensionPublica: false,
  discapacidad65: false,
  rentasTrabajo: '0',
  rentasCapital: '0',
  rendimientos: '0',
  rendimientosAnterior: '',
  hijoConOrfandad: false,
  brechaEnOtraPension: false,
  cargas: false,
  miembros: '',
  rendimientosUnidad: '',
};

export const HUERFANO_VACIO: FormularioHuerfano = {
  id: 'huerfano',
  nacimientoMes: '',
  nacimientoAnio: '',
  incapacitado: false,
  discapacidad65: false,
  rentasTrabajo: '0',
  rendimientos: '0',
};

export const SUPERVIVENCIA_VACIA: FormularioSupervivencia = {
  situacion: '',
  clasePension: 'jubilacion',
  pensionMes: '',
  pensionAnio: '',
  viudo: VIUDO_VACIO,
  hayViudo: false,
  huerfano: HUERFANO_VACIO,
  otrosHuerfanos: [],
  orfandadAbsoluta: false,
};

let contador = 0;
export function nuevoHuerfano(): FormularioHuerfano {
  contador += 1;
  return { ...HUERFANO_VACIO, id: `huerfano-${String(contador)}` };
}
