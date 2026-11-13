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
  nota: 'Cada cifra del resultado sale del motor de cálculo del proyecto, que lee las normas y los parámetros de la carpeta de datos; las fuentes están en «Metodología» y en «Fuentes».',
} as const;
