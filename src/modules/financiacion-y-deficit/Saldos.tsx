import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { MarginNote } from '../../components/MarginNote';
import { SourceLine } from '../../components/SourceLine';
import {
  diferencia,
  porcentajeDelPib,
  recortar,
  valorEn,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { GraficoSeries } from '../historico/GraficoSeries';
import { entero, millonesEuros } from '../historico/formatos';
import {
  datosFinanciacion,
  ID_DEFINICION_SEC,
  ID_NOTA_SANIDAD,
} from '../historico/datos-financiacion';
import { UnidadFinanciera, type Unidad } from './unidad';

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
    'Diferencia entre ingresos y gastos totales del subsector «fondos de la Seguridad Social» según el sistema europeo de cuentas (SEC), publicada por Eurostat a partir de la transmisión de cada país. Su perímetro y sus criterios de imputación no coinciden con los del presupuesto.',
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

  // Lectura ilustrativa del año de la previsión de gastos impropios.
  const prevision = d.previsiones.find((p) => p.id.startsWith('gastos-impropios-previstos'));
  const anioPrevision = prevision === undefined ? undefined : Number(prevision.periodo);
  const filasLecturas =
    prevision === undefined || anioPrevision === undefined
      ? []
      : (() => {
          const saldo = valorEn(presupuesto.saldoNoFinanciero.puntos, anioPrevision) ?? 0;
          const transf = valorEn(presupuesto.transferenciasEstado.puntos, anioPrevision) ?? 0;
          return [
            {
              lectura: 'Saldo no financiero de la ejecución',
              incluye:
                'Ingresos y gastos no financieros, con las transferencias del Estado como ingreso',
              importe: saldo,
              confianza: presupuesto.saldoNoFinanciero.dato.confidence,
            },
            {
              lectura: 'Sin las transferencias corrientes del Estado',
              incluye:
                'El saldo anterior menos las transferencias corrientes del Estado y organismos autónomos',
              importe: saldo - transf,
              confianza: presupuesto.saldoNoFinanciero.dato.confidence,
            },
            {
              lectura: 'Gastos impropios previstos para este año (previsión anterior)',
              incluye:
                'Previsión (no dato observado) de la AIReF y del Ministerio, según una fuente secundaria',
              importe: prevision.valor,
              confianza: prevision.dato.confidence,
            },
            {
              lectura: 'Sin transferencias del Estado y sin los gastos impropios previstos',
              incluye: 'Cálculo ilustrativo: la segunda lectura más los gastos impropios previstos',
              importe: saldo - transf + prevision.valor,
              confianza: prevision.dato.confidence,
            },
          ];
        })();

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

      <h3>Gastos impropios y transferencias del Estado</h3>
      <p>
        La expresión «gastos impropios» no tiene una definición única en los ficheros descargados.
        La fuente que la usa la describe así: {prevision?.notas ?? ''} Qué gastos deben financiarse
        con cotizaciones y cuáles con impuestos es una cuestión sobre la que existen planteamientos
        distintos; aquí solo se muestran las cifras de las fuentes y qué cambia en el saldo según se
        cuenten o no.
      </p>

      <GraficoSeries
        titulo="Saldo no financiero con y sin las transferencias corrientes del Estado"
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
            etiqueta: 'Sin transferencias corrientes del Estado',
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
        nota="Cálculo propio (diferencia de dos series publicadas; confianza media). No equivale a ninguna definición publicada: la de «saldo contributivo ajustado» de la AIReF y del Ministerio no se ha podido descargar."
        comoLeerlo={
          <>
            <p>
              La diferencia entre las dos barras de cada año es exactamente la transferencia
              corriente del Estado y organismos autónomos de ese año:{' '}
              {millonesEuros(presupuesto.transferenciasEstado.puntos.at(-1)?.valor ?? 0)} en{' '}
              {presupuesto.transferenciasEstado.puntos.at(-1)?.anio ?? ''}.
            </p>
            <p>
              Qué parte de esas transferencias corresponde a gastos que se consideran «impropios» y
              cuál financia otras partidas no se puede separar con los datos descargados. La gráfica
              no atribuye la transferencia a ningún gasto concreto.
            </p>
          </>
        }
      />

      {filasLecturas.length > 0 && anioPrevision !== undefined ? (
        <div className="hist-definiciones">
          <DataTable
            titulo={`Cuatro lecturas del saldo de ${anioPrevision} (millones de euros)`}
            columnas={[
              { clave: 'lectura', titulo: 'Lectura' },
              { clave: 'incluye', titulo: 'Qué incluye' },
              { clave: 'importe', titulo: 'Importe (M€)', tipo: 'numero' },
              { clave: 'confianza', titulo: 'Confianza' },
            ]}
            filas={filasLecturas}
          />
          <SourceLine
            datos={[
              presupuesto.saldoNoFinanciero.dato,
              presupuesto.transferenciasEstado.dato,
              ...(prevision ? [prevision.dato] : []),
            ]}
          />
          <p className="como-leerlo-texto">
            La tercera fila es una previsión anterior al ejercicio, no un dato observado, y la
            cuarta es un cálculo ilustrativo que suma una previsión a datos de ejecución: sirve para
            ver cuánto cambia la cifra según qué se cuente (de{' '}
            {entero(filasLecturas[0]?.importe ?? 0)} a {entero(filasLecturas[3]?.importe ?? 0)}{' '}
            millones de euros), no como estimación del déficit.
          </p>
        </div>
      ) : null}

      <div className="hist-definiciones">
        <DataTable
          titulo="Cifras sobre «gastos impropios» recogidas de una fuente secundaria"
          columnas={[
            { clave: 'concepto', titulo: 'Concepto' },
            { clave: 'periodo', titulo: 'Año' },
            { clave: 'valor', titulo: 'Valor', tipo: 'numero' },
            { clave: 'unidad', titulo: 'Unidad' },
            { clave: 'confianza', titulo: 'Confianza' },
          ]}
          filas={d.previsiones.map((p) => ({
            concepto: ETIQUETA_PREVISION[p.id] ?? p.id,
            periodo: p.periodo,
            valor: p.valor,
            unidad: p.unidad,
            confianza: p.dato.confidence,
          }))}
        />
        <SourceLine datos={d.previsiones.map((p) => p.dato)} />
        <p className="como-leerlo-texto">
          Son previsiones anteriores a los ejercicios que describen (o una cifra aproximada de un
          proyecto de presupuestos) citadas por un artículo de la Revista de la Seguridad Social, no
          datos observados. La fuente no es primaria; por eso su confianza es media o baja.
        </p>
      </div>
    </section>
  );
}

const ETIQUETA_PREVISION: Readonly<Record<string, string>> = {
  'gastos-impropios-previstos-2023': 'Gastos impropios previstos',
  'deficit-estimado-2023': 'Déficit estimado en la misma previsión',
  'transferencia-prevista-pge-2021': 'Transferencia prevista en el proyecto de presupuestos',
  'aportacion-estado-gasto-pensiones-espana-2016':
    'Aportación del Estado al gasto en pensiones (Ageing Report de la Comisión Europea)',
};
