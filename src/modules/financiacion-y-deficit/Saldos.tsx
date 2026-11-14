import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { MarginNote } from '../../components/MarginNote';
import { SourceLine } from '../../components/SourceLine';
import {
  diferencia,
  porcentajeDelPib,
  recortar,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { GraficoSeries } from '../historico/GraficoSeries';
import { millonesEuros } from '../historico/formatos';
import {
  datosFinanciacion,
  ID_DEFINICION_SEC,
  ID_ESTIMACION_GASTOS_IMPROPIOS,
  ID_NOTA_SANIDAD,
} from '../historico/datos-financiacion';
import { UnidadFinanciera, type Unidad } from './unidad';

/** Rótulo del saldo no financiero menos las transferencias corrientes (cálculo propio, sin otra etiqueta). */
export const ROTULO_SALDO_SIN_TRANSFERENCIAS =
  'Saldo no financiero menos transferencias corrientes del Estado y OO. AA. (cálculo propio)';

const ROTULO_DEFINICION: Readonly<Record<string, string>> = {
  'saldo-presupuestario-no-financiero': 'Saldo presupuestario no financiero',
  'saldo-presupuestario-total': 'Saldo presupuestario total',
  'necesidad-financiacion-sec-s1314':
    'Capacidad o necesidad de financiación (contabilidad nacional)',
};

const EXPLICACION_DEFINICION: Readonly<Record<string, string>> = {
  'saldo-presupuestario-no-financiero':
    'Derechos reconocidos menos obligaciones reconocidas por operaciones no financieras (capítulos de ingresos y gastos que no son activos ni pasivos financieros). Incluye las transferencias del Estado como ingreso y excluye los préstamos.',
  'saldo-presupuestario-total':
    'Total de ingresos menos total de gastos de la ejecución, incluidas las operaciones financieras: entre ellas, los préstamos que la Tesorería recibe del Estado figuran como ingreso (pasivos financieros).',
  'necesidad-financiacion-sec-s1314':
    'Diferencia entre ingresos y gastos totales del subsector «fondos de la Seguridad Social» según el sistema europeo de cuentas (SEC), publicada por Eurostat a partir de la transmisión de cada país; Eurostat indica que las convenciones contables son las del sistema europeo de cuentas. Los metadatos descargados no detallan las entidades que componen el subsector, por lo que esta página no afirma que su perímetro coincida con el del presupuesto ni describe en qué se diferencia.',
};

/** Definiciones de saldo, gastos impropios y lectura del saldo con y sin transferencias. */
export function Saldos({ unidad }: { unidad: Unidad }) {
  const d = datosFinanciacion();
  const { presupuesto, saldoSec, pib } = d;
  const u = UnidadFinanciera(unidad);
  const aPib = unidad === 'porcentaje';
  const conv = (p: readonly PuntoAnual[]) => (aPib ? porcentajeDelPib(p, pib.puntos) : p);
  const fuentesPib = aPib ? [pib.dato] : [];

  const desde = presupuesto.saldoNoFinanciero.puntos[0]?.anio ?? 0;
  const hasta = presupuesto.saldoNoFinanciero.puntos.at(-1)?.anio ?? 0;
  const secEnRango = recortar(saldoSec.millones.puntos, desde, hasta);
  const sinTransferencias = diferencia(
    presupuesto.saldoNoFinanciero.puntos,
    presupuesto.transferenciasEstado.puntos,
  );

  const ultimoNoFin = presupuesto.saldoNoFinanciero.puntos.at(-1);
  const ultimoTotal = presupuesto.saldoTotal.puntos.at(-1);
  const ultimoSec = secEnRango.at(-1);

  // Única cifra de «gastos impropios» que se conserva: una estimación anterior a los ejercicios que
  // describe (el año de la estimación sale de la nota del dato, no se escribe a mano).
  const estimacion = d.previsiones.find((p) => p.id === ID_ESTIMACION_GASTOS_IMPROPIOS);
  const anioEstimacion = /Previsión de (\d{4})/.exec(estimacion?.notas ?? '')?.[1];
  const enumeracionImpropios =
    /«Gastos impropios» es la expresión de la fuente: (.*?)\. Fuente secundaria/.exec(
      estimacion?.notas ?? '',
    )?.[1];

  const principales = Object.keys(ROTULO_DEFINICION);

  return (
    <section className="seccion prosa" aria-labelledby="saldos">
      <h2 id="saldos">Déficit y saldo: definiciones disponibles</h2>
      <p>
        «Déficit de la Seguridad Social» puede referirse a magnitudes distintas según qué ingresos y
        gastos se cuenten. Las fuentes descargadas ofrecen tres definiciones; se muestran lado a
        lado, con su literal, sin elegir ninguna como la correcta. Un saldo negativo significa que
        los gastos superan a los ingresos de esa definición (necesidad de financiación).
      </p>

      <div className="hist-definiciones">
        {principales.map((id) => {
          const def = d.definiciones.find((x) => x.id === id);
          if (!def) return null;
          return (
            <Definition key={id} termino={ROTULO_DEFINICION[id] ?? id}>
              <span className="hist-literal">
                {EXPLICACION_DEFINICION[id] ?? ''} Literal de la fuente:{' '}
                <q lang={id === ID_DEFINICION_SEC ? 'en' : 'es'}>{def.literal}</q>.
              </span>
            </Definition>
          );
        })}
        <SourceLine datos={d.definiciones.map((x) => x.dato)} />
      </div>
      <MarginNote etiqueta="Ruptura de serie">
        <p>
          {d.definiciones.find((x) => x.id === ID_NOTA_SANIDAD)?.literal ?? ''} Por eso las cifras
          de contabilidad nacional anteriores a ese cambio no son comparables con las posteriores.
        </p>
      </MarginNote>

      <GraficoSeries
        titulo="Saldo según tres definiciones"
        descripcion={`Saldo presupuestario no financiero, saldo presupuestario total y capacidad o necesidad de financiación de los fondos de la Seguridad Social (SEC). Unidad: ${u.descripcion}.`}
        series={[
          {
            clave: 'nofin',
            etiqueta: 'Presupuesto: no financiero',
            puntos: conv(presupuesto.saldoNoFinanciero.puntos),
          },
          {
            clave: 'total',
            etiqueta: 'Presupuesto: total',
            puntos: conv(presupuesto.saldoTotal.puntos),
          },
          { clave: 'sec', etiqueta: 'Contabilidad nacional (SEC)', puntos: conv(secEnRango) },
        ]}
        unidadEje={u.eje}
        divisorEje={u.divisor}
        decimales={u.decimales}
        decimalesEje={u.decimalesEje}
        incluirCero
        fuentes={[
          presupuesto.saldoNoFinanciero.dato,
          presupuesto.saldoTotal.dato,
          saldoSec.millones.dato,
          ...fuentesPib,
        ]}
        nota="Los dos saldos presupuestarios son diferencias calculadas a partir de la ejecución (dato derivado, confianza media); el saldo SEC es el publicado por Eurostat. Son definiciones distintas, no estimaciones de la misma cifra."
        comoLeerlo={
          <>
            <p>
              En {ultimoNoFin?.anio ?? ''}, el saldo presupuestario no financiero es de{' '}
              {millonesEuros(ultimoNoFin?.valor ?? 0)}, el total de{' '}
              {millonesEuros(ultimoTotal?.valor ?? 0)} y el de contabilidad nacional de{' '}
              {millonesEuros(ultimoSec?.valor ?? 0)}.
            </p>
            <p>
              Las tres cifras difieren porque no miden lo mismo: el saldo total incluye las
              operaciones financieras (entre ellas los préstamos del Estado), el no financiero no, y
              el SEC aplica criterios de contabilidad nacional a un perímetro propio. Ninguna es una
              estimación mejor o peor de las otras. El gráfico no dice cómo se financia la
              diferencia.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Capacidad o necesidad de financiación de los fondos de la Seguridad Social (SEC)"
        descripcion={`Serie larga de Eurostat. Unidad: ${aPib ? 'porcentaje del PIB' : 'millones de euros (el eje, en miles de millones)'}.`}
        series={[
          {
            clave: 'sec',
            etiqueta: 'Capacidad (+) o necesidad (−) de financiación',
            puntos: aPib ? saldoSec.porcentajePib.puntos : saldoSec.millones.puntos,
          },
        ]}
        unidadEje={aPib ? '% del PIB' : 'Miles de millones de euros'}
        divisorEje={aPib ? 1 : 1000}
        decimales={aPib ? 1 : 0}
        decimalesEje={aPib ? 1 : 0}
        incluirCero
        fuentes={aPib ? saldoSec.porcentajePib.dato : saldoSec.millones.dato}
        nota="Antes del cambio de perímetro indicado en la nota al margen, el subsector incluía la sanidad: esas cifras no son comparables con las posteriores."
        comoLeerlo={
          <>
            <p>
              Cada punto es la diferencia entre ingresos y gastos totales del subsector en ese año,
              según la contabilidad nacional. Por encima de cero hay capacidad de financiación; por
              debajo, necesidad.
            </p>
            <p>
              Es una medida de un subsector concreto (fondos de la Seguridad Social), no del
              conjunto de las administraciones. No distingue qué parte se debe a pensiones ni cómo
              se cubre.
            </p>
          </>
        }
      />

      <h3 id="saldo-sin-transferencias">
        Saldo no financiero menos las transferencias corrientes del Estado
      </h3>
      <p>
        Restar al saldo no financiero las transferencias corrientes del Estado y organismos
        autónomos es un cálculo propio que no equivale a ninguna definición publicada. Se muestra
        con este rótulo: «{ROTULO_SALDO_SIN_TRANSFERENCIAS}».
      </p>
      <p className="hist-aviso">
        Advertencia: la resta quita también la financiación de partidas que no son pensiones
        contributivas (por ejemplo, las prestaciones que la ley clasifica como de naturaleza no
        contributiva), por lo que no equivale al saldo del sistema contributivo.
      </p>

      <GraficoSeries
        titulo="Saldo no financiero y saldo no financiero menos transferencias corrientes del Estado y OO. AA. (cálculo propio)"
        descripcion={`Saldo no financiero de la ejecución y ese mismo saldo restando las transferencias corrientes del Estado y organismos autónomos. Unidad: ${u.descripcion}.`}
        tipo="barras-agrupadas"
        series={[
          {
            clave: 'con',
            etiqueta: 'Saldo no financiero',
            puntos: conv(presupuesto.saldoNoFinanciero.puntos),
          },
          {
            clave: 'sin',
            etiqueta: 'Saldo menos transferencias (cálculo propio)',
            puntos: conv(sinTransferencias),
          },
        ]}
        unidadEje={u.eje}
        divisorEje={u.divisor}
        decimales={u.decimales}
        decimalesEje={u.decimalesEje}
        fuentes={[
          presupuesto.saldoNoFinanciero.dato,
          presupuesto.transferenciasEstado.dato,
          ...fuentesPib,
        ]}
        nota={`«Saldo menos transferencias (cálculo propio)» es: ${ROTULO_SALDO_SIN_TRANSFERENCIAS}. Diferencia de dos series publicadas (confianza media). No equivale a ninguna definición publicada ni al saldo de un subconjunto de prestaciones.`}
        comoLeerlo={
          <>
            <p>
              La diferencia entre las dos barras de cada año es exactamente la transferencia
              corriente del Estado y organismos autónomos de ese año:{' '}
              {millonesEuros(presupuesto.transferenciasEstado.puntos.at(-1)?.valor ?? 0)} en{' '}
              {presupuesto.transferenciasEstado.puntos.at(-1)?.anio ?? ''}.
            </p>
            <p>
              Esa transferencia financia partidas de distinta naturaleza y con los datos descargados
              no se puede separar qué parte corresponde a cada una. La gráfica no atribuye la
              transferencia a ningún gasto concreto; por eso la resta no mide el saldo de las
              pensiones contributivas.
            </p>
          </>
        }
      />

      <h3 id="gastos-impropios">Gastos impropios: una estimación de {anioEstimacion ?? ''}</h3>
      <p>
        La expresión «gastos impropios» no tiene una definición única en los ficheros descargados.
        La fuente que la usa la describe así: {enumeracionImpropios ?? ''}. Qué gastos deben
        financiarse con cotizaciones y cuáles con impuestos es una cuestión sobre la que existen
        planteamientos distintos; aquí solo se recoge la cifra de la fuente.
      </p>
      {estimacion === undefined ? null : (
        <div className="hist-definiciones">
          <DataTable
            titulo={`Gastos impropios: estimación de ${anioEstimacion ?? ''}, no dato observado`}
            columnas={[
              { clave: 'concepto', titulo: 'Concepto' },
              { clave: 'periodo', titulo: 'Año al que se refiere' },
              { clave: 'valor', titulo: 'Valor (millones de euros)', tipo: 'numero', decimales: 0 },
              { clave: 'confianza', titulo: 'Confianza' },
            ]}
            filas={[
              {
                concepto: `Gastos impropios (estimación de ${anioEstimacion ?? ''}, no dato observado)`,
                periodo: estimacion.periodo,
                valor: estimacion.valor,
                confianza: estimacion.dato.confidence,
              },
            ]}
          />
          <SourceLine datos={[estimacion.dato]} />
          <p className="como-leerlo-texto">
            Es una estimación de {anioEstimacion ?? ''} de la AIReF y del Ministerio, anterior al
            ejercicio al que se refiere, citada por un artículo de la Revista de la Seguridad
            Social: no es un dato observado y la fuente no es primaria. No se suma ni se compara con
            ninguna serie de ejecución de esta página. Está pendiente de contrastar con el Informe
            de evaluación y reforma del Pacto de Toledo de {anioEstimacion ?? ''} y con la AIReF.
          </p>
        </div>
      )}
    </section>
  );
}
