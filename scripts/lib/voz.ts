/**
 * Voz de la web (fase R1, `docs/GUIA_DE_VOZ.md`): expresiones de «lenguaje de proyecto interno» que no
 * deben aparecer en ningún texto visible fuera de la zona permitida. Un único módulo, como
 * `valoraciones.ts`: lo usa `scripts/voz-web.test.ts`.
 *
 * Los patrones se aplican sobre el texto normalizado (minúsculas y sin tildes: `normalizarVoz`).
 */

/** Familias de expresiones prohibidas. Las exenciones se declaran por familia. */
export type FamiliaVoz = 'descarga' | 'repositorio' | 'rutas' | 'revision' | 'literal';

export interface ExpresionProhibida {
  readonly familia: FamiliaVoz;
  /** Nombre legible, tal como aparece en la guía. */
  readonly nombre: string;
  /** Patrón sobre el texto normalizado. */
  readonly patron: RegExp;
}

/**
 * Lista prohibida. Con y sin tilde, en singular y plural (el texto se normaliza antes de buscar).
 * «descargado el AAAA-MM-DD» de la línea de fuente (`SourceLine`) y «versión descargada el AAAA-MM-DD»
 * de algún título de fuente son las únicas formas de «descargado» toleradas fuera de la zona permitida, y solo hasta la fase R2, que la sustituye (véase
 * `FORMA_TOLERADA_HASTA_R2`).
 */
export const EXPRESIONES_PROHIBIDAS: readonly ExpresionProhibida[] = [
  { familia: 'descarga', nombre: 'descargado/a(s)', patron: /descargad[oa]s?/ },
  { familia: 'descarga', nombre: 'la descarga (de los ficheros)', patron: /\bla descarga esta/ },
  { familia: 'repositorio', nombre: 'repositorio', patron: /repositorio/ },
  { familia: 'repositorio', nombre: 'repo', patron: /\brepo\b/ },
  { familia: 'repositorio', nombre: 'GitHub', patron: /github/ },
  { familia: 'repositorio', nombre: 'commit', patron: /\bcommits?\b/ },
  { familia: 'repositorio', nombre: 'claims', patron: /\bclaims?\b/ },
  { familia: 'repositorio', nombre: 'Claude', patron: /\bclaude\b/ },
  {
    familia: 'repositorio',
    nombre: 'fichero(s) de datos o de salida',
    patron: /\bficheros? de (datos|salida)\b/,
  },
  { familia: 'rutas', nombre: 'ruta data/…', patron: /\bdata\/|\bdata-raw\/|\/data\b/ },
  {
    familia: 'rutas',
    nombre: 'ruta docs/…, modelos/…, src/… o scripts/…',
    patron: /\b(docs|modelos|src|scripts)\//,
  },
  { familia: 'rutas', nombre: '.json', patron: /\.json\b/ },
  { familia: 'rutas', nombre: '.md', patron: /\.md\b/ },
  { familia: 'rutas', nombre: '.ts', patron: /\.tsx?\b/ },
  { familia: 'revision', nombre: 'revisor', patron: /\brevisor(es|a|as)?\b/ },
  { familia: 'revision', nombre: 'revisión actuarial', patron: /revision(es)? actuarial(es)?/ },
  { familia: 'revision', nombre: 'revisión interna', patron: /revision(es)? interna/ },
  { familia: 'literal', nombre: 'Literal de la fuente', patron: /literal de la fuente/ },
];

/**
 * Única forma de «descargado» tolerada fuera de la zona permitida: la fecha de la línea de fuente
 * («… · descargado el 2026-11-11 · …»). La retira la fase R2 junto con la línea de fuente actual.
 */
export const FORMA_TOLERADA_HASTA_R2 =
  /(descargado|version descargada) el \d{4}-\d{2}-\d{2}|codigo del modelo en el repositorio y salidas de su ejecucion/g;

/** Minúsculas, sin tildes y con los espacios colapsados. */
export function normalizarVoz(texto: string): string {
  return texto.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/\s+/g, ' ');
}

export interface HallazgoVoz {
  readonly nombre: string;
  readonly familia: FamiliaVoz;
  /** Fragmento normalizado alrededor de la coincidencia, para localizarlo. */
  readonly contexto: string;
}

/** Expresiones prohibidas que aparecen en un texto (todas las coincidencias). */
export function vozEn(
  texto: string,
  familiasExentas: readonly FamiliaVoz[] = [],
  contextoCaracteres = 60,
): HallazgoVoz[] {
  const limpio = normalizarVoz(texto).replace(FORMA_TOLERADA_HASTA_R2, 'fecha de fuente (r2)');
  const hallazgos: HallazgoVoz[] = [];
  for (const { familia, nombre, patron } of EXPRESIONES_PROHIBIDAS) {
    if (familiasExentas.includes(familia)) continue;
    const global = new RegExp(patron.source, 'g');
    for (const m of limpio.matchAll(global)) {
      hallazgos.push({
        nombre,
        familia,
        contexto: limpio.slice(
          Math.max(0, m.index - contextoCaracteres),
          m.index + m[0].length + contextoCaracteres,
        ),
      });
    }
  }
  return hallazgos;
}

/**
 * Zona permitida: el único sitio donde se admiten las expresiones de la lista, por ruta y familia.
 * Cualquier otra aparición hace fallar `scripts/voz-web.test.ts`.
 */
export interface ExencionVoz {
  /** Ruta del HashRouter (sin la almohadilla). */
  readonly ruta: string;
  /** Qué parte de la ruta queda exenta. */
  readonly seccion: string;
  readonly familias: readonly FamiliaVoz[];
  /** Motivo de la exención. */
  readonly motivo: string;
}

export const ZONA_PERMITIDA: readonly ExencionVoz[] = [
  {
    ruta: '/metodologia',
    seccion: 'toda la página',
    familias: ['revision', 'descarga', 'repositorio', 'rutas'],
    motivo:
      'La página «Metodología» explica la revisión actuarial y los medios de verificación (cada apartado termina con «Dónde consta», con ficheros y rutas) y, en «Cómo reproducirlo», el repositorio, las rutas y los comandos. No se reescribe en la fase R1.',
  },
];

/** Familias exentas en una ruta (vacío si la ruta no tiene exención). */
export function familiasExentasEn(ruta: string): FamiliaVoz[] {
  return ZONA_PERMITIDA.filter((e) => e.ruta === ruta).flatMap((e) => [...e.familias]);
}
