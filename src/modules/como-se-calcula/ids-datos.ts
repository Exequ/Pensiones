/**
 * Parámetros de /data que muestra cada sección de «Cómo se calcula»: fichero de `data/parametros/`,
 * identificador del dato y cómo se formatea. El valor, la unidad, la ubicación en la norma y la
 * fuente se leen de /data al abrir la página; aquí solo hay identificadores y rótulos (sin cifras:
 * un test lo comprueba).
 *
 * Reglas de resolución de `id`:
 *  - un identificador literal (`porcentaje-adicional-anual`);
 *  - `@anio`: serie por año (el identificador es el año) → último año con dato;
 *  - `@version:<sufijo>`: dato cuyo identificador es `<año>-<sufijo>` → el de la versión más
 *    reciente que no supera el último año con dato (cada versión rige «a partir» de su año).
 */
export type FormatoParametro =
  /** Meses como «x años y y meses». */
  | 'duracion'
  | 'meses'
  | 'euros-mes'
  | 'euros-anio'
  /** El valor ya está en porcentaje (50 = 50 %). */
  | 'porcentaje'
  | 'numero'
  | 'dias';

export interface ParametroConfig {
  readonly clave: string;
  /** Nombre del fichero de `data/parametros/` sin extensión. */
  readonly fichero: string;
  readonly id: string;
  readonly rotulo: string;
  readonly formato: FormatoParametro;
}

const p = (
  clave: string,
  fichero: string,
  id: string,
  rotulo: string,
  formato: FormatoParametro,
): ParametroConfig => ({ clave, fichero, id, rotulo, formato });

export const PARAMETROS_JUBILACION: readonly ParametroConfig[] = [
  p(
    'edad-ordinaria',
    'edad-ordinaria-jubilacion',
    '@anio',
    'Edad ordinaria de jubilación con una carrera de cotización más corta que la que da acceso a la edad menor',
    'duracion',
  ),
  p(
    'edad-menor',
    'jubilacion-edad-65',
    '2013-carrera-larga-meses',
    'Edad ordinaria de jubilación con la carrera de cotización suficiente',
    'duracion',
  ),
  p(
    'carrera-edad-menor',
    'carrera-jubilacion-65',
    '@anio',
    'Cotización que da acceso a la edad menor',
    'duracion',
  ),
  p(
    'carencia',
    'carencia-jubilacion',
    '@anio',
    'Periodo mínimo de cotización (carencia)',
    'duracion',
  ),
  p(
    'previo-meses',
    'jubilacion-periodo-previo',
    '2013-meses-minimos',
    'Cotización exigida dentro de los años inmediatamente anteriores',
    'duracion',
  ),
  p(
    'previo-ventana',
    'jubilacion-periodo-previo',
    '2013-ventana-meses',
    'Años inmediatamente anteriores en los que debe estar esa cotización',
    'duracion',
  ),
  p(
    'periodo-calculo',
    'periodo-calculo-base-reguladora',
    '@anio',
    'Meses anteriores al mes previo al hecho causante que se consideran para la base reguladora',
    'meses',
  ),
  p('divisor', 'divisor-base-reguladora', '@anio', 'Divisor de la base reguladora', 'numero'),
  p(
    'nominales',
    'actualizacion-bases',
    '@version:meses-nominales',
    'Meses más recientes cuyas bases no se actualizan',
    'meses',
  ),
  p(
    'lagunas-meses',
    'lagunas-integracion',
    '@version:tramo1-meses',
    'Mensualidades sin cotizar que se integran con el porcentaje mayor de la base mínima',
    'meses',
  ),
  p(
    'lagunas-pct1',
    'lagunas-integracion',
    '@version:tramo1-pct-base-minima',
    'Porcentaje de la base mínima de las primeras mensualidades sin cotizar',
    'porcentaje',
  ),
  p(
    'lagunas-pct2',
    'lagunas-integracion',
    '@version:tramo2-pct-base-minima',
    'Porcentaje de la base mínima del resto de mensualidades sin cotizar',
    'porcentaje',
  ),
  p(
    'escala-base-pct',
    'escala-jubilacion-tramos',
    '@version:base-pct',
    'Porcentaje de la base reguladora por el periodo mínimo de cotización',
    'porcentaje',
  ),
  p(
    'escala-tramo1-pct',
    'escala-jubilacion-tramos',
    '@version:tramo1-pct',
    'Porcentaje por cada mes adicional del primer tramo',
    'porcentaje',
  ),
  p(
    'escala-tramo1-meses',
    'escala-jubilacion-tramos',
    '@version:tramo1-meses',
    'Meses adicionales del primer tramo',
    'meses',
  ),
  p(
    'escala-tramo2-pct',
    'escala-jubilacion-tramos',
    '@version:tramo2-pct',
    'Porcentaje por cada mes adicional del segundo tramo',
    'porcentaje',
  ),
  p(
    'escala-tramo2-meses',
    'escala-jubilacion-tramos',
    '@version:tramo2-meses',
    'Meses adicionales del segundo tramo',
    'meses',
  ),
  p(
    'escala-maximo',
    'escala-jubilacion-tramos',
    '@version:maximo-pct',
    'Porcentaje máximo de la base reguladora',
    'porcentaje',
  ),
  p(
    'anticipo-voluntaria',
    'jubilacion-anticipada-reglas',
    'voluntaria-anticipo-maximo-meses',
    'Anticipación máxima, jubilación anticipada voluntaria',
    'duracion',
  ),
  p(
    'anticipo-involuntaria',
    'jubilacion-anticipada-reglas',
    'involuntaria-anticipo-maximo-meses',
    'Anticipación máxima, jubilación anticipada por causa no imputable a la persona trabajadora',
    'duracion',
  ),
  p(
    'demora-anual',
    'jubilacion-demora-reglas',
    'porcentaje-adicional-anual',
    'Porcentaje adicional por cada año completo de demora',
    'porcentaje',
  ),
  p('base-maxima', 'base-maxima-rg', '@anio', 'Base máxima de cotización', 'euros-mes'),
  p('pension-maxima', 'pension-maxima', '@anio', 'Pensión máxima por paga', 'euros-mes'),
  p(
    'pension-minima',
    'pension-minima-jubilacion',
    '@version:jub65-unipersonal',
    'Pensión mínima de jubilación con la edad menor y sin cónyuge a cargo',
    'euros-anio',
  ),
  p(
    'brecha',
    'complemento-brecha-genero',
    '@anio',
    'Complemento por brecha de género, por hijo o hija y paga',
    'euros-mes',
  ),
  p(
    'revalorizacion',
    'revalorizacion-general',
    '@anio',
    'Revalorización general de las pensiones',
    'porcentaje',
  ),
];

