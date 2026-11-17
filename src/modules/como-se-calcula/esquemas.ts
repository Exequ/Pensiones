/**
 * Textos de «Cómo se calcula»: para cada prestación, quién la cobra, el esquema de cálculo por
 * pasos (con las normas que lo sostienen) y lo que esta web no calcula. Sin cifras: toda cifra
 * sale de /data o del motor (lo comprueba `scripts/como-se-calcula-fase.test.ts`).
 *
 * Neutralidad: se explica cómo funciona la norma; no se valora si es justa o adecuada. Cada
 * afirmación normativa remite a un artículo cuyo texto está descargado (`normas.ts`).
 */
import { N } from './normas.ts';
import { ID_PASO_OPCION25 } from './pasos-motor.ts';

export type IdSeccion = 'jubilacion' | 'incapacidad' | 'viudedad' | 'orfandad';

export interface PasoEsquema {
  readonly id: string;
  readonly titulo: string;
  readonly texto: readonly string[];
  /** Identificadores de `NORMAS`. */
  readonly normas: readonly string[];
  /** Pasos del motor que cubre (los de los ejemplos); pueden compartirse entre pasos del esquema. */
  readonly pasosMotor: readonly string[];
}

export interface Esquema {
  readonly id: IdSeccion;
  readonly titulo: string;
  readonly ancla: string;
  /** Resumen de una frase para el índice. */
  readonly resumen: string;
  readonly quien: string;
  readonly pasos: readonly PasoEsquema[];
  /** Lo que la web no calcula de esta prestación, además de las limitaciones del motor. */
  readonly noCalcula: readonly string[];
}

const COMUNES_LIMITES: PasoEsquema = {
  id: 'maxima-minimas',
  titulo:
    'Se aplican la pensión máxima, el complemento a mínimos y el complemento por brecha de género',
  texto: [
    'La cuantía inicial de una pensión no puede superar un límite que se fija cada año: la pensión máxima. Si la pensión calculada queda por debajo de la cuantía mínima que corresponde a la situación de la persona y sus rentas no superan el límite fijado, se añade un complemento hasta alcanzar esa cuantía mínima. Además, las pensiones contributivas pueden llevar un complemento por cada hijo o hija, con un tope de hijos o hijas y un importe que se fija cada año.',
  ],
  normas: [N.a57, N.a59, N.a60],
  pasosMotor: ['limite-maximo', 'complemento-minimos', 'complemento-brecha'],
};

const RESULTADO: PasoEsquema = {
  id: 'resultado',
  titulo: 'Resultado: la pensión inicial por paga',
  texto: [
    'El resultado es la pensión inicial por paga en el año del hecho causante. La revalorización posterior de la pensión en curso se aplica cada año con una norma distinta y no forma parte de este cálculo inicial.',
  ],
  normas: [N.a58],
  pasosMotor: ['pension-contributiva', 'pension-final'],
};

const NO_CALCULA_COMUN: readonly string[] = [
  'La prestación en favor de familiares y las pensiones no contributivas: no calculadas aquí todavía.',
  'El resultado es una estimación a partir de los datos que se indican. No es una resolución ni sustituye al cálculo que hace la Seguridad Social con la vida laboral real.',
];

