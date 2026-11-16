/**
 * Validadores y límites del enlace compartible de «Tu pensión» (Fases 3-B2 a 3-C2). Lógica pura.
 * Devuelven el valor leído o `undefined`; el aviso al usuario lo pone quien llama.
 */
import { leerEntero, leerNumero } from './lectura.ts';

/**
 * Límites de sensatez para aceptar valores de un enlace. No son reglas de la norma (eso es del
 * motor): solo descartan valores absurdos o maliciosos antes de ponerlos en el formulario.
 */
export const LIMITES_ENLACE = {
  anioMinimo: 1900,
  anioMaximo: 2100,
  hijosMaximo: 30,
  mesesMaximo: 1200,
  importeMaximo: 1_000_000,
  ipcMinimo: -20,
  ipcMaximo: 50,
  /** Tramos que admite el enlace; con más, la web avisa y el enlace los omite. */
  tramosMaximo: 100,
  /** Longitud máxima de la parte de búsqueda que se lee (protege de enlaces enormes). */
  longitudMaxima: 12_000,
} as const;

export const dos = (n: number): string => String(n).padStart(2, '0');

// --- Validadores de un campo (devuelven el texto canónico o `undefined`) ---------------------------

export function anioValido(texto: string): number | undefined {
  if (!/^\d{4}$/.test(texto)) return undefined;
  const n = Number(texto);
  return n >= LIMITES_ENLACE.anioMinimo && n <= LIMITES_ENLACE.anioMaximo ? n : undefined;
}

export function mesValido(texto: string): number | undefined {
  if (!/^\d{1,2}$/.test(texto)) return undefined;
  const n = Number(texto);
  return n >= 1 && n <= 12 ? n : undefined;
}

/** Texto numérico escrito por una persona, con solo cifras, puntos y comas (y signo opcional). */
export function numeroValido(texto: string, minimo: number, maximo: number): number | undefined {
  if (!/^[-+]?[0-9.,]+$/.test(texto)) return undefined;
  const n = leerNumero(texto);
  return n !== undefined && n >= minimo && n <= maximo ? n : undefined;
}

export function enteroValido(texto: string, maximo: number): number | undefined {
  if (!/^\d+$/.test(texto)) return undefined;
  const n = leerEntero(texto);
  return n !== undefined && n >= 0 && n <= maximo ? n : undefined;
}

/** `AAAA-MM` → mes y año como los guardan los selectores (mes sin ceros a la izquierda). */
export function fechaValida(texto: string): { mes: string; anio: string } | undefined {
  const m = /^(\d{4})-(\d{1,2})$/.exec(texto);
  if (!m?.[1] || !m[2]) return undefined;
  const anio = anioValido(m[1]);
  const mes = mesValido(m[2]);
  return anio === undefined || mes === undefined ? undefined : { mes: String(mes), anio: m[1] };
}

export const importeValido = (texto: string): number | undefined =>
  numeroValido(texto, Number.MIN_VALUE, LIMITES_ENLACE.importeMaximo);

export const fechaATexto = (mes: string, anio: string): string | undefined => {
  const m = mesValido(mes.trim());
  return m !== undefined && anioValido(anio.trim()) !== undefined
    ? `${anio.trim()}-${dos(m)}`
    : undefined;
};
