/**
 * Ejecutor de la viudedad y la orfandad de «Tu pensión» (Fase 3-C2). Llama a `motor.supervivencia`
 * (el límite conjunto del art. 229 se aplica al grupo de pensiones del mismo causante) y deja a
 * mano la prestación de la persona que pregunta con los campos que la comparación de lecturas
 * necesita (`cumpleRequisitos`, `pensionMensual`, `baseReguladora`). No calcula nada.
 */
import type { EjecutorPrestacion } from '../../engine/comparar-lecturas';
import type { Motor, ResultadoOk } from '../../engine/fachada';
import type { ResultadoPrestacion, ResultadoSupervivencia } from '../../engine/supervivencia/tipos';
import type { EntradaTuSupervivencia } from './supervivencia-mapeador';

export interface DetalleTuSupervivencia extends ResultadoSupervivencia {
  readonly quien: EntradaTuSupervivencia['quien'];
  /** La prestación de la persona que pregunta (la primera de su lista). */
  readonly tu: ResultadoPrestacion;
  readonly cumpleRequisitos: boolean;
  readonly pensionMensual: number;
}

export interface ResultadoTuSupervivencia extends Omit<ResultadoOk<'supervivencia'>, 'detalle'> {
  readonly detalle: DetalleTuSupervivencia;
}

export const ejecutarSupervivencia: EjecutorPrestacion<
  EntradaTuSupervivencia,
  ResultadoTuSupervivencia
> = (motor: Motor, entrada) => {
  const r = motor.supervivencia(entrada);
  if (!r.ok) return r;
  const lista = entrada.quien === 'viudedad' ? r.detalle.viudedad : r.detalle.orfandad;
  const tu = lista[0];
  if (tu === undefined) {
    throw new Error(
      'La entrada de supervivencia no tiene la prestación de la persona que pregunta.',
    );
  }
  return {
    ...r,
    detalle: {
      ...r.detalle,
      quien: entrada.quien,
      tu,
      cumpleRequisitos: tu.cumpleRequisitos,
      pensionMensual: tu.pensionMensual,
    },
  };
};
