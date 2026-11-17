import { useMemo } from 'react';
import { useTituloPagina } from '../../app/useTituloPagina';
import { Definition } from '../../components/Definition';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { formatearNumero } from '../../engine/formato';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { reformas } from './datos-reformas';
import { FichaReforma } from './FichaReforma';
import { GraficosParametros } from './GraficosParametros';
import { LineaDelTiempo } from './LineaDelTiempo';
import './Reformas.css';

const seccion = buscarSeccion('reformas');

/**
 * Módulo «reformas»: cronología de las normas que han modificado los parámetros de las pensiones
 * contributivas, de las que hay texto o cita literal en /data. Cada norma tiene una ficha con la
 * misma estructura. La página describe qué cambió, cuándo y sobre qué parámetro; no valora ninguna
 * norma ni les atribuye efectos.
 */
export default function Reformas() {
  useTituloPagina(seccion.titulo);
  const fichas = useMemo(() => reformas(), []);
  const conTexto = fichas.filter((r) => r.norma.textoDescargado !== undefined).length;
  const conVigor = fichas.filter((r) => r.entradaEnVigor !== null).length;
  return (
    <article className="contenedor pagina ref-pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('reformas')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada ficha cita el artículo o la disposición de la norma, con su texto literal, y cada
            valor lleva su fuente, la fecha de descarga y un nivel de confianza.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página describe qué cambió cada norma, cuándo y sobre qué parámetro. No valora
          ninguna norma ni atribuye intenciones o efectos que no consten en la norma o en un dato
          consultado.
        </p>

        <section className="seccion prosa ref-alcance" aria-labelledby="ref-alcance-titulo">
          <h2 id="ref-alcance-titulo" tabIndex={-1}>
            Qué recoge la cronología
          </h2>
          <p>
            La cronología reúne las normas de las que hay texto o cita literal en las fuentes
            consultadas: {formatearNumero(fichas.length)} normas, de las que{' '}
            {formatearNumero(conTexto)} tienen su texto completo y {formatearNumero(conVigor)}{' '}
            tienen una fecha de entrada en vigor respaldada por un texto o un dato. No es un listado
            exhaustivo: puede haber otras normas que modificaran estos parámetros y que no figuran
            porque su texto no consta en las fuentes consultadas.
          </p>
          <p>
            El orden es cronológico, por fecha de aprobación, y no indica importancia. Todas las
            fichas tienen los mismos apartados y el mismo nivel de detalle.
          </p>
          <div className="ref-definiciones">
            <Definition termino="Aprobación y publicación">
              La fecha de aprobación es la de la norma; la de publicación, la del día en que aparece
              en el Boletín Oficial del Estado.
            </Definition>
            <Definition termino="Entrada en vigor">
              Día desde el que la norma es aplicable, según su disposición final o los metadatos del
              BOE. Si no consta en las fuentes consultadas, la ficha lo dice y no se calcula.
            </Definition>
            <Definition termino="Parámetro">
              Cifra o regla que fija una norma y que usa el cálculo de una pensión, como el periodo
              de cálculo de la base reguladora o la edad ordinaria de jubilación.
            </Definition>
            <Definition termino="Calendario de aplicación">
              Cuando una norma no aplica el cambio de golpe, la sucesión de valores por año que
              fija. La tabla recoge los años con dato.
            </Definition>
          </div>
        </section>

        <LineaDelTiempo reformas={fichas} />

        {fichas.map((r) => (
          <FichaReforma key={r.id} reforma={r} />
        ))}

        <section
          className="seccion prosa ref-graficos-seccion"
          aria-labelledby="ref-graficos-titulo"
        >
          <h2 id="ref-graficos-titulo" tabIndex={-1}>
            Parámetros a lo largo del tiempo
          </h2>
          <p>
            Parámetros cuyo valor cambia con el calendario de las normas de las fichas, con los
            mismos datos que muestran las tablas.
          </p>
          <GraficosParametros />
        </section>

        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
