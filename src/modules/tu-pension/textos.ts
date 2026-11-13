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
  resultadoTitulo: 'Tu pensión estimada',
  comoTitulo: 'Cómo se ha calculado',
  requisitosTitulo: 'Requisitos de la jubilación ordinaria',
  avisosTitulo: 'Avisos del cálculo',
  supuestosTitulo: 'Supuestos y lecturas',
  supuestosIntro:
    'Una lectura abierta es una duda de interpretación de la norma que el cálculo no resuelve por sí solo: se aplica una opción por defecto y se deja constancia. Aquí se describen las que afectan a la jubilación, con su estado. Esta versión solo las muestra; no se pueden cambiar.',
  supuestosEfecto: 'Efecto en tu resultado',
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
