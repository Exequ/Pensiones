/**
 * Citas normativas dentro de los textos de `normativa/prestaciones.json` (Fase R5).
 *
 * Los datos conservan íntegros sus textos, con los artículos entre paréntesis o dentro de la frase.
 * La interfaz muestra el texto sin ellos (`quitarCitas`) y lleva las citas al desplegable «Fuentes»
 * de cada bloque (`citasDeTexto`). TypeScript puro, sin React ni DOM.
 */

import { Dato, type Fuente } from './esquema-datos.ts';

/** Número de artículo: «205», «205.1», «205.1.a)», «219.1» o varios («217 y 219», «195.2 y 195.3»). */
const NUMERO = String.raw`\d+(?:\.(?:\d+\.º|\d+|[a-z]\)?|Uno|Dos|Tres|Cuatro))*(?:\s+(?:bis|ter|quáter))?(?:-\d+)?`;
const LISTA = String.raw`${NUMERO}(?:\s*(?:,|y|a|e)\s*${NUMERO})*`;
/** «art. 205», «arts. 217 y 219», «artículo 221», opcionalmente con «TRLGSS» o «apartados siguientes». */
const ARTICULO = String.raw`(?:\barts?\.|\bartículos?)\s*${LISTA}(?:\s+apartados\s+siguientes)?(?:\s+(?:TRLGSS|ET))?`;
/** «DT 7.ª», «DT 4.ª.7»: disposición transitoria abreviada. */
const DISPOSICION = String.raw`\bDT\s*\d+\.ª(?:\.\d+)?`;
const CITA = String.raw`(?:${ARTICULO}|${DISPOSICION})`;
/** Cita con su párrafo y el nombre de la norma detrás: «art. 36.Uno, párr. 2.º, Decreto 3158/1966». */
const CITA_EXTENDIDA = String.raw`${CITA}(?:,\s*párr(?:afo|\.)\s*[^,;()]+)?(?:,?\s*(?:de la\s+)?(?:Orden de|RDL?|Decreto|Ley)\s*[\d/]+)?`;

/**
 * Frases en las que la cita es parte de la oración y quitar solo el número dejaría un texto sin
 * sentido. Cada una se reescribe con lo que dice la propia norma recogida en los datos
 * (`supervivencia-reglas`, `prestaciones`), sin añadir hechos. Se aplican antes que las reglas
 * generales.
 */
const REESCRITURAS: readonly (readonly [RegExp, string])[] = [
  // Coeficientes reductores de la edad por actividad (arts. 206 y 206 bis): lo dicen los propios textos.
  [
    new RegExp(String.raw`sin aplicar coeficientes reductores de los ${ARTICULO}`, 'g'),
    'sin aplicar los coeficientes reductores de la edad por actividad',
  ],
  [
    new RegExp(String.raw`anticipaciones por ${ARTICULO}`, 'g'),
    'anticipaciones por actividades penosas, discapacidad o mutualistas',
  ],
  [new RegExp(String.raw`y supuestos del ${ARTICULO}`, 'g'), 'y otros supuestos legales'],
  // «actualizada solo con el art. 58.2»: la revalorización general (así lo dicen los textos de las lecturas).
  [
    new RegExp(String.raw`actualizada solo con el ${ARTICULO}`, 'g'),
    'actualizada solo con la revalorización general',
  ],
  // La disposición transitoria sin número sigue diciendo de qué se trata.
  [new RegExp(String.raw`\bde la ${DISPOSICION}`, 'g'), 'de la disposición transitoria'],
  // Edad de acceso a la jubilación ordinaria (art. 205.1.a): «tenga la edad del artículo 205.1.a)».
  [new RegExp(String.raw`la edad del ${ARTICULO}`, 'g'), 'la edad ordinaria de jubilación'],
  // Pensionista causante (art. 217.1.c): titulares de jubilación o incapacidad permanente contributivas.
  [
    new RegExp(String.raw`pensionista en los términos del ${ARTICULO}`, 'g'),
    'pensionista de jubilación o de incapacidad permanente contributivas',
  ],
  // Causante sin alta (art. 219.1, segundo párrafo): cotización de quince años sin estar en alta.
  [
    new RegExp(String.raw`en los supuestos del segundo párrafo del ${ARTICULO}`, 'g'),
    'en los supuestos en que el causante no estaba en alta',
  ],
  [
    new RegExp(String.raw`lo establecido en el segundo párrafo del ${ARTICULO}`, 'g'),
    'lo establecido para la pensión de viudedad cuando el causante no estaba en alta',
  ],
  [new RegExp(String.raw`en los términos del ${ARTICULO}`, 'g'), 'en los términos legales'],
  [new RegExp(String.raw`las excepciones del ${ARTICULO}`, 'g'), 'las excepciones legales'],
  [new RegExp(String.raw`los límites del ${ARTICULO}`, 'g'), 'los límites legales'],
  // Nombre de la ley sin la sigla.
  [/texto consultado del TRLGSS/g, 'texto consultado de la Ley General de la Seguridad Social'],
  // Remisión a otra norma: la cita es toda la oración subordinada.
  [new RegExp(String.raw`\s*\(por remisión al? ${CITA}\)`, 'g'), ''],
];

