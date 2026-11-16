/**
 * Textos de la viudedad y la orfandad en «Tu pensión» (Fase 3-C2). Sin cifras (regla a de
 * CLAUDE.md; lo comprueba un test): toda cifra que se ve (edades, plazos, porcentajes, importes)
 * sale de /data o del motor. Tono neutro: explican qué pregunta el simulador y para qué lo usa el
 * cálculo, no recomiendan nada.
 */
import type { TextosPrestacion } from './textos';

const AVISO =
  'Es una estimación divulgativa, no un cálculo oficial ni una resolución de la Seguridad Social. Los requisitos de cada prestación los comprueba el organismo competente con la documentación del caso; aquí son datos que escribes tú. Sirve para entender cómo se llega a una cifra, no para tomar decisiones.';

const COMUNES = {
  anteriorA: 'al fallecimiento',
  aviso: AVISO,
  introCarrera:
    'Esta versión usa una carrera simple de la persona fallecida: cotizaba todos los meses desde que empezó hasta el mes anterior al fallecimiento, con la misma base mensual, salvo los meses sin cotizar que indiques.',
  ayudaLagunas:
    'Meses entre el inicio y el fallecimiento en los que la persona fallecida no cotizaba. Forman un único bloque.',
  ubicacionFinal: 'Justo antes del fallecimiento',
  resumenSinHuecos: 'No hay huecos entre el primer tramo y el mes anterior al fallecimiento.',
  personasIntro: '',
  personaSinFechas: '',
  avisoIpcVacio:
    'Si dejas el campo vacío y la fecha del fallecimiento necesita un IPC supuesto, el cálculo no podrá hacerse.',
  etiquetaMes: 'Mes del fallecimiento',
  etiquetaAnio: 'Año del fallecimiento',
  ayudaFecha:
    'El fallecimiento es el hecho causante de las prestaciones de muerte y supervivencia; aquí se usa el primer día del mes.',
  limitacionesIntro:
    'La ley regula situaciones que este cálculo todavía no recoge. Si alguna te afecta, el resultado no es aplicable a tu caso.',
} as const;

export const TEXTOS_VIUDEDAD: TextosPrestacion = {
  ...COMUNES,
  supuestosIntro:
    'Una lectura abierta es una duda de interpretación de la norma que el cálculo no resuelve por sí sola: se aplica una opción por defecto y se deja constancia. Aquí aparecen las que afectan a la viudedad, con su estado. Puedes elegir otra opción en cualquiera de ellas para ver cuánto cambia tu resultado; ninguna opción se presenta como la correcta.',
};

export const TEXTOS_ORFANDAD: TextosPrestacion = {
  ...COMUNES,
  supuestosIntro:
    'Una lectura abierta es una duda de interpretación de la norma que el cálculo no resuelve por sí sola: se aplica una opción por defecto y se deja constancia. Aquí aparecen las que afectan a la orfandad, con su estado. Puedes elegir otra opción en cualquiera de ellas para ver cuánto cambia tu resultado; ninguna opción se presenta como la correcta.',
};

