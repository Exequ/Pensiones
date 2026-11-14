/**
 * Consultas puras sobre las observaciones de la OCDE y de Eurostat (`data/internacional`). Sin React.
 * Cada consulta exige que el filtro identifique una única observación por país: si hay varias, es un
 * error (no se promedia ni se elige una al azar).
 */
import type { PuntoPais, ValorPais } from '../../engine/comparativa-internacional';

/** Fila de la tabla `ocde-pag` (CSV). */
export interface ObsOcde {
  readonly pais: string;
  readonly medida: string;
  readonly sexo: string;
  readonly edad: string;
  readonly opcionalidad: string;
  readonly unidad: string;
  readonly anio: number;
  readonly valor: number;
}

/** Fila de la tabla `eurostat-indicadores` (CSV). */
export interface ObsEurostat {
  readonly indicador: string;
  readonly pais: string;
  readonly sexo: string;
  readonly edad: string;
  readonly unidad: string;
  readonly anio: number;
  readonly valor: number;
}

export interface FiltroOcde {
  readonly medida: string;
  readonly sexo?: string;
  readonly edad?: string;
  readonly opcionalidad?: string;
  readonly unidad?: string;
}

export interface FiltroEurostat {
  readonly indicador: string;
  readonly unidad?: string;
  readonly sexo?: string;
  readonly edad?: string;
}

const cumpleOcde = (o: ObsOcde, f: FiltroOcde): boolean =>
  o.medida === f.medida &&
  (f.sexo === undefined || o.sexo === f.sexo) &&
  (f.edad === undefined || o.edad === f.edad) &&
  (f.opcionalidad === undefined || o.opcionalidad === f.opcionalidad) &&
  (f.unidad === undefined || o.unidad === f.unidad);

const cumpleEurostat = (o: ObsEurostat, f: FiltroEurostat): boolean =>
  o.indicador === f.indicador &&
  (f.unidad === undefined || o.unidad === f.unidad) &&
  (f.sexo === undefined || o.sexo === f.sexo) &&
  (f.edad === undefined || o.edad === f.edad);

function unicaPorAnio<T extends { anio: number }>(candidatas: readonly T[], texto: string): T[] {
  const vistos = new Set<number>();
  for (const c of candidatas) {
    if (vistos.has(c.anio)) throw new Error(`Observación ambigua: ${texto} en ${c.anio}`);
    vistos.add(c.anio);
  }
  return [...candidatas].sort((a, b) => a.anio - b.anio);
}

/** Serie anual de un país en la OCDE para el filtro dado. */
export function serieOcde(obs: readonly ObsOcde[], filtro: FiltroOcde, pais: string): PuntoPais[] {
  const candidatas = obs.filter((o) => o.pais === pais && cumpleOcde(o, filtro));
  return unicaPorAnio(candidatas, `${filtro.medida}/${pais}`).map((o) => ({
    anio: o.anio,
    valor: o.valor,
  }));
}

/** Valor de cada país de la lista en un año; `null` si la fuente no lo publica. */
export function valoresOcde(
  obs: readonly ObsOcde[],
  filtro: FiltroOcde,
  anio: number,
  paises: readonly string[],
): ValorPais[] {
  return paises.map((pais) => ({
    pais,
    valor: serieOcde(obs, filtro, pais).find((p) => p.anio === anio)?.valor ?? null,
  }));
}

/** Serie anual de un país en Eurostat para el filtro dado. */
export function serieEurostat(
  obs: readonly ObsEurostat[],
  filtro: FiltroEurostat,
  pais: string,
): PuntoPais[] {
  const candidatas = obs.filter((o) => o.pais === pais && cumpleEurostat(o, filtro));
  return unicaPorAnio(candidatas, `${filtro.indicador}/${pais}`).map((o) => ({
    anio: o.anio,
    valor: o.valor,
  }));
}

export function valoresEurostat(
  obs: readonly ObsEurostat[],
  filtro: FiltroEurostat,
  anio: number,
  paises: readonly string[],
): ValorPais[] {
  return paises.map((pais) => ({
    pais,
    valor: serieEurostat(obs, filtro, pais).find((p) => p.anio === anio)?.valor ?? null,
  }));
}

/** Años en que la OCDE publica la medida para algún país, ordenados. */
export function aniosOcde(obs: readonly ObsOcde[], filtro: FiltroOcde): number[] {
  return [...new Set(obs.filter((o) => cumpleOcde(o, filtro)).map((o) => o.anio))].sort(
    (a, b) => a - b,
  );
}

/** Convierte las filas de un CSV (`filasCsv`) en observaciones de la OCDE; falla si falta una columna. */
export function observacionesOcde(filas: readonly Record<string, string>[]): ObsOcde[] {
  return filas.map((f) => ({
    pais: campo(f, 'pais'),
    medida: campo(f, 'medida'),
    sexo: campo(f, 'sexo'),
    edad: campo(f, 'edad'),
    opcionalidad: campo(f, 'opcionalidad'),
    unidad: campo(f, 'unidad'),
    anio: Number(campo(f, 'anio')),
    valor: Number(campo(f, 'valor')),
  }));
}

export function observacionesEurostat(filas: readonly Record<string, string>[]): ObsEurostat[] {
  return filas.map((f) => ({
    indicador: campo(f, 'indicador'),
    pais: campo(f, 'pais'),
    sexo: campo(f, 'sexo'),
    edad: campo(f, 'edad'),
    unidad: campo(f, 'unidad'),
    anio: Number(campo(f, 'anio')),
    valor: Number(campo(f, 'valor')),
  }));
}

function campo(fila: Record<string, string>, nombre: string): string {
  const v = fila[nombre];
  if (v === undefined || v === '') throw new Error(`Falta la columna «${nombre}» en una fila`);
  return v;
}
