import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { formatearFechaIso, formatearPorcentaje } from '../../engine/formato';
import { datosProyecciones } from './datos-proyecciones';
import { APARTADOS } from './apartados';

/** Escenario de referencia, leído de los metadatos de las salidas de los modelos. */
function escenarioDeReferencia() {
  const { archivo } = datosProyecciones().m3.resumen;
  return {
    g: archivo.escenario.g,
    ipc: archivo.escenario.ipc,
    legislacion: archivo.escenario.legislacion,
    ejecutadoEl: archivo.origen.ejecutadoEl,
    commit: archivo.origen.commitModelos,
  };
}

/** Introducción: qué es y qué no es una proyección de esta página, y el escenario de referencia. */
export function Introduccion() {
  const d = datosProyecciones();
  const esc = escenarioDeReferencia();
  const fichas = [d.m1.contraste, d.m2.cotizantes, d.m3.resumen].map((t) => ({
    modelo: t.archivo.modelo.nombre,
    aplicacion: t.archivo.escenario.aplicacion,
  }));
  const filas = [
    {
      parametro: 'Crecimiento real de los salarios (g)',
      valor: formatearPorcentaje(esc.g, { maxDecimales: 2 }),
    },
    { parametro: 'IPC anual supuesto', valor: formatearPorcentaje(esc.ipc, { maxDecimales: 2 }) },
    { parametro: 'Legislación', valor: 'Congelada: la vigente, sin reformas futuras' },
    { parametro: 'Ejecución de los modelos', valor: formatearFechaIso(esc.ejecutadoEl) },
    { parametro: 'Versión del código de los modelos', valor: esc.commit.slice(0, 7) },
  ];
  return (
    <section className="seccion prosa" aria-labelledby={APARTADOS.queEs.destino}>
      <h2 id={APARTADOS.queEs.destino} tabIndex={-1}>
        {APARTADOS.queEs.titulo}
      </h2>
      <p>
        Las cifras proyectadas de esta página salen de modelos propios que calculan qué ocurriría si
        se mantuvieran unos supuestos explícitos, con la legislación actual congelada: se supone que
        no habrá reformas y que cada grupo de personas se comporta como en el último año observado.
        Un modelo no observa el futuro: aplica sus supuestos a los datos de partida y devuelve el
        resultado.
      </p>
      <p>
        No es una predicción ni un pronóstico oficial, y ninguna de las cifras es un dato observado.
        Cambiar un supuesto cambia el resultado: por eso cada gráfico indica qué supone, qué mide y
        qué no dice, y cada modelo tiene un apartado que explica cómo funciona.
      </p>
      <h3 id="proy-escenario">Escenario de referencia</h3>
      <p>
        Todos los modelos se ejecutaron con el mismo escenario. Salvo la demografía, de la que se
        muestran varios escenarios, solo se presenta este.
      </p>
      <DataTable
        titulo="Escenario de referencia de las salidas de los modelos"
        columnas={[
          { clave: 'parametro', titulo: 'Supuesto o dato' },
          { clave: 'valor', titulo: 'Valor' },
        ]}
        filas={filas}
      />
      <ul className="hist-estado-lista">
        {fichas.map((f) => (
          <li key={f.modelo}>
            <strong>{f.modelo}:</strong> {f.aplicacion}
          </li>
        ))}
      </ul>
      <h3 id="proy-distinguir">Cómo distinguir lo observado de lo proyectado</h3>
      <ul className="hist-estado-lista">
        <li>Los datos observados se dibujan con línea continua.</li>
        <li>
          Las proyecciones se dibujan con trazo discontinuo, desde una regla vertical rotulada
          «Proyección», y su fuente indica que son una proyección de modelo propio (o una proyección
          publicada por una institución).
        </li>
        <li>
          Lo posterior al horizonte de presentación de la demografía se dibuja con trazo punteado,
          sobre fondo sombreado, y se rotula «ilustrativo».
        </li>
        <li>
          Las tablas de datos indican en cada fila si el año es observado o proyectado, y los
          indicadores de confianza de las fuentes son los de cada dato.
        </li>
      </ul>
      <SourceLine datos={[d.m1.contraste.dato, d.m2.cotizantes.dato, d.m3.resumen.dato]} />
    </section>
  );
}