export const ESQUEMAS: readonly Esquema[] = [
  {
    id: 'jubilacion',
    titulo: 'Jubilación',
    ancla: 'jubilacion',
    resumen: 'De la carrera de cotización a la pensión de jubilación contributiva.',
    quien:
      'La jubilación contributiva la cobran las personas que cumplen una edad mínima y han cotizado un periodo mínimo. Qué exige cada modalidad (ordinaria, anticipada, demorada o parcial), cuántas pensiones hay y cuál es su cuantía media está en «Tipos de pensión»; aquí solo se explica cómo se obtiene la cuantía cuando se cumplen los requisitos.',
    pasos: [
      {
        id: 'requisitos',
        titulo: 'Se comprueban los requisitos',
        texto: [
          'Antes de calcular, se comprueba que la persona cumple tres condiciones: la edad, un periodo mínimo de cotización (la carencia) y que parte de ese periodo esté en los años inmediatamente anteriores al momento de causar la pensión. La edad exigida depende de los años cotizados: con una carrera suficientemente larga se puede acceder a una edad menor. Los meses se cuentan completos, sin parte proporcional de las pagas extraordinarias.',
        ],
        normas: [N.a205, N.dt7],
        pasosMotor: ['meses-cotizados', 'edad-legal'],
      },
      {
        id: 'ventana',
        titulo: 'Se fijan los meses que cuentan y el divisor',
        texto: [
          'La base reguladora se calcula con las bases de cotización de los meses anteriores al «mes previo» al hecho causante (el mes previo no se cuenta). La norma fija cuántos meses se miran, cuántas de esas bases se suman —las de mayor importe— y entre cuánto se divide la suma. Durante el periodo transitorio esos tres números cambian cada año hasta alcanzar los del texto definitivo del artículo.',
        ],
        normas: [N.a209, N.dt8, N.dt40],
        pasosMotor: ['periodo-calculo'],
      },
      {
        id: 'actualizacion',
        titulo: 'Se actualizan las bases con el IPC',
        texto: [
          'Las bases de los meses más recientes se toman por su valor nominal. Las anteriores se actualizan con la evolución del Índice de Precios de Consumo (IPC) desde su mes hasta el mes de referencia, de modo que las bases antiguas se expresan en euros próximos a los del momento de la jubilación. Las bases de entrada que superan la base máxima de cotización de su mes se reducen a ella antes de actualizar, y el motor lo anota en sus avisos. Cómo se aplica exactamente el suelo del factor de actualización es una lectura abierta (véase «Lecturas que influyen»).',
        ],
        normas: [N.a209, N.dt38],
        pasosMotor: ['periodo-calculo'],
      },
      {
        id: 'lagunas',
        titulo: 'Los meses sin cotizar se completan',
        texto: [
          'Si en el periodo de cálculo hay meses sin obligación de cotizar (lagunas), no cuentan como cero: se completan con una parte de la base mínima de cotización de ese mes. Las primeras mensualidades se completan con un porcentaje mayor de la base mínima y las demás con uno menor. La norma prevé además una integración reforzada para determinadas situaciones.',
        ],
        normas: [N.a209, N.dt41],
        pasosMotor: ['periodo-calculo'],
      },
      {
        id: 'base-reguladora',
        titulo: 'Se obtiene la base reguladora',
        texto: [
          'La base reguladora es la suma de las bases seleccionadas dividida entre el divisor. Para determinados hechos causantes, una disposición transitoria permite aplicar en su integridad la redacción anterior del artículo cuando resulta más favorable; el motor calcula los dos resultados y aplica el mayor.',
        ],
        normas: [N.a209, N.dt4],
        pasosMotor: ['base-reguladora-general', ID_PASO_OPCION25, 'base-reguladora'],
      },
      {
        id: 'porcentaje',
        titulo: 'Se aplica el porcentaje según los meses cotizados',
        texto: [
          'La base reguladora se multiplica por un porcentaje que crece con los meses cotizados: un porcentaje de partida por el periodo mínimo y un incremento por cada mes adicional, en dos tramos con incrementos distintos, hasta un máximo. Los tramos y los incrementos cambian por versiones de la norma, que se aplican según el año del hecho causante.',
        ],
        normas: [N.a210, N.dt9],
        pasosMotor: ['porcentaje'],
      },
      {
        id: 'modalidad',
        titulo: 'Se ajusta según la modalidad',
        texto: [
          'En la jubilación anticipada se aplica un coeficiente reductor a la pensión resultante, que depende del tiempo de anticipación y de la cotización acumulada; hay un cuadro de coeficientes para la anticipada voluntaria y otro para la anticipada por causa no imputable a la persona trabajadora. En la jubilación demorada se reconoce un complemento por cada año completo de demora, que puede abonarse como porcentaje adicional, como cantidad a tanto alzado o combinando ambas formas. Cuando la pensión resultante supera el límite de la pensión máxima, la norma prevé reglas propias para cada modalidad.',
        ],
        normas: [N.a207, N.a208, N.a210, N.dt34, N.rd371_2],
        pasosMotor: [
          'coeficiente-reductor',
          'coeficiente-sobre-limite',
          'tope-trimestres',
          'demora-tiempo',
          'demora-porcentaje-adicional',
        ],
      },
      COMUNES_LIMITES,
      RESULTADO,
    ],
    noCalcula: [...NO_CALCULA_COMUN],
  },
  {
    id: 'incapacidad',
    titulo: 'Incapacidad permanente',
    ancla: 'incapacidad',
    resumen: 'De la carrera de cotización a la pensión de incapacidad permanente.',
    quien:
      'La incapacidad permanente contributiva la cobran las personas cuyas reducciones anatómicas o funcionales graves disminuyen o anulan su capacidad laboral, en grados: parcial, total, absoluta y gran incapacidad. Quién puede cobrarla y qué exige cada grado está en «Tipos de pensión»; aquí se explica cómo se obtiene la cuantía cuando la causa es una enfermedad común o un accidente no laboral.',
    pasos: [
      {
        id: 'requisitos',
        titulo: 'Se comprueban el grado y el periodo mínimo de cotización',
        texto: [
          'La norma define los grados de incapacidad mientras no haya un desarrollo reglamentario que los cambie. Cuando la causa es una enfermedad común, se exige un periodo mínimo de cotización que depende de la edad de la persona, y una parte de él debe estar en los años recientes. Si la causa es un accidente o una enfermedad profesional, no se exige periodo mínimo. No se reconoce la incapacidad por contingencias comunes a quien reúne los requisitos de la jubilación.',
        ],
        normas: [N.a194, N.dt26, N.a195, N.rd1799_4],
        pasosMotor: ['meses-cotizados'],
      },
      {
        id: 'base',
        titulo: 'Se calcula la base reguladora',
        texto: [
          'Por enfermedad común, la base reguladora es la suma de las bases de cotización de un número de meses anteriores al mes previo al hecho causante, dividida entre un divisor. Las bases más recientes se toman por su valor nominal, el resto se actualiza con el IPC y los meses sin cotizar se completan con la base mínima. Si el periodo mínimo exigido es corto, se usan tantas bases como meses se exigen, con un divisor propio. Por accidente no laboral, con la persona en alta, se elige un periodo de meses ininterrumpidos dentro de una ventana de años anteriores.',
        ],
        normas: [N.a197, N.rd1799_5, N.d1646_7],
        pasosMotor: ['base-reguladora-bases'],
      },
      {
        id: 'anios',
        titulo: 'Se añaden los años que faltan hasta la edad ordinaria',
        texto: [
          'En la incapacidad por enfermedad común se aplica a esa base el porcentaje de la escala de la jubilación, pero contando como cotizados, además de los meses realmente cotizados, los que faltan hasta la edad ordinaria de jubilación. Si no se alcanza el mínimo de la escala, se aplica un porcentaje fijo.',
        ],
        normas: [N.a197, N.a210, N.dt9],
        pasosMotor: ['anios-hasta-edad', 'porcentaje-cotizacion', 'base-reguladora'],
      },
      {
        id: 'grado',
        titulo: 'Se aplica el porcentaje del grado',
        texto: [
          'Sobre la base reguladora se aplica un porcentaje que depende del grado: el de la incapacidad total es menor que el de la absoluta y la gran incapacidad.',
        ],
        normas: [N.a196, N.o1969_15, N.o1969_17, N.o1969_18],
        pasosMotor: ['porcentaje-grado'],
      },
      {
        id: 'cualificada',
        titulo: 'Incremento de la incapacidad total cualificada',
        texto: [
          'Si la persona tiene una edad mínima y se presume que le resulta difícil encontrar empleo, la pensión de la incapacidad total se incrementa con un porcentaje de la base reguladora. El incremento se suspende mientras se trabaje. El motor presume esa dificultad por la edad.',
        ],
        normas: [N.a196, N.d1646_6],
        pasosMotor: ['total-cualificada'],
      },
      {
        id: 'gran',
        titulo: 'Complemento de la gran incapacidad',
        texto: [
          'A la pensión de la gran incapacidad se suma un complemento por la necesidad de ayuda de otra persona. Se calcula con un porcentaje de la base mínima de cotización y otro de la última base de cotización, con un mínimo expresado como porcentaje de la pensión sin complemento.',
        ],
        normas: [N.a196],
        pasosMotor: ['complemento-gran-incapacidad'],
      },
      COMUNES_LIMITES,
      {
        id: 'parcial',
        titulo: 'La incapacidad permanente parcial no es una pensión',
        texto: [
          'En el grado parcial no hay pensión mensual: se paga una cantidad a tanto alzado equivalente a un número de mensualidades de la base reguladora de la incapacidad temporal. Esta página no incluye ejemplo de ese grado.',
        ],
        normas: [N.a196, N.d1646_9],
        pasosMotor: [],
      },
      RESULTADO,
    ],
    noCalcula: [...NO_CALCULA_COMUN],
  },
  {
    id: 'viudedad',
    titulo: 'Viudedad',
    ancla: 'viudedad',
    resumen: 'De la carrera de la persona fallecida a la pensión de viudedad.',
    quien:
      'La viudedad la cobran las personas que sobreviven a quien fallece, como cónyuge, como excónyuge con derecho o como pareja de hecho, si se cumplen los requisitos. Quién puede cobrarla y qué se exige en cada caso está en «Tipos de pensión»; aquí se explica cómo se obtiene la cuantía.',
    pasos: [
      {
        id: 'requisitos',
        titulo: 'Se comprueban los requisitos de la persona fallecida y de la persona beneficiaria',
        texto: [
          'El derecho depende de la situación de la persona fallecida (en alta, sin alta o ya pensionista) y de su cotización previa, y del vínculo con quien sobrevive: cónyuge, excónyuge con pensión compensatoria o pareja de hecho. En algunos casos, por ejemplo un matrimonio reciente tras una enfermedad previa, se reconoce una prestación temporal en lugar de la pensión vitalicia.',
        ],
        normas: [N.a217, N.a219, N.a220, N.a221, N.a222],
        pasosMotor: [],
      },
      {
        id: 'base',
        titulo: 'Se calcula la base reguladora de la persona fallecida',
        texto: [
          'Se elige el periodo ininterrumpido de meses más favorable dentro de una ventana de años anteriores al mes previo al fallecimiento y se divide la suma de esas bases entre un divisor. Los meses sin cotizar cuentan como cero y las bases van por su valor nominal. Si la persona fallecida ya cobraba una pensión, se parte de la base de esa pensión con las revalorizaciones posteriores.',
        ],
        normas: [N.a228, N.d1646_7],
        pasosMotor: ['base-reguladora'],
      },
      {
        id: 'porcentaje',
        titulo: 'Se aplica el porcentaje de la viudedad',
        texto: [
          'Sobre la base reguladora se aplica un porcentaje general. Hay porcentajes mayores para quien tiene edad avanzada y no tiene otras pensiones ni rentas del trabajo, y para quien tiene cargas familiares y rentas bajas; se aplica el más favorable que corresponda. Si hay varias personas beneficiarias, la pensión se reparte en proporción al tiempo de convivencia, con una parte garantizada al cónyuge o a la pareja superviviente.',
        ],
        normas: [N.d3158_31, N.rd900_3, N.a220],
        pasosMotor: ['cargas-familiares', 'porcentaje'],
      },
      {
        id: 'limite',
        titulo: 'Se comprueba el límite conjunto',
        texto: [
          'La suma de las pensiones de viudedad, orfandad y favor de familiares derivadas de una misma persona fallecida no puede superar su base reguladora, salvo una excepción prevista cuando la viudedad es mayor que el porcentaje general y hay varias orfandades.',
        ],
        normas: [N.a229],
        pasosMotor: ['limite-conjunto'],
      },
      {
        ...COMUNES_LIMITES,
        id: 'maxima-minimas',
        pasosMotor: ['complemento-minimos', 'complemento-brecha'],
      },
      RESULTADO,
    ],
    noCalcula: [...NO_CALCULA_COMUN],
  },
  {
    id: 'orfandad',
    titulo: 'Orfandad',
    ancla: 'orfandad',
    resumen: 'De la carrera de la persona fallecida a la pensión de orfandad.',
    quien:
      'La orfandad la cobran los hijos e hijas de la persona fallecida que cumplen los requisitos de edad y, en su caso, de ingresos o de incapacidad. Quién puede cobrarla y qué se exige está en «Tipos de pensión»; aquí se explica cómo se obtiene la cuantía.',
    pasos: [
      {
        id: 'requisitos',
        titulo: 'Se comprueban los requisitos de la persona fallecida y de quien la cobra',
        texto: [
          'El derecho depende de la situación de la persona fallecida (en alta, sin alta o ya pensionista) y de la edad de cada huérfano o huérfana; esa edad se amplía si no trabaja o sus ingresos del trabajo son bajos, y no tiene límite si hay incapacidad.',
        ],
        normas: [N.a217, N.a224],
        pasosMotor: [],
      },
      {
        id: 'base',
        titulo: 'Se calcula la base reguladora de la persona fallecida',
        texto: [
          'Es la misma que en la viudedad: el periodo ininterrumpido de meses más favorable dentro de una ventana de años anteriores al mes previo al fallecimiento, dividido entre un divisor.',
        ],
        normas: [N.a228, N.d1646_7],
        pasosMotor: ['base-reguladora'],
      },
      {
        id: 'porcentaje',
        titulo: 'Se aplica el porcentaje por cada huérfano o huérfana',
        texto: [
          'Cada huérfano o huérfana recibe un porcentaje de la base reguladora. Cuando se da el supuesto de orfandad absoluta, la norma prevé un incremento que se reparte a partes iguales entre los huérfanos con derecho; el motor lo aplica solo si se le indica ese supuesto.',
        ],
        normas: [N.d3158_36, N.d3158_38],
        pasosMotor: ['porcentaje', 'incremento-orfandad-absoluta'],
      },
      {
        id: 'limite',
        titulo: 'Se comprueba el límite conjunto',
        texto: [
          'La suma de las pensiones derivadas de una misma persona fallecida no puede superar su base reguladora, con la excepción prevista cuando la viudedad es mayor que el porcentaje general y hay varias orfandades.',
        ],
        normas: [N.a229],
        pasosMotor: ['limite-conjunto'],
      },
      {
        ...COMUNES_LIMITES,
        id: 'maxima-minimas',
        pasosMotor: ['complemento-minimos', 'complemento-brecha'],
      },
      RESULTADO,
    ],
    noCalcula: [...NO_CALCULA_COMUN],
  },
];

export const esquemaDe = (id: IdSeccion): Esquema => {
  const e = ESQUEMAS.find((x) => x.id === id);
  if (e === undefined) throw new RangeError(`Sección sin esquema: ${id}`);
  return e;
};
