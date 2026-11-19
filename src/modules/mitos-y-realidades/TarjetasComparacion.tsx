/**
 * Tarjetas de las afirmaciones que comparan magnitudes con umbrales, con el salario o con otros
 * países. Toda cifra sale de /data a través de `datos-mitos.ts`; los textos no llevan dígitos.
 */
import type { Columna } from '../../components/DataTable';
import { formatearNumero } from '../../engine/formato';
import { extremos, variacion } from '../../engine/series-historicas';
import { ComoLeerlo } from '../historico/ComoLeerlo';
import { GraficoSeries } from '../historico/GraficoSeries';
import { entero, puntosAPorcentaje } from '../historico/formatos';
import { Afirmacion, type Mito } from './Afirmacion';
import { FuentesDesplegables, TablaConFuente } from './bloques';
import { datosMitos } from './datos-mitos';
import { NIVEL_SALARIO_MEDIO, ROTULO_SALARIO } from './ids-datos';

interface TarjetaProps {
  readonly mito: Mito;
  readonly indice: number;
  readonly total: number;
}

type FilaTexto = Record<string, string | number | null>;

const rotuloDe = (id: string): string =>
  ROTULO_SALARIO.find((r) => id.endsWith(r.sufijo))?.rotulo ?? id;

export function TarjetaPobreza({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().pobreza;
  const arope = extremos(d.arope.puntos);
  const oaip = extremos(d.oaip.puntos);
  const minima = variacion(d.minimaJubilacion.puntos);
  const pnc = variacion(d.pnc.puntos);

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'tipos-de-pension' }, { slug: 'otros-sistemas' }]}
      medible={
        <p>
          Los datos permiten ver dos indicadores de riesgo de pobreza de las personas mayores (el de
          pobreza o exclusión social de Eurostat y la pobreza de renta de la OCDE) y las cuantías de
          la pensión mínima de jubilación y de la pensión no contributiva. El resultado depende del
          indicador, del umbral, de la edad que se considere y de lo que se compute como renta.
          Umbral, contenido exacto del indicador y tratamiento del alquiler de la vivienda en
          propiedad: perímetro no verificado en las fuentes consultadas.
        </p>
      }
    >
      <GraficoSeries
        titulo="Dos indicadores de riesgo de pobreza de las personas mayores"
        descripcion="Pobreza o exclusión social (Eurostat) y pobreza de renta (OCDE). Unidad: porcentaje de la población de esa edad."
        series={[
          {
            clave: 'arope',
            etiqueta: 'Pobreza o exclusión social (Eurostat)',
            puntos: d.arope.puntos,
          },
          { clave: 'oaip', etiqueta: 'Pobreza de renta (OCDE)', puntos: d.oaip.puntos },
        ]}
        unidadEje="Porcentaje de la población de esa edad"
        decimales={1}
        decimalesEje={0}
        incluirCero
        alto={360}
        fuentes={[d.arope.dato, d.oaip.dato]}
        nota="Los dos indicadores no son comparables entre sí: usan edades de referencia, umbrales y definiciones de renta distintos. Perímetro no verificado en las fuentes consultadas."
        comoLeerlo={
          <>
            <p>
              El indicador de Eurostat pasa de {puntosAPorcentaje(arope.primero.valor)} en{' '}
              {arope.primero.anio} a {puntosAPorcentaje(arope.ultimo.valor)} en {arope.ultimo.anio};
              el de la OCDE, de {puntosAPorcentaje(oaip.primero.valor)} en {oaip.primero.anio} a{' '}
              {puntosAPorcentaje(oaip.ultimo.valor)} en {oaip.ultimo.anio}.
            </p>
            <p>
              El primero es un indicador de «pobreza o exclusión social» cuyo contenido exacto no se
              ha verificado en las fuentes consultadas; el segundo mide la renta por debajo de un
              umbral relativo a la mediana y, por ser relativo, cambia cuando cambia la renta
              mediana, no solo la de los pensionistas. No hay en los datos la distribución de las
              pensiones por cuantía, y ninguna de las dos mide la situación de «los pensionistas»
              como grupo, sino la de las personas mayores.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Pensión mínima de jubilación y pensión no contributiva, en euros al año"
        descripcion="Cuantía mínima anual de la jubilación del titular de sesenta y cinco años sin cónyuge a cargo y cuantía de la pensión no contributiva. Unidad: euros al año."
        series={[
          {
            clave: 'minima',
            etiqueta: 'Pensión mínima de jubilación',
            puntos: d.minimaJubilacion.puntos,
          },
          { clave: 'pnc', etiqueta: 'Pensión no contributiva', puntos: d.pnc.puntos },
        ]}
        unidadEje="Euros al año"
        decimales={2}
        incluirCero
        alto={340}
        fuentes={[d.minimaJubilacion.datos[0], d.pnc.datos[0]].flatMap((x) =>
          x === undefined ? [] : [x],
        )}
        nota="Los datos no incluyen un umbral de pobreza en euros: las cuantías no se comparan con ninguno."
        comoLeerlo={
          <>
            <p>
              La pensión mínima de jubilación pasa de {entero(minima.valorDesde)} euros al año en{' '}
              {minima.desde} a {entero(minima.valorHasta)} en {minima.hasta}; la no contributiva, de{' '}
              {entero(pnc.valorDesde)} a {entero(pnc.valorHasta)} euros en los mismos años.
            </p>
            <p>
              Son importes de referencia de las prestaciones, en euros corrientes. No dicen si
              alcanzan o no un umbral: la regla de las pensiones mínimas usa el umbral de pobreza de
              un hogar de dos adultos, que no está en los datos.
            </p>
          </>
        }
      />
      <FuentesDesplegables
        datos={[...d.minimaJubilacion.datos, ...d.pnc.datos]}
        titulo="Normas de la pensión mínima de jubilación y de la pensión no contributiva de cada año"
        resumen={`Ver las normas de cada año (${d.minimaJubilacion.datos.length + d.pnc.datos.length} datos)`}
      />
    </Afirmacion>
  );
}

