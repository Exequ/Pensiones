import { useId, useState, type ReactNode } from 'react';
import './TechnicalDetail.css';

interface TechnicalDetailProps {
  /** Título visible del bloque (el texto del botón). */
  readonly titulo: string;
  readonly children: ReactNode;
  /** Nivel del encabezado que envuelve el botón (por defecto, 3). */
  readonly nivel?: 2 | 3 | 4;
  /** Desplegado al pintar (por defecto, plegado). */
  readonly abiertoInicial?: boolean;
}

/**
 * Detalle técnico plegable: un encabezado con un botón (`aria-expanded`, `aria-controls`) que
 * despliega una región con su contenido. Plegado por defecto. El contenido solo se monta al
 * desplegar, de modo que un gráfico que vaya dentro se mide con su ancho real y conserva su tabla
 * accesible, su fuente y su nota (los pinta `Chart`).
 */
export function TechnicalDetail({
  titulo,
  children,
  nivel = 3,
  abiertoInicial = false,
}: TechnicalDetailProps) {
  const [abierto, setAbierto] = useState(abiertoInicial);
  const idBoton = useId();
  const idRegion = useId();
  const Encabezado = `h${String(nivel)}` as 'h2' | 'h3' | 'h4';
  return (
    <div className="detalle-tecnico" data-abierto={abierto ? 'si' : 'no'}>
      <Encabezado className="detalle-tecnico-encabezado">
        <button
          type="button"
          id={idBoton}
          className="detalle-tecnico-boton"
          aria-expanded={abierto}
          aria-controls={idRegion}
          onClick={() => {
            setAbierto((a) => !a);
          }}
        >
          {titulo}
        </button>
      </Encabezado>
      <div
        id={idRegion}
        className="detalle-tecnico-contenido"
        role="region"
        aria-labelledby={idBoton}
        hidden={!abierto}
      >
        {abierto ? children : null}
      </div>
    </div>
  );
}
