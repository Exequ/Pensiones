import * as Plot from '@observablehq/plot';
import { useMemo, type ReactNode } from 'react';
import { Chart } from '../../components/Chart';
import type { Columna } from '../../components/DataTable';
import { CATEGORICOS, CATEGORICOS_TEXTO, token } from '../../components/estiloGrafico';
import type { Dato } from '../../engine/esquema-datos';
import { formatearNumero } from '../../engine/formato';
import { partirIlustrativo } from '../../engine/proyecciones';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { ticksAnuales, tramoDelEje } from '../historico/grafico-series';
import {
  anioFinDe,
  anioInicioDe,
  anioPrimeroDe,
  filasDeTabla,
  leyendaDeTipos,
  TRAZOS_PROYECCION,
  type FilaProyeccion,
  type SerieProyectada,
} from './grafico-proyeccion';
import { TRAZO_ILUSTRATIVO, TRAZO_OBSERVADO, TRAZO_REGLA } from './grafico-trazos';

const ALTO_ETIQUETA = 18;

interface GraficoProyeccionProps {
  titulo: string;
  /** Qué mide y en qué unidad. */
  descripcion: string;
  series: readonly SerieProyectada[];
  unidadEje: string;
  /** Divisor de los valores en el eje (p. ej., 1.000.000 para «millones»). */
  divisorEje?: number;
  decimales?: number;
  decimalesEje?: number;
  fuentes: Dato | readonly Dato[];
  /** Nota bajo el gráfico; la de «proyección» se añade siempre. */
  nota?: ReactNode;
  comoLeerlo: ReactNode;
  /** Último año presentado como resultado: lo posterior se dibuja y se rotula «ilustrativo». */
  horizonte?: number | undefined;
  /** Dibuja un punto en cada dato de la proyección (útil con pocos años). */
  puntos?: boolean;
  incluirCero?: boolean;
  alto?: number;
}

const colorDe = (s: SerieProyectada, i: number, texto: boolean): string => {
  if (s.color === 'tinta') return token('tinta');
  const indice = s.color ?? i;
  return (texto ? CATEGORICOS_TEXTO : CATEGORICOS)[indice] ?? token('tinta');
};

/**
 * Gráfico de series anuales con lo observado y la proyección en la misma figura, claramente
 * diferenciados: línea continua para lo observado; trazo discontinuo, regla vertical y rótulo
 * «Proyección» desde el año de inicio; trazo punteado y rótulo «ilustrativo» después del horizonte.
 * Etiquetas directas, tabla de datos equivalente (con la naturaleza del dato de cada año), línea de
 * fuente (con la naturaleza de cada fuente) y «Cómo leerlo».
 */
