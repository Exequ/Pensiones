/**
 * Brecha de género de las pensiones de jubilación de la DA 37.ª.1 TRLGSS, calculada con la pensión
 * media de las altas iniciales de jubilación de cada año (Ajustes actuariales 4, punto 6).
 *
 * La DA 37.ª.1 la define como «el porcentaje que representa la diferencia entre el importe medio de
 * las pensiones de jubilación contributiva causadas en un año por las mujeres respecto del importe de
 * las pensiones causadas por los hombres»: (hombres − mujeres) ÷ hombres. La norma no precisa si el
 * importe medio incluye complementos; el dato de altas iniciales es la pensión media mensual que
 * publica la Seguridad Social. Lógica pura: sin React ni DOM.
 */

/** Fila de la tabla de altas iniciales y bajas definitivas (`data/sistema/altas-bajas-anual-clase-sexo`). */
export interface FilaAltaBajaSexo {
  readonly anio: number;
  readonly movimiento: string;
  readonly clase: string;
  readonly sexo: string;
  readonly pensionMedia: number | null;
}

export interface BrechaAnual {
  readonly anio: number;
  /** Pensión media mensual de las altas iniciales de jubilación de hombres y de mujeres. */
  readonly hombres: number;
  readonly mujeres: number;
  /** (hombres − mujeres) ÷ hombres, en fracción (0,18 = 18 %). */
  readonly brecha: number;
}

/** (hombres − mujeres) ÷ hombres, en fracción. */
export function brechaDA37(hombres: number, mujeres: number): number {
  if (!(hombres > 0) || !Number.isFinite(mujeres)) {
    throw new RangeError('La pensión media de los hombres debe ser positiva');
  }
  return (hombres - mujeres) / hombres;
}

/** Brecha de cada año con altas iniciales de jubilación de los dos sexos, ordenada por año. */
export function brechasAnualesDA37(filas: readonly FilaAltaBajaSexo[]): readonly BrechaAnual[] {
  const media = (anio: number, sexo: string) =>
    filas.find(
      (f) =>
        f.anio === anio &&
        f.movimiento === 'alta-inicial' &&
        f.clase === 'jubilacion' &&
        f.sexo === sexo,
    )?.pensionMedia ?? null;
  const anios = [...new Set(filas.map((f) => f.anio))].sort((a, b) => a - b);
  const salida: BrechaAnual[] = [];
  for (const anio of anios) {
    const hombres = media(anio, 'hombres');
    const mujeres = media(anio, 'mujeres');
    if (hombres === null || mujeres === null) continue;
    salida.push({ anio, hombres, mujeres, brecha: brechaDA37(hombres, mujeres) });
  }
  return salida;
}
