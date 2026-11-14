/**
 * Carga y validación de los ficheros de /data que usan las páginas históricas (Fase 5-A).
 * Cada fichero se valida con el esquema de /data al cargarlo: si cambia la estructura, falla aquí
 * y no en pantalla. Las páginas no importan nada de /data fuera de los módulos `datos-*.ts`.
 */
import {
  ArchivoDatos,
  ArchivoTabla,
  Dato,
  type Dato as DatoTipo,
  type Serie,
} from '../../engine/esquema-datos';
import {
  datoDeSerie,
  encontrarSerie,
  puntosAnuales,
  type PuntoAnual,
} from '../../engine/series-historicas';

/** Serie de /data ya validada, con sus puntos anuales y el `Dato` que alimenta `SourceLine`. */
export interface SerieCargada {
  readonly serie: Serie;
  readonly puntos: readonly PuntoAnual[];
  readonly dato: DatoTipo;
}

export function validarArchivo(json: unknown): ArchivoDatos {
  return ArchivoDatos.parse(json);
}

export function validarTabla(json: unknown): ArchivoTabla {
  return ArchivoTabla.parse(json);
}

export function cargarSerie(archivo: ArchivoDatos, id: string): SerieCargada {
  const serie = encontrarSerie(archivo, id);
  return { serie, puntos: puntosAnuales(serie), dato: datoDeSerie(serie) };
}

/** `Dato` para `SourceLine` de una tabla (CSV + JSON hermano). */
export function datoDeTabla(tabla: ArchivoTabla, periodo: string): DatoTipo {
  return Dato.parse({
    value: tabla.filas,
    unit: 'filas de la tabla',
    period: periodo,
    source: tabla.source,
    fetchedAt: tabla.fetchedAt,
    confidence: tabla.confidence,
    ...(tabla.notes === undefined ? {} : { notes: tabla.notes }),
  });
}

/** Memoriza el resultado de una carga costosa (validación de ficheros grandes). */
export function memorizar<T>(crear: () => T): () => T {
  let valor: T | undefined;
  return () => (valor ??= crear());
}
