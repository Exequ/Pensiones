import * as Plot from '@observablehq/plot';
import { useMemo, type ReactNode } from 'react';
import { Chart } from '../../components/Chart';
import type { Columna } from '../../components/DataTable';
import { CATEGORICOS, CATEGORICOS_TEXTO, token } from '../../components/estiloGrafico';
import type { Dato } from '../../engine/esquema-datos';
import { formatearNumero } from '../../engine/formato';
import { tramoDelEje } from '../historico/grafico-series';

const ALTO_ETIQUETA = 18;
/** Anchura del grupo de barras de un año, en años (el resto es hueco entre grupos). */
const ANCHO_GRUPO = 0.84;

type FilaTabla = Record<string, string | number | null>;

/** Componente que se dibuja como barra en cada año. */
export interface ComponenteGrafico {
  readonly clave: string;
  /** Rótulo de la etiqueta directa del gráfico. */
  readonly etiqueta: string;
  /** Cabecera de la columna de la tabla de datos. */
  readonly columnaTabla: string;
  /** Índice del color categórico. */
  readonly color: number;
}

export interface FilaGrafico {
  readonly anio: number;
  /** Valor de cada componente (todos, aunque no se dibuje alguno). */
  readonly valores: Readonly<Record<string, number>>;
  /** Valor de la línea (resultado de la lectura); `null` si no hay ninguno. */
  readonly resultado: number | null;
}

interface GraficoPosicionProps {
  readonly titulo: string;
  readonly descripcion: string;
  readonly componentes: readonly ComponenteGrafico[];
  /** Claves de los componentes que se dibujan (los demás solo figuran en la tabla). */
  readonly activos: readonly string[];
  readonly filas: readonly FilaGrafico[];
  /** Rótulo de la línea y cabecera de su columna de la tabla. */
  readonly etiquetaResultado: string;
  readonly columnaResultado: string;
  /** Texto de la etiqueta cuando no hay ningún componente activo. */
  readonly etiquetaSinResultado?: string;
  readonly fuentes: readonly Dato[];
  readonly nota: ReactNode;
  readonly alto?: number;
}

/**
 * Barras de los componentes activos (posiciones fijas por año, para que no se muevan al marcar o
 * desmarcar) y línea con el resultado de la lectura. Eje de valores en miles de millones de euros;
 * admite valores negativos. La tabla de datos lleva todos los componentes y el resultado.
 */
export function GraficoPosicion({
  titulo,
  descripcion,
  componentes,
  activos,
  filas,
  etiquetaResultado,
  columnaResultado,
  etiquetaSinResultado = 'Ningún componente seleccionado',
  fuentes,
  nota,
  alto = 380,
}: GraficoPosicionProps) {
  const tabla = useMemo(() => {
    const columnas: Columna<FilaTabla>[] = [
      { clave: 'anio', titulo: 'Año' },
      ...componentes.map((c) => ({
        clave: c.clave,
        titulo: c.columnaTabla,
        tipo: 'numero' as const,
        decimales: 0,
      })),
      { clave: 'resultado', titulo: columnaResultado, tipo: 'numero' as const, decimales: 0 },
    ];
    const datos: FilaTabla[] = filas.map((f) => ({
      anio: String(f.anio),
      ...Object.fromEntries(componentes.map((c) => [c.clave, f.valores[c.clave] ?? null])),
      resultado: f.resultado,
    }));
    return { columnas, filas: datos };
  }, [filas, componentes, columnaResultado]);

  const opciones = useMemo(
    () =>
      ({ ancho }: { ancho: number }): Plot.PlotOptions => {
        const estrecho = ancho < 520;
        const mostrados = componentes.filter((c) => activos.includes(c.clave));
        const barras = filas.flatMap((f) =>
          componentes.flatMap((c, i) => {
            if (!activos.includes(c.clave)) return [];
            const desde = f.anio - ANCHO_GRUPO / 2 + (i * ANCHO_GRUPO) / componentes.length;
            return [
              {
                desde,
                hasta: desde + ANCHO_GRUPO / componentes.length,
                valor: f.valores[c.clave] ?? 0,
                fill: CATEGORICOS[c.color] ?? token('tinta'),
              },
            ];
          }),
        );
        const resultados = filas.flatMap((f) =>
          f.resultado === null ? [] : [{ anio: f.anio, valor: f.resultado }],
        );
        const valores = [...barras.map((b) => b.valor), ...resultados.map((s) => s.valor)];
        const dominioY = tramoDelEje({
          series: [valores.length === 0 ? [0] : valores],
          apilado: false,
          incluirCero: true,
          alturaReservadaPx: 10 + ALTO_ETIQUETA * (mostrados.length + 1),
          alturaTotalPx: alto - 64,
        });
        const etiquetas = [
          ...mostrados.map((c, i) =>
            Plot.text([`■ ${c.etiqueta}`], {
              frameAnchor: 'top-left',
              dx: 6,
              dy: 4 + i * ALTO_ETIQUETA,
              fill: CATEGORICOS_TEXTO[c.color] ?? token('tinta'),
              fontWeight: 600,
              textAnchor: 'start',
            }),
          ),
          Plot.text([mostrados.length === 0 ? etiquetaSinResultado : `━ ${etiquetaResultado}`], {
            frameAnchor: 'top-left',
            dx: 6,
            dy: 4 + mostrados.length * ALTO_ETIQUETA,
            fill: token('tinta'),
            fontWeight: 600,
            textAnchor: 'start',
          }),
        ];
        const anios = filas.map((f) => f.anio);
        const primero = Math.min(...anios);
        const ultimo = Math.max(...anios);
        const paso = estrecho ? 2 : 1;
        return {
          marginLeft: estrecho ? 56 : 68,
          marginRight: 24,
          y: {
            label: 'Miles de millones de euros',
            domain: dominioY,
            grid: true,
            ticks: 5,
            tickFormat: (v: number) => formatearNumero(v / 1000, { maxDecimales: 0 }),
          },
          x: {
            type: 'linear',
            label: null,
            domain: [primero - 0.6, ultimo + 0.6],
            ticks: anios.filter((_, i) => i % paso === 0),
            tickFormat: (a: number) => String(a),
            line: true,
          },
          color: { type: 'identity' },
          marks: [
            Plot.ruleY([0], { stroke: token('tinta') }),
            Plot.rectY(barras, { x1: 'desde', x2: 'hasta', y: 'valor', fill: 'fill' }),
            ...(resultados.length > 1
              ? [
                  Plot.line(resultados, {
                    x: 'anio',
                    y: 'valor',
                    stroke: token('tinta'),
                    strokeWidth: 2,
                  }),
                ]
              : []),
            Plot.dot(resultados, {
              x: 'anio',
              y: 'valor',
              stroke: token('tinta'),
              fill: token('papel'),
              r: 4,
            }),
            ...etiquetas,
          ],
        };
      },
    [filas, componentes, activos, etiquetaResultado, etiquetaSinResultado, alto],
  );

  return (
    <Chart
      titulo={titulo}
      descripcion={descripcion}
      alto={alto}
      opciones={opciones}
      tabla={{ titulo, columnas: tabla.columnas, filas: tabla.filas }}
      fuentes={fuentes}
      nota={nota}
    />
  );
}
