/**
 * Personas-ejemplo (Fase 3-B1): perfiles ilustrativos de /data (`data/ejemplos/personas.json`)
 * que rellenan la carrera por tramos. Lógica pura: las cifras de la definición (edad de inicio,
 * duraciones) vienen del fichero y las bases, de las series de referencia; aquí no hay ninguna
 * cifra de datos. Si /data no cubre las fechas de la persona, el tramo usa la primera (o la
 * última) fecha con datos y se explica; nunca se inventa una base.
 */
import { ArchivoPersonas, type PersonaEjemplo } from '../../engine/esquema-datos.ts';
import { formatearNumero } from '../../engine/formato.ts';
import { buscarReferencia, referenciaDeTipo, type CatalogoReferencias } from './referencias.ts';
import {
  mesAbsoluto,
  nombreDeMes,
  nuevoIdTramo,
  type ReferenciaTramo,
  type TramoFormulario,
} from './tramos.ts';

export type { PersonaEjemplo };

/** Valida el fichero de personas con el esquema y devuelve sus perfiles. */
export function construirPersonas(json: unknown): readonly PersonaEjemplo[] {
  return ArchivoPersonas.parse(json).personas;
}

/**
 * Cómo se nombra cada referencia en la descripción de una persona (con su artículo). La referencia
 * «media» se rotula «salario medio ilustrativo» y no «base media de cotización»: según la definición
 * elegida es una base de cotización o un salario (ajustes actuariales 1, `docs/DECISIONES.md`).
 */
const ROTULO_REFERENCIA: Record<'minima' | 'media' | 'maxima', string> = {
  minima: 'la base mínima',
  media: 'el salario medio ilustrativo',
  maxima: 'la base máxima',
};

const plural = (n: number, singular: string, pluralTexto: string): string =>
  `${formatearNumero(n)} ${n === 1 ? singular : pluralTexto}`;

/** Descripción de la definición de la persona, generada con las cifras del fichero de /data. */
export function describirPersona(p: PersonaEjemplo): string {
  const partes = p.tramos.map((t) => {
    const cuanto =
      t.anios === undefined
        ? 'hasta el mes anterior a la jubilación'
        : `durante ${plural(t.anios, 'año', 'años')}`;
    return t.referencia === 'sin-cotizar'
      ? `sin cotizar ${cuanto}`
      : `con ${ROTULO_REFERENCIA[t.referencia]} ${cuanto}`;
  });
  return `Empieza a cotizar a los ${plural(p.edadInicio, 'año', 'años')} y cotiza ${partes.join(', luego ')}.`;
}

export interface Fecha {
  readonly anio: number;
  readonly mes: number;
}

export interface ContextoPersona {
  readonly nacimiento: Fecha;
  readonly jubilacion: Fecha;
  readonly catalogo: CatalogoReferencias;
  /** Definición de la «base media» elegida (decide la cobertura de los tramos con base media). */
  readonly definicionMedia: string;
  /** «a la jubilación» (por defecto) o «al hecho causante»; y, entre paréntesis, «de jubilación» o «del hecho causante». */
  readonly anteriorA?: string;
  readonly deFin?: string;
}

export type CargaPersona =
  | {
      readonly ok: true;
      readonly tramos: readonly TramoFormulario[];
      /** Qué se ajustó por la cobertura de los datos y por qué. */
      readonly notas: readonly string[];
    }
  | { readonly ok: false; readonly mensaje: string };

const mes2 = (abs: number): { mes: string; anio: string } => ({
  mes: String((abs % 12) + 1),
  anio: String(Math.floor(abs / 12)),
});

/**
 * Aplica una persona a unas fechas de nacimiento y jubilación: tramos con referencia a series.
 * Los tramos se recortan a los años con datos de su referencia y cada recorte se explica.
 */
