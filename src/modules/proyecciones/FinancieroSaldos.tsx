import { useState } from 'react';
import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { formatearPorcentaje } from '../../engine/formato';
import { valorEn } from '../../engine/series-historicas';
import { decimal2 } from '../historico/formatos';
import type { DatosFinanciero } from './datos-financiero';
import { GraficoProyeccion } from './GraficoProyeccion';
import { MODELO } from './ids-datos';
import { COL4 } from './ids-financiero';
import {
  columnaM4,
  DEFINICION_PIB_OBSERVADO,
  DEFINICION_PIB_PROYECTADO,
  seriesIngresosYGasto,
  seriesSaldos,
  tituloConEscenario,
  type UnidadImporte,
} from './series-financiero';
import { NotaPib } from './FinancieroGasto';

const OPCIONES_UNIDAD = [
  { valor: 'euros', etiqueta: 'Euros corrientes' },
  { valor: 'pib', etiqueta: 'Porcentaje del PIB' },
] as const;

/**
 * Definiciones de las tres medidas de saldo del modelo, tomadas de su descripción: «Saldo = ingresos −
 * gasto en pensiones − resto de gastos» (saldo no financiero), «cotizaciones − pensiones» y el saldo
 * sin transferencias (cotizaciones − pensiones − resto de gastos), que la descripción define.
 */
const DEFINICIONES_SALDO = [
  {
    medida: 'Cotizaciones menos pensiones',
    definicion:
      'Cotizaciones (incluido el MEI) menos el gasto en pensiones contributivas. La descripción del modelo la compara con el balance del sistema de pensiones del Ageing Report.',
  },
  {
    medida: 'Saldo sin transferencias',
    definicion:
      'Cotizaciones menos el gasto en pensiones menos el resto de gastos, sin contar las transferencias del Estado ni otros ingresos. Es la definición de la descripción del modelo, y se comprueba aritméticamente con las columnas de la salida.',
  },
  {
    medida: 'Saldo no financiero',
    definicion:
      'Ingresos (cotizaciones, transferencias del Estado y otros ingresos) menos el gasto en pensiones menos el resto de gastos: bajas por enfermedad, maternidad, complementos a mínimos, pensiones no contributivas, Ingreso Mínimo Vital, personal y otros.',
  },
] as const;

