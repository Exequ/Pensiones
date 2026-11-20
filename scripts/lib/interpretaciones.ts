/**
 * Reglas de las cajas «Interpretación» (fase RI, `docs/INTERPRETACIONES.md`) que comprueban la
 * validación de `npm run lint` (`scripts/validate-interpretaciones.ts`) y las pruebas
 * (`scripts/interpretaciones.test.ts`, con una prueba de sensibilidad por regla).
 *
 * Dentro de la caja, y solo ahí, se admiten términos de valoración (`valoraciones.ts`), pero cada uno
 * necesita su criterio definido en el mismo registro. Todo lo demás se mantiene: guía de voz, ninguna
 * cifra escrita a mano, sin partidos ni programas, proyecciones con su hipótesis y su rango, datos
 * que la sostienen existentes y atribución a un documento publicado.
 */
import {
  marcadoresEn,
  PATRON_REF_DATA,
  PATRON_REF_MOTOR,
  PATRON_REF_MUESTRA,
  sinMarcadores,
  type Interpretacion,
} from '../../src/engine/interpretaciones.ts';
import { politicaEn } from './politica.ts';
import { valoracionesEn } from './valoraciones.ts';
import { vozEn } from './voz.ts';

export const REGLAS_INTERPRETACION = [
  'criterio-valoracion',
  'politica',
  'cifras',
  'marcadores',
  'datos',
  'atribucion',
  'redaccion-atribuida',
  'proyeccion',
  'voz',
  'ejemplo',
] as const;
export type ReglaInterpretacion = (typeof REGLAS_INTERPRETACION)[number];

export interface Infraccion {
  readonly regla: ReglaInterpretacion;
  readonly detalle: string;
}

export interface ContextoReglas {
  /** ¿Existe la referencia `data/…json#id` en /data? */
  existeEnData(ref: string): boolean;
  /** ¿Existe la fuente ficticia n del laboratorio de diseño? */
  existeEnMuestra(n: number): boolean;
  /** Funciones del motor admitidas. */
  funcionesMotor: readonly string[];
  /** Rutas de la web (sin almohadilla). */
  rutas: readonly string[];
}

/** Dominios de redes sociales: una atribución no puede apuntar a ellos. */
export const REDES_SOCIALES = [
  'twitter.com',
  'x.com',
  'facebook.com',
  'instagram.com',
  'tiktok.com',
  'linkedin.com',
  'youtube.com',
  'youtu.be',
  't.me',
  'threads.net',
  'bsky.app',
  'reddit.com',
  'mastodon.social',
  'whatsapp.com',
] as const;

/** Apuntes de clase y material docente: no se citan (se cita la publicación que referencian). */
const APUNTES =
  /\bapuntes\b|\bdiapositivas?\b|\btransparencias\b|notas de clase|material docente|\bslides?\b|\btema \d/;

/** Dominios reservados para ejemplos: solo en los registros de ejemplo. */
const DOMINIO_EJEMPLO = /(^|\.)example\.(org|com|net)$|\.invalid$|\.example$/;

const normalizar = (t: string): string =>
  t
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase();

/** Textos visibles de la caja (con marcadores, salvo donde se indique). */
function textosVisibles(r: Interpretacion): string[] {
  return [
    r.titulo,
    r.texto,
    ...r.criterios.flatMap((c) => [c.termino, c.definicion]),
    ...(r.proyeccion ? [r.proyeccion.hipotesis] : []),
  ];
}

