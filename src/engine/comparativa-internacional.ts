/**
 * Utilidades de la comparativa internacional (Fase 5-C). Lógica pura, sin React ni DOM.
 *
 * Cada función es un cálculo pequeño y reproducible a partir de los ficheros de /data: ordenar
 * países por una medida, seleccionar un conjunto de países, diferencias respecto a un país de
 * referencia (España) y colocar etiquetas directas de líneas sin que se solapen. Ninguna emite un
 * juicio: ordenar no es valorar, y las diferencias son aritmética sobre las cifras publicadas.
 */

/** Medida de un país (o de un agregado como la media de la OCDE) en un año. `null`: sin dato. */
export interface ValorPais {
  /** Código de área de la fuente (ISO 3 o agregado: `OECD_REP`, `EU27`). */
  readonly pais: string;
  readonly valor: number | null;
}

/** Punto de una serie anual de un país. */
export interface PuntoPais {
  readonly anio: number;
  readonly valor: number;
}

/**
 * Ordena por valor, de mayor a menor (o de menor a mayor). Los países sin dato van al final, en
 * orden de código. El empate se rompe por código de país, de modo que el orden es determinista.
 */
export function ordenarPorValor<T extends ValorPais>(
  valores: readonly T[],
  sentido: 'descendente' | 'ascendente' = 'descendente',
): T[] {
  const signo = sentido === 'descendente' ? -1 : 1;
  return [...valores].sort((a, b) => {
    if (a.valor === null && b.valor === null) return a.pais.localeCompare(b.pais);
    if (a.valor === null) return 1;
    if (b.valor === null) return -1;
    return signo * (a.valor - b.valor) || a.pais.localeCompare(b.pais);
  });
}

/** Elementos de los países elegidos, conservando el orden de entrada. */
export function seleccionarPaises<T extends { readonly pais: string }>(
  elementos: readonly T[],
  seleccion: ReadonlySet<string> | readonly string[],
): T[] {
  const elegidos = seleccion instanceof Set ? seleccion : new Set<string>(seleccion);
  return elementos.filter((e) => elegidos.has(e.pais));
}

/** Diferencia de cada país con el país de referencia en la misma medida. */
export interface DiferenciaConReferencia {
  readonly pais: string;
  readonly valor: number | null;
  /** `valor − valor de la referencia`; `null` si falta alguno de los dos. */
  readonly diferencia: number | null;
}

/**
 * Diferencia de cada país respecto a `referencia` (por defecto, España): valor − valor de España.
 * Positiva: el país tiene un valor mayor que la referencia; negativa, menor. La propia referencia
 * tiene diferencia cero. Si la referencia no tiene dato, todas las diferencias son `null`.
 */
export function diferenciasRespectoA(
  valores: readonly ValorPais[],
  referencia = 'ESP',
): DiferenciaConReferencia[] {
  const base = valores.find((v) => v.pais === referencia)?.valor ?? null;
  return valores.map((v) => ({
    pais: v.pais,
    valor: v.valor,
    diferencia: base === null || v.valor === null ? null : v.valor - base,
  }));
}

/** Valor de un país en un año, o `null` si la serie no lo tiene. */
export function valorEnAnio(puntos: readonly PuntoPais[], anio: number): number | null {
  return puntos.find((p) => p.anio === anio)?.valor ?? null;
}

/** Último punto de una serie, o `undefined` si está vacía. */
export function ultimoPunto(puntos: readonly PuntoPais[]): PuntoPais | undefined {
  return puntos.reduce<PuntoPais | undefined>(
    (u, p) => (u === undefined || p.anio > u.anio ? p : u),
    undefined,
  );
}

/**
 * Posiciones verticales (en píxeles, de arriba abajo) de etiquetas que deben quedar separadas al
 * menos `separacion` píxeles y dentro de [`minimo`, `maximo`], lo más cerca posible de la posición
 * ideal. Se devuelven en el mismo orden de entrada. Si no caben todas, se reparten con la
 * separación máxima posible dentro del intervalo.
 *
 * Algoritmo: se ordenan por posición ideal; una pasada hacia abajo separa las etiquetas y, si la
 * última se sale del intervalo, una pasada hacia arriba la devuelve.
 */
export function separarEtiquetas(
  ideales: readonly number[],
  separacion: number,
  minimo: number,
  maximo: number,
): number[] {
  const n = ideales.length;
  if (n === 0) return [];
  const orden = ideales.map((_, i) => i).sort((a, b) => (ideales[a] ?? 0) - (ideales[b] ?? 0));
  // Si no caben con la separación pedida, se reparten con la separación posible.
  const paso = n > 1 ? Math.min(separacion, (maximo - minimo) / (n - 1)) : 0;
  const colocadas = orden.map((i) => Math.min(Math.max(ideales[i] ?? 0, minimo), maximo));
  for (let k = 1; k < n; k++) {
    colocadas[k] = Math.max(colocadas[k] ?? 0, (colocadas[k - 1] ?? 0) + paso);
  }
  const ultima = colocadas[n - 1] ?? 0;
  if (ultima > maximo) {
    colocadas[n - 1] = maximo;
    for (let k = n - 2; k >= 0; k--) {
      colocadas[k] = Math.min(colocadas[k] ?? 0, (colocadas[k + 1] ?? 0) - paso);
    }
  }
  const salida = new Array<number>(n).fill(0);
  orden.forEach((i, k) => {
    salida[i] = colocadas[k] ?? 0;
  });
  return salida;
}
