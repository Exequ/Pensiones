/**
 * Utilidades puras de la página «Tipos de pensión» (Fase 5-C): etiquetas de las cuantías mínimas a
 * partir de la cita literal del Anexo I y paso de importes anuales a importes por paga. Sin React.
 */

import { formatearNumero } from '../../engine/formato';

/**
 * Rótulo de una fila del cuadro de cuantías mínimas, tomado de la cita literal del dato: los
 * segmentos de texto de la fila, sin los importes. Ejemplos de cita:
 * «Titular con sesenta y cinco años. | 17.592,40 | 13.106,80 | 12.441,80 |» → «Titular con
 * sesenta y cinco años.»; «Orfandad | | Por persona beneficiaria. | 4.011,00 |» → «Orfandad ·
 * Por persona beneficiaria.».
 */
export function etiquetaDeCuantia(cita: string): string {
  const segmentos = cita
    .split('|')
    .map((s) => s.trim())
    // Un segmento que solo trae un importe (con o sin puntos de millar y coma decimal) se descarta.
    .filter((s) => s !== '' && !/^[\d.,\s]+$/.test(s))
    // Una elisión final («… 9.126,60») no forma parte del rótulo.
    .map((s) => s.replace(/\s*…\s*[\d.,]*$/, '').trim())
    .filter((s) => s !== '');
  return segmentos.join(' · ');
}

/**
 * Situación familiar de una cuantía mínima según su nota («Cuantía mínima anual (con cónyuge a
 * cargo).»). Admite un nivel de paréntesis anidado. Devuelve `null` si la nota no sigue ese patrón.
 */
export function situacionDeCuantia(notas: string | undefined): string | null {
  if (notas === undefined) return null;
  const m = /^Cuantía mínima anual \(((?:[^()]|\([^()]*\))*)\)/.exec(notas);
  const texto = m?.[1]?.trim();
  if (!texto) return null;
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

/**
 * Pagas anuales de las pensiones contributivas. Es la convención que declara el dato de la pensión
 * máxima («Importe mensual (14 pagas)», `parametros/pension-maxima`); en las no contributivas el
 * número de pagas se lee de `pnc-reglas#pagas-anuales`.
 */
export const PAGAS_CONTRIBUTIVAS = 14;

/** Importe de cada paga si el importe anual se abona en catorce pagas (cálculo derivado). */
export function importePorPaga(anual: number, pagas = PAGAS_CONTRIBUTIVAS): number {
  if (!Number.isFinite(anual) || anual < 0)
    throw new RangeError(`Importe anual no válido: ${anual}`);
  if (!Number.isInteger(pagas) || pagas <= 0)
    throw new RangeError(`Número de pagas no válido: ${pagas}`);
  return anual / pagas;
}

/** Porcentaje de un importe (p. ej., el 25 % de la cuantía íntegra): `importe × porcentaje / 100`. */
export function porcentajeDeImporte(importe: number, porcentaje: number): number {
  return (importe * porcentaje) / 100;
}

/**
 * Fecha de un dato en texto: «2025-12» → «diciembre de 2025»; «2025» → «1 de diciembre de 2025» si
 * `aFinDeAnio` (las pensiones en vigor se cuentan a 1 de diciembre) y «2025» si no.
 */
export function fechaEnTexto(periodo: string, aFinDeAnio: boolean): string {
  const m = /^(\d{4})-(\d{2})$/.exec(periodo);
  if (m?.[1] && m[2]) {
    const mes = new Intl.DateTimeFormat('es-ES', { month: 'long', timeZone: 'UTC' }).format(
      new Date(Date.UTC(Number(m[1]), Number(m[2]) - 1, 1)),
    );
    return `${mes} de ${m[1]}`;
  }
  return aFinDeAnio ? `${formatearNumero(1)} de diciembre de ${periodo}` : periodo;
}
