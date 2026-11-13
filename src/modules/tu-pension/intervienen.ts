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
