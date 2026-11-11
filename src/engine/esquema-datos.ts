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

/** Valor de un dato: número finito o texto (para reglas o datos cualitativos). */
const ValorDato = z.union([z.number(), z.string().trim().min(1)], {
  error: 'value debe ser un número finito o un texto no vacío',
});

/**
 * Contraste con una segunda fuente independiente (regla de las dos fuentes).
 * `matches` indica si el valor coincide; si no, la discrepancia se explica en
 * docs/DISCREPANCIAS.md.
 */
export const Contraste = z.strictObject({
  source: Fuente,
  fetchedAt: FechaDescarga,
  matches: z.boolean({ error: 'crossCheck.matches debe ser true o false' }),
  value: ValorDato.optional(),
  notes: z.string().trim().min(1).optional(),
});

const camposDato = {
  value: ValorDato,
  unit: textoObligatorio('unit'),
  period: Periodo,
  source: Fuente,
  fetchedAt: FechaDescarga,
  confidence: Confianza,
  notes: z.string().trim().min(1).optional(),
  /** Cita literal del documento donde aparece el valor. */
  quote: z.string().trim().min(1).optional(),
  /** Artículo, anexo o tabla del documento. */
  location: z.string().trim().min(1).optional(),
  crossCheck: Contraste.optional(),
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
    tipo: z.literal('datos').optional(),
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

/** Referencia a un elemento de /data: «parametros/pension-maxima.json#2024». */
export const PATRON_REFERENCIA = /^[a-z0-9-]+\/[a-z0-9-]+\.json#[a-z0-9]+(?:[-_.][a-z0-9]+)*$/;

/** Afirmación factual del texto de la web y sus fuentes (docs/claims.json). */
export const Afirmacion = z.strictObject({
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  texto: textoObligatorio('texto'),
  ubicacion: textoObligatorio('ubicacion'),
  /** Referencias a /data con la forma «carpeta/fichero.json#id» (se comprueba que existan). */
  datos: z
    .array(z.string().regex(PATRON_REFERENCIA, { error: 'Referencia con formato no válido' }))
    .min(1, { error: 'Cada afirmación debe apoyarse en al menos un dato de /data' }),
  fuentes: z.array(Fuente).min(1, { error: 'Cada afirmación necesita al menos una fuente' }),
  fetchedAt: FechaDescarga,
  estado: z.enum(['verificada', 'pendiente', 'retirada']),
  revisionActuarial: z.enum(['pendiente', 'revisada', 'rechazada']),
  notas: z.string().trim().min(1).optional(),
});

export const RegistroAfirmaciones = z.strictObject({
  version: z.literal(1),
  descripcion: z.string().optional(),
  claims: z.array(Afirmacion),
});

// ---------------------------------------------------------------------------
// Normativa: cronología de reformas y reglas de prestaciones
// ---------------------------------------------------------------------------

export const PATRON_BOE = /^BOE-A-\d{4}-\d+$/;

export const MODULOS = [
  'Tu pensión',
  'Tipos de pensión',
  'Cómo se calcula',
  'Reformas',
  'Financiación y déficit',
  'La «hucha»',
  'Cotizantes/pensionistas',
  'Otros sistemas',
  'Mitos y realidades',
  'Metodología',
] as const;

export const Modulo = z.enum(MODULOS, { error: 'Módulo de la web desconocido' });

export const PARAMETROS_NORMATIVOS = [
  'periodo-calculo',
  'carencia',
  'edad-ordinaria',
  'escala-porcentajes',
  'coeficientes-reductores',
  'incentivos-demora',
  'pension-maxima',
  'pension-minima',
  'revalorizacion',
  'tipos-cotizacion',
  'bases-cotizacion',
  'mei',
  'complemento-brecha-genero',
  'cuota-solidaridad',
  'fondo-reserva',
  'factor-sostenibilidad',
  'jubilacion-anticipada',
  'jubilacion-parcial',
  'jubilacion-activa',
  'viudedad',
  'orfandad',
  'incapacidad',
  'no-contributivas',
  'integracion-lagunas',
  'gobernanza',
  'otros',
] as const;

const fechaIso = z.iso.date({ error: 'Fecha con formato AAAA-MM-DD' });

export const CambioNormativo = z.strictObject({
  parametro: z.enum(PARAMETROS_NORMATIVOS, { error: 'Parámetro normativo desconocido' }),
  antes: z.string().trim().min(1).nullable(),
  despues: textoObligatorio('despues'),
  transicion: textoObligatorio('transicion'),
  articulos: textoObligatorio('articulos'),
  evidencia: textoObligatorio('evidencia'),
});

export const Norma = z.strictObject({
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  titulo: textoObligatorio('titulo'),
  rango: textoObligatorio('rango'),
  fecha: fechaIso,
  fechaPublicacion: fechaIso,
  boeId: z.string().regex(PATRON_BOE, { error: 'boeId debe tener la forma BOE-A-AAAA-NNNN' }),
  source: Fuente,
  fetchedAt: FechaDescarga,
  confidence: Confianza,
  resumen: textoObligatorio('resumen'),
  cambios: z.array(CambioNormativo).min(1, { error: 'Cada norma debe documentar algún cambio' }),
  modulos: z.array(Modulo).min(1),
  estado: z.enum(['vigente', 'derogada', 'modificada', 'suspendida']),
  notas: z.string().trim().min(1).optional(),
});

export const ArchivoCronologia = z.strictObject({
  tipo: z.literal('cronologia'),
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  title: textoObligatorio('title'),
  description: textoObligatorio('description'),
  normas: z.array(Norma).min(1),
});

export const Requisito = z.strictObject({
  tipo: z.enum(['edad', 'carencia', 'alta', 'cotizacion-previa', 'rentas', 'residencia', 'otros']),
  descripcion: textoObligatorio('descripcion'),
  articulo: textoObligatorio('articulo'),
});

export const Prestacion = z.strictObject({
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  nombre: textoObligatorio('nombre'),
  familia: z.enum([
    'jubilacion',
    'incapacidad',
    'muerte-supervivencia',
    'no-contributiva',
    'complementos',
    'clases-pasivas',
  ]),
  modalidad: z.enum(['contributiva', 'no-contributiva', 'clases-pasivas']),
  aQuienCubre: textoObligatorio('aQuienCubre'),
  requisitos: z.array(Requisito),
  calculo: z.strictObject({
    baseReguladora: z.string().trim().min(1).optional(),
    porcentaje: z.string().trim().min(1).optional(),
    formula: textoObligatorio('calculo.formula'),
    articulos: textoObligatorio('calculo.articulos'),
  }),
  limites: textoObligatorio('limites'),
  duracion: textoObligatorio('duracion'),
  extincion: z.array(z.string().trim().min(1)),
  compatibilidades: textoObligatorio('compatibilidades'),
  articulos: z.array(z.string().trim().min(1)).min(1),
  source: Fuente,
  fuentesAdicionales: z.array(Fuente).optional(),
  fetchedAt: FechaDescarga,
  confidence: Confianza,
  evidencia: z.array(z.string().trim().min(1)).min(1),
  modulos: z.array(Modulo).min(1),
  notas: z.string().trim().min(1).optional(),
});

export const ArchivoPrestaciones = z.strictObject({
  tipo: z.literal('prestaciones'),
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  title: textoObligatorio('title'),
  description: textoObligatorio('description'),
  vigenteA: fechaIso,
  prestaciones: z.array(Prestacion).min(1),
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
export type Contraste = z.infer<typeof Contraste>;
export type Norma = z.infer<typeof Norma>;
export type ArchivoCronologia = z.infer<typeof ArchivoCronologia>;
export type Prestacion = z.infer<typeof Prestacion>;
export type ArchivoPrestaciones = z.infer<typeof ArchivoPrestaciones>;
