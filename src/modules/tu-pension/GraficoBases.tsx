import * as Plot from '@observablehq/plot';
import { useMemo } from 'react';
import { Chart } from '../../components/Chart';
import { token } from '../../components/estiloGrafico';
import type { BasesPeriodoCalculo } from '../../engine/jubilacion/tipos';
import {
  ETIQUETA_ESTADO,
  filasGraficoBases,
  type EstadoMes,
  type FilaBases,
} from './grafico-bases';
import { TEXTOS } from './textos';

/** Forma (no solo color) y glifo de la leyenda directa de cada estado. */
const ESTILO: Record<EstadoMes, { simbolo: string; glifo: string; color: string }> = {
  'se-suma': { simbolo: 'circle', glifo: '●', color: token('tinta') },
  'se-descarta': { simbolo: 'times', glifo: '✕', color: token('apagado') },
  'laguna-integrada': { simbolo: 'diamond', glifo: '◆', color: token('acento') },
  'laguna-descartada': { simbolo: 'diamond2', glifo: '◇', color: token('acento') },
  'previo-al-alta': { simbolo: 'square', glifo: '□', color: token('apagado') },
};

const ORDEN: readonly EstadoMes[] = [
  'se-suma',
  'se-descarta',
  'laguna-integrada',
  'laguna-descartada',
  'previo-al-alta',
];

interface GraficoBasesProps {
  bases: BasesPeriodoCalculo;
}

/**
 * Gráfico de las bases de cada mes del periodo de cálculo: línea de la base nominal y una marca por
 * mes para la base actualizada, con la forma según el estado (se suma, se descarta, laguna
 * integrada). Etiquetas directas, sin leyenda aparte; tabla de datos equivalente en `Chart`.
 */
export function GraficoBases({ bases }: GraficoBasesProps) {
  const filas = useMemo(() => filasGraficoBases(bases), [bases]);
  const presentes = useMemo(() => ORDEN.filter((e) => filas.some((f) => f.clave === e)), [filas]);

  const opciones = useMemo(() => {
    const maximo = Math.max(...filas.map((f) => Math.max(f.baseNominal, f.baseActualizada)), 1);
    // Margen superior en el eje para las etiquetas directas, que ocupan una esquina libre.
    const dominio: [number, number] = [0, maximo * (1.25 + 0.1 * presentes.length)];
    return ({ ancho }: { ancho: number }): Plot.PlotOptions => ({
      marginLeft: ancho < 480 ? 52 : 64,
      x: {
        type: 'utc',
        label: null,
        ticks: ancho < 520 ? 4 : 8,
        tickFormat: (d: Date) => String(d.getUTCFullYear()),
        line: true,
      },
      y: { label: 'Euros al mes', domain: dominio, grid: true, ticks: 5 },
      color: { type: 'identity' },
      symbol: { type: 'identity' },
      marks: [
        Plot.ruleY([0], { stroke: token('tinta') }),
        Plot.lineY(filas, {
          x: 'fecha',
          y: 'baseNominal',
          stroke: token('cat-azul'),
          strokeWidth: 1.5,
        }),
        Plot.dot(filas, {
          x: 'fecha',
          y: 'baseActualizada',
          symbol: (d: FilaBases) => ESTILO[d.clave].simbolo,
          stroke: (d: FilaBases) => ESTILO[d.clave].color,
          strokeWidth: 1.5,
          r: ancho < 480 ? 2.5 : 3.2,
        }),
        // Etiquetas directas en la esquina superior izquierda (sin leyenda aparte).
        Plot.text(['— Base nominal'], {
          frameAnchor: 'top-left',
          dx: 4,
          dy: 4,
          fill: token('cat-azul'),
          fontWeight: 600,
          textAnchor: 'start',
        }),
        ...presentes.map((e, i) =>
          Plot.text([`${ESTILO[e].glifo} ${ETIQUETA_ESTADO[e]}`], {
            frameAnchor: 'top-left',
            dx: 4,
            dy: 22 + i * 18,
            fill:
              e === 'se-descarta' || e === 'previo-al-alta'
                ? token('cat-gris-texto')
                : ESTILO[e].color,
            fontWeight: 600,
            textAnchor: 'start',
          }),
        ),
      ],
    });
  }, [filas, presentes]);

  const hayPrevio = presentes.includes('previo-al-alta');
  return (
    <Chart
      titulo={TEXTOS.graficoTitulo}
      descripcion={`${TEXTOS.graficoComoLeer}${hayPrevio ? ` ${TEXTOS.graficoComoLeerPrevio}` : ''}`}
      alto={360}
      opciones={opciones}
      tabla={{
        titulo: TEXTOS.graficoTitulo,
        columnas: [
          { clave: 'mes', titulo: 'Mes' },
          { clave: 'estado', titulo: 'Estado' },
          { clave: 'baseNominal', titulo: 'Base nominal', tipo: 'euros', decimales: 2 },
          { clave: 'factor', titulo: 'Factor de actualización', tipo: 'numero', decimales: 7 },
          { clave: 'baseActualizada', titulo: 'Base actualizada', tipo: 'euros', decimales: 2 },
        ],
        filas: filas.map((f) => ({
          mes: f.mes,
          estado: f.estado,
          baseNominal: f.baseNominal,
          factor: f.factor,
          baseActualizada: f.baseActualizada,
        })),
      }}
      nota={TEXTOS.graficoNota}
    />
  );
}
