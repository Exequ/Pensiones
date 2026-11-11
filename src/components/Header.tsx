import { useEffect, useId, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LEMA_SITIO, NOMBRE_SITIO } from '../config';
import { SECCIONES } from '../modules/secciones';
import { DevBanner } from './DevBanner';
import './Header.css';

/** Cabecera del sitio: franja de desarrollo, marca y navegación principal. */
export function Header() {
  const [abierto, setAbierto] = useState(false);
  const idNavegacion = useId();
  const { pathname } = useLocation();

  // Cierra el menú móvil al cambiar de página.
  const [rutaAnterior, setRutaAnterior] = useState(pathname);
  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname);
    setAbierto(false);
  }

  useEffect(() => {
    if (!abierto) return;
    const alPulsar = (evento: KeyboardEvent) => {
      if (evento.key === 'Escape') setAbierto(false);
    };
    document.addEventListener('keydown', alPulsar);
    return () => {
      document.removeEventListener('keydown', alPulsar);
    };
  }, [abierto]);

  return (
    <header className="cabecera">
      <DevBanner />
      <div className="contenedor cabecera-barra">
        <Link to="/" className="cabecera-marca">
          <span className="cabecera-nombre">{NOMBRE_SITIO}</span>
          <span className="cabecera-lema">{LEMA_SITIO}</span>
        </Link>
        <button
          type="button"
          className="cabecera-boton-menu"
          aria-expanded={abierto}
          aria-controls={idNavegacion}
          onClick={() => {
            setAbierto((a) => !a);
          }}
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </div>
      <nav
        id={idNavegacion}
        className="navegacion"
        aria-label="Secciones"
        data-abierta={abierto ? 'si' : 'no'}
      >
        <ul className="contenedor navegacion-lista">
          {SECCIONES.map((seccion) => (
            <li key={seccion.slug} className="navegacion-elemento">
              <NavLink to={`/${seccion.slug}`} className="navegacion-enlace">
                {seccion.tituloNav}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>
    </header>
  );
}
