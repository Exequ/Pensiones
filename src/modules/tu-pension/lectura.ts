/** Lectura de números escritos por una persona (convención española). Compartido por el formulario y los tramos. */

/**
 * Número escrito por una persona, con la convención española: la coma es el separador decimal y el
 * punto agrupa miles («2.500» es dos mil quinientos; «2.5» es dos coma cinco). `undefined` si no
 * es un número.
 */
export function leerNumero(texto: string): number | undefined {
  const t = texto.trim().replace(/\s/g, '');
  let limpio: string;
  if (t.includes(',')) limpio = t.replace(/\./g, '').replace(',', '.');
  else if (/^[+-]?\d{1,3}(\.\d{3})+$/.test(t)) limpio = t.replace(/\./g, '');
  else limpio = t;
  if (limpio === '' || !/^[+-]?\d+(\.\d+)?$/.test(limpio)) return undefined;
  const n = Number(limpio);
  return Number.isFinite(n) ? n : undefined;
}

/** Número como texto editable (coma decimal, sin agrupar miles). */
export function numeroATexto(n: number): string {
  return String(n).replace('.', ',');
}

export function leerEntero(texto: string): number | undefined {
  const n = leerNumero(texto);
  return n !== undefined && Number.isInteger(n) ? n : undefined;
}
