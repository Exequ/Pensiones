import * as Plot from '@observablehq/plot';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Dato } from '../engine/esquema-datos';
import { DataTable, type Columna, type ValorCelda } from './DataTable';
import { SourceLine } from './SourceLine';
import { aplicarEstiloCasa } from './estiloGrafico';
import './Chart.css';

export interface ContextoGrafico {
  /** Ancho disponible en píxeles. */
  readonly ancho: number;
}

interface ChartProps<F extends Record<string, ValorCelda>> {
  /** Título del gráfico (va en el figcaption). */
  titulo: string;
  /** Subtítulo: qué se mide y en qué unidades. */
  descripcion?: ReactNode;
  /** Opciones de Observable Plot. Recibe el ancho para adaptar marcas y márgenes. */
  opciones: (contexto: ContextoGrafico) => Plot.PlotOptions;
  /** Alto en píxeles (por defecto, 320). */
  alto?: number;
  /** Alternativa accesible: los mismos datos en una tabla. Obligatoria. */
  tabla: {
    readonly titulo?: string;
    readonly columnas: readonly Columna<F>[];
    readonly filas: readonly F[];
    readonly filaDestacada?: number;
  };
  /** Datos con fuente para la línea de fuente bajo el gráfico. */
  fuentes?: Dato | readonly Dato[];
  /** Nota adicional bajo el gráfico (p. ej., «Datos ficticios»). */
  nota?: ReactNode;
}

const ANCHO_INICIAL = 640;

function useAncho(ref: React.RefObject<HTMLElement | null>): number {
  const [ancho, setAncho] = useState(ANCHO_INICIAL);
  useEffect(() => {
    const nodo = ref.current;
    if (!nodo) return;
    const medir = () => {
      const medido = Math.floor(nodo.getBoundingClientRect().width);
      if (medido > 0) setAncho(medido);
    };
    medir();
    if (typeof ResizeObserver === 'undefined') return;
    const observador = new ResizeObserver(medir);
    observador.observe(nodo);
    return () => {
      observador.disconnect();
    };
  }, [ref]);
  return ancho;
}

/**
 * Gráfico con el estilo de la casa: <figure> con <figcaption>, el SVG de
 * Observable Plot, la tabla de datos equivalente y la línea de fuente.
 */
export function Chart<F extends Record<string, ValorCelda>>({
  titulo,
  descripcion,
  opciones,
  alto = 320,
  tabla,
  fuentes,
  nota,
}: ChartProps<F>) {
  const lienzo = useRef<HTMLDivElement>(null);
  const ancho = useAncho(lienzo);

  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;
    const grafico = Plot.plot({
      ...aplicarEstiloCasa(opciones({ ancho }), ancho, alto),
      ariaLabel: titulo,
      ariaDescription: 'Los datos del gráfico están disponibles en la tabla que lo acompaña.',
    });
    grafico.setAttribute('role', 'img');
    // El SVG es una imagen con nombre propio y tabla alternativa: las etiquetas ARIA
    // internas que añade Plot (aria-label en <g>) no aportan y no son válidas ahí.
    for (const nodoInterno of grafico.querySelectorAll('[aria-label]')) {
      nodoInterno.removeAttribute('aria-label');
    }
    nodo.replaceChildren(grafico);
    return () => {
      grafico.remove();
    };
  }, [opciones, ancho, alto, titulo]);

  return (
    <figure className="grafico">
      <figcaption className="grafico-leyenda">
        <span className="grafico-titulo">{titulo}</span>
        {descripcion ? <span className="grafico-descripcion">{descripcion}</span> : null}
      </figcaption>
      <div className="grafico-lienzo" ref={lienzo} />
      <details className="grafico-datos">
        <summary>Ver los datos del gráfico en una tabla</summary>
        <DataTable
          titulo={tabla.titulo ?? titulo}
          columnas={tabla.columnas}
          filas={tabla.filas}
          {...(tabla.filaDestacada === undefined ? {} : { filaDestacada: tabla.filaDestacada })}
        />
      </details>
      {nota ? <p className="grafico-nota">{nota}</p> : null}
      {fuentes ? <SourceLine datos={fuentes} /> : null}
    </figure>
  );
}
