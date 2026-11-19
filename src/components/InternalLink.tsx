import type { ReactNode } from 'react';
import { useHref, useLocation } from 'react-router-dom';
import { irAEncabezado } from './anclas';

interface InternalLinkProps {
  /** `id` del encabezado de destino (debe poder recibir el foco). */
  readonly destino: string;
  readonly children: ReactNode;
  readonly className?: string;
  readonly 'aria-current'?: 'location';
}

/**
 * Enlace a un apartado de la misma página. Con `HashRouter` un ancla «#id» cambiaría de ruta: el
 * clic mueve el desplazamiento y el foco al encabezado a mano (`irAEncabezado`) y no toca la
 * dirección. El `href` es la propia página con su query, de modo que abrirlo en otra pestaña lleva a
 * la misma página y no a una ruta inexistente.
 */
export function InternalLink({ destino, children, className, ...resto }: InternalLinkProps) {
  const { pathname, search } = useLocation();
  const href = useHref({ pathname, search });
  return (
    <a
      href={href}
      data-destino={destino}
      {...(className ? { className } : {})}
      {...(resto['aria-current'] ? { 'aria-current': resto['aria-current'] } : {})}
      onClick={(evento) => {
        // Con una tecla modificadora (abrir en otra pestaña) se deja el comportamiento normal.
        if (evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;
        evento.preventDefault();
        irAEncabezado(destino);
      }}
    >
      {children}
    </a>
  );
}
