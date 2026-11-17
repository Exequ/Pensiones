import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { catalogo } from './datos-mitos';
import { IndiceAfirmaciones } from './IndiceAfirmaciones';
import { TARJETAS } from './tarjetas';
import './Mitos.css';

const seccion = buscarSeccion('mitos-y-realidades');

/**
 * Módulo «mitos-y-realidades»: para cada afirmación que circula sobre las pensiones, los datos y las
 * definiciones que permiten contrastarla. No emite veredictos: no dice si una afirmación es cierta
 * ni quién tiene razón; muestra qué dicen los datos, con qué definición y qué cambia según ella.
 */
export default function MitosYRealidades() {
  useTituloPagina(seccion.titulo);
  const mitos = catalogo().mitos;

  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('mitos-y-realidades')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada gráfico y cada tabla lleva su fuente, la fecha de descarga y un nivel de confianza.
            Los cálculos propios se señalan como tales y se pueden reproducir con los datos de la
            web.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página no valora las afirmaciones ni toma partido por ninguna postura. Para cada una
          muestra qué dicen los datos, con qué definición y qué cambia si se cambia la definición.
          Las afirmaciones se reproducen tal como circulan y se presentan en el orden del catálogo,
          sin ordenarlas por importancia.
        </p>

        <IndiceAfirmaciones mitos={mitos} />

        {mitos.map((mito, i) => {
          const Tarjeta = TARJETAS[mito.id];
          if (Tarjeta === undefined) {
            throw new Error(`Falta la tarjeta de la afirmación «${mito.id}»`);
          }
          return <Tarjeta key={mito.id} mito={mito} indice={i} total={mitos.length} />;
        })}

        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
