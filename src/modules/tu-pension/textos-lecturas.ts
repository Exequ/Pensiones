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
          'Cada incremento adicional de la base máxima se aplica sobre la cifra del año anterior, de modo que los incrementos se acumulan unos sobre otros.',
      },
      'sobre-cifra-inicial': {
        etiqueta: 'Sumados sobre la cifra inicial',
        queCambia:
          'Los incrementos adicionales se suman todos sobre la cifra inicial, sin acumularse entre sí. Solo cambia el resultado si alguna base queda limitada por la base máxima.',
      },
    },
  },
  'jubilacion.pensionMaxima': {
    titulo: 'Límite de la pensión máxima con el incremento adicional anual',
    valores: {
      compuesto: {
        etiqueta: 'Incremento adicional fijo cada año',
        queCambia:
          'El incremento adicional anual del límite de la pensión máxima es la misma cantidad todos los años.',
      },
      'incremento-creciente': {
        etiqueta: 'Incremento adicional que crece cada año',
        queCambia:
          'El incremento adicional anual del límite de la pensión máxima va creciendo de un año a otro. Solo cambia el resultado si la pensión queda limitada por la máxima.',
      },
    },
  },
  'jubilacion.referenciaBaseMinimaLagunas': {
    titulo: 'Base mínima con la que se rellenan los meses sin cotización',
    valores: {
      'mes-de-la-laguna': {
        etiqueta: 'La del mes en que ocurrió',
        queCambia: 'Cada mes sin cotizar se rellena con la base mínima vigente en ese mismo mes.',
      },
      'hecho-causante': {
        etiqueta: 'La del momento de la jubilación',
        queCambia:
          'Todos los meses sin cotizar se rellenan con la base mínima vigente en el momento de la jubilación.',
      },
    },
  },
  'jubilacion.opcion25EnUltimoDia2040': {
    titulo: 'Último día en que rige la opción de contar más años de cotización',
    valores: {
      incluida: {
        etiqueta: 'El último día queda dentro de la opción',
        queCambia:
          'Quien se jubila ese último día puede acogerse a la opción de contar más años de cotización.',
      },
      excluida: {
        etiqueta: 'El último día queda fuera de la opción',
        queCambia:
          'Quien se jubila ese último día no puede acogerse a la opción de contar más años de cotización. Solo afecta a una jubilación en esa fecha exacta.',
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
          'Las fracciones de año de demora solo cuentan a partir del segundo año completo de demora.',
      },
      'desde-primer-anio': {
        etiqueta: 'Desde el primer año',
        queCambia: 'Las fracciones de año de demora cuentan desde el primer año de demora.',
      },
    },
  },
  'jubilacion.maximaDesde2051': {
    titulo: 'Pensión máxima en los últimos años del calendario legal',
    valores: {
      'incremento-acumulado': {
        etiqueta: 'Incremento acumulado total',
        queCambia:
          'Cada valor de la tabla de incrementos se lee como el incremento total acumulado hasta ese año.',
      },
      'incremento-anual-literal': {
        etiqueta: 'Incremento anual literal',
        queCambia:
          'Cada valor de la tabla de incrementos se lee como el incremento propio de ese año y no como el total acumulado. Solo cambia el resultado si la pensión queda limitada por la máxima en esos años.',
      },
    },
  },
};
