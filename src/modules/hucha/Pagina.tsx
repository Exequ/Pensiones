import { useTituloPagina } from '../../app/useTituloPagina';
import { DataTable } from '../../components/DataTable';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { SourceLine } from '../../components/SourceLine';
import { Dato } from '../../engine/esquema-datos';
import type { DatoRotulado } from '../../components/fuentes';
import { componentesDotacion } from '../../engine/fondo-reserva';
import { definicionPorId } from '../../contenido/definiciones';
import {
  extremos,
  mayorCaida,
  maximo,
  porcentajeDelPib,
  suma,
  valorEn,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { gastoAproximadoPensiones, mesesDeGasto } from '../../engine/sistema-historico';
import { etiquetaTramo } from './tramos';
import { DefinicionHucha } from './DefinicionHucha';
import { reglaSinLiterales } from './normas';
import { datosHucha } from '../historico/datos-hucha';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import { EnlaceFinanciero } from '../proyecciones/EnlaceFinanciero';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal1, decimal2, millonesEuros, puntosAPorcentaje } from '../historico/formatos';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import './Hucha.css';
import { SeccionContraste } from './SeccionContraste';
import { SeccionFondoTransferencias } from './SeccionFondoTransferencias';
import { SeccionOrigen } from './SeccionOrigen';
import { SeccionPosicion } from './SeccionPosicion';
import { SeccionPrestamos } from './SeccionPrestamos';
import { SeccionTransferencias } from './SeccionTransferencias';
import { APARTADOS, INDICE } from './apartados';
import { OnThisPage } from '../../components/OnThisPage';

const seccion = buscarSeccion('hucha');

