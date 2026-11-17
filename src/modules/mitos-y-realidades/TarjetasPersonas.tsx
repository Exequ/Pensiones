/**
 * Tarjetas de las afirmaciones sobre cotizantes, cotizaciones y edad de jubilación. Toda cifra sale
 * de /data a través de `datos-mitos.ts`; los textos no llevan dígitos.
 */
import type { Columna } from '../../components/DataTable';
import { formatearDuracion } from '../../engine/formato';
import { extremos, variacion } from '../../engine/series-historicas';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal1, decimal2, variacionRelativa } from '../historico/formatos';
import { Afirmacion, type Mito } from './Afirmacion';
import { TablaConFuente } from './bloques';
import { datosMitos } from './datos-mitos';

interface TarjetaProps {
  readonly mito: Mito;
  readonly indice: number;
  readonly total: number;
}

type FilaTexto = Record<string, string | number | null>;

export function TarjetaCotizantes({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().cotizantes;
  const medidas = [
    {
      clave: 'diciembre',
      etiqueta: 'Por pensionista (diciembre)',
      serie: d.porPensionistaDiciembre,
    },
    { clave: 'mediaAnual', etiqueta: 'Por pensión (media anual)', serie: d.porPensionMediaAnual },
    {
      clave: 'alternativa',
      etiqueta: 'Por pensión (alternativa uno)',
      serie: d.porPensionUltimoDia,
    },
  ] as const;
  const variaciones = medidas.map((m) => ({ ...m, v: variacion(m.serie.puntos) }));
  const apoyo = variacion(d.apoyoAgeing.puntos);
  const dependencia = variacion(d.dependenciaAgeing.puntos);

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'cotizantes-y-pensionistas' }, { slug: 'proyecciones' }]}
      medible={
        <>
          <p>
            Los datos permiten calcular cuántos afiliados hay por cada pensionista o por cada
            pensión con tres definiciones distintas, y ver dos proyecciones publicadas por la
            Comisión Europea: el ratio de apoyo y la dependencia de los mayores. «Afiliado» es una
            situación de alta en la Seguridad Social, no una persona: quien tiene más de un alta
            cuenta más de una vez. Tampoco es lo mismo que «cotizante»: las medidas que añaden a los
            desempleados con prestación y los convenios especiales, o que evitan el doble cómputo,
            no están en los datos.
          </p>
        </>
      }
    >
      <GraficoSeries
        titulo="Afiliados por pensionista o por pensión, con tres definiciones"
        descripcion="Cocientes calculados con las series de la Seguridad Social. Unidad: afiliados por pensionista o por pensión."
        series={medidas.map((m) => ({
          clave: m.clave,
          etiqueta: m.etiqueta,
          puntos: m.serie.puntos,
        }))}
        unidadEje="Afiliados por pensionista o por pensión"
        decimales={2}
        decimalesEje={1}
        incluirCero
        alto={360}
        fuentes={medidas.map((m) => m.serie.dato)}
        nota="Datos derivados: la Seguridad Social no publica estas razones. El numerador cuenta afiliados (relaciones laborales en alta, con pluriempleo); el denominador, pensionistas (personas) o pensiones (una persona puede cobrar varias)."
        comoLeerlo={
          <>
            <p>
              {variaciones
                .map(
                  (m) =>
                    `${m.etiqueta}: de ${decimal2(m.v.valorDesde)} en ${m.v.desde} a ${decimal2(m.v.valorHasta)} en ${m.v.hasta}${m.v.relativa === null ? '' : ` (${variacionRelativa(m.v.relativa)})`}`,
                )
                .join('; ')}
              .
            </p>
            <p>
              Las tres líneas son afiliados entre pensionistas o pensiones, no cotizantes entre
              pensionistas. El nivel y el signo de la tendencia dependen de la definición y del
              periodo elegido. El doble cómputo (pluriempleo, regímenes especiales, personas que
              cobran más de una pensión) afecta al nivel y solo a la tendencia si cambia su peso.
              Las definiciones sin doble cómputo no están en los datos.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Dos medidas proyectadas por el Ageing Report de la Comisión Europea"
        descripcion="Escenario de referencia, proyección publicada por la fuente. Unidad: personas por cada cien."
        series={[
          {
            clave: 'apoyo',
            etiqueta: 'Cotizantes por cada cien pensionistas',
            puntos: d.apoyoAgeing.puntos,
          },
          {
            clave: 'dependencia',
            etiqueta: 'Mayores por cada cien en edad de trabajar',
            puntos: d.dependenciaAgeing.puntos,
          },
        ]}
        unidadEje="Personas por cada cien"
        decimales={1}
        incluirCero
        alto={360}
        fuentes={[d.apoyoAgeing.dato, d.dependenciaAgeing.dato]}
        nota="Proyecciones publicadas por la fuente con hipótesis demográficas y de empleo; no son datos observados. Las dos medidas tienen definiciones distintas: la primera cuenta cotizantes y pensionistas públicos; la segunda, población por edades."
        comoLeerlo={
          <>
            <p>
              El ratio de apoyo proyectado pasa de {decimal1(apoyo.valorDesde)} en {apoyo.desde} a{' '}
              {decimal1(apoyo.valorHasta)} en {apoyo.hasta}; la dependencia de los mayores, de{' '}
              {decimal1(dependencia.valorDesde)} en {dependencia.desde} a{' '}
              {decimal1(dependencia.valorHasta)} en {dependencia.hasta}.
            </p>
            <p>
              Una proyección no es una predicción: depende de las hipótesis de fecundidad,
              mortalidad, migración y empleo de la fuente. Las dos medidas pueden moverse en
              direcciones distintas porque no miden lo mismo.
            </p>
          </>
        }
      />
    </Afirmacion>
  );
}

