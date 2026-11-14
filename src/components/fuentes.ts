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
  /** Naturaleza del dato, si se indica (observado, derivado o proyección de modelo). */
  readonly naturaleza: Dato['naturaleza'];
}

/** Texto con el que se rotula cada naturaleza junto a la fuente. */
export const ETIQUETA_NATURALEZA = {
  observado: 'observado',
  derivado: 'derivado de datos observados',
  'proyeccion-publicada': 'proyección publicada por la fuente',
  'proyeccion-de-modelo': 'proyección de modelo propio',
} as const;

/** Agrupa las fuentes distintas, conservando el orden de aparición. */
export function fuentesUnicas(datos: readonly Dato[]): ReferenciaFuente[] {
  const vistas = new Map<string, ReferenciaFuente>();
  for (const dato of datos) {
    const fecha = formatearFechaIso(dato.fetchedAt);
    const clave = [
      dato.source.url,
      dato.source.docId ?? '',
      fecha,
      dato.confidence,
      dato.naturaleza ?? '',
    ].join('|');
    if (!vistas.has(clave)) {
      vistas.set(clave, {
        clave,
        titulo: dato.source.title,
        organismo: dato.source.publisher,
        url: dato.source.url,
        docId: dato.source.docId,
        fecha,
        confianza: dato.confidence,
        naturaleza: dato.naturaleza,
      });
    }
  }
  return [...vistas.values()];
}
