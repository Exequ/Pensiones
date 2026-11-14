/**
 * Índice de las secciones de la web. Cada sección tiene su módulo en
 * src/modules/<slug>/. Aquí solo hay metadatos (sin componentes) para que la
 * navegación pueda importarlos sin dependencias circulares.
 *
 * Los textos describen qué contendrá cada sección: no incluyen cifras.
 */
export interface Seccion {
  /** Ruta, sin barra inicial. */
  readonly slug: string;
  /** Título completo de la página. */
  readonly titulo: string;
  /** Texto corto para la navegación. */
  readonly tituloNav: string;
  /** Resumen de una frase para el índice y la entradilla. */
  readonly resumen: string;
  /** Contenidos previstos (se muestran mientras la sección está en construcción). */
  readonly previsto: readonly string[];
}

export const SECCIONES = [
  {
    slug: 'tu-pension',
    titulo: 'Tu pensión',
    tituloNav: 'Tu pensión',
    resumen:
      'Un simulador orientativo para estimar una pensión de jubilación ordinaria o de incapacidad permanente a partir de tu trayectoria, con el cálculo explicado paso a paso y los supuestos a la vista.',
    previsto: [
      'Jubilación ordinaria con una carrera simple: fecha de inicio, meses sin cotizar y base constante (disponible).',
      'Carrera por tramos y personas de ejemplo.',
      'Incapacidad permanente por enfermedad común y accidente no laboral, con el cálculo explicado y las lecturas abiertas a la vista (disponible).',
      'Supuestos explícitos y modificables: lecturas abiertas, bases de cotización, lagunas.',
      'Comparación entre jubilación anticipada, ordinaria y demorada.',
      'Qué no tiene en cuenta el cálculo y por qué el resultado es orientativo (disponible).',
    ],
  },
  {
    slug: 'tipos-de-pension',
    titulo: 'Tipos de pensión',
    tituloNav: 'Tipos de pensión',
    resumen:
      'Qué prestaciones existen, quién puede cobrarlas y qué requisitos exige cada una, tanto en la modalidad contributiva como en la no contributiva.',
    previsto: [
      'Pensiones contributivas: jubilación, incapacidad permanente, viudedad, orfandad y en favor de familiares.',
      'Pensiones no contributivas y su relación con otras prestaciones asistenciales.',
      'Requisitos de acceso y cuantías mínimas y máximas, con su fuente normativa.',
      'Cuántas pensiones hay de cada tipo y cuál es su cuantía media.',
    ],
  },
  {
    slug: 'como-se-calcula',
    titulo: 'Cómo se calcula',
    tituloNav: 'Cómo se calcula',
    resumen:
      'Paso a paso, de la base reguladora a la pensión inicial: años cotizados, edad de jubilación, coeficientes y complementos, y cómo se revaloriza después.',
    previsto: [
      'La base reguladora: qué bases entran y cómo se actualizan.',
      'El porcentaje según los años cotizados.',
      'Edad de jubilación, coeficientes reductores por anticipo e incentivos por demora.',
      'Complementos, pensión mínima y pensión máxima.',
      'La revalorización anual de las pensiones en curso.',
    ],
  },
  {
    slug: 'reformas',
    titulo: 'Reformas',
    tituloNav: 'Reformas',
    resumen:
      'Cronología de las reformas del sistema y de lo que cambió cada una, con el texto normativo enlazado.',
    previsto: [
      'Línea temporal de las reformas, desde el Pacto de Toledo hasta las más recientes.',
      'Qué parámetros cambió cada reforma y con qué calendario de aplicación.',
      'Efectos estimados según las evaluaciones publicadas, con sus distintas metodologías.',
    ],
  },
  {
    slug: 'financiacion-y-deficit',
    titulo: 'Financiación y déficit',
    tituloNav: 'Financiación y déficit',
    resumen:
      'De dónde sale el dinero de las pensiones, cuánto aportan las cotizaciones y el Estado, y qué se entiende por déficit según la definición que se use, con las cifras publicadas y su evolución.',
    previsto: [
      'Ingresos y gastos no financieros del Sistema, en millones de euros y como porcentaje del PIB (disponible).',
      'Ingresos por cotizaciones y transferencias del Estado (disponible).',
      'Gasto en pensiones contributivas por clase, con el complemento a mínimos aparte (disponible).',
      'Distintas definiciones de déficit y qué incluye cada una, lado a lado (disponible).',
      'Gastos impropios: cifras de la fuente y qué cambia en el saldo según se cuenten o no (disponible).',
      'Gasto en pensiones sobre el PIB según varias medidas (disponible).',
      'Desglose de las transferencias del Estado por finalidad y gasto de Clases Pasivas: sin datos descargados todavía.',
    ],
  },
  {
    slug: 'hucha',
    titulo: 'La «hucha» de las pensiones',
    tituloNav: 'La «hucha»',
    resumen:
      'El Fondo de Reserva de la Seguridad Social: para qué se creó, cómo se ha dotado y cómo se ha usado, y cuántos meses de gasto en pensiones representa su valor.',
    previsto: [
      'Evolución del valor del Fondo de Reserva (disponible).',
      'Dotaciones y disposiciones, año a año (disponible).',
      'Meses de gasto en pensiones que equivale el Fondo, con dos definiciones de gasto (disponible).',
      'Reglas de dotación y de disposición, con el límite de desembolso por porcentaje del PIB (disponible).',
      'Su relación con el Mecanismo de Equidad Intergeneracional (disponible).',
    ],
  },
  {
    slug: 'cotizantes-y-pensionistas',
    titulo: 'Cotizantes y pensionistas',
    tituloNav: 'Cotizantes/pensionistas',
    resumen:
      'La relación entre quienes cotizan y quienes cobran una pensión, cómo se mide y qué cambia según el numerador y el denominador elegidos, con la evolución histórica y la situación actual.',
    previsto: [
      'Evolución de afiliados, pensiones y pensionistas (disponible).',
      'Relación entre afiliados y pensiones, y entre afiliados y pensionistas, con todas las definiciones disponibles (disponible).',
      'Pensión media por clase, en euros corrientes y constantes (disponible).',
      'Pensiones en vigor por clase, sexo y edad, y afiliados por edad (disponible).',
      'Altas y bajas de pensiones (disponible).',
      'Proyecciones demográficas publicadas: pendiente de una fase posterior.',
      'Por qué la ratio por sí sola no explica la situación financiera del sistema (se explica en cada gráfico).',
    ],
  },
  {
    slug: 'otros-sistemas',
    titulo: 'Otros sistemas',
    tituloNav: 'Otros sistemas',
    resumen:
      'Cómo se organizan las pensiones en otros países: reparto, capitalización, cuentas nocionales y modelos mixtos.',
    previsto: [
      'Reparto y capitalización: en qué se diferencian.',
      'Cuentas nocionales: cómo funcionan y dónde se aplican.',
      'Comparación de indicadores con otros países europeos, con definiciones homogéneas.',
    ],
  },
  {
    slug: 'mitos-y-realidades',
    titulo: 'Mitos y realidades',
    tituloNav: 'Mitos y realidades',
    resumen:
      'Afirmaciones frecuentes sobre las pensiones, contrastadas con los datos y con sus matices.',
    previsto: [
      'Cada afirmación, con los datos que la apoyan o la contradicen.',
      'Definiciones alternativas cuando el resultado depende de cómo se mida.',
      'Enlace a las fuentes originales de cada dato.',
    ],
  },
  {
    slug: 'metodologia',
    titulo: 'Metodología',
    tituloNav: 'Metodología',
    resumen:
      'Cómo se obtienen, revisan y presentan los datos de esta web: fuentes, criterios, definiciones y niveles de confianza.',
    previsto: [
      'Criterios de selección de fuentes y fecha de descarga de cada dato.',
      'Conversión a euros constantes y otras transformaciones.',
      'Qué significa cada nivel de confianza (alta, media, baja).',
      'Proceso de revisión actuarial.',
    ],
  },
] as const satisfies readonly Seccion[];

export type SlugSeccion = (typeof SECCIONES)[number]['slug'];

/** Secciones de contenido (todas salvo Metodología, que va aparte en la cabecera). */
export const SECCIONES_CONTENIDO = SECCIONES.filter((s) => s.slug !== 'metodologia');

export function buscarSeccion(slug: SlugSeccion): Seccion {
  const seccion = SECCIONES.find((s) => s.slug === slug);
  if (!seccion) throw new Error(`Sección desconocida: ${slug}`);
  return seccion;
}

/** Antetítulo con la posición de la sección en el índice: «Sección 3 de 10». */
export function antetituloSeccion(slug: SlugSeccion): string {
  const posicion = SECCIONES.findIndex((s) => s.slug === slug) + 1;
  return `Sección ${posicion} de ${SECCIONES.length}`;
}
