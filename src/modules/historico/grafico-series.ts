/**
 * Cálculos de maquetación de `GraficoSeries` (sin React): marcas del eje de años y tramo del eje
 * vertical con hueco para las etiquetas directas.
 */

/** Trazos distintos por serie (guiones SVG): la lectura no depende solo del color. */
export const TRAZOS = ['none', '7 3', '2 3', '9 3 2 3', '1 4'] as const;
/** Glifos de la etiqueta directa de cada línea, con el mismo trazo. */
export const GLIFOS_LINEA = ['━', '╍', '┅', '╌', '┈'] as const;

/** Años enteros para el eje, con un paso que no supere `maximoMarcas` marcas; incluye el último año. */
export function ticksAnuales(primero: number, ultimo: number, maximoMarcas: number): number[] {
  if (ultimo <= primero) return [primero];
  const paso = Math.max(1, Math.ceil((ultimo - primero) / Math.max(1, maximoMarcas - 1)));
  const marcas: number[] = [];
  for (let a = primero; a <= ultimo; a += paso) marcas.push(a);
  const ultimaMarca = marcas.at(-1) ?? primero;
  // El último año solo se añade si queda separado de la última marca (evita etiquetas pegadas).
  if (ultimaMarca !== ultimo && ultimo - ultimaMarca >= paso / 2) marcas.push(ultimo);
  return marcas;
}

/** Fracción del rango que se añade bajo el valor más bajo cuando es negativo. */
const MARGEN_INFERIOR = 0.04;

interface OpcionesTramo {
  readonly series: readonly (readonly number[])[];
  /** En barras apiladas el máximo es la suma de las series de cada posición. */
  readonly apilado: boolean;
  readonly incluirCero: boolean;
  /** Altura (px) que ocupan las etiquetas directas en la esquina superior. */
  readonly alturaReservadaPx: number;
  /** Altura aproximada (px) del área de trazado. */
  readonly alturaTotalPx: number;
}

/**
 * Dominio vertical [mínimo, máximo] que deja libre, por encima de los datos, el espacio de las
 * etiquetas directas, para que no se pisen con ninguna marca.
 */
export function tramoDelEje({
  series,
  apilado,
  incluirCero,
  alturaReservadaPx,
  alturaTotalPx,
}: OpcionesTramo): [number, number] {
  let maximo = Number.NEGATIVE_INFINITY;
  let minimo = Number.POSITIVE_INFINITY;
  if (apilado) {
    const longitud = Math.max(0, ...series.map((s) => s.length));
    for (let i = 0; i < longitud; i++) {
      const suma = series.reduce((acc, s) => acc + (s[i] ?? 0), 0);
      maximo = Math.max(maximo, suma);
      minimo = Math.min(minimo, suma, ...series.map((s) => s[i] ?? 0));
    }
  } else {
    for (const s of series) {
      for (const v of s) {
        maximo = Math.max(maximo, v);
        minimo = Math.min(minimo, v);
      }
    }
  }
  if (!Number.isFinite(maximo) || !Number.isFinite(minimo)) return [0, 1];
  if (incluirCero) {
    maximo = Math.max(maximo, 0);
    minimo = Math.min(minimo, 0);
  }
  const rango = maximo - minimo || Math.abs(maximo) || 1;
  // Con valores negativos, un pequeño margen inferior evita que la marca más baja toque el borde.
  if (minimo < 0) minimo -= rango * MARGEN_INFERIOR;
  const fraccion = Math.min(0.6, alturaReservadaPx / Math.max(alturaTotalPx, 1));
  return [minimo, maximo + (rango * fraccion) / (1 - fraccion)];
}
