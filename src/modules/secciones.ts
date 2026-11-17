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
      'Qué prestaciones existen, quién puede cobrarlas, qué requisitos exige cada una, cuáles son sus cuantías mínimas y máximas vigentes y cuántas pensiones hay de cada tipo, tanto en la modalidad contributiva como en la no contributiva.',
    previsto: [
      'Una ficha por prestación: jubilación, incapacidad permanente, viudedad, orfandad, en favor de familiares y las pensiones no contributivas de jubilación y de invalidez (disponible).',
      'Requisitos principales de cada prestación, con su artículo y el enlace al texto del BOE (disponible).',
      'Cuantías mínimas y máxima vigentes, con el importe mensual en catorce pagas como cálculo derivado (disponible).',
      'Número de pensiones en vigor y pensión media de cada tipo (disponible).',
      'Complementos a las pensiones, Clases Pasivas y número de pensiones por grado de incapacidad o por modalidad de jubilación: pendientes de datos.',
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
      'Ingresos por cotizaciones, transferencias del Estado y organismos autónomos y resto por diferencia, en derechos reconocidos netos (disponible).',
      'Gasto en pensiones contributivas por clase, con el complemento a mínimos en una fila propia (disponible).',
      'Distintas definiciones de déficit y qué incluye cada una, lado a lado (disponible).',
      'Saldo no financiero menos las transferencias corrientes del Estado (cálculo propio) y la estimación de gastos impropios de la fuente, sin sumarla a series de ejecución (disponible).',
      'Gasto en pensiones sobre el PIB según varias medidas, con el gasto contributivo con complemento a mínimos como referencia y la variante sin complemento (disponible).',
      'Desglose de las transferencias del Estado por finalidad y gasto de Clases Pasivas: sin datos descargados todavía.',
    ],
  },
  {
    slug: 'hucha',
    titulo: 'La «hucha» de las pensiones',
    tituloNav: 'La «hucha»',
    resumen:
      'El Fondo de Reserva de la Seguridad Social: para qué se creó, cómo se ha dotado y cómo se ha usado, cuántos meses de gasto en pensiones representa su valor y cómo se sitúa frente a las transferencias del Estado y a la deuda de la Seguridad Social con el Estado.',
    previsto: [
      'Evolución del valor del Fondo de Reserva (disponible).',
      'Dotaciones y disposiciones, año a año (disponible).',
      'Meses de gasto en pensiones que equivale el Fondo: referencia con obligaciones reconocidas y complemento a mínimos, y contraste con catorce pagas (disponible).',
      'Reglas de dotación y de disposición, con el límite de desembolso por porcentaje del PIB (disponible).',
      'Su relación con el Mecanismo de Equidad Intergeneracional (disponible).',
      'De dónde procede el dinero: transferencias del Estado, préstamos del Estado y gastos impropios, con las distintas clasificaciones de las partidas (disponible).',
      'Transferencias del Estado a la Seguridad Social por año, por trimestre y acumuladas desde un año de inicio elegible (disponible; el desglose anual por finalidad y los años anteriores al primero con datos están pendientes de datos).',
      'El Fondo de Reserva medido en meses o trimestres de transferencias del Estado: año completo como medida principal y cuarto trimestre como secundaria (disponible; no hay valor del Fondo más frecuente que el anual).',
      'Dos lecturas separadas: Fondo menos deuda, y deuda más transferencias acumuladas (apoyo financiero del Estado); la suma conjunta de las tres partidas, no aditivas, solo como opción desactivada por defecto, con anotaciones sobre los préstamos (disponible; no son cifras oficiales).',
      'Proyecciones del Fondo y del sistema (fuera de esta fase).',
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
      'Relación entre afiliados y pensiones, y entre afiliados y pensionistas, con las definiciones disponibles, qué cuenta el denominador y la fecha de referencia de cada serie (disponible; la definición con cotizantes efectivos está pendiente de datos).',
      'Pensión media por clase, en euros corrientes y constantes, con el IPC de diciembre o el IPC medio anual como deflactor (disponible).',
      'Pensiones en vigor por clase, sexo y edad, y afiliados por edad (disponible).',
      'Altas y bajas de pensiones (disponible).',
      'Proyecciones demográficas publicadas: pendiente de una fase posterior.',
      'Por qué la ratio por sí sola no explica la situación financiera del sistema (se explica en cada gráfico).',
    ],
  },
  {
    slug: 'proyecciones',
    titulo: 'Proyecciones',
    tituloNav: 'Proyecciones',
    resumen:
      'Qué resulta de cuatro modelos propios, con la legislación actual congelada y supuestos explícitos: población, pensiones en vigor, cotizantes y bases de cotización y sistema financiero (gasto, saldos y Fondo de Reserva), junto a lo observado y a otras proyecciones publicadas. No son predicciones ni pronósticos oficiales.',
    previsto: [
      'Demografía: población de mayores y relación de dependencia frente a las proyecciones del INE, prueba hacia atrás y escenarios demográficos (disponible).',
      'Pensiones contributivas en vigor por clase, edad y sexo, con el histórico en la misma figura y el contraste con el Ageing Report (disponible).',
      'Afiliados, cotizantes del Régimen General, bases de cotización y afiliados por pensión, con el histórico y el contraste con el Ageing Report (disponible).',
      'Cómo funciona cada modelo, qué supone y qué se puede cambiar en su código (disponible).',
      'Sistema financiero: gasto en pensiones contributivas y pensión media, cotizaciones y MEI, tres medidas de saldo, Fondo de Reserva y financiación adicional, y contraste con el gasto sobre el PIB del Ageing Report (disponible).',
      'Un solo escenario económico (el de referencia): los escenarios alternativos solo existen para la demografía.',
    ],
  },
  {
    slug: 'otros-sistemas',
    titulo: 'Otros sistemas',
    tituloNav: 'Otros sistemas',
    resumen:
      'Cómo se organizan y qué miden las pensiones en otros países: gasto público sobre el PIB, edad de jubilación, tasa de reposición teórica y estructura de los sistemas (reparto, capitalización, cuentas nocionales y pilares), con datos de la OCDE, Eurostat y la Comisión Europea y las definiciones de cada medida.',
    previsto: [
      'Gasto público en pensiones sobre el PIB según la OCDE y según Eurostat, lado a lado, por país y en su evolución (disponible).',
      'Edad normal de jubilación de la OCDE, actual y futura, y edad efectiva de salida del mercado laboral, con el contraste de la edad de la normativa española (disponible).',
      'Tasa de reposición teórica bruta y neta de la OCDE por país, con los supuestos del cálculo, el escenario alternativo y el contraste de España con cocientes propios (disponible).',
      'Estructura de los sistemas de los países de la muestra, con la cita literal de la fuente y un glosario de reparto, capitalización y cuentas nocionales (disponible).',
      'Perímetro del gasto de cada fuente, impuestos y cotizaciones de los pensionistas y fichas detalladas de Reino Unido y Estados Unidos: pendientes de datos.',
    ],
  },
  {
    slug: 'mitos-y-realidades',
    titulo: 'Mitos y realidades',
    tituloNav: 'Mitos y realidades',
    resumen:
      'Afirmaciones que circulan sobre las pensiones, tal como se formulan, con los datos y las definiciones que permiten contrastarlas. La página no valora las afirmaciones ni toma partido: muestra qué dicen los datos, con qué definición y qué cambia si se cambia la definición.',
    previsto: [
      'Las doce afirmaciones del catálogo, en su orden y sin valorarlas, cada una con qué se puede medir, sus datos con su fuente y un texto «Cómo leerlo» (disponible).',
      'Definiciones alternativas lado a lado, sin elegir una, y lo que los datos no permiten concluir (disponible).',
      'Enlaces a las páginas donde ya está cada dato: la hucha, la financiación, los cotizantes, otros sistemas y las proyecciones (disponible).',
      'Revalorización frente al IPC año a año, sin acumulado mientras la serie de revalorización tenga huecos (disponible); el acumulado queda pendiente de datos.',
      'Lo cotizado frente a lo cobrado: solo el marco del cálculo, sin cifras, porque faltan los historiales de cotización (pendiente de datos).',
      'Umbrales de pobreza, perímetros del gasto de Eurostat y de la OCDE y comparación ajustada por estructura de edades: pendientes de datos.',
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