export function cargarPersona(p: PersonaEjemplo, ctx: ContextoPersona): CargaPersona {
  const nacimiento = mesAbsoluto(ctx.nacimiento.anio, ctx.nacimiento.mes);
  const inicio = nacimiento + p.edadInicio * 12;
  const fin = mesAbsoluto(ctx.jubilacion.anio, ctx.jubilacion.mes) - 1;
  if (inicio > fin) {
    return {
      ok: false,
      mensaje: `Con estas fechas, esta persona empezaría a cotizar en ${nombreDeMes(inicio)}, después del mes anterior ${ctx.anteriorA ?? 'a la jubilación'} (${nombreDeMes(fin)}). Cambia las fechas de nacimiento o ${ctx.deFin ?? 'de jubilación'}.`,
    };
  }
  const tramos: TramoFormulario[] = [];
  const notas: string[] = [];
  let cursor = inicio;
  for (const t of p.tramos) {
    const desde = cursor;
    const hastaTeorico = t.anios === undefined ? fin : desde + t.anios * 12 - 1;
    cursor = hastaTeorico + 1;
    if (t.referencia === 'sin-cotizar' || desde > fin) continue;
    const hasta = Math.min(hastaTeorico, fin);
    const ref = referenciaDeTipo(ctx.catalogo, t.referencia, ctx.definicionMedia);
    if (!ref) continue;
    const primeroConDatos = mesAbsoluto(ref.primerAnio, 1);
    const ultimoConDatos = mesAbsoluto(ref.ultimoAnio, 12);
    const d = Math.max(desde, primeroConDatos);
    const h = Math.min(hasta, ultimoConDatos);
    if (d > h) {
      notas.push(
        `Un tramo de esta persona queda sin datos: «${ref.etiqueta}» tiene datos de ${String(ref.primerAnio)} a ${String(ref.ultimoAnio)} y el tramo iría de ${nombreDeMes(desde)} a ${nombreDeMes(hasta)}. Se omite; no se inventa ninguna base.`,
      );
      continue;
    }
    if (d > desde) {
      notas.push(
        `«${ref.etiqueta}» solo tiene datos desde ${String(ref.primerAnio)}: el tramo empieza en ${nombreDeMes(d)} en lugar de en ${nombreDeMes(desde)}.`,
      );
    }
    if (h < hasta) {
      notas.push(
        `«${ref.etiqueta}» solo tiene datos hasta ${String(ref.ultimoAnio)}: el tramo termina en ${nombreDeMes(h)} y los meses siguientes hasta ${nombreDeMes(hasta)} quedan sin tramo (cuentan como lagunas). Puedes añadir un tramo con un importe.`,
      );
    }
    const a = mes2(d);
    const b = mes2(h);
    tramos.push({
      id: nuevoIdTramo(),
      desdeMes: a.mes,
      desdeAnio: a.anio,
      hastaMes: b.mes,
      hastaAnio: b.anio,
      referencia: t.referencia satisfies ReferenciaTramo,
      importe: '',
    });
  }
  if (tramos.length === 0) {
    return {
      ok: false,
      mensaje: `Los datos no cubren las fechas de esta persona: ${notas.join(' ')}`.trim(),
    };
  }
  return { ok: true, tramos, notas };
}

/**
 * Nota sobre el «salario medio ilustrativo» de las personas-ejemplo (ajustes actuariales 1). Describe,
 * con los años del catálogo de /data, qué cubre la definición de «base media» elegida y qué ocurre
 * antes de su primer año: el simulador no completa esos años con otra serie (la calibración posible,
 * entre la base media del Régimen General y el salario, está en `docs/PENDIENTE_DATOS.md`).
 */
export function notaSalarioMedioIlustrativo(
  catalogo: CatalogoReferencias,
  definicionMedia: string,
): string {
  const elegida =
    buscarReferencia(catalogo, definicionMedia) ??
    buscarReferencia(catalogo, catalogo.mediaPorDefecto);
  if (!elegida) return '';
  const otras = catalogo.referencias
    .filter((r) => r.tipo === 'media' && r.id !== elegida.id && r.primerAnio < elegida.primerAnio)
    .map((r) => `${r.etiqueta} (desde ${String(r.primerAnio)})`);
  const antes =
    otras.length === 0
      ? ''
      : ` Otras definiciones de la «base media» empiezan antes: ${otras.join('; ')}. Son salarios y no bases de cotización, y no miden lo mismo.`;
  return (
    `«Salario medio ilustrativo» es la referencia «media» de los tramos de la persona; según la definición elegida es una base de cotización o un salario. ` +
    `La elegida ahora, «${elegida.etiqueta}», tiene datos de ${String(elegida.primerAnio)} a ${String(elegida.ultimoAnio)}. ` +
    `Para los años anteriores a ${String(elegida.primerAnio)} no hay dato de esa serie: el tramo empieza en el primer año con datos y los meses anteriores cuentan como meses sin cotizar; el simulador no los completa con otra serie.${antes}`
  );
}
