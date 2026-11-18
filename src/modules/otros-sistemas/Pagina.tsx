import { useState } from 'react';
import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import './OtrosSistemas.css';
import { SELECCION_INICIAL } from './paises';
import { SeccionEdad } from './SeccionEdad';
import { SeccionEstructura } from './SeccionEstructura';
import { SeccionGasto } from './SeccionGasto';
import { SeccionReposicion } from './SeccionReposicion';
import { SelectorPaises } from './SelectorPaises';

const seccion = buscarSeccion('otros-sistemas');

/**
 * Módulo «otros-sistemas»: comparativa internacional del gasto en pensiones, la edad de jubilación,
 * la tasa de reposición teórica y la estructura de los sistemas. La selección de países es común a
 * todas las secciones de la página.
 */
export default function OtrosSistemas() {
  useTituloPagina(seccion.titulo);
  const [seleccion, setSeleccion] = useState<ReadonlySet<string>>(() => new Set(SELECCION_INICIAL));

  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('otros-sistemas')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada gráfico lleva su tabla de datos y su fuente. Las dos medidas de cada magnitud se
            muestran lado a lado.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página compara datos publicados por la OCDE, Eurostat y la Comisión Europea. Ordena
          los países por la medida que se muestra, sin valorar qué sistema es mejor o peor, y no
          contiene proyecciones propias.
        </p>

        <section className="seccion prosa sistemas-seccion" aria-labelledby="comparar">
          <h2 id="comparar">Qué países se comparan y por qué no son directamente comparables</h2>
          <p>
            Elige los países que quieres ver; la selección se aplica a todos los gráficos de la
            página. España va siempre en el color de resaltado. Las medias de la OCDE y de la Unión
            Europea son agregados de las propias fuentes.
          </p>
          <SelectorPaises seleccion={seleccion} onCambio={setSeleccion} />
          <p>
            Los países no son directamente comparables por tres razones, que se repiten en cada
            gráfico. Primera, cada fuente delimita lo que mide de forma distinta: qué prestaciones y
            regímenes entran en el gasto, o qué persona modela una tasa de reposición. Segunda, los
            sistemas combinan elementos de reparto, de capitalización y de cuentas nocionales con
            reglas de cálculo distintas. Tercera, las poblaciones y las economías difieren, y los
            cocientes sobre el PIB cambian con el numerador y con el denominador. Cuando una medida
            tiene dos versiones, se muestran las dos.
          </p>
        </section>

        <SeccionGasto seleccion={seleccion} />
        <SeccionEdad seleccion={seleccion} />
        <SeccionReposicion seleccion={seleccion} />
        <SeccionEstructura seleccion={seleccion} />

        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
