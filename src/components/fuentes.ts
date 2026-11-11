import type { Dato } from '../engine/esquema-datos';
import { formatearFechaIso } from '../engine/formato';

export interface ReferenciaFuente {
  readonly clave: string;
  readonly titulo: string;
  readonly organismo: string;
  readonly url: string;
  readonly docId: string | undefined;
  readonly fecha: string;
  readonly confianza: Dato['confidence'];
}

/** Agrupa las fuentes distintas, conservando el orden de aparición. */
export function fuentesUnicas(datos: readonly Dato[]): ReferenciaFuente[] {
  const vistas = new Map<string, ReferenciaFuente>();
  for (const dato of datos) {
    const fecha = formatearFechaIso(dato.fetchedAt);
    const clave = [dato.source.url, dato.source.docId ?? '', fecha, dato.confidence].join('|');
    if (!vistas.has(clave)) {
      vistas.set(clave, {
        clave,
        titulo: dato.source.title,
        organismo: dato.source.publisher,
        url: dato.source.url,
        docId: dato.source.docId,
        fecha,
        confianza: dato.confidence,
      });
    }
  }
  return [...vistas.values()];
}
