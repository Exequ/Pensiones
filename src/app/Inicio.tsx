import { Link } from 'react-router-dom';
import { Kicker } from '../components/Kicker';
import { Lead } from '../components/Lead';
import { MarginNote } from '../components/MarginNote';
import { GRUPOS_NAVEGACION } from '../modules/navegacion';
import { SECCIONES, type Seccion } from '../modules/secciones';
import { useTituloPagina } from './useTituloPagina';
import './Inicio.css';

/**
 * Secciones de cada grupo del menú, en su orden (los grupos salen de `GRUPOS_NAVEGACION`). Las
 * páginas generales («Fuentes», «Registro de cambios») no tienen resumen y van en el pie.
 */
const GRUPOS_INDICE = GRUPOS_NAVEGACION.map((grupo) => ({
  grupo,
  secciones: grupo.enlaces.flatMap((e): Seccion[] => {
    const seccion = SECCIONES.find((s) => s.slug === e.slug);
    return seccion ? [seccion] : [];
  }),
})).filter((g) => g.secciones.length > 0);

/** Portada: presentación e índice de secciones, agrupado como el menú. */
export function Inicio() {
  useTituloPagina();
  return (
    <div className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>Guía con datos</Kicker>
          <h1>El sistema de pensiones español, explicado con datos</h1>
          <Lead>
            Qué pensiones existen, cómo se calcula cada una, cómo se financia el sistema y qué dicen
            las estadísticas oficiales sobre su evolución. Cada cifra enlaza a su fuente e indica
            cuándo se consultó.
          </Lead>
        </header>
        <MarginNote etiqueta="Sobre esta web">
          <p>
            Proyecto divulgativo independiente, en desarrollo. Las secciones se publicarán por fases
            y los datos se revisarán antes de darse por definitivos.
          </p>
        </MarginNote>
      </div>

      <section className="seccion" aria-labelledby="titulo-indice">
        <h2 id="titulo-indice" className="indice-titulo">
          Índice
        </h2>
        <div className="indice-grupos">
          {GRUPOS_INDICE.map(({ grupo, secciones }) => {
            const idGrupo = `indice-grupo-${grupo.id}`;
            return (
              <div key={grupo.id} className="indice-grupo">
                {grupo.directo ? null : (
                  <p id={idGrupo} className="indice-grupo-titulo">
                    {grupo.titulo}
                  </p>
                )}
                <ol className="indice" {...(grupo.directo ? {} : { 'aria-labelledby': idGrupo })}>
                  {secciones.map((seccion) => (
                    <li key={seccion.slug} className="indice-elemento">
                      <h3 className="indice-seccion">
                        <Link to={`/${seccion.slug}`}>{seccion.titulo}</Link>
                      </h3>
                      <p className="indice-resumen">{seccion.resumen}</p>
                    </li>
                  ))}
                </ol>
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
