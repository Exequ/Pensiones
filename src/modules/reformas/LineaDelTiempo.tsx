import type { ReformaVista } from './datos-reformas';
import { ID_FICHA } from './FichaReforma';
import { InternalLink } from '../../components/InternalLink';

export const ID_LINEA = 'ref-linea';

/** Título de la línea del tiempo (lo repite el índice «En esta página»). */
export const TITULO_LINEA = 'Línea del tiempo';

/**
 * Línea del tiempo: lista ordenada por fecha de aprobación, sin otro criterio. Cada enlace mueve el
 * desplazamiento y el foco al encabezado de la ficha sin cambiar la dirección (`InternalLink`).
 */
export function LineaDelTiempo({ reformas }: { readonly reformas: readonly ReformaVista[] }) {
  return (
    <nav className="ref-linea ancho-completo" aria-labelledby={`${ID_LINEA}-titulo`}>
      <h2 className="ref-linea-titulo" id={`${ID_LINEA}-titulo`} tabIndex={-1}>
        {TITULO_LINEA}
      </h2>
      <ol className="ref-linea-lista">
        {reformas.map((r) => (
          <li key={r.id}>
            <time className="ref-linea-fecha" dateTime={r.norma.fecha}>
              {r.aprobacion}
            </time>
            <InternalLink destino={`${ID_FICHA(r.id)}-titulo`}>{r.nombre}</InternalLink>
          </li>
        ))}
      </ol>
    </nav>
  );
}
