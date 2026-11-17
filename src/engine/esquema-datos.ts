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

/**
 * Naturaleza de un dato (Fase 5-B1). Distingue lo que mide una fuente (`observado`), lo que se
 * calcula a partir de datos observados (`derivado`), la proyección que publica una institución
 * (`proyeccion-publicada`: INE, Ageing Report) y lo que produce un modelo propio con supuestos
 * explícitos (`proyeccion-de-modelo`). Es opcional en los datos anteriores a la Fase 5-B1, que se
 * entienden `observado` o `derivado` según sus notas; es obligatoria en los ficheros de
 * `data/proyecciones/` y la interfaz la muestra siempre junto a la fuente.
 */
export const NATURALEZAS = [
  'observado',
  'derivado',
  'proyeccion-publicada',
  'proyeccion-de-modelo',
] as const;
export const Naturaleza = z.enum(NATURALEZAS, {
  error:
    'naturaleza debe ser "observado", "derivado", "proyeccion-publicada" o "proyeccion-de-modelo"',
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
  /** Naturaleza del dato; solo es obligatoria en las proyecciones de modelo. */
  naturaleza: Naturaleza.optional(),
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
    naturaleza: Naturaleza.optional(),
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

/**
 * Estado de la revisión actuarial de una afirmación:
 * `pendiente` (requiere criterio actuarial y no se ha revisado), `revisada`, `rechazada` o
 * `no-requiere` (transcripción literal de una norma o de una cifra publicada, contrastada con su fuente).
 */
export const EstadoRevisionActuarial = z.enum([
  'pendiente',
  'revisada',
  'rechazada',
  'no-requiere',
]);

/** Referencia a la respuesta actuarial de una afirmación revisada (tanda, parte y número de pregunta). */
export const PATRON_RESPUESTA_ACTUARIAL =
  /^(?:Tanda [1-9], parte [A-C], n\.º [1-9]\d*|Revisión del 14-11-2026)(?:\. .+)?$/;

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
  /**
   * Si se omite, vale `revisionActuarialPorDefecto` del registro: así el resto de afirmaciones se
   * marca «no requiere revisión actuarial» sin tocarlas una a una.
   */
  revisionActuarial: EstadoRevisionActuarial.optional(),
  /** Qué debe comprobar el actuario y con qué dato o fórmula (obligatoria si la revisión está pendiente). */
  preguntaActuarial: textoObligatorio('preguntaActuarial').optional(),
  /**
   * Referencia a la respuesta actuarial que respalda el estado «revisada» (obligatoria en ese caso):
   * «Tanda 3, parte A, n.º 31» (docs/revision-actuarial/respuestas-tanda3-A.md) o, para las
   * revisadas en rondas anteriores, «Revisión del 14-11-2026». Puede seguir un punto y el matiz.
   */
  respuestaActuarial: z
    .string()
    .regex(PATRON_RESPUESTA_ACTUARIAL, {
      error:
        'respuestaActuarial debe empezar por «Tanda N, parte X, n.º M» o «Revisión del 14-11-2026»',
    })
    .optional(),
  notas: z.string().trim().min(1).optional(),
});

export const RegistroAfirmaciones = z
  .strictObject({
    version: z.literal(1),
    descripcion: z.string().optional(),
    /** Estado de revisión actuarial de las afirmaciones que no lo indican. Por defecto, `pendiente`. */
    revisionActuarialPorDefecto: EstadoRevisionActuarial.optional(),
    claims: z.array(Afirmacion),
  })
  .superRefine((registro, ctx) => {
    const porDefecto = registro.revisionActuarialPorDefecto ?? 'pendiente';
    registro.claims.forEach((claim, i) => {
      const estado = claim.revisionActuarial ?? porDefecto;
      if (estado === 'pendiente' && claim.preguntaActuarial === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `La afirmación ${claim.id} está pendiente de revisión actuarial y no tiene preguntaActuarial`,
          path: ['claims', i, 'preguntaActuarial'],
        });
      }
      if (estado === 'revisada' && claim.respuestaActuarial === undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `La afirmación ${claim.id} está revisada y no tiene respuestaActuarial (tanda, parte y número de la respuesta)`,
          path: ['claims', i, 'respuestaActuarial'],
        });
      }
      if (estado !== 'revisada' && claim.respuestaActuarial !== undefined) {
        ctx.addIssue({
          code: 'custom',
          message: `La afirmación ${claim.id} lleva respuestaActuarial pero su revisión no es «revisada»`,
          path: ['claims', i, 'respuestaActuarial'],
        });
      }
    });
  });

