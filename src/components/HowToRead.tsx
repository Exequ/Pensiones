import type { ReactNode } from 'react';
import './HowToRead.css';

/** Texto «Cómo leerlo» bajo un gráfico o una tabla, en lenguaje llano. */
export function HowToRead({ children }: { children: ReactNode }) {
  return (
    <div className="como-leerlo">
      <p className="como-leerlo-etiqueta">Cómo leerlo</p>
      <div className="como-leerlo-texto">{children}</div>
    </div>
  );
}
