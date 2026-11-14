/**
 * Palabras de valoración que no deben aparecer en los textos de las páginas «Hucha» y «Financiación y
 * déficit» (regla c de CLAUDE.md, neutralidad). Lista ampliable; se usa en los tests de neutralidad.
 */

/** Raíces de las palabras de valoración, sin tildes y en minúsculas. */
export const PALABRAS_DE_VALORACION = [
  'insostenible',
  'agujero',
  'quiebra',
  'bancarrota',
  'rescate',
  'rescatar',
  'no sirve',
  'pozo',
  'despilfarro',
  'derroche',
  'saqueo',
  'expolio',
  'robo',
  'estafa',
  'fraude',
  'desastre',
  'catastrof',
  'colapso',
  'hundimiento',
  'ruina',
  'escandalo',
  'vergonzos',
  'inaceptable',
  'irresponsable',
  'alarmante',
  'preocupante',
  'espectacular',
  'brutal',
  'bomba',
  'pelotazo',
  'chiringuito',
  'parche',
  'insuficiente',
  'excesiv',
  'escasez',
  'privilegi',
] as const;

const normalizar = (t: string): string =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Palabras de valoración presentes en un texto (coincidencia al inicio de palabra). */
export function valoracionesEn(texto: string): string[] {
  // «Protocolo de Déficit Excesivo» es el nombre de un procedimiento, no una valoración.
  const t = normalizar(texto).replaceAll('deficit excesivo', '');
  return PALABRAS_DE_VALORACION.filter((p) => new RegExp(`(^|[^a-z])${p}`).test(t));
}
