/**
 * Tarjetas de las afirmaciones sobre sostenibilidad y natalidad. Toda cifra sale de /data a través de
 * `datos-mitos.ts`; los textos no llevan dígitos.
 */
import type { Columna } from '../../components/DataTable';
import { formatearNumero } from '../../engine/formato';
import { extremos, variacion } from '../../engine/series-historicas';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal1, decimal2, entero, puntosAPorcentaje } from '../historico/formatos';
import { Afirmacion, type Mito } from './Afirmacion';
import { TablaConFuente } from './bloques';
import { datosMitos } from './datos-mitos';

interface TarjetaProps {
  readonly mito: Mito;
  readonly indice: number;
  readonly total: number;
}

type FilaTexto = Record<string, string | number | null>;

export function TarjetaSostenibilidad({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().sostenibilidad;
  const gasto = d.gastoAgeing;
  const balance = d.balanceAgeing;
  const variacionGasto = variacion(gasto.puntos);
  const { ultimo: ultimoBalance } = extremos(balance.puntos);
  const { periodoCriterio } = d;

  const filasCriterio: FilaTexto[] = [
    {
      elemento:
        'Límite del gasto medio bruto público en pensiones (del último Informe de Envejecimiento)',
      valor: puntosAPorcentaje(Number(d.tope.valor), 1),
      unidad: 'del PIB',
    },
    {
      elemento: 'Referencia del impacto medio anual de las medidas de ingresos',
      valor: puntosAPorcentaje(Number(d.impacto.valor), 1),
      unidad: 'del PIB',
    },
    {
      elemento:
        'Fracción del exceso estimado que aumenta cada año la cotización del MEI si no entra en vigor una ley correctora',
      valor: formatearNumero(Number(d.fraccion.valor), { maxDecimales: 1 }),
      unidad: d.fraccion.unidad,
    },
    {
      elemento: `Media simple del gasto del Ageing Report entre ${periodoCriterio.desde} y ${periodoCriterio.hasta} (cálculo propio, sin el ajuste por medidas de ingresos)`,
      valor: puntosAPorcentaje(d.mediaAgeing, 2),
      unidad: 'del PIB',
    },
  ];
  const columnas: Columna<FilaTexto>[] = [
    { clave: 'elemento', titulo: 'Elemento del criterio legal' },
    { clave: 'valor', titulo: 'Valor' },
    { clave: 'unidad', titulo: 'Unidad' },
  ];

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'proyecciones' }, { slug: 'financiacion-y-deficit' }, { slug: 'reformas' }]}
      medible={
        <p>
          «Sostenibilidad» no tiene una definición única: puede referirse al gasto sobre el PIB, al
          saldo del sistema, a la adecuación de las prestaciones o a la capacidad de financiación
          con las reglas vigentes. Los datos permiten ver el gasto proyectado sobre el PIB en dos
          fuentes, el balance del sistema en una y el criterio que fija la ley para activar un
          aumento automático de la cotización del Mecanismo de Equidad Intergeneracional. Las
          proyecciones no son predicciones: son escenarios con hipótesis explícitas.
        </p>
      }
    >
      <GraficoSeries
        titulo="Gasto en pensiones públicas sobre el PIB: dos proyecciones publicadas"
        descripcion="Escenario de referencia del Ageing Report de la Comisión Europea y proyección de la OCDE. Unidad: porcentaje del PIB."
        series={[
          { clave: 'ageing', etiqueta: 'Ageing Report (gasto bruto)', puntos: gasto.puntos },
          { clave: 'ocde', etiqueta: 'OCDE (gasto proyectado)', puntos: d.gastoOcde.puntos },
        ]}
        unidadEje="Porcentaje del PIB"
        decimales={1}
        decimalesEje={0}
        alto={360}
        fuentes={[gasto.dato, d.gastoOcde.dato]}
        nota="Proyecciones publicadas por las fuentes, no datos observados. El perímetro del gasto de la OCDE no está verificado en las fuentes descargadas."
        comoLeerlo={
          <>
            <p>
              El gasto bruto del Ageing Report pasa de{' '}
              {puntosAPorcentaje(variacionGasto.valorDesde)} del PIB en {variacionGasto.desde} a{' '}
              {puntosAPorcentaje(variacionGasto.valorHasta)} en {variacionGasto.hasta}.
            </p>
            <p>
              Mide cuánto gastaría el sistema en relación con el PIB bajo las hipótesis de cada
              fuente. No dice si ese gasto es o no asumible: eso depende de cómo se financie, de las
              hipótesis demográficas y económicas y de las reformas futuras.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Balance proyectado del sistema de pensiones"
        descripcion="Cotizaciones menos gasto bruto en pensiones, escenario de referencia del Ageing Report. Unidad: porcentaje del PIB."
        series={[
          {
            clave: 'balance',
            etiqueta: 'Balance (cotizaciones menos gasto)',
            puntos: balance.puntos,
          },
        ]}
        unidadEje="Porcentaje del PIB"
        decimales={2}
        decimalesEje={1}
        alto={320}
        fuentes={balance.dato}
        nota="Proyección publicada por la fuente con hipótesis explícitas; no es un dato observado."
        comoLeerlo={
          <p>
            El balance proyectado es de {puntosAPorcentaje(ultimoBalance.valor, 2)} del PIB en{' '}
            {ultimoBalance.anio}. Es una definición de saldo distinta de las de la tarjeta sobre el
            déficit: son las cotizaciones menos el gasto bruto en pensiones.
          </p>
        }
      />

      <TablaConFuente
        titulo="Criterio legal de la disposición adicional segunda de la norma que fija el nuevo marco de sostenibilidad"
        columnas={columnas}
        filas={filasCriterio}
        fuentes={[d.tope.dato, d.impacto.dato, d.fraccion.dato, gasto.dato]}
        pie="La comprobación la hace la AIReF cada tres años con el último Informe de Envejecimiento. La media de la última fila es una lectura propia de «gasto medio» (media aritmética de los valores anuales) sin el ajuste por el impacto de las medidas de ingresos, que no está en los datos: no es la comprobación de la AIReF."
      />
      <ComoLeerlo>
        <p>
          La ley no emplea ese término: fija un criterio concreto con consecuencias concretas (el
          aumento de la cotización del Mecanismo de Equidad Intergeneracional). La tabla muestra los
          elementos del criterio tal como figuran en la norma y, aparte, la media propia del gasto
          proyectado del periodo que indica la norma. Con estos datos no se puede decir si el
          criterio se activa: falta el informe de la AIReF y el impacto de las medidas de ingresos.
        </p>
      </ComoLeerlo>
    </Afirmacion>
  );
}

