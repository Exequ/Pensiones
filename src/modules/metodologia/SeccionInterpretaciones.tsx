import { DataTable } from '../../components/DataTable';
import { INTERPRETACIONES_PUBLICADAS } from '../../contenido/interpretaciones';
import { etiquetaGrado, GRADOS_INTERPRETACION } from '../../engine/interpretaciones';
import { formatearNumero } from '../../engine/formato';
import { Respaldo } from './Respaldo';
import { tituloApartado } from './apartados';

const ETIQUETA_ESTADO = {
  'pendiente-de-revision': 'Pendiente de revisión',
  revisada: 'Revisada',
  retirada: 'Retirada',
} as const;

/**
 * Apartado «Las cajas «Interpretación»» (fase RI): qué son, sus dos tipos, sus reglas, su grado de
 * confianza (escala provisional) y la lista de interpretaciones publicadas con su estado de revisión,
 * calculada desde los registros (los ejemplos del laboratorio de diseño no se listan).
 */
export function SeccionInterpretaciones() {
  const publicadas = INTERPRETACIONES_PUBLICADAS;
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-interpretaciones"
      aria-labelledby="met-interpretaciones-titulo"
    >
      <h2 id="met-interpretaciones-titulo" tabIndex={-1}>
        {tituloApartado('met-interpretaciones')}
      </h2>
      <p>
        Junto a algunos datos, la web puede mostrar cajas rotuladas «Interpretación» con una lectura
        experta de esos datos. Cada caja va después del gráfico, la tabla o la cifra que interpreta,
        con un marco y un rótulo propios, para que el lector distinga siempre los datos de su
        interpretación. Fuera de las cajas, la web solo muestra datos, definiciones y relaciones
        calculadas.
      </p>

      <h3>Dos tipos</h3>
      <ul>
        <li>
          Del autor: recogen la lectura del autor de la web, actuario. No se firman una a una: la
          autoría consta en esta página.
        </li>
        <li>
          Atribuidas: resumen lo que dice un estudio o informe publicado. Llevan el rótulo
          «Interpretación de», con sus autores y su año; el texto está redactado como atribuido
          («según…») y la publicación se abre en su fuente. Una cifra de la publicación se muestra
          atribuida a ella, con confianza como máximo media, sin que la web verifique las fuentes
          primarias en que se basa. No se citan apuntes de clase, solo publicaciones.
        </li>
      </ul>

      <h3>Qué reglas cumplen</h3>
      <ul>
        <li>
          Si una caja usa un término de valoración, debajo del texto figura su criterio: una
          definición que se puede comprobar con los datos o con la fuente atribuida. Las pruebas
          automáticas lo exigen término a término.
        </li>
        <li>
          Las cifras salen de los datos o del motor, como en el resto de la web; nunca se escriben a
          mano.
        </li>
        <li>
          Sin nombres de partidos, programas electorales, peticiones de voto ni propuestas
          políticas.
        </li>
        <li>
          Las proyecciones van con su hipótesis (legislación congelada o la del estudio) y con su
          rango cuando hay sensibilidades.
        </li>
        <li>
          Cada caja declara los datos que la sostienen, y su fuente se abre como la de un gráfico.
        </li>
      </ul>

      <h3>Grado de confianza</h3>
      <p>
        Cada caja muestra su grado de confianza como una etiqueta neutra. La escala es provisional,
        pendiente de confirmación por la revisión actuarial, y tiene{' '}
        {formatearNumero(GRADOS_INTERPRETACION.length)} niveles:
      </p>
      <ul>
        {GRADOS_INTERPRETACION.map((g) => (
          <li key={g.id}>{etiquetaGrado(g.id)}.</li>
        ))}
      </ul>
      <p>El grado describe en qué se apoya la lectura; no expresa una probabilidad de acierto.</p>

      <h3>Interpretaciones publicadas y su estado de revisión</h3>
      <p>
        Cada interpretación empieza «pendiente de revisión». Su estado se guarda en su registro y se
        lista aquí; no se muestra en cada caja.
      </p>
      {publicadas.length === 0 ? (
        <p>Hoy no hay ninguna interpretación publicada.</p>
      ) : (
        <DataTable
          titulo="Interpretaciones publicadas, con su página y su estado de revisión"
          columnas={[
            { clave: 'titulo', titulo: 'Interpretación' },
            { clave: 'pagina', titulo: 'Página' },
            { clave: 'tipo', titulo: 'Tipo' },
            { clave: 'grado', titulo: 'Grado de confianza' },
            { clave: 'estado', titulo: 'Estado de revisión' },
            { clave: 'fecha', titulo: 'Redactada' },
          ]}
          filas={publicadas.map((r) => ({
            titulo: r.titulo,
            pagina: r.pagina,
            tipo: r.tipo === 'autor' ? 'Del autor' : 'Atribuida',
            grado: etiquetaGrado(r.grado),
            estado: ETIQUETA_ESTADO[r.estadoRevision],
            fecha: r.fechaRedaccion,
          }))}
        />
      )}
      <Respaldo apartado="interpretaciones" />
    </section>
  );
}
