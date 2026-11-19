/**
 * Grupos del menú de secciones: única fuente de verdad de la navegación agrupada. La usan la
 * cabecera (`Header`), la portada (`Inicio`), el pie (`Footer`) y las pruebas; ninguno repite la
 * lista. Las rutas y los títulos salen de `SECCIONES` y de `PAGINAS_SOBRE_LA_WEB`; aquí solo se
 * decide qué ruta va en qué grupo y en qué orden.
 *
 * Los textos no contienen cifras (lo comprueba `navegacion.test.ts`).
 */
import { SECCIONES, type SlugSeccion } from './secciones.ts';

/** Páginas generales que no son secciones de contenido (siguen en construcción). */
export const PAGINAS_SOBRE_LA_WEB = [
  { slug: 'fuentes', titulo: 'Fuentes' },
  { slug: 'cambios', titulo: 'Registro de cambios' },
] as const;

export type SlugSobreLaWeb = (typeof PAGINAS_SOBRE_LA_WEB)[number]['slug'];

/** Ruta del menú: una sección o una página general. */
export type SlugNavegable = SlugSeccion | SlugSobreLaWeb;

export interface EnlaceNavegacion {
  readonly slug: SlugNavegable;
  /** Ruta absoluta dentro del enrutador («/reformas»). */
  readonly ruta: string;
  /** Texto del enlace en el menú. */
  readonly titulo: string;
}

export interface GrupoNavegacion {
  /** Identificador estable (para `id` y pruebas). */
  readonly id: string;
  /** Nombre del grupo en el menú (véase `docs/GUIA_DE_VOZ.md`). */
  readonly titulo: string;
  /** Un grupo directo es un enlace sin desplegable (solo tiene una ruta). */
  readonly directo: boolean;
  readonly enlaces: readonly EnlaceNavegacion[];
}

interface DefinicionGrupo {
  readonly id: string;
  readonly titulo: string;
  readonly directo?: true;
  readonly slugs: readonly SlugNavegable[];
}

const DEFINICION: readonly DefinicionGrupo[] = [
  { id: 'tu-pension', titulo: 'Tu pensión', directo: true, slugs: ['tu-pension'] },
  {
    id: 'como-funciona',
    titulo: 'Cómo funciona',
    slugs: ['tipos-de-pension', 'como-se-calcula', 'reformas'],
  },
  {
    id: 'sistema-por-dentro',
    titulo: 'El sistema por dentro',
    slugs: ['financiacion-y-deficit', 'hucha', 'cotizantes-y-pensionistas', 'proyecciones'],
  },
  {
    id: 'comparar',
    titulo: 'Comparar y contrastar',
    slugs: ['otros-sistemas', 'mitos-y-realidades'],
  },
  { id: 'sobre-la-web', titulo: 'Sobre la web', slugs: ['metodologia', 'fuentes', 'cambios'] },
];

/** Título de una ruta del menú: el corto de la sección o el de la página general. */
function tituloDe(slug: SlugNavegable): string {
  const seccion = SECCIONES.find((s) => s.slug === slug);
  if (seccion) return seccion.tituloNav;
  const general = PAGINAS_SOBRE_LA_WEB.find((p) => p.slug === slug);
  if (general) return general.titulo;
  throw new Error(`Ruta del menú desconocida: ${slug}`);
}

export const GRUPOS_NAVEGACION: readonly GrupoNavegacion[] = DEFINICION.map((g) => ({
  id: g.id,
  titulo: g.titulo,
  directo: g.directo === true,
  enlaces: g.slugs.map((slug) => ({ slug, ruta: `/${slug}`, titulo: tituloDe(slug) })),
}));

/** Todas las rutas del menú, en el orden en que aparecen. */
export const RUTAS_NAVEGACION: readonly EnlaceNavegacion[] = GRUPOS_NAVEGACION.flatMap(
  (g) => g.enlaces,
);

/** Grupo al que pertenece una ruta («/reformas» → «Cómo funciona»), o `undefined`. */
export function grupoDeRuta(ruta: string): GrupoNavegacion | undefined {
  return GRUPOS_NAVEGACION.find((g) => g.enlaces.some((e) => e.ruta === ruta));
}

/** Grupo «Sobre la web» (lo repite el pie de página). */
export function grupoSobreLaWeb(): GrupoNavegacion {
  const grupo = GRUPOS_NAVEGACION.find((g) => g.id === 'sobre-la-web');
  if (!grupo) throw new Error('Falta el grupo «Sobre la web»');
  return grupo;
}
