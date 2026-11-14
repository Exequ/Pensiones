import { Link } from 'react-router-dom';

interface ContenidoPaginaProps {
  /** Lista de contenidos de la sección (`seccion.previsto`): lo disponible y lo pendiente. */
  contenidos: readonly string[];
}

/** Cierre de página: qué cubre y qué queda fuera, y enlace de vuelta al índice. */
export function ContenidoPagina({ contenidos }: ContenidoPaginaProps) {
  return (
    <section className="seccion prosa" aria-labelledby="contenido">
      <h2 id="contenido">Qué cubre esta página y qué queda fuera</h2>
      <ul className="hist-estado-lista">
        {contenidos.map((c) => (
          <li key={c}>{c}</li>
        ))}
      </ul>
      <p className="texto-interfaz">
        <Link to="/" className="enlace-volver">
          Volver al índice
        </Link>
      </p>
    </section>
  );
}
