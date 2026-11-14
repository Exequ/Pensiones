import * as Plot from '@observablehq/plot';
import { useMemo, type ReactNode } from 'react';
import { Chart } from '../../components/Chart';
import type { Columna } from '../../components/DataTable';
import { CATEGORICOS, CATEGORICOS_TEXTO, token } from '../../components/estiloGrafico';
import type { Dato } from '../../engine/esquema-datos';
import { formatearNumero } from '../../engine/formato';
import type { PuntoAnual } from '../../engine/series-historicas';
import { GLIFOS_LINEA, TRAZO_ANOTACION, TRAZOS, ticksAnuales, tramoDelEje } from './grafico-series';
import { ComoLeerlo } from './ComoLeerlo';

export interface SerieGrafico {
  /** Clave estable (columna de la tabla de datos). */
  readonly clave: string;
  /** Etiqueta directa del gráfico y cabecera de la tabla. */
  readonly etiqueta: string;
  readonly puntos: readonly PuntoAnual[];
  /** Color categórico (índice 0-4); por defecto, el orden de la serie. */
  readonly color?: number;
}

/** Hecho que se señala sobre una serie anual de líneas: una letra en el eje y una regla vertical. */
export interface AnotacionGrafico {
  readonly anio: number;
  /** Letra que remite a la tabla de anotaciones («a», «b»…). */
  readonly letra: string;
}

export type TipoGrafico = 'lineas' | 'barras-apiladas' | 'barras-agrupadas';

const ALTO_ETIQUETA = 18;

interface GraficoSeriesProps {
  titulo: string;
  /** Qué mide y en qué unidad. */
  descripcion: string;
  series: readonly SerieGrafico[];
  tipo?: TipoGrafico;
  /** Etiqueta del eje vertical (unidad). */
  unidadEje: string;
  /** Divisor de los valores en el eje (p. ej. 1.000.000 para «millones»). */
  divisorEje?: number;
  /** Decimales de la tabla de datos. */
  decimales?: number;
  /** Decimales de las marcas del eje. */
  decimalesEje?: number;
  fuentes: Dato | readonly Dato[];
  /** Nota de definición o de confianza bajo el gráfico. */
  nota?: ReactNode;
  /** «Cómo leerlo»: qué mide, qué significa subir o bajar y qué no dice. */
  comoLeerlo: ReactNode;
  alto?: number;
  /** Fuerza el cero en el eje vertical (por defecto, sí para barras). */
  incluirCero?: boolean;
  /**
   * Eje horizontal categórico (p. ej., grupos de edad): los puntos usan como `anio` la posición en
   * esta lista. Solo para líneas.
   */
  etiquetasX?: readonly string[];
  /** Cabecera de la primera columna de la tabla (por defecto, «Año»). */
  tituloX?: string;
  /** Anotaciones sobre el eje de años; solo para líneas con eje de años. */
  anotaciones?: readonly AnotacionGrafico[];
}

type FilaTabla = Record<string, string | number | null>;

/**
 * Gráfico de series anuales con el estilo de la casa: líneas o barras, etiquetas directas en el
 * propio gráfico (con trazo o forma distinta, no solo color), tabla de datos equivalente, línea de
 * fuente y el texto «Cómo leerlo».
 */
