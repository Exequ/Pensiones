/**
 * Tarjetas de las afirmaciones sobre la hucha, la financiación y el saldo del sistema. Toda cifra
 * sale de /data a través de `datos-mitos.ts`; los textos no llevan dígitos.
 */
import type { Columna } from '../../components/DataTable';
import {
  escalar,
  extremos,
  valorEn,
  variacion,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { minimoPorValor } from '../../engine/mitos';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { GraficoSeries } from '../historico/GraficoSeries';
import {
  decimal2,
  millonesEuros,
  puntosAPorcentaje,
  variacionRelativa,
} from '../historico/formatos';
import { Afirmacion, type Mito } from './Afirmacion';
import { TablaConFuente } from './bloques';
import { datosMitos } from './datos-mitos';

interface TarjetaProps {
  readonly mito: Mito;
  readonly indice: number;
  readonly total: number;
}

type FilaTexto = Record<string, string | number | null>;

export function TarjetaHucha({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().hucha;
  const valor = d.valor.puntos;
  const { primero, ultimo } = extremos(valor);
  const mayorRetirada = minimoPorValor(d.disposiciones.puntos);
  const retiradas = escalar(d.disposiciones.puntos, -1);
  const ultimoMesesEjecucion = d.mesesEjecucion.at(-1);
  const ultimoMesesCatorce = d.mesesCatorcePagas.at(-1);
  const primerAnioLiquidacion = d.mesesLiquidacion[0]?.anio;

  const filasReferencias: FilaTexto[] = [
    { referencia: 'Valor máximo de la serie', anio: String(d.maximo.anio), valor: d.maximo.valor },
    { referencia: 'Último valor de la serie', anio: String(ultimo.anio), valor: ultimo.valor },
    {
      referencia: 'Mayor retirada anual',
      anio: String(mayorRetirada.anio),
      valor: -mayorRetirada.valor,
    },
  ];
  const columnasReferencias: Columna<FilaTexto>[] = [
    { clave: 'referencia', titulo: 'Referencia' },
    { clave: 'anio', titulo: 'Año' },
    { clave: 'valor', titulo: 'Millones de euros', tipo: 'numero', decimales: 0 },
  ];

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'hucha' }, { slug: 'proyecciones' }]}
      medible={
        <p>
          Los datos permiten ver cuánto vale el Fondo de Reserva al cierre de cada año, cuánto se
          retira de él cada año y a cuántos meses de gasto en pensiones contributivas equivale su
          valor. «Vaciado» puede referirse al valor frente a su máximo, al saldo actual o a los
          meses de gasto que cubre: se muestran las tres referencias y no se elige ninguna. El valor
          es el que publican los informes a las Cortes, a precio de adquisición.
        </p>
      }
    >
      <GraficoSeries
        titulo="Valor del Fondo de Reserva al cierre de cada año"
        descripcion="Valor a precio de adquisición. Unidad: miles de millones de euros."
        series={[{ clave: 'valor', etiqueta: 'Valor del Fondo', puntos: valor }]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        incluirCero
        fuentes={d.valor.dato}
        comoLeerlo={
          <>
            <p>
              El valor pasa de {millonesEuros(primero.valor)} en {primero.anio} a un máximo de{' '}
              {millonesEuros(d.maximo.valor)} en {d.maximo.anio} y es de{' '}
              {millonesEuros(ultimo.valor)} en {ultimo.anio}.
            </p>
            <p>
              Mide el valor acumulado a precio de adquisición, no a precio de mercado. No dice si
              ese nivel es o no suficiente: no hay en los datos un criterio de suficiencia ni los
              pagos futuros previstos.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Importe retirado del Fondo de Reserva en cada año"
        descripcion="Disposiciones anuales, derivadas de la diferencia entre acumulados. Unidad: miles de millones de euros."
        tipo="barras-agrupadas"
        series={[{ clave: 'retirada', etiqueta: 'Importe retirado', puntos: retiradas }]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimalesEje={0}
        fuentes={d.disposiciones.dato}
        nota="Dato derivado: cada cifra anual es la diferencia entre dos años consecutivos de las disposiciones acumuladas publicadas. Los años sin barra son años sin retirada."
        comoLeerlo={
          <p>
            La mayor retirada anual de la serie es de {millonesEuros(-mayorRetirada.valor)} en{' '}
            {mayorRetirada.anio}. La gráfica no dice para qué se retiró ni cómo se usó el dinero
            dentro del sistema.
          </p>
        }
      />

      <GraficoSeries
        titulo="Meses de gasto en pensiones contributivas que equivale el valor del Fondo"
        descripcion="Valor del Fondo entre la doceava parte del gasto anual. Unidad: meses de gasto."
        series={[
          {
            clave: 'liquidacion',
            etiqueta: 'Referencia (liquidaciones)',
            puntos: d.mesesLiquidacion,
          },
          { clave: 'ejecucion', etiqueta: 'Referencia (ejecución)', puntos: d.mesesEjecucion },
          { clave: 'catorce', etiqueta: 'Contraste (catorce pagas)', puntos: d.mesesCatorcePagas },
        ]}
        unidadEje="Meses de gasto"
        decimales={2}
        decimalesEje={1}
        incluirCero
        fuentes={d.datosMeses}
        nota={
          <>
            Referencia: obligaciones reconocidas de las pensiones contributivas con el complemento a
            mínimos, de las liquidaciones del presupuesto (hasta el último año con ese documento) y
            de la ejecución del presupuesto (después); son dos documentos de origen y no se unen en
            una sola línea. Contraste: pensiones en vigor por su pensión media en catorce pagas. Es
            el mismo cálculo que en la página «La hucha». Los años anteriores a{' '}
            {primerAnioLiquidacion} no se calculan: no hay serie de gasto en los datos.
          </>
        }
        comoLeerlo={
          <>
            {ultimoMesesEjecucion === undefined || ultimoMesesCatorce === undefined ? null : (
              <p>
                En {ultimoMesesEjecucion.anio}, el valor del Fondo equivale a{' '}
                {decimal2(ultimoMesesEjecucion.valor)} meses de gasto con la referencia de la
                ejecución y a {decimal2(ultimoMesesCatorce.valor)} con el contraste de catorce
                pagas.
              </p>
            )}
            <p>
              Mide cuánto tiempo del gasto actual en pensiones contributivas cubriría el valor del
              Fondo. No dice si esa cobertura es la adecuada ni qué parte del gasto debería cubrirse
              con el Fondo.
            </p>
          </>
        }
      />

      <TablaConFuente
        titulo="Referencias del valor y de las retiradas del Fondo"
        columnas={columnasReferencias}
        filas={filasReferencias}
        fuentes={[d.valor.dato, d.disposiciones.dato]}
      />
      <ComoLeerlo>
        <p>
          La tabla reúne las tres referencias con las que puede formularse «vaciado»: el máximo del
          valor, el último valor y la mayor retirada. Cada una responde a una pregunta distinta y
          ninguna es, por sí misma, la única forma de formularlo. «Reservas en sentido amplio»
          (otros activos de la Seguridad Social) no se puede mostrar: en los datos solo está el
          Fondo de Reserva.
        </p>
      </ComoLeerlo>
    </Afirmacion>
  );
}

export function TarjetaImpuestos({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().impuestos;
  const ultimoAnio = d.transferencias.puntos.at(-1);
  const variacionTransferencias = variacion(d.transferencias.puntos);
  const prestamo = d.prestamoMaximo;

  const aniosComunes = d.proporcionCotizaciones.map((p) => p.anio);
  const filasPeso: FilaTexto[] = aniosComunes.map((anio) => ({
    anio: String(anio),
    cotizaciones: valorEn(d.proporcionCotizaciones, anio) ?? null,
    transferencias: valorEn(d.proporcionTransferencias, anio) ?? null,
  }));
  const columnasPeso: Columna<FilaTexto>[] = [
    { clave: 'anio', titulo: 'Año' },
    { clave: 'cotizaciones', titulo: 'Cotizaciones sociales', tipo: 'porcentaje', decimales: 1 },
    {
      clave: 'transferencias',
      titulo: 'Transferencias corrientes del Estado',
      tipo: 'porcentaje',
      decimales: 1,
    },
  ];

  const partidas: FilaTexto[] = [
    {
      partida:
        'Transferencia prevista en el proyecto de presupuestos para cubrir gastos «impropios»',
      periodo: d.transferenciaPrevistaPge.periodo,
      importe: d.transferenciaPrevistaPge.valor,
      naturaleza: d.transferenciaPrevistaPge.notas,
    },
    ...(prestamo === undefined
      ? []
      : [
          {
            partida: 'Préstamo del Estado: importe máximo autorizable',
            periodo: prestamo.periodo,
            importe: typeof prestamo.valor === 'number' ? prestamo.valor : null,
            naturaleza: `Operación financiera, no transferencia corriente. ${prestamo.notas}`,
          },
        ]),
  ];
  const columnasPartidas: Columna<FilaTexto>[] = [
    { clave: 'partida', titulo: 'Partida' },
    { clave: 'periodo', titulo: 'Año' },
    { clave: 'importe', titulo: 'Millones de euros', tipo: 'numero', decimales: 0 },
    { clave: 'naturaleza', titulo: 'Qué es, según la fuente' },
  ];

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'financiacion-y-deficit' }, { slug: 'hucha' }]}
      medible={
        <p>
          Los datos permiten comparar, año a año, los ingresos por cotizaciones sociales con las
          transferencias corrientes del Estado en la ejecución del presupuesto de la Seguridad
          Social, y ver otras partidas que se asocian a la financiación con impuestos (gastos
          «impropios» y préstamos), que son operaciones de naturaleza distinta y no se suman. La
          ejecución no desglosa las transferencias por finalidad: no se sabe qué parte de las
          pensiones contributivas financian.
        </p>
      }
    >
      <GraficoSeries
        titulo="Cotizaciones sociales y transferencias corrientes del Estado"
        descripcion="Derechos reconocidos en el presupuesto del Sistema de la Seguridad Social. Unidad: miles de millones de euros."
        tipo="barras-agrupadas"
        series={[
          {
            clave: 'cotizaciones',
            etiqueta: 'Cotizaciones sociales',
            puntos: d.cotizaciones.puntos,
          },
          {
            clave: 'transferencias',
            etiqueta: 'Transferencias corrientes del Estado',
            puntos: d.transferencias.puntos,
          },
        ]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        fuentes={[d.cotizaciones.dato, d.transferencias.dato]}
        nota="Las transferencias son las del Estado y organismos autónomos a la Seguridad Social, clasificadas por origen, no por finalidad."
        comoLeerlo={
          <>
            <p>
              Las transferencias corrientes del Estado pasan de{' '}
              {millonesEuros(variacionTransferencias.valorDesde)} en {variacionTransferencias.desde}{' '}
              a {millonesEuros(variacionTransferencias.valorHasta)} en{' '}
              {variacionTransferencias.hasta}
              {variacionTransferencias.relativa === null
                ? ''
                : ` (${variacionRelativa(variacionTransferencias.relativa)})`}
              .
            </p>
            <p>
              Mide de dónde vienen los ingresos del sistema según el origen del dinero. No dice qué
              gasto financia cada ingreso: eso exigiría el desglose por finalidad, que no está en
              los datos.
            </p>
          </>
        }
      />

      <TablaConFuente
        titulo="Peso de cada ingreso sobre los ingresos no financieros"
        columnas={columnasPeso}
        filas={filasPeso}
        fuentes={[d.cotizaciones.dato, d.transferencias.dato, d.derechos.dato]}
        pie="Cálculo propio: cada ingreso dividido por los derechos reconocidos por operaciones no financieras del mismo año. Solo se muestran los años en que están las tres series."
      />
      <ComoLeerlo>
        <p>
          El peso se calcula sobre todos los ingresos no financieros del sistema, no solo sobre los
          que financian pensiones contributivas. Los ingresos por cotizaciones y las transferencias
          no suman el cien por cien: el resto de ingresos queda fuera de ambas columnas.
        </p>
        <p>
          {ultimoAnio === undefined
            ? ''
            : `El último año con las tres series es ${aniosComunes.at(-1)}. `}
          Qué parte de las pensiones contributivas se paga con impuestos depende de cómo se
          atribuyan los complementos a mínimos y las reducciones de cuotas; esa atribución no se
          puede hacer con los datos consultados.
        </p>
      </ComoLeerlo>

      <TablaConFuente
        titulo="Otras partidas que citan las fuentes, de naturaleza distinta"
        columnas={columnasPartidas}
        filas={partidas}
        fuentes={[
          d.transferenciaPrevistaPge.dato,
          ...(prestamo === undefined ? [] : [prestamo.dato]),
        ]}
        pie="No se suman entre sí ni a las series de ejecución: son una previsión de un proyecto de presupuestos y la autorización de una operación financiera."
      />
    </Afirmacion>
  );
}