// ---------------------------------------------------------------------------
// Catálogo de afirmaciones circulantes («mitos»): datos y definiciones, sin veredicto
// ---------------------------------------------------------------------------

/** Referencia a un fichero de /data («carpeta/fichero.json») o a un elemento («carpeta/fichero.json#id»). */
export const PATRON_REFERENCIA_FICHERO =
  /^[a-z0-9-]+\/[a-z0-9-]+\.json(?:#[a-z0-9]+(?:[-_.][a-z0-9]+)*)?$/;

const ReferenciaFichero = z.string().regex(PATRON_REFERENCIA_FICHERO, {
  error: 'Referencia con formato no válido (carpeta/fichero.json o carpeta/fichero.json#id)',
});

export const Definicion = z.strictObject({
  nombre: textoObligatorio('definicion.nombre'),
  /** Cómo se mide, con las palabras de la fuente o una explicación neutral. */
  literal: textoObligatorio('definicion.literal'),
  datos: z.array(ReferenciaFichero).optional(),
});

export const Mito = z
  .strictObject({
    id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
    /** Afirmación tal como circula, formulada de forma neutral. */
    enunciado: textoObligatorio('enunciado'),
    datos: z.array(ReferenciaFichero).min(1, { error: 'Cada afirmación necesita datos de /data' }),
    definiciones: z
      .array(Definicion)
      .min(1, { error: 'Cada afirmación necesita definiciones alternativas' }),
    noSePuedeConcluir: z.array(textoObligatorio('noSePuedeConcluir')).min(1),
    /** Datos que harían falta y no están en /data (se anotan también en docs/PENDIENTE_DATOS.md). */
    faltan: z.array(textoObligatorio('faltan')).optional(),
    /** `pendiente` o `revisada` (con `respuestaActuarial`); el resto de estados no se usan en el catálogo. */
    revisionActuarial: z.enum(['pendiente', 'revisada']),
    /** Pregunta que se hizo al actuario (se conserva aunque la afirmación pase a revisada). */
    preguntaActuarial: textoObligatorio('preguntaActuarial'),
    respuestaActuarial: z.string().regex(PATRON_RESPUESTA_ACTUARIAL).optional(),
  })
  .superRefine((m, ctx) => {
    if ((m.revisionActuarial === 'revisada') !== (m.respuestaActuarial !== undefined)) {
      ctx.addIssue({
        code: 'custom',
        message: `La afirmación ${m.id}: respuestaActuarial es obligatoria si y solo si está revisada`,
        path: ['respuestaActuarial'],
      });
    }
  });

export const ArchivoMitos = z.strictObject({
  tipo: z.literal('mitos'),
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  title: textoObligatorio('title'),
  description: textoObligatorio('description'),
  mitos: z
    .array(Mito)
    .min(10, { error: 'El catálogo debe tener entre 10 y 12 afirmaciones' })
    .max(12),
});
export type ArchivoMitos = z.infer<typeof ArchivoMitos>;

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

export const ColumnaTabla = z.strictObject({
  id: z.string().regex(/^[a-z0-9_]+$/, { error: 'id de columna con formato no válido' }),
  descripcion: textoObligatorio('columna.descripcion'),
  /** Unidad de la columna; `null` para identificadores y categorías. */
  unidad: z.string().trim().min(1).nullable(),
});

/** Fichero de origen de una parte de la tabla (por periodo): URL, descarga y huella. */
export const OrigenTabla = z.strictObject({
  period: Periodo,
  url: z.url({ protocol: /^https?$/, error: 'origen.url debe ser una URL http(s) válida' }),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, { error: 'sha256 no válido' }),
});

