/**
 * Cálculos de maquetación de `GraficoProyeccion` (sin React): qué trazo y qué rótulo lleva cada tipo
 * de dato, y las filas de la tabla alternativa. Lo observado va siempre con línea continua; lo que
 * sale de un modelo, con trazo discontinuo y el rótulo «Proyección»; lo posterior al horizonte de
 * presentación, con trazo punteado y el rótulo «ilustrativo».
 */
import { esIlustrativo } from '../../engine/proyecciones';
import type { PuntoAnual } from '../../engine/series-historicas';
import { TRAZO_MODELO, TRAZO_PUBLICADA } from './grafico-trazos';

/** Qué es la parte proyectada de una serie: salida de un modelo propio o proyección de una institución. */
export type OrigenProyeccion = 'modelo' | 'publicada';

export interface SerieProyectada {
  /** Clave estable (columna de la tabla de datos). */
  readonly clave: string;
  /** Etiqueta directa del gráfico y cabecera de la tabla. */
  readonly etiqueta: string;
  /** Histórico observado (puede faltar: p. ej., una serie solo proyectada). */
  readonly observado?: readonly PuntoAnual[];
  readonly proyeccion: readonly PuntoAnual[];
  readonly origen: OrigenProyeccion;
  /** Color categórico (0-4) o «tinta» para lo observado sin serie propia. */
  readonly color?: number | 'tinta';
}

export const GLIFO_OBSERVADO = '━';
export const GLIFO_MODELO = '╍';
export const GLIFO_PUBLICADA = '┅';
export const GLIFO_ILUSTRATIVO = '┈';

export const TRAZOS_PROYECCION: Readonly<Record<OrigenProyeccion, string>> = {
  modelo: TRAZO_MODELO,
  publicada: TRAZO_PUBLICADA,
};

/** Primer año de la proyección de las series (el de inicio del tramo proyectado). */
export function anioInicioDe(series: readonly SerieProyectada[]): number | undefined {
  const inicios = series.flatMap((s) => (s.proyeccion[0] ? [s.proyeccion[0].anio] : []));
  return inicios.length === 0 ? undefined : Math.min(...inicios);
}

/** Primer año con dato en cualquiera de las series. */
export function anioPrimeroDe(series: readonly SerieProyectada[]): number {
  return Math.min(
    ...series.flatMap((s) => [...(s.observado ?? []), ...s.proyeccion].map((p) => p.anio)),
  );
}

/** Último año con dato en cualquiera de las series. */
export function anioFinDe(series: readonly SerieProyectada[]): number {
  return Math.max(
    ...series.flatMap((s) => [...(s.observado ?? []), ...s.proyeccion].map((p) => p.anio)),
  );
}

/** Rótulos de la leyenda de tipos de línea que hay en el gráfico, en orden fijo. */
export function leyendaDeTipos(
  series: readonly SerieProyectada[],
  hayIlustrativo: boolean,
): { readonly glifo: string; readonly texto: string }[] {
  const lineas: { glifo: string; texto: string }[] = [];
  if (series.some((s) => (s.observado?.length ?? 0) > 0)) {
    lineas.push({ glifo: GLIFO_OBSERVADO, texto: 'Observado' });
  }
  if (series.some((s) => s.origen === 'modelo' && s.proyeccion.length > 0)) {
    lineas.push({ glifo: GLIFO_MODELO, texto: 'Proyección del modelo' });
  }
  if (series.some((s) => s.origen === 'publicada' && s.proyeccion.length > 0)) {
    lineas.push({ glifo: GLIFO_PUBLICADA, texto: 'Proyección publicada' });
  }
  if (hayIlustrativo) lineas.push({ glifo: GLIFO_ILUSTRATIVO, texto: 'Ilustrativo' });
  return lineas;
}

export const TIPO_OBSERVADO = 'Observado';
export const TIPO_PROYECCION = 'Proyección';
export const TIPO_ILUSTRATIVO = 'Proyección (ilustrativa)';

export type FilaProyeccion = Record<string, string | number | null>;

/**
 * Filas de la tabla alternativa: una por año, con la naturaleza del dato de ese año y un valor por
 * serie. Nunca hay en un mismo año un valor observado y uno proyectado de la misma serie.
 */
export function filasDeTabla(
  series: readonly SerieProyectada[],
  anioInicio: number | undefined,
  horizonte: number | undefined,
): FilaProyeccion[] {
  const anios = [
    ...new Set(series.flatMap((s) => [...(s.observado ?? []), ...s.proyeccion].map((p) => p.anio))),
  ].sort((a, b) => a - b);
  const mapas = series.map(
    (s) => new Map([...(s.observado ?? []), ...s.proyeccion].map((p) => [p.anio, p.valor])),
  );
  return anios.map((anio) => {
    const proyectado = anioInicio !== undefined && anio >= anioInicio;
    const fila: FilaProyeccion = {
      anio: String(anio),
      tipo: !proyectado
        ? TIPO_OBSERVADO
        : esIlustrativo(anio, horizonte)
          ? TIPO_ILUSTRATIVO
          : TIPO_PROYECCION,
    };
    series.forEach((s, i) => {
      fila[s.clave] = mapas[i]?.get(anio) ?? null;
    });
    return fila;
  });
}
