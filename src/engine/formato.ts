/**
 * Formateo de cifras en español de España (es-ES).
 *
 * Por defecto se agrupan los miles también en números de cuatro cifras
 * (1.680 €), que es lo que pide la maquetación de tablas. La norma CLDR
 * para es-ES no los agrupa; quien quiera ese comportamiento en texto
 * corrido puede pasar `agruparCuatroCifras: false`.
 *
 * Entre la cifra y el símbolo (€, %) se usa un espacio de no separación,
 * como hace Intl, para que nunca se partan en dos líneas.
 */

const LOCALE = 'es-ES';

/** Espacio de no separación (U+00A0). */
const NBSP = '\u00a0';

export interface OpcionesNumero {
  /** Número fijo de decimales. Si se omite, entre 0 y `maxDecimales`. */
  decimales?: number;
  /** Máximo de decimales cuando no se fija `decimales` (por defecto 2). */
  maxDecimales?: number;
  /** Agrupar miles en números de cuatro cifras (por defecto, sí). */
  agruparCuatroCifras?: boolean;
  /** Mostrar el signo también en positivos (útil para variaciones). */
  conSigno?: boolean;
}

function opcionesIntl(opciones: OpcionesNumero, maxPorDefecto: number): Intl.NumberFormatOptions {
  const {
    decimales,
    maxDecimales = maxPorDefecto,
    agruparCuatroCifras = true,
    conSigno,
  } = opciones;
  return {
    minimumFractionDigits: decimales ?? 0,
    maximumFractionDigits: decimales ?? maxDecimales,
    useGrouping: agruparCuatroCifras ? 'always' : 'min2',
    signDisplay: conSigno ? 'exceptZero' : 'auto',
  };
}

function comprobarFinito(valor: number): void {
  if (!Number.isFinite(valor)) {
    throw new RangeError(`No se puede formatear un valor no finito: ${valor}`);
  }
}

/** Número con separador de miles (punto) y coma decimal: 1.234.567,89 */
export function formatearNumero(valor: number, opciones: OpcionesNumero = {}): string {
  comprobarFinito(valor);
  return new Intl.NumberFormat(LOCALE, opcionesIntl(opciones, 2)).format(valor);
}

/** Importe en euros: 1.680 € (sin decimales por defecto). */
export function formatearEuros(valor: number, opciones: OpcionesNumero = {}): string {
  comprobarFinito(valor);
  return new Intl.NumberFormat(LOCALE, {
    ...opcionesIntl({ decimales: 0, ...opciones }, 0),
    style: 'currency',
    currency: 'EUR',
  }).format(valor);
}

/**
 * Porcentaje a partir de una fracción: 0,125 → «12,5 %».
 * Por defecto, un decimal como máximo.
 */
export function formatearPorcentaje(fraccion: number, opciones: OpcionesNumero = {}): string {
  comprobarFinito(fraccion);
  return new Intl.NumberFormat(LOCALE, {
    ...opcionesIntl(opciones, 1),
    style: 'percent',
  }).format(fraccion);
}

/** Diferencia en puntos porcentuales: 1,2 → «1,2 p. p.». */
export function formatearPuntosPorcentuales(puntos: number, opciones: OpcionesNumero = {}): string {
  return `${formatearNumero(puntos, { maxDecimales: 1, ...opciones })}${NBSP}p.${NBSP}p.`;
}

/** Fecha ISO (AAAA-MM-DD o fecha y hora) → «AAAA-MM-DD», como pide la línea de fuente. */
export function formatearFechaIso(fecha: string): string {
  const coincidencia = /^(\d{4}-\d{2}-\d{2})/.exec(fecha);
  if (!coincidencia?.[1] || Number.isNaN(Date.parse(fecha))) {
    throw new RangeError(`Fecha ISO no válida: ${fecha}`);
  }
  return coincidencia[1];
}

/** Periodo «2024» → «2024»; «2024-T1» → «1.er trimestre de 2024». */
export function formatearPeriodo(periodo: string): string {
  const coincidencia = /^(\d{4})(?:-T([1-4]))?$/.exec(periodo);
  if (!coincidencia?.[1]) {
    throw new RangeError(`Periodo no válido: ${periodo}`);
  }
  const trimestre = coincidencia[2];
  if (!trimestre) return coincidencia[1];
  const ordinales: Record<string, string> = { '1': '1.er', '2': '2.º', '3': '3.er', '4': '4.º' };
  return `${ordinales[trimestre] ?? trimestre} trimestre de ${coincidencia[1]}`;
}
