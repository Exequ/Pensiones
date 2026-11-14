import { GraficoSeries, type SerieGrafico } from '../historico/GraficoSeries';
import {
  diferencia,
  extremos,
  mayorVariacionInteranual,
  porcentajeDelPib,
  suma,
  variacion,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { entero, millonesEuros, variacionRelativa, ETIQUETA_CLASE } from '../historico/formatos';
import { datosFinanciacion } from '../historico/datos-financiacion';
import { UnidadFinanciera, type Unidad } from './unidad';

/** Ingresos y gastos no financieros, composición de los ingresos y gasto en pensiones por clase. */
export function Ejecucion({ unidad }: { unidad: Unidad }) {
  const d = datosFinanciacion();
  const { presupuesto, ejecucion, pib } = d;
  const u = UnidadFinanciera(unidad);
  const conv = (p: readonly PuntoAnual[]) =>
    unidad === 'porcentaje' ? porcentajeDelPib(p, pib.puntos) : p;
  const fuentesPib = unidad === 'porcentaje' ? [pib.dato] : [];

  const resto = diferencia(
    diferencia(presupuesto.derechosNoFinancieros.puntos, ejecucion.cotizaciones.puntos),
    presupuesto.transferenciasEstado.puntos,
  );
  const ingresos = presupuesto.derechosNoFinancieros.puntos;
  const gastos = presupuesto.obligacionesNoFinancieras.puntos;
  const { ultimo: ultimoIngreso } = extremos(ingresos);
  const gastoUltimo = gastos.find((p) => p.anio === ultimoIngreso.anio)?.valor ?? 0;
  const salto = mayorVariacionInteranual(presupuesto.transferenciasEstado.puntos);
  const cotUltimo = ejecucion.cotizaciones.puntos.at(-1);
  const transfUltimo = presupuesto.transferenciasEstado.puntos.at(-1);
  const vCot = variacion(ejecucion.cotizaciones.puntos);

  const claseSeries: SerieGrafico[] = (
    [
      ['jubilacion', ejecucion.jubilacion],
      ['viudedad', ejecucion.viudedad],
      ['incapacidad', ejecucion.incapacidad],
      ['orfandad', ejecucion.orfandad],
      ['favor-familiares', ejecucion.favorFamiliares],
    ] as const
  ).map(([clave, s], i) => ({
    clave,
    etiqueta: ETIQUETA_CLASE[clave] ?? clave,
    color: i,
    puntos: s.puntos,
  }));
  const sumaPensiones = ejecucion.sumaPensiones.puntos;
  const vPensiones = variacion(sumaPensiones);
  const complemento = ejecucion.complementoMinimos.puntos;
  const conComplemento = suma(sumaPensiones, complemento);
  const ultimoComplemento = complemento.at(-1);

  return (
    <section className="seccion prosa" aria-labelledby="ejecucion">
      <h2 id="ejecucion">Ingresos, gastos y gasto en pensiones</h2>
      <p>
        El Sistema de la Seguridad Social presenta su presupuesto con una clasificación económica de
        ingresos y gastos. Las cifras de cada año son las de la ejecución a fin de ejercicio:
        derechos reconocidos (ingresos) y obligaciones reconocidas (gastos) por operaciones no
        financieras, es decir, sin activos ni pasivos financieros.
      </p>

      <GraficoSeries
        titulo="Ingresos y gastos no financieros del Sistema"
        descripcion={`Derechos y obligaciones reconocidos por operaciones no financieras. Unidad: ${u.descripcion}.`}
        series={[
          { clave: 'ingresos', etiqueta: 'Ingresos no financieros', puntos: conv(ingresos) },
          { clave: 'gastos', etiqueta: 'Gastos no financieros', puntos: conv(gastos) },
        ]}
        unidadEje={u.eje}
        divisorEje={u.divisor}
        decimales={u.decimales}
        decimalesEje={u.decimalesEje}
        incluirCero
        fuentes={[
          presupuesto.derechosNoFinancieros.dato,
          presupuesto.obligacionesNoFinancieras.dato,
          ...fuentesPib,
        ]}
        nota="Capítulos de operaciones no financieras de la clasificación económica de la fuente; ejecución acumulada a fin de ejercicio."
        comoLeerlo={
          <>
            <p>
              En {ultimoIngreso.anio}, los ingresos no financieros reconocidos fueron de{' '}
              {millonesEuros(ultimoIngreso.valor)} y los gastos, de {millonesEuros(gastoUltimo)}. La
              distancia entre las dos líneas es el saldo no financiero, que se analiza en la sección
              siguiente.
            </p>
            <p>
              Los gastos incluyen las pensiones contributivas y también otras prestaciones
              (incapacidad temporal, nacimiento y cuidado de menor, prestaciones no contributivas,
              ingreso mínimo vital…). Esta gráfica no separa cuáles se financian con cotizaciones y
              cuáles con transferencias.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="De dónde proceden los ingresos no financieros"
        descripcion="Cotizaciones sociales, transferencias corrientes del Estado y resto de ingresos no financieros. Unidad: millones de euros."
        tipo="barras-apiladas"
        series={[
          {
            clave: 'cot',
            etiqueta: 'Cotizaciones sociales',
            puntos: ejecucion.cotizaciones.puntos,
          },
          {
            clave: 'estado',
            etiqueta: 'Transferencias corrientes del Estado',
            puntos: presupuesto.transferenciasEstado.puntos,
          },
          { clave: 'resto', etiqueta: 'Resto de ingresos no financieros', puntos: resto },
        ]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimalesEje={0}
        decimales={0}
        fuentes={[
          ejecucion.cotizaciones.dato,
          presupuesto.transferenciasEstado.dato,
          presupuesto.derechosNoFinancieros.dato,
        ]}
        nota="El resto se calcula como ingresos no financieros menos cotizaciones menos transferencias corrientes del Estado y organismos autónomos (dato derivado, confianza media): incluye otras transferencias, tasas, ingresos patrimoniales y de capital."
        comoLeerlo={
          <>
            <p>
              Las cotizaciones sociales pasan {entero(vCot.valorDesde)} millones de euros en{' '}
              {vCot.desde} a {entero(cotUltimo?.valor ?? 0)} en {vCot.hasta} (
              {variacionRelativa(vCot.relativa ?? 0)}). Las transferencias corrientes del Estado
              fueron de {millonesEuros(transfUltimo?.valor ?? 0)} en {transfUltimo?.anio ?? ''}.
              {salto === null
                ? ''
                : ` La mayor variación entre dos años consecutivos de las transferencias es la de ${salto.desde} a ${salto.hasta}: de ${entero(salto.valorDesde)} a ${entero(salto.valorHasta)} millones de euros.`}
            </p>
            <p>
              La gráfica muestra de dónde procede cada euro de ingreso, no por qué cambia su
              composición. Un cambio en la composición puede deberse a cambios de criterio de
              clasificación o de financiación entre años; el desglose de las transferencias por
              finalidad no está disponible en los datos descargados.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Gasto en pensiones contributivas por clase"
        descripcion="Obligaciones reconocidas por pensiones contributivas del Sistema, por clase. Unidad: miles de millones de euros."
        tipo="barras-apiladas"
        series={claseSeries}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimales={0}
        fuentes={ejecucion.sumaPensiones.dato}
        nota="No se incluyen Clases Pasivas ni pensiones no contributivas. El complemento a mínimos de las pensiones contributivas se registra en otra fila de la ejecución (capítulo de transferencias corrientes, apartado de pensiones no contributivas y complementos) y no está en estas barras."
        comoLeerlo={
          <>
            <p>
              El gasto en pensiones contributivas pasa {entero(vPensiones.valorDesde)} millones de
              euros en {vPensiones.desde} a {entero(vPensiones.valorHasta)} en {vPensiones.hasta} (
              {variacionRelativa(vPensiones.relativa ?? 0)}). El complemento a mínimos, que la
              ejecución anota aparte, fue de {millonesEuros(ultimoComplemento?.valor ?? 0)} en{' '}
              {ultimoComplemento?.anio ?? ''}; sumado a las pensiones, el total es de{' '}
              {millonesEuros(conComplemento.at(-1)?.valor ?? 0)}.
            </p>
            <p>
              Las obligaciones reconocidas son el gasto devengado del año, no la suma de las nóminas
              mensuales. El total depende de si se incluye o no el complemento a mínimos: ambas
              versiones se usan después para medir el gasto como porcentaje del PIB.
            </p>
          </>
        }
      />
    </section>
  );
}
