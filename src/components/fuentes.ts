import type { Dato } from '../engine/esquema-datos';

/** Cita del documento y ubicación en él, tal como constan en el dato (`quote`, `location`). */
export interface CitaFuente {
  readonly cita: string | undefined;
  readonly ubicacion: string | undefined;
  /** A qué parte del bloque se refiere la cita (p. ej., el requisito de una tabla), si se indica. */
  readonly rotulo?: string | undefined;
}

/**
 * Dato con un rótulo opcional (Fase R5): permite que el desplegable de fuentes diga a qué parte del
 * bloque corresponde cada cita o ubicación. El rótulo no forma parte del esquema de `/data`.
 */
export type DatoRotulado = Dato & { readonly rotulo?: string | undefined };

export interface ReferenciaFuente {
  readonly clave: string;
  readonly titulo: string;
  readonly organismo: string;
  readonly url: string;
  readonly docId: string | undefined;
  /** Naturaleza del dato, si se indica (observado, derivado o proyección de modelo). */
  readonly naturaleza: Dato['naturaleza'];
  /** Citas y ubicaciones de los datos de esta fuente, sin repetir; vacío si ninguno las lleva. */
  readonly citas: readonly CitaFuente[];
}

/** Texto con el que se rotula cada naturaleza junto a la fuente. */
export const ETIQUETA_NATURALEZA = {
  observado: 'observado',
  derivado: 'derivado de datos observados',
  'proyeccion-publicada': 'proyección publicada por la fuente',
  'proyeccion-de-modelo': 'proyección de modelo propio',
} as const;

/**
 * Agrupa las fuentes distintas, conservando el orden de aparición. La fecha de descarga y la
 * confianza (`fetchedAt`, `confidence`) siguen en los datos, pero no forman parte de la referencia
 * que muestra la interfaz.
 */
export function fuentesUnicas(datos: readonly DatoRotulado[]): ReferenciaFuente[] {
  const vistas = new Map<string, Omit<ReferenciaFuente, 'citas'> & { citas: CitaFuente[] }>();
  for (const dato of datos) {
    const clave = [
      dato.source.url,
      dato.source.docId ?? '',
      dato.source.title,
      dato.source.publisher,
      dato.naturaleza ?? '',
    ].join('|');
    let fuente = vistas.get(clave);
    if (!fuente) {
      fuente = {
        clave,
        titulo: dato.source.title,
        organismo: dato.source.publisher,
        url: dato.source.url,
        docId: dato.source.docId,
        naturaleza: dato.naturaleza,
        citas: [],
      };
      vistas.set(clave, fuente);
    }
    if (dato.quote !== undefined || dato.location !== undefined) {
      const repetida = fuente.citas.some(
        (c) => c.cita === dato.quote && c.ubicacion === dato.location && c.rotulo === dato.rotulo,
      );
      if (!repetida) {
        fuente.citas.push({
          cita: dato.quote,
          ubicacion: dato.location,
          ...(dato.rotulo === undefined ? {} : { rotulo: dato.rotulo }),
        });
      }
    }
  }
  return [...vistas.values()];
}

/** Naturalezas distintas de una lista de fuentes, rotuladas y en orden de aparición. */
export function etiquetasNaturaleza(fuentes: readonly ReferenciaFuente[]): string[] {
  const etiquetas: string[] = [];
  for (const { naturaleza } of fuentes) {
    if (naturaleza === undefined) continue;
    const etiqueta = ETIQUETA_NATURALEZA[naturaleza];
    if (!etiquetas.includes(etiqueta)) etiquetas.push(etiqueta);
  }
  return etiquetas;
}