export const PARAMETROS_INCAPACIDAD: readonly ParametroConfig[] = [
  p(
    'ip-carencia-joven',
    'incapacidad-permanente-reglas',
    'carencia-joven-divisor',
    'Divisor del tiempo transcurrido que fija la cotización exigida a quien tiene menos edad',
    'numero',
  ),
  p(
    'ip-carencia-general',
    'incapacidad-permanente-reglas',
    'carencia-general-divisor',
    'Divisor del tiempo transcurrido que fija la cotización exigida al resto de personas',
    'numero',
  ),
  p(
    'ip-carencia-minimo',
    'incapacidad-permanente-reglas',
    'carencia-general-minimo-meses',
    'Cotización mínima exigida a quien no es joven',
    'duracion',
  ),
  p(
    'ip-br-meses',
    'incapacidad-permanente-reglas',
    'br-ec-meses',
    'Meses de bases de la base reguladora por enfermedad común',
    'meses',
  ),
  p(
    'ip-br-divisor',
    'incapacidad-permanente-reglas',
    'br-ec-divisor',
    'Divisor de la base reguladora por enfermedad común',
    'numero',
  ),
  p(
    'ip-br-corto',
    'incapacidad-permanente-reglas',
    'br-periodo-corto-coeficiente-divisor',
    'Coeficiente por mes del divisor cuando el periodo exigido es corto',
    'numero',
  ),
  p(
    'ip-total',
    'incapacidad-permanente-reglas',
    'total-porcentaje',
    'Porcentaje de la base reguladora de la incapacidad permanente total',
    'porcentaje',
  ),
  p(
    'ip-absoluta',
    'incapacidad-permanente-reglas',
    'absoluta-porcentaje',
    'Porcentaje de la base reguladora de la incapacidad permanente absoluta',
    'porcentaje',
  ),
  p(
    'ip-gran',
    'incapacidad-permanente-reglas',
    'gran-incapacidad-porcentaje',
    'Porcentaje de la base reguladora de la gran incapacidad, sin el complemento',
    'porcentaje',
  ),
  p(
    'ip-cualificada',
    'incapacidad-permanente-reglas',
    'total-cualificada-pct',
    'Incremento de la total cualificada, sobre la base reguladora',
    'porcentaje',
  ),
  p(
    'ip-cualificada-edad',
    'incapacidad-permanente-reglas',
    'total-cualificada-edad-minima-meses',
    'Edad mínima del incremento de la total cualificada',
    'duracion',
  ),
  p(
    'ip-gi-base-minima',
    'incapacidad-permanente-reglas',
    'gran-incapacidad-complemento-pct-base-minima',
    'Complemento de gran incapacidad: parte de la base mínima de cotización',
    'porcentaje',
  ),
  p(
    'ip-gi-ultima-base',
    'incapacidad-permanente-reglas',
    'gran-incapacidad-complemento-pct-ultima-base',
    'Complemento de gran incapacidad: parte de la última base de cotización',
    'porcentaje',
  ),
  p(
    'ip-gi-minimo',
    'incapacidad-permanente-reglas',
    'gran-incapacidad-complemento-minimo-pct',
    'Complemento de gran incapacidad: mínimo, sobre la pensión sin complemento',
    'porcentaje',
  ),
  p(
    'ip-parcial',
    'incapacidad-permanente-reglas',
    'parcial-mensualidades',
    'Mensualidades de la base reguladora de la incapacidad temporal que forman la cantidad a tanto alzado de la parcial',
    'numero',
  ),
  p(
    'ip-minima-absoluta',
    'pension-minima-incapacidad',
    '@version:ip-absoluta-unipersonal',
    'Pensión mínima de la incapacidad absoluta sin cónyuge a cargo',
    'euros-anio',
  ),
  p('pension-maxima', 'pension-maxima', '@anio', 'Pensión máxima por paga', 'euros-mes'),
  p('base-maxima', 'base-maxima-rg', '@anio', 'Base máxima de cotización', 'euros-mes'),
  p('base-minima', 'base-minima-rg', '@anio', 'Base mínima de cotización', 'euros-mes'),
];

