import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { extremos } from '../../engine/series-historicas';
import { acumuladaDesde } from '../../engine/transferencias';
import { datosHucha } from '../historico/datos-hucha';
import { GraficoSeries } from '../historico/GraficoSeries';
import { millonesEuros } from '../historico/formatos';
import { ID } from './ids-datos';
import { anioDeId, periodoDeId } from './rango';
import { SelectorAnioInicio } from './SelectorAnioInicio';

/** «a. Transferencias del Estado a la Seguridad Social»: flujo anual, trimestral y acumulado. */
export function SeccionTransferencias() {
  const d = datosHucha();
  const t = d.transferencias;
  const anuales = t.delEstado.puntos;
  const { primero, ultimo } = extremos(anuales);
  const anios = anuales.map((p) => p.anio);
  const [anioInicio, setAnioInicio] = useState(primero.anio);
  const acumulada = acumuladaDesde(anuales, anioInicio);
  const acumuladaUltima = acumulada.at(-1)?.valor ?? 0;
  const acumuladaDesdePrimero = acumuladaDesde(anuales, primero.anio).at(-1)?.valor ?? 0;
  const acumuladaDesdeUltimo = acumuladaDesde(anuales, ultimo.anio).at(-1)?.valor ?? 0;
  const mayorAnual = anuales.reduce((m, p) => (p.valor > m.valor ? p : m));

  // Trimestres con índice 0, 1, 2… y etiqueta «AAAA-Tn» (eje de categorías de GraficoSeries).
  const trimestres = t.flujosTrimestrales.filter((p) => p.anio >= primero.anio + 1);
  const etiquetasTrimestre = trimestres.map((p) => `${p.anio}-T${p.trimestre}`);
  const puntosTrimestre = trimestres.map((p, i) => ({ anio: i, valor: p.valor }));
  const primerTrimestre = etiquetasTrimestre[0] ?? '';
  const ultimoTrimestre = etiquetasTrimestre.at(-1) ?? '';
  const mayorTrimestre = trimestres.reduce((m, p) => (p.valor > m.valor ? p : m));

  const cifra = (id: string): number => {
    const v = d.tribunal[id]?.valor;
    if (typeof v !== 'number') throw new Error(`Falta la cifra «${id}» del Tribunal de Cuentas`);
    return v;
  };
  const filasFinalidad = [
    {
      concepto: 'Transferencias corrientes del Estado, total del periodo',
      periodo: `Suma de ${periodoDeId(ID.tcTransferenciasTotal)}`,
      importe: cifra(ID.tcTransferenciasTotal),
    },
    {
      concepto: 'De ellas, con finalidad de apoyar el equilibrio presupuestario',
      periodo: `Suma de ${periodoDeId(ID.tcTransferenciasEquilibrio)}`,
      importe: cifra(ID.tcTransferenciasEquilibrio),
    },
    {
      concepto:
        'De ellas, para equilibrar el impacto de la covid en las cuentas de la Seguridad Social',
      periodo: `Dato de ${anioDeId(ID.tcCovidPrimerAnio)}`,
      importe: cifra(ID.tcCovidPrimerAnio),
    },
    {
      concepto:
        'De ellas, para equilibrar el impacto de la covid en las cuentas de la Seguridad Social',
      periodo: `Dato de ${anioDeId(ID.tcCovidSegundoAnio)}`,
      importe: cifra(ID.tcCovidSegundoAnio),
    },
    {
      concepto:
        'Basadas en la modificación del texto refundido por la ley de presupuestos de ese año',
      periodo: `Suma de ${periodoDeId(ID.tcTransferenciasImpropios)}`,
      importe: cifra(ID.tcTransferenciasImpropios),
    },
    {
      concepto: 'Aportaciones del Estado de naturaleza no contributiva (citadas aparte)',
      periodo: `Dato de ${anioDeId(ID.tcAportacionesNoContributivas)}`,
      importe: cifra(ID.tcAportacionesNoContributivas),
    },
  ];
  const datosFinalidad: Dato[] = [
    ID.tcTransferenciasTotal,
    ID.tcTransferenciasEquilibrio,
    ID.tcCovidPrimerAnio,
    ID.tcCovidSegundoAnio,
    ID.tcTransferenciasImpropios,
    ID.tcAportacionesNoContributivas,
  ].flatMap((id) => (d.tribunal[id] === undefined ? [] : [d.tribunal[id].dato]));
  const ultimaCapital = t.capital.puntos.at(-1);

  return (
    <section className="seccion prosa" aria-labelledby="transferencias">
      <h2 id="transferencias">Las transferencias del Estado a la Seguridad Social en el tiempo</h2>
      <p>
        Las transferencias son aportaciones del presupuesto del Estado al de la Seguridad Social. La
        cifra que se usa aquí son los derechos reconocidos netos de la ejecución del presupuesto de
        la Seguridad Social por transferencias corrientes cuyo origen es el Estado y sus organismos
        autónomos. Los datos de la fuente son anuales y, dentro de cada año, acumulados a la fecha
        de cierre de cada trimestre; los flujos trimestrales de esta página son la diferencia entre
        dos acumulados consecutivos. En las fuentes descargadas no consta la pauta con que el Estado
        efectúa las transferencias (mensual, trimestral u otra), por lo que esta página no la
        afirma.
      </p>

      <GraficoSeries
        titulo="Transferencias corrientes del Estado y organismos autónomos a la Seguridad Social, por año"
        descripcion="Derechos reconocidos netos de cada año. Unidad: miles de millones de euros."
        tipo="barras-apiladas"
        series={[{ clave: 'flujo', etiqueta: 'Transferencias del año', puntos: anuales }]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimales={0}
        decimalesEje={0}
        fuentes={t.delEstado.dato}
        nota={
          <>
            Definición: transferencias corrientes con origen en el Estado y sus organismos
            autónomos. No incluye los préstamos del Estado (que son pasivos financieros) ni las
            transferencias de capital: la fuente solo da estas últimas en total y de cualquier
            origen
            {ultimaCapital === undefined
              ? ''
              : `, con ${millonesEuros(ultimaCapital.valor)} en ${ultimaCapital.anio}`}
            . El primer año de la serie es {primero.anio}: es el primero con datos en las
            liquidaciones descargadas.
          </>
        }
        comoLeerlo={
          <>
            <p>
              Las transferencias pasan de {millonesEuros(primero.valor)} en {primero.anio} a{' '}
              {millonesEuros(ultimo.valor)} en {ultimo.anio}; el mayor importe anual de la serie es
              el de {mayorAnual.anio}, con {millonesEuros(mayorAnual.valor)}.
            </p>
            <p>
              El gráfico no separa las transferencias por finalidad ni explica por qué cambia el
              importe de un año a otro. Lo que se conoce por finalidad, según el Tribunal de
              Cuentas, está en la tabla de más abajo.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Transferencias corrientes del Estado y organismos autónomos, por trimestre"
        descripcion="Flujo de cada trimestre: acumulado del año a su cierre menos el acumulado del trimestre anterior. Unidad: miles de millones de euros."
        series={[
          { clave: 'trimestre', etiqueta: 'Transferencias del trimestre', puntos: puntosTrimestre },
        ]}
        etiquetasX={etiquetasTrimestre}
        tituloX="Trimestre"
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimales={0}
        decimalesEje={0}
        incluirCero
        fuentes={t.datoTrimestral}
        nota="Dato derivado (confianza media): diferencia entre acumulados de la ejecución del presupuesto. El primer trimestre de cada año es su propio acumulado. Los acumulados de los trimestres anteriores a un año completo proceden de la columna comparativa del fichero del año siguiente."
        comoLeerlo={
          <>
            <p>
              Entre {primerTrimestre} y {ultimoTrimestre} el trimestre con más transferencias es{' '}
              {etiquetasTrimestre[trimestres.indexOf(mayorTrimestre)] ?? ''}, con{' '}
              {millonesEuros(mayorTrimestre.valor)}.
            </p>
            <p>
              El gráfico muestra cuándo se reconocen los derechos en la ejecución, no cuándo se
              efectúa cada pago del Estado, y no explica la pauta de los trimestres.
            </p>
          </>
        }
      />

      <SelectorAnioInicio
        etiqueta="Año de inicio de la suma acumulada"
        ayuda="La suma acumulada depende del año en que se empiece a contar."
        anios={anios}
        valor={anioInicio}
        onCambio={setAnioInicio}
      />
      <GraficoSeries
        titulo={`Transferencias acumuladas desde ${anioInicio}`}
        descripcion={`Suma de las transferencias anuales desde ${anioInicio} hasta cada año, ambos incluidos. Unidad: miles de millones de euros.`}
        series={[
          { clave: 'acumulada', etiqueta: `Acumuladas desde ${anioInicio}`, puntos: acumulada },
        ]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimales={0}
        decimalesEje={0}
        incluirCero
        fuentes={t.delEstado.dato}
        nota={`Dato derivado (confianza media): suma de las transferencias anuales del gráfico anterior. Año de inicio por defecto: ${primero.anio}, el primero con datos. Antes de ese año no hay datos en las liquidaciones descargadas.`}
        comoLeerlo={
          <>
            <p>
              Contando desde {anioInicio}, la suma acumulada llega a{' '}
              {millonesEuros(acumuladaUltima)} en {ultimo.anio}. Contando desde {primero.anio} sería
              de {millonesEuros(acumuladaDesdePrimero)}; contando desde {ultimo.anio}, de{' '}
              {millonesEuros(acumuladaDesdeUltimo)}.
            </p>
            <p>
              La cifra final depende del año de inicio y no es la suma «de toda la historia»: no hay
              datos anteriores a {primero.anio} en esta serie. Tampoco distingue la finalidad de las
              transferencias.
            </p>
          </>
        }
      />

      <h3 id="finalidad">Lo que se conoce por finalidad</h3>
      <p>
        Los ficheros de la ejecución no separan las transferencias por finalidad. El Tribunal de
        Cuentas sí da algunas cifras agregadas en su declaración sobre la Cuenta General del Estado
        de {anioDeId(ID.tcSaldoDeuda)}, con un concepto de «transferencias corrientes aportadas por
        el Estado» que no coincide con el de la ejecución (véase la sección anterior). El desglose
        anual por finalidad figura como pendiente de datos.
      </p>
      <div className="hist-definiciones">
        <DataTable
          titulo="Transferencias corrientes del Estado por finalidad, según el Tribunal de Cuentas"
          columnas={[
            { clave: 'concepto', titulo: 'Concepto' },
            { clave: 'periodo', titulo: 'Periodo' },
            {
              clave: 'importe',
              titulo: 'Importe (millones de euros)',
              tipo: 'numero',
              decimales: 1,
            },
          ]}
          filas={filasFinalidad}
        />
        <SourceLine datos={datosFinalidad} />
        <p className="hucha-pendiente">
          Pendiente de datos: desglose anual de las transferencias por finalidad (complementos a
          mínimos, otras partidas), transferencias anteriores a {primero.anio} y transferencias de
          capital por origen.
        </p>
      </div>
    </section>
  );
}
