/**
 * Salvaguarda del apartado 1 de la DT 34.ª TRLGSS con sus dos lecturas a la vista (Ajustes
 * actuariales 4, punto 4). La lectura `jubilacion.salvaguardaDT34` sigue pendiente con el valor A
 * por defecto: la norma no precisa con qué pensión máxima se compara la pensión con las normas de
 * 2021. Solo afecta a la jubilación anticipada voluntaria cuya pensión supera la máxima (el motor
 * deja entonces el paso `coeficiente-sobre-limite`); en los demás casos las dos lecturas coinciden y
 * no se muestra nada.
 *
 * - Lectura A: compara con la máxima del año actualizada solo con la revalorización (sin el
 *   incremento adicional de la DT 39.ª), reducida un 0,50 % por trimestre (art. 210.3 de 2015).
 * - Lectura B: compara con la cuantía de 2021, que no llega a actuar: el motor no hace la comparación.
 *
 * Lógica pura: recibe una función que calcula con la lectura indicada.
 */
export const PASO_SOBRE_LIMITE = 'coeficiente-sobre-limite';

export type LecturaDT34 = 'A' | 'B';

interface ResultadoMinimo {
  readonly pensionMensual: number;
  readonly pasos: readonly { readonly id: string }[];
}

export interface DosLecturasDT34 {
  readonly lecturaA: number;
  readonly lecturaB: number;
}

/** La anticipada voluntaria con la pensión por encima de la máxima: el único caso afectado. */
export function afectaSalvaguardaDT34(pasos: readonly { readonly id: string }[]): boolean {
  return pasos.some((p) => p.id === PASO_SOBRE_LIMITE);
}

/**
 * Pensión mensual con cada lectura, o `undefined` si el caso no está afectado (con ninguna de las
 * dos lecturas aparece el paso del coeficiente sobre el límite).
 */
export function dosLecturasDT34(
  calcular: (lectura: LecturaDT34) => ResultadoMinimo,
): DosLecturasDT34 | undefined {
  const a = calcular('A');
  const b = calcular('B');
  if (!afectaSalvaguardaDT34(a.pasos) && !afectaSalvaguardaDT34(b.pasos)) return undefined;
  return { lecturaA: a.pensionMensual, lecturaB: b.pensionMensual };
}