/**
 * Tabla grande (p. ej. edad × año × clase): un CSV en /data y este JSON hermano con el mismo
 * nombre base, que lleva título, descripción, columnas, fuente, fecha de descarga y confianza.
 */
export const ArchivoTabla = z.strictObject({
  tipo: z.literal('tabla'),
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  title: textoObligatorio('title'),
  description: textoObligatorio('description'),
  columnas: z.array(ColumnaTabla).min(2),
  filas: z.number().int().positive(),
  source: Fuente,
  origenes: z.array(OrigenTabla).optional(),
  fetchedAt: FechaDescarga,
  confidence: Confianza,
  notes: z.string().trim().min(1).optional(),
});

// ---------------------------------------------------------------------------
// Salidas de modelos propios (Fase 5-B1): proyecciones, no observaciones
// ---------------------------------------------------------------------------

export const MODELOS_PROYECCION = ['m1', 'm2', 'm3', 'm4'] as const;

/** Columna de una salida de modelo: cada celda de `filas` es un número o un texto según `tipo`. */
export const ColumnaProyeccion = z.strictObject({
  id: z.string().regex(/^[a-z0-9_%-]+$/, { error: 'id de columna con formato no válido' }),
  descripcion: textoObligatorio('columna.descripcion'),
  tipo: z.enum(['numero', 'texto']),
  /** Unidad de la columna; `null` para identificadores y categorías. */
  unidad: z.string().trim().min(1).nullable(),
});

/**
 * Escenario con el que se ejecutó el modelo: crecimiento real de los salarios (`g`), IPC (ambos como
 * fracción: 0,01 = 1 %) y legislación congelada. Se lee del LEEME de las salidas.
 */
export const EscenarioProyeccion = z.strictObject({
  g: z.number({ error: 'escenario.g debe ser un número' }),
  ipc: z.number({ error: 'escenario.ipc debe ser un número' }),
  legislacion: z.literal('congelada', { error: 'escenario.legislacion debe ser "congelada"' }),
  /** Frase del LEEME que lo describe, tal cual. */
  literal: textoObligatorio('escenario.literal'),
  /** Qué parte del escenario influye en esta salida (según la descripción del modelo). */
  aplicacion: textoObligatorio('escenario.aplicacion'),
});

/** Procedencia del CSV que generó el fichero: ruta, huella y versión del código del modelo. */
export const OrigenProyeccion = z.strictObject({
  csv: textoObligatorio('origen.csv'),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, { error: 'sha256 no válido' }),
  /** Último commit que modifica `modelos/`, según el LEEME. */
  commitModelos: z
    .string()
    .regex(/^[0-9a-f]{40}$/, { error: 'commitModelos debe ser el hash completo' }),
  leeme: textoObligatorio('origen.leeme'),
  /** Huella SHA-256 del LEEME (solo en las salidas que la registran). */
  leemeSha256: z
    .string()
    .regex(/^[0-9a-f]{64}$/, { error: 'leemeSha256 no válido' })
    .optional(),
  /** Fecha de ejecución de los modelos, según el LEEME (AAAA-MM-DD). */
  ejecutadoEl: z.iso.date({ error: 'ejecutadoEl debe ser una fecha AAAA-MM-DD' }),
});

