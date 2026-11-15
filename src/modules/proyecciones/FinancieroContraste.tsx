import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { BASE_INDICE } from '../../engine/proyecciones';
import { decimal1 } from '../historico/formatos';
import type { DatosFinanciero } from './datos-financiero';
import { GraficoProyeccion } from './GraficoProyeccion';
import type { SerieProyectada } from './grafico-proyeccion';
import { MODELO } from './ids-datos';
import { contrasteAgeing, filasCandidatos, tituloConEscenario } from './series-financiero';

/** Gráfico f: gasto en pensiones sobre el PIB del modelo y del Ageing Report en índice, y candidatos a explicar la diferencia. */
export function FinancieroContraste({ d }: { d: DatosFinanciero }) {
  const c = contrasteAgeing(d);
  const series: SerieProyectada[] = [
    {
      clave: 'modelo',
      etiqueta: `Modelo ${MODELO.m4}: gasto`,
      proyeccion: c.indiceM4,
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'ageing',
      etiqueta: 'Ageing Report: gasto',
      proyeccion: c.indiceAgeing,
      origen: 'publicada',
      color: 1,
    },
  ];
  const nivelM4 = new Map(c.nivelM4.map((p) => [p.anio, p.valor]));
  const nivelAgeing = new Map(c.nivelAgeing.map((p) => [p.anio, p.valor]));
  const filas = c.diferencias.map((f) => ({
    anio: String(f.anio),
    modelo: f.a,
    ageing: f.b,
    diferencia: f.diferencia,
    nivelModelo: nivelM4.get(f.anio) ?? null,
    nivelAgeing: nivelAgeing.get(f.anio) ?? null,
  }));
  const ultima = c.diferencias.at(-1);
  const candidatos = filasCandidatos(d);
  const fuentes = [d.m4.dato, d.ageing.gastoPensionesPib.dato];
  const fuentesCandidatos = [
    d.m4.dato,
    d.ageing.tasaReposicionBruta.dato,
    d.ageing.crecimientoPibPotencial.dato,
  ];

  return (
    <>
      <h3 id="proy-fin-ageing">Contraste con el Ageing Report de la Comisión Europea</h3>
      <p>
        El Ageing Report proyecta el gasto en pensiones públicas de España en porcentaje del PIB. Se
        compara con el gasto de {MODELO.m4} en índice, con el primer año proyectado igual a{' '}
        {BASE_INDICE}, porque las dos series no miden lo mismo: según la descripción de {MODELO.m4},
        el Ageing Report incluye clases pasivas y otros regímenes públicos, mientras que {MODELO.m4}
        calcula las pensiones contributivas; además, el PIB de cada una es distinto. Los niveles no
        son comparables; sí lo es cuánto crece cada serie respecto al primer año. La cobertura del
        Ageing Report que describe el modelo no se ha comprobado aquí con la fuente.
      </p>
      <GraficoProyeccion
        titulo={tituloConEscenario(
          d,
          `Gasto en pensiones sobre el PIB: ${MODELO.m4} y Ageing Report, índice ${c.anioBase} = ${BASE_INDICE}`,
        )}
        descripcion={`Gasto en pensiones en porcentaje del PIB de cada serie, dividido por su valor en ${c.anioBase} y multiplicado por cien. Unidad: índice.`}
        series={series}
        unidadEje={`Índice (${c.anioBase} = ${BASE_INDICE})`}
        decimales={1}
        decimalesEje={0}
        fuentes={fuentes}
        nota="El Ageing Report es una proyección de la Comisión Europea y del Comité de Política Económica, con su escenario de referencia y sus propios supuestos. El PIB del modelo es un indicador aproximado; el del Ageing Report, el de su propio escenario macroeconómico."
        comoLeerlo={
          <>
            <p>
              Las dos curvas parten del mismo valor y muestran cuánto crece cada serie respecto al
              primer año. La distancia entre ellas, en puntos de índice, está en la tabla de
              diferencias.
            </p>
            <p>
              No dice cuál de las dos proyecciones es más acertada: tienen supuestos, cobertura y
              PIB distintos. Tampoco explica por qué difieren: los candidatos que cita la
              descripción del modelo no se han verificado.
            </p>
          </>
        }
      />
      {ultima === undefined ? null : (
        <p>
          En {ultima.anio}, el índice de {MODELO.m4} es {decimal1(ultima.a)} y el del Ageing Report{' '}
          {decimal1(ultima.b)}: una diferencia de {decimal1(ultima.diferencia)} puntos de índice
          (modelo menos Ageing Report).
        </p>
      )}
      <details className="grafico-datos">
        <summary>Ver la tabla de diferencias por año</summary>
        <DataTable
          titulo="Diferencia entre el índice de gasto sobre el PIB del modelo y el del Ageing Report, con los niveles de cada serie"
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            { clave: 'modelo', titulo: 'Índice del modelo', tipo: 'numero', decimales: 1 },
            { clave: 'ageing', titulo: 'Índice del Ageing Report', tipo: 'numero', decimales: 1 },
            {
              clave: 'diferencia',
              titulo: 'Diferencia (puntos de índice)',
              tipo: 'numero',
              decimales: 1,
            },
            {
              clave: 'nivelModelo',
              titulo: 'Nivel del modelo (% del PIB aproximado)',
              tipo: 'numero',
              decimales: 2,
            },
            {
              clave: 'nivelAgeing',
              titulo: 'Nivel del Ageing Report (% del PIB)',
              tipo: 'numero',
              decimales: 2,
            },
          ]}
          filas={filas}
          pie="Los niveles no son comparables entre sí: según la descripción del modelo, el Ageing Report incluye clases pasivas y otros regímenes públicos, y el PIB de cada serie es distinto."
        />
        <SourceLine datos={fuentes} />
      </details>

      <h4 id="proy-fin-candidatos">Posibles causas de la diferencia (no verificadas)</h4>
      <p>
        La descripción de {MODELO.m4} menciona dos candidatos para explicar la diferencia con el
        Ageing Report: el supuesto del Ageing Report sobre la tasa de reposición (el modelo de
        referencia para las altas, {MODELO.m5}, no reproduce su evolución) y el crecimiento del PIB.
        Son <strong>candidatos no verificados</strong>: no se ha comprobado con los datos
        disponibles que expliquen la diferencia, y que las series relacionadas difieran no demuestra
        que sean su causa. La tabla recoge, año a año, las magnitudes de los datos que se relacionan
        con cada candidato.
      </p>
      <details className="grafico-datos">
        <summary>Ver las magnitudes relacionadas con los candidatos (no verificados)</summary>
        <DataTable
          titulo="Magnitudes relacionadas con los candidatos a explicar la diferencia con el Ageing Report (no verificados)"
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            {
              clave: 'tasaReposicionAgeing',
              titulo: 'Tasa de reposición bruta en la jubilación, Ageing Report (%)',
              tipo: 'numero',
              decimales: 1,
            },
            {
              clave: 'crecimientoPibAgeing',
              titulo: 'Crecimiento real del PIB potencial, Ageing Report (%)',
              tipo: 'numero',
              decimales: 2,
            },
            {
              clave: 'crecimientoPibModelo',
              titulo: 'Crecimiento real del PIB aproximado del modelo (%)',
              tipo: 'numero',
              decimales: 2,
            },
          ]}
          filas={candidatos}
          pie="El crecimiento real del PIB aproximado del modelo es el crecimiento nominal de su PIB aproximado descontado con el IPC supuesto del escenario; el primer año no tiene tasa. Son magnitudes con definiciones distintas: no se pueden restar entre sí ni se han verificado como causa."
        />
        <SourceLine datos={fuentesCandidatos} />
      </details>
    </>
  );
}