export function GraficoSeries({
  titulo,
  descripcion,
  series,
  tipo = 'lineas',
  unidadEje,
  divisorEje = 1,
  decimales = 0,
  decimalesEje = 0,
  fuentes,
  nota,
  comoLeerlo,
  alto = 340,
  incluirCero,
  etiquetasX,
  tituloX = 'Año',
  anotaciones,
}: GraficoSeriesProps) {
  const cero = incluirCero ?? tipo !== 'lineas';

  const filas = useMemo(() => {
    const anios = [...new Set(series.flatMap((s) => s.puntos.map((p) => p.anio)))].sort(
      (a, b) => a - b,
    );
    const porSerie = series.map((s) => new Map(s.puntos.map((p) => [p.anio, p.valor])));
    return anios.map((anio): FilaTabla => {
      const fila: FilaTabla = { anio: etiquetasX?.[anio] ?? String(anio) };
      series.forEach((s, i) => {
        fila[s.clave] = porSerie[i]?.get(anio) ?? null;
      });
      return fila;
    });
  }, [series, etiquetasX]);

  const columnas = useMemo<Columna<FilaTabla>[]>(
    () => [
      { clave: 'anio', titulo: tituloX },
      ...series.map((s) => ({
        clave: s.clave,
        titulo: s.etiqueta,
        tipo: 'numero' as const,
        decimales: decimales,
      })),
    ],
    [series, decimales, tituloX],
  );

  const opciones = useMemo(() => {
    const anios = series.flatMap((s) => s.puntos.map((p) => p.anio));
    return ({ ancho }: { ancho: number }): Plot.PlotOptions => {
      const estrecho = ancho < 520;
      const dominioY = tramoDelEje({
        series: series.map((s) => s.puntos.map((p) => p.valor)),
        apilado: tipo === 'barras-apiladas',
        incluirCero: cero,
        alturaReservadaPx: 10 + ALTO_ETIQUETA * series.length,
        alturaTotalPx: alto - 64,
      });
      const etiquetas = series.map((s, i) => {
        const color = CATEGORICOS_TEXTO[s.color ?? i] ?? token('tinta');
        const glifo = tipo === 'lineas' ? (GLIFOS_LINEA[i] ?? '━') : '■';
        return Plot.text([`${glifo} ${s.etiqueta}`], {
          frameAnchor: 'top-left',
          dx: 6,
          dy: 4 + i * ALTO_ETIQUETA,
          fill: color,
          fontWeight: 600,
          textAnchor: 'start',
        });
      });
      const base: Plot.PlotOptions = {
        marginLeft: estrecho ? 56 : 68,
        marginRight: etiquetasX ? 40 : 24,
        y: {
          label: unidadEje,
          domain: dominioY,
          grid: true,
          ticks: 5,
          tickFormat: (d: number) =>
            formatearNumero(d / divisorEje, { maxDecimales: decimalesEje }),
        },
        color: { type: 'identity' },
      };
      if (tipo === 'lineas') {
        const minimo = Math.min(...anios);
        const maximo = Math.max(...anios);
        return {
          ...base,
          x: {
            type: 'linear',
            label: null,
            domain: [minimo, maximo],
            ticks: ticksAnuales(minimo, maximo, estrecho ? 4 : 8),
            tickFormat: (d: number) => etiquetasX?.[d] ?? String(d),
            line: true,
          },
          marks: [
            ...(cero || (dominioY[0] < 0 && dominioY[1] > 0)
              ? [Plot.ruleY([0], { stroke: token('tinta') })]
              : []),
            ...series.map((s, i) =>
              s.puntos.length > 1
                ? Plot.line(s.puntos, {
                    x: 'anio',
                    y: 'valor',
                    stroke: CATEGORICOS[s.color ?? i] ?? token('tinta'),
                    strokeWidth: 2,
                    strokeDasharray: TRAZOS[i] ?? 'none',
                  })
                : Plot.dot(s.puntos, {
                    x: 'anio',
                    y: 'valor',
                    stroke: CATEGORICOS[s.color ?? i] ?? token('tinta'),
                    r: 4,
                  }),
            ),
            ...(anotaciones === undefined || anotaciones.length === 0
              ? []
              : [
                  Plot.ruleX(
                    anotaciones.map((a) => a.anio),
                    { stroke: token('apagado'), strokeDasharray: TRAZO_ANOTACION },
                  ),
                  Plot.text(anotaciones, {
                    x: 'anio',
                    text: 'letra',
                    frameAnchor: 'bottom',
                    dy: -6,
                    dx: 6,
                    textAnchor: 'start',
                    fill: token('tinta'),
                    fontWeight: 600,
                  }),
                ]),
            ...etiquetas,
          ],
        };
      }
      // Barras: x ordinal por año; apiladas (una barra por año) o agrupadas (una por serie).
      const largos = series.flatMap((s, i) =>
        s.puntos.map((p) => ({
          anio: p.anio,
          valor: p.valor,
          clave: s.etiqueta,
          color: CATEGORICOS[s.color ?? i] ?? token('tinta'),
        })),
      );
      const aniosBarras = [...new Set(largos.map((l) => l.anio))].sort((a, b) => a - b);
      // Con muchas barras, el año se abrevia («’33») para que las etiquetas no se pisen.
      const hueco = ancho / Math.max(1, aniosBarras.length);
      const formatoAnio = (a: number) => (hueco < 48 ? `’${String(a).slice(2)}` : String(a));
      if (tipo === 'barras-apiladas') {
        return {
          ...base,
          x: { type: 'band', label: null, tickFormat: formatoAnio, line: true },
          marks: [
            Plot.ruleY([0], { stroke: token('tinta') }),
            Plot.barY(largos, { x: 'anio', y: 'valor', fill: 'color' }),
            ...etiquetas,
          ],
        };
      }
      // Barras agrupadas: una posición por (año, serie) más un hueco entre años; la etiqueta del año
      // va en la barra central de cada grupo. No se usan facetas: así las etiquetas directas no se
      // repiten en cada grupo.
      const n = series.length;
      const central = Math.floor(n / 2);
      const posiciones = aniosBarras.flatMap((anio, i) => [
        ...series.map((_, j) => `${anio}|${j}`),
        ...(i < aniosBarras.length - 1 ? [`${anio}|hueco`] : []),
      ]);
      // Si los grupos quedan muy juntos, solo se etiqueta un año de cada dos.
      const salto = hueco / (n + 1) < 9 ? 2 : 1;
      const centrales = aniosBarras
        .filter((_, i) => i % salto === 0)
        .map((anio) => `${anio}|${central}`);
      const indiceSerie = new Map(series.map((s, j) => [s.etiqueta, j]));
      const barras = largos.map((l) => ({
        ...l,
        posicion: `${l.anio}|${indiceSerie.get(l.clave) ?? 0}`,
      }));
      return {
        ...base,
        x: {
          type: 'band',
          label: null,
          domain: posiciones,
          ticks: centrales,
          tickSize: 0,
          tickFormat: (k: string) => formatoAnio(Number(k.split('|')[0])),
          padding: 0.08,
          line: true,
        },
        marks: [
          Plot.ruleY([0], { stroke: token('tinta') }),
          Plot.barY(barras, { x: 'posicion', y: 'valor', fill: 'color' }),
          ...etiquetas,
        ],
      };
    };
  }, [series, tipo, cero, alto, unidadEje, divisorEje, decimalesEje, etiquetasX, anotaciones]);

  return (
    <div className="bloque-grafico">
      <Chart
        titulo={titulo}
        descripcion={descripcion}
        alto={alto}
        opciones={opciones}
        tabla={{ titulo, columnas, filas }}
        fuentes={fuentes}
        {...(nota === undefined ? {} : { nota })}
      />
      <ComoLeerlo>{comoLeerlo}</ComoLeerlo>
    </div>
  );
}
