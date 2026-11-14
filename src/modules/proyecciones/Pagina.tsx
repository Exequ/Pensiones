import { lazy, Suspense } from 'react';
import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { Cotizantes } from './Cotizantes';
import { Demografia } from './Demografia';
import { Introduccion } from './Introduccion';
import { Pensiones } from './Pensiones';
import './Proyecciones.css';

const seccion = buscarSeccion('proyecciones');

/**
 * El bloque «Sistema financiero (M4)» (Fase 5-B2) se carga bajo demanda, para no engordar el trozo de
 * la página con la salida de M4 y los datos observados con los que se compara.
 */
const Financiero = lazy(() => import('./Financiero'));

/** Módulo «proyecciones»: salidas de los modelos propios M1 a M4 junto a lo observado. */
export default function Proyecciones() {
  useTituloPagina(seccion.titulo);
  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('proyecciones')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Todo lo que se muestra como proyección es el resultado de un modelo propio con supuestos
            explícitos: no es un dato observado, una predicción ni un pronóstico oficial.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página muestra cálculos con la legislación actual congelada. Describe qué resulta de
          cada supuesto y compara los resultados con lo observado y con otras proyecciones, sin
          valorar las cifras.
        </p>
        <Introduccion />
        <Demografia />
        <Pensiones />
        <Cotizantes />
        <Suspense fallback={<p className="hist-aviso">Cargando el bloque financiero…</p>}>
          <Financiero />
        </Suspense>
        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
