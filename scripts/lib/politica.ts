/**
 * Términos de partidos, programas electorales, peticiones de voto y propuestas políticas que no
 * pueden aparecer en las cajas «Interpretación» (fase RI, `docs/INTERPRETACIONES.md`). Único módulo y
 * ampliable, como `valoraciones.ts`. Sin tildes, en minúsculas; cada entrada se busca como palabra o
 * expresión completa sobre el texto normalizado.
 */

/** Siglas y nombres de partidos y coaliciones con representación reciente en España. */
export const PARTIDOS = [
  'psoe',
  'partido popular',
  'partido socialista',
  'vox',
  'unidas podemos',
  'unidos podemos',
  'izquierda unida',
  'erc',
  'esquerra republicana',
  'junts',
  'pnv',
  'eaj-pnv',
  'bildu',
  'eh bildu',
  'bng',
  'coalicion canaria',
  'upn',
  'cup',
  'teruel existe',
  'se acabo la fiesta',
] as const;

/**
 * Nombres de partidos que también son palabras corrientes («sumar», «podemos», «ciudadanos»): se
 * marcan solo escritos con mayúscula fuera del inicio de una frase.
 */
export const PARTIDOS_AMBIGUOS = [
  'Sumar',
  'Podemos',
  'Ciudadanos',
  'Compromís',
  'Más País',
] as const;

/** Siglas que solo cuentan escritas en mayúsculas («PP»; «pp.» es la abreviatura de páginas). */
export const SIGLAS_EN_MAYUSCULAS = ['PP'] as const;

/** Programas, campañas, voto y propuestas políticas. */
export const TERMINOS_ELECTORALES = [
  'programa electoral',
  'programas electorales',
  'campana electoral',
  'elecciones',
  'electoral',
  'electorales',
  'votar',
  'vota',
  'votad',
  'votemos',
  'voto',
  'votos',
  'votante',
  'votantes',
  'partido politico',
  'partidos politicos',
  'el gobierno deberia',
  'el gobierno debe',
  'proponemos',
  'propuesta politica',
  'propuestas politicas',
  'nuestra propuesta',
  'hay que reformar',
  'habria que reformar',
  'se deberia reformar',
  'se debe reformar',
  'izquierda politica',
  'derecha politica',
] as const;

export const TERMINOS_POLITICOS = [...PARTIDOS, ...TERMINOS_ELECTORALES] as const;

/** Todos los términos de la lista (para contarlos y documentarlos). */
export const LISTA_POLITICA = [
  ...TERMINOS_POLITICOS,
  ...SIGLAS_EN_MAYUSCULAS,
  ...PARTIDOS_AMBIGUOS,
] as const;

const normalizar = (t: string): string =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

const escapar = (s: string): string => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Términos políticos presentes en un texto (palabra o expresión completa). */
export function politicaEn(texto: string): string[] {
  const t = normalizar(texto);
  const claros = TERMINOS_POLITICOS.filter((p) =>
    new RegExp(`(^|[^a-z0-9-])${escapar(p)}($|[^a-z0-9-])`).test(t),
  );
  const ambiguos = PARTIDOS_AMBIGUOS.filter((p) =>
    new RegExp(`(?<!^\\s*|[.!?¿¡:«"(]\\s*)(?<![\\p{L}])${escapar(p)}(?![\\p{L}])`, 'u').test(texto),
  );
  const siglas = SIGLAS_EN_MAYUSCULAS.filter((p) =>
    new RegExp(`(?<![\\p{L}])${p}(?![\\p{L}.])`, 'u').test(texto),
  );
  return [...claros, ...siglas.map((p) => normalizar(p)), ...ambiguos.map((p) => normalizar(p))];
}
