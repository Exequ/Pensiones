import * as Plot from '@observablehq/plot';
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import type { Dato } from '../engine/esquema-datos';
import { DataTable, type Columna, type ValorCelda } from './DataTable';
import { SourceLine } from './SourceLine';
import { HowToRead } from './HowToRead';
import { crearGrupoDialogos, useDialogoModal, useDialogoUnico } from './dialogoModal';
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
  /**
   * «Cómo leerlo»: qué mide, qué significa subir o bajar y qué no dice. Se pinta después de la figura
   * y se repite en el gráfico ampliado.
   */
  comoLeerlo?: ReactNode;
}

const ANCHO_INICIAL = 640;
/** El gráfico ampliado gana alto en proporción al normal (el ancho lo da el diálogo). */
const FACTOR_ALTO_AMPLIADO = 1.5;

/** Gráficos ampliados: solo uno abierto a la vez. */
const GRUPO_GRAFICOS = crearGrupoDialogos();

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

interface LienzoProps {
  readonly titulo: string;
  readonly opciones: (contexto: ContextoGrafico) => Plot.PlotOptions;
  readonly alto: number;
  readonly ampliado?: boolean;
}

/**
 * El SVG de Observable Plot, dibujado al ancho del contenedor (medido con ResizeObserver). El
 * gráfico ampliado se dibuja de nuevo con su propio ancho: no es un escalado del pequeño.
 */
function LienzoGrafico({ titulo, opciones, alto, ampliado = false }: LienzoProps) {
  const lienzo = useRef<HTMLDivElement>(null);
  const ancho = useAncho(lienzo);
  const altoEfectivo = ampliado ? Math.round(alto * FACTOR_ALTO_AMPLIADO) : alto;

  useEffect(() => {
    const nodo = lienzo.current;
    if (!nodo) return;
    const grafico = Plot.plot({
      ...aplicarEstiloCasa(opciones({ ancho }), ancho, altoEfectivo),
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
  }, [opciones, ancho, altoEfectivo, titulo]);

  return (
    <div
      className={ampliado ? 'grafico-lienzo grafico-lienzo--ampliado' : 'grafico-lienzo'}
      ref={lienzo}
    />
  );
}

/**
 * Gráfico con el estilo de la casa: <figure> con <figcaption>, el SVG de
 * Observable Plot, la tabla de datos equivalente y la línea de fuente; después, si lo hay, el
 * «Cómo leerlo». El botón «+» de la esquina abre el gráfico ampliado en un diálogo modal, con la
 * misma tabla, la misma fuente, la misma nota y el mismo «Cómo leerlo», y con el estado actual de
 * los controles de la página (el diálogo recibe las mismas opciones).
 */
export function Chart<F extends Record<string, ValorCelda>>({
  titulo,
  descripcion,
  opciones,
  alto = 320,
  tabla,
  fuentes,
  nota,
  comoLeerlo,
}: ChartProps<F>) {
  const botonAmpliar = useRef<HTMLButtonElement>(null);
  const { abierto, abrir, cerrar } = useDialogoUnico(GRUPO_GRAFICOS, botonAmpliar);
  const tablaDatos = (
    <DataTable
      titulo={tabla.titulo ?? titulo}
      columnas={tabla.columnas}
      filas={tabla.filas}
      {...(tabla.filaDestacada === undefined ? {} : { filaDestacada: tabla.filaDestacada })}
    />
  );

  return (
    <>
      <figure className="grafico">
        <figcaption className="grafico-leyenda">
          <span className="grafico-titulo">{titulo}</span>
          {descripcion ? <span className="grafico-descripcion">{descripcion}</span> : null}
        </figcaption>
        <button
          ref={botonAmpliar}
          type="button"
          className="grafico-ampliar"
          aria-haspopup="dialog"
          aria-expanded={abierto}
          aria-label={`Ampliar gráfico: ${titulo}`}
          onClick={abierto ? cerrar : abrir}
        >
          +
        </button>
        <LienzoGrafico titulo={titulo} opciones={opciones} alto={alto} />
        <details className="grafico-datos">
          <summary>Ver los datos del gráfico en una tabla</summary>
          {tablaDatos}
        </details>
        {nota ? <p className="grafico-nota">{nota}</p> : null}
        {fuentes ? <SourceLine datos={fuentes} titulo={titulo} /> : null}
      </figure>
      {comoLeerlo ? <HowToRead>{comoLeerlo}</HowToRead> : null}
      {abierto ? (
        <DialogoGrafico titulo={titulo} onCerrar={cerrar}>
          {descripcion ? <p className="grafico-dialogo-descripcion">{descripcion}</p> : null}
          <div
            className="grafico-dialogo-desplazable"
            role="region"
            aria-label={`Gráfico ampliado: ${titulo}`}
            tabIndex={0}
          >
            <LienzoGrafico titulo={titulo} opciones={opciones} alto={alto} ampliado />
          </div>
          {tablaDatos}
          {nota ? <p className="grafico-nota">{nota}</p> : null}
          {fuentes ? <SourceLine datos={fuentes} titulo={titulo} /> : null}
          {comoLeerlo ? <HowToRead>{comoLeerlo}</HowToRead> : null}
        </DialogoGrafico>
      ) : null}
    </>
  );
}

/** Diálogo modal del gráfico ampliado, con el patrón de foco del desplegable de fuentes. */
function DialogoGrafico({
  titulo,
  onCerrar,
  children,
}: {
  readonly titulo: string;
  readonly onCerrar: () => void;
  readonly children: ReactNode;
}) {
  const idTitulo = useId();
  const dialogo = useRef<HTMLDialogElement>(null);
  const cerrarBoton = useRef<HTMLButtonElement>(null);
  useDialogoModal(dialogo, cerrarBoton, onCerrar);

  return (
    <dialog ref={dialogo} className="grafico-dialogo" aria-labelledby={idTitulo}>
      <div className="grafico-dialogo-cabecera">
        <p id={idTitulo} className="grafico-dialogo-titulo">
          {titulo}
        </p>
        <button
          ref={cerrarBoton}
          type="button"
          className="grafico-dialogo-cerrar"
          onClick={onCerrar}
        >
          Cerrar
        </button>
      </div>
      <div className="grafico-dialogo-contenido">{children}</div>
    </dialog>
  );
}
