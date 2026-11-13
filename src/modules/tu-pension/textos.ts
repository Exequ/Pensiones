/**
 * Textos de la página «Tu pensión». No contienen cifras (regla a de CLAUDE.md; lo comprueba un
 * test): toda cifra que se ve sale de /data o del motor.
 */
export const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
] as const;

export const TEXTOS = {
  aviso:
    'Es una estimación divulgativa, no un cálculo oficial ni una resolución de la Seguridad Social. Sirve para entender cómo se llega a una cifra, no para tomar decisiones sobre tu jubilación.',
  avisoTitulo: 'Estimación divulgativa',
  introCarrera:
    'Esta primera versión usa una carrera simple: cotizas todos los meses desde que empiezas hasta el mes anterior a jubilarte, con la misma base mensual, salvo los meses sin cotizar que indiques.',
  tituloDatos: 'Tus datos',
  tituloCarrera: 'Tu carrera de cotización',
  tituloOpciones: 'Opciones del cálculo',
  tituloEscenario: 'Escenario económico',
  proximamente:
    'Próximamente: jubilación anticipada, demorada y parcial. Este simulador calcula solo la jubilación ordinaria.',
  ayudaFechaJubilacion:
    'Se usa el primer día del mes. Si cumples la edad ordinaria ese mismo mes, cumples el requisito de edad.',
  ayudaHijos: 'El cálculo lo usa solo para el complemento por hijos, que se aplica a las mujeres.',
  ayudaSexo:
    'El cálculo lo usa para la integración de las lagunas de cotización y para el complemento por hijos.',
  ayudaLagunas:
    'Meses entre el inicio y la jubilación en los que no cotizas (paro sin cotización, excedencia…). Forman un único bloque.',
  ayudaUbicacionLagunas:
    'La posición importa: los últimos años pesan más en la base reguladora que los de mitad de carrera.',
  ayudaBase:
    'Base de cotización mensual, igual todos los meses. El valor inicial es una referencia de los datos, no tu base real: cámbialo por la tuya.',
  ayudaMinimos:
    'El complemento a mínimos eleva las pensiones bajas hasta la cuantía mínima si se cumplen sus condiciones.',
  ayudaMaxima: 'La pensión máxima limita la pensión inicial que puede reconocerse.',
  ayudaIpc:
    'Para los meses de los que aún no hay dato publicado, el cálculo necesita un IPC anual supuesto. No es una previsión: es un supuesto que tú puedes cambiar.',
  avisoIpc:
    'El IPC futuro es desconocido. El valor inicial es el supuesto de inflación del escenario base de un informe de la OCDE, no una previsión para España.',
  avisoIpcVacio:
    'Si dejas el campo vacío y la fecha de jubilación necesita un IPC supuesto, el cálculo no podrá hacerse.',
  calcular: 'Calcular mi pensión',
  // --- Selector de prestación (Fase 3-C1) ---
  prestacionTitulo: 'Qué prestación quieres calcular',
  prestacionLeyenda: 'Prestación',
  prestacionAyuda:
    'Elige la prestación que quieres simular. Las que aparecen como próximamente todavía no se calculan: no tienen cifras ni formulario.',
  prestacionProximamente: 'próximamente',
  resultadoTitulo: 'Tu pensión estimada',
  comoTitulo: 'Cómo se ha calculado',
  requisitosTitulo: 'Requisitos de la jubilación ordinaria',
  avisosTitulo: 'Avisos del cálculo',
  supuestosTitulo: 'Supuestos y lecturas',
  supuestosIntro:
    'Una lectura abierta es una duda de interpretación de la norma que el cálculo no resuelve por sí solo: se aplica una opción por defecto y se deja constancia. Aquí aparecen las que afectan a la jubilación, con su estado. Puedes elegir otra opción en cualquiera de ellas para ver cuánto cambia tu resultado; ninguna opción se presenta como la correcta.',
  supuestosEstadoNota:
    'El estado indica en qué punto está la revisión actuarial de cada lectura: es información sobre el proyecto, no una indicación de cuál elegir. Las lecturas provisionales y las pendientes se muestran igual que las decididas.',
  supuestosEfecto: 'Efecto en tu resultado',
  supuestosEfectoNota:
    'El efecto de cada alternativa se mide frente a tu elección actual, cambiando solo esa lectura.',
  valorElegidoEtiqueta: 'Elegida',
  opcionPorDefecto: 'valor con el que se calcula si no eliges otro',
  restablecerLecturas: 'Restablecer lecturas',
  restablecerAyuda: 'Devuelve todas las lecturas a su valor por defecto.',
  lecturasRestablecidas: 'Lecturas restablecidas: todas están en su valor por defecto.',
  lecturaMotivo: 'Motivo del registro',
  lecturaSinDecidir: 'Sin decidir todavía.',
  // --- Comparación con las lecturas por defecto (Fase 3-B2) ---
  comparacionTitulo: 'Con tus lecturas y con las lecturas por defecto',
  comparacionSinCambios: 'Todas las lecturas están en su valor por defecto.',
  comparacionConTusLecturas: 'Con tus lecturas',
  comparacionPorDefecto: 'Con las lecturas por defecto',
  comparacionConcepto: 'Concepto',
  comparacionDiferenciaEuros: 'Diferencia (euros al mes)',
  comparacionDiferenciaPorcentaje: 'Diferencia (%)',
  comparacionTabla: 'Pensión y base reguladora con tus lecturas y con las lecturas por defecto',
  comparacionFilaPension: 'Pensión mensual bruta (por paga)',
  comparacionFilaBase: 'Base reguladora (euros al mes)',
  comparacionNota:
    'Las lecturas por defecto son el punto de referencia de la comparación, no una recomendación ni la lectura correcta: son la opción que aplica el cálculo mientras no se elige otra.',
  // --- Enlace compartible (Fase 3-B2) ---
  enlaceTitulo: 'Compartir tu simulación',
  enlaceIntro:
    'El enlace contiene los valores del formulario, la carrera, las opciones, el IPC supuesto y las lecturas elegidas. Al abrirlo, el formulario se rellena y se calcula el resultado.',
  enlaceCampo: 'Enlace a esta simulación',
  enlaceCopiar: 'Copiar enlace',
  enlaceCopiado: 'Enlace copiado al portapapeles.',
  enlaceNoCopiado:
    'No se ha podido copiar el enlace automáticamente: selecciónalo en el campo y cópialo.',
  enlacePrivacidad:
    'Todo se calcula en tu navegador y ningún dato personal sale de esta web. El enlace es la única forma de compartir tu simulación: quien lo tenga puede ver los valores que has escrito.',
  enlaceTramosOmitidos:
    'La tabla tiene más tramos de los que admite el enlace: el enlace no incluye los últimos.',
  enlaceAvisoTitulo: 'Qué se ha ignorado del enlace',
  enlaceAvisoIntro:
    'El enlace que has abierto tenía valores que no se pueden usar. La página ha cargado los demás valores, o los valores por defecto si el enlace entero no era válido.',
  limitacionesTitulo: 'Qué no tiene en cuenta el cálculo',
  limitacionesIntro:
    'La ley regula situaciones que este cálculo todavía no recoge. Si alguna te afecta, el resultado no es aplicable a tu caso.',
  fuentesTitulo: 'Fuentes de los valores iniciales',
  sinResultado: 'Rellena el formulario y pulsa «Calcular mi pensión» para ver el resultado.',
  erroresResumen: 'Hay datos que revisar antes de calcular:',
  // --- Carrera por tramos (Fase 3-B1) ---
  tipoCarreraLeyenda: 'Tipo de carrera',
  carreraSimple: 'Carrera simple',
  carreraTramos: 'Carrera por tramos',
  introTramos:
    'Cada fila es un periodo seguido con una misma base mensual. Los meses sin tramo cuentan como meses sin cotizar (lagunas) y el cálculo los integra según la norma. La base puede ser un importe en euros o una referencia a una serie de los datos (base mínima, media o máxima de cotización), que cambia de un año a otro.',
  tramosTitulo: 'Tramos de cotización',
  tramosSinTramos: 'Todavía no hay tramos. Añade el primero.',
  anadirTramo: 'Añadir tramo',
  duplicarTramo: 'Duplicar',
  quitarTramo: 'Quitar',
  baseSegunSerie: 'Según la serie de los datos, año a año',
  resumenTitulo: 'Resumen de la carrera',
  resumenMesesCotizados: 'Meses cotizados',
  resumenMesesSinCotizar: 'Meses sin cotizar (lagunas)',
  resumenHuecos: 'Huecos detectados',
  resumenSinHuecos: 'No hay huecos entre el primer tramo y el mes anterior a la jubilación.',
  resumenSinTramos: 'El resumen aparecerá cuando haya algún tramo con fechas válidas.',
  avisosLimitesTitulo: 'Qué hará el cálculo con las bases fuera de los límites',
  referenciasTitulo: 'Referencias de base y sus fuentes',
  referenciasIntro:
    'Las referencias salen de la carpeta de datos, con su fuente. La base mínima y la máxima son las del Régimen General de cada año. Para la base media hay varias definiciones de salario que no miden lo mismo.',
  definicionMediaEtiqueta: 'Definición de la «base media» (para los tramos con esa referencia)',
  neutralidadMedia:
    'Estas definiciones difieren en ámbito y concepto (salario bruto, coste salarial, remuneración con cotizaciones del empleador, base de cotización con tope) y no son intercambiables. El simulador no recomienda ninguna; la elegida al principio es la que ya usa el valor inicial de la carrera simple.',
  conversionAnual:
    'La serie original está en euros al año: se divide entre doce para obtener la base mensual.',
  conversionMensual: 'La serie original ya está en euros al mes.',
  coberturaDatos: 'Datos disponibles',
  otrasReferencias: 'Fuentes de la base mínima y de la base máxima',
  fuentePorAnio:
    'Cada año procede de la orden de cotización de ese año; se muestran la fuente del primer y la del último año de la serie.',
  // --- Personas-ejemplo ---
  personasTitulo: 'Personas-ejemplo (ilustrativas)',
  personasIntro:
    'Son perfiles ilustrativos de elaboración propia, no casos reales ni estadísticas de la población. Cada uno carga en la tabla una carrera expresada en tramos que usan las series de los datos, colocada en tus fechas de nacimiento y de jubilación; después puedes editarla. Si los datos no cubren alguna fecha, el tramo empieza en la primera fecha con datos y se explica; no se inventa ninguna base.',
  ilustrativo: 'Ilustrativo',
  cargarPersona: 'Cargar',
  personaSinFechas:
    'Indica antes tu fecha de nacimiento y la de jubilación: la persona-ejemplo se coloca en esas fechas.',
  personaCargadaTitulo: 'Persona-ejemplo cargada',
  personaCargadaTexto:
    'Es un perfil ilustrativo, no un caso real. Los tramos de la tabla se pueden editar.',
  personaAjustes: 'Ajustes por la cobertura de los datos',
  // --- Gráfico de bases ---
  graficoSeccion: 'Las bases del periodo de cálculo, mes a mes',
  graficoTitulo: 'Base nominal y base actualizada de cada mes del periodo de cálculo',
  graficoComoLeer:
    'Cada marca es un mes del periodo de cálculo, del más antiguo al más reciente. La línea es la base nominal de cada mes y las marcas son su base actualizada con el IPC. Los círculos son los meses que se suman; las cruces, los meses que se descartan por no estar entre las bases de mayor importe; los rombos, los meses sin cotizar que el cálculo integra con una parte de la base mínima (rellenos si se suman y vacíos si se descartan).',
  graficoNota:
    'Los meses más recientes entran por su valor nominal y los anteriores se actualizan con el IPC, según la regla del cálculo. La base reguladora es la suma de los meses sumados entre el divisor.',
  graficoUsada: 'Se suma',
  graficoDescartada: 'Se descarta',
  graficoLaguna: 'Laguna integrada (se suma)',
  graficoLagunaDescartada: 'Laguna integrada (se descarta)',
  graficoPrevioAlta: 'Previo al primer alta (no cuenta)',
  graficoComoLeerPrevio:
    'Los cuadrados son meses anteriores al primer alta que, con la lectura elegida, no cuentan.',
  nota: 'Cada cifra del resultado sale del motor de cálculo del proyecto, que lee las normas y los parámetros de la carpeta de datos; las fuentes están en «Metodología» y en «Fuentes».',
} as const;

