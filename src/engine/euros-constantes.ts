/**
 * Conversión de euros corrientes a euros constantes de un año base.
 *
 * importe_constante = importe_corriente × IPC(año base) / IPC(año del importe)
 *
 * Se trabaja con índices anuales (media anual del IPC, por ejemplo). La serie
 * real llegará en la Fase 1 desde /data; aquí solo se define la interfaz.
 */
import type { Serie } from './esquema-datos';

export interface PuntoIndice {
  readonly anio: number;
  readonly indice: number;
}

export interface SerieIPC {
  /** Identificador de la serie (p. ej., el `id` de la serie en /data). */
  readonly id: string;
  /** Descripción de la base o del tipo de índice (media anual, diciembre…). */
  readonly descripcion?: string;
  readonly puntos: readonly PuntoIndice[];
}

export interface ImporteAnual {
  readonly anio: number;
  readonly importe: number;
}

/** Comprueba la serie y la devuelve indexada por año. */
export function indexarSerie(serie: SerieIPC): ReadonlyMap<number, number> {
  const mapa = new Map<number, number>();
  for (const { anio, indice } of serie.puntos) {
    if (!Number.isInteger(anio)) {
      throw new RangeError(`Serie ${serie.id}: año no entero (${anio})`);
    }
    if (!Number.isFinite(indice) || indice <= 0) {
      throw new RangeError(`Serie ${serie.id}: índice no válido en ${anio} (${indice})`);
    }
    if (mapa.has(anio)) {
      throw new RangeError(`Serie ${serie.id}: año repetido (${anio})`);
    }
    mapa.set(anio, indice);
  }
  if (mapa.size === 0) {
    throw new RangeError(`Serie ${serie.id}: no tiene puntos`);
  }
  return mapa;
}

function indiceDe(mapa: ReadonlyMap<number, number>, anio: number, idSerie: string): number {
  const indice = mapa.get(anio);
  if (indice === undefined) {
    throw new RangeError(`La serie ${idSerie} no tiene dato para ${anio}`);
  }
  return indice;
}

/** Factor por el que se multiplica un importe de `anioOrigen` para expresarlo en euros de `anioBase`. */
export function factorEurosConstantes(
  serie: SerieIPC,
  anioOrigen: number,
  anioBase: number,
): number {
  const mapa = indexarSerie(serie);
  return indiceDe(mapa, anioBase, serie.id) / indiceDe(mapa, anioOrigen, serie.id);
}

/** Expresa un importe de `anioOrigen` en euros constantes de `anioBase`. */
export function aEurosConstantes(
  importe: number,
  anioOrigen: number,
  anioBase: number,
  serie: SerieIPC,
): number {
  if (!Number.isFinite(importe)) {
    throw new RangeError(`Importe no finito: ${importe}`);
  }
  return importe * factorEurosConstantes(serie, anioOrigen, anioBase);
}

/** Convierte una serie de importes anuales a euros constantes de `anioBase`. */
export function serieAEurosConstantes(
  importes: readonly ImporteAnual[],
  anioBase: number,
  serie: SerieIPC,
): ImporteAnual[] {
  const mapa = indexarSerie(serie);
  const base = indiceDe(mapa, anioBase, serie.id);
  return importes.map(({ anio, importe }) => {
    if (!Number.isFinite(importe)) {
      throw new RangeError(`Importe no finito en ${anio}: ${importe}`);
    }
    return { anio, importe: (importe * base) / indiceDe(mapa, anio, serie.id) };
  });
}

/** Reescala la serie para que el año base valga 100. */
export function rebasarSerie(serie: SerieIPC, anioBase: number): SerieIPC {
  const mapa = indexarSerie(serie);
  const base = indiceDe(mapa, anioBase, serie.id);
  return {
    ...serie,
    descripcion: `${serie.descripcion ?? serie.id} (base ${anioBase} = 100)`,
    puntos: serie.puntos.map(({ anio, indice }) => ({ anio, indice: (indice / base) * 100 })),
  };
}

/**
 * Adapta una serie anual de /data (esquema «Serie») a la interfaz del motor.
 * Rechaza series trimestrales: para deflactar importes anuales hace falta un índice anual.
 */
export function serieIPCDesdeDatos(serie: Serie): SerieIPC {
  return {
    id: serie.id,
    descripcion: serie.title,
    puntos: serie.points.map((punto) => {
      if (!/^\d{4}$/.test(punto.period)) {
        throw new RangeError(
          `La serie ${serie.id} no es anual (periodo ${punto.period}); usa un índice anual`,
        );
      }
      return { anio: Number(punto.period), indice: punto.value };
    }),
  };
}
