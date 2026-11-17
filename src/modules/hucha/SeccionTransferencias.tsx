import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import type { Dato } from '../../engine/esquema-datos';
import { partirPorTramos } from '../../engine/series-empalme';
import { extremos } from '../../engine/series-historicas';
import { acumuladaDesde } from '../../engine/transferencias';
import { datosHucha } from '../historico/datos-hucha';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { GraficoSeries } from '../historico/GraficoSeries';
import { millonesEuros } from '../historico/formatos';
import { ID, ID23 } from './ids-datos';
import { anioDeId, periodoDeId } from './rango';
import { SelectorAnioInicio } from './SelectorAnioInicio';
import { etiquetaTramo } from './tramos';

/** «a. Transferencias del Estado a la Seguridad Social»: flujo anual, trimestral y acumulado. */
export function SeccionTransferencias() {
  const d = datosHucha();
  const t = d.transferencias;
  // Transferencias anuales empalmadas con ruptura de serie: liquidación (PDF) y ejecución.
  const empalme = d.transferenciasAnuales;
  const anuales = empalme.puntos;
  const porTramo = partirPorTramos(anuales, empalme);
  const puntosLiquidacion = porTramo.get('liquidacion') ?? [];
  const puntosEjecucion = porTramo.get('ejecucion') ?? [];
  const etiquetaLiquidacion = etiquetaTramo('Liquidación', puntosLiquidacion);
  const etiquetaEjecucion = etiquetaTramo('Ejecución', puntosEjecucion);
  const { primero, ultimo } = extremos(anuales);
  const anioRuptura = puntosEjecucion[0]?.anio ?? ultimo.anio;
  const ultimaLiquidacion = puntosLiquidacion.at(-1)?.anio ?? primero.anio;
  const primeroEjecucion = extremos(puntosEjecucion).primero;
  const anios = anuales.map((p) => p.anio);
  const [anioInicio, setAnioInicio] = useState(primero.anio);
  const acumulada = acumuladaDesde(anuales, anioInicio);
  const acumuladaPorTramo = partirPorTramos(acumulada, empalme);
  const acumuladaUltima = acumulada.at(-1)?.valor ?? 0;
  const acumuladaDesdePrimero = acumuladaDesde(anuales, primero.anio).at(-1)?.valor ?? 0;
  const acumuladaDesdeUltimo = acumuladaDesde(anuales, ultimo.anio).at(-1)?.valor ?? 0;
  const mayorAnual = anuales.reduce((m, p) => (p.valor > m.valor ? p : m));

  // Trimestres con índice 0, 1, 2… y etiqueta «AAAA-Tn» (eje de categorías de GraficoSeries).
  const trimestres = t.flujosTrimestrales.filter((p) => p.anio >= primeroEjecucion.anio + 1);
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
  const cifra23 = (id: string): number => {
    const v = d.tribunal2023[id]?.valor;
    if (typeof v !== 'number') throw new Error(`Falta la cifra «${id}» del Tribunal de Cuentas`);
    return v;
  };
  const declaracion22 = `Declaración sobre la Cuenta General de ${anioDeId(ID.tcSaldoDeuda)}`;
  const declaracion23 = `Declaración sobre la Cuenta General de ${anioDeId(ID23.saldoDeuda)}`;
  const filasFinalidad = [
    {
      declaracion: declaracion22,
      concepto: 'Transferencias corrientes del Estado, total del periodo',
      periodo: `Suma de ${periodoDeId(ID.tcTransferenciasTotal)}`,
      importe: cifra(ID.tcTransferenciasTotal),
    },
    {
      declaracion: declaracion22,
      concepto: 'De ellas, con finalidad de apoyar el equilibrio presupuestario',
      periodo: `Suma de ${periodoDeId(ID.tcTransferenciasEquilibrio)}`,
      importe: cifra(ID.tcTransferenciasEquilibrio),
    },
    {
      declaracion: declaracion22,
      concepto:
        'De ellas, para equilibrar el impacto de la covid en las cuentas de la Seguridad Social',
      periodo: `Dato de ${anioDeId(ID.tcCovidPrimerAnio)}`,
      importe: cifra(ID.tcCovidPrimerAnio),
    },
    {
      declaracion: declaracion22,
      concepto:
        'De ellas, para equilibrar el impacto de la covid en las cuentas de la Seguridad Social',
      periodo: `Dato de ${anioDeId(ID.tcCovidSegundoAnio)}`,
      importe: cifra(ID.tcCovidSegundoAnio),
    },
    {
      declaracion: declaracion22,
      concepto:
        'Basadas en la modificación del texto refundido por la ley de presupuestos de ese año',
      periodo: `Suma de ${periodoDeId(ID.tcTransferenciasImpropios)}`,
      importe: cifra(ID.tcTransferenciasImpropios),
    },
    {
      declaracion: declaracion22,
      concepto: 'Aportaciones del Estado de naturaleza no contributiva (citadas aparte)',
      periodo: `Dato de ${anioDeId(ID.tcAportacionesNoContributivas)}`,
      importe: cifra(ID.tcAportacionesNoContributivas),
    },
    {
      declaracion: declaracion23,
      concepto: 'Transferencias corrientes del Estado, total del periodo',
      periodo: `Suma de ${periodoDeId(ID23.transferenciasTotal)}`,
      importe: cifra23(ID23.transferenciasTotal),
    },
    {
      declaracion: declaracion23,
      concepto: 'De ellas, con finalidad de apoyar el equilibrio presupuestario',
      periodo: `Suma de ${periodoDeId(ID23.equilibrio)}`,
      importe: cifra23(ID23.equilibrio),
    },
    {
      declaracion: declaracion23,
      concepto:
        'De ellas, para equilibrar el impacto de la covid en las cuentas de la Seguridad Social',
      periodo: `Suma de ${periodoDeId(ID23.covid)}`,
      importe: cifra23(ID23.covid),
    },
    {
      declaracion: declaracion23,
      concepto:
        'Basadas en la modificación del texto refundido por la ley de presupuestos de ese año',
      periodo: `Suma de ${periodoDeId(ID23.baseNormativa)}`,
      importe: cifra23(ID23.baseNormativa),
    },
    {
      declaracion: declaracion23,
      concepto: 'Transferencias recibidas con idéntica finalidad, por prórroga de la ley anterior',
      periodo: `Dato de ${anioDeId(ID23.transferenciasPosteriores)}`,
      importe: cifra23(ID23.transferenciasPosteriores),
    },
    {
      declaracion: declaracion23,
      concepto: 'Aportaciones del Estado de naturaleza no contributiva (citadas aparte)',
      periodo: `Dato de ${anioDeId(ID23.aportacionesNoContributivas)}`,
      importe: cifra23(ID23.aportacionesNoContributivas),
    },
  ];
  const datosFinalidad: Dato[] = [
    ...[
      ID.tcTransferenciasTotal,
      ID.tcTransferenciasEquilibrio,
      ID.tcCovidPrimerAnio,
      ID.tcCovidSegundoAnio,
      ID.tcTransferenciasImpropios,
      ID.tcAportacionesNoContributivas,
    ].flatMap((id) => (d.tribunal[id] === undefined ? [] : [d.tribunal[id].dato])),
    ...[
      ID23.transferenciasTotal,
      ID23.equilibrio,
      ID23.covid,
      ID23.baseNormativa,
      ID23.transferenciasPosteriores,
      ID23.aportacionesNoContributivas,
    ].flatMap((id) => (d.tribunal2023[id] === undefined ? [] : [d.tribunal2023[id].dato])),
  ];
  const ultimaCapital = t.capital.puntos.at(-1);

  return (
    <section className="seccion prosa" aria-labelledby="transferencias">
      <h2 id="transferencias">Las transferencias del Estado a la Seguridad Social en el tiempo</h2>
      <p>
        Las transferencias son aportaciones del presupuesto del Estado al de la Seguridad Social. La
        cifra que se usa aquí son los derechos reconocidos netos de transferencias corrientes cuyo
        origen es el Estado y sus organismos autónomos. Proceden de dos documentos de la Seguridad
        Social: las liquidaciones del presupuesto de cada ejercicio (en PDF) y la ejecución del
        presupuesto, de la que se toma la cifra de cierre de cada año. Los datos de la ejecución son
        anuales y, dentro de cada año, acumulados a la fecha de cierre de cada trimestre; los flujos
        trimestrales de esta página son la diferencia entre dos acumulados consecutivos. En las
        fuentes consultadas no consta la pauta con que el Estado efectúa las transferencias
        (mensual, trimestral u otra), por lo que esta página no la afirma.
      </p>
      <p className="hist-aviso">
        Ruptura de serie: hasta {ultimaLiquidacion} la cifra es la de la liquidación y desde{' '}
        {anioRuptura}, la de la ejecución. Los dos documentos rotulan la partida de forma distinta
        («Del Estado» más «De Organismos Autónomos administrativos» en la liquidación; «Del Estado y
        Org. Autónomos» en la ejecución) y no comparten ningún ejercicio, de modo que no se ha
        podido contrastar que midan lo mismo. Por eso se dibujan y se tabulan como dos tramos, y los
        cálculos que cruzan la ruptura lo indican.
      </p>

      <GraficoSeries
        titulo="Transferencias corrientes del Estado y organismos autónomos a la Seguridad Social, por año"
        descripcion="Derechos reconocidos netos de cada año, en dos tramos según el documento de origen (liquidación y ejecución). Unidad: miles de millones de euros."
        tipo="barras-apiladas"
        series={[
          { clave: 'liquidacion', etiqueta: etiquetaLiquidacion, puntos: puntosLiquidacion },
          { clave: 'ejecucion', etiqueta: etiquetaEjecucion, puntos: puntosEjecucion },
        ]}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimales={0}
        decimalesEje={0}
        fuentes={[d.liquidacion.delEstado.dato, t.delEstado.dato]}
        nota={
          <>
            Definición: transferencias corrientes con origen en el Estado y sus organismos
            autónomos. Ruptura de serie en {anioRuptura}: los dos colores son dos documentos
            distintos (liquidación del ejercicio y ejecución del presupuesto), con rótulos
            distintos, y no se han podido contrastar entre sí. En el tramo de la liquidación la
            cifra es la suma de «Del Estado» y «De Organismos Autónomos administrativos». No incluye
            los préstamos del Estado (que son pasivos financieros) ni las transferencias de capital:
            la fuente solo da estas últimas en total y de cualquier origen
            {ultimaCapital === undefined
              ? ''
              : `, con ${millonesEuros(ultimaCapital.valor)} en ${ultimaCapital.anio}`}
            . La cifra de un año de la liquidación puede reaparecer revisada como comparativa en el
            PDF siguiente; se usa la del propio ejercicio (véanse las diferencias en el registro de
            discrepancias).
          </>
        }
        comoLeerlo={
          <>
            <p>
              Las transferencias pasan de {millonesEuros(primero.valor)} en {primero.anio} a{' '}
              {millonesEuros(ultimo.valor)} en {ultimo.anio}; el mayor importe anual de la serie es
              el de {mayorAnual.anio}, con {millonesEuros(mayorAnual.valor)}. Entre {primero.anio} y{' '}
              {ultimaLiquidacion} los datos son de la liquidación; desde {anioRuptura}, de la
              ejecución.
            </p>
            <p>
              El gráfico no separa las transferencias por finalidad ni explica por qué cambia el
              importe de un año a otro, ni asegura que la cifra de un tramo sea comparable con la
              del otro. Lo que se conoce por finalidad, según el Tribunal de Cuentas, está en la
              tabla de más abajo.
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
        descripcion={`Suma de las transferencias anuales desde ${anioInicio} hasta cada año, ambos incluidos, con el tramo de origen de cada año. Unidad: miles de millones de euros.`}
        tipo="barras-apiladas"
        series={[
          {
            clave: 'acumulada-liquidacion',
            etiqueta: 'Acumuladas, años de la liquidación',
            puntos: acumuladaPorTramo.get('liquidacion') ?? [],
          },
          {
            clave: 'acumulada-ejecucion',
            etiqueta: 'Acumuladas, años de la ejecución',
            puntos: acumuladaPorTramo.get('ejecucion') ?? [],
          },
        ].filter((serie) => serie.puntos.length > 0)}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimales={0}
        decimalesEje={0}
        incluirCero
        fuentes={[d.liquidacion.delEstado.dato, t.delEstado.dato]}
        nota={`Dato derivado (confianza media): suma de las transferencias anuales del gráfico anterior. Año de inicio por defecto: ${primero.anio}, el primero con datos. Ruptura de serie: si el año de inicio es anterior a ${anioRuptura}, la suma incorpora importes de dos documentos distintos (liquidación y ejecución); el color indica el documento del que procede el último año sumado.`}
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
              datos anteriores a {primero.anio} en esta serie. Si el año de inicio es anterior a{' '}
              {anioRuptura}, la suma cruza la ruptura de serie y mezcla cifras de dos documentos.
              Tampoco distingue la finalidad de las transferencias.
            </p>
          </>
        }
      />

      <h3 id="finalidad">Lo que se conoce por finalidad</h3>
      <p>
        Ni las liquidaciones ni la ejecución separan las transferencias por finalidad: las
        clasifican por el organismo de origen. El Tribunal de Cuentas, en cambio, las cifra por su
        finalidad en dos declaraciones sobre la Cuenta General del Estado, la de{' '}
        {anioDeId(ID.tcSaldoDeuda)} y la de {anioDeId(ID23.saldoDeuda)}, con un concepto de
        «transferencias corrientes aportadas por el Estado» que no coincide con el de la ejecución
        (véase la sección anterior). Las dos declaraciones se muestran por separado porque cubren
        periodos distintos; el desglose anual por finalidad figura como pendiente de datos.
      </p>
      <div className="hist-definiciones">
        <DataTable
          titulo="Transferencias corrientes del Estado por finalidad, según el Tribunal de Cuentas"
          columnas={[
            { clave: 'declaracion', titulo: 'Declaración' },
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
        <p className="hucha-pie" id="finalidad-definicion">
          Definición: la ejecución del presupuesto clasifica las transferencias por su origen (el
          Estado y sus organismos autónomos) y el Tribunal de Cuentas las cifra por su finalidad.
          Las filas «de ellas» son partes del total de su misma declaración; la fila de aportaciones
          no contributivas el Tribunal la cita aparte, «además» de las anteriores.
        </p>
        <ComoLeerlo>
          <p>
            En la declaración de {anioDeId(ID23.saldoDeuda)}, el total de{' '}
            {periodoDeId(ID23.transferenciasTotal)} es de{' '}
            {millonesEuros(cifra23(ID23.transferenciasTotal))}:{' '}
            {millonesEuros(cifra23(ID23.equilibrio))} con finalidad de apoyar el equilibrio
            presupuestario y {millonesEuros(cifra23(ID23.baseNormativa))} basadas en la modificación
            del texto refundido. En la de {anioDeId(ID.tcSaldoDeuda)}, el total de{' '}
            {periodoDeId(ID.tcTransferenciasTotal)} es de{' '}
            {millonesEuros(cifra(ID.tcTransferenciasTotal))}.
          </p>
          <p>
            Cada declaración cubre un periodo distinto y no se pueden sumar entre sí. La tabla no
            dice cuánto de cada año corresponde a cada finalidad, ni explica la diferencia con las
            cifras de la ejecución: la causa completa de esa diferencia no está verificada con los
            datos consultados.
          </p>
        </ComoLeerlo>
        <p className="hucha-pendiente">
          Pendiente de datos: desglose anual de las transferencias por finalidad (complementos a
          mínimos, otras partidas), transferencias anteriores a {primero.anio} por finalidad y
          transferencias de capital por origen.
        </p>
      </div>
    </section>
  );
}
