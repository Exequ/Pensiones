import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { formatearPorcentaje } from '../../engine/formato';
import { valorEn } from '../../engine/series-historicas';
import { decimal1 } from '../historico/formatos';
import type { DatosFinanciero } from './datos-financiero';
import { GraficoProyeccion } from './GraficoProyeccion';
import { MODELO } from './ids-datos';
import { COL4 } from './ids-financiero';
import {
  anioBaseConstante,
  columnaM4,
  crecimientoAnualMedio,
  DEFINICION_PIB_OBSERVADO,
  DEFINICION_PIB_PROYECTADO,
  filasPibDeTramo,
  seriesGasto,
  seriesPensionMedia,
  tituloConEscenario,
  type UnidadImporte,
  type UnidadPension,
} from './series-financiero';

const OPCIONES_UNIDAD = [
  { valor: 'euros', etiqueta: 'Euros corrientes' },
  { valor: 'pib', etiqueta: 'Porcentaje del PIB' },
] as const;

const OPCIONES_PENSION = [
  { valor: 'corrientes', etiqueta: 'Euros corrientes' },
  { valor: 'constantes', etiqueta: 'Euros constantes' },
] as const;

/**
 * Nota visible sobre el cambio de definición del PIB al unir lo observado con M4. El PIB del INE es
 * el denominador del porcentaje observado; el del modelo es un indicador aproximado (afiliados por salario
 * nominal), según la descripción del modelo.
 */
export function NotaPib() {
  return (
    <p className="hist-aviso">
      <strong>Cambio de definición del PIB.</strong> Los porcentajes observados se calculan con el
      PIB corriente del INE; los proyectados, con el PIB de {MODELO.m4}, que es un indicador
      aproximado (afiliados por salario nominal) y no una previsión macroeconómica. El PIB del INE
      figura entre los datos de entrada del modelo, pero ambas medidas no coinciden. Entre el último
      año observado y el primero proyectado cambia el denominador: la diferencia entre los dos
      tramos no se debe solo a la evolución del gasto.
    </p>
  );
}