export function TarjetaNatalidad({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().natalidad;
  const icf = variacion(d.icfObservado.puntos);
  const proyectado = variacion(d.icfProyectado.puntos);
  const dependenciaEconomica = variacion(d.dependenciaEconomicaAgeing.puntos);

  const filasMigracion: FilaTexto[] = d.saldoMigratorio.puntos.map((p) => ({
    anio: String(p.anio),
    saldo: p.valor,
  }));
  const columnasMigracion: Columna<FilaTexto>[] = [
    { clave: 'anio', titulo: 'Año' },
    {
      clave: 'saldo',
      titulo: 'Saldo migratorio exterior (personas)',
      tipo: 'numero',
      decimales: 0,
    },
  ];

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'proyecciones' }, { slug: 'cotizantes-y-pensionistas' }]}
      medible={
        <p>
          Los datos permiten ver cómo ha evolucionado el número medio de hijos por mujer, cómo lo
          proyectan el INE y la Comisión Europea y cómo evolucionan, en esas mismas proyecciones,
          las tasas de dependencia. La dependencia demográfica (población por edades) y la
          dependencia económica (población inactiva entre población empleada) no son lo mismo: la
          segunda incorpora hipótesis de empleo. El gasto en pensiones depende además de la
          mortalidad, la migración, el empleo, la productividad y las reglas de cálculo.
        </p>
      }
    >
      <GraficoSeries
        titulo="Indicador coyuntural de fecundidad: observado y proyectado"
        descripcion="Número medio de hijos por mujer; el tramo proyectado es una hipótesis del INE. Unidad: hijos por mujer."
        series={[
          { clave: 'observado', etiqueta: 'Observado (INE)', puntos: d.icfObservado.puntos },
          {
            clave: 'proyectado',
            etiqueta: 'Hipótesis proyectada (INE)',
            puntos: d.icfProyectado.puntos,
          },
        ]}
        unidadEje="Hijos por mujer"
        decimales={2}
        decimalesEje={1}
        incluirCero
        alto={340}
        fuentes={[d.icfObservado.dato, d.icfProyectado.dato]}
        nota="El tramo proyectado es una hipótesis de proyección, no un dato observado."
        comoLeerlo={
          <>
            <p>
              El indicador observado pasa de {decimal2(icf.valorDesde)} en {icf.desde} a{' '}
              {decimal2(icf.valorHasta)} en {icf.hasta}; la hipótesis proyectada va de{' '}
              {decimal2(proyectado.valorDesde)} en {proyectado.desde} a{' '}
              {decimal2(proyectado.valorHasta)} en {proyectado.hasta}.
            </p>
            <p>
              Mide la fecundidad de cada año, no cuántas personas llegarán a la edad de trabajar ni
              cuándo. No dice qué efecto tendría una variación de la fecundidad en el gasto o en el
              PIB: eso exige un modelo.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Tasas de dependencia proyectadas, con cuatro definiciones"
        descripcion="Proyecciones del INE, de EUROPOP y del Ageing Report. Unidad: personas por cada cien, según la definición de cada serie."
        series={[
          { clave: 'ine', etiqueta: 'INE (tasa de dependencia)', puntos: d.dependenciaIne.puntos },
          { clave: 'europop', etiqueta: 'EUROPOP (mayores)', puntos: d.dependenciaEuropop.puntos },
          {
            clave: 'ageing',
            etiqueta: 'Ageing Report (mayores)',
            puntos: d.dependenciaAgeing.puntos,
          },
          {
            clave: 'economica',
            etiqueta: 'Ageing Report (económica, mayores)',
            puntos: d.dependenciaEconomicaAgeing.puntos,
          },
        ]}
        unidadEje="Personas por cada cien"
        decimales={1}
        decimalesEje={0}
        incluirCero
        alto={400}
        fuentes={[
          d.dependenciaIne.dato,
          d.dependenciaEuropop.dato,
          d.dependenciaAgeing.dato,
          d.dependenciaEconomicaAgeing.dato,
        ]}
        nota="Cada serie usa edades de referencia y población distintas (véase la definición de cada una en los títulos de los datos y en las definiciones de la tarjeta). Son proyecciones con hipótesis explícitas, no datos observados."
        comoLeerlo={
          <>
            <p>
              La dependencia económica de los mayores del Ageing Report pasa de{' '}
              {decimal1(dependenciaEconomica.valorDesde)} en {dependenciaEconomica.desde} a{' '}
              {decimal1(dependenciaEconomica.valorHasta)} en {dependenciaEconomica.hasta}. Las
              series difieren en nivel porque no miden lo mismo: cambian las edades que se cuentan y
              si el denominador es la población o el empleo.
            </p>
            <p>
              La dependencia económica incorpora hipótesis de empleo; la demográfica, no. Los datos
              no permiten separar cuánto de cada tasa se debe a la fecundidad, cuánto a la
              mortalidad y cuánto a la migración.
            </p>
          </>
        }
      />

      <TablaConFuente
        titulo="Saldo migratorio exterior publicado"
        columnas={columnasMigracion}
        filas={filasMigracion}
        fuentes={d.saldoMigratorio.dato}
        pie="Es una serie corta y observada: sirve para ver que la población también cambia por migración, no para estimar su efecto sobre las pensiones."
      />
      <ComoLeerlo>
        <p>
          El saldo migratorio exterior es otra de las variables que mueven la población en edad de
          trabajar. En el periodo que cubre la serie va de{' '}
          {entero(extremos(d.saldoMigratorio.puntos).primero.valor)} personas en{' '}
          {extremos(d.saldoMigratorio.puntos).primero.anio} a{' '}
          {entero(extremos(d.saldoMigratorio.puntos).ultimo.valor)} en{' '}
          {extremos(d.saldoMigratorio.puntos).ultimo.anio}. No hay en los datos una descomposición
          de la contribución relativa de la fecundidad, la mortalidad, la migración y el empleo.
        </p>
      </ComoLeerlo>
    </Afirmacion>
  );
}