export function TarjetaReposicion({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().reposicion;

  const filasTeoricas: FilaTexto[] = d.bruta.map((b, i) => {
    const neta = d.neta[i]?.valor;
    return {
      nivel: `${formatearNumero(Number(b.nivel))} % del salario medio`,
      bruta: typeof b.valor === 'number' ? b.valor / 100 : null,
      neta: typeof neta === 'number' ? neta / 100 : null,
    };
  });
  const columnasTeoricas: Columna<FilaTexto>[] = [
    { clave: 'nivel', titulo: 'Nivel de renta de la persona' },
    { clave: 'bruta', titulo: 'Tasa bruta', tipo: 'porcentaje', decimales: 1 },
    { clave: 'neta', titulo: 'Tasa neta', tipo: 'porcentaje', decimales: 1 },
  ];

  const anios = d.altas.flatMap((s) => s.puntos.map((p) => p.anio));
  const aniosAltas = [...new Set(anios)].sort((a, b) => a - b);
  const filasAltas: FilaTexto[] = aniosAltas.map((anio) => {
    const fila: FilaTexto = { anio: String(anio) };
    d.altas.forEach((s, i) => {
      fila[`s${i}`] = s.puntos.find((p) => p.anio === anio)?.valor ?? null;
    });
    return fila;
  });
  const columnasAltas: Columna<FilaTexto>[] = [
    { clave: 'anio', titulo: 'Año' },
    ...d.altas.map((s, i) => ({
      clave: `s${i}`,
      titulo: rotuloDe(s.id),
      tipo: 'numero' as const,
      decimales: 1,
    })),
  ];
  const bruta100 = d.bruta.find((b) => b.nivel === NIVEL_SALARIO_MEDIO);
  const neta100 = d.neta.find((b) => b.nivel === NIVEL_SALARIO_MEDIO);
  const ultimoVigor = d.enVigor[0] === undefined ? undefined : extremos(d.enVigor[0].puntos).ultimo;

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'otros-sistemas' }, { slug: 'como-se-calcula' }, { slug: 'tu-pension' }]}
      medible={
        <p>
          Los datos permiten ver dos tipos de medida: la tasa de reposición teórica de la OCDE
          (pensión de una persona con carrera completa desde su entrada en el mercado laboral,
          frente a sus ingresos previos, con parámetros de un año) y cocientes empíricos entre la
          pensión media y varios salarios medios, que comparan colectivos y no una carrera. Dan
          cifras distintas porque responden a preguntas distintas, y el cociente empírico cambia con
          el salario que se tome como denominador.
        </p>
      }
    >
      <TablaConFuente
        titulo="Tasas de reposición teóricas de la OCDE para España"
        columnas={columnasTeoricas}
        filas={filasTeoricas}
        fuentes={[...d.bruta.map((b) => b.dato), ...d.neta.map((b) => b.dato)]}
        pie="Carrera completa y parámetros del año de la fuente. Las tasas de mujeres y de hombres coinciden en los datos."
      />
      <ComoLeerlo>
        <p>
          {bruta100 === undefined || neta100 === undefined
            ? ''
            : `Para una persona con ingresos iguales al salario medio, la tasa bruta teórica es de ${puntosAPorcentaje(Number(bruta100.valor))} y la neta, de ${puntosAPorcentaje(Number(neta100.valor))}. `}
          Mide la pensión de una persona con carrera completa, no la de los pensionistas reales, que
          tienen carreras de distinta duración, mínimos y topes. La tasa neta descuenta impuestos y
          cotizaciones.
        </p>
        <ul>
          {d.supuestos.map((s) => (
            <li key={s.id}>{String(s.valor)}</li>
          ))}
        </ul>
      </ComoLeerlo>

      <GraficoSeries
        titulo="Pensión media de jubilación en vigor sobre el salario medio, con cuatro salarios"
        descripcion="Pensión media en catorce pagas dividida por cada salario medio anual. Unidad: porcentaje."
        series={d.enVigor.map((s) => ({
          clave: s.id,
          etiqueta: rotuloDe(s.id),
          puntos: s.puntos,
        }))}
        unidadEje="Porcentaje del salario medio"
        decimales={1}
        decimalesEje={0}
        incluirCero
        alto={400}
        fuentes={d.enVigor.map((s) => s.dato)}
        nota="Datos derivados: no es una tasa de reposición, porque compara medias de colectivos. Los cuatro denominadores miden salarios distintos (con o sin cotizaciones del empleador, por trabajador o por puesto) y por eso los cocientes difieren."
        comoLeerlo={
          <>
            <p>
              {ultimoVigor === undefined
                ? ''
                : `Con el primer denominador, el cociente es de ${puntosAPorcentaje(ultimoVigor.valor)} en ${ultimoVigor.anio}. `}
              Con otro salario medio en el denominador, el mismo numerador da un cociente distinto.
            </p>
            <p>
              Compara la pensión media de todos los jubilados con el salario medio de todos los
              asalariados, no la pensión de una persona con su último salario. Las diferencias con
              la tasa teórica no se pueden descomponer con los datos.
            </p>
          </>
        }
      />

      <TablaConFuente
        titulo="Pensión media de las altas de jubilación sobre el salario medio, con cuatro salarios"
        columnas={columnasAltas}
        filas={filasAltas}
        fuentes={d.altas.map((s) => s.dato)}
        pie="Porcentaje. Datos derivados, no publicados por la fuente. Compara colectivos, no una carrera."
      />
    </Afirmacion>
  );
}

