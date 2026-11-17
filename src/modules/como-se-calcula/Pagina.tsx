import { useTituloPagina } from '../../app/useTituloPagina';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import './ComoSeCalcula.css';
import { ESQUEMAS } from './esquemas';
import { IndiceSecciones } from './IndiceSecciones';
import { SeccionPrestacion } from './SeccionPrestacion';
import { Terminos } from './Terminos';

const seccion = buscarSeccion('como-se-calcula');

/**
 * Módulo «como-se-calcula»: para cada prestación (jubilación, incapacidad permanente, viudedad y
 * orfandad), qué entra, qué reglas se aplican y en qué orden, con qué parámetros y con qué lecturas
 * dudosas, con ejemplos que calcula el motor. No cambia el motor ni «Tu pensión».
 */
export default function ComoSeCalcula() {
  useTituloPagina(seccion.titulo);
  return (
    <article className="contenedor pagina como-pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('como-se-calcula')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada paso cita el artículo de la norma, y cada parámetro lleva su fuente, la fecha de
            descarga y un nivel de confianza. Los ejemplos son supuestos ilustrativos y sus
            resultados los calcula el motor de la web.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página explica cómo funciona la norma; no valora si es adecuada ni recomienda ninguna
          decisión personal. Para estimar un caso propio, está «Tu pensión».
        </p>
        <IndiceSecciones />
        <Terminos />
        {ESQUEMAS.map((e) => (
          <SeccionPrestacion key={e.id} esquema={e} />
        ))}
        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