export function GraficoProyeccion({
  titulo,
  descripcion,
  series,
  unidadEje,
  divisorEje = 1,
  decimales = 0,
  decimalesEje = 0,
  fuentes,
  nota,
  comoLeerlo,
  horizonte,
  puntos = false,
  incluirCero = false,
  alto = 400,
}: GraficoProyeccionProps) {
  const anioInicio = anioInicioDe(series);
  const anioFin = anioFinDe(series);
  const anioPrimero = anioPrimeroDe(series);
  const hayIlustrativo = horizonte !== undefined && anioFin > horizonte;
  const leyenda = useMemo(() => leyendaDeTipos(series, hayIlustrativo), [series, hayIlustrativo]);

  const filas = useMemo(
    () => filasDeTabla(series, anioInicio, horizonte),
    [series, anioInicio, horizonte],
  );
  const columnas = useMemo<Columna<FilaProyeccion>[]>(
    () => [
      { clave: 'anio', titulo: 'Año' },
      { clave: 'tipo', titulo: 'Naturaleza del dato' },
      ...series.map((s) => ({
        clave: s.clave,
        titulo: s.etiqueta,
        tipo: 'numero' as const,
        decimales,
      })),
    ],
    [series, decimales],
  );

  const opciones = useMemo(() => {
    const valores = series.map((s) =>
      [...(s.observado ?? []), ...s.proyeccion].map((p) => p.valor),
    );
    const filasEtiqueta = series.length + leyenda.length;
    return ({ ancho }: { ancho: number }): Plot.PlotOptions => {
      const estrecho = ancho < 520;
      const dominioY = tramoDelEje({
        series: valores,
        apilado: false,
        incluirCero,
        alturaReservadaPx: 10 + ALTO_ETIQUETA * filasEtiqueta,
        alturaTotalPx: alto - 64,
      });
      const etiquetasSerie = series.map((s, i) =>
        Plot.text([`■ ${s.etiqueta}`], {
          frameAnchor: 'top-left',
          dx: 6,
          dy: 4 + i * ALTO_ETIQUETA,
          fill: colorDe(s, i, true),
          fontWeight: 600,
          textAnchor: 'start',
        }),
      );
      const etiquetasTipo = leyenda.map((l, j) =>
        Plot.text([`${l.glifo} ${l.texto}`], {
          frameAnchor: 'top-left',
          dx: 6,
          dy: 4 + (series.length + j) * ALTO_ETIQUETA,
          fill: token('apagado'),
          textAnchor: 'start',
        }),
      );
      const lineas = series.flatMap((s, i) => {
        const color = colorDe(s, i, false);
        const tramos = partirIlustrativo(s.proyeccion, horizonte);
        const observado = s.observado ?? [];
        return [
          ...(observado.length > 1
            ? [
                Plot.line(observado, {
                  x: 'anio',
                  y: 'valor',
                  stroke: color,
                  strokeWidth: 2,
                  strokeDasharray: TRAZO_OBSERVADO,
                }),
              ]
            : observado.length === 1
              ? [Plot.dot(observado, { x: 'anio', y: 'valor', stroke: color, r: 3 })]
              : []),
          ...(tramos.presentada.length > 1
            ? [
                Plot.line(tramos.presentada, {
                  x: 'anio',
                  y: 'valor',
                  stroke: color,
                  strokeWidth: 2,
                  strokeDasharray: TRAZOS_PROYECCION[s.origen],
                }),
              ]
            : []),
          ...(tramos.ilustrativa.length > 1
            ? [
                Plot.line(tramos.ilustrativa, {
                  x: 'anio',
                  y: 'valor',
                  stroke: color,
                  strokeWidth: 2,
                  strokeOpacity: 0.75,
                  strokeDasharray: TRAZO_ILUSTRATIVO,
                }),
              ]
            : []),
          ...(puntos && s.proyeccion.length > 0
            ? [
                Plot.dot(s.proyeccion, {
                  x: 'anio',
                  y: 'valor',
                  stroke: color,
                  fill: token('papel'),
                  r: 3.5,
                }),
              ]
            : []),
        ];
      });
      const marcaInicio =
        anioInicio === undefined
          ? []
          : [
              Plot.ruleX([anioInicio], { stroke: token('apagado'), strokeDasharray: TRAZO_REGLA }),
              Plot.text(['Proyección →'], {
                x: anioInicio,
                frameAnchor: 'bottom',
                textAnchor: 'start',
                dx: 5,
                dy: -6,
                fill: token('tinta'),
                fontWeight: 600,
                stroke: token('papel'),
                strokeWidth: 3,
                paintOrder: 'stroke',
              }),
            ];
      const marcaIlustrativo = hayIlustrativo
        ? [
            Plot.rectX([{ desde: horizonte, hasta: anioFin }], {
              x1: 'desde',
              x2: 'hasta',
              fill: token('filete'),
              fillOpacity: 0.35,
            }),
            Plot.ruleX([horizonte], { stroke: token('apagado'), strokeDasharray: TRAZO_REGLA }),
            Plot.text(['ilustrativo'], {
              x: anioFin,
              frameAnchor: 'bottom',
              textAnchor: 'end',
              dx: -5,
              dy: -6,
              fill: token('tinta'),
              fontWeight: 600,
              stroke: token('papel'),
              strokeWidth: 3,
              paintOrder: 'stroke',
            }),
          ]
        : [];
      return {
        marginLeft: estrecho ? 56 : 68,
        marginRight: 24,
        y: {
          label: unidadEje,
          domain: dominioY,
          grid: true,
          ticks: 5,
          tickFormat: (d: number) =>
            formatearNumero(d / divisorEje, { maxDecimales: decimalesEje }),
        },
        x: {
          type: 'linear',
          label: null,
          domain: [anioPrimero, anioFin],
          ticks: ticksAnuales(anioPrimero, anioFin, estrecho ? 4 : 8),
          tickFormat: (d: number) => String(d),
          line: true,
        },
        color: { type: 'identity' },
        marks: [
          ...marcaIlustrativo,
          ...(incluirCero ? [Plot.ruleY([0], { stroke: token('tinta') })] : []),
          ...marcaInicio,
          ...lineas,
          ...etiquetasSerie,
          ...etiquetasTipo,
        ],
      };
    };
  }, [
    series,
    leyenda,
    horizonte,
    hayIlustrativo,
    anioInicio,
    anioFin,
    anioPrimero,
    incluirCero,
    alto,
    unidadEje,
    divisorEje,
    decimalesEje,
    puntos,
  ]);

  return (
    <div className="bloque-grafico">
      <Chart
        titulo={titulo}
        descripcion={descripcion}
        alto={alto}
        opciones={opciones}
        tabla={{ titulo, columnas, filas }}
        fuentes={fuentes}
        nota={
          <>
            Proyección de modelo propio o proyección publicada por una institución: no es un dato
            observado ni una previsión. {nota}
          </>
        }
      />
      <ComoLeerlo>{comoLeerlo}</ComoLeerlo>
    </div>
  );
}
