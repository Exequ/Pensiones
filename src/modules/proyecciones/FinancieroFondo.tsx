import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { formatearPorcentaje } from '../../engine/formato';
import { valorEn } from '../../engine/series-historicas';
import { decimal1 } from '../historico/formatos';
import type { DatosFinanciero } from './datos-financiero';
import { GraficoProyeccion } from './GraficoProyeccion';
import { COL4 } from './ids-financiero';
import {
  columnaM4,
  filasLimite,
  maximoDe,
  rentabilidadImplicita,
  seriesFinanciacionAdicional,
  seriesFondoFlujos,
  seriesFondoValor,
} from './series-financiero';

const MIL = 1000;

/** Gráficos del Fondo de Reserva: valor, dotaciones y disposiciones con el límite legal, y financiación adicional. */
export function FinancieroFondo({ d }: { d: DatosFinanciero }) {
  const valor = columnaM4(d, COL4.fondo);
  const disposicion = columnaM4(d, COL4.disposicion);
  const adicional = columnaM4(d, COL4.financiacionAdicional);
  const pico = maximoDe(valor);
  const ultimo = valor.at(-1);
  const ultimaDisposicion = ultimo === undefined ? undefined : valorEn(disposicion, ultimo.anio);
  const rentabilidad = rentabilidadImplicita(d);
  const rentabilidadConstante = Math.abs(rentabilidad.maxima - rentabilidad.minima) < 1e-6;
  const filas = filasLimite(d);
  const conDisposicion = filas.filter((f) => f.disposicion > 0);
  const coincidentes = conDisposicion.filter(
    (f) => f.disposicionSobreLimite !== null && Math.abs(f.disposicionSobreLimite - 100) < 1e-6,
  );
  const primerAnioDisposicion = disposicion.find((p) => p.valor > 0)?.anio;
  const totalAdicional = adicional.reduce((a, p) => a + p.valor, 0);
  const aniosConAdicional = adicional.filter((p) => p.valor > 0).length;

  return (
    <>
      <h3 id="proy-fin-fondo">Fondo de Reserva</h3>
      <p>
        En el modelo, el Fondo de Reserva se nutre del MEI y, a partir del primer año en que la ley
        lo permite, puede usarse para cubrir déficit con un límite anual expresado en porcentaje del
        PIB. Lo que el Fondo no cubre aparece como financiación adicional. La página{' '}
        <Link to="/hucha">«Hucha»</Link> muestra la evolución histórica del Fondo, sus dotaciones y
        disposiciones y las reglas de disposición; aquí se añade lo que resulta del modelo.
      </p>
      <p>
        El Fondo se valora a precio de adquisición en el histórico. La descripción del modelo no
        indica cómo se valora en la proyección: la salida lo hace crecer con una rentabilidad
        nominal anual implícita de{' '}
        {rentabilidadConstante
          ? `${formatearPorcentaje(rentabilidad.minima, { decimales: 2 })} (la misma todos los años)`
          : `entre ${formatearPorcentaje(rentabilidad.minima, { decimales: 2 })} y ${formatearPorcentaje(rentabilidad.maxima, { decimales: 2 })}`}
        , calculada a partir del valor, la dotación y la disposición de cada año. Esa cifra no
        consta en la descripción del modelo. Las dos valoraciones no son equivalentes.
      </p>

      <GraficoProyeccion
        titulo="Valor del Fondo de Reserva a fin de año: observado y proyección"
        descripcion="Valor del Fondo a fin de cada año. El histórico está a precio de adquisición; la proyección es el valor que calcula el modelo. Unidad: miles de millones de euros corrientes."
        series={seriesFondoValor(d)}
        unidadEje="Miles de millones de euros"
        decimales={1}
        decimalesEje={0}
        incluirCero
        fuentes={[d.m4.dato, d.observado.fondoValor.dato]}
        nota="El histórico está a precio de adquisición, no a valor de mercado. La proyección parte del valor del último año observado y no distingue entre las dos valoraciones."
        comoLeerlo={
          <>
            <p>
              Cada punto es el valor del Fondo a fin de año. En el modelo, el valor sube con las
              dotaciones del MEI y baja con las disposiciones; el rendimiento se suma al valor del
              año anterior.
            </p>
            <p>
              No dice si el valor es suficiente para algún fin ni qué pasaría después del último año
              calculado: el modelo no calcula más allá. El tramo observado y el proyectado no usan
              exactamente la misma valoración.
            </p>
          </>
        }
      />
      {pico === undefined || ultimo === undefined || ultimaDisposicion === undefined ? null : (
        <p>
          En el modelo, el valor del Fondo alcanza su máximo en {pico.anio}, con{' '}
          {decimal1(pico.valor / MIL)} miles de millones de euros. A fin de {ultimo.anio}, último
          año calculado, es de {decimal1(ultimo.valor / MIL)} miles de millones,{' '}
          {ultimo.valor < ultimaDisposicion ? 'menor' : 'mayor'} que la disposición de ese año (
          {decimal1(ultimaDisposicion / MIL)} miles de millones). El modelo no calcula años
          posteriores.
        </p>
      )}

      <GraficoProyeccion
        titulo="Dotaciones y disposiciones del Fondo de Reserva y límite legal de disposición: observado y proyección"
        descripcion="Dotaciones anuales al Fondo procedentes del MEI, disposiciones anuales (en valor absoluto) y límite legal de disposición expresado en euros: el porcentaje del PIB que fija la norma por el PIB aproximado del modelo. Unidad: miles de millones de euros corrientes."
        series={seriesFondoFlujos(d)}
        unidadEje="Miles de millones de euros"
        decimales={1}
        decimalesEje={0}
        incluirCero
        alto={460}
        fuentes={[
          d.m4.dato,
          d.observado.fondoDotacionesMei.dato,
          d.observado.fondoDisposiciones.dato,
          d.limiteDisposicion.dato,
        ]}
        nota="El límite legal está dado en porcentaje del PIB y solo tiene valor en los años que fija la norma; su traducción a euros usa el PIB aproximado del modelo, no el del INE, y es una proyección. Las disposiciones del histórico se muestran en valor absoluto (la fuente las registra con signo negativo)."
        comoLeerlo={
          <>
            <p>
              La línea de disposiciones del modelo se compara con la del límite legal: cuando
              coinciden, la disposición del modelo es la máxima que la norma permite ese año. Las
              dotaciones siguen al MEI, por lo que su tendencia es la del propio MEI.
            </p>
            <p>
              No dice si un límite es adecuado: es el que figura en la norma recogida en los datos.
              Tampoco dice qué se haría ante una necesidad mayor que el límite; el modelo la
              registra como financiación adicional.
            </p>
          </>
        }
      />
      {conDisposicion.length === 0 ? null : (
        <p>
          En {conDisposicion.length} años con disposición
          {primerAnioDisposicion === undefined ? '' : ` (desde ${primerAnioDisposicion})`}, la
          disposición del modelo coincide con el límite legal en {coincidentes.length}.
        </p>
      )}
      <details className="grafico-datos">
        <summary>Ver el límite legal frente a la disposición del modelo por año</summary>
        <DataTable
          titulo="Límite legal de disposición del Fondo y disposición del modelo, por año"
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            { clave: 'limitePib', titulo: 'Límite (% del PIB)', tipo: 'numero', decimales: 2 },
            {
              clave: 'limiteEuros',
              titulo: 'Límite con el PIB aproximado del modelo (millones de euros)',
              tipo: 'numero',
              decimales: 0,
            },
            {
              clave: 'disposicion',
              titulo: 'Disposición del modelo (millones de euros)',
              tipo: 'numero',
              decimales: 0,
            },
            {
              clave: 'disposicionSobreLimite',
              titulo: 'Disposición sobre el límite (%)',
              tipo: 'numero',
              decimales: 1,
            },
          ]}
          filas={filas}
        />
        <SourceLine datos={[d.limiteDisposicion.dato, d.m4.dato]} />
      </details>

      <GraficoProyeccion
        titulo="Disposición del Fondo de Reserva y financiación adicional: proyección"
        descripcion="Disposición anual del Fondo para cubrir déficit y financiación adicional, que es lo que el Fondo no cubre. Solo hay proyección: no existe un histórico con esta definición. Unidad: miles de millones de euros corrientes."
        series={seriesFinanciacionAdicional(d)}
        unidadEje="Miles de millones de euros"
        decimales={1}
        decimalesEje={0}
        incluirCero
        fuentes={[d.m4.dato]}
        nota="La financiación adicional es la que define el modelo: la parte de la necesidad que el Fondo no cubre. No es un dato observado ni indica de dónde procedería."
        comoLeerlo={
          <>
            <p>
              Cada año, el modelo calcula la necesidad de financiación; el Fondo cubre una parte,
              hasta el límite legal, y el resto es la financiación adicional. Antes del primer año
              en que el Fondo puede usarse, toda la necesidad figura como financiación adicional.
            </p>
            <p>
              No dice cómo se cubriría esa financiación ni quién la aportaría: la salida solo la
              calcula como diferencia. Tampoco hay histórico comparable con esta definición.
            </p>
          </>
        }
      />
      <p>
        La suma de la financiación adicional de todos los años proyectados es de{' '}
        {decimal1(totalAdicional / MIL)} miles de millones de euros corrientes, repartida en{' '}
        {aniosConAdicional} años. La suma de importes de años distintos mezcla euros de fechas
        distintas: es un total descriptivo, no un valor presente.
      </p>
    </>
  );
}
