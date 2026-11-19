import { Link } from 'react-router-dom';
import { grupoSobreLaWeb } from '../modules/navegacion';
import './Footer.css';

/** Pie con los enlaces del grupo «Sobre la web» del menú: Metodología, Fuentes y Registro de cambios. */
export function Footer() {
  return (
    <footer className="pie">
      <div className="contenedor pie-interior">
        <nav aria-label="Sobre esta web">
          <ul className="pie-enlaces">
            {grupoSobreLaWeb().enlaces.map((enlace) => (
              <li key={enlace.slug}>
                <Link to={enlace.ruta}>{enlace.titulo}</Link>
              </li>
            ))}
          </ul>
        </nav>
        <p className="pie-texto">
          Proyecto divulgativo independiente. No es una web oficial de ninguna administración
          pública.
        </p>
      </div>
    </footer>
  );
}
