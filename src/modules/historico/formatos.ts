/**
 * Formato es-ES de las cifras que aparecen en los textos de las páginas históricas. Toda cifra sale
 * de los datos y pasa por `src/engine/formato.ts`; este módulo solo compone frases.
 */
import { formatearEuros, formatearNumero, formatearPorcentaje } from '../../engine/formato';
import type { PuntoAnual, Variacion } from '../../engine/series-historicas';
import { variacion } from '../../engine/series-historicas';

export const entero = (v: number): string => formatearNumero(v, { decimales: 0 });
export const decimal1 = (v: number): string => formatearNumero(v, { decimales: 1 });
export const decimal2 = (v: number): string => formatearNumero(v, { decimales: 2 });
export const euros = (v: number): string => formatearEuros(v);
export const millonesEuros = (v: number): string => `${entero(v)} millones de euros`;
/** Puntos de porcentaje (10,8 → «10,8 %»). */
export const puntosAPorcentaje = (v: number, decimales = 1): string =>
  formatearPorcentaje(v / 100, { decimales });
/** Fracción con signo y un decimal (0,25 → «+25,0 %»). */
export const variacionRelativa = (fraccion: number): string =>
  formatearPorcentaje(fraccion, { decimales: 1, conSigno: true });

/** Rótulos de las clases de pensión y de «todas las clases». */
export const ETIQUETA_CLASE: Readonly<Record<string, string>> = {
  jubilacion: 'Jubilación',
  viudedad: 'Viudedad',
  incapacidad: 'Incapacidad permanente',
  orfandad: 'Orfandad',
  'favor-familiares': 'En favor de familiares',
  total: 'Todas las clases',
};

/** «0-4» → «0 a 4»; «85-y-más» → «85 y más». */
export function etiquetaEdad(grupo: string): string {
  if (grupo === 'total') return 'Total';
  if (grupo === 'no-consta') return 'No consta';
  return grupo.replace('-y-', ' y ').replace('-', ' a ');
}

/** «Entre 16 y 19 años» → «16 a 19»; «Mas de 64 años» → «65 o más» sin escribir la cifra: se deja el literal. */
export function etiquetaTramoAfiliados(tramo: string): string {
  if (tramo === 'total') return 'Total';
  return tramo
    .replace(/^Entre (\d+) y (\d+) años$/, '$1 a $2')
    .replace(/^Mas de/, 'Más de')
    .replace(/ años$/, '');
}

/** Variación entre dos años como texto: «de X en 2008 a Y en 2025». */
export function deAHasta(puntos: readonly PuntoAnual[], formato: (v: number) => string): string {
  const v: Variacion = variacion(puntos);
  return `de ${formato(v.valorDesde)} en ${v.desde} a ${formato(v.valorHasta)} en ${v.hasta}`;
}

export const SEXOS = [
  { clave: 'hombres', etiqueta: 'Hombres' },
  { clave: 'mujeres', etiqueta: 'Mujeres' },
] as const;

/** «2026-10» → «octubre de 2026». */
export function mesEnTexto(mes: string): string {
  const m = /^(\d{4})-(\d{2})$/.exec(mes);
  if (!m?.[1] || !m[2]) throw new RangeError(`Mes no válido: ${mes}`);
  return new Intl.DateTimeFormat('es-ES', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)));
}
