import { formatearNumero } from '../../engine/formato';
import { recuentos } from './recuentos';
import { REPOSITORIO } from './respaldo';
import { Respaldo } from './Respaldo';
import { tituloApartado } from './apartados';

/** Apartado «Cómo reproducirlo». */
export function SeccionReproducir() {
  const { reproduccion, etl } = recuentos;
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-reproducir"
      aria-labelledby="met-reproducir-titulo"
    >
      <h2 id="met-reproducir-titulo" tabIndex={-1}>
        {tituloApartado('met-reproducir')}
      </h2>
      <p>
        El código, los datos y la documentación están en el{' '}
        <a href={REPOSITORIO} rel="noopener noreferrer">
          repositorio del proyecto
        </a>
        .{reproduccion.node !== null ? ` Requiere Node.js ${reproduccion.node} o posterior.` : ''}
      </p>
      <p>
        La web se ha desarrollado con ayuda de un asistente de inteligencia artificial (Claude Code,
        de Anthropic). Ese asistente ejecutó las sensibilidades del modelo financiero del sistema
        con el código de los modelos del repositorio, no el autor en local.
      </p>
      <h3>Comprobar el repositorio</h3>
      <p>Estos son los comandos de las reglas del proyecto, con su descripción:</p>
      <ul className="met-comandos">
        {reproduccion.comandos.map((c) => (
          <li key={c.comando}>
            <code>{c.comando}</code> <span>{c.comentario}</span>
          </li>
        ))}
      </ul>
      <h3>Regenerar los datos</h3>
      <p>
        Los scripts de extracción ({formatearNumero(etl.ficheros)} en la carpeta de extracción) se
        ejecutan desde la raíz del repositorio con Python en modo aislado y leen los documentos ya
        descargados. Los documentos brutos de hasta cinco megabytes están en el repositorio; los
        mayores no se versionan y se localizan por su dirección y su huella.
      </p>
      <p>
        El registro de fuentes y de afirmaciones se regenera con los comandos siguientes. La
        regeneración es reproducible: ejecutada dos veces da la misma salida, que coincide con lo
        versionado, y una prueba automática lo comprueba.
      </p>
      <div
        className="met-bloque"
        role="region"
        aria-label="Comandos para regenerar el registro de fuentes y de afirmaciones"
        tabIndex={0}
      >
        <pre>
          <code>{reproduccion.regenerarFuentes.join('\n')}</code>
        </pre>
      </div>
      {reproduccion.regenerarModelos !== null && (
        <p>
          Las salidas de los modelos que publica la web se regeneran con{' '}
          <code>{reproduccion.regenerarModelos}</code>, a partir de los resultados que ejecuta el
          autor en local.
        </p>
      )}
      <h3>Ejecutar los modelos</h3>
      <p>Los modelos se ejecutan en local, desde la carpeta de cada uno, con estos comandos:</p>
      <div
        className="met-bloque"
        role="region"
        aria-label="Comandos para ejecutar los modelos"
        tabIndex={0}
      >
        <pre>
          <code>{reproduccion.ejecutarModelos.join('\n')}</code>
        </pre>
      </div>
      <Respaldo apartado="reproducir" />
    </section>
  );
}
