/**
 * Cálculo de verificación (no del motor): tasa bruta de reposición teórica de una carrera completa con las
 * reglas de la base reguladora de jubilación de /data (ventana, número de bases, divisor × 14/12, 24 meses
 * sin actualizar y resto con el IPC, porcentaje del 100 % de la escala).
 *
 * Sirve para comprobar, desde /data, las cifras que el revisor actuarial dio como cálculo propio (tanda 3, n.º 8, 10, 12 y 26):
 * no es una función del simulador ni cambia la lógica del motor, y sus resultados no se publican en la web.
 *
 * Supuestos (los de la OCDE leídos en /data): el trabajador gana siempre el salario medio, que crece con el
 * crecimiento real y la inflación; la base de cotización mensual es el salario mensual (incluye la parte
 * proporcional de las pagas) y la pensión se paga en catorce pagas; el último salario es el del último mes.
 */

export interface SupuestosReposicion {
  /** Crecimiento real anual de los salarios (0,0125 = 1,25 %). */
  readonly crecimientoReal: number;
  /** Inflación anual (0,02 = 2 %). */
  readonly inflacion: number;
  /** Meses cotizados (de los 22 a los 65 años: 516). */
  readonly mesesCarrera: number;
}

export interface ReglaBaseReguladora {
  /** Meses de la ventana (348 desde 2037). */
  readonly ventana: number;
  /** Bases de mayor importe que se computan (324 desde 2037). */
  readonly bases: number;
  /** Meses anteriores al mes previo que se computan sin actualizar (24). */
  readonly mesesNominales: number;
}

/** Pensión anual de la primera paga ÷ último salario anual (12 × el salario del último mes), con el 100 % de la escala. */
export function tasaBrutaReposicion(s: SupuestosReposicion, r: ReglaBaseReguladora): number {
  const crecimientoNominal = (1 + s.crecimientoReal) * (1 + s.inflacion);
  const salario = (mes: number) => crecimientoNominal ** (mes / 12);
  const ipc = (mes: number) => (1 + s.inflacion) ** (mes / 12);
  // Mes 0 = primer mes cotizado; el hecho causante es el mes `mesesCarrera`, el mes previo es mesesCarrera − 1 y
  // la ventana empieza en el mes anterior al previo (mesesCarrera − 2) y retrocede.
  const meses = Array.from({ length: r.ventana }, (_, j) => s.mesesCarrera - 2 - j);
  const referencia = meses[r.mesesNominales - 1] as number;
  const bases = meses.map((m, i) =>
    i < r.mesesNominales ? salario(m) : (salario(m) * ipc(referencia)) / ipc(m),
  );
  const mejores = [...bases].sort((a, b) => b - a).slice(0, r.bases);
  const suma = mejores.reduce((a, b) => a + b, 0);
  const baseReguladora = suma / ((r.bases * 14) / 12);
  const pensionAnual = baseReguladora * 14;
  const salarioAnualFinal = salario(s.mesesCarrera - 1) * 12;
  return pensionAnual / salarioAnualFinal;
}
