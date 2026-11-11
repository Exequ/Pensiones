/**
 * Estilo de la casa para Observable Plot. Los colores se pasan como
 * referencias a los tokens CSS (var(--…)), nunca como literales.
 */
import type { PlotOptions, ScaleOptions } from '@observablehq/plot';
import { formatearNumero } from '../engine/formato';

/** Referencia a un token de color para usarla en Plot: token('acento') → 'var(--color-acento)'. */
export function token(nombre: string): string {
  return `var(--color-${nombre})`;
}

/** Colores categóricos en el orden de uso recomendado. */
export const CATEGORICOS = [1, 2, 3, 4, 5].map((n) => token(`cat-${n}`));

/** Variantes con contraste de texto (≥ 4,5:1) para etiquetas directas. */
export const CATEGORICOS_TEXTO = [
  token('cat-granate'),
  token('cat-azul'),
  token('cat-ocre-texto'),
  token('cat-verde'),
  token('cat-gris-texto'),
];

/** Formato es-ES para los ticks de los ejes. */
export function formatoEje(valor: unknown): string {
  if (typeof valor === 'number') return formatearNumero(valor, { maxDecimales: 2 });
  if (valor instanceof Date) return valor.toISOString().slice(0, 10);
  return String(valor);
}

function conFormato(escala: ScaleOptions | undefined): ScaleOptions {
  return { tickFormat: formatoEje, ...escala };
}

/**
 * Aplica el estilo de la casa: fondo transparente, tipografía de interfaz,
 * cifras tabulares, ejes en tinta, sin rejilla salvo que se pida y formato es-ES.
 */
export function aplicarEstiloCasa(opciones: PlotOptions, ancho: number, alto: number): PlotOptions {
  return {
    marginTop: 24,
    marginRight: 24,
    marginBottom: 36,
    marginLeft: 48,
    ...opciones,
    width: ancho,
    height: alto,
    style: Object.assign(
      {
        background: 'transparent',
        color: token('tinta'),
        fontFamily: 'var(--fuente-interfaz)',
        fontSize: '13px',
        fontVariantNumeric: 'lining-nums tabular-nums',
        overflow: 'visible',
      },
      typeof opciones.style === 'object' ? opciones.style : {},
    ),
    x: conFormato(opciones.x),
    y: conFormato(opciones.y),
  };
}