export function TarjetaSaldo({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().saldo;
  const [mNoFin, mTotal, mSec] = d.medidas;
  const ultimoAnio = d.noFinanciero.puntos.at(-1)?.anio ?? 0;
  const enUltimo = (puntos: readonly PuntoAnual[]) => valorEn(puntos, ultimoAnio);

  const anios = d.noFinanciero.puntos.map((p) => p.anio);
  const filasDiferencias: FilaTexto[] = anios.map((anio) => {
    const fila: FilaTexto = { anio: String(anio) };
    d.diferencias.forEach((x, i) => {
      fila[`d${i}`] = valorEn(x.puntos, anio) ?? null;
    });
    return fila;
  });
  const columnasDiferencias: Columna<FilaTexto>[] = [
    { clave: 'anio', titulo: 'Año' },
    ...d.diferencias.map((x, i) => ({
      clave: `d${i}`,
      titulo: `Saldo ${x.etiqueta}`,
      tipo: 'numero' as const,
      decimales: 0,
    })),
  ];

  const noFin = enUltimo(d.noFinanciero.puntos);
  const total_ = enUltimo(d.total.puntos);
  const sec = enUltimo(d.sec.puntos);

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'financiacion-y-deficit' }, { slug: 'hucha' }, { slug: 'proyecciones' }]}
      medible={
        <p>
          Los datos permiten calcular tres saldos con definiciones distintas: el saldo
          presupuestario de operaciones no financieras, el saldo presupuestario total (que añade las
          operaciones financieras, como los préstamos) y la capacidad o necesidad de financiación de
          la contabilidad nacional. El signo y la cuantía cambian con la definición y con el año.
          Aquí se muestran las tres medidas lado a lado, con su definición, sin elegir ninguna.
        </p>
      }
    >
      <GraficoSeries
        titulo="Tres medidas del saldo del sistema de la Seguridad Social"
        descripcion="Saldo anual por definición. Unidad: millones de euros."
        series={[
          { clave: 'nofin', etiqueta: mNoFin?.etiqueta ?? '', puntos: d.noFinanciero.puntos },
          { clave: 'total', etiqueta: mTotal?.etiqueta ?? '', puntos: d.total.puntos },
          { clave: 'sec', etiqueta: mSec?.etiqueta ?? '', puntos: mSec?.puntos ?? [] },
        ]}
        unidadEje="Millones de euros"
        decimalesEje={0}
        alto={380}
        fuentes={[d.noFinanciero.dato, d.total.dato, d.sec.dato]}
        nota="Los saldos presupuestarios son los del presupuesto del Sistema de la Seguridad Social; el SEC es la capacidad o necesidad de financiación del subsector de fondos de la Seguridad Social en contabilidad nacional, con criterio de devengo. Las tres medidas tienen perímetros y criterios distintos y no están conciliadas."
        comoLeerlo={
          <>
            <p>
              En {ultimoAnio}, el saldo presupuestario no financiero es de{' '}
              {noFin === undefined ? '—' : millonesEuros(noFin)}, el saldo presupuestario total es
              de {total_ === undefined ? '—' : millonesEuros(total_)} y la capacidad o necesidad de
              financiación en contabilidad nacional es de{' '}
              {sec === undefined ? '—' : millonesEuros(sec)}.
            </p>
            <p>
              Cada medida responde a una pregunta distinta: qué resulta de las operaciones no
              financieras, qué resulta al añadir las financieras y cómo queda el subsector en
              contabilidad nacional. Ninguna de las tres es el «saldo contributivo» (cotizaciones
              menos prestaciones contributivas sin transferencias), que no se puede calcular con los
              datos consultados.
            </p>
          </>
        }
      />

      <TablaConFuente
        titulo="Diferencia entre las medidas del saldo, año a año"
        columnas={columnasDiferencias}
        filas={filasDiferencias}
        fuentes={[d.noFinanciero.dato, d.total.dato, d.sec.dato]}
        pie="Cálculo propio: resta, año a año, de dos de las medidas anteriores. No es una conciliación: no se explica en los datos qué parte de cada diferencia se debe al criterio de caja o devengo, al perímetro o al tratamiento de los préstamos."
      />
      <ComoLeerlo>
        <p>
          La diferencia entre dos medidas es aritmética sobre las cifras publicadas. Una diferencia
          no indica cuál de las dos medidas «describe mejor» el sistema: indica que no miden lo
          mismo.
        </p>
      </ComoLeerlo>

      <p>
        Los datos recogen también una previsión de una fuente institucional que estimaba para{' '}
        {d.deficitEstimado2023.periodo} un déficit de {millonesEuros(d.deficitEstimado2023.valor)}.{' '}
        {d.deficitEstimado2023.notas}
      </p>
      <p className="texto-interfaz">
        La capacidad o necesidad de financiación en contabilidad nacional equivale en {ultimoAnio} a{' '}
        {puntosAPorcentaje(valorEn(d.secPib.puntos, ultimoAnio) ?? 0, 1)} del PIB.
      </p>
    </Afirmacion>
  );
}
