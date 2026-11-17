import type { EntradaIndice } from './apartados';

/**
 * Índice de la página. Con `HashRouter` un ancla normal cambiaría de ruta: el enlace mueve el
 * desplazamiento y el foco al encabezado a mano.
 */
export function Indice({ entradas }: { entradas: readonly EntradaIndice[] }) {
  return (
    <nav className="met-indice ancho-completo" aria-labelledby="met-indice-titulo">
      <p className="met-indice-titulo" id="met-indice-titulo">
        En esta página
      </p>
      <ol className="met-indice-lista">
        {entradas.map((e) => (
          <li key={e.id}>
            <a
              href={`#${e.id}`}
              onClick={(evento) => {
                evento.preventDefault();
                const titulo = document.getElementById(`${e.id}-titulo`);
                titulo?.scrollIntoView();
                titulo?.focus({ preventScroll: true });
              }}
            >
              {e.titulo}
            </a>
            <span className="met-indice-resumen"> · {e.resumen}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
