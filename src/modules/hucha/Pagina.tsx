import { useTituloPagina } from '../../app/useTituloPagina';
import { DataTable } from '../../components/DataTable';
import { Kicker } from '../../components/Kicker';
import { Lead } from '../../components/Lead';
import { MarginNote } from '../../components/MarginNote';
import { SourceLine } from '../../components/SourceLine';
import { Dato } from '../../engine/esquema-datos';
import {
  extremos,
  mayorCaida,
  maximo,
  porcentajeDelPib,
  valorEn,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { gastoAproximadoPensiones, mesesDeGasto } from '../../engine/sistema-historico';
import { datosHucha } from '../historico/datos-hucha';
import { ContenidoPagina } from '../historico/ContenidoPagina';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal1, decimal2, millonesEuros, puntosAPorcentaje } from '../historico/formatos';
import '../historico/Historico.css';
import { antetituloSeccion, buscarSeccion } from '../secciones';
import './Hucha.css';
import { SeccionFondoTransferencias } from './SeccionFondoTransferencias';
import { SeccionOrigen } from './SeccionOrigen';
import { SeccionPosicion } from './SeccionPosicion';
import { SeccionTransferencias } from './SeccionTransferencias';

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
  const mesesA = mesesDeGasto(valor, d.gastoEjecucion.puntos);
  const mesesB = mesesDeGasto(valor, gastoAproximado);
  const ultimoA = mesesA.at(-1);
  const ultimoB = mesesB.at(-1);
  const maxB = maximo(mesesB);

  const limite = d.limiteDesembolso.puntos;
  const { primero: primerLimite, ultimo: ultimoLimite } = extremos(limite);

  const datoNorma = (n: (typeof d.normas)[number]): Dato =>
    Dato.parse({
      value: n.titulo,
      unit: 'norma',
      period: n.fecha.slice(0, 4),
      source: n.source,
      fetchedAt: n.fetchedAt,
      confidence: n.confidence,
    });
  const filasNormas = d.normas.map((n) => ({
    fecha: n.fecha,
    norma: n.titulo,
    regla: n.cambios.find((c) => c.parametro === 'fondo-reserva')?.despues ?? '',
    articulos: n.cambios.find((c) => c.parametro === 'fondo-reserva')?.articulos ?? '',
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
            Cada gráfico lleva su tabla de datos, su fuente, la fecha de descarga y un nivel de
            confianza. Los cálculos propios se señalan como tales.
          </p>
        </MarginNote>
        <p className="hist-aviso">
          Esta página describe cómo ha evolucionado el Fondo de Reserva y qué reglas lo rigen. No
          contiene proyecciones ni valora si su nivel es suficiente.
        </p>

        <section className="seccion prosa" aria-labelledby="valor">
          <h2 id="valor">Cuánto vale el Fondo y cómo se mueve</h2>
          <p>
            El Fondo de Reserva de la Seguridad Social se nutre de dotaciones (excedentes de
            cotizaciones y, desde que existe, la cotización del Mecanismo de Equidad
            Intergeneracional) y de los rendimientos de sus inversiones, y disminuye con las
            disposiciones. Su valor se publica a fecha de cierre de cada año, a precio de
            adquisición.
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

        <section className="seccion prosa" aria-labelledby="meses">
          <h2 id="meses">El Fondo en meses de gasto en pensiones</h2>
          <p>
            Una forma de medir el tamaño del Fondo es compararlo con el gasto: cuántos meses de
            gasto en pensiones contributivas equivale su valor. El resultado depende de cómo se mida
            el gasto, por lo que se muestran dos definiciones: las obligaciones reconocidas de la
            ejecución del presupuesto y un cálculo aproximado a partir del número de pensiones y de
            la pensión media.
          </p>
          <GraficoSeries
            titulo="Meses de gasto en pensiones que equivale el valor del Fondo"
            descripcion="Valor del Fondo al cierre del año dividido entre el gasto anual en pensiones contributivas y multiplicado por doce. Unidad: meses de gasto."
            series={[
              { clave: 'ejecucion', etiqueta: 'Gasto: obligaciones reconocidas', puntos: mesesA },
              {
                clave: 'aprox',
                etiqueta: 'Gasto: pensiones × pensión media × pagas',
                puntos: mesesB,
              },
            ]}
            unidadEje="Meses de gasto"
            incluirCero
            decimales={2}
            decimalesEje={0}
            fuentes={[
              d.valor.dato,
              d.gastoEjecucion.dato,
              d.numeroPorClase.jubilacion.dato,
              d.pensionMediaPorClase.jubilacion.dato,
            ]}
            nota="Cálculos propios (confianza media). Definición A: valor del Fondo ÷ (obligaciones reconocidas de «suma de pensiones» ÷ doce). Definición B: valor del Fondo ÷ (suma de las cinco clases de número de pensiones × pensión media mensual × catorce pagas ÷ doce). Los dos gastos difieren porque la ejecución anota el complemento a mínimos en otra fila y B no incluye atrasos ni efectos de calendario."
            comoLeerlo={
              <>
                <p>
                  En {ultimoA?.anio ?? ''} el valor del Fondo equivale a{' '}
                  {decimal2(ultimoA?.valor ?? 0)} meses del gasto medido con la ejecución y a{' '}
                  {decimal2(ultimoB?.valor ?? 0)} meses con la aproximación. El valor más alto de la
                  definición B se da en {maxB.anio}, con {decimal1(maxB.valor)} meses.
                </p>
                <p>
                  Un número de meses más bajo no dice por sí solo cuánto tiempo podría sostener el
                  Fondo las pensiones: el gasto no es constante y el Fondo no está pensado para
                  sustituir las cotizaciones. Es solo una comparación de tamaños en un año concreto.
                </p>
              </>
            }
          />
        </section>

        <section className="seccion prosa" aria-labelledby="reglas">
          <h2 id="reglas">Reglas de dotación y de disposición</h2>
          <p>
            La norma ha cambiado con el tiempo. Estas son las leyes que, según la cronología
            normativa del proyecto, establecen o modifican el régimen del Fondo, con el texto de la
            fuente:
          </p>
          <div className="hist-definiciones">
            <DataTable
              titulo="Normas que regulan el Fondo de Reserva"
              columnas={[
                { clave: 'fecha', titulo: 'Fecha' },
                { clave: 'norma', titulo: 'Norma' },
                { clave: 'regla', titulo: 'Qué establece' },
                { clave: 'articulos', titulo: 'Artículos' },
              ]}
              filas={filasNormas}
            />
            <SourceLine datos={d.normas.map(datoNorma)} />
          </div>

          <p>
            {d.limiteDesembolso.nota} {d.destinoMei.nota}
          </p>
          <GraficoSeries
            titulo="Límite máximo del desembolso anual del Fondo"
            descripcion="Límite del desembolso de cada año como porcentaje del PIB, según el artículo indicado. Unidad: porcentaje del PIB."
            tipo="barras-apiladas"
            series={[{ clave: 'limite', etiqueta: 'Límite máximo del desembolso', puntos: limite }]}
            unidadEje="% del PIB"
            decimales={2}
            decimalesEje={2}
            fuentes={d.limiteDesembolso.dato}
            nota={`Fuente normativa: ${d.limiteDesembolso.articulo}.`}
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
                </p>
              </>
            }
          />
          <SourceLine datos={[d.limiteDesembolso.dato, d.destinoMei.dato]} />
        </section>
        <SeccionOrigen />
        <SeccionTransferencias />
        <SeccionFondoTransferencias />
        <SeccionPosicion />
        <ContenidoPagina contenidos={seccion.previsto} />
      </div>
    </article>
  );
}
