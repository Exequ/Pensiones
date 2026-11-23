/**
 * Referencias normativas de la página «Cómo se calcula»: etiqueta que ve la persona, fichero del
 * texto descargado (`data-raw/boe/`) y encabezado literal con el que empieza el artículo o la
 * disposición en ese fichero. Un test (`scripts/como-se-calcula-fase.test.ts`) abre cada fichero y
 * comprueba que el encabezado existe: ninguna referencia sin texto descargado.
 *
 * Este módulo solo contiene identificadores (números de artículo y de disposición): no es texto de
 * datos. Los números de artículo no son cifras de datos y por eso este fichero se excluye del
 * detector de cifras.
 */
export interface Norma {
  readonly id: string;
  /** Cómo se escribe en la página: «art. 209 TRLGSS». */
  readonly etiqueta: string;
  readonly fichero: string;
  /** Principio literal de la línea de encabezado en el texto descargado. */
  readonly encabezado: string;
}

const TR = 'data-raw/boe/trlgss-2015-consolidado.txt';
const D3158 = 'data-raw/boe/decreto-3158-1966.txt';
const D1646 = 'data-raw/boe/decreto-1646-1972.txt';
const O1969 = 'data-raw/boe/orden-15-04-1969.txt';
const RD1799 = 'data-raw/boe/rd-1799-1985.txt';
const RD900 = 'data-raw/boe/rd-900-2018.txt';
const RD371 = 'data-raw/boe/rd-371-2023.txt';

const tr = (n: string, titulo: string): Norma => ({
  id: `trlgss-${n}`,
  etiqueta: `art. ${n} TRLGSS`,
  fichero: TR,
  encabezado: `Artículo ${n}. ${titulo}`,
});
const dt = (id: string, ordinal: string, etiqueta: string, titulo: string): Norma => ({
  id,
  etiqueta: `${etiqueta} TRLGSS`,
  fichero: TR,
  encabezado: `Disposición transitoria ${ordinal}. ${titulo}`,
});

