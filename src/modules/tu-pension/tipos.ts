/** Tipos de la capa de entrada y presentación del simulador «Tu pensión» (Fase 3-A). */

export type Sexo = 'hombre' | 'mujer';
export type UbicacionLagunas = 'mitad' | 'final';

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
  readonly aplicarMinimos: boolean;
  readonly aplicarPensionMaxima: boolean;
  /** IPC anual supuesto, en %, con coma o punto decimal. Vacío: sin escenario. */
  readonly ipcSupuesto: string;
}

export type CampoFormulario = keyof FormularioTuPension;
export type ErroresFormulario = Partial<Record<CampoFormulario, string>>;
