import { useEffect, useId, useState } from 'react';
import { apartadoVisible, type EntradaIndice } from './anclas';
import { InternalLink } from './InternalLink';
import './OnThisPage.css';

interface OnThisPageProps {
  /** Apartados de la página, en orden (cada `destino` es el `id` de un encabezado). */
  readonly entradas: readonly EntradaIndice[];
  /** Nombre del índice (por defecto, «En esta página»). */
  readonly titulo?: string;
  /**
   * En escritorio, fijo en la columna de notas mientras se desplaza la página (por defecto). Con
   * `false` va en línea, a todo el ancho: para páginas con bloques a todo el ancho que el índice
   * taparía.
   */
  readonly fijo?: boolean;
}

/** Marca el apartado visible al desplazarse (sin dependencias: un oyente pasivo y un fotograma). */
function useApartadoVisible(entradas: readonly EntradaIndice[]): number | null {
  const [activo, setActivo] = useState<number | null>(null);
  useEffect(() => {
    let pendiente = 0;
    const medir = () => {
      pendiente = 0;
      const posiciones = entradas.map(
        (e) => document.getElementById(e.destino)?.getBoundingClientRect().top ?? null,
      );
      setActivo(apartadoVisible(posiciones));
    };
    const alDesplazar = () => {
      if (pendiente === 0) pendiente = window.requestAnimationFrame(medir);
    };
    medir();
    window.addEventListener('scroll', alDesplazar, { passive: true });
    window.addEventListener('resize', alDesplazar, { passive: true });
    return () => {
      window.removeEventListener('scroll', alDesplazar);
      window.removeEventListener('resize', alDesplazar);
      if (pendiente !== 0) window.cancelAnimationFrame(pendiente);
    };
  }, [entradas]);
  return activo;
}

/**
 * Índice «En esta página»: enlaces a los encabezados de la página que mueven el desplazamiento y el
 * foco sin cambiar la dirección (compatible con `HashRouter`). En escritorio va fijo en la columna
 * de notas y marca el apartado que se está leyendo (`aria-current="location"`); en móvil (< 960 px)
 * se pliega tras un botón «En esta página», cerrado por defecto. Va dentro de una rejilla
 * `.articulo`, en el lugar del flujo donde se lee (tras la cabecera).
 */
export function OnThisPage({ entradas, titulo = 'En esta página', fijo = true }: OnThisPageProps) {
  const [abierto, setAbierto] = useState(false);
  const idTitulo = useId();
  const idLista = useId();
  const activo = useApartadoVisible(entradas);
  return (
    <div className={`indice-pagina-marco${fijo ? ' indice-pagina-marco--fijo' : ''}`}>
      <nav
        className="indice-pagina"
        aria-labelledby={idTitulo}
        data-abierto={abierto ? 'si' : 'no'}
      >
        <p className="indice-pagina-titulo" id={idTitulo}>
          {titulo}
        </p>
        <button
          type="button"
          className="indice-pagina-boton"
          aria-expanded={abierto}
          aria-controls={idLista}
          onClick={() => {
            setAbierto((a) => !a);
          }}
        >
          {titulo}
        </button>
        <ol id={idLista} className="indice-pagina-lista">
          {entradas.map((e, i) => (
            <li key={e.destino} className="indice-pagina-elemento">
              <InternalLink
                destino={e.destino}
                className="indice-pagina-enlace"
                {...(i === activo ? { 'aria-current': 'location' as const } : {})}
              >
                {e.titulo}
              </InternalLink>
              {e.resumen ? (
                <span className="indice-pagina-resumen">
                  {/* El separador solo tiene sentido con el resumen en la misma línea del título. */}
                  <span className="indice-pagina-separador"> · </span>
                  {e.resumen}
                </span>
              ) : null}
            </li>
          ))}
        </ol>
      </nav>
    </div>
  );
}