export const ModeloProyeccion = z.strictObject({
  id: z.enum(MODELOS_PROYECCION),
  nombre: textoObligatorio('modelo.nombre'),
  /** Descripción del modelo en el repositorio (docs/modelos/Mx_descripcion.md). */
  descripcion: textoObligatorio('modelo.descripcion'),
  /**
   * Último año hasta el que el modelo se presenta como resultado; lo posterior es ilustrativo
   * (solo M1; se lee de su descripción).
   */
  horizontePresentacion: z.number().int().optional(),
  /** Año de los euros reales de la salida (solo M2; se lee del nombre de la columna). */
  anioBaseReal: z.number().int().optional(),
});

/** Un escenario de una salida con varios (columna `escenario`): sus dos hipótesis, como fracción (0,01 = 1 %). */
export const EscenarioDeSalida = z.strictObject({
  id: z.string().regex(/^[a-z0-9]+$/, { error: 'id de escenario con formato no válido' }),
  g: z.number({ error: 'escenarios.g debe ser un número' }),
  ipc: z.number({ error: 'escenarios.ipc debe ser un número' }),
});

/**
 * Un caso de sensibilidad de una salida (columna `escenario`): cambia una sola palanca respecto al
 * escenario base. `parametro` es la descripción del cambio tal cual la da el LEEME de la salida.
 */
export const SensibilidadDeSalida = z.strictObject({
  id: z.string().regex(/^[a-z0-9_]+$/, { error: 'id de sensibilidad con formato no válido' }),
  parametro: textoObligatorio('sensibilidades.parametro'),
});

/**
 * Fila de un año observado que acompaña a las filas calculadas por el modelo (M4, escenarios): no la
 * calcula el modelo, son datos de la ejecución del presupuesto y de las estadísticas, iguales en todos los
 * escenarios. No lleva celdas vacías: las columnas sin equivalente observado no constan en `valores`.
 */
export const FilaObservadaProyeccion = z.strictObject({
  anio: z.number().int(),
  /** Cómo se obtiene cada magnitud, tal cual lo dice el LEEME de la salida. */
  descripcion: z.array(textoObligatorio('filaObservada.descripcion')).min(1),
  /** Valor de cada columna numérica (id de columna → valor). */
  valores: z.record(z.string(), z.number()),
});

/**
 * Salida de un modelo propio (M1, M2, M3 o M4), una tabla por CSV. No es un dato observado: lleva
 * `naturaleza: "proyeccion-de-modelo"`, el escenario, el commit del código y la huella del CSV.
 * `validate:data` exige este esquema a todo fichero de `data/proyecciones/`.
 */
