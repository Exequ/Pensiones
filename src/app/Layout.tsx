import { useEffect, useRef } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Footer } from '../components/Footer';
import { Header } from '../components/Header';
import './Layout.css';

/** Estructura común: enlace de salto, cabecera, contenido y pie. */
export function Layout() {
  const { pathname } = useLocation();
  const principal = useRef<HTMLElement>(null);
  const primeraCarga = useRef(true);

  // Al cambiar de página: arriba del todo y foco en el contenido (no en la primera carga).
  useEffect(() => {
    if (primeraCarga.current) {
      primeraCarga.current = false;
      return;
    }
    window.scrollTo(0, 0);
    principal.current?.focus({ preventScroll: true });
  }, [pathname]);

  return (
    <>
      <a
        className="saltar-al-contenido"
        href="#contenido"
        onClick={(evento) => {
          // Con HashRouter, un ancla normal cambiaría de ruta: se mueve el foco a mano.
          evento.preventDefault();
          principal.current?.focus();
        }}
      >
        Saltar al contenido
      </a>
      <Header />
      <main id="contenido" ref={principal} tabIndex={-1} className="principal">
        <Outlet />
      </main>
      <Footer />
    </>
  );
}
