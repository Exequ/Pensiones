import type { ReactNode } from 'react';

/** Texto «Cómo leerlo» bajo cada gráfico, en lenguaje llano. */
export function ComoLeerlo({ children }: { children: ReactNode }) {
  return (
    <div className="como-leerlo">
      <p className="como-leerlo-etiqueta">Cómo leerlo</p>
      <div className="como-leerlo-texto">{children}</div>
    </div>
  );
}
