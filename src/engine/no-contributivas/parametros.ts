/**
 * Parámetros del motor de PNC: `pnc-reglas`, el importe anual, el complemento de alquiler y el
 * IPREM. Ninguna cifra legal en el código.
 */
import { ArchivoDatos } from '../esquema-datos.ts';
import { DatoNoDisponible } from '../jubilacion/errores.ts';
import {
  ref,
  serieAnual,
  valorExacto,
  type LeerDatos,
  type SerieAnual,
} from '../jubilacion/parametros.ts';

export const FICHERO_REGLAS_PNC = 'pnc-reglas';

export interface ParametrosPNC {
  readonly reglasPNC: ReadonlyMap<string, number>;
  readonly importeAnual: SerieAnual;
  readonly complementoAlquiler: SerieAnual;
  /** IPREM anual de 12 mensualidades (sin pagas extra) con el que el IMSERSO calcula el límite del art. 366. */
  readonly ipremAnual: SerieAnual;
}

export function construirParametrosPNC(leer: LeerDatos): ParametrosPNC {
  const reglasPNC = new Map<string, number>();
  for (const d of ArchivoDatos.parse(leer(FICHERO_REGLAS_PNC)).data ?? []) {
    if (typeof d.value === 'number') reglasPNC.set(d.id, d.value);
  }
  return {
    reglasPNC,
    importeAnual: serieAnual(leer, 'pnc-importe-anual'),
    complementoAlquiler: serieAnual(leer, 'pnc-complemento-alquiler'),
    ipremAnual: serieAnual(leer, 'pnc-iprem-anual-sin-pagas-extra'),
  };
}

export function reglaPNC(p: ParametrosPNC, id: string): number {
  const v = p.reglasPNC.get(id);
  if (v === undefined) throw new DatoNoDisponible(`parametros/${FICHERO_REGLAS_PNC}.json#${id}`);
  return v;
}

export function refPNC(id: string): string {
  return ref(FICHERO_REGLAS_PNC, id);
}

/** Valor de un año concreto de una serie; sin extender ni buscar otro año (error claro si falta). */
export function valorDelAnio(
  serie: SerieAnual,
  anio: number,
  que: string,
): { readonly valor: number; readonly ref: string } {
  const v = valorExacto(serie, anio);
  if (v === undefined) {
    throw new DatoNoDisponible(
      `${que} de ${anio} (parametros/${serie.fichero}.json); consta en docs/PENDIENTE_DATOS.md`,
    );
  }
  return { valor: v, ref: ref(serie.fichero, anio) };
}

/**
 * Primer año que cubre el motor: el de la primera norma de revalorización con complemento de
 * alquiler en /data (las citas de /data están comprobadas en las redacciones vigentes desde 2022).
 */
export function desdeMotorPNC(p: ParametrosPNC): number {
  return p.complementoAlquiler.primero;
}
