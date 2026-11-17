import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { APARTADOS_INDICE } from './apartados';
import { Indice } from './Indice';
import './Metodologia.css';
import { SeccionComprobaciones } from './SeccionComprobaciones';
import { SeccionConfianza } from './SeccionConfianza';
import { SeccionDatos } from './SeccionDatos';
import { SeccionLecturas } from './SeccionLecturas';
import { SeccionLimites } from './SeccionLimites';
import { SeccionModelos } from './SeccionModelos';
import { SeccionNeutralidad } from './SeccionNeutralidad';
import { SeccionReproducir } from './SeccionReproducir';

const seccion = buscarSeccion('metodologia');

/**
 * Módulo «metodologia»: cómo se construye la web. Describe el método y su estado; no defiende los
 * resultados de la web ni los de ningún modelo. Los recuentos se calculan al compilar desde los
 * ficheros del repositorio (`src/engine/metodologia.ts`).
 */
export default function Metodologia() {
  useTituloPagina(seccion.titulo);
  return (
    <article className="contenedor pagina met-pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('metodologia')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada apartado termina con los ficheros del repositorio donde consta lo que afirma. Los
            recuentos no están escritos a mano: se calculan al compilar la web desde esos ficheros.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página describe cómo se hace la web y en qué estado está su revisión. No defiende los
          resultados de la web ni los de ningún modelo.
        </p>
        <Indice entradas={APARTADOS_INDICE} />
        <SeccionDatos />
        <SeccionComprobaciones />
        <SeccionConfianza />
        <SeccionLecturas />
        <SeccionModelos />
        <SeccionNeutralidad />
        <SeccionLimites />
        <SeccionReproducir />
        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
