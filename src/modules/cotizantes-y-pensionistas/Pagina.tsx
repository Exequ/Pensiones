import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { AltasBajas } from './AltasBajas';
import { Evolucion } from './Evolucion';
import { Relacion } from './Relacion';
import { Situacion } from './Situacion';

const seccion = buscarSeccion('cotizantes-y-pensionistas');

/** Módulo «cotizantes-y-pensionistas»: evolución histórica y situación actual. */
export default function CotizantesYPensionistas() {
  useTituloPagina(seccion.titulo);
  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('cotizantes-y-pensionistas')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada gráfico lleva su tabla de datos, su fuente, la fecha de descarga y un nivel de
            confianza. Los datos derivados (cocientes, índices) se señalan como tales.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página describe datos publicados: qué se mide, cómo ha evolucionado y qué
          definiciones existen. No contiene proyecciones ni valora las cifras.
        </p>
        <Evolucion />
        <Relacion />
        <Situacion />
        <AltasBajas />
        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