export function TarjetaJubilados({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().jubilados;

  const piezas: FilaTexto[] = [
    {
      pieza: 'Cotizaciones pagadas',
      decision:
        'Qué se cuenta: solo la parte del trabajador, o también la de la empresa; y, dentro del tipo de contingencias comunes, solo la parte que financia la jubilación o el tipo entero (que también cubre otras prestaciones).',
      datos:
        'Los tipos de cotización están en los datos. Las bases cotizadas por persona a lo largo de la carrera no.',
    },
    {
      pieza: 'Prestaciones esperadas',
      decision:
        'Qué prestaciones entran (jubilación, viudedad derivada, complementos a mínimos) y durante cuánto tiempo.',
      datos:
        'Las reglas de cálculo de la pensión están en los datos. La distribución de pensiones por persona no.',
    },
    {
      pieza: 'Mortalidad',
      decision: 'Qué tabla de mortalidad, por sexo y por cohorte de nacimiento.',
      datos: 'Hay tablas de mortalidad y esperanza de vida del INE en los datos.',
    },
    {
      pieza: 'Tipo de descuento',
      decision:
        'Con qué tipo se actualizan los flujos (por ejemplo, el crecimiento de la masa salarial o el rendimiento de la deuda pública a largo plazo): es un supuesto, no un dato observado.',
      datos: 'No es un dato: es una decisión de quien calcula.',
    },
    {
      pieza: 'Cohorte',
      decision:
        'Cómo se agrupan las personas (año de nacimiento o de jubilación) y a qué fecha se calcula.',
      datos: 'No hay historiales de cotización individuales, que son la base para formar cohortes.',
    },
    {
      pieza: 'Riqueza de pensiones de la OCDE',
      decision:
        'Mide el valor actual de las prestaciones esperadas en múltiplos del salario anual para una carrera completa teórica; no es un cociente entre prestaciones y cotizaciones.',
      datos:
        'Está en los datos para una carrera teórica; no es comparable directamente con lo cotizado.',
    },
  ];
  const columnas: Columna<FilaTexto>[] = [
    { clave: 'pieza', titulo: 'Pieza del cálculo' },
    { clave: 'decision', titulo: 'Qué hay que decidir' },
    { clave: 'datos', titulo: 'Qué hay en los datos' },
  ];

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'como-se-calcula' }, { slug: 'otros-sistemas' }]}
      medible={
        <p>
          Con los datos de este proyecto no se puede comparar lo cotizado con lo cobrado, y esta
          tarjeta no contiene ninguna cifra de uno ni de otro. Para hacerlo sería necesario
          calcular, por cohorte, el cociente entre el valor actual de las prestaciones esperadas y
          el valor actual de las cotizaciones, y eso exige historiales de cotización individuales
          que no constan en las fuentes consultadas. Se describe el cálculo, las decisiones que
          contiene y qué piezas hay y cuáles faltan.
        </p>
      }
    >
      <TablaConFuente
        titulo="Piezas de un cálculo de lo cotizado frente a lo cobrado"
        columnas={columnas}
        filas={piezas}
        fuentes={d.fuentes}
        pie="La fuente que se cita es la de la medida de riqueza de pensiones de la OCDE, la única de las piezas que figura en los datos con una definición propia."
      />
      <ComoLeerlo>
        <p>
          La tabla es un marco, no un resultado. El cociente entre prestaciones y cotizaciones
          cambia con cada decisión de la columna central: con qué cotizaciones se cuente, con qué
          descuento y con qué mortalidad. Por eso un mismo grupo de jubilados puede quedar por
          encima o por debajo de uno según el método, y los datos de este proyecto no permiten decir
          cuál de los dos casos se da.
        </p>
      </ComoLeerlo>
    </Afirmacion>
  );
}

