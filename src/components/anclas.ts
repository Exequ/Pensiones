/**
 * Anclas internas compatibles con `HashRouter`. Un enlace «#id» normal cambiaría de ruta (el hash
 * es la ruta), así que el desplazamiento y el foco se mueven a mano y la dirección no cambia: ni la
 * ruta ni el query del hash (enlaces compartibles con `v=1`, `p=…`).
 */

/** Encabezado de destino de un apartado: el `<h2>` (o `<h3>`) con `id` y `tabIndex={-1}`. */
export interface EntradaIndice {
  /** `id` del encabezado de destino. */
  readonly destino: string;
  /** Texto del enlace: el mismo texto que pinta el encabezado. */
  readonly titulo: string;
  /** Resumen opcional de una línea. */
  readonly resumen?: string;
}

/** Distancia desde arriba (px) a partir de la cual un encabezado cuenta como «ya alcanzado». */
export const UMBRAL_VISIBLE = 160;

/**
 * Índice del último apartado cuyo encabezado ha pasado el umbral superior de la ventana, o `null`
 * si todavía no se ha llegado a ninguno. Función pura: recibe la posición de cada encabezado.
 */
export function apartadoVisible(
  posiciones: readonly (number | null)[],
  umbral = UMBRAL_VISIBLE,
): number | null {
  let activo: number | null = null;
  for (const [i, arriba] of posiciones.entries()) {
    if (arriba !== null && arriba <= umbral) activo = i;
  }
  return activo;
}

/** `true` si el usuario ha pedido reducir el movimiento. */
export function movimientoReducido(): boolean {
  if (typeof window.matchMedia !== 'function') return false;
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

/**
 * Desplaza la página hasta el elemento `id` y le pasa el foco, sin cambiar la dirección. Con
 * movimiento reducido, el desplazamiento es inmediato. Devuelve `false` si el elemento no existe.
 */
export function irAEncabezado(id: string): boolean {
  const destino = document.getElementById(id);
  if (!destino) return false;
  if (!destino.hasAttribute('tabindex')) destino.setAttribute('tabindex', '-1');
  // jsdom no implementa `scrollIntoView`.
  if (typeof destino.scrollIntoView === 'function') {
    destino.scrollIntoView({
      behavior: movimientoReducido() ? 'instant' : 'smooth',
      block: 'start',
    });
  }
  destino.focus({ preventScroll: true });
  return true;
}
