import { lazy, Suspense } from 'react';
import { HashRouter, Route, Routes } from 'react-router-dom';
import { Inicio } from './app/Inicio';
import { Layout } from './app/Layout';
import { Fuentes, NoEncontrada, RegistroCambios } from './app/PaginasAuxiliares';
import { PAGINAS } from './modules/paginas';
import { SECCIONES } from './modules/secciones';

// El laboratorio de diseño (y Observable Plot) se carga solo si se visita /diseno.
const DesignLab = lazy(() => import('./design-lab/DesignLab'));

/** Rutas de la web. HashRouter evita errores 404 al recargar en GitHub Pages. */
export function App() {
  return (
    <HashRouter>
      <Routes>
        <Route element={<Layout />}>
          <Route index element={<Inicio />} />
          {SECCIONES.map(({ slug }) => {
            const Pagina = PAGINAS[slug];
            return <Route key={slug} path={slug} element={<Pagina />} />;
          })}
          <Route path="fuentes" element={<Fuentes />} />
          <Route path="cambios" element={<RegistroCambios />} />
          <Route
            path="diseno"
            element={
              <Suspense
                fallback={
                  <p className="contenedor pagina texto-interfaz" role="status">
                    Cargando…
                  </p>
                }
              >
                <DesignLab />
              </Suspense>
            }
          />
          <Route path="*" element={<NoEncontrada />} />
        </Route>
      </Routes>
    </HashRouter>
  );
}
