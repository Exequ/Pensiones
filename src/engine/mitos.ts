/**
 * Cálculos derivados de la página «Mitos y realidades» (fase `feat/fase-mitos`).
 *
 * Lógica pura, sin React ni DOM. Cada función es pequeña y reproducible desde los ficheros de
 * /data: la página no calcula nada por su cuenta. Ninguna función emite un veredicto; devuelven
 * magnitudes (medias, diferencias, años sin dato) con las que la interfaz contrasta cada
 * afirmación con su definición.
 */
import { diferencia, type PuntoAnual } from './series-historicas.ts';

/** Años del intervalo [desde, hasta] que la serie no tiene (p. ej., los huecos de la revalorización). */
export function aniosSinDato(
  puntos: readonly PuntoAnual[],
  desde: number,
  hasta: number,
): number[] {
  const presentes = new Set(puntos.map((p) => p.anio));
  const faltan: number[] = [];
  for (let anio = desde; anio <= hasta; anio++) {
    if (!presentes.has(anio)) faltan.push(anio);
  }
  return faltan;
}

/** Agrupa años consecutivos en tramos: [2011, 2012, 2015] → [[2011, 2012], [2015, 2015]]. */
export function tramosDeAnios(anios: readonly number[]): [number, number][] {
  const tramos: [number, number][] = [];
  for (const anio of [...anios].sort((a, b) => a - b)) {
    const ultimo = tramos.at(-1);
    if (ultimo !== undefined && ultimo[1] === anio - 1) ultimo[1] = anio;
    else tramos.push([anio, anio]);
  }
  return tramos;
}

/**
 * Media aritmética simple de los valores anuales de [desde, hasta]. Exige que estén todos los
 * años del intervalo: con huecos no se promedia (falla), para no presentar como media del periodo
 * la de un subconjunto.
 */
export function mediaPeriodo(puntos: readonly PuntoAnual[], desde: number, hasta: number): number {
  const faltan = aniosSinDato(puntos, desde, hasta);
  if (faltan.length > 0) {
    throw new RangeError(`Faltan años para la media de ${desde} a ${hasta}: ${faltan.join(', ')}`);
  }
  const valores = puntos.filter((p) => p.anio >= desde && p.anio <= hasta);
  return valores.reduce((s, p) => s + p.valor, 0) / valores.length;
}

/** Fila de la comparación año a año entre la revalorización y una medida del IPC. */
export interface FilaRevalorizacion {
  readonly anio: number;
  /** Porcentaje de revalorización aplicado (`null` si /data no lo tiene). */
  readonly revalorizacion: number | null;
  readonly ipcMedia: number | null;
  readonly ipcDiciembre: number | null;
  /** Revalorización − IPC medio anual, en puntos porcentuales, solo si están las dos cifras. */
  readonly diferenciaMedia: number | null;
  /** Revalorización − IPC de diciembre, en puntos porcentuales, solo si están las dos cifras. */
  readonly diferenciaDiciembre: number | null;
}

/**
 * Una fila por año del intervalo, con las cifras que haya. Las diferencias solo se calculan donde
 * existen las dos cifras; no se rellena ningún hueco ni se calcula ningún acumulado.
 */
export function filasRevalorizacion(
  revalorizacion: readonly PuntoAnual[],
  ipcMedia: readonly PuntoAnual[],
  ipcDiciembre: readonly PuntoAnual[],
  desde: number,
  hasta: number,
): FilaRevalorizacion[] {
  const valor = (s: readonly PuntoAnual[], a: number): number | null =>
    s.find((p) => p.anio === a)?.valor ?? null;
  const filas: FilaRevalorizacion[] = [];
  for (let anio = desde; anio <= hasta; anio++) {
    const r = valor(revalorizacion, anio);
    const m = valor(ipcMedia, anio);
    const d = valor(ipcDiciembre, anio);
    filas.push({
      anio,
      revalorizacion: r,
      ipcMedia: m,
      ipcDiciembre: d,
      diferenciaMedia: r !== null && m !== null ? r - m : null,
      diferenciaDiciembre: r !== null && d !== null ? r - d : null,
    });
  }
  return filas;
}

/** Proporción (fracción) de cada año: `parte ÷ total`, solo en los años comunes. */
export function proporcion(
  parte: readonly PuntoAnual[],
  total: readonly PuntoAnual[],
): PuntoAnual[] {
  const deTotal = new Map(total.map((p) => [p.anio, p.valor]));
  const salida: PuntoAnual[] = [];
  for (const p of parte) {
    const t = deTotal.get(p.anio);
    if (t === undefined) continue;
    if (t === 0) throw new RangeError(`Total nulo en ${p.anio}`);
    salida.push({ anio: p.anio, valor: p.valor / t });
  }
  return salida;
}

/** Diferencias por pares entre varias medidas de un mismo concepto (p. ej., las tres del saldo). */
export interface DiferenciaEntreMedidas {
  readonly etiqueta: string;
  readonly puntos: readonly PuntoAnual[];
}

export function diferenciasEntreMedidas(
  medidas: readonly { readonly etiqueta: string; readonly puntos: readonly PuntoAnual[] }[],
): DiferenciaEntreMedidas[] {
  const salida: DiferenciaEntreMedidas[] = [];
  for (let i = 0; i < medidas.length; i++) {
    for (let j = i + 1; j < medidas.length; j++) {
      const a = medidas[i];
      const b = medidas[j];
      if (a === undefined || b === undefined) continue;
      salida.push({
        etiqueta: `${a.etiqueta} − ${b.etiqueta}`,
        puntos: diferencia(a.puntos, b.puntos),
      });
    }
  }
  return salida;
}

/** Meses → años (con decimales), para mostrar edades legales en un eje de años. */
export function mesesAAnios(puntos: readonly PuntoAnual[]): PuntoAnual[] {
  return puntos.map((p) => ({ anio: p.anio, valor: p.valor / 12 }));
}

/** Razón (fracción) → porcentaje, para comparar cocientes empíricos con tasas de la OCDE. */
export function razonAPorcentaje(puntos: readonly PuntoAnual[]): PuntoAnual[] {
  return puntos.map((p) => ({ anio: p.anio, valor: p.valor * 100 }));
}

/** Valor del año con extremo (máximo por valor absoluto del mínimo, útil para «el menor saldo»). */
export function minimoPorValor(puntos: readonly PuntoAnual[]): PuntoAnual {
  const primero = puntos[0];
  if (primero === undefined) throw new RangeError('La serie no tiene puntos');
  return puntos.reduce((m, p) => (p.valor < m.valor ? p : m), primero);
}
