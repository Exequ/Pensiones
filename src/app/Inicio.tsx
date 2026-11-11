import { Link } from 'react-router-dom';
import { Kicker } from '../components/Kicker';
import { Lead } from '../components/Lead';
import { MarginNote } from '../components/MarginNote';
import { SECCIONES } from '../modules/secciones';
import { useTituloPagina } from './useTituloPagina';
import './Inicio.css';

/** Portada: presentación e índice de secciones. */
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
            cuándo se descargó.
          </Lead>
        </header>
        <MarginNote etiqueta="Sobre esta web">
          <p>
            Proyecto divulgativo independiente, en desarrollo. Las secciones se publicarán por fases
            y los datos pasarán una revisión actuarial antes de darse por definitivos.
          </p>
        </MarginNote>
      </div>

      <section className="seccion" aria-labelledby="titulo-indice">
        <h2 id="titulo-indice" className="indice-titulo">
          Índice
        </h2>
        <ol className="indice">
          {SECCIONES.map((seccion) => (
            <li key={seccion.slug} className="indice-elemento">
              <h3 className="indice-seccion">
                <Link to={`/${seccion.slug}`}>{seccion.titulo}</Link>
              </h3>
              <p className="indice-resumen">{seccion.resumen}</p>
            </li>
          ))}
        </ol>
      </section>
    </div>
  );
}