/**
 * Los textos que cambian de una prestación a otra (Fase 3-C1): cómo se llama la fecha en que
 * termina la carrera, el aviso, las introducciones. Los demás textos de `TEXTOS` son comunes.
 */
export interface TextosPrestacion {
  /** «a la jubilación», «al hecho causante»: «posterior al mes anterior …». */
  readonly anteriorA: string;
  readonly aviso: string;
  readonly introCarrera: string;
  readonly ayudaLagunas: string;
  readonly ubicacionFinal: string;
  readonly resumenSinHuecos: string;
  readonly personasIntro: string;
  readonly personaSinFechas: string;
  readonly avisoIpcVacio: string;
  readonly supuestosIntro: string;
  readonly etiquetaMes: string;
  readonly etiquetaAnio: string;
  readonly ayudaFecha: string;
  readonly limitacionesIntro: string;
}

/** Los textos de la jubilación son los de siempre (no cambian ni una palabra). */
export const TEXTOS_JUBILACION: TextosPrestacion = {
  anteriorA: 'a la jubilación',
  aviso: TEXTOS.aviso,
  introCarrera: TEXTOS.introCarrera,
  ayudaLagunas: TEXTOS.ayudaLagunas,
  ubicacionFinal: 'Justo antes de jubilarme',
  resumenSinHuecos: TEXTOS.resumenSinHuecos,
  personasIntro: TEXTOS.personasIntro,
  personaSinFechas: TEXTOS.personaSinFechas,
  avisoIpcVacio: TEXTOS.avisoIpcVacio,
  supuestosIntro: TEXTOS.supuestosIntro,
  etiquetaMes: 'Mes de jubilación',
  etiquetaAnio: 'Año de jubilación',
  ayudaFecha: TEXTOS.ayudaFechaJubilacion,
  limitacionesIntro: TEXTOS.limitacionesIntro,
};