/** Gráficos a y b: gasto en pensiones contributivas y pensión media. */
export function FinancieroGasto({ d }: { d: DatosFinanciero }) {
  const [unidad, setUnidad] = useState<UnidadImporte>('euros');
  const [pension, setPension] = useState<UnidadPension>('corrientes');

  const enPib = unidad === 'pib';
  const series = seriesGasto(d, unidad);
  const primeroObservado = series[0]?.observado?.[0]?.anio ?? d.anioInicio;
  const ultimoAnio = columnaM4(d, COL4.gasto).at(-1)?.anio ?? d.anioInicio;
  const gastoFinal = valorEn(columnaM4(d, COL4.gasto), ultimoAnio);
  const porcentajeFinal = valorEn(columnaM4(d, COL4.gastoPctPib), ultimoAnio);
  const filasPib = filasPibDeTramo(d).filter((f) => Number(f.anio) >= primeroObservado);

  const pensiones = seriesPensionMedia(d, pension);
  const base = anioBaseConstante(d);
  const constantes = pension === 'constantes';
  const mediaTotal = pensiones[0]?.proyeccion ?? [];
  const crecimiento = crecimientoAnualMedio(mediaTotal);
  const ipc = formatearPorcentaje(d.escenario.ipc, { maxDecimales: 2 });

  return (
    <>
      <h3 id="proy-fin-gasto">Gasto en pensiones contributivas</h3>
      <p>
        El modelo calcula el gasto como el número de pensiones de cada clase por la pensión media,
        por catorce pagas y por un factor de calibración de cada clase (se calcula más abajo). El
        histórico es el gasto en pensiones de la ejecución del presupuesto de la Seguridad Social,
        que es la misma magnitud con la que el modelo se calibra en el último año observado.
      </p>
      <div className="proy-controles">
        <SegmentedPills
          leyenda="Unidad"
          opciones={OPCIONES_UNIDAD}
          valor={unidad}
          onCambio={setUnidad}
        />
      </div>
      <NotaPib />
      <GraficoProyeccion
        titulo={tituloConEscenario(
          d,
          `Gasto en pensiones contributivas: ${enPib ? 'porcentaje del PIB' : 'euros corrientes'}, observado y proyección`,
        )}
        descripcion={
          enPib
            ? 'Gasto anual en pensiones contributivas dividido por el PIB. Hasta el último año observado, el PIB es el corriente del INE; desde el primer año proyectado, el PIB aproximado del modelo. Unidad: porcentaje del PIB.'
            : 'Gasto anual en pensiones contributivas, en euros corrientes (con inflación). Unidad: miles de millones de euros.'
        }
        series={series}
        unidadEje={enPib ? '% del PIB' : 'Miles de millones de euros'}
        decimales={enPib ? 2 : 1}
        decimalesEje={enPib ? 1 : 0}
        incluirCero
        fuentes={[
          d.m4.dato,
          d.observado.gastoPensiones.dato,
          ...(enPib ? [d.observado.pibIne.dato] : []),
        ]}
        rotuloInicio={enPib ? 'Proyección (otro PIB) →' : 'Proyección →'}
        {...(enPib
          ? {
              columnaExtra: {
                titulo: 'PIB utilizado',
                observado: DEFINICION_PIB_OBSERVADO,
                proyeccion: DEFINICION_PIB_PROYECTADO,
              },
            }
          : {})}
        nota={
          enPib
            ? 'El denominador cambia de definición entre el último año observado y el primero proyectado (véase la nota sobre el PIB). El histórico es la ejecución del presupuesto, en obligaciones reconocidas.'
            : 'El histórico es la ejecución del presupuesto, en obligaciones reconocidas; la proyección es el cálculo del modelo en euros corrientes.'
        }
        comoLeerlo={
          <>
            <p>
              Cada punto es el gasto de un año en pensiones contributivas. La línea continua es lo
              ejecutado y la discontinua, el cálculo del modelo con sus supuestos. En euros
              corrientes, la cifra incluye el efecto de la inflación supuesta; en porcentaje del
              PIB, se compara con el tamaño de la economía de cada tramo.
            </p>
            <p>
              No dice si la cifra es alta o baja ni qué ocurrirá: es el resultado de los supuestos
              del escenario. En porcentaje del PIB, los dos tramos usan un PIB distinto, así que la
              comparación directa entre el último año observado y el primero proyectado mezcla dos
              definiciones.
            </p>
          </>
        }
      />
      {gastoFinal === undefined || porcentajeFinal === undefined ? null : (
        <p>
          En {ultimoAnio}, el último año de la proyección, el modelo calcula un gasto de{' '}
          {decimal1(gastoFinal / 1000)} miles de millones de euros corrientes, equivalentes a{' '}
          {decimal1(porcentajeFinal)} % del PIB aproximado del modelo.
        </p>
      )}
      <details className="grafico-datos">
        <summary>Ver el PIB utilizado en cada año</summary>
        <DataTable
          titulo="PIB de cada año y su definición: PIB del INE en lo observado y PIB aproximado del modelo en lo proyectado"
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            { clave: 'definicion', titulo: 'Definición' },
            {
              clave: 'pib',
              titulo: 'PIB (millones de euros corrientes)',
              tipo: 'numero',
              decimales: 0,
            },
          ]}
          filas={filasPib}
        />
        <SourceLine
          datos={[d.observado.pibIne.dato, d.m4.dato]}
          titulo="PIB de cada año y su definición: PIB del INE en lo observado y PIB aproximado del modelo en lo proyectado"
        />
      </details>

      <h3 id="proy-fin-pension">Pensión media</h3>
      <p>
        El modelo revaloriza todas las pensiones con el IPC y hace que las altas entren con una
        pensión algo mayor que las bajas; el resultado es la pensión media de jubilación y la de
        todas las clases. Se muestran en euros corrientes y, con el selector, en euros constantes de{' '}
        {base}.
      </p>
      <div className="proy-controles">
        <SegmentedPills
          leyenda="Tipo de euros"
          opciones={OPCIONES_PENSION}
          valor={pension}
          onCambio={setPension}
        />
      </div>
      <GraficoProyeccion
        titulo={tituloConEscenario(
          d,
          `Pensión media mensual: ${constantes ? `euros constantes de ${base}` : 'euros corrientes'}, observado y proyección`,
        )}
        descripcion={
          constantes
            ? `Pensión media mensual de jubilación y de todas las clases, en euros constantes de ${base}. Lo observado se deflacta con el IPC medio anual del INE; lo proyectado, con el IPC supuesto del escenario (${ipc} anual). Unidad: euros al mes.`
            : 'Pensión media mensual de jubilación y de todas las clases, en euros corrientes de cada año. Unidad: euros al mes.'
        }
        series={pensiones}
        unidadEje="Euros al mes"
        decimales={0}
        decimalesEje={0}
        fuentes={[
          d.m4.dato,
          d.observado.pensionMediaTotal.dato,
          ...(constantes ? [d.ipc.dato] : []),
        ]}
        nota={
          constantes
            ? `El IPC supuesto del escenario (${ipc} anual) es el que figura en los metadatos de la salida del modelo. La pensión observada es la de primero de diciembre; la proyectada, la media de cada año del modelo.`
            : 'La pensión observada es la de primero de diciembre; la proyectada, la media de cada año del modelo (fecha de referencia distinta).'
        }
        comoLeerlo={
          <>
            <p>
              Cada línea es la pensión media mensual de un grupo de pensiones. En euros corrientes
              crece con la inflación; en euros constantes se descuenta el efecto de los precios y se
              ve cuánto cambia la pensión media por encima o por debajo de ellos.
            </p>
            <p>
              No es la pensión de una persona concreta ni la de quien se jubila cada año: es el
              promedio de todas las pensiones en vigor. Las líneas continuas son observadas y las
              discontinuas, del modelo.
            </p>
          </>
        }
      />
      {crecimiento === null || mediaTotal.length < 2 ? null : (
        <p>
          Entre {mediaTotal[0]?.anio} y {mediaTotal.at(-1)?.anio}, la pensión media de todas las
          clases de la proyección crece una media anual de{' '}
          {formatearPorcentaje(crecimiento, { decimales: 2 })} en{' '}
          {constantes ? 'euros constantes' : 'euros corrientes'}
          {constantes
            ? ''
            : `; con el IPC supuesto (${ipc}), la inflación explica una parte de ese crecimiento`}
          .
        </p>
      )}
    </>
  );
}
