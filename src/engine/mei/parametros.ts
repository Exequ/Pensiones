/**
 * Parámetros del motor del MEI y de la cotización adicional de solidaridad: `mei-reglas`, los tipos
 * de 2023 a 2029, el calendario de la DT 42.ª y los tipos de contingencias comunes. Ninguna cifra
 * legal en el código. Hereda los de la jubilación para la base máxima.
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

export const FICHERO_REGLAS_MEI = 'mei-reglas';
export const FICHERO_CALENDARIO_SOLIDARIDAD = 'cuota-solidaridad-calendario';

export interface ParametrosMEI extends ParametrosJubilacion {
  readonly reglasMEI: ReadonlyMap<string, number>;
  readonly meiTotal: SerieAnual;
  readonly meiEmpresa: SerieAnual;
  readonly meiTrabajador: SerieAnual;
  /** `AAAA-tramo-a|b|c` → tipo (%) de la DT 42.ª. */
  readonly calendarioSolidaridad: ReadonlyMap<string, number>;
  readonly tipoCCEmpresa: SerieAnual;
  readonly tipoCCTrabajador: SerieAnual;
}

function mapa(leer: LeerDatos, fichero: string): Map<string, number> {
  const m = new Map<string, number>();
  for (const d of ArchivoDatos.parse(leer(fichero)).data ?? []) {
    if (typeof d.value === 'number') m.set(d.id, d.value);
  }
  return m;
}

export function construirParametrosMEI(leer: LeerDatos): ParametrosMEI {
  return {
    ...construirParametros(leer),
    reglasMEI: mapa(leer, FICHERO_REGLAS_MEI),
    meiTotal: serieAnual(leer, 'mei-tipo-total'),
    meiEmpresa: serieAnual(leer, 'mei-tipo-empresa'),
    meiTrabajador: serieAnual(leer, 'mei-tipo-trabajador'),
    calendarioSolidaridad: mapa(leer, FICHERO_CALENDARIO_SOLIDARIDAD),
    tipoCCEmpresa: serieAnual(leer, 'tipo-cc-empresa'),
    tipoCCTrabajador: serieAnual(leer, 'tipo-cc-trabajador'),
  };
}

export function reglaMEI(p: ParametrosMEI, id: string): number {
  const v = p.reglasMEI.get(id);
  if (v === undefined) throw new DatoNoDisponible(`parametros/${FICHERO_REGLAS_MEI}.json#${id}`);
  return v;
}

export const refMEI = (id: string): string => ref(FICHERO_REGLAS_MEI, id);
