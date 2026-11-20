/**
 * Interpretaciones (fase RI): formato de los registros de las cajas «Interpretación», escala
 * provisional del grado de confianza y resolución de los marcadores de cifras. Lógica pura, sin React
 * ni DOM. Las reglas que se comprueban en las pruebas (criterio por cada término de valoración, sin
 * cifras escritas a mano, sin partidos ni programas, voz…) están en `scripts/lib/interpretaciones.ts`.
 * Guía: `docs/INTERPRETACIONES.md`.
 *
 * Una interpretación es una lectura experta de unos datos, separada y rotulada para que el lector
 * distinga siempre los datos de su interpretación. Dos tipos: la del autor de la web (sin firma en
 * cada caja; la autoría consta en «Metodología») y la atribuida a un estudio o informe publicado.
 */
import { z } from 'zod';
import {
  AtribucionPublicacion,
  ESTADOS_REVISION_INTERPRETACION,
  type Dato as DatoTipo,
} from './esquema-datos.ts';
import { formatearEuros, formatearNumero, formatearPorcentaje } from './formato.ts';

export const TIPOS_INTERPRETACION = ['autor', 'atribuida'] as const;
export type TipoInterpretacion = (typeof TIPOS_INTERPRETACION)[number];

/**
 * Escala PROVISIONAL del grado de confianza de una interpretación, pendiente de confirmación
 * actuarial. Es la única definición: la usan el esquema, la caja y «Metodología».
 */
export const GRADOS_INTERPRETACION = [
  {
    id: 'respaldada',
    etiqueta: 'Respaldada por fuentes institucionales o literatura publicada',
  },
  { id: 'juicio-profesional', etiqueta: 'Juicio profesional' },
  { id: 'juicio-autor', etiqueta: 'Juicio del autor' },
] as const;
export type GradoInterpretacion = (typeof GRADOS_INTERPRETACION)[number]['id'];
export const ESCALA_GRADOS_PROVISIONAL = true;

export function etiquetaGrado(grado: GradoInterpretacion): string {
  const g = GRADOS_INTERPRETACION.find((x) => x.id === grado);
  if (g === undefined) throw new RangeError(`Grado desconocido: ${grado}`);
  return g.etiqueta;
}

export { ESTADOS_REVISION_INTERPRETACION };
export type EstadoRevisionInterpretacion = (typeof ESTADOS_REVISION_INTERPRETACION)[number];

export const FORMATOS_MARCADOR = ['numero', 'euros', 'porcentaje', 'fraccion-porcentaje'] as const;
export type FormatoMarcador = (typeof FORMATOS_MARCADOR)[number];

/**
 * Referencia a lo que sostiene una interpretación o a una cifra:
 * - `data/<carpeta>/<fichero>.json#<id>`: un dato o una serie de /data (en una serie, el valor es el
 *   del último punto, o el del periodo indicado con `periodo`);
 * - `motor:<nombre>`: una función del motor del registro `FUNCIONES_MOTOR_INTERPRETACION`;
 * - `muestra#<n>`: la fuente ficticia n del laboratorio de diseño (solo en los registros de ejemplo).
 */
export const PATRON_REF_DATA = /^data\/[a-z0-9-]+\/[a-z0-9-]+\.json#[A-Za-z0-9._-]+$/;
export const PATRON_REF_MOTOR = /^motor:[a-zA-Z][a-zA-Z0-9]*$/;
export const PATRON_REF_MUESTRA = /^muestra#\d+$/;
const Ref = z
  .string()
  .refine(
    (r) => PATRON_REF_DATA.test(r) || PATRON_REF_MOTOR.test(r) || PATRON_REF_MUESTRA.test(r),
    {
      error:
        'referencia no válida (un dato, una función del motor o una fuente ficticia del laboratorio)',
    },
  );

const Formato = z.enum(FORMATOS_MARCADOR);
const decimales = z.number().int().min(0).max(4).optional();

/** Cifra del texto: siempre por marcador con nombre, nunca escrita a mano. */
export const Marcador = z.union([
  z.strictObject({ ref: Ref, periodo: z.string().min(1).optional(), formato: Formato, decimales }),
  /** Cifra de un estudio atribuido: el valor del Dato de la atribución. */
  z.strictObject({ atribucion: z.literal(true), formato: Formato, decimales }),
]);
export type Marcador = z.infer<typeof Marcador>;

export const Criterio = z.strictObject({
  /** Término de valoración tal como aparece en el texto. */
  termino: z.string().trim().min(1),
  /** Definición verificable con datos o con la fuente atribuida (puede llevar marcadores). */
  definicion: z.string().trim().min(1),
});

/** Atribución de una interpretación a un documento publicado (excepción de fuentes del autor). */
export const Atribucion = AtribucionPublicacion;
export type Atribucion = z.infer<typeof Atribucion>;

export const Proyeccion = z.strictObject({
  /** Hipótesis de la proyección (legislación congelada o la del estudio). */
  hipotesis: z.string().trim().min(1),
  /** Si existen sensibilidades, el rango es obligatorio. */
  sensibilidades: z.boolean(),
  /** Nombres de los marcadores del extremo inferior y superior del rango. */
  rango: z.strictObject({ desde: z.string().min(1), hasta: z.string().min(1) }).optional(),
});

const NOMBRE_MARCADOR = /^[a-z][a-zA-Z0-9]*$/;

