import * as Plot from '@observablehq/plot';
import { useMemo } from 'react';
import { Chart } from '../../components/Chart';
import type { Columna } from '../../components/DataTable';
import { CATEGORICOS, CATEGORICOS_TEXTO, token } from '../../components/estiloGrafico';
import type { Dato } from '../../engine/esquema-datos';
import { formatearNumero } from '../../engine/formato';
import {
  COMPONENTES_POSICION,
  type FilaPosicion,
  type SeleccionPosicion,
} from '../../engine/transferencias';
import { tramoDelEje } from '../historico/grafico-series';
import { COMPONENTE } from './componentes';

const ALTO_ETIQUETA = 18;
/** Anchura del grupo de barras de un año, en años (el resto es hueco entre grupos). */
const ANCHO_GRUPO = 0.84;

type FilaTabla = Record<string, string | number | null>;

interface GraficoPosicionProps {
  readonly titulo: string;
  readonly descripcion: string;
  readonly filas: readonly FilaPosicion[];
  readonly seleccion: SeleccionPosicion;
  readonly anioInicio: number;
  readonly fuentes: readonly Dato[];
  readonly nota: React.ReactNode;
  readonly alto?: number;
}

/**
 * Barras de los componentes seleccionados (tres posiciones fijas por año, para que no se muevan al
 * marcar o desmarcar) y línea con la suma de los seleccionados. Eje de valores en miles de
 * millones de euros. La tabla de datos lleva los tres componentes y la suma de los seleccionados.
 */
export function GraficoPosicion({
  titulo,
  descripcion,
  filas,
  seleccion,
  anioInicio,
  fuentes,
  nota,
  alto = 380,
}: GraficoPosicionProps) {
  const activos = useMemo(() => COMPONENTES_POSICION.filter((c) => seleccion[c]), [seleccion]);

  const tabla = useMemo(() => {
    const columnas: Columna<FilaTabla>[] = [
      { clave: 'anio', titulo: 'Año' },
      ...COMPONENTES_POSICION.map((c) => ({
        clave: c,
        titulo:
          c === 'transferencias'
            ? `${COMPONENTE[c].etiqueta} desde ${anioInicio} (millones de euros)`
            : `${COMPONENTE[c].etiqueta} (millones de euros)`,
        tipo: 'numero' as const,
        decimales: 0,
      })),
      {
        clave: 'suma',
        titulo: 'Suma de los componentes seleccionados (millones de euros)',
        tipo: 'numero' as const,
        decimales: 0,
      },
    ];
    const datos: FilaTabla[] = filas.map((f) => ({
      anio: String(f.anio),
      fondo: f.fondo,
      deuda: f.deuda,
      transferencias: f.transferencias,
      suma: f.suma,
    }));
    return { columnas, filas: datos };
  }, [filas, anioInicio]);

  const opciones = useMemo(
    () =>
      ({ ancho }: { ancho: number }): Plot.PlotOptions => {
        const estrecho = ancho < 520;
        const barras = filas.flatMap((f) =>
          COMPONENTES_POSICION.flatMap((c, i) => {
            if (!seleccion[c]) return [];
            const desde =
              f.anio - ANCHO_GRUPO / 2 + (i * ANCHO_GRUPO) / COMPONENTES_POSICION.length;
            return [
              {
                desde,
                hasta: desde + ANCHO_GRUPO / COMPONENTES_POSICION.length,
                valor: f[c],
                fill: CATEGORICOS[COMPONENTE[c].color] ?? token('tinta'),
              },
            ];
          }),
        );
        const sumas = filas.flatMap((f) =>
          f.suma === null ? [] : [{ anio: f.anio, valor: f.suma }],
        );
        const valores = [...barras.map((b) => b.valor), ...sumas.map((s) => s.valor)];
        const dominioY = tramoDelEje({
          series: [valores.length === 0 ? [0] : valores],
          apilado: false,
          incluirCero: true,
          alturaReservadaPx: 10 + ALTO_ETIQUETA * (activos.length + 1),
          alturaTotalPx: alto - 64,
        });
        const etiquetas = [
          ...activos.map((c, i) =>
            Plot.text([`■ ${COMPONENTE[c].etiqueta}`], {
              frameAnchor: 'top-left',
              dx: 6,
              dy: 4 + i * ALTO_ETIQUETA,
              fill: CATEGORICOS_TEXTO[COMPONENTE[c].color] ?? token('tinta'),
              fontWeight: 600,
              textAnchor: 'start',
            }),
          ),
          Plot.text(
            [
              activos.length === 0
                ? 'Ningún componente seleccionado'
                : '━ Suma de los seleccionados',
            ],
            {
              frameAnchor: 'top-left',
              dx: 6,
              dy: 4 + activos.length * ALTO_ETIQUETA,
              fill: token('tinta'),
              fontWeight: 600,
              textAnchor: 'start',
            },
          ),
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
            ...(sumas.length > 1
              ? [
                  Plot.line(sumas, {
                    x: 'anio',
                    y: 'valor',
                    stroke: token('tinta'),
                    strokeWidth: 2,
                  }),
                ]
              : []),
            Plot.dot(sumas, {
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
    [filas, seleccion, activos, alto],
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