/** Texto sin las citas normativas; el resto de la frase se conserva. */
export function quitarCitas(texto: string): string {
  let t = texto;
  for (const [patron, sustituto] of REESCRITURAS) t = t.replace(patron, sustituto);
  // Paréntesis que solo contienen una cita: «(art. 205 TRLGSS)», «(arts. 217 y 219 TRLGSS)», «(DT 39.ª)».
  t = t.replace(new RegExp(String.raw`\s*\(${CITA}\)`, 'g'), '');
  // Ídem con el nombre de la norma detrás o varias citas: «(art. 12.1 RD 1131/2002)», «(arts. 206, 206 bis; DT 4.ª.2)».
  t = t.replace(
    new RegExp(
      String.raw`\s*\(\s*${CITA_EXTENDIDA}(?:\s*(?:;|,|y)\s*${CITA_EXTENDIDA})*\s*\)`,
      'g',
    ),
    '',
  );
  // Citas dentro de la frase: «del art. 165.1», «según DT 7.ª», «, art. 220)».
  t = t.replace(
    new RegExp(
      String.raw`\s+(?:del?|al?|en|según|por)\s+(?:el\s+|la\s+|los\s+|las\s+)?${CITA}(?:\s+párr(?:afo|\.)\s+\d+\.º)?`,
      'g',
    ),
    '',
  );
  t = t.replace(new RegExp(String.raw`,\s*${CITA}(?=\))`, 'g'), '');
  // Cita al principio de un paréntesis con más contenido: «(art. 209.1, texto vigente)».
  t = t.replace(new RegExp(String.raw`\(\s*${CITA}\s*,\s*`, 'g'), '(');
  t = t.replace(new RegExp(String.raw`\s*\(\s*(?:y\s*,?\s*)?\)`, 'g'), '');
  // Espacios y signos que quedan sueltos.
  return t
    .replace(/\s+([.,;:)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/** Texto de la cita tal como figura, sin el «TRLGSS» final ni espacios sobrantes. */
const limpiarCita = (c: string): string => c.replace(/\s+/g, ' ').trim();

/** Citas normativas que contiene un texto, en orden de aparición y sin repetir. */
export function citasDeTexto(texto: string): string[] {
  const vistas: string[] = [];
  for (const m of texto.matchAll(new RegExp(CITA, 'g'))) {
    const c = limpiarCita(m[0]);
    if (!vistas.includes(c)) vistas.push(c);
  }
  return vistas;
}

/** Núcleo numérico de una cita («art. 205.3» → «205.3»), para ver si otro texto ya la recoge. */
function nucleo(cita: string): string {
  return cita.replace(/^(?:arts?\.|artículos?|DT)\s*/, '').replace(/\s+TRLGSS$/, '');
}

/**
 * Ubicación de un bloque para el desplegable de fuentes: el artículo que declara el dato
 * (`declarada`, p. ej. `requisitos[].articulo`) y las citas que el texto lleva dentro y la
 * declarada no recoge. Devuelve `undefined` si no hay ninguna.
 */
export function ubicacionDeBloque(texto: string, declarada?: string): string | undefined {
  const partes: string[] = [];
  if (declarada !== undefined && declarada.trim() !== '') partes.push(declarada.trim());
  for (const c of citasDeTexto(texto)) {
    const n = nucleo(c);
    if (declarada === undefined || !declarada.includes(n)) partes.push(c);
  }
  return partes.length === 0 ? undefined : partes.join('; ');
}

/** Dato de un bloque de texto con un rótulo opcional para el desplegable de fuentes. */
export type DatoDeBloque = Dato & { readonly rotulo?: string | undefined };

/** Origen de un bloque de texto de una prestación (la fuente de la prestación y su fecha y confianza). */
export interface OrigenBloque {
  readonly source: Fuente;
  readonly fetchedAt: string;
  readonly confidence: Dato['confidence'];
}

/**
 * Dato de un bloque de texto (quién puede cobrarla, un requisito, los límites…): lleva la fuente de
 * la prestación y, como ubicación, los artículos que cita el bloque (`ubicacionDeBloque`). El texto
 * original, con sus citas, queda en `value`; la interfaz muestra el texto sin ellas (`quitarCitas`).
 */
export function datoDeBloque(
  origen: OrigenBloque,
  periodo: string,
  rotulo: string,
  texto: string,
  declarada?: string,
): DatoDeBloque {
  const ubicacion = ubicacionDeBloque(texto, declarada);
  const dato = Dato.parse({
    value: texto,
    unit: 'regla de la prestación',
    period: periodo,
    source: origen.source,
    fetchedAt: origen.fetchedAt,
    confidence: origen.confidence,
    ...(ubicacion === undefined ? {} : { location: ubicacion }),
  });
  return { ...dato, rotulo };
}
