/**
 * Resumen de la opción de la DT 4.ª.7 TRLGSS («opción de 25 años») a partir de los parámetros de
 * /data (Ajustes actuariales 4, punto 3): periodo y divisor de los años en que la opción no cambia,
 * años de transición con periodo y divisor propios, último año con opción y primer año sin ella.
 *
 * La DT 4.ª.7 aplica «en su integridad» el art. 209.1 en su redacción vigente el 1 de enero de 2023
 * cuando resulta más favorable: computa todas las bases de la ventana, sin descartar ninguna. Lógica
 * pura: no lee ficheros ni formatea textos.
 */
import { valorEn, valorExacto, type ParametrosJubilacion } from './parametros.ts';

export interface AnioOpcion25 {
  readonly anio: number;
  readonly meses: number;
  readonly divisor: number;
}

export interface ResumenOpcion25 {
  /** Primer año del hecho causante con opción. */
  readonly primerAnio: number;
  /** Último año con opción (indicador 1). */
  readonly ultimoAnio: number;
  /** Primer año sin opción (indicador 0); desde él, solo la regla general. */
  readonly primerAnioSinOpcion: number;
  /** Periodo (meses) y divisor del primer año, que se mantienen hasta el primer año de transición. */
  readonly mesesBase: number;
  readonly divisorBase: number;
  /** Años con periodo o divisor distintos de los del primer año (2041 a 2043 con los datos actuales). */
  readonly transicion: readonly AnioOpcion25[];
}

type Params = Pick<
  ParametrosJubilacion,
  'opcion25Aplicable' | 'opcion25Ventana' | 'opcion25Divisor'
>;

export function resumenOpcion25(p: Params): ResumenOpcion25 {
  const anios = [...p.opcion25Aplicable.valores.keys()].sort((a, b) => a - b);
  const con = anios.filter((a) => p.opcion25Aplicable.valores.get(a) === 1);
  const sin = anios.filter((a) => p.opcion25Aplicable.valores.get(a) === 0);
  const primerAnio = con[0];
  const ultimoAnio = con[con.length - 1];
  const primerAnioSinOpcion = sin.find((a) => ultimoAnio !== undefined && a > ultimoAnio);
  if (primerAnio === undefined || ultimoAnio === undefined || primerAnioSinOpcion === undefined) {
    throw new RangeError('opcion-25-anos-aplicable: faltan los años con y sin opción');
  }
  const mesesBase = valorEn(p.opcion25Ventana, primerAnio).valor;
  const divisorBase = valorEn(p.opcion25Divisor, primerAnio).valor;
  const transicion: AnioOpcion25[] = [];
  for (let a = primerAnio; a <= ultimoAnio; a++) {
    const meses = valorExacto(p.opcion25Ventana, a);
    const divisor = valorExacto(p.opcion25Divisor, a);
    if (meses === undefined || divisor === undefined) {
      throw new RangeError(`opcion-25-anos: sin periodo o divisor para ${String(a)}`);
    }
    if (meses !== mesesBase || divisor !== divisorBase)
      transicion.push({ anio: a, meses, divisor });
  }
  return { primerAnio, ultimoAnio, primerAnioSinOpcion, mesesBase, divisorBase, transicion };
}
