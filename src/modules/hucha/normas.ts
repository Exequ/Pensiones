/**
 * Texto de las normas que regulan el Fondo de Reserva para la tabla de la página (fase R8): sin
 * artículos ni citas literales en el cuerpo. Los artículos van como ubicación y los fragmentos
 * literales como cita del desplegable «Fuentes» (en el `Dato` de cada norma).
 */
import { quitarCitas } from '../../engine/citas-normativas';

/**
 * Paráfrasis de los fragmentos que la cronología normativa recoge entre comillas angulares (cita
 * literal de la ley). Si un dato nuevo trae otro fragmento, `reglaSinLiterales` falla: hay que
 * añadir su paráfrasis aquí en vez de mostrar la cita en el cuerpo.
 */
export const PARAFRASIS_LITERALES: Readonly<Record<string, string>> = {
  'prioritaria y mayoritariamente': 'con carácter prioritario y en su mayor parte',
};

/** Fragmentos literales (entre «…») de un texto, en orden. */
export function literalesDe(texto: string): string[] {
  return [...texto.matchAll(/«([^»]+)»/g)].map((m) => m[1] ?? '');
}

/**
 * Texto de una regla para el cuerpo: sin artículos y con cada cita literal sustituida por su
 * paráfrasis. Devuelve también los literales, que pasan al desplegable «Fuentes».
 */
export function reglaSinLiterales(regla: string): { texto: string; literales: string[] } {
  const literales = literalesDe(regla);
  let texto = quitarCitas(regla);
  for (const l of literales) {
    const parafrasis = PARAFRASIS_LITERALES[l];
    if (parafrasis === undefined)
      throw new Error(`Sin paráfrasis para el fragmento literal «${l}» de las normas del Fondo`);
    texto = texto.replace(`«${l}»`, parafrasis);
  }
  return { texto, literales };
}