export const ArchivoProyeccion = z
  .strictObject({
    tipo: z.literal('proyeccion'),
    id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
    title: textoObligatorio('title'),
    description: textoObligatorio('description'),
    naturaleza: z.literal('proyeccion-de-modelo', {
      error: 'Toda salida de modelo debe llevar naturaleza: "proyeccion-de-modelo"',
    }),
    modelo: ModeloProyeccion,
    escenario: EscenarioProyeccion,
    source: Fuente,
    fetchedAt: FechaDescarga,
    confidence: Confianza,
    origen: OrigenProyeccion,
    /** Solo en las salidas con varios escenarios: lista de escenarios (la columna `escenario` los identifica). */
    escenarios: z.array(EscenarioDeSalida).min(2).optional(),
    /** Solo en las salidas de sensibilidades (M4): casos en el orden del LEEME, una palanca cada vez respecto al base. */
    sensibilidades: z.array(SensibilidadDeSalida).min(2).optional(),
    /** Si el autor ha reproducido en local la salida (las que ejecutó otra persona o Claude llevan `false`). */
    reproduccionLocalPorAutor: z.boolean().optional(),
    /** Palancas que valen igual en todos los escenarios, tal cual las recoge el LEEME. */
    parametrosComunes: z.array(textoObligatorio('parametrosComunes')).min(1).optional(),
    /** Año observado que antecede a las filas calculadas (solo M4, escenarios). */
    filaObservada: FilaObservadaProyeccion.optional(),
    columnas: z.array(ColumnaProyeccion).min(2),
    filas: z.array(z.array(z.union([z.number(), z.string()]))).min(1),
    notes: z.string().trim().min(1).optional(),
  })
  .superRefine((archivo, ctx) => {
    const lista = archivo.escenarios ?? archivo.sensibilidades;
    if (archivo.escenarios && archivo.sensibilidades) {
      ctx.addIssue({
        code: 'custom',
        message: 'Un fichero no puede llevar «escenarios» y «sensibilidades» a la vez',
        path: ['sensibilidades'],
      });
    }
    if (lista) {
      const iColumna = archivo.columnas.findIndex((c) => c.id === 'escenario');
      const ids = new Set(lista.map((e) => e.id));
      if (ids.size !== lista.length) {
        ctx.addIssue({
          code: 'custom',
          message: 'Hay escenarios o sensibilidades repetidos',
          path: ['escenarios'],
        });
      }
      if (iColumna < 0) {
        ctx.addIssue({
          code: 'custom',
          message:
            'Un fichero con «escenarios» o «sensibilidades» necesita una columna «escenario»',
          path: ['columnas'],
        });
      } else {
        archivo.filas.forEach((fila, i) => {
          if (!ids.has(String(fila[iColumna]))) {
            ctx.addIssue({
              code: 'custom',
              message: `La fila ${i} es de un escenario que no figura en «escenarios» ni en «sensibilidades»`,
              path: ['filas', i, iColumna],
            });
          }
        });
      }
    }
    if (archivo.filaObservada) {
      const numericas = new Set(
        archivo.columnas.filter((c) => c.tipo === 'numero').map((c) => c.id),
      );
      for (const [id, valor] of Object.entries(archivo.filaObservada.valores)) {
        if (!numericas.has(id) || !Number.isFinite(valor)) {
          ctx.addIssue({
            code: 'custom',
            message: `«${id}» de la fila observada no es una columna numérica o no es finito`,
            path: ['filaObservada', 'valores', id],
          });
        }
      }
    }
    archivo.filas.forEach((fila, i) => {
      if (fila.length !== archivo.columnas.length) {
        ctx.addIssue({
          code: 'custom',
          message: `La fila ${i} tiene ${fila.length} celdas y hay ${archivo.columnas.length} columnas`,
          path: ['filas', i],
        });
        return;
      }
      archivo.columnas.forEach((columna, j) => {
        const celda = fila[j];
        const esperado = columna.tipo === 'numero' ? 'number' : 'string';
        if (typeof celda !== esperado || (typeof celda === 'number' && !Number.isFinite(celda))) {
          ctx.addIssue({
            code: 'custom',
            message: `La celda «${columna.id}» de la fila ${i} debe ser ${columna.tipo === 'numero' ? 'un número finito' : 'un texto'}`,
            path: ['filas', i, j],
          });
        }
      });
    });
  });

// ---------------------------------------------------------------------------
// Personas-ejemplo de «Tu pensión» (ilustrativas, elaboración propia)
// ---------------------------------------------------------------------------

/** Referencia de base de un tramo de una persona-ejemplo: una serie de /data o un periodo sin cotizar. */
export const REFERENCIAS_PERSONA = ['minima', 'media', 'maxima', 'sin-cotizar'] as const;

/**
 * Tramo de una persona-ejemplo. Los tramos se encadenan desde el inicio de la cotización: cada uno
 * dura `anios` años o, si es el último, llega hasta el mes anterior a la jubilación.
 */
export const TramoPersona = z
  .strictObject({
    referencia: z.enum(REFERENCIAS_PERSONA, { error: 'referencia de tramo desconocida' }),
    anios: z.number().int().positive().optional(),
    hastaJubilacion: z.literal(true).optional(),
  })
  .refine((t) => (t.anios === undefined) !== (t.hastaJubilacion === undefined), {
    error: 'Un tramo lleva «anios» o «hastaJubilacion», no ambos ni ninguno',
  });

