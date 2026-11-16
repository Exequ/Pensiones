/**
 * Empalme de series anuales de fuentes distintas con ruptura de serie (Fase 5-A3).
 *
 * Lógica pura, sin React ni DOM. Cuando dos documentos publican la misma partida con rótulos y
 * criterios que no se han podido contrastar entre sí (p. ej., la liquidación del ejercicio de 2010 a
 * 2016 y la ejecución acumulada a diciembre desde 2017), las series NO se unen en una sola línea
 * sin más: cada tramo conserva su etiqueta y el empalme indica en qué años cambia la fuente. Estas
 * funciones construyen la serie conjunta que necesitan los cálculos (acumulados, cocientes) sin
 * perder el tramo de cada año, y la vuelven a partir en tramos para dibujarla y tabularla.
 */
import type { PuntoAnual } from './series-historicas.ts';

/** Tramo de una serie: un documento de origen, con su etiqueta, y los años que cubre. */
export interface TramoSerie {
  /** Clave estable (columna de la tabla de datos). */
  readonly clave: string;
  /** Etiqueta directa del gráfico y cabecera de la tabla. */
  readonly etiqueta: string;
  readonly puntos: readonly PuntoAnual[];
}

export interface SerieEmpalmada {
  /** Todos los puntos, ordenados por año. */
  readonly puntos: readonly PuntoAnual[];
  /** Clave del tramo de cada año. */
  readonly tramoDelAnio: ReadonlyMap<number, string>;
  /** Primer año de cada tramo posterior al primero: el año desde el que cambia la fuente. */
  readonly rupturas: readonly number[];
  readonly tramos: readonly TramoSerie[];
}

/**
 * Une tramos de años disjuntos. Los tramos se ordenan por su primer año. Falla si dos tramos
 * comparten un año (habría dos cifras para el mismo año y habría que elegir) o si un tramo está
 * vacío o repite un año.
 */
export function empalmarConRuptura(tramos: readonly TramoSerie[]): SerieEmpalmada {
  const ordenados = [...tramos].sort(
    (a, b) => (a.puntos[0]?.anio ?? Infinity) - (b.puntos[0]?.anio ?? Infinity),
  );
  const tramoDelAnio = new Map<number, string>();
  const puntos: PuntoAnual[] = [];
  const rupturas: number[] = [];
  ordenados.forEach((tramo, i) => {
    const primero = [...tramo.puntos].sort((a, b) => a.anio - b.anio)[0];
    if (!primero) throw new RangeError(`El tramo «${tramo.clave}» no tiene puntos`);
    if (i > 0) rupturas.push(primero.anio);
    for (const p of tramo.puntos) {
      const previo = tramoDelAnio.get(p.anio);
      if (previo !== undefined) {
        throw new RangeError(
          `El año ${p.anio} figura en dos tramos («${previo}» y «${tramo.clave}»): no se empalma`,
        );
      }
      tramoDelAnio.set(p.anio, tramo.clave);
      puntos.push(p);
    }
  });
  puntos.sort((a, b) => a.anio - b.anio);
  return { puntos, tramoDelAnio, rupturas, tramos: ordenados };
}

/** Parte unos puntos (p. ej., el resultado de un cálculo sobre la serie empalmada) en los tramos de origen. */
export function partirPorTramos(
  puntos: readonly PuntoAnual[],
  empalme: Pick<SerieEmpalmada, 'tramoDelAnio' | 'tramos'>,
): ReadonlyMap<string, PuntoAnual[]> {
  const salida = new Map<string, PuntoAnual[]>(empalme.tramos.map((t) => [t.clave, []]));
  for (const p of puntos) {
    const clave = empalme.tramoDelAnio.get(p.anio);
    if (clave === undefined) continue;
    salida.get(clave)?.push(p);
  }
  return salida;
}

/** Años que faltan entre el primero y el último de una serie (huecos de continuidad), en orden. */
export function aniosFaltantes(puntos: readonly PuntoAnual[]): number[] {
  if (puntos.length === 0) return [];
  const anios = new Set(puntos.map((p) => p.anio));
  const desde = Math.min(...anios);
  const hasta = Math.max(...anios);
  const faltan: number[] = [];
  for (let a = desde; a <= hasta; a++) if (!anios.has(a)) faltan.push(a);
  return faltan;
}
