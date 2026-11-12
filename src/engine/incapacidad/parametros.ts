/**
 * Parámetros del motor de incapacidad permanente: los de la jubilación (bases, IPC, escala, máxima,
 * mínimas, revalorización…) más `incapacidad-permanente-reglas`. Ninguna cifra legal en el código.
 */
import { ArchivoDatos } from '../esquema-datos.ts';
import { DatoNoDisponible } from '../jubilacion/errores.ts';
import {
  construirParametros,
  ref,
  type LeerDatos,
  type ParametrosJubilacion,
} from '../jubilacion/parametros.ts';

export const FICHERO_REGLAS_IP = 'incapacidad-permanente-reglas';

export interface ParametrosIncapacidad extends ParametrosJubilacion {
  /** Reglas numéricas de `incapacidad-permanente-reglas` (por id). */
  readonly reglasIP: ReadonlyMap<string, number>;
  /** Reglas con valor de texto (definiciones de los grados, clase de la mínima que hace de suelo). */
  readonly textosIP: ReadonlyMap<string, string>;
}

export function construirParametrosIncapacidad(leer: LeerDatos): ParametrosIncapacidad {
  const reglasIP = new Map<string, number>();
  const textosIP = new Map<string, string>();
  for (const d of ArchivoDatos.parse(leer(FICHERO_REGLAS_IP)).data ?? []) {
    if (typeof d.value === 'number') reglasIP.set(d.id, d.value);
    else textosIP.set(d.id, d.value);
  }
  return { ...construirParametros(leer), reglasIP, textosIP };
}

/** Regla numérica de la incapacidad permanente, con su referencia a /data. */
export function reglaIP(p: ParametrosIncapacidad, id: string): number {
  const v = p.reglasIP.get(id);
  if (v === undefined) throw new DatoNoDisponible(`parametros/${FICHERO_REGLAS_IP}.json#${id}`);
  return v;
}

export function textoIP(p: ParametrosIncapacidad, id: string): string {
  const v = p.textosIP.get(id);
  if (v === undefined) throw new DatoNoDisponible(`parametros/${FICHERO_REGLAS_IP}.json#${id}`);
  return v;
}

export function refIP(id: string): string {
  return ref(FICHERO_REGLAS_IP, id);
}

/**
 * Regla de la gran incapacidad de la norma de revalorización del año (límite, revalorización y
 * mínimas): la del año, o la del último año anterior con dato.
 */
export function reglaGranIncapacidadDelAnio(
  p: ParametrosIncapacidad,
  anio: number,
  sufijo: string,
): { readonly valor: number; readonly ref: string } {
  let mejor: number | undefined;
  for (const id of p.reglasIP.keys()) {
    const m = /^(\d{4})-gran-incapacidad-(.+)$/.exec(id);
    if (m?.[2] !== sufijo) continue;
    const a = Number(m[1]);
    if (a <= anio && (mejor === undefined || a > mejor)) mejor = a;
  }
  if (mejor === undefined) {
    throw new DatoNoDisponible(
      `parametros/${FICHERO_REGLAS_IP}.json#${anio}-gran-incapacidad-${sufijo}`,
    );
  }
  const id = `${mejor}-gran-incapacidad-${sufijo}`;
  return { valor: reglaIP(p, id), ref: refIP(id) };
}