export function TarjetaEdad({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().edad;
  const legalUltimo = d.legal.mesesUltimo;
  const altas = d.altas.puntos;
  const { ultimo: ultimaAlta } = extremos(altas);
  const desde = d.legal.puntos[0]?.anio ?? 0;
  const salidaH = d.salidaHombres.puntos.filter((p) => p.anio >= desde);
  const salidaM = d.salidaMujeres.puntos.filter((p) => p.anio >= desde);
  const salidaUltimo = extremos(salidaH).ultimo;

  const referencias: FilaTexto[] = [
    {
      medida:
        'Edad de jubilación actual de la OCDE (carrera ininterrumpida desde la entrada en el mercado laboral)',
      valor: `${typeof d.edadActualOcde.valor === 'number' ? decimal1(d.edadActualOcde.valor) : d.edadActualOcde.valor} años`,
    },
    {
      medida:
        'Periodo cotizado que permite jubilarse a la edad de referencia sin reducción (carrera larga)',
      valor: formatearDuracion(Number(d.carrera65.valor)),
    },
    {
      medida:
        'Meses de una carrera completa desde la entrada en el mercado laboral hasta la edad de referencia',
      valor: formatearDuracion(d.carreraCompleta.valor),
    },
  ];
  const columnas: Columna<FilaTexto>[] = [
    { clave: 'medida', titulo: 'Referencia' },
    { clave: 'valor', titulo: 'Valor' },
  ];

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[
        { slug: 'cotizantes-y-pensionistas' },
        { slug: 'como-se-calcula' },
        { slug: 'otros-sistemas' },
      ]}
      medible={
        <p>
          Los datos permiten comparar cuatro edades que responden a preguntas distintas: la edad
          ordinaria legal de jubilación de cada año, la edad media de las altas de jubilación, la
          edad efectiva de salida del mercado laboral que estima la OCDE y la edad de jubilación
          actual de la OCDE para una carrera completa. No hay una única edad «real»: cada medida
          tiene su definición y su población de referencia.
        </p>
      }
    >
      <GraficoSeries
        titulo="Cuatro medidas de la edad de jubilación"
        descripcion="Edad legal ordinaria, edad media de las altas y edad efectiva de salida del mercado laboral (OCDE). Unidad: años."
        series={[
          { clave: 'legal', etiqueta: 'Edad ordinaria legal', puntos: d.legal.puntos },
          { clave: 'altas', etiqueta: 'Edad media de las altas de jubilación', puntos: altas },
          { clave: 'salidaH', etiqueta: 'Salida efectiva, hombres (OCDE)', puntos: salidaH },
          { clave: 'salidaM', etiqueta: 'Salida efectiva, mujeres (OCDE)', puntos: salidaM },
        ]}
        unidadEje="Años"
        decimales={1}
        decimalesEje={0}
        alto={380}
        fuentes={[
          ...d.legal.datos.slice(-1),
          d.altas.dato,
          d.salidaHombres.dato,
          d.salidaMujeres.dato,
        ]}
        nota="La edad legal es la edad ordinaria cuando no se alcanza el periodo cotizado de la carrera larga, expresada en años y fracción de año. La edad efectiva de salida es una estimación de la OCDE cuyo método no se ha consultado."
        comoLeerlo={
          <>
            <p>
              {legalUltimo === undefined
                ? ''
                : `La edad ordinaria legal de ${legalUltimo.anio} es de ${formatearDuracion(legalUltimo.valor)} de edad. `}
              La edad media de las altas de jubilación es de {decimal1(ultimaAlta.valor)} años en{' '}
              {ultimaAlta.anio}, y la edad efectiva de salida de los hombres, de{' '}
              {decimal1(salidaUltimo.valor)} años en {salidaUltimo.anio}.
            </p>
            <p>
              Las cuatro líneas no son intercambiables: una es una norma, otra el promedio de
              quienes se jubilan en un año, y las otras dos una estimación de salida del mercado
              laboral. En los datos no está la distribución de edades de alta ni el peso de cada
              modalidad de jubilación (anticipada, demorada, ordinaria).
            </p>
          </>
        }
      />

      <TablaConFuente
        titulo="Otras referencias de edad y de carrera"
        columnas={columnas}
        filas={referencias}
        fuentes={[d.edadActualOcde.dato, d.carrera65.dato, d.carreraCompleta.dato]}
        pie="Los periodos se expresan en años y meses; la fuente los da en meses."
      />
    </Afirmacion>
  );
}