export const NORMAS: readonly Norma[] = [
  tr('57', 'Limitación de la cuantía inicial'),
  tr('58', 'Revalorización y garantía'),
  tr('59', 'Complementos para pensiones inferiores a la mínima'),
  tr('60', 'Complemento de pensiones contributivas para la reducción de la brecha de género'),
  tr('194', 'Grados de incapacidad permanente'),
  tr('195', 'Beneficiarios'),
  tr('196', 'Prestaciones económicas'),
  tr('197', 'Base reguladora de las pensiones de incapacidad permanente'),
  tr('205', 'Beneficiarios'),
  tr('207', 'Jubilación anticipada por causa no imputable al trabajador'),
  tr('208', 'Jubilación anticipada por voluntad del interesado'),
  tr('209', 'Base reguladora de la pensión de jubilación'),
  tr('210', 'Cuantía de la pensión'),
  tr('217', 'Sujetos causantes'),
  tr('219', 'Pensión de viudedad del cónyuge superviviente'),
  tr('220', 'Pensión de viudedad en supuestos de separación, divorcio o nulidad matrimonial'),
  tr('221', 'Pensión de viudedad de parejas de hecho'),
  tr('222', 'Prestación temporal de viudedad'),
  tr('224', 'Pensión de orfandad y prestación de orfandad'),
  tr('228', 'Base reguladora de las prestaciones por muerte y supervivencia'),
  tr('229', 'Límite de las cuantías de las pensiones'),
  dt('trlgss-dt4', 'cuarta', 'DT 4.ª', 'Aplicación de legislaciones anteriores'),
  dt('trlgss-dt7', 'séptima', 'DT 7.ª', 'Aplicación paulatina de la edad de jubilación'),
  dt('trlgss-dt8', 'octava', 'DT 8.ª', 'Normas transitorias sobre la base reguladora'),
  dt(
    'trlgss-dt9',
    'novena',
    'DT 9.ª',
    'Aplicación de los porcentajes a atribuir a los años cotizados',
  ),
  dt('trlgss-dt26', 'vigésima sexta', 'DT 26.ª', 'Calificación de la incapacidad permanente'),
  dt('trlgss-dt34', 'trigésima cuarta', 'DT 34.ª', 'Aplicación gradual de coeficientes reductores'),
  dt(
    'trlgss-dt38',
    'trigésima octava',
    'DT 38.ª',
    'Norma transitoria para la aplicación del tope máximo de la base de cotización',
  ),
  dt(
    'trlgss-dt39',
    'trigésima novena',
    'DT 39.ª',
    'Norma transitoria para la determinación del límite máximo',
  ),
  dt('trlgss-dt40', 'cuadragésima', 'DT 40.ª', 'Normas transitorias sobre la base reguladora'),
  dt(
    'trlgss-dt41',
    'cuadragésima primera',
    'DT 41.ª',
    'Integración de períodos sin obligación de cotizar',
  ),
  {
    id: 'd3158-31',
    etiqueta: 'art. 31 Decreto 3158/1966',
    fichero: D3158,
    encabezado: 'Artículo treinta y uno. Cuantía de la pensión.',
  },
  {
    id: 'd3158-36',
    etiqueta: 'art. 36 Decreto 3158/1966',
    fichero: D3158,
    encabezado: 'Artículo treinta y seis.',
  },
  {
    id: 'd3158-38',
    etiqueta: 'art. 38 Decreto 3158/1966',
    fichero: D3158,
    encabezado: 'Artículo treinta y ocho.',
  },
  {
    id: 'd1646-6',
    etiqueta: 'art. 6 Decreto 1646/1972',
    fichero: D1646,
    encabezado: 'Artículo sexto. Incremento de la pensión de incapacidad permanente total.',
  },
  {
    id: 'd1646-7',
    etiqueta: 'art. 7 Decreto 1646/1972',
    fichero: D1646,
    encabezado: 'Artículo séptimo. Base reguladora',
  },
  {
    id: 'd1646-9',
    etiqueta: 'art. 9 Decreto 1646/1972',
    fichero: D1646,
    encabezado: 'Artículo noveno. Cantidad a tanto alzado',
  },
  {
    id: 'o1969-15',
    etiqueta: 'art. 15 Orden de 15/04/1969',
    fichero: O1969,
    encabezado: 'Art. 15. Prestaciones económicas por incapacidad permanente total.',
  },
  {
    id: 'o1969-17',
    etiqueta: 'art. 17 Orden de 15/04/1969',
    fichero: O1969,
    encabezado: 'Art. 17. Prestaciones económicas por incapacidad permanente absoluta.',
  },
  {
    id: 'o1969-18',
    etiqueta: 'art. 18 Orden de 15/04/1969',
    fichero: O1969,
    encabezado: 'Art. 18. Prestaciones económicas por gran invalidez.',
  },
  {
    id: 'rd1799-4',
    etiqueta: 'art. 4 RD 1799/1985',
    fichero: RD1799,
    encabezado: 'Artículo 4.º Período mínimo de cotización exigible',
  },
  {
    id: 'rd1799-5',
    etiqueta: 'art. 5 RD 1799/1985',
    fichero: RD1799,
    encabezado: 'Artículo 5.º Base reguladora',
  },
  {
    id: 'rd900-3',
    etiqueta: 'art. 3 RD 900/2018',
    fichero: RD900,
    encabezado: 'Artículo 3. Mejora de la pensión de viudedad.',
  },
  {
    id: 'rd371-2',
    etiqueta: 'art. 2 RD 371/2023',
    fichero: RD371,
    encabezado: 'Artículo 2. Modalidades de abono del complemento económico.',
  },
];

const POR_ID: ReadonlyMap<string, Norma> = new Map(NORMAS.map((n) => [n.id, n]));

/** Norma por identificador; lanza si no existe (un test lo comprueba para todos los esquemas). */
export function norma(id: string): Norma {
  const n = POR_ID.get(id);
  if (n === undefined) throw new RangeError(`Norma desconocida: ${id}`);
  return n;
}

