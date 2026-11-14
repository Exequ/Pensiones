/**
 * Conversión de euros corrientes a euros constantes de un año base.
 *
 * importe_constante = importe_corriente × IPC(año base) / IPC(año del importe)
 *
 * Se trabaja con índices anuales (media anual del IPC, por ejemplo). La serie
 * real llegará en la Fase 1 desde /data; aquí solo se define la interfaz.
 */
import type { ArchivoDatos, Serie } from './esquema-datos.ts';

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

/**
 * Adapta un fichero de /data con un dato por año (p. ej.
 * data/parametros/ipc-indice-medio-anual.json) a la interfaz del motor.
 * Rechaza periodos no anuales y valores no numéricos.
 */
export function serieIPCDesdeArchivo(archivo: ArchivoDatos): SerieIPC {
  const datos = archivo.data ?? [];
  return {
    id: archivo.id,
    descripcion: archivo.title,
    puntos: datos.map((dato) => {
      if (!/^\d{4}$/.test(dato.period)) {
        throw new RangeError(`${archivo.id}: periodo no anual (${dato.period})`);
      }
      if (typeof dato.value !== 'number') {
        throw new RangeError(`${archivo.id}: valor no numérico en ${dato.period}`);
      }
      return { anio: Number(dato.period), indice: dato.value };
    }),
  };
}

/**
 * Serie anual del IPC de diciembre a partir de un fichero de /data con un dato por mes (p. ej.
 * data/parametros/ipc-indice-mensual.json, con identificadores «AAAA-MM» y el año en `period`).
 * Se queda con el mes de diciembre de cada año. Sirve para deflactar importes que son un valor
 * a 1 de diciembre (como la pensión media en vigor) con el precio del mismo mes. Rechaza valores
 * no numéricos y años con dos datos de diciembre.
 */
export function serieIPCDiciembreDesdeArchivo(archivo: ArchivoDatos): SerieIPC {
  const puntos: PuntoIndice[] = [];
  for (const dato of archivo.data ?? []) {
    const m = /^(\d{4})-12$/.exec(dato.id);
    if (m?.[1] === undefined) continue;
    if (typeof dato.value !== 'number') {
      throw new RangeError(`${archivo.id}: valor no numérico en ${dato.id}`);
    }
    const anio = Number(m[1]);
    if (puntos.some((p) => p.anio === anio)) {
      throw new RangeError(`${archivo.id}: dos datos de diciembre en ${anio}`);
    }
    puntos.push({ anio, indice: dato.value });
  }
  if (puntos.length === 0) {
    throw new RangeError(`${archivo.id}: no hay datos de diciembre`);
  }
  return {
    id: `${archivo.id}-diciembre`,
    descripcion: `${archivo.title} (solo diciembre)`,
    puntos: puntos.sort((a, b) => a.anio - b.anio),
  };
}

export interface DiferenciaEntreIndices {
  readonly anio: number;
  /** (índice de `a` ÷ índice de `b`) − 1 en ese año. */
  readonly relativa: number;
}

/**
 * Año de mayor diferencia relativa (en valor absoluto) entre dos índices anuales, entre los años
 * comunes que cumplen `desde` y `hasta`. Describe cuánto separa elegir un deflactor u otro; no
 * supone que la diferencia dependa del nivel de la inflación. `null` si no hay años comunes.
 */
export function mayorDiferenciaEntreIndices(
  a: SerieIPC,
  b: SerieIPC,
  desde = Number.NEGATIVE_INFINITY,
  hasta = Number.POSITIVE_INFINITY,
): DiferenciaEntreIndices | null {
  const mapaA = indexarSerie(a);
  const mapaB = indexarSerie(b);
  let mejor: DiferenciaEntreIndices | null = null;
  for (const [anio, indiceA] of mapaA) {
    const indiceB = mapaB.get(anio);
    if (indiceB === undefined || anio < desde || anio > hasta) continue;
    const relativa = indiceA / indiceB - 1;
    if (mejor === null || Math.abs(relativa) > Math.abs(mejor.relativa)) mejor = { anio, relativa };
  }
  return mejor;
}
