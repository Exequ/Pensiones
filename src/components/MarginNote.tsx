import type { ReactNode } from 'react';
import './MarginNote.css';

interface MarginNoteProps {
  children: ReactNode;
  /** Etiqueta visible sobre la nota (por defecto, «Nota»). */
  etiqueta?: string;
}

/**
 * Nota al margen. Dentro de una rejilla `.articulo` se coloca en la columna
 * derecha, a la altura del elemento anterior; en móvil va en línea, tras él.
 */
export function MarginNote({ children, etiqueta = 'Nota' }: MarginNoteProps) {
  return (
    <div className="nota-margen" role="note" aria-label={etiqueta}>
      <p className="nota-margen-etiqueta">{etiqueta}</p>
      <div className="nota-margen-texto">{children}</div>
    </div>
  );
}