/** Infracciones de un registro; vacío si cumple todas las reglas. */
export function infraccionesDe(r: Interpretacion, ctx: ContextoReglas): Infraccion[] {
  const fallos: Infraccion[] = [];
  const falla = (regla: ReglaInterpretacion, detalle: string) =>
    fallos.push({ regla, detalle: `${r.id}: ${detalle}` });

  // 1. Cada término de valoración del título y del texto lleva su criterio definido en el registro.
  const valoraciones = new Set(valoracionesEn(`${r.titulo}\n${sinMarcadores(r.texto)}`));
  const conCriterio = new Set(
    r.criterios
      .filter((c) => c.definicion.trim().length > 0)
      .flatMap((c) => valoracionesEn(c.termino)),
  );
  for (const v of valoraciones)
    if (!conCriterio.has(v)) falla('criterio-valoracion', `«${v}» sin criterio definido`);
  for (const c of r.criterios)
    if (valoracionesEn(c.termino).length === 0)
      falla(
        'criterio-valoracion',
        `criterio de «${c.termino}», que no es un término de valoración`,
      );

  // 2. Sin partidos, programas, voto ni propuestas políticas.
  const politica = textosVisibles(r).flatMap((t) => politicaEn(t));
  if (r.atribucion) politica.push(...politicaEn(r.atribucion.titulo));
  for (const p of new Set(politica)) falla('politica', `término político «${p}»`);

  // 3. Ninguna cifra escrita a mano (las cifras entran por marcadores).
  for (const t of textosVisibles(r))
    if (/\d/.test(sinMarcadores(t)))
      falla('cifras', `dígitos escritos a mano en «${t.slice(0, 60)}»`);

  // 4. Marcadores: todos definidos, todos usados y bien referidos.
  const usados = new Set([
    ...textosVisibles(r).flatMap((t) => marcadoresEn(t)),
    ...(r.proyeccion?.rango ? [r.proyeccion.rango.desde, r.proyeccion.rango.hasta] : []),
  ]);
  for (const n of usados)
    if (!(n in r.marcadores)) falla('marcadores', `marcador sin definir {{${n}}}`);
  for (const [n, m] of Object.entries(r.marcadores)) {
    if (!usados.has(n)) falla('marcadores', `marcador definido y no usado ${n}`);
    if ('atribucion' in m) {
      if (r.tipo !== 'atribuida')
        falla('marcadores', `${n}: cifra de atribución en una caja del autor`);
      else if (typeof r.atribucion?.dato.value !== 'number')
        falla('marcadores', `${n}: la atribución no da una cifra`);
    } else if (!r.datosQueLaSostienen.includes(m.ref)) {
      falla('marcadores', `${n}: su referencia no está en datosQueLaSostienen`);
    }
  }

  // 5. Datos que la sostienen: no vacíos y existentes.
  if (r.datosQueLaSostienen.length === 0) falla('datos', 'datosQueLaSostienen vacío');
  for (const ref of r.datosQueLaSostienen) {
    if (PATRON_REF_DATA.test(ref)) {
      if (!ctx.existeEnData(ref)) falla('datos', `no existe en /data: ${ref}`);
    } else if (PATRON_REF_MOTOR.test(ref)) {
      if (!ctx.funcionesMotor.includes(ref.slice('motor:'.length)))
        falla('datos', `función del motor desconocida: ${ref}`);
    } else if (PATRON_REF_MUESTRA.test(ref)) {
      if (r.ejemplo !== true) falla('datos', `datos ficticios fuera de un ejemplo: ${ref}`);
      else if (!ctx.existeEnMuestra(Number(ref.slice('muestra#'.length))))
        falla('datos', `no existe en la muestra: ${ref}`);
    } else falla('datos', `referencia no válida: ${ref}`);
  }

  // 6. Atribución a un documento publicado, con su Dato.
  if (r.tipo === 'atribuida') {
    const a = r.atribucion;
    if (a === undefined) falla('atribucion', 'sin atribución');
    else {
      let host = '';
      try {
        const u = new URL(a.dato.source.url);
        if (u.protocol !== 'https:' && u.protocol !== 'http:') falla('atribucion', 'url no web');
        host = u.hostname.toLowerCase();
      } catch {
        falla('atribucion', `url no válida: ${a.dato.source.url}`);
      }
      if (REDES_SOCIALES.some((d) => host === d || host.endsWith(`.${d}`)))
        falla('atribucion', `apunta a una red social: ${host}`);
      const descripcion = normalizar(
        `${a.titulo} ${a.publicacion} ${a.dato.source.title} ${a.dato.source.publisher} ${a.dato.source.url}`,
      );
      if (APUNTES.test(descripcion))
        falla('atribucion', 'apunta a unos apuntes o material de clase');
      if (DOMINIO_EJEMPLO.test(host) && r.ejemplo !== true)
        falla('atribucion', `dominio de ejemplo fuera de un ejemplo: ${host}`);
      if (a.dato.confidence === 'alta')
        falla('atribucion', 'confianza «alta» en una fuente atribuida');
    }
    // El texto se redacta como atribuido.
    if (!/^según\s/i.test(r.texto.trim()))
      falla('redaccion-atribuida', 'el texto de una atribuida empieza por «Según …»');
  } else if (r.atribucion !== undefined) falla('atribucion', 'atribución en una caja del autor');

  // 7. Proyecciones con su hipótesis y, si hay sensibilidades, su rango.
  if (r.proyeccion) {
    if (r.proyeccion.hipotesis.trim().length === 0) falla('proyeccion', 'proyección sin hipótesis');
    if (r.proyeccion.sensibilidades && r.proyeccion.rango === undefined)
      falla('proyeccion', 'proyección con sensibilidades sin rango');
  }

  // 8. Guía de voz, sin exenciones.
  const textoVoz = [...textosVisibles(r), ...(r.atribucion ? [r.atribucion.titulo] : [])];
  for (const h of textoVoz.flatMap((t) => vozEn(t))) falla('voz', `${h.nombre}: «${h.contexto}»`);

  // 9. Ejemplos solo en /diseno; los demás, en una página de contenido.
  if (r.ejemplo === true && r.pagina !== '/diseno')
    falla('ejemplo', 'un registro de ejemplo solo puede usarse en /diseno');
  if (r.ejemplo !== true) {
    if (r.pagina === '/diseno') falla('ejemplo', '/diseno solo admite registros de ejemplo');
    if (!ctx.rutas.includes(r.pagina)) falla('ejemplo', `página desconocida: ${r.pagina}`);
  }
  return fallos;
}
