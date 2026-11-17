import { useTituloPagina } from '../../app/useTituloPagina';
import { DataTable } from '../../components/DataTable';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { SourceLine } from '../../components/SourceLine';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import { fechaEnTexto } from './cuantias';
import { datosTipos } from './datos-tipos';
import { FichaPrestacion } from './FichaPrestacion';
import { SeccionComplementos } from './SeccionComplementos';
import './TiposDePension.css';

const seccion = buscarSeccion('tipos-de-pension');

/**
 * Módulo «tipos-de-pension»: una ficha por prestación (qué es, quién puede cobrarla, requisitos con
 * su norma, cuantías mínimas y máximas vigentes y cuántas hay). Los textos normativos y las cifras
 * proceden de /data; la página no los escribe.
 */
export default function TiposDePension() {
  useTituloPagina(seccion.titulo);
  const d = datosTipos();

  const filasResumen = d.fichas.map((f) => {
    const principal = f.enVigor[0];
    return {
      prestacion: f.config.titulo,
      modalidad: f.config.modalidad === 'contributiva' ? 'Contributiva' : 'No contributiva',
      numero: principal?.numero ?? null,
      media: principal?.media ?? null,
      fecha: fechaEnTexto(f.fechaVigor, f.config.clase !== null),
    };
  });

  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('tipos-de-pension')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Los requisitos, los artículos y las cuantías son los que figuran en las normas
            descargadas; cada ficha lleva su fuente, la fecha de descarga y un nivel de confianza.
            Los importes por paga son un cálculo derivado.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página describe lo que dice la norma y cuántas pensiones hay; no valora si las
          cuantías son suficientes ni calcula la pensión de nadie. Para estimar una pensión de
          jubilación o de incapacidad permanente, está «Tu pensión».
        </p>

        <section className="seccion prosa" aria-labelledby="panorama">
          <h2 id="panorama">Cuántas pensiones hay de cada tipo</h2>
          <p>
            Las contributivas se cuentan en diciembre del último año publicado y las no
            contributivas, en la nómina del último mes de la fuente. Los dos recuentos son de
            pensiones, no de personas, y vienen de fuentes distintas: la pensión media de las
            contributivas es la que publica la Seguridad Social y la de las no contributivas es el
            importe bruto de la nómina entre el número de pensiones.
          </p>
          <DataTable
            titulo="Pensiones en vigor y pensión media de cada prestación"
            columnas={[
              { clave: 'prestacion', titulo: 'Prestación' },
              { clave: 'modalidad', titulo: 'Modalidad' },
              { clave: 'numero', titulo: 'Pensiones', tipo: 'numero', decimales: 0 },
              { clave: 'media', titulo: 'Pensión media al mes', tipo: 'euros', decimales: 2 },
              { clave: 'fecha', titulo: 'Fecha' },
            ]}
            filas={filasResumen}
            pie="Cuántas pensiones hay no dice cuántas personas las cobran ni cuál es la cuantía de una pensión nueva: la media incluye pensiones de todas las fechas de alta."
          />
          <SourceLine datos={d.fichas.flatMap((f) => (f.enVigor[0] ? [f.enVigor[0].dato] : []))} />
        </section>

        <section className="seccion prosa" aria-labelledby="fichas">
          <h2 id="fichas">Las prestaciones, una a una</h2>
          <p>
            Cada ficha resume qué es la prestación, quién puede cobrarla y qué exige, con el
            artículo de la norma y el enlace al texto del BOE en la línea de fuente. Las cuantías
            mínimas y máximas son las vigentes en {d.anioCuantias}.
          </p>
          {d.fichas.map((f) => (
            <FichaPrestacion key={f.config.id} ficha={f} />
          ))}
        </section>

        <SeccionComplementos />

        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
