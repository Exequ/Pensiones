import { Link } from 'react-router-dom';
import './Footer.css';

/** Pie con enlaces a Metodología, Fuentes y Registro de cambios. */
export function Footer() {
  return (
    <footer className="pie">
      <div className="contenedor pie-interior">
        <nav aria-label="Sobre esta web">
          <ul className="pie-enlaces">
            <li>
              <Link to="/metodologia">Metodología</Link>
            </li>
            <li>
              <Link to="/fuentes">Fuentes</Link>
            </li>
            <li>
              <Link to="/cambios">Registro de cambios</Link>
            </li>
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