/**
 * Persona-ejemplo: perfil **ilustrativo** (`ilustrativo: true`), de elaboración propia. Sus cifras
 * (edad de inicio, duraciones) son convenciones de la ilustración, no estadísticas de población, y
 * por eso llevan fuente «elaboración propia» y confianza adecuada. Las bases no están aquí: se
 * toman de las series de /data (mínima, media o máxima) al aplicarlas a unas fechas concretas.
 */
export const PersonaEjemplo = z
  .strictObject({
    id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
    nombre: textoObligatorio('nombre'),
    descripcion: textoObligatorio('descripcion'),
    ilustrativo: z.literal(true, { error: 'Toda persona-ejemplo debe llevar ilustrativo: true' }),
    /** Edad (en años cumplidos) a la que empieza a cotizar. */
    edadInicio: z.number().int().positive(),
    tramos: z.array(TramoPersona).min(1),
    source: Fuente,
    fetchedAt: FechaDescarga,
    confidence: Confianza,
  })
  .superRefine((persona, ctx) => {
    persona.tramos.forEach((t, i) => {
      if (t.hastaJubilacion === true && i !== persona.tramos.length - 1) {
        ctx.addIssue({
          code: 'custom',
          message: '«hastaJubilacion» solo puede ir en el último tramo',
          path: ['tramos', i],
        });
      }
    });
    if (persona.tramos.every((t) => t.referencia === 'sin-cotizar')) {
      ctx.addIssue({
        code: 'custom',
        message: 'La persona debe cotizar en algún tramo',
        path: ['tramos'],
      });
    }
  });

export const ArchivoPersonas = z.strictObject({
  tipo: z.literal('personas'),
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  title: textoObligatorio('title'),
  description: textoObligatorio('description'),
  personas: z
    .array(PersonaEjemplo)
    .min(3, { error: 'Entre tres y cinco personas-ejemplo' })
    .max(5, { error: 'Entre tres y cinco personas-ejemplo' }),
});
export type ArchivoPersonas = z.infer<typeof ArchivoPersonas>;
export type PersonaEjemplo = z.infer<typeof PersonaEjemplo>;

// ---------------------------------------------------------------------------
// Ejemplos de cálculo de «Cómo se calcula» (ilustrativos, elaboración propia)
// ---------------------------------------------------------------------------

const MesCarrera = z
  .string()
  .regex(/^\d{4}-(0[1-9]|1[0-2])$/, { error: 'Mes con formato AAAA-MM' });
