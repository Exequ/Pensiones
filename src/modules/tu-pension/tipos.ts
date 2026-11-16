/** Tipos de la capa de entrada y presentación del simulador «Tu pensión» (Fases 3-A a 3-C1). */
import type { GradoIncapacidad, OrigenIncapacidad } from '../../engine/incapacidad/tipos.ts';
import type { FormularioSupervivencia } from './supervivencia-tipos.ts';
import type { TramoFormulario } from './tramos.ts';

/**
 * Prestación que se simula: jubilación, incapacidad permanente (Fase 3-C1), viudedad y orfandad
 * (Fase 3-C2). El favor de familiares y las no contributivas son de la 3-C3.
 */
export type IdPrestacion = 'jubilacion' | 'incapacidad' | 'viudedad' | 'orfandad';

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
   * Fecha del hecho causante, en la que termina la carrera: la de jubilación (jubilación), la del
   * reconocimiento (incapacidad permanente) o la del fallecimiento (viudedad y orfandad). Desde la
   * Fase 3-C2 los campos se llaman `hechoCausante*` en todas las prestaciones (antes `jubilacion*`);
   * el enlace compartible conserva sus parámetros (`jub` y `hc`). Véase `docs/DECISIONES.md` (3-C2).
   */
  readonly hechoCausanteMes: string;
  readonly hechoCausanteAnio: string;
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
  /**
   * Viudedad y orfandad (Fase 3-C2): datos del causante (situación, pensión), de la persona viuda y
   * de los huérfanos. La causa de la muerte usa `origen` y la base reguladora escrita `baseReguladora`.
   */
  readonly supervivencia: FormularioSupervivencia;
}

/**
 * Campos de la parte de supervivencia que pueden llevar un error de validación. Los de la persona
 * viuda empiezan por `viudo`, los de la persona huérfana por `huerfano` y `otrosHuerfanos` agrupa los
 * errores de la lista de otros huérfanos.
 */
export type CampoSupervivencia =
  | 'situacion'
  | 'pensionMes'
  | 'pensionAnio'
  | 'viudoVinculo'
  | 'viudoNacimientoMes'
  | 'viudoNacimientoAnio'
  | 'viudoSexo'
  | 'viudoHijos'
  | 'viudoMatrimonioMes'
  | 'viudoMatrimonioAnio'
  | 'viudoConvivenciaPrevia'
  | 'viudoConvivencia'
  | 'viudoRegistroMes'
  | 'viudoRegistroAnio'
  | 'viudoCompensatoria'
  | 'viudoRentasTrabajo'
  | 'viudoRentasCapital'
  | 'viudoRendimientos'
  | 'viudoRendimientosAnterior'
  | 'viudoMiembros'
  | 'viudoRendimientosUnidad'
  | 'huerfanoNacimientoMes'
  | 'huerfanoNacimientoAnio'
  | 'huerfanoRentasTrabajo'
  | 'huerfanoRendimientos'
  | 'otrosHuerfanos';

export type CampoFormulario = keyof FormularioTuPension | CampoSupervivencia;
export type ErroresFormulario = Partial<Record<CampoFormulario, string>>;
