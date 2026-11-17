import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { formatearNumero } from '../../engine/formato';
import { recuentos } from './recuentos';
import { Respaldo } from './Respaldo';

/** Apartado «Qué significa la confianza y la revisión actuarial». */
export function SeccionConfianza() {
  const { afirmaciones, tandas, lecturas } = recuentos;
  const t3 = tandas.tanda3;
  const referenciaUnica = tandas.gruposRevisados.filter((g) => !g.referencia.startsWith('Tanda'));
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-confianza"
      aria-labelledby="met-confianza-titulo"
    >
      <h2 id="met-confianza-titulo" tabIndex={-1}>
        Qué significa la confianza y la revisión actuarial
      </h2>
      <p>
        Hay dos niveles de control distintos: la confianza de la fuente de cada dato y la revisión
        actuarial de las afirmaciones y de las reglas de cálculo. No son lo mismo y se muestran por
        separado.
      </p>

      <h3>Confianza de la fuente</h3>
      <Definition termino="Confianza (alta, media o baja)">
        Nivel que acompaña a cada dato y mide la fiabilidad de su fuente. No hay una definición
        general escrita de cada nivel: el criterio aplicado consta junto a cada decisión, y la falta
        de una definición única queda anotada como pendiente.
      </Definition>
      <p>Los criterios que constan en la documentación del proyecto son estos:</p>
      <ul>
        <li>
          Los datos que calcula el propio proyecto a partir de otros (medias anuales, cocientes) se
          marcan con confianza «media», con el cálculo en sus notas.
        </li>
        <li>
          Los textos obtenidos por reconocimiento de caracteres se marcan con confianza «media».
        </li>
        <li>
          Las salidas de un modelo llevan confianza «media» si su descripción documenta
          comprobaciones (un contraste externo y pruebas) y «baja» si es una versión preliminar
          según su propia descripción. Es una decisión del autor que debe confirmar el actuario.
        </li>
      </ul>

      <h3>Estado de cada afirmación</h3>
      <p>
        Las afirmaciones de los textos de la web y de los datos se registran una a una, con su
        fuente. Una afirmación queda «verificada» si la confianza de su fuente es alta; si no, queda
        «pendiente». Es un estado de la fuente, distinto de la revisión actuarial.
      </p>
      <DataTable
        titulo="Afirmaciones registradas por estado de la fuente"
        columnas={[
          { clave: 'estado', titulo: 'Estado' },
          { clave: 'afirmaciones', titulo: 'Afirmaciones', tipo: 'numero' },
        ]}
        filas={[
          { estado: 'Verificada', afirmaciones: afirmaciones.estado.verificada },
          { estado: 'Pendiente', afirmaciones: afirmaciones.estado.pendiente },
          { estado: 'Retirada', afirmaciones: afirmaciones.estado.retirada },
          { estado: 'Total registradas', afirmaciones: afirmaciones.total },
        ]}
      />

      <h3>Revisión actuarial</h3>
      <Definition termino="Revisión actuarial">
        Lectura de una afirmación o de una regla de cálculo por un revisor con criterio actuarial.
        Se pide cuando la afirmación no es la transcripción literal de una norma o de una cifra
        publicada.
      </Definition>
      <p>
        Cada afirmación tiene uno de estos estados de revisión: «no requiere revisión», «revisada»
        (con la referencia a la respuesta que la respalda), «rechazada» o «pendiente» (con la
        pregunta que falta por responder). La revisión es una opinión experta, no una fuente: una
        corrección solo se aplica si se comprueba en un documento descargado o recalculando desde
        /data.
      </p>
      <DataTable
        titulo="Afirmaciones registradas por estado de revisión actuarial"
        columnas={[
          { clave: 'estado', titulo: 'Revisión actuarial' },
          { clave: 'afirmaciones', titulo: 'Afirmaciones', tipo: 'numero' },
        ]}
        filas={[
          { estado: 'No requiere revisión', afirmaciones: afirmaciones.revision.noRequiere },
          { estado: 'Revisada', afirmaciones: afirmaciones.revision.revisada },
          { estado: 'Rechazada', afirmaciones: afirmaciones.revision.rechazada },
          { estado: 'Pendiente', afirmaciones: afirmaciones.revision.pendiente },
        ]}
      />

      <h3>Calendario y estado de cada tanda</h3>
      <p>
        Una tanda es una ronda de preguntas al revisor y de respuestas que se incorporan al
        registro. La documentación del repositorio recoge{' '}
        {referenciaUnica.map((g) => `«${g.referencia}»`).join(' y ')} y la tercera tanda
        {t3.fecha !== null ? ` (respuestas del ${t3.fecha})` : ''}; no identifica con ese nombre una
        primera y una segunda tanda, y esa falta queda anotada como pendiente.
      </p>
      <DataTable
        titulo="Afirmaciones revisadas, según la referencia de su respuesta"
        columnas={[
          { clave: 'referencia', titulo: 'Referencia de la respuesta' },
          { clave: 'afirmaciones', titulo: 'Afirmaciones revisadas', tipo: 'numero' },
        ]}
        filas={tandas.gruposRevisados.map((g) => ({
          referencia: g.referencia,
          afirmaciones: g.afirmaciones,
        }))}
      />
      <DataTable
        titulo="Tercera tanda: preguntas por parte y estado final"
        columnas={[
          { clave: 'parte', titulo: 'Parte' },
          { clave: 'revisadas', titulo: 'Preguntas revisadas', tipo: 'numero' },
          { clave: 'pendientes', titulo: 'Preguntas con parte pendiente', tipo: 'numero' },
          { clave: 'afirmaciones', titulo: 'Afirmaciones revisadas', tipo: 'numero' },
        ]}
        filas={t3.partes.map((p) => ({
          parte: p.parte,
          revisadas: p.preguntasRevisadas,
          pendientes: p.preguntasPendientes,
          afirmaciones: p.afirmacionesRevisadas,
        }))}
        pie={
          <>
            La tercera tanda tiene {formatearNumero(t3.preguntas)} preguntas, con{' '}
            {formatearNumero(t3.filasRevisadas)} filas revisadas y{' '}
            {formatearNumero(t3.filasPendientes)} pendientes en su tabla de aplicación.
            {t3.preguntasSeparadas > 0
              ? ` ${formatearNumero(t3.preguntasSeparadas)} ${t3.preguntasSeparadas === 1 ? 'pregunta se separó' : 'preguntas se separaron'} en dos afirmaciones, una revisada y otra pendiente, y figura en las dos columnas.`
              : ''}{' '}
            Una pregunta puede afectar a más de una afirmación, por eso el total de afirmaciones es
            mayor.
          </>
        }
      />
      <p>
        El calendario de decisiones sobre las lecturas del motor ({formatearNumero(lecturas.total)}{' '}
        lecturas) se ve por la fecha de su último cambio de estado:
      </p>
      <DataTable
        titulo="Lecturas del motor por fecha de su último cambio de estado"
        columnas={[
          { clave: 'fecha', titulo: 'Fecha' },
          { clave: 'lecturas', titulo: 'Lecturas', tipo: 'numero' },
        ]}
        filas={lecturas.porFecha.map((f) => ({ fecha: f.fecha, lecturas: f.lecturas }))}
      />

      <h3>Afirmaciones con revisión pendiente</h3>
      <p>
        Hoy hay {formatearNumero(afirmaciones.revision.pendiente)} afirmaciones con la revisión
        pendiente:{' '}
        {formatearNumero(
          afirmaciones.revision.pendiente - afirmaciones.pendientesPosterioresATanda3,
        )}{' '}
        corresponden a preguntas de la tercera tanda sin cerrar y{' '}
        {formatearNumero(afirmaciones.pendientesPosterioresATanda3)} se añadieron con posterioridad.
        Se listan todas, una a una y con su pregunta; las pruebas automáticas fijan un tope de
        pendientes y no admiten agruparlas. Las lecturas pendientes del motor se ven en el apartado{' '}
        <a
          href="#met-lecturas"
          onClick={(e) => {
            e.preventDefault();
            const titulo = document.getElementById('met-lecturas-titulo');
            titulo?.scrollIntoView();
            titulo?.focus({ preventScroll: true });
          }}
        >
          Lecturas del motor
        </a>
        .
      </p>
      <DataTable
        titulo="Afirmaciones con revisión actuarial pendiente"
        columnas={[
          { clave: 'id', titulo: 'Afirmación' },
          { clave: 'ubicacion', titulo: 'Dónde aparece' },
          { clave: 'origen', titulo: 'Origen' },
          { clave: 'pregunta', titulo: 'Pregunta pendiente' },
        ]}
        filas={afirmaciones.pendientes.map((p) => ({
          id: p.id,
          ubicacion: p.ubicacion,
          origen: p.posteriorATanda3 ? 'Posterior a la tercera tanda' : 'Tercera tanda',
          pregunta: p.pregunta,
        }))}
      />
      <p className="texto-interfaz">
        Las decisiones sobre las lecturas y su motivo constan en la documentación del repositorio.{' '}
        <Link to="/como-se-calcula">Cómo se calcula</Link> muestra las lecturas que influyen en cada
        prestación.
      </p>
      <Respaldo apartado="confianza" />
    </section>
  );
}
