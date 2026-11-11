import { Link } from 'react-router-dom';
import { useTituloPagina } from '../app/useTituloPagina';
import { Kicker } from './Kicker';
import { Lead } from './Lead';
import { MarginNote } from './MarginNote';
import './UnderConstruction.css';

interface UnderConstructionProps {
  kicker: string;
  titulo: string;
  resumen: string;
  previsto?: readonly string[];
}

/** Página de sección «en construcción», ya maquetada con el sistema de diseño. */
export function UnderConstruction({
  kicker,
  titulo,
  resumen,
  previsto = [],
}: UnderConstructionProps) {
  useTituloPagina(titulo);
  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{kicker}</Kicker>
          <h1>{titulo}</h1>
          <Lead>{resumen}</Lead>
        </header>
        <p className="estado-seccion">
          <span className="estado-seccion-etiqueta">Estado</span> En construcción
        </p>
        <MarginNote>
          <p>
            Cada cifra que se publique aquí irá acompañada de su fuente, la fecha en que se descargó
            y un nivel de confianza.
          </p>
        </MarginNote>
        {previsto.length > 0 ? (
          <section className="seccion prosa" aria-labelledby="previsto">
            <h2 id="previsto">Qué contendrá esta sección</h2>
            <ul>
              {previsto.map((punto) => (
                <li key={punto}>{punto}</li>
              ))}
            </ul>
          </section>
        ) : null}
        <p className="texto-interfaz">
          <Link to="/" className="enlace-volver">
            Volver al índice
          </Link>
        </p>
      </div>
    </article>
  );
}
