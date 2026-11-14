/**
 * Años que llevan en su identificador los datos acumulados o anuales de los ficheros de /data
 * (p. ej. `transferencias-corrientes-<inicio>-<fin>` o `transferencias-covid-<año>`). Así los
 * rótulos de periodo salen de los datos y no se escriben a mano.
 */

/** Años de inicio y fin de un identificador «…-AAAA-AAAA». */
export function rangoDeId(id: string): [number, number] {
  const m = /-(\d{4})-(\d{4})$/.exec(id);
  if (!m?.[1] || !m[2]) throw new Error(`El identificador «${id}» no lleva un rango de años`);
  return [Number(m[1]), Number(m[2])];
}

/** Año de un identificador «…-AAAA». */
export function anioDeId(id: string): number {
  const m = /-(\d{4})$/.exec(id);
  if (!m?.[1]) throw new Error(`El identificador «${id}» no lleva un año`);
  return Number(m[1]);
}

/** «2018-2022» a partir del identificador de un dato acumulado. */
export function periodoDeId(id: string): string {
  const [desde, hasta] = rangoDeId(id);
  return `${desde}-${hasta}`;
}
