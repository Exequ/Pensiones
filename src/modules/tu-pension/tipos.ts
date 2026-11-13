/** Tipos de la capa de entrada y presentación del simulador «Tu pensión» (Fases 3-A, 3-B1 y 3-B2). */
import type { TramoFormulario } from './tramos.ts';

export type Sexo = 'hombre' | 'mujer';
export type UbicacionLagunas = 'mitad' | 'final';
export type TipoCarrera = 'simple' | 'tramos';

/**
 * Valores del formulario tal como los escribe la persona (texto). La validación y la conversión
 * a la entrada del motor están en `mapeador.ts`.
 */
export interface FormularioTuPension {
  readonly nacimientoMes: string;
  readonly nacimientoAnio: string;
  readonly sexo: Sexo | '';
  readonly hijos: string;
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
  /**
   * Lecturas abiertas que la persona ha cambiado (Fase 3-B2): `{ id: valor }` solo con las que
   * difieren del valor por defecto del registro. Vacío: todas las lecturas por defecto.
   */
  readonly lecturas: Readonly<Record<string, string>>;
}

export type CampoFormulario = keyof FormularioTuPension;
export type ErroresFormulario = Partial<Record<CampoFormulario, string>>;