const FechaCompleta = z.string().regex(/^\d{4}-(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/, {
  error: 'Fecha con formato AAAA-MM-DD',
});

const TramoEjemplo = z.strictObject({
  desde: MesCarrera,
  hasta: MesCarrera,
  baseMensual: z.number().positive(),
});
const CarreraEjemplo = z.array(TramoEjemplo).min(1);

const CausanteEjemplo = z.strictObject({
  fechaFallecimiento: FechaCompleta,
  causa: z.enum(['enfermedad-comun', 'accidente-no-laboral']),
  situacion: z.literal('alta'),
  carrera: CarreraEjemplo,
});

const camposComunesEjemplo = {
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  titulo: textoObligatorio('titulo'),
  descripcion: textoObligatorio('descripcion'),
  ilustrativo: z.literal(true, { error: 'Todo ejemplo debe llevar ilustrativo: true' }),
  /** Caso de oro del que procede (fichero de tests del motor e identificador del caso). */
  casoOro: z.strictObject({
    fichero: textoObligatorio('casoOro.fichero'),
    id: textoObligatorio('casoOro.id'),
  }),
  /** Variación del IPC supuesta para los años sin dato (fracción anual), si el cálculo la necesita. */
  escenarioIpc: z.number().min(0).max(0.2).optional(),
  source: Fuente,
  fetchedAt: FechaDescarga,
  confidence: Confianza,
};

export const EjemploJubilacion = z.strictObject({
  ...camposComunesEjemplo,
  prestacion: z.literal('jubilacion'),
  entrada: z.strictObject({
    carrera: CarreraEjemplo,
    nacimiento: FechaCompleta,
    fechaJubilacion: FechaCompleta,
    modalidad: z.enum([
      'ordinaria',
      'anticipada-voluntaria',
      'anticipada-involuntaria',
      'demorada',
    ]),
    opciones: z
      .strictObject({
        actualizarBases: z.boolean().optional(),
        usarOpcion25Anos: z.boolean().optional(),
      })
      .optional(),
  }),
});
export const EjemploIncapacidad = z.strictObject({
  ...camposComunesEjemplo,
  prestacion: z.literal('incapacidad'),
  entrada: z.strictObject({
    carrera: CarreraEjemplo,
    nacimiento: FechaCompleta,
    fechaHechoCausante: FechaCompleta,
    grado: z.enum(['parcial', 'total', 'absoluta', 'gran-incapacidad']),
    origen: z.enum(['enfermedad-comun', 'accidente-no-laboral']),
    opciones: z.strictObject({ actualizarBases: z.boolean().optional() }).optional(),
  }),
});
export const EjemploViudedad = z.strictObject({
  ...camposComunesEjemplo,
  prestacion: z.literal('viudedad'),
  entrada: z.strictObject({
    causante: CausanteEjemplo,
    viudo: z.strictObject({
      vinculo: z.literal('conyuge'),
      nacimiento: FechaCompleta,
      fechaMatrimonio: FechaCompleta,
      cargasFamiliares: z
        .strictObject({
          miembrosUnidadFamiliar: z.number().int().positive(),
          rendimientosEjercicioAnteriorUnidadFamiliar: z.number().nonnegative(),
        })
        .optional(),
    }),
  }),
});
export const EjemploOrfandad = z.strictObject({
  ...camposComunesEjemplo,
  prestacion: z.literal('orfandad'),
  entrada: z.strictObject({
    causante: CausanteEjemplo,
    huerfanos: z.array(z.strictObject({ nacimiento: FechaCompleta })).min(1),
    opciones: z.strictObject({ orfandadAbsoluta: z.boolean().optional() }).optional(),
  }),
});

export const EjemploCalculo = z.discriminatedUnion('prestacion', [
  EjemploJubilacion,
  EjemploIncapacidad,
  EjemploViudedad,
  EjemploOrfandad,
]);

export const ArchivoEjemplosCalculo = z.strictObject({
  tipo: z.literal('ejemplos-calculo'),
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  title: textoObligatorio('title'),
  description: textoObligatorio('description'),
  /** Nota visible en la página: los ejemplos son supuestos, no datos observados. */
  nota: textoObligatorio('nota'),
  ejemplos: z.array(EjemploCalculo).min(8).max(20),
});
export type ArchivoEjemplosCalculo = z.infer<typeof ArchivoEjemplosCalculo>;
export type EjemploCalculo = z.infer<typeof EjemploCalculo>;

// ---------------------------------------------------------------------------
// Extracciones de PDF (Fase 5-A3): cada cifra con su referencia y la huella del documento
// ---------------------------------------------------------------------------

/** PDF de origen de una extracción: ruta, huella SHA-256, número de páginas y ejercicio. */
export const OrigenPdf = z.strictObject({
  fichero: textoObligatorio('origen.fichero'),
  sha256: z.string().regex(/^[0-9a-f]{64}$/, { error: 'sha256 no válido' }),
  paginas: z.number().int().positive(),
  ejercicio: z.number().int().min(1900).max(2100),
});

/** Resultado de las validaciones de una tabla de un PDF (sumas y coherencia). */
export const ValidacionTablaPdf = z.strictObject({
  ejercicio_pdf: z.number().int(),
  tabla: textoObligatorio('validacion.tabla'),
  tipo_pagina: textoObligatorio('validacion.tipo_pagina'),
  comprobaciones: z.number().int().nonnegative(),
  incorrectas: z.number().int().nonnegative(),
});

/** Diferencia entre dos PDF para la misma cifra (el PDF de un ejercicio y la comparativa del siguiente). */
export const DiferenciaEntrePdf = z.strictObject({
  ejercicio: z.number().int(),
  tabla: textoObligatorio('diferencia.tabla'),
  partida: textoObligatorio('diferencia.partida'),
  valor_pdf_propio: z.number(),
  valor_pdf_siguiente: z.number(),
  diferencia: z.number(),
  pdf_propio: z.number().int(),
  paginas_propias: z.array(z.number().int().positive()).min(1),
  pdf_siguiente: z.number().int(),
  paginas_siguiente: z.array(z.number().int().positive()).min(1),
});

/** Comprobación específica de una extracción (reclasificaciones, relaciones entre cifras de tablas distintas). */
export const ComprobacionEspecificaPdf = z.strictObject({
  id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
  descripcion: textoObligatorio('comprobacion.descripcion'),
  esperado: z.number(),
  obtenido: z.number(),
  diferencia: z.number(),
  tolerancia: z.number().nonnegative(),
  ok: z.boolean(),
});

/** Columnas que toda extracción de PDF lleva en su CSV para que cada valor sea rastreable. */
export const COLUMNAS_EXTRACCION_PDF = ['fichero', 'sha256', 'pagina'] as const;

/**
 * Extracción de las tablas de un PDF (liquidaciones, declaraciones): un CSV con una fila por cifra
 * (con fichero, huella, página y localización) y este JSON hermano con la fuente, la fecha de
 * descarga, la confianza, la naturaleza, la tolerancia de redondeo, los PDF de origen con su huella y
 * el resultado de las validaciones. Las cifras de una extracción son siempre observadas.
 */
export const ArchivoExtraccionPdf = z
  .strictObject({
    tipo: z.literal('extraccion-pdf'),
    id: z.string().regex(PATRON_ID, { error: 'id con formato no válido' }),
    title: textoObligatorio('title'),
    description: textoObligatorio('description'),
    columnas: z.array(ColumnaTabla).min(2),
    filas: z.number().int().positive(),
    source: Fuente,
    fetchedAt: FechaDescarga,
    confidence: Confianza,
    naturaleza: z.literal('observado', {
      error: 'Una extracción de PDF contiene cifras observadas: naturaleza debe ser «observado»',
    }),
    unidad: textoObligatorio('unidad'),
    notes: z.string().trim().min(1).optional(),
    tolerancia: textoObligatorio('tolerancia'),
    origenes: z.array(OrigenPdf).min(1, { error: 'Falta al menos un PDF de origen con su huella' }),
    resumenValidaciones: z.record(z.string(), z.number()),
    validacionesPorTabla: z.array(ValidacionTablaPdf).min(1),
    comprobacionesEspecificas: z.array(ComprobacionEspecificaPdf).optional(),
    resumenContrasteEntrePdf: z.record(z.string(), z.number()).optional(),
    diferenciasEntrePdf: z.array(DiferenciaEntrePdf).optional(),
  })
  .superRefine((archivo, ctx) => {
    const ids = new Set(archivo.columnas.map((c) => c.id));
    for (const requerida of COLUMNAS_EXTRACCION_PDF) {
      if (!ids.has(requerida)) {
        ctx.addIssue({
          code: 'custom',
          message: `Falta la columna «${requerida}»: cada cifra debe llevar su referencia al PDF`,
          path: ['columnas'],
        });
      }
    }
  });

export type ArchivoExtraccionPdf = z.infer<typeof ArchivoExtraccionPdf>;
export type ArchivoTabla = z.infer<typeof ArchivoTabla>;
export type ArchivoProyeccion = z.infer<typeof ArchivoProyeccion>;
export type FilaObservadaProyeccion = z.infer<typeof FilaObservadaProyeccion>;
export type Naturaleza = z.infer<typeof Naturaleza>;
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
