/**
 * Esquemas de los datos versionados de /data.
 *
 * Todo dato que aparezca en la web debe poder rastrearse hasta una fuente
 * verificable descargada en una sesión de trabajo (ver CLAUDE.md). Estos
 * esquemas se usan tanto en la web (tipos) como en `npm run validate:data`.
 *
 * TypeScript puro: sin React ni dependencias del navegador.
 */
import { z } from 'zod';

/** Año (`2024`) o trimestre (`2024-T1` … `2024-T4`). */
export const PATRON_PERIODO = /^\d{4}(-T[1-4])?$/;

/** Identificadores en minúsculas, con guiones, puntos o guiones bajos. */
export const PATRON_ID = /^[a-z0-9]+(?:[-_.][a-z0-9]+)*$/;

const textoObligatorio = (campo: string) =>
  z
    .string({ error: `Falta ${campo}` })
    .trim()
    .min(1, { error: `${campo} no puede estar vacío` });

export const Periodo = z.string({ error: 'Falta period' }).regex(PATRON_PERIODO, {
  error: 'period debe ser un año (AAAA) o un trimestre (AAAA-T1 … AAAA-T4)',
});

export const Fuente = z.strictObject(
  {
    title: textoObligatorio('source.title'),
    publisher: textoObligatorio('source.publisher'),
    url: z.url({
      protocol: /^https?$/,
      error: 'Dato sin fuente verificable: source.url debe ser una URL http(s) válida',
    }),
    docId: z.string().trim().min(1).optional(),
  },
  {
    error: (problema) =>
      problema.input === undefined
        ? 'Dato sin fuente: falta source {title, publisher, url}'
        : undefined,
  },
);

/** Fecha (AAAA-MM-DD) o fecha y hora ISO 8601 con zona en que se descargó la fuente. */
export const FechaDescarga = z
  .union([z.iso.date(), z.iso.datetime({ offset: true })], {
    error: (problema) =>
      problema.input === undefined
        ? 'Dato sin fecha de descarga: falta fetchedAt'
        : 'fetchedAt debe ser una fecha ISO 8601 (AAAA-MM-DD o fecha y hora con zona)',
  })
  .refine((valor) => Date.parse(valor) <= Date.now() + 24 * 60 * 60 * 1000, {
    error: 'fetchedAt no puede ser una fecha futura',
  });

export const Confianza = z.enum(['alta', 'media', 'baja'], {
  error: 'confidence debe ser "alta", "media" o "baja"',
});

const camposDato = {
  value: z.union([z.number(), z.string().trim().min(1)], {
    error: 'value debe ser un número finito o un texto no vacío',
  }),
  unit: textoObligatorio('unit'),
  period: Periodo,
  source: Fuente,
  fetchedAt: FechaDescarga,
  confidence: Confianza,
  notes: z.string().trim().min(1).optional(),
};

/** Esquema común «Dato». */
export const Dato = z.strictObject(camposDato);

/** Dato dentro de un fichero de /data: lleva además un identificador. */
export const DatoConId = z.strictObject({
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  ...camposDato,
});

export const PuntoSerie = z.strictObject({
  period: Periodo,
  value: z.number({ error: 'value de la serie debe ser un número finito' }),
  notes: z.string().trim().min(1).optional(),
});

/**
 * Serie temporal homogénea: todos los puntos comparten fuente, unidad,
 * fecha de descarga y nivel de confianza.
 */
export const Serie = z
  .strictObject({
    id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
    title: textoObligatorio('title'),
    unit: textoObligatorio('unit'),
    source: Fuente,
    fetchedAt: FechaDescarga,
    confidence: Confianza,
    notes: z.string().trim().min(1).optional(),
    points: z.array(PuntoSerie).min(1, { error: 'La serie debe tener al menos un punto' }),
  })
  .superRefine((serie, ctx) => {
    const vistos = new Set<string>();
    serie.points.forEach((punto, i) => {
      if (vistos.has(punto.period)) {
        ctx.addIssue({
          code: 'custom',
          message: `Periodo repetido en la serie: ${punto.period}`,
          path: ['points', i, 'period'],
        });
      }
      vistos.add(punto.period);
    });
  });

/** Estructura de cada fichero JSON de /data. */
export const ArchivoDatos = z
  .strictObject({
    id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
    title: textoObligatorio('title'),
    description: textoObligatorio('description'),
    data: z.array(DatoConId).optional(),
    series: z.array(Serie).optional(),
  })
  .superRefine((archivo, ctx) => {
    if ((archivo.data?.length ?? 0) + (archivo.series?.length ?? 0) === 0) {
      ctx.addIssue({
        code: 'custom',
        message: 'El fichero no contiene datos: añade «data» o «series»',
        path: [],
      });
    }
    const ids = new Set<string>();
    for (const [coleccion, elementos] of [
      ['data', archivo.data ?? []],
      ['series', archivo.series ?? []],
    ] as const) {
      elementos.forEach((elemento, i) => {
        if (ids.has(elemento.id)) {
          ctx.addIssue({
            code: 'custom',
            message: `id repetido en el fichero: ${elemento.id}`,
            path: [coleccion, i, 'id'],
          });
        }
        ids.add(elemento.id);
      });
    }
  });

/** Afirmación factual del texto de la web y sus fuentes (docs/claims.json). */
export const Afirmacion = z.strictObject({
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  texto: textoObligatorio('texto'),
  ubicacion: textoObligatorio('ubicacion'),
  datos: z.array(z.string().min(1)).optional(),
  fuentes: z.array(Fuente).min(1, { error: 'Cada afirmación necesita al menos una fuente' }),
  fetchedAt: FechaDescarga,
  estado: z.enum(['verificada', 'pendiente', 'retirada']),
});

export const RegistroAfirmaciones = z.strictObject({
  version: z.literal(1),
  descripcion: z.string().optional(),
  claims: z.array(Afirmacion),
});

export type Periodo = z.infer<typeof Periodo>;
export type Fuente = z.infer<typeof Fuente>;
export type Confianza = z.infer<typeof Confianza>;
export type Dato = z.infer<typeof Dato>;
export type DatoConId = z.infer<typeof DatoConId>;
export type PuntoSerie = z.infer<typeof PuntoSerie>;
export type Serie = z.infer<typeof Serie>;
export type ArchivoDatos = z.infer<typeof ArchivoDatos>;
export type Afirmacion = z.infer<typeof Afirmacion>;
