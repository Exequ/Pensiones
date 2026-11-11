import type { ReactNode } from 'react';
import './Definition.css';

interface DefinitionProps {
  termino: string;
  children: ReactNode;
  /** Etiqueta del bloque (por defecto, «Definición»). */
  etiqueta?: string;
}

/** Bloque de definición con filete superior de 3 px en tinta. */
export function Definition({ termino, children, etiqueta = 'Definición' }: DefinitionProps) {
  return (
    <div className="definicion">
      <p className="definicion-etiqueta" aria-hidden="true">
        {etiqueta}
      </p>
      <dl>
        <dt className="definicion-termino">
          <span className="visualmente-oculto">{etiqueta}: </span>
          <dfn>{termino}</dfn>
        </dt>
        <dd className="definicion-texto">{children}</dd>
      </dl>
    </div>
  );
}
