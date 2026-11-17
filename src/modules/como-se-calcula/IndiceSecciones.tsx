import { ESQUEMAS } from './esquemas';

export const ID_TERMINOS = 'como-terminos';

/**
 * Índice de la página. Con `HashRouter` un ancla normal cambiaría de ruta: el enlace mueve el
 * desplazamiento y el foco al encabezado a mano.
 */
export function IndiceSecciones() {
  const entradas = [
    {
      id: ID_TERMINOS,
      titulo: 'Los términos de esta página',
      resumen: 'Qué significa cada palabra.',
    },
    ...ESQUEMAS.map((e) => ({ id: `como-${e.ancla}`, titulo: e.titulo, resumen: e.resumen })),
  ];
  return (
    <nav className="como-indice ancho-completo" aria-labelledby="como-indice-titulo">
      <p className="como-indice-titulo" id="como-indice-titulo">
        En esta página
      </p>
      <ol className="como-indice-lista">
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
            <span className="como-indice-resumen"> · {e.resumen}</span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