export const TEXTOS_SUPERVIVENCIA = {
  // --- La persona fallecida ---
  tituloCausante: 'La persona fallecida',
  introCausante:
    'Las pensiones de viudedad y de orfandad se calculan con la base reguladora de la persona fallecida (la causante). Estos datos dicen cuándo falleció, por qué y en qué situación estaba.',
  causaLeyenda: 'Causa de la muerte',
  causaAyuda:
    'En el accidente de trabajo y en la enfermedad profesional la base reguladora se calcula con el salario real, con conceptos que la carrera de cotización de este simulador no recoge: por eso aquí la escribes tú. En los demás casos se calcula con la carrera.',
  situacionLeyenda: 'Situación de la persona fallecida',
  situacionAyuda:
    'En alta o situación asimilada cuentan quienes cotizaban o estaban en una situación que la ley equipara. Sin alta, la ley pide un periodo mínimo de cotización a lo largo de la vida laboral. Si cobraba una pensión de jubilación o de incapacidad permanente, la base reguladora es la de esa pensión.',
  situacionAltaSinObligacion:
    'No se ofrece la situación de alta sin obligación de cotizar (por ejemplo, el desempleo contributivo agotado): el cálculo la admite, pero necesita la fecha en que cesó esa obligación, que este formulario todavía no recoge.',
  clasePensionLeyenda: 'Clase de la pensión que cobraba',
  clasePensionJubilacion: 'Jubilación',
  clasePensionIncapacidad: 'Incapacidad permanente',
  pensionMes: 'Mes de la pensión de la persona fallecida',
  pensionAnio: 'Año de la pensión de la persona fallecida',
  pensionAyuda:
    'Mes y año del hecho causante de su pensión (la jubilación o el reconocimiento de la incapacidad). Con ellos se aplican las revalorizaciones generales de cada año posterior hasta el fallecimiento.',
  baseReguladoraPensionista: 'Base reguladora mensual de su pensión (€)',
  baseReguladoraPensionistaAyuda:
    'La base reguladora con la que se calculó su pensión, tal como figura en su resolución.',
  baseReguladoraProfesional: 'Base reguladora mensual de la persona fallecida (€)',
  baseReguladoraProfesionalAyuda:
    'La que figura en la resolución o la que hayas calculado por tu cuenta, con el salario real. Esta web no la calcula ni la comprueba: el resultado depende de ese dato.',
  carreraCausante: 'Carrera de cotización de la persona fallecida',
  carreraCausanteAyuda:
    'Es la carrera de la persona fallecida, no la tuya. El cálculo toma las bases de sus últimos años de cotización.',
  sinCarreraPensionista:
    'Como la persona fallecida cobraba una pensión, no hace falta su carrera: se parte de la base reguladora de esa pensión.',
  // --- Persona viuda ---
  tituloViudedad: 'Tus datos como persona viuda',
  introViudedad:
    'Estos datos determinan si hay derecho a la viudedad y qué porcentaje de la base reguladora corresponde. Cada pregunta aparece solo cuando hace falta.',
  tituloViudoSuperviviente: 'Cónyuge o pareja superviviente con derecho a viudedad',
  hayViudoLeyenda: '¿Sobrevive un cónyuge o pareja con derecho a viudedad?',
  hayViudoAyuda:
    'Si hay una persona viuda con derecho, su pensión forma parte del límite conjunto que se aplica a las pensiones del mismo causante y puede reducir las de orfandad. Si respondes que sí, hay que indicar sus datos.',
  introViudoSuperviviente:
    'Responde por esa persona: las preguntas están escritas en segunda persona, como en la pantalla de viudedad. Sus datos solo sirven para calcular su pensión y, con ella, el límite conjunto que afecta a la orfandad.',
  vinculoLeyenda: 'Vínculo con la persona fallecida',
  vinculoAyuda:
    'El cónyuge y la pareja de hecho tienen requisitos propios. Las personas separadas, divorciadas o que ya no son pareja de hecho solo tienen derecho si cobraban una pensión compensatoria que se extingue con la muerte (o si fueron víctimas de violencia de género sin compensatoria) y no han formado un nuevo vínculo.',
  nacimientoMes: 'Mes de nacimiento',
  nacimientoAnio: 'Año de nacimiento',
  sexoLeyenda: 'Sexo',
  sexoAyuda:
    'El cálculo lo usa solo para el complemento por hijos, que se reconoce a las mujeres y, en los hombres, solo si algún hijo en común tiene derecho a pensión de orfandad.',
  hijosEtiqueta: 'Número de hijos',
  hijosAyuda: 'Total de hijos, para el complemento por hijos.',
  hijoConOrfandadLeyenda: '¿Alguno de los hijos en común tiene derecho a pensión de orfandad?',
  hijoConOrfandadAyuda:
    'Para los hombres, es la condición del complemento por hijos en la viudedad.',
  matrimonioMes: 'Mes del matrimonio',
  matrimonioAnio: 'Año del matrimonio',
  matrimonioAyuda:
    'La duración del matrimonio solo importa si la muerte se debe a una enfermedad común anterior al matrimonio.',
  enfermedadAnteriorLeyenda: '¿La muerte se debe a una enfermedad común anterior al matrimonio?',
  enfermedadAnteriorAyuda:
    'Si no es así, el cálculo supone que la enfermedad sobrevino después del vínculo y no exige una duración mínima del matrimonio.',
  convivenciaPreviaEtiqueta: 'Meses de convivencia anteriores al matrimonio',
  convivenciaPreviaAyuda:
    'Suman a la duración del matrimonio cuando la ley lo permite (si hay enfermedad anterior al vínculo).',
  hijosComunesLeyenda: '¿Hay hijos en común con la persona fallecida?',
  hijosComunesAyuda:
    'Los hijos en común cambian los requisitos del matrimonio y de la pareja de hecho.',
  convivenciaParejaEtiqueta: 'Meses de convivencia estable e ininterrumpida',
  convivenciaParejaAyuda: 'Los inmediatamente anteriores al fallecimiento.',
  registroMes: 'Mes de la inscripción de la pareja',
  registroAnio: 'Año de la inscripción de la pareja',
  registroAyuda:
    'Fecha de inscripción en un registro de parejas de hecho o de formalización de un documento público. Déjala vacía si no hay ninguna: sin inscripción de la antelación exigida, la ley solo reconoce la prestación temporal.',
  aviso2026:
    'Con pareja de hecho e hijos en común, la ley exige requisitos distintos antes y después de la fecha en que entra en vigor la nueva redacción del artículo sobre parejas de hecho. El simulador usa el día uno del mes: si el fallecimiento ocurre en el mes en que cambia la redacción, el resultado puede depender del día.',
  compensatoriaEtiqueta: 'Pensión compensatoria anual que se extingue con la muerte (€)',
  compensatoriaAyuda:
    'Importe anual de la pensión compensatoria que cobrabas. La viudedad no puede superarla; deja vacío el campo si no cobrabas ninguna.',
  violenciaLeyenda: '¿Eres víctima de violencia de género (sin pensión compensatoria)?',
  violenciaAyuda: 'Es la otra vía de acceso a la viudedad de las personas separadas o divorciadas.',
  nuevoVinculoLeyenda: '¿Has contraído matrimonio o formado una pareja de hecho después?',
  nuevoVinculoAyuda: 'Un nuevo vínculo hace que no haya derecho a la viudedad.',
  separacionLeyenda:
    '¿La separación o el divorcio es anterior a la fecha que fija la disposición transitoria decimotercera del texto refundido?',
  separacionAyuda:
    'Esas separaciones y divorcios tienen una regla transitoria que el simulador no calcula (véase «Qué no tiene en cuenta el cálculo»).',
  rentasTitulo: 'Pensiones y rentas',
  rentasIntro:
    'Las rentas se escriben en euros al año. Cada una se usa para una regla distinta; si no sabes cuál te afecta, deja la respuesta con su valor inicial.',
  otraPensionLeyenda: '¿Tienes derecho a otra pensión pública?',
  otraPensionAyuda:
    'Es una de las condiciones del porcentaje mayor para quienes tienen la edad que fija la ley. También afecta al complemento por hijos.',
  discapacidadLeyenda:
    '¿Tienes reconocida una discapacidad en grado igual o superior al que fija la ley para la clase de la pensión mínima?',
  discapacidadAyuda: 'Cambia la clase de la cuantía mínima.',
  rentasTrabajoEtiqueta: 'Rentas del trabajo al año (€)',
  rentasTrabajoAyuda: 'Por cuenta propia o ajena. Cuentan para el porcentaje mayor por edad.',
  rentasCapitalEtiqueta:
    'Rentas del capital, de actividades económicas y ganancias patrimoniales al año (€)',
  rentasCapitalAyuda: 'Cuentan para el porcentaje mayor por edad.',
  rendimientosEtiqueta: 'Rendimientos totales al año (€)',
  rendimientosAyuda:
    'Por todos los conceptos, sin la pensión de viudedad. Se usan para el complemento a mínimos.',
  rendimientosAnteriorEtiqueta: 'Rendimientos del ejercicio anterior (€)',
  rendimientosAnteriorAyuda:
    'Solo para el porcentaje de las cargas familiares: lo percibido en el ejercicio anterior por todos los conceptos, sin la pensión de viudedad y sin lo que se deja de percibir como consecuencia del fallecimiento. Si lo dejas vacío, el cálculo usa los rendimientos totales.',
  brechaOtraLeyenda: '¿Ya cobras el complemento por hijos con otra pensión?',
  brechaOtraAyuda: 'Solo se reconoce un complemento por hijo, aunque haya varias pensiones.',
  cargasLeyenda: '¿Tienes cargas familiares?',
  cargasAyuda:
    'Convivir con hijos menores de la edad que fija la ley, o incapacitados, o con menores acogidos, y que la pensión sea la principal fuente de ingresos. Con cargas familiares el porcentaje puede ser mayor si se cumplen los límites de renta.',
  miembrosEtiqueta: 'Personas de la unidad familiar (contigo)',
  miembrosAyuda: 'Número de miembros de la unidad familiar, incluido el beneficiario.',
  rendimientosUnidadEtiqueta: 'Rendimientos de toda la unidad familiar al año (€)',
  rendimientosUnidadAyuda:
    'Los de todos sus miembros, incluido el beneficiario, medidos como los del ejercicio anterior.',
  // --- Huérfanos ---
  tituloOrfandad: 'Tus datos como huérfano o huérfana',
  introOrfandad:
    'La orfandad se reconoce a los hijos de la persona fallecida hasta una edad que fija la ley, o sin límite de edad si están incapacitados.',
  huerfanoNacimientoMes: 'Mes de nacimiento',
  huerfanoNacimientoAnio: 'Año de nacimiento',
  incapacitadoLeyenda: '¿Estás incapacitado para el trabajo?',
  incapacitadoAyuda:
    'La incapacidad para el trabajo amplía el derecho más allá del límite de edad. La reconoce el organismo competente: aquí es un dato que escribes tú.',
  discapacidadHuerfanoLeyenda:
    '¿Tienes reconocida una discapacidad en grado igual o superior al que fija la ley?',
  discapacidadHuerfanoAyuda:
    'Cambia la clase de la cuantía mínima para los menores de la edad que fija la ley.',
  rentasTrabajoHuerfanoEtiqueta: 'Rentas del trabajo del huérfano al año (€)',
  rentasTrabajoHuerfanoAyuda:
    'Solo importan pasada la edad ordinaria y hasta la edad ampliada: se compara con el salario mínimo anual.',
  rendimientosHuerfanoEtiqueta: 'Rendimientos totales del huérfano al año (€)',
  rendimientosHuerfanoAyuda: 'Por todos los conceptos. Se usan para el complemento a mínimos.',
  orfandadAbsolutaLeyenda: '¿No sobrevive ningún progenitor (o solo se conoce a uno)?',
  orfandadAbsolutaAyuda:
    'Es la orfandad absoluta: la ley incrementa entonces la pensión con un porcentaje que se reparte entre los huérfanos con derecho.',
  // --- Otros huérfanos ---
  otrosHuerfanosViudedad: 'Hijos de la persona fallecida con derecho a orfandad',
  otrosHuerfanosViudedadAyuda:
    'Opcional. Si hay hijos con derecho a orfandad, sus pensiones y la tuya comparten el límite conjunto de las pensiones del mismo causante. Indica solo sus fechas de nacimiento y si están incapacitados.',
  otrosHuerfanosOrfandad: 'Otros huérfanos con derecho a la misma pensión',
  otrosHuerfanosOrfandadAyuda:
    'Opcional. Si hay otros hijos de la persona fallecida con derecho a orfandad, sus pensiones y la tuya comparten el límite conjunto. Indica solo sus fechas de nacimiento y si están incapacitados.',
  huerfanoOtro: 'Huérfano',
  anadirHuerfano: 'Añadir huérfano',
  quitarHuerfano: 'Quitar',
  sinOtrosHuerfanos: 'No hay otros huérfanos.',
  // --- Resultado ---
  intervienenTitulo: 'Lecturas abiertas que intervienen en tu resultado',
  intervienenIntro:
    'Estas son las lecturas del cálculo que, con tus datos, cambian el resultado si se elige su alternativa. Se muestran todas, con su estado (decidida, provisional o pendiente) y con el efecto de la alternativa, sin recomendar ninguna.',
  intervienenNinguna:
    'Ninguna de las lecturas abiertas de esta prestación cambia el resultado con tus datos. El panel «Supuestos y lecturas» las lista todas con su estado.',
  intervienenEstado: 'Estado',
  intervienenMotivo: 'Motivo del registro',
  intervienenEfecto: 'Efecto de la alternativa',
  intervienenSinEfecto: 'Con tus datos no se ha podido medir el efecto de la alternativa.',
  intervienenNota:
    'Un estado provisional o pendiente significa que la revisión actuarial no ha cerrado la lectura; no indica cuál es la correcta. Puedes cambiarla en «Supuestos y lecturas».',
  jubilacionAplicadaTitulo: 'Qué lecturas de jubilación se aplican aquí',
  jubilacionAplicadaIntro:
    'El cálculo de las prestaciones de muerte y supervivencia comparte con el de la jubilación la parte que fija los límites: la base máxima de cotización y la pensión máxima. Por eso le afectan estas lecturas de jubilación. Aquí se aplican con el valor de por defecto del registro y no se pueden cambiar: las que se cambian en la pantalla de jubilación no pasan a esta prestación. Las demás lecturas de la jubilación (actualización de las bases con el IPC, relleno de los meses sin cotizar) no se usan aquí: las bases van por su valor nominal y los meses sin cotizar cuentan como cero.',
  jubilacionAplicadaValor: 'Valor aplicado',
  jubilacionAplicadaEstado: 'Estado',
  jubilacionAplicadaEnlace: 'Ir a la pantalla de jubilación',
  sinGrafico:
    'El motor de supervivencia no expone las bases mes a mes del periodo de cálculo, por lo que este resultado no incluye el gráfico de bases.',
  repartoEncabezados: {
    beneficiario: 'Beneficiario',
    porcentaje: 'Porcentaje de la base reguladora',
    pension: 'Pensión inicial por paga',
    nota: 'Nota',
  },
} as const;
