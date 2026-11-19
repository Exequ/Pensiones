import { useEffect, useId, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import { LEMA_SITIO, NOMBRE_SITIO } from '../config';
import { GRUPOS_NAVEGACION, grupoDeRuta } from '../modules/navegacion';
import { DevBanner } from './DevBanner';
import './Header.css';

/**
 * Cabecera del sitio: franja de desarrollo, marca y navegación principal agrupada.
 *
 * Patrón de «disclosure» (no `role="menu"`): cada grupo es un botón con `aria-expanded` y
 * `aria-controls` que muestra una lista de enlaces. Solo hay un grupo abierto a la vez; se cierra
 * con Esc (el foco vuelve a su botón), al elegir un enlace, al cambiar de ruta, al pulsar fuera del
 * menú y cuando el foco sale del menú. En móvil (< 960 px) todo va tras el botón «Menú» y los
 * grupos se despliegan en acordeón. Los grupos salen de `GRUPOS_NAVEGACION`.
 */
export function Header() {
  const [abierto, setAbierto] = useState(false);
  const [grupoAbierto, setGrupoAbierto] = useState<string | null>(null);
  const idNavegacion = useId();
  const prefijo = useId();
  const navegacion = useRef<HTMLElement>(null);
  const botonMenu = useRef<HTMLButtonElement>(null);
  const { pathname } = useLocation();
  const grupoActual = grupoDeRuta(pathname)?.id;

  // Cierra el menú móvil y el grupo abierto al cambiar de página.
  const [rutaAnterior, setRutaAnterior] = useState(pathname);
  if (rutaAnterior !== pathname) {
    setRutaAnterior(pathname);
    setAbierto(false);
    setGrupoAbierto(null);
  }

  useEffect(() => {
    if (!abierto && grupoAbierto === null) return;
    const alPulsarTecla = (evento: KeyboardEvent) => {
      if (evento.key !== 'Escape') return;
      if (grupoAbierto !== null) {
        // Primero se cierra el grupo y el foco vuelve a su botón.
        const boton = document.getElementById(`${prefijo}-${grupoAbierto}-boton`);
        setGrupoAbierto(null);
        boton?.focus();
        return;
      }
      const dentro = navegacion.current?.contains(document.activeElement) === true;
      setAbierto(false);
      if (dentro) botonMenu.current?.focus();
    };
    const alPulsarFuera = (evento: MouseEvent) => {
      if (grupoAbierto === null) return;
      const destino = evento.target;
      if (destino instanceof Node && navegacion.current?.contains(destino)) return;
      setGrupoAbierto(null);
    };
    // El foco sale del menú (Tab tras el último enlace): se cierra el grupo abierto.
    const alSalirElFoco = (evento: FocusEvent) => {
      const siguiente = evento.relatedTarget;
      if (siguiente instanceof Node && !navegacion.current?.contains(siguiente)) {
        setGrupoAbierto(null);
      }
    };
    const nav = navegacion.current;
    document.addEventListener('keydown', alPulsarTecla);
    document.addEventListener('click', alPulsarFuera);
    nav?.addEventListener('focusout', alSalirElFoco);
    return () => {
      document.removeEventListener('keydown', alPulsarTecla);
      document.removeEventListener('click', alPulsarFuera);
      nav?.removeEventListener('focusout', alSalirElFoco);
    };
  }, [abierto, grupoAbierto, prefijo]);

  return (
    <header className="cabecera">
      <DevBanner />
      <div className="contenedor cabecera-barra">
        <Link to="/" className="cabecera-marca">
          <span className="cabecera-nombre">{NOMBRE_SITIO}</span>
          <span className="cabecera-lema">{LEMA_SITIO}</span>
        </Link>
        <button
          ref={botonMenu}
          type="button"
          className="cabecera-boton-menu"
          aria-expanded={abierto}
          aria-controls={idNavegacion}
          onClick={() => {
            setAbierto((a) => !a);
            setGrupoAbierto(null);
          }}
        >
          {abierto ? 'Cerrar' : 'Menú'}
        </button>
      </div>
      <nav
        ref={navegacion}
        id={idNavegacion}
        className="navegacion"
        aria-label="Secciones"
        data-abierta={abierto ? 'si' : 'no'}
      >
        <ul className="contenedor navegacion-lista">
          {GRUPOS_NAVEGACION.map((grupo) => {
            const actual = grupo.id === grupoActual;
            const [unico] = grupo.enlaces;
            if (grupo.directo && unico) {
              return (
                <li
                  key={grupo.id}
                  className="navegacion-elemento"
                  data-actual={actual ? 'si' : 'no'}
                >
                  <NavLink
                    to={unico.ruta}
                    className="navegacion-enlace"
                    onClick={() => {
                      setAbierto(false);
                      setGrupoAbierto(null);
                    }}
                  >
                    {unico.titulo}
                  </NavLink>
                </li>
              );
            }
            const desplegado = grupoAbierto === grupo.id;
            const idPanel = `${prefijo}-${grupo.id}-panel`;
            return (
              <li
                key={grupo.id}
                className="navegacion-elemento navegacion-grupo"
                data-actual={actual ? 'si' : 'no'}
              >
                <button
                  type="button"
                  id={`${prefijo}-${grupo.id}-boton`}
                  className="navegacion-boton-grupo"
                  aria-expanded={desplegado}
                  aria-controls={idPanel}
                  onClick={() => {
                    setGrupoAbierto(desplegado ? null : grupo.id);
                  }}
                >
                  {grupo.titulo}
                </button>
                <ul id={idPanel} className="navegacion-panel" hidden={!desplegado}>
                  {grupo.enlaces.map((enlace) => (
                    <li key={enlace.slug}>
                      <NavLink
                        to={enlace.ruta}
                        className="navegacion-enlace navegacion-enlace-panel"
                        onClick={() => {
                          setAbierto(false);
                          setGrupoAbierto(null);
                        }}
                      >
                        {enlace.titulo}
                      </NavLink>
                    </li>
                  ))}
                </ul>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
