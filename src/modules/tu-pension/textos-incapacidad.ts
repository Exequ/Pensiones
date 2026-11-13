/**
 * Textos de la incapacidad permanente en «Tu pensión» (Fase 3-C1). Sin cifras (regla a de
 * CLAUDE.md; lo comprueba un test): toda cifra que se ve sale de /data o del motor. Tono neutro:
 * explican qué calcula el simulador, no recomiendan nada.
 */
import type { TextosPrestacion } from './textos';

export const TEXTOS_INCAPACIDAD: TextosPrestacion = {
  anteriorA: 'al hecho causante',
  aviso:
    'Es una estimación divulgativa, no un cálculo oficial ni una resolución de la Seguridad Social, y no es una valoración de un tribunal médico: el grado de incapacidad lo reconoce el organismo competente, y aquí es un dato que eliges tú. Sirve para entender cómo se llega a una cifra, no para tomar decisiones.',
  introCarrera:
    'Esta versión usa una carrera simple: cotizas todos los meses desde que empiezas hasta el mes anterior al hecho causante, con la misma base mensual, salvo los meses sin cotizar que indiques.',
  ayudaLagunas:
    'Meses entre el inicio y el hecho causante en los que no cotizas (paro sin cotización, excedencia…). Forman un único bloque.',
  ubicacionFinal: 'Justo antes del hecho causante',
  resumenSinHuecos: 'No hay huecos entre el primer tramo y el mes anterior al hecho causante.',
  personasIntro:
    'Son perfiles ilustrativos de elaboración propia, no casos reales ni estadísticas de la población. Cada uno carga en la tabla una carrera expresada en tramos que usan las series de los datos, colocada en tus fechas de nacimiento y del hecho causante; después puedes editarla. Si los datos no cubren alguna fecha, el tramo empieza en la primera fecha con datos y se explica; no se inventa ninguna base.',
  personaSinFechas:
    'Indica antes tu fecha de nacimiento y la del hecho causante: la persona-ejemplo se coloca en esas fechas.',
  avisoIpcVacio:
    'Si dejas el campo vacío y la fecha del hecho causante necesita un IPC supuesto, el cálculo no podrá hacerse.',
  supuestosIntro:
    'Una lectura abierta es una duda de interpretación de la norma que el cálculo no resuelve por sí sola: se aplica una opción por defecto y se deja constancia. Aquí aparecen las que afectan a la incapacidad permanente, con su estado. Puedes elegir otra opción en cualquiera de ellas para ver cuánto cambia tu resultado; ninguna opción se presenta como la correcta.',
  etiquetaMes: 'Mes del hecho causante',
  etiquetaAnio: 'Año del hecho causante',
  ayudaFecha:
    'El hecho causante es la fecha en que se produce la situación que da derecho a la prestación; aquí se usa el primer día del mes.',
  limitacionesIntro:
    'La ley regula situaciones que este cálculo todavía no recoge. Si alguna te afecta, el resultado no es aplicable a tu caso.',
};

export const TEXTOS_INCAPACIDAD_PROPIOS = {
  tituloIncapacidad: 'Tu incapacidad',
  introIncapacidad:
    'El grado y el origen los fija el organismo competente tras una valoración médica; aquí son datos que eliges para ver cómo se calcularía la prestación.',
  gradoLeyenda: 'Grado de incapacidad',
  origenLeyenda: 'Origen de la incapacidad',
  origenNoDisponible:
    'Accidente de trabajo y enfermedad profesional no están disponibles: su base reguladora se calcula con el salario real, con conceptos que la carrera de cotización de este simulador no recoge. Aparecen desactivados y se explican entre las limitaciones del cálculo.',
  enAltaLeyenda: 'Situación en el hecho causante',
  enAltaSi: 'En alta o situación asimilada',
  enAltaNo: 'Sin alta',
  enAltaAyuda:
    'Sin alta, la ley solo reconoce la incapacidad absoluta y la gran incapacidad por contingencias comunes; con otro grado no se cumplirán los requisitos.',
  trabajaLeyenda: 'Trabajo tras el reconocimiento',
  trabajaSi: 'Trabajo',
  trabajaNo: 'No trabajo',
  trabajaAyuda:
    'Cambia la compatibilidad con el trabajo: en la total, el incremento de la cualificada queda en suspenso; en la absoluta y en la gran incapacidad se suspende el pago, salvo el complemento de gran incapacidad.',
  gradoAyudaParcial:
    'La incapacidad parcial no da una pensión periódica, sino una cantidad a tanto alzado.',
  // Resultado: lecturas que intervienen
  intervienenTitulo: 'Lecturas abiertas que intervienen en tu resultado',
  intervienenIntro:
    'En este resultado influyen dudas de interpretación de la norma que todavía no están decididas con firmeza. Se muestran con su estado y con el efecto de la alternativa, sin recomendar ninguna.',
  intervienenAnlTitulo: 'Accidente no laboral: meses sin cotizar dentro del periodo elegido',
  intervienenAnlIntro:
    'Con este origen, la forma de tratar los meses sin cotizar del periodo elegido puede cambiar mucho la base reguladora. La lectura está en estado provisional: sigue abierta a revisión.',
  intervienenEstado: 'Estado',
  intervienenMotivo: 'Motivo del registro',
  intervienenEfecto: 'Efecto de la alternativa',
  intervienenSinEfecto: 'Con tus datos no se ha podido medir el efecto de la alternativa.',
  intervienenNota:
    'Un estado provisional o pendiente significa que la revisión actuarial no ha cerrado la lectura; no indica cuál es la correcta. Puedes cambiarla en «Supuestos y lecturas».',
  // Gráfico
  sinGrafico:
    'El motor de incapacidad no expone las bases mes a mes del periodo de cálculo, por lo que este resultado no incluye el gráfico de bases.',
} as const;