/** Gráficos c y d: cotizaciones, MEI y gasto en pensiones; y las tres medidas de saldo. */
export function FinancieroSaldos({ d }: { d: DatosFinanciero }) {
  const [unidad, setUnidad] = useState<UnidadImporte>('euros');
  const enPib = unidad === 'pib';

  const cotizaciones = columnaM4(d, COL4.cotizaciones);
  const mei = columnaM4(d, COL4.mei);
  const primero = cotizaciones[0];
  const ultimo = cotizaciones.at(-1);
  const pesoMei = (anio: number | undefined): string | null => {
    if (anio === undefined) return null;
    const c = valorEn(cotizaciones, anio);
    const m = valorEn(mei, anio);
    return c === undefined || m === undefined || c === 0
      ? null
      : formatearPorcentaje(m / c, { decimales: 1 });
  };

  const ultimoAnio = ultimo?.anio;
  const saldoFinal = valorEn(columnaM4(d, COL4.saldoNoFinancieroPctPib), ultimoAnio ?? 0);
  const filasSaldo = DEFINICIONES_SALDO.map((s) => ({ ...s }));

  return (
    <>
      <h3 id="proy-fin-ingresos">Cotizaciones, MEI y gasto en pensiones</h3>
      <p>
        Las cotizaciones del modelo son las del último año observado escaladas con la masa de bases
        de cotización de {MODELO.m2}, más el Mecanismo de Equidad Intergeneracional (MEI) con su
        tipo legal. En la salida, el MEI forma parte de las cotizaciones: se dibuja aparte solo para
        ver su peso. El gasto es el del gráfico anterior. Todo en euros corrientes.
      </p>
      <GraficoProyeccion
        titulo={tituloConEscenario(
          d,
          'Cotizaciones, MEI y gasto en pensiones contributivas: euros corrientes, observado y proyección',
        )}
        descripcion="Cotizaciones sociales (que incluyen el MEI), cotización del MEI y gasto en pensiones contributivas. El MEI solo existe desde su creación, por eso su histórico es más corto. Unidad: miles de millones de euros."
        series={seriesIngresosYGasto(d)}
        unidadEje="Miles de millones de euros"
        decimales={1}
        decimalesEje={0}
        incluirCero
        alto={460}
        fuentes={[d.m4.dato, d.observado.cotizaciones.dato, d.observado.mei.dato]}
        nota="El histórico es la ejecución del presupuesto de la Seguridad Social (derechos y obligaciones reconocidos). En la ejecución, el MEI es una de las partidas del capítulo de cotizaciones sociales."
        comoLeerlo={
          <>
            <p>
              La línea de cotizaciones y la del gasto en pensiones permiten ver la distancia entre
              ambas cada año; el MEI es una parte de las cotizaciones con un tipo que aumenta
              durante varios años y después se mantiene hasta el último año de su vigencia en el
              modelo.
            </p>
            <p>
              No incluye el resto de gastos ni las transferencias del Estado: esos conceptos
              intervienen en las medidas de saldo del gráfico siguiente. Tampoco dice cómo se
              financiaría la diferencia entre ambas líneas.
            </p>
          </>
        }
      />
      {primero === undefined || ultimo === undefined ? null : (
        <p>
          En el modelo, el MEI representa {pesoMei(primero.anio)} de las cotizaciones en{' '}
          {primero.anio} y {pesoMei(ultimo.anio)} en {ultimo.anio}.
        </p>
      )}

      <h3 id="proy-fin-saldos">Saldos: tres medidas</h3>
      <p>
        El modelo ofrece tres medidas de saldo que se diferencian en qué ingresos y qué gastos
        incluyen. Se muestran en euros o en porcentaje del PIB.
      </p>
      <div className="proy-controles">
        <SegmentedPills
          leyenda="Unidad de los saldos"
          opciones={OPCIONES_UNIDAD}
          valor={unidad}
          onCambio={setUnidad}
        />
      </div>
      {enPib ? <NotaPib /> : null}
      <GraficoProyeccion
        titulo={tituloConEscenario(
          d,
          `Saldos del sistema: ${enPib ? 'porcentaje del PIB' : 'euros corrientes'}, observado y proyección`,
        )}
        descripcion={
          enPib
            ? 'Tres medidas de saldo del modelo y su equivalente observado, divididas por el PIB: el del INE en lo observado y el aproximado del modelo en lo proyectado. Se añade el balance del sistema de pensiones del Ageing Report, que es una proyección publicada. Unidad: porcentaje del PIB.'
            : 'Tres medidas de saldo del modelo y su equivalente calculado con la ejecución del presupuesto en lo observado. Unidad: miles de millones de euros corrientes.'
        }
        series={seriesSaldos(d, unidad)}
        unidadEje={enPib ? '% del PIB' : 'Miles de millones de euros'}
        decimales={enPib ? 2 : 1}
        decimalesEje={enPib ? 1 : 0}
        incluirCero
        alto={500}
        fuentes={[
          d.m4.dato,
          d.observado.saldoCotizacionesMenosPensiones.dato,
          d.observado.saldoSinTransferencias.dato,
          d.observado.saldoNoFinanciero.dato,
          ...(enPib ? [d.observado.pibIne.dato, d.ageing.saldoSistemaPensiones.dato] : []),
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
        nota="Lo observado de las tres medidas se calcula con la ejecución del presupuesto de la Seguridad Social con las mismas definiciones que usa el modelo en su calibración (cotizaciones, gasto en pensiones y obligaciones no financieras). No son idénticas a las definiciones de saldo de la página «Financiación y déficit»."
        comoLeerlo={
          <>
            <p>
              Cada color es una medida de saldo; el valor negativo indica que los gastos incluidos
              en esa medida superan a los ingresos incluidos. Las tres miden cosas distintas: añadir
              o quitar conceptos cambia el resultado aunque los datos de partida sean los mismos.
            </p>
            <p>
              No dice cuál es la medida correcta ni cómo se cubriría un saldo negativo: la
              financiación se trata en el apartado del Fondo de Reserva. La del Ageing Report, en
              porcentaje del PIB, es la que la descripción del modelo considera próxima a
              «cotizaciones menos pensiones», con una definición de gasto y de PIB propias.
            </p>
          </>
        }
      />
      {saldoFinal === undefined || ultimoAnio === undefined ? null : (
        <p>
          En {ultimoAnio}, el saldo no financiero del modelo es de {decimal2(saldoFinal)} % del PIB
          aproximado del modelo (la cifra de cada año y medida está en la tabla del gráfico).
        </p>
      )}
      <DataTable
        titulo="Definición de las tres medidas de saldo del modelo"
        columnas={[
          { clave: 'medida', titulo: 'Medida' },
          { clave: 'definicion', titulo: 'Qué incluye' },
        ]}
        filas={filasSaldo}
      />
      <SourceLine datos={[d.m4.dato]} />
      <p>
        Estas tres medidas no son idénticas a las que se muestran en la página{' '}
        <Link to="/financiacion-y-deficit">«Financiación y déficit»</Link> (saldo presupuestario no
        financiero de la Seguridad Social y necesidad de financiación en términos del sistema
        europeo de cuentas), que se calculan con las definiciones de sus fuentes. El saldo no
        financiero del modelo se calibra con la ejecución presupuestaria del último año observado,
        pero se calcula con la estructura simplificada del modelo.
      </p>
    </>
  );
}
