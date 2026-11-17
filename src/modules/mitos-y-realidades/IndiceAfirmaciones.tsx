import type { Mito } from './Afirmacion';

/**
 * Índice de las afirmaciones, en el orden del catálogo. Con `HashRouter` un ancla normal cambiaría
 * de ruta: el enlace mueve el foco y el desplazamiento al encabezado de la afirmación a mano.
 */
export function IndiceAfirmaciones({ mitos }: { readonly mitos: readonly Mito[] }) {
  return (
    <nav className="mitos-indice ancho-completo" aria-labelledby="mitos-indice-titulo">
      <p className="mitos-indice-titulo" id="mitos-indice-titulo">
        Afirmaciones
      </p>
      <ol className="mitos-indice-lista">
        {mitos.map((m) => (
          <li key={m.id}>
            <a
              href={`#${m.id}`}
              onClick={(evento) => {
                evento.preventDefault();
                const titulo = document.getElementById(`${m.id}-titulo`);
                titulo?.scrollIntoView();
                titulo?.focus({ preventScroll: true });
              }}
            >
              {m.enunciado}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
