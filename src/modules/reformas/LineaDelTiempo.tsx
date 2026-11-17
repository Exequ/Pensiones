import type { ReformaVista } from './datos-reformas';
import { ID_FICHA } from './FichaReforma';

export const ID_LINEA = 'ref-linea';

/**
 * Línea del tiempo: lista ordenada por fecha de aprobación, sin otro criterio. Con `HashRouter` un
 * ancla normal cambiaría de ruta: el enlace mueve el desplazamiento y el foco al encabezado a mano.
 */
export function LineaDelTiempo({ reformas }: { readonly reformas: readonly ReformaVista[] }) {
  return (
    <nav className="ref-linea ancho-completo" aria-labelledby={`${ID_LINEA}-titulo`}>
      <h2 className="ref-linea-titulo" id={`${ID_LINEA}-titulo`} tabIndex={-1}>
        Línea del tiempo
      </h2>
      <ol className="ref-linea-lista">
        {reformas.map((r) => (
          <li key={r.id}>
            <time className="ref-linea-fecha" dateTime={r.norma.fecha}>
              {r.aprobacion}
            </time>
            <a
              href={`#${ID_FICHA(r.id)}`}
              onClick={(evento) => {
                evento.preventDefault();
                const titulo = document.getElementById(`${ID_FICHA(r.id)}-titulo`);
                titulo?.scrollIntoView();
                titulo?.focus({ preventScroll: true });
              }}
            >
              {r.nombre}
            </a>
          </li>
        ))}
      </ol>
    </nav>
  );
}
