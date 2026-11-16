import type { LecturaVista } from './supuestos';
import type { FormularioTuPension } from './tipos';

/** Lectura que, con el origen accidente no laboral, se muestra siempre junto al resultado. */
export const LECTURA_ANL = 'incapacidad.lagunasAccidenteNoLaboral';

/**
 * Lecturas que se muestran junto al resultado de la incapacidad: las que están sin decidir con
 * firmeza (provisionales o pendientes) y cambian el resultado con la alternativa. Además, con el
 * origen accidente no laboral, la de los meses sin cotizar del periodo elegido, siempre (aunque con
 * estos datos no cambie el resultado), porque es la de efecto potencialmente mayor.
 */
export function lecturasQueIntervienen(
  lecturas: readonly LecturaVista[],
  origen: FormularioTuPension['origen'],
): readonly LecturaVista[] {
  return lecturas.filter(
    (l) =>
      (l.estado !== 'decidida' && l.afectaAlResultado) ||
      (origen === 'accidente-no-laboral' && l.id === LECTURA_ANL),
  );
}

const ORDEN_ESTADO = { pendiente: 0, provisional: 1, decidida: 2 } as const;

/**
 * Lecturas que se muestran junto al resultado de la viudedad y la orfandad (Fase 3-C2): todas las
 * que cambian el resultado con su alternativa, decididas, provisionales o pendientes, con las
 * pendientes primero y luego las provisionales. No se oculta ninguna que influya; si ninguna
 * influye, la sección lo dice. (En la incapacidad solo se muestran las no decididas; aquí la
 * petición de la fase es no ocultar las decididas que sí influyen.)
 */
export function lecturasQueIntervienenSupervivencia(
  lecturas: readonly LecturaVista[],
): readonly LecturaVista[] {
  return lecturas
    .filter((l) => l.afectaAlResultado)
    .toSorted((a, b) => ORDEN_ESTADO[a.estado] - ORDEN_ESTADO[b.estado]);
}
