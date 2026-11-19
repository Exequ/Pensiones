import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { formatearNumero } from '../../engine/formato';
import { EnlaceFichero, Respaldo } from './Respaldo';
import { TEXTOS_MODELOS } from './modelos';
import { recuentos } from './recuentos';
import { tituloApartado } from './apartados';

/** Apartado «Los modelos de proyección». */
export function SeccionModelos() {
  const { modelos } = recuentos;
  const conSalidas = modelos.filter((m) => m.ficheros > 0);
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-modelos"
      aria-labelledby="met-modelos-titulo"
    >
      <h2 id="met-modelos-titulo" tabIndex={-1}>
        {tituloApartado('met-modelos')}
      </h2>
      <p>
        Los modelos son programas propios, escritos en Python, que ejecuta el autor en local: no
        forman parte de la web ni de su integración continua. Hay {formatearNumero(modelos.length)}{' '}
        descritos en el repositorio ({modelos[0]?.modelo} a {modelos[modelos.length - 1]?.modelo}).
        La web publica las salidas de {formatearNumero(conSalidas.length)} de ellos, con su fecha de
        ejecución, su escenario y su confianza. Los demás tienen descripción y código, pero ninguna
        salida en /data.
      </p>
      <p>
        «Legislación congelada» significa que se mantienen las normas vigentes y no se supone
        ninguna reforma futura. Por eso las salidas son proyecciones de modelo, con supuestos
        explícitos, y no previsiones. Se ven en <Link to="/proyecciones">Proyecciones</Link>. Esta
        página describe cómo están hechos los modelos; no defiende sus resultados.
      </p>
      <DataTable
        titulo="Salidas de los modelos en /data/proyecciones"
        columnas={[
          { clave: 'modelo', titulo: 'Modelo' },
          { clave: 'ficheros', titulo: 'Ficheros', tipo: 'numero' },
          { clave: 'confianza', titulo: 'Confianza' },
          { clave: 'ejecutado', titulo: 'Ejecución' },
          { clave: 'legislacion', titulo: 'Legislación congelada' },
        ]}
        filas={modelos.map((m) => ({
          modelo: m.titulo,
          ficheros: m.ficheros,
          confianza: m.confianza ?? 'Sin metadatos',
          ejecutado: m.ejecutadoEl,
          legislacion: m.ficheros === 0 ? null : m.legislacionCongelada ? 'Sí' : 'No',
        }))}
      />
      <p>
        El nivel de confianza de las salidas es una decisión del autor que debe confirmar el
        actuario (queda anotada como pendiente).
      </p>

      {modelos.map((m) => {
        const t = TEXTOS_MODELOS[m.modelo];
        if (t === undefined) return null;
        const id = `met-modelo-${m.modelo.toLowerCase()}`;
        return (
          <article key={m.modelo} className="met-modelo" aria-labelledby={`${id}-titulo`}>
            <h3 id={`${id}-titulo`}>{m.titulo}</h3>
            <h4>Qué responde</h4>
            <p>{t.responde}</p>
            <h4>Hipótesis</h4>
            <ul>
              {t.hipotesis.map((h) => (
                <li key={h}>{h}</li>
              ))}
            </ul>
            <h4>Fiabilidad indicada</h4>
            <p>{t.fiabilidad}</p>
            <p>
              {m.ficheros > 0
                ? `Confianza de sus ficheros en /data: ${m.confianza ?? 'no uniforme'} (${formatearNumero(m.ficheros)} ficheros, ejecutado el ${m.ejecutadoEl ?? 'sin fecha'}).`
                : 'Sin ficheros ni metadatos de confianza en /data.'}
            </p>
            <h4>Límites</h4>
            <ul>
              {t.limites.map((l) => (
                <li key={l}>{l}</li>
              ))}
            </ul>
            <p className="met-modelo-descripcion">
              Descripción completa:{' '}
              <EnlaceFichero fichero={`docs/modelos/${m.modelo}_descripcion.md`} />
            </p>
          </article>
        );
      })}
      <Respaldo apartado="modelos" />
    </section>
  );
}
