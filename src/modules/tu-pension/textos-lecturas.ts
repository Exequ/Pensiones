/**
 * Textos del selector de lecturas abiertas (Fase 3-B2). Para cada lectura que ofrece el simulador:
 * un título corto y, por cada valor del registro, una etiqueta y una frase que explica **qué cambia
 * en el cálculo**. Son descripciones neutras: no recomiendan ninguna lectura ni dicen cuál es la
 * correcta (el estado de la lectura, decidida o provisional, se muestra aparte como información).
 *
 * Sin cifras (regla a de CLAUDE.md; lo comprueba un test). Un test comprueba que hay texto para
 * cada lectura ofrecida y para cada uno de sus valores, y que no sobra ninguno.
 */

export interface TextoValorLectura {
  /** Etiqueta corta de la opción. */
  readonly etiqueta: string;
  /** Qué cambia en el cálculo con esta opción. */
  readonly queCambia: string;
}

export interface TextoLectura {
  readonly titulo: string;
  readonly valores: Readonly<Record<string, TextoValorLectura>>;
}

export const TEXTOS_LECTURAS: Readonly<Record<string, TextoLectura>> = {
  'jubilacion.baseMaxima': {
    titulo: 'Base máxima de cotización en los años futuros',
    valores: {
      compuesto: {
        etiqueta: 'Año a año, sobre la cifra del año anterior',
        queCambia:
          'Cada año el incremento adicional se suma al porcentaje de revalorización y se aplica sobre la base máxima del año anterior, de modo que los incrementos se acumulan unos sobre otros.',
      },
      'sobre-cifra-inicial': {
        etiqueta: 'Sumados sobre la cifra inicial',
        queCambia:
          'La base máxima del año anterior crece con la revalorización y, además, cada año se le añade el incremento adicional como un importe fijo calculado sobre la cifra inicial, sin acumularse entre sí. Solo cambia el resultado si alguna base queda limitada por la base máxima.',
      },
    },
  },
  'jubilacion.pensionMaxima': {
    titulo: 'Límite de la pensión máxima con el incremento adicional anual',
    valores: {
      compuesto: {
        etiqueta: 'Mismo porcentaje cada año, sobre la cifra del año anterior',
        queCambia:
          'El incremento adicional anual del límite de la pensión máxima es el mismo porcentaje todos los años y se aplica sobre la pensión máxima del año anterior, de modo que su efecto se acumula; no es la misma cantidad en euros.',
      },
      'incremento-creciente': {
        etiqueta: 'Incremento adicional que crece cada año',
        queCambia:
          'El incremento adicional anual del límite de la pensión máxima crece cada año de forma regular a lo largo de la tabla. Solo cambia el resultado si la pensión queda limitada por la máxima.',
      },
    },
  },
  'jubilacion.referenciaBaseMinimaLagunas': {
    titulo: 'Base mínima con la que se rellenan los meses sin cotización',
    valores: {
      'mes-de-la-laguna': {
        etiqueta: 'La del mes en que ocurrió',
        queCambia:
          'Cada mes sin cotizar se rellena con la base mínima vigente en ese mismo mes y, como el resto de las bases, esa cifra se actualiza con el IPC.',
      },
      'hecho-causante': {
        etiqueta: 'La del momento de la jubilación',
        queCambia:
          'Todos los meses sin cotizar se rellenan con la base mínima vigente en el momento de la jubilación, y esa cifra no se actualiza con el IPC.',
      },
    },
  },
  'jubilacion.opcion25EnUltimoDia2040': {
    titulo:
      'Último día de la ventana en que rige la opción de calcular la base reguladora con un periodo más largo',
    valores: {
      incluida: {
        etiqueta: 'El último día queda dentro de la opción',
        queCambia:
          'Quien se jubila ese último día puede calcular la base reguladora con un periodo más largo de los últimos años, y se aplica el resultado más favorable entre ese cálculo y la regla general.',
      },
      excluida: {
        etiqueta: 'El último día queda fuera de la opción',
        queCambia:
          'Quien se jubila ese último día no puede usar el periodo más largo y se le aplica la regla general. Solo afecta a una jubilación en esa fecha exacta.',
      },
    },
  },
  'jubilacion.lagunasAnterioresAlPrimerAlta': {
    titulo: 'Meses sin cotización anteriores al primer alta',
    valores: {
      integrar: {
        etiqueta: 'Rellenarlos',
        queCambia:
          'Los meses del periodo de cálculo anteriores al primer alta se rellenan como el resto de lagunas.',
      },
      ignorar: {
        etiqueta: 'Ignorarlos',
        queCambia:
          'Los meses del periodo de cálculo anteriores al primer alta no se rellenan y cuentan como cero en la suma de bases.',
      },
    },
  },
  'jubilacion.interpolacionIPC': {
    titulo: 'Índice de precios de cada mes',
    valores: {
      'mensual-ine': {
        etiqueta: 'Índice mensual publicado por el INE',
        queCambia:
          'Cada mes usa el índice de precios mensual que publica el INE (es una mejora de datos, no una lectura legal).',
      },
      interpolada: {
        etiqueta: 'Medias anuales suavizadas entre años',
        queCambia:
          'El índice de cada mes se obtiene de las medias anuales, suavizando de un año al siguiente.',
      },
      'escalon-anual': {
        etiqueta: 'Medias anuales en escalones',
        queCambia:
          'Todos los meses de un año usan la misma media anual, y el índice cambia de golpe al cambiar de año.',
      },
    },
  },
  'jubilacion.actualizacionFactorMinimo': {
    titulo: 'Factor de actualización de las bases cuando los precios han bajado',
    valores: {
      'suelo-1': {
        etiqueta: 'Con suelo igual a uno',
        queCambia:
          'Si el índice de precios del mes de referencia es menor que el del mes de la base, la base no se reduce: el factor de actualización no baja de uno.',
      },
      'sin-suelo': {
        etiqueta: 'Sin suelo',
        queCambia:
          'Si el índice de precios del mes de referencia es menor que el del mes de la base, la base se reduce: el factor de actualización puede ser inferior a uno.',
      },
    },
  },
  'jubilacion.fraccionDemora': {
    titulo: 'Fracciones de año de la demora en la jubilación',
    valores: {
      'desde-segundo-anio': {
        etiqueta: 'Desde el segundo año completo',
        queCambia:
          'La fracción de año de demora solo cuenta a partir del segundo año completo de demora, según el artículo del texto refundido que regula el complemento por demora. Además, tiene que superar un número mínimo de meses y vale la mitad del incremento de un año completo.',
      },
      'desde-primer-anio': {
        etiqueta: 'Desde el primer año',
        queCambia:
          'La fracción de año de demora cuenta a partir del primer año completo de demora, un año antes que con la otra lectura. Con las dos tiene que superar un número mínimo de meses y vale la mitad del incremento de un año completo; si no se ha completado ningún año de demora, no cuenta.',
      },
    },
  },
  'jubilacion.maximaDesde2051': {
    titulo: 'Pensión máxima en los últimos años del calendario legal',
    valores: {
      'incremento-acumulado': {
        etiqueta: 'Incremento acumulado total',
        queCambia:
          'Cada valor de la tabla de incrementos se lee como el incremento total acumulado hasta ese año: cada año la pensión máxima crece con la revalorización y con la diferencia entre el valor de la tabla de ese año y el del año anterior (el primer año, frente a lo ya acumulado por los incrementos anuales anteriores).',
      },
      'incremento-anual-literal': {
        etiqueta: 'Incremento anual literal',
        queCambia:
          'Cada valor de la tabla de incrementos se lee como el incremento propio de ese año y no como el total acumulado. Solo cambia el resultado si la pensión queda limitada por la máxima en esos años.',
      },
    },
  },
  // --- Incapacidad permanente (Fase 3-C1) ---
  'incapacidad.edadFiccion': {
    titulo: 'Edad ordinaria con la que se añaden los años que faltan hasta la jubilación',
    valores: {
      'carrera-proyectada': {
        etiqueta: 'La que resulta de la carrera proyectada',
        queCambia:
          'La edad ordinaria de jubilación se calcula suponiendo que la cotización sigue hasta la edad de referencia, de modo que depende de los años cotizados. Los meses que faltan hasta esa edad se suman a los cotizados para fijar el porcentaje de la base reguladora en la incapacidad por enfermedad común.',
      },
      'edad-general': {
        etiqueta: 'La edad ordinaria general',
        queCambia:
          'Se usa la edad ordinaria general de la jubilación, sin tener en cuenta la carrera larga. Solo puede cambiar el resultado en la incapacidad por enfermedad común, y no cambia si las dos edades coinciden.',
      },
    },
  },
  'incapacidad.computoFiccion': {
    titulo: 'Cómo se cuentan los años que faltan hasta la edad ordinaria',
    valores: {
      meses: {
        etiqueta: 'Por meses completos',
        queCambia:
          'Se añaden a la cotización todos los meses completos que faltan hasta la edad ordinaria de jubilación.',
      },
      'anios-completos': {
        etiqueta: 'Por años completos',
        queCambia:
          'Solo se añaden años completos: los meses sueltos que sobran no se cuentan. Solo puede cambiar el resultado en la incapacidad por enfermedad común.',
      },
    },
  },
  'incapacidad.divisorPeriodoCorto': {
    titulo: 'Divisor de la base reguladora cuando el periodo exigido es corto',
    valores: {
      'coeficiente-rd-1799-1985': {
        etiqueta: 'Coeficiente del reglamento de desarrollo',
        queCambia:
          'Cuando la base reguladora se calcula con menos meses que el periodo ordinario, el divisor es el número de meses multiplicado por el coeficiente que fija el reglamento de desarrollo.',
      },
      'catorce-doceavos': {
        etiqueta: 'Proporción de catorce doceavos',
        queCambia:
          'El divisor es el número de meses multiplicado por la misma proporción que hay entre el periodo ordinario de cálculo y su divisor. Solo cambia el resultado cuando el periodo exigido es corto.',
      },
    },
  },
  'incapacidad.lagunasAccidenteNoLaboral': {
    titulo: 'Meses sin cotizar dentro del periodo elegido en el accidente no laboral',
    valores: {
      'sin-integrar': {
        etiqueta: 'Contarlos como cero',
        queCambia:
          'Los meses sin cotizar dentro del periodo elegido aportan una base nula a la suma, lo que reduce la base reguladora.',
      },
      integrar: {
        etiqueta: 'Rellenarlos con la base mínima',
        queCambia:
          'Los meses sin cotizar dentro del periodo elegido se rellenan con la base mínima de cotización del año de cada mes, completa y sin reducción: el periodo elegido es más corto que el tramo de meses que la norma integra sin reducir en el resto de las bases reguladoras. Solo cambia el resultado en el accidente no laboral con meses sin cotizar en ese periodo.',
      },
    },
  },
  'incapacidad.redondeoEdadCarencia': {
    titulo: 'Cómo se mide la edad para el periodo mínimo de cotización',
    valores: {
      'sin-redondeo': {
        etiqueta: 'En meses cumplidos',
        queCambia: 'La edad se mide en meses cumplidos para calcular el periodo mínimo exigido.',
      },
      'medio-anio': {
        etiqueta: 'Redondeada a medios años',
        queCambia:
          'La edad se redondea a medios años, como disponía el reglamento de desarrollo, para calcular el periodo mínimo exigido. Solo cambia el resultado en la incapacidad por enfermedad común.',
      },
    },
  },
  'incapacidad.diasCotizadosParcial': {
    titulo: 'Días cotizados de cada mes en la incapacidad parcial',
    valores: {
      naturales: {
        etiqueta: 'Días naturales de cada mes',
        queCambia:
          'Cada mes con base cuenta con los días naturales que tiene, para comprobar los días cotizados que exige la incapacidad parcial.',
      },
      'treinta-por-mes': {
        etiqueta: 'Treinta días por mes',
        queCambia:
          'Cada mes con base cuenta como treinta días, para comprobar los días cotizados que exige la incapacidad parcial. Solo puede cambiar si se cumple o no el requisito de la parcial.',
      },
    },
  },
};
