import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { irAEncabezado } from './anclas';

/** Distancia máxima (px) desde arriba a la que se da por bien colocado el encabezado de destino. */
const MARGEN_SUPERIOR = 200;

/**
 * Páginas que reciben enlaces a uno de sus apartados desde otra página (`InternalLink` con `pagina`):
 * el destino llega en el estado de la navegación y la página se desplaza a él al montarse, sin
 * cambiar la dirección (el hash es la ruta). Como los gráficos se dibujan después del primer
 * pintado y mueven el contenido, se recoloca una vez si el encabezado ha quedado lejos.
 */
export function useAnclaPendiente(): void {
  const { state } = useLocation() as { state: { ancla?: unknown } | null };
  const ancla = typeof state?.ancla === 'string' ? state.ancla : undefined;
  useEffect(() => {
    if (ancla === undefined) return;
    irAEncabezado(ancla);
    const id = window.setTimeout(() => {
      const arriba = document.getElementById(ancla)?.getBoundingClientRect().top;
      if (arriba !== undefined && (arriba < 0 || arriba > MARGEN_SUPERIOR)) irAEncabezado(ancla);
    }, 400);
    return () => {
      window.clearTimeout(id);
    };
  }, [ancla]);
}