export const PARAMETROS_SUPERVIVENCIA: readonly ParametroConfig[] = [
  p(
    'sv-carencia',
    'supervivencia-reglas',
    'carencia-alta-dias',
    'Cotización exigida al causante en alta',
    'dias',
  ),
  p(
    'sv-carencia-ventana',
    'supervivencia-reglas',
    'carencia-alta-ventana-meses',
    'Años anteriores al hecho causante en los que debe estar esa cotización',
    'duracion',
  ),
  p(
    'sv-br-meses',
    'supervivencia-reglas',
    'br-meses',
    'Meses ininterrumpidos de bases de la base reguladora',
    'meses',
  ),
  p(
    'sv-br-ventana',
    'supervivencia-reglas',
    'br-ventana-meses',
    'Meses anteriores en los que se elige ese periodo',
    'duracion',
  ),
  p(
    'sv-br-divisor',
    'supervivencia-reglas',
    'br-divisor',
    'Divisor de la base reguladora',
    'numero',
  ),
  p(
    'sv-viudedad',
    'supervivencia-reglas',
    'viudedad-pct',
    'Porcentaje general de la viudedad',
    'porcentaje',
  ),
  p(
    'sv-viudedad-65',
    'supervivencia-reglas',
    'viudedad-65-pct',
    'Porcentaje de la viudedad con edad avanzada y sin otras rentas',
    'porcentaje',
  ),
  p(
    'sv-viudedad-cargas',
    'supervivencia-reglas',
    'viudedad-cargas-pct',
    'Porcentaje de la viudedad con cargas familiares y rentas bajas',
    'porcentaje',
  ),
  p(
    'sv-garantia',
    'supervivencia-reglas',
    'concurrencia-garantia-pct',
    'Parte garantizada al cónyuge o pareja superviviente cuando concurren varias personas beneficiarias',
    'porcentaje',
  ),
  p(
    'sv-temporal',
    'supervivencia-reglas',
    'prestacion-temporal-meses',
    'Duración de la prestación temporal de viudedad',
    'duracion',
  ),
  p(
    'sv-orfandad',
    'supervivencia-reglas',
    'orfandad-pct',
    'Porcentaje de la base reguladora por cada huérfano o huérfana',
    'porcentaje',
  ),
  p(
    'sv-orfandad-edad',
    'supervivencia-reglas',
    'orfandad-edad-limite-meses',
    'Edad hasta la que se cobra la orfandad con carácter general',
    'duracion',
  ),
  p(
    'sv-orfandad-abs',
    'supervivencia-reglas',
    'orfandad-absoluta-incremento-pct',
    'Incremento de la orfandad absoluta, repartido entre los huérfanos',
    'porcentaje',
  ),
  p(
    'sv-limite',
    'supervivencia-reglas',
    'limite-conjunto-pct-br',
    'Límite de la suma de las pensiones, sobre la base reguladora',
    'porcentaje',
  ),
  p(
    'sv-minima-viudedad',
    'pension-minima-viudedad',
    '@version:viud-menor60-unipersonal',
    'Pensión mínima de viudedad, tramo de edad inferior y sin cargas familiares',
    'euros-anio',
  ),
  p(
    'sv-minima-orfandad',
    'pension-minima-orfandad-familiares',
    '@version:orf-unico',
    'Pensión mínima de orfandad, una sola persona',
    'euros-anio',
  ),
  p('pension-maxima', 'pension-maxima', '@anio', 'Pensión máxima por paga', 'euros-mes'),
  p('smi', 'smi-anual', '@anio', 'Salario mínimo interprofesional anual', 'euros-anio'),
];