export function TarjetaGasto({ mito, indice, total }: TarjetaProps) {
  const d = datosMitos().gasto;
  const espana = extremos(d.espana.puntos).ultimo;
  const union = extremos(d.union.puntos).ultimo;
  const ocde = extremos(d.ocde.puntos).ultimo;
  const propio = extremos(d.contributivas.puntos).ultimo;

  return (
    <Afirmacion
      mito={mito}
      indice={indice}
      total={total}
      enlaces={[{ slug: 'otros-sistemas' }, { slug: 'financiacion-y-deficit' }]}
      medible={
        <p>
          Los datos permiten ver cuatro medidas de gasto sobre el PIB con perímetros distintos: las
          prestaciones de vejez y supervivencia de Eurostat (para España y para la Unión Europea),
          el gasto público en pensiones de la OCDE y las pensiones contributivas del Sistema de la
          Seguridad Social. «Más que la media europea» depende de la medida, del año y de qué países
          entran en la media. Los datos no ajustan por la estructura de edades de la población.
        </p>
      }
    >
      <GraficoSeries
        titulo="Gasto en pensiones sobre el PIB con cuatro definiciones"
        descripcion="España y Unión Europea en Eurostat, España en la OCDE y pensiones contributivas del Sistema. Unidad: porcentaje del PIB."
        series={[
          {
            clave: 'eurostat',
            etiqueta: 'Eurostat, España (vejez y supervivencia)',
            puntos: d.espana.puntos,
          },
          { clave: 'union', etiqueta: 'Eurostat, Unión Europea', puntos: d.union.puntos },
          { clave: 'ocde', etiqueta: 'OCDE, España (gasto público)', puntos: d.ocde.puntos },
          {
            clave: 'propio',
            etiqueta: 'Pensiones contributivas del Sistema',
            puntos: d.contributivas.puntos,
          },
        ]}
        unidadEje="Porcentaje del PIB"
        decimales={1}
        decimalesEje={0}
        incluirCero
        alto={400}
        fuentes={[d.espana.dato, d.union.dato, d.ocde.dato, d.contributivas.dato]}
        nota="Perímetro no verificado en las fuentes consultadas para las medidas de Eurostat y de la OCDE: no se sabe si incluyen prestaciones en especie, Clases Pasivas o pensiones no contributivas. La del Sistema es un cálculo propio (obligaciones de «suma de pensiones» entre PIB) sin Clases Pasivas ni pensiones no contributivas."
        comoLeerlo={
          <>
            <p>
              En el último año de cada serie: Eurostat, España, {puntosAPorcentaje(espana.valor)}{' '}
              del PIB en {espana.anio}; Eurostat, Unión Europea, {puntosAPorcentaje(union.valor)} en{' '}
              {union.anio}; OCDE, España, {puntosAPorcentaje(ocde.valor)} en {ocde.anio}; pensiones
              contributivas del Sistema, {puntosAPorcentaje(propio.valor)} en {propio.anio}.
            </p>
            <p>
              Las series no cubren los mismos años ni la misma población de prestaciones, así que no
              deben leerse como una sola medida con cuatro valores. Que un gasto sea alto o bajo
              «para España» depende del PIB y de la estructura de edades; los datos no hacen ese
              ajuste (haría falta, por ejemplo, el gasto por persona mayor).
            </p>
          </>
        }
      />
    </Afirmacion>
  );
}
