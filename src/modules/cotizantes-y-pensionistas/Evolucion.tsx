import { useMemo, useState } from 'react';
import { SegmentedPills } from '../../components/SegmentedPills';
import { serieAEurosConstantes } from '../../engine/euros-constantes';
import {
  extremos,
  indiceBase100,
  mayorCaida,
  maximo,
  recortar,
  variacion,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { CLASES_PENSION } from '../../engine/sistema-historico';
import { GraficoSeries, type SerieGrafico } from '../historico/GraficoSeries';
import {
  decimal1,
  deAHasta,
  entero,
  ETIQUETA_CLASE,
  euros,
  variacionRelativa,
} from '../historico/formatos';
import { datosCotizantes } from '../historico/datos-cotizantes';

/** Evolución de afiliados, pensiones y pensionistas, y de la pensión media. */
export function Evolucion() {
  const d = datosCotizantes();
  const [precios, setPrecios] = useState<'corrientes' | 'constantes'>('corrientes');

  const afiliados: SerieGrafico[] = [
    { clave: 'total', etiqueta: 'Total del sistema', puntos: d.afiliados.diciembreTotal.puntos },
    { clave: 'general', etiqueta: 'Régimen general', puntos: d.afiliados.diciembreGeneral.puntos },
    { clave: 'autonomos', etiqueta: 'Autónomos', puntos: d.afiliados.diciembreAutonomos.puntos },
  ];
  const totalAfiliados = d.afiliados.diciembreTotal.puntos;
  const vAfiliados = variacion(totalAfiliados);
  const caida = mayorCaida(totalAfiliados);

  const pensionesPensionistas: SerieGrafico[] = [
    { clave: 'pensiones', etiqueta: 'Pensiones contributivas', puntos: d.pensiones.puntos },
    { clave: 'pensionistas', etiqueta: 'Pensionistas (personas)', puntos: d.pensionistas.puntos },
  ];
  const vPensiones = variacion(d.pensiones.puntos);
  const vPensionistas = variacion(d.pensionistas.puntos);

  const clases: SerieGrafico[] = CLASES_PENSION.map((c, i) => ({
    clave: c,
    etiqueta: ETIQUETA_CLASE[c] ?? c,
    puntos: d.numeroPorClase[c].puntos,
    color: i,
  }));
  const vJubilacion = variacion(d.numeroPorClase.jubilacion.puntos);
  const vViudedad = variacion(d.numeroPorClase.viudedad.puntos);

  // Índice base 100 en el primer año común de las tres series.
  const indice = useMemo(() => {
    const brutas = [totalAfiliados, d.pensiones.puntos, d.pensionistas.puntos];
    const base = Math.max(...brutas.map((p) => extremos(p).primero.anio));
    const hasta = Math.min(...brutas.map((p) => extremos(p).ultimo.anio));
    return {
      base,
      series: [
        ['afiliados', 'Afiliados de diciembre', totalAfiliados],
        ['pensiones', 'Pensiones', d.pensiones.puntos],
        ['pensionistas', 'Pensionistas', d.pensionistas.puntos],
      ].map(([clave, etiqueta, puntos]) => ({
        clave: clave as string,
        etiqueta: etiqueta as string,
        puntos: indiceBase100(recortar(puntos as PuntoAnual[], base, hasta), base),
      })),
    };
  }, [d, totalAfiliados]);
  const finIndice = (clave: string) =>
    indice.series.find((s) => s.clave === clave)?.puntos.at(-1)?.valor ?? 0;

  const anioBaseIpc = extremos(d.ipc.puntos.map((p) => ({ anio: p.anio, valor: p.indice }))).ultimo
    .anio;
  const mediaPorClase: SerieGrafico[] = CLASES_PENSION.map((c, i) => {
    const nominal = d.pensionMediaPorClase[c].puntos;
    return {
      clave: c,
      etiqueta: ETIQUETA_CLASE[c] ?? c,
      color: i,
      puntos:
        precios === 'corrientes'
          ? nominal
          : serieAEurosConstantes(
              nominal.map((p) => ({ anio: p.anio, importe: p.valor })),
              anioBaseIpc,
              d.ipc,
            ).map((p) => ({ anio: p.anio, valor: p.importe })),
    };
  });
  const vMediaTotal = variacion(d.pensionMediaTotal.puntos);
  const vMediaConstantes = variacion(
    serieAEurosConstantes(
      d.pensionMediaTotal.puntos.map((p) => ({ anio: p.anio, importe: p.valor })),
      anioBaseIpc,
      d.ipc,
    ).map((p) => ({ anio: p.anio, valor: p.importe })),
  );
  const jubilacionMedia = maximo(d.pensionMediaPorClase.jubilacion.puntos);

  return (
    <>
      <section className="seccion prosa" aria-labelledby="evolucion">
        <h2 id="evolucion">Afiliados, pensiones y pensionistas a lo largo del tiempo</h2>
        <p>
          Los dos extremos de la relación son, por un lado, las personas afiliadas en alta a la
          Seguridad Social y, por otro, las pensiones contributivas en vigor y las personas que las
          perciben. Son magnitudes distintas: una persona puede cobrar más de una pensión, por lo
          que el número de pensiones es mayor que el de pensionistas.
        </p>

        <GraficoSeries
          titulo="Afiliados en alta en diciembre, por régimen"
          descripcion="Afiliados medios del mes de diciembre. Unidad: millones de personas afiliadas."
          series={afiliados}
          unidadEje="Millones de afiliados"
          divisorEje={1_000_000}
          incluirCero
          fuentes={[
            d.afiliados.diciembreTotal.dato,
            d.afiliados.diciembreGeneral.dato,
            d.afiliados.diciembreAutonomos.dato,
          ]}
          nota="Los regímenes mostrados no suman el total del sistema: no se representan el resto de regímenes ni los sistemas especiales."
          comoLeerlo={
            <>
              <p>
                Cada línea cuenta las personas afiliadas en alta en el mes de diciembre de cada año.
                El total del sistema pasa {deAHasta(totalAfiliados, entero)} (
                {variacionRelativa(vAfiliados.relativa ?? 0)} en el periodo).
                {caida === null
                  ? ''
                  : ` La mayor caída entre dos años de la serie va de ${entero(caida.maximo.valor)} en ${caida.maximo.anio} a ${entero(caida.minimo.valor)} en ${caida.minimo.anio}.`}
              </p>
              <p>
                Subir significa que había más personas en alta ese mes. No dice cuántas horas se
                trabajan, qué base de cotización tienen ni cuántas de ellas cotizan durante todo el
                año.
              </p>
            </>
          }
        />

        <GraficoSeries
          titulo="Pensiones contributivas y pensionistas, a diciembre"
          descripcion="Número de pensiones contributivas en vigor y de personas que perciben al menos una. Unidad: millones."
          series={pensionesPensionistas}
          unidadEje="Millones"
          divisorEje={1_000_000}
          decimalesEje={1}
          incluirCero
          fuentes={[d.pensiones.dato, d.pensionistas.dato]}
          nota="La serie de pensiones de la fuente difiere en decenas de unidades del fichero mensual de diciembre en algunos años (revisión posterior de la Seguridad Social); se conserva cada cifra con su origen."
          comoLeerlo={
            <>
              <p>
                Las pensiones pasan {deAHasta(d.pensiones.puntos, entero)} y los pensionistas{' '}
                {deAHasta(d.pensionistas.puntos, entero)}:{' '}
                {variacionRelativa(vPensiones.relativa ?? 0)} y{' '}
                {variacionRelativa(vPensionistas.relativa ?? 0)}, respectivamente.
              </p>
              <p>
                La distancia entre las dos líneas son las pensiones «adicionales» de personas que
                cobran más de una. Que ambas suban refleja que las altas superan a las bajas (véase
                más abajo); la gráfica no dice por qué.
              </p>
            </>
          }
        />

        <GraficoSeries
          titulo="Pensiones contributivas en vigor por clase, a principios de diciembre"
          descripcion="Número de pensiones por clase (ambos sexos). Unidad: millones de pensiones."
          series={clases}
          unidadEje="Millones de pensiones"
          divisorEje={1_000_000}
          decimalesEje={1}
          incluirCero
          fuentes={CLASES_PENSION.map((c) => d.numeroPorClase[c].dato)}
          comoLeerlo={
            <>
              <p>
                Las pensiones de jubilación pasan{' '}
                {deAHasta(d.numeroPorClase.jubilacion.puntos, entero)} (
                {variacionRelativa(vJubilacion.relativa ?? 0)}) y las de viudedad{' '}
                {deAHasta(d.numeroPorClase.viudedad.puntos, entero)} (
                {variacionRelativa(vViudedad.relativa ?? 0)}).
              </p>
              <p>
                Cada clase tiene sus propias reglas y su propio colectivo (véase la sección «Tipos
                de pensión»). Esta gráfica cuenta pensiones, no personas: quien cobra una pensión de
                jubilación y otra de viudedad aparece en ambas líneas.
              </p>
            </>
          }
        />

        <GraficoSeries
          titulo={`Crecimiento comparado, con el año ${indice.base} como base`}
          descripcion={`Índice: valor de cada año dividido por el valor de ${indice.base} y multiplicado por cien. Sin unidad.`}
          series={indice.series}
          unidadEje="Índice"
          incluirCero={false}
          decimales={1}
          fuentes={[d.afiliados.diciembreTotal.dato, d.pensiones.dato, d.pensionistas.dato]}
          nota={`Cálculo propio (índice base cien en ${indice.base}) a partir de las series de las gráficas anteriores; dato derivado.`}
          comoLeerlo={
            <>
              <p>
                Con el año {indice.base} igual a cien, al final del periodo los afiliados valen{' '}
                {decimal1(finIndice('afiliados'))}, las pensiones {decimal1(finIndice('pensiones'))}{' '}
                y los pensionistas {decimal1(finIndice('pensionistas'))}.
              </p>
              <p>
                Un índice permite comparar ritmos de crecimiento aunque las magnitudes sean de
                distinto tamaño. Depende del año elegido como base y no dice nada sobre el nivel de
                cada magnitud.
              </p>
            </>
          }
        />
      </section>

      <section className="seccion prosa" aria-labelledby="pension-media">
        <h2 id="pension-media">Pensión media por clase</h2>
        <p>
          La pensión media es el importe mensual medio de las pensiones en vigor de cada clase a
          principios de diciembre. Se puede ver en euros de cada año (corrientes) o en euros de{' '}
          {anioBaseIpc} (constantes), que descuentan la variación del IPC medio anual.
        </p>
        <div className="hist-selector">
          <SegmentedPills
            leyenda="Precios"
            opciones={[
              { valor: 'corrientes', etiqueta: 'Euros corrientes' },
              { valor: 'constantes', etiqueta: `Euros constantes de ${anioBaseIpc}` },
            ]}
            valor={precios}
            onCambio={setPrecios}
          />
        </div>
        <GraficoSeries
          titulo={
            precios === 'corrientes'
              ? 'Pensión media mensual por clase, en euros corrientes'
              : `Pensión media mensual por clase, en euros constantes de ${anioBaseIpc}`
          }
          descripcion="Pensión media de las pensiones contributivas en vigor a principios de diciembre. Unidad: euros al mes."
          series={mediaPorClase}
          unidadEje="Euros al mes"
          incluirCero={false}
          decimalesEje={0}
          decimales={2}
          fuentes={[...CLASES_PENSION.map((c) => d.pensionMediaPorClase[c].dato), d.datoIpc]}
          nota={
            precios === 'constantes'
              ? 'Euros constantes: importe × IPC medio del año base ÷ IPC medio del año del importe (cálculo propio, dato derivado).'
              : undefined
          }
          comoLeerlo={
            <>
              <p>
                La pensión media del total del sistema pasa{' '}
                {deAHasta(d.pensionMediaTotal.puntos, euros)} en euros corrientes (
                {variacionRelativa(vMediaTotal.relativa ?? 0)}) y, en euros constantes de{' '}
                {anioBaseIpc}, {variacionRelativa(vMediaConstantes.relativa ?? 0)}. La pensión media
                de jubilación alcanza su valor más alto en {jubilacionMedia.anio}, con{' '}
                {euros(jubilacionMedia.valor)}.
              </p>
              <p>
                La media mezcla pensiones de distinta antigüedad e importe: que la media suba no
                significa que cada pensión individual suba en la misma proporción. El gráfico no
                distingue por antigüedad de la pensión ni por años cotizados.
              </p>
            </>
          }
        />
      </section>
    </>
  );
}