/** Módulo «hucha»: evolución del Fondo de Reserva, relación con el gasto y reglas de disposición. */
export default function Hucha() {
  useTituloPagina(seccion.titulo);
  const d = datosHucha();

  const valor = d.valor.puntos;
  const { primero, ultimo } = extremos(valor);
  const pico = maximo(valor);
  const caida = mayorCaida(valor);
  const valorSobrePib = porcentajeDelPib(valor, d.pib.puntos);

  const flujo = (campo: 'dotaciones' | 'dotacionesMei' | 'disposiciones'): PuntoAnual[] =>
    d.flujos.filas.flatMap((f) => {
      const v = f[campo];
      return v === null ? [] : [{ anio: f.anio, valor: v }];
    });
  const dotaciones = flujo('dotaciones');
  const dotacionesMei = flujo('dotacionesMei');
  const disposiciones = flujo('disposiciones');
  const mayorDisposicion = disposiciones.reduce<PuntoAnual | undefined>(
    (m, p) => (m === undefined || p.valor < m.valor ? p : m),
    undefined,
  );
  const disposicionSobrePib =
    mayorDisposicion === undefined
      ? null
      : (Math.abs(mayorDisposicion.valor) / (valorEn(d.pib.puntos, mayorDisposicion.anio) ?? 1)) *
        100;

  const puntosPorClase = (r: typeof d.numeroPorClase) => ({
    jubilacion: r.jubilacion.puntos,
    viudedad: r.viudedad.puntos,
    incapacidad: r.incapacidad.puntos,
    orfandad: r.orfandad.puntos,
    'favor-familiares': r['favor-familiares'].puntos,
  });
  const gastoAproximado = gastoAproximadoPensiones(
    puntosPorClase(d.numeroPorClase),
    puntosPorClase(d.pensionMediaPorClase),
  );
  // Referencia: obligaciones reconocidas con el complemento a mínimos. Contraste: catorce pagas.
  const gastoConComplemento = suma(d.gastoEjecucion.puntos, d.complementoMinimos.puntos);
  // Referencia ampliada hacia atrás con las liquidaciones (misma definición: pensiones contributivas
  // con complemento a mínimos); dos tramos por cambio de documento de origen.
  const gastoLiquidacion = d.liquidacion.gastoPensiones.puntos;
  const mesesLiquidacion = mesesDeGasto(valor, gastoLiquidacion);
  const mesesA = mesesDeGasto(valor, gastoConComplemento);
  const mesesB = mesesDeGasto(valor, gastoAproximado);
  const anioRupturaGasto = mesesA[0]?.anio ?? 0;
  const primeroLiquidacion = mesesLiquidacion[0];
  const ultimoA = mesesA.at(-1);
  const ultimoB = mesesB.at(-1);
  const maxB = maximo(mesesB);

  const limite = d.limiteDesembolso.puntos;
  const { primero: primerLimite, ultimo: ultimoLimite } = extremos(limite);

  const dotacion = componentesDotacion(d.flujos.filas.map((f) => f.acumuladas));
  const primerAnioLimite = primerLimite.anio;
  const disposicionesAntes = dotacion.aniosConDisposicion.filter((a) => a < primerAnioLimite);
  const tramoDeAnios = ([desde, hasta]: readonly [number, number]) =>
    desde === hasta ? `en ${desde}` : `entre ${desde} y ${hasta}`;
  const textoMutuas =
    dotacion.tramosSinMutuas.length === 0
      ? 'las aportaciones de las mutuas se producen todos los años'
      : `las aportaciones de las mutuas no se producen todos los años: no hay ninguna ${dotacion.tramosSinMutuas.map(tramoDeAnios).join(' ni ')}`;

  const regla = (n: (typeof d.normas)[number]) => {
    const original = n.cambios.find((c) => c.parametro === 'fondo-reserva');
    return {
      ...reglaSinLiterales(original?.despues ?? ''),
      articulos: original?.articulos ?? '',
    };
  };
  const datoNorma = (n: (typeof d.normas)[number]): DatoRotulado => {
    const r = regla(n);
    return {
      ...Dato.parse({
        value: n.titulo,
        unit: 'norma',
        period: n.fecha.slice(0, 4),
        source: n.source,
        fetchedAt: n.fetchedAt,
        confidence: n.confidence,
        ...(r.articulos === '' ? {} : { location: r.articulos }),
        ...(r.literales.length === 0 ? {} : { quote: r.literales.join('; ') }),
      }),
      rotulo: n.titulo,
    };
  };
  const filasNormas = d.normas.map((n) => ({
    fecha: n.fecha,
    norma: n.titulo,
    regla: regla(n).texto,
  }));

  return (
    <article className="contenedor pagina">
      <div className="articulo">
        <header className="pagina-cabecera">
          <Kicker>{antetituloSeccion('hucha')}</Kicker>
          <h1>{seccion.titulo}</h1>
          <Lead>{seccion.resumen}</Lead>
        </header>
        <MarginNote>
          <p>
            Cada gráfico lleva su tabla de datos y su fuente. Los cálculos propios se señalan como
            tales.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página describe cómo ha evolucionado el Fondo de Reserva y qué reglas lo rigen. No
          contiene proyecciones ni valora si su nivel es suficiente.
        </p>
        <OnThisPage entradas={INDICE} />

        <section className="seccion prosa" aria-labelledby={APARTADOS.valor.destino}>
          <h2 id={APARTADOS.valor.destino} tabIndex={-1}>
            {APARTADOS.valor.titulo}
          </h2>
          <DefinicionHucha id="fondo-de-reserva" />
          <p>
            Según los datos, los excedentes de las entidades gestoras dotan el Fondo hasta{' '}
            {dotacion.ultimoAnioEntidades}; {textoMutuas}; y la cotización del Mecanismo de Equidad
            Intergeneracional lo dota desde {dotacion.primerAnioMei}. El valor del Fondo se publica
            a fecha de cierre de cada año.
          </p>
          <GraficoSeries
            titulo="Valor del Fondo de Reserva al cierre de cada año"
            descripcion="Valor a precio de adquisición al cierre de cada año. Unidad: miles de millones de euros."
            series={[{ clave: 'valor', etiqueta: 'Valor del Fondo', puntos: valor }]}
            unidadEje="Miles de millones de euros"
            divisorEje={1000}
            incluirCero
            fuentes={d.valor.dato}
            comoLeerlo={
              <>
                <p>
                  El valor pasa de {millonesEuros(primero.valor)} en {primero.anio} a un máximo de{' '}
                  {millonesEuros(pico.valor)} en {pico.anio}
                  {caida === null
                    ? ''
                    : `, desciende hasta ${millonesEuros(caida.minimo.valor)} en ${caida.minimo.anio}`}{' '}
                  y es de {millonesEuros(ultimo.valor)} en {ultimo.anio}
                  {valorSobrePib.at(-1) === undefined
                    ? ''
                    : `, el ${puntosAPorcentaje(valorSobrePib.at(-1)?.valor ?? 0)} del PIB de ese año`}
                  .
                </p>
                <p>
                  El valor se registra a precio de adquisición, no a valor de mercado. La gráfica no
                  indica cuánto del descenso o de la recuperación se debe a disposiciones, a
                  dotaciones o a rendimientos: eso está en la gráfica siguiente.
                </p>
              </>
            }
          />

          <GraficoSeries
            titulo="Dotaciones y disposiciones anuales"
            descripcion="Variación anual de las dotaciones acumuladas y de las disposiciones acumuladas (negativas). Unidad: miles de millones de euros."
            tipo="barras-agrupadas"
            series={[
              { clave: 'dot', etiqueta: 'Dotaciones', puntos: dotaciones },
              { clave: 'mei', etiqueta: 'De ellas, con cargo al MEI', puntos: dotacionesMei },
              { clave: 'disp', etiqueta: 'Disposiciones', puntos: disposiciones },
            ]}
            unidadEje="Miles de millones de euros"
            divisorEje={1000}
            decimalesEje={0}
            alto={360}
            fuentes={d.flujos.dato}
            nota="Datos derivados: cada cifra anual es la diferencia entre dos años consecutivos de los acumulados publicados. Los rendimientos no se muestran: no tienen cifra anual en la fuente."
            comoLeerlo={
              <>
                <p>
                  {mayorDisposicion === undefined
                    ? ''
                    : `La mayor disposición anual de la serie es de ${millonesEuros(Math.abs(mayorDisposicion.valor))} en ${mayorDisposicion.anio}${disposicionSobrePib === null ? '' : `, el ${puntosAPorcentaje(disposicionSobrePib, 2)} del PIB de ese año`}. `}
                  Las barras por encima de cero son dotaciones; por debajo, disposiciones.
                </p>
                <p>
                  Los años sin barra de disposiciones son años sin disposiciones. La gráfica no
                  explica los motivos de cada disposición ni cómo se utilizó el dinero dentro del
                  sistema.
                </p>
              </>
            }
          />
        </section>

        <section className="seccion prosa" aria-labelledby={APARTADOS.meses.destino}>
          <h2 id={APARTADOS.meses.destino} tabIndex={-1}>
            {APARTADOS.meses.titulo}
          </h2>
          <p>
            Una forma de medir el tamaño del Fondo es compararlo con el gasto: cuántos meses de
            gasto en pensiones contributivas equivale su valor. El resultado depende de cómo se mida
            el gasto. La referencia es el gasto contributivo con complemento a mínimos; como
            contraste se muestra un cálculo aproximado a partir del número de pensiones, de la
            pensión media y de catorce pagas.
          </p>
          <DefinicionHucha id="gasto-pensiones-contributivas-con-complemento" />
          <DefinicionHucha id="fondo-en-meses-de-gasto" />
          <p className="hist-aviso">
            El Fondo se valora a precio de adquisición, no a valor de mercado: los meses de gasto
            que se obtienen con ese valor no reflejan lo que se obtendría al venderlo.
          </p>
          <GraficoSeries
            titulo="Meses de gasto en pensiones que equivale el valor del Fondo"
            descripcion="Valor del Fondo al cierre del año dividido entre el gasto anual en pensiones contributivas y multiplicado por doce. Unidad: meses de gasto."
            series={[
              {
                clave: 'liquidacion',
                etiqueta: etiquetaTramo('Referencia, liquidación', mesesLiquidacion),
                puntos: mesesLiquidacion,
                color: 0,
              },
              {
                clave: 'ejecucion',
                etiqueta: etiquetaTramo('Referencia, ejecución', mesesA),
                puntos: mesesA,
                color: 0,
              },
              {
                clave: 'aprox',
                etiqueta: 'Contraste: catorce pagas',
                puntos: mesesB,
              },
            ]}
            rupturas={[
              {
                anio: anioRupturaGasto,
                etiqueta: 'Ruptura de serie',
              },
            ]}
            unidadEje="Meses de gasto"
            incluirCero
            decimales={2}
            decimalesEje={0}
            fuentes={[
              d.valor.dato,
              d.liquidacion.gastoPensiones.dato,
              d.gastoEjecucion.dato,
              d.complementoMinimos.dato,
              d.numeroPorClase.jubilacion.dato,
              d.pensionMediaPorClase.jubilacion.dato,
            ]}
            nota={`Cálculos propios, con la fórmula de «${definicionPorId('fondo-en-meses-de-gasto').termino}». La referencia tiene dos tramos con la misma definición pero distinto documento de origen: las liquidaciones del presupuesto y la ejecución del presupuesto; no se han podido contrastar entre sí porque no comparten ningún ejercicio. En las liquidaciones, el complemento a mínimos está incluido en las cinco clases de pensión hasta ${d.liquidacion.primerAnioComplementoAparte - 1} y figura aparte desde ${d.liquidacion.primerAnioComplementoAparte}, de modo que desde ese año se suma (la reclasificación se comprueba con la cifra de ${d.liquidacion.primerAnioComplementoAparte - 1} que reaparece en el PDF siguiente; que las clases incluyan el complemento en los ejercicios anteriores es una deducción, porque los PDF no reclasifican esos años, y no consta en una nota de la fuente). Contraste: el mismo cociente con un gasto aproximado, que suma por clase de pensión el número de pensiones por la pensión media mensual y por el número de pagas anuales; no incluye atrasos ni efectos de calendario y no coincide con la referencia. El Fondo está a precio de adquisición.`}
            comoLeerlo={
              <>
                <p>
                  {primeroLiquidacion === undefined
                    ? ''
                    : `En ${primeroLiquidacion.anio}, con la liquidación del presupuesto (primer tramo de la referencia), el valor del Fondo equivalía a ${decimal2(primeroLiquidacion.valor)} meses de gasto. `}
                  En {ultimoA?.anio ?? ''} el valor del Fondo equivale a{' '}
                  {decimal2(ultimoA?.valor ?? 0)} meses del gasto medido con la ejecución y el
                  complemento a mínimos (referencia) y a {decimal2(ultimoB?.valor ?? 0)} meses con
                  el cálculo de contraste. El valor más alto del contraste se da en {maxB.anio}, con{' '}
                  {decimal1(maxB.valor)} meses.
                </p>
                <p>
                  Un número de meses más bajo no dice por sí solo cuánto tiempo podría sostener el
                  Fondo las pensiones: el gasto no es constante y el Fondo no está pensado para
                  sustituir las cotizaciones. Es solo una comparación de tamaños en un año concreto,
                  con el Fondo a precio de adquisición.
                </p>
              </>
            }
          />
        </section>

        <section className="seccion prosa" aria-labelledby={APARTADOS.reglas.destino}>
          <h2 id={APARTADOS.reglas.destino} tabIndex={-1}>
            {APARTADOS.reglas.titulo}
          </h2>
          <p>
            La norma ha cambiado con el tiempo. La tabla recoge las leyes que establecen o modifican
            el régimen del Fondo y resume lo que establece cada una.
          </p>
          <div className="hist-definiciones">
            <DataTable
              titulo="Normas que regulan el Fondo de Reserva"
              columnas={[
                { clave: 'fecha', titulo: 'Fecha' },
                { clave: 'norma', titulo: 'Norma' },
                { clave: 'regla', titulo: 'Qué establece' },
              ]}
              filas={filasNormas}
            />
            <SourceLine
              datos={d.normas.map(datoNorma)}
              titulo="Normas que regulan el Fondo de Reserva"
            />
          </div>

          <DefinicionHucha id="fondo-de-reserva-limite-de-desembolso" />
          <GraficoSeries
            titulo="Límite máximo del desembolso anual del Fondo"
            descripcion="Límite del desembolso de cada año como porcentaje del PIB de ese año. Unidad: porcentaje del PIB."
            tipo="barras-apiladas"
            series={[{ clave: 'limite', etiqueta: 'Límite máximo del desembolso', puntos: limite }]}
            unidadEje="% del PIB"
            decimales={2}
            decimalesEje={2}
            fuentes={d.limiteDesembolso.dato}
            nota="Límite máximo del desembolso anual, expresado en porcentaje del PIB del propio año."
            comoLeerlo={
              <>
                <p>
                  El límite parte del {puntosAPorcentaje(primerLimite.valor, 2)} del PIB en{' '}
                  {primerLimite.anio} y llega al {puntosAPorcentaje(ultimoLimite.valor, 2)} en{' '}
                  {ultimoLimite.anio}. Para situarlo, la mayor disposición anual de la serie
                  histórica fue del{' '}
                  {disposicionSobrePib === null ? '' : puntosAPorcentaje(disposicionSobrePib, 2)}{' '}
                  del PIB de su año; el valor del Fondo en {ultimo.anio} es del{' '}
                  {puntosAPorcentaje(valorSobrePib.at(-1)?.valor ?? 0, 2)}.
                </p>
                <p>
                  Es un tope, no una previsión de uso: cada año la ley de presupuestos fija el
                  desembolso dentro de ese límite. El gráfico no traduce el porcentaje a euros
                  porque eso exigiría un PIB futuro, que no forma parte de esta página.
                  {disposicionesAntes.length === 0
                    ? ''
                    : ` Los datos del Fondo registran disposiciones entre ${disposicionesAntes[0] ?? ''} y ${disposicionesAntes.at(-1) ?? ''}, antes del primer año con límite.`}
                </p>
              </>
            }
          />
        </section>
        <SeccionOrigen />
        <SeccionTransferencias />
        <SeccionFondoTransferencias />
        <SeccionPosicion />
        <SeccionPrestamos />
        <SeccionContraste />
        <EnlaceFinanciero origen="hucha" />
        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