export const Interpretacion = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
    /** Registro de ejemplo: solo puede usarse en /diseno. */
    ejemplo: z.boolean().optional(),
    tipo: z.enum(TIPOS_INTERPRETACION),
    titulo: z.string().trim().min(1),
    /** Ruta de la página (sin almohadilla) y `id` del elemento interpretado (gráfico, tabla o cifra). */
    pagina: z.string().regex(/^\/[a-z0-9-]*$/),
    ancla: z.string().regex(/^[a-z][a-z0-9-]*$/),
    /** Texto con marcadores `{{nombre}}`. */
    texto: z.string().trim().min(1),
    marcadores: z.record(z.string().regex(NOMBRE_MARCADOR), Marcador),
    criterios: z.array(Criterio),
    datosQueLaSostienen: z.array(Ref).min(1, { error: 'datosQueLaSostienen no puede estar vacío' }),
    atribucion: Atribucion.optional(),
    proyeccion: Proyeccion.optional(),
    grado: z.enum(GRADOS_INTERPRETACION.map((g) => g.id) as [GradoInterpretacion]),
    estadoRevision: z.enum(ESTADOS_REVISION_INTERPRETACION),
    fechaRedaccion: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  })
  .superRefine((r, ctx) => {
    if (r.tipo === 'atribuida' && r.atribucion === undefined)
      ctx.addIssue({
        code: 'custom',
        message: 'La interpretación atribuida necesita atribución',
        path: ['atribucion'],
      });
    if (r.tipo === 'autor' && r.atribucion !== undefined)
      ctx.addIssue({
        code: 'custom',
        message: 'La interpretación del autor no lleva atribución',
        path: ['atribucion'],
      });
    if (r.atribucion?.dato.confidence === 'alta')
      ctx.addIssue({
        code: 'custom',
        message: 'Una fuente atribuida lleva confianza como máximo «media»',
        path: ['atribucion', 'dato', 'confidence'],
      });
  });
export type Interpretacion = z.infer<typeof Interpretacion>;

/** Funciones del motor que pueden sostener una interpretación o darle una cifra (hoy, ninguna). */
export const FUNCIONES_MOTOR_INTERPRETACION: Readonly<Record<string, () => number>> = {};

const MARCADOR_EN_TEXTO = /\{\{([a-zA-Z][a-zA-Z0-9]*)\}\}/g;

/** Nombres de los marcadores que aparecen en un texto, en orden. */
export function marcadoresEn(texto: string): string[] {
  return [...texto.matchAll(MARCADOR_EN_TEXTO)].map((m) => m[1] ?? '');
}

/** El texto sin sus marcadores (para buscar cifras escritas a mano). */
export function sinMarcadores(texto: string): string {
  return texto.replace(MARCADOR_EN_TEXTO, '');
}

export function formatearMarcador(valor: number, formato: FormatoMarcador, dec?: number): string {
  const op = dec === undefined ? {} : { decimales: dec };
  switch (formato) {
    case 'euros':
      return formatearEuros(valor, op);
    case 'porcentaje':
      return formatearPorcentaje(valor / 100, op);
    case 'fraccion-porcentaje':
      return formatearPorcentaje(valor, op);
    case 'numero':
      return formatearNumero(valor, op);
  }
}

/**
 * Lo que la página pone a disposición de la caja: el Dato de /data de cada referencia (en una serie,
 * el del periodo indicado o, si no se indica, el del último punto).
 */
export type ResolverDato = (ref: string, periodo?: string) => DatoTipo | undefined;

/** Valor numérico de un marcador; lanza si no se puede resolver. */
export function valorMarcador(
  r: Interpretacion,
  m: Marcador,
  resolver: ResolverDato,
  motor: Readonly<Record<string, () => number>> = FUNCIONES_MOTOR_INTERPRETACION,
): number {
  if ('atribucion' in m) {
    const v = r.atribucion?.dato.value;
    if (typeof v !== 'number') throw new RangeError(`${r.id}: la atribución no da una cifra`);
    return v;
  }
  if (PATRON_REF_MOTOR.test(m.ref)) {
    const f = motor[m.ref.slice('motor:'.length)];
    if (f === undefined) throw new RangeError(`${r.id}: función del motor desconocida ${m.ref}`);
    return f();
  }
  const d = resolver(m.ref, m.periodo);
  if (d === undefined || typeof d.value !== 'number')
    throw new RangeError(`${r.id}: marcador sin dato numérico (${m.ref})`);
  return d.value;
}

/** Sustituye cada `{{nombre}}` por su cifra formateada. */
export function resolverMarcadores(
  r: Interpretacion,
  texto: string,
  resolver: ResolverDato,
  motor?: Readonly<Record<string, () => number>>,
): string {
  return texto.replace(MARCADOR_EN_TEXTO, (_, nombre: string) => {
    const m = r.marcadores[nombre];
    if (m === undefined) throw new RangeError(`${r.id}: marcador sin definir {{${nombre}}}`);
    return formatearMarcador(valorMarcador(r, m, resolver, motor), m.formato, m.decimales);
  });
}

/** Rótulo visible de la caja: «Interpretación» o «Interpretación de [autores] ([año])». */
export function rotuloInterpretacion(r: Interpretacion): string {
  return r.atribucion === undefined
    ? 'Interpretación'
    : `Interpretación de ${r.atribucion.autores} (${String(r.atribucion.anio)})`;
}

/** Datos que sostienen la caja (los de /data y la fuente atribuida), para su línea de fuente. */
export function datosDeLaCaja(r: Interpretacion, resolver: ResolverDato): DatoTipo[] {
  const datos: DatoTipo[] = [];
  for (const ref of r.datosQueLaSostienen) {
    if (PATRON_REF_MOTOR.test(ref)) continue;
    const d = resolver(ref);
    if (d === undefined)
      throw new RangeError(`${r.id}: dato que la sostiene sin resolver (${ref})`);
    datos.push(d);
  }
  if (r.atribucion !== undefined) datos.push(r.atribucion.dato);
  return datos;
}
