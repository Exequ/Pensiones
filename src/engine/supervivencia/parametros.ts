/**
 * Parámetros del motor de muerte y supervivencia: los de la jubilación (bases, máxima, mínimas,
 * revalorización, brecha…) más `supervivencia-reglas`, el SMI anual y el mensual. Ninguna cifra
 * legal en el código.
 */
import { ArchivoDatos } from '../esquema-datos.ts';
import { DatoNoDisponible } from '../jubilacion/errores.ts';
import {
  construirParametros,
  ref,
  serieAnual,
  type LeerDatos,
  type ParametrosJubilacion,
  type SerieAnual,
} from '../jubilacion/parametros.ts';

export const FICHERO_REGLAS_SV = 'supervivencia-reglas';

export interface ParametrosSupervivencia extends ParametrosJubilacion {
  /** Reglas numéricas de `supervivencia-reglas` (por id). */
  readonly reglasSV: ReadonlyMap<string, number>;
  readonly smiAnual: SerieAnual;
  readonly smiMensual: SerieAnual;
}

export function construirParametrosSupervivencia(leer: LeerDatos): ParametrosSupervivencia {
  const reglasSV = new Map<string, number>();
  for (const d of ArchivoDatos.parse(leer(FICHERO_REGLAS_SV)).data ?? []) {
    if (typeof d.value === 'number') reglasSV.set(d.id, d.value);
  }
  return {
    ...construirParametros(leer),
    reglasSV,
    smiAnual: serieAnual(leer, 'smi-anual'),
    smiMensual: serieAnual(leer, 'smi-mensual'),
  };
}

/** Regla numérica de supervivencia (error claro si falta en /data). */
export function reglaSV(p: ParametrosSupervivencia, id: string): number {
  const v = p.reglasSV.get(id);
  if (v === undefined) throw new DatoNoDisponible(`parametros/${FICHERO_REGLAS_SV}.json#${id}`);
  return v;
}

export function refSV(id: string): string {
  return ref(FICHERO_REGLAS_SV, id);
}

/**
 * Primer año de hecho causante que cubre el motor: el de la primera regla con periodo en el id
 * (`AAAA-…`, redacciones de la Ley 21/2021 en vigor desde 2022). Las citas de /data se han
 * comprobado en todas las redacciones vigentes desde esa fecha.
 */
export function desdeMotorSupervivencia(p: ParametrosSupervivencia): number {
  const anios = [...p.reglasSV.keys()]
    .map((k) => /^(\d{4})-/.exec(k)?.[1])
    .filter((a): a is string => a !== undefined)
    .map(Number);
  if (anios.length === 0) throw new DatoNoDisponible(`parametros/${FICHERO_REGLAS_SV}.json`);
  return Math.min(...anios);
}