/**
 * Identificadores de las normas con nombre de propiedad (los esquemas los usan sin escribir números
 * en cadenas de texto). Un test comprueba que cada valor existe en `NORMAS`.
 */
export const N = {
  a57: 'trlgss-57',
  a58: 'trlgss-58',
  a59: 'trlgss-59',
  a60: 'trlgss-60',
  a194: 'trlgss-194',
  a195: 'trlgss-195',
  a196: 'trlgss-196',
  a197: 'trlgss-197',
  a205: 'trlgss-205',
  a207: 'trlgss-207',
  a208: 'trlgss-208',
  a209: 'trlgss-209',
  a210: 'trlgss-210',
  a217: 'trlgss-217',
  a219: 'trlgss-219',
  a220: 'trlgss-220',
  a221: 'trlgss-221',
  a222: 'trlgss-222',
  a224: 'trlgss-224',
  a228: 'trlgss-228',
  a229: 'trlgss-229',
  dt4: 'trlgss-dt4',
  dt7: 'trlgss-dt7',
  dt8: 'trlgss-dt8',
  dt9: 'trlgss-dt9',
  dt26: 'trlgss-dt26',
  dt34: 'trlgss-dt34',
  dt38: 'trlgss-dt38',
  dt39: 'trlgss-dt39',
  dt40: 'trlgss-dt40',
  dt41: 'trlgss-dt41',
  d3158_31: 'd3158-31',
  d3158_36: 'd3158-36',
  d3158_38: 'd3158-38',
  d1646_6: 'd1646-6',
  d1646_7: 'd1646-7',
  d1646_9: 'd1646-9',
  o1969_15: 'o1969-15',
  o1969_17: 'o1969-17',
  o1969_18: 'o1969-18',
  rd1799_4: 'rd1799-4',
  rd1799_5: 'rd1799-5',
  rd900_3: 'rd900-3',
  rd371_2: 'rd371-2',
} as const;

/**
 * Cómo se reconoce la norma de una ubicación («art. 31 Decreto 3158/1966») y de qué fichero de
 * `data/parametros` se toma su fuente (título, organismo, URL, fecha de descarga y confianza). Solo
 * identificadores y patrones: la fuente sale del primer dato del fichero cuyo título la nombra.
 */
export interface FuenteDeNorma {
  /** Nombre de la norma tal como aparece en una ubicación. */
  readonly patron: RegExp;
  /** Fichero de `data/parametros` (sin extensión) con un dato de esa fuente. */
  readonly fichero: string;
  /** Texto que identifica el título de la fuente dentro de ese fichero. */
  readonly titulo: RegExp;
}

export const FUENTES_DE_NORMA: readonly FuenteDeNorma[] = [
  {
    patron: /Decreto 3158\/1966/,
    fichero: 'incapacidad-permanente-reglas',
    titulo: /3158\/1966/,
  },
  {
    patron: /Decreto 1646\/1972/,
    fichero: 'incapacidad-permanente-reglas',
    titulo: /1646\/1972/,
  },
  {
    patron: /Orden de 15\/04\/1969/,
    fichero: 'incapacidad-permanente-reglas',
    titulo: /15 de abril de 1969/,
  },
  { patron: /RD 1799\/1985/, fichero: 'incapacidad-permanente-reglas', titulo: /1799\/1985/ },
  { patron: /RD 900\/2018/, fichero: 'supervivencia-reglas', titulo: /900\/2018/ },
  { patron: /RD 371\/2023/, fichero: 'jubilacion-demora-reglas', titulo: /371\/2023/ },
  { patron: /Ley 21\/2021/, fichero: 'jubilacion-demora-reglas', titulo: /21\/2021/ },
  {
    patron: /TRLGSS/,
    fichero: 'jubilacion-coeficientes-voluntaria',
    titulo: /texto refundido de la Ley General de la Seguridad Social/,
  },
];
