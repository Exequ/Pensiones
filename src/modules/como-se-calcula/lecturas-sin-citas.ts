/**
 * Textos de las lecturas abiertas sin artículos ni «Norma: …» en el cuerpo (Fase R6). Los motivos de
 * las lecturas son registros del motor (`config/lecturas-por-defecto.json`) y no se modifican: la
 * página muestra el texto sin citas y lleva las ubicaciones al desplegable «Fuentes» de cada lectura.
 *
 * Reglas: se quitan las frases que son solo la cita («Norma: art. 209.1.b TRLGSS (…)»); el artículo
 * que hace de sujeto pasa a «la norma»; el resto de citas se quitan con `quitarCitas`. Se conservan
 * los nombres de norma cuando son el hecho («el divisor lo fija el RD 1799/1985») y las expresiones
 * entre comillas que forman parte del razonamiento, que además constan en el desplegable.
 */
import { citasDeTexto, quitarCitas } from '../../engine/citas-normativas';

const NUMERO = String.raw`\d+(?:\.\d+)*(?:\.[a-z]\)?)?`;
const ARTICULO = String.raw`art(?:ículo|\.)\s*${NUMERO}`;
/** «, párr. 2.º,» o «, párrafo segundo,» entre el artículo y el nombre de la norma. */
const PARRAFO = String.raw`(?:,\s*párr(?:afo|\.)\s*[^,]+,)?`;

/** Frase que es solo una cita: «Norma: …», «Normas: …» (hasta el punto que cierra la frase). */
const FRASE_DE_CITA = /^Normas?:\s/;
const FIN_DE_FRASE = /(?<=\.)\s+(?=[A-ZÁÉÍÓÚ(])/;

const REGLAS: readonly (readonly [RegExp, string])[] = [
  // «del art. 4.1 del RD 1799/1985» → «del RD 1799/1985».
  [new RegExp(String.raw`\bdel\s+${ARTICULO}${PARRAFO}\s+del\s+(RD|Decreto)\b`, 'g'), 'del $1'],
  // «(art. 5.4, párrafo 2.º, del RD 1799/1985)» → «(RD 1799/1985)».
  [new RegExp(String.raw`\(${ARTICULO}${PARRAFO}\s+del\s+(RD|Decreto)\b`, 'g'), '($1'],
  // «el art. 18 de la Orden de 1967» → «la Orden de 1967» (con mayúscula al empezar la frase).
  [new RegExp(String.raw`\bEl\s+${ARTICULO}\s+de la (Orden de \d{4})`, 'g'), 'La $1'],
  [new RegExp(String.raw`\bel\s+${ARTICULO}\s+de la (Orden de \d{4})`, 'g'), 'la $1'],
  // «el art. 7.1 del Decreto 1646/1972», «el art. 4.1 del RD 1799/1985» → «el Decreto 1646/1972».
  [
    new RegExp(String.raw`\b(?:[Ee]l\s+)?${ARTICULO}${PARRAFO}\s+del\s+(RD|Decreto)\b`, 'g'),
    'el $1',
  ],
  // El artículo como sujeto: «El art. 209.1.b integra…» → «La norma integra…».
  [new RegExp(String.raw`\bEl\s+${ARTICULO}(?:\s+TRLGSS)?(?=\s)`, 'g'), 'La norma'],
  [new RegExp(String.raw`\bel\s+${ARTICULO}(?:\s+TRLGSS)?(?=\s)`, 'g'), 'la norma'],
  // «solo importa el art. 219.1, párr. 2.º, no los…»: el artículo es el objeto.
  [new RegExp(String.raw`\bel\s+${ARTICULO}(?:,\s*párr(?:afo|\.)\s*[^,]+)?(?=,)`, 'g'), 'la norma'],
  // «en el art. 229.3» al final de una oración.
  [new RegExp(String.raw`\ben\s+el\s+${ARTICULO}(?=[;.,])`, 'g'), 'en la norma'],
];

/** Texto de una lectura sin artículos, abreviaturas de norma ni frases que son solo una cita. */
export function sinCitasDeLectura(texto: string): string {
  const frases = texto.split(FIN_DE_FRASE).filter((f) => !FRASE_DE_CITA.test(f));
  let t = frases.join(' ');
  for (const [patron, sustituto] of REGLAS) t = t.replace(patron, sustituto);
  return quitarCitas(t).replace(/\bla norma la norma\b/g, 'la norma');
}

/** Norma que se nombra justo detrás de un artículo: «art. 5.4 … del RD 1799/1985», «art. 195.3 TRLGSS». */
const NORMA_DETRAS = new RegExp(
  String.raw`${ARTICULO}${PARRAFO}\s*(TRLGSS|del\s+RD\s+[\d/]+|del\s+Decreto\s+[\d/]+|de la Orden de [\d/]+)`,
  'g',
);

/**
 * Ubicaciones de un texto de lectura que se pueden atribuir con seguridad a una norma, escritas como
 * en `datosDeUbicacion` («art. 209.1.b) TRLGSS; art. 7.1 Decreto 1646/1972»): el artículo con el
 * nombre de la norma que lo sigue o, si el texto no nombra más norma que el texto refundido, ese.
 * Las citas cuyo origen sería una conjetura (varias normas y artículo sin nombre) no se atribuyen.
 */
export function ubicacionDeLectura(texto: string): string {
  const partes: string[] = [];
  const conNombre = new Set<string>();
  for (const m of texto.matchAll(NORMA_DETRAS)) {
    const articulo = /art(?:ículo|\.)\s*(\d+(?:\.\d+)*(?:\.[a-z]\)?)?)/.exec(m[0])?.[1] ?? '';
    const norma = (m[1] ?? '').replace(/^del?\s+(?:la\s+)?/, '');
    partes.push(`art. ${articulo} ${norma}`.trim());
    conNombre.add(articulo);
  }
  const otrasNormas = /\b(?:RD|Decreto|Orden|Ley|RDL)\s+(?:de\s+)?\d/.test(texto);
  if (!otrasNormas) {
    for (const c of citasDeTexto(texto)) {
      const n = c.replace(/^(?:arts?\.|artículos?|DT)\s*/, '');
      if (!conNombre.has(n)) partes.push(c.includes('TRLGSS') ? c : `${c} TRLGSS`);
    }
  }
  return [...new Set(partes)].join('; ');
}
