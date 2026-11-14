/** Tipos de la capa de entrada y presentación del simulador «Tu pensión» (Fases 3-A a 3-C1). */
import type { GradoIncapacidad, OrigenIncapacidad } from '../../engine/incapacidad/tipos.ts';
import type { TramoFormulario } from './tramos.ts';

/** Prestación que se simula. Desde la Fase 3-C1 hay dos; las demás son de la 3-C2 y la 3-C3. */
export type IdPrestacion = 'jubilacion' | 'incapacidad';

export type Sexo = 'hombre' | 'mujer';
export type UbicacionLagunas = 'mitad' | 'final';
export type TipoCarrera = 'simple' | 'tramos';

/**
 * Valores del formulario tal como los escribe la persona (texto). La validación y la conversión
 * a la entrada del motor están en `mapeador.ts`.
 */
export interface FormularioTuPension {
  /** Prestación elegida (Fase 3-C1). Un formulario sin prestación es de jubilación. */
  readonly prestacion: IdPrestacion;
  readonly nacimientoMes: string;
  readonly nacimientoAnio: string;
  readonly sexo: Sexo | '';
  readonly hijos: string;
  /**
   * Fecha en que termina la carrera: la de jubilación (jubilación) o la del hecho causante
   * (incapacidad permanente). Los nombres son los de la 3-A; véase `docs/DECISIONES.md` (3-C1).
   */
  readonly jubilacionMes: string;
  readonly jubilacionAnio: string;
  readonly inicioMes: string;
  readonly inicioAnio: string;
  readonly mesesSinCotizar: string;
  readonly ubicacionLagunas: UbicacionLagunas;
  readonly baseMensual: string;
  /** Carrera simple (3-A: base constante) o por tramos (3-B1). */
  readonly tipoCarrera: TipoCarrera;
  /** Tramos de la carrera por tramos (solo se usan si `tipoCarrera` es `tramos`). */
  readonly tramos: readonly TramoFormulario[];
  /** Definición de la «base media» para los tramos con esa referencia (id de `referencias.ts`). */
  readonly definicionMedia: string;
  readonly aplicarMinimos: boolean;
  readonly aplicarPensionMaxima: boolean;
  /** IPC anual supuesto, en %, con coma o punto decimal. Vacío: sin escenario. */
  readonly ipcSupuesto: string;
  /** Incapacidad permanente: grado (lo reconoce el organismo competente; aquí se elige). */
  readonly grado: GradoIncapacidad | '';
  /** Incapacidad permanente: contingencia de la que deriva. */
  readonly origen: OrigenIncapacidad | '';
  /**
   * Incapacidad permanente por accidente de trabajo o enfermedad profesional: base reguladora
   * mensual en euros (texto), la que figura en la resolución o la calculada por la persona. El
   * simulador no la calcula a partir del salario real. Se ignora con los demás orígenes.
   */
  readonly baseReguladora: string;
  /** Incapacidad permanente: en alta o situación asimilada en la fecha del hecho causante. */
  readonly enAlta: boolean;
  /** Incapacidad permanente: trabaja tras el reconocimiento de la pensión. */
  readonly trabaja: boolean;
  /**
   * Lecturas abiertas que la persona ha cambiado (Fase 3-B2): `{ id: valor }` solo con las que
   * difieren del valor por defecto del registro. Vacío: todas las lecturas por defecto.
   */
  readonly lecturas: Readonly<Record<string, string>>;
}

export type CampoFormulario = keyof FormularioTuPension;
export type ErroresFormulario = Partial<Record<CampoFormulario, string>>;
