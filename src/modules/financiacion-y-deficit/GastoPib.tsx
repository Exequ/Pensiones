import {
  aniosComunes,
  porcentajeDelPib,
  suma,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal1, puntosAPorcentaje } from '../historico/formatos';
import { datosFinanciacion } from '../historico/datos-financiacion';

/** Gasto en pensiones sobre el PIB según las definiciones disponibles. */
export function GastoPib() {
  const d = datosFinanciacion();
  const { ejecucion, pib, gastoSobrePib } = d;

  const propio = porcentajeDelPib(ejecucion.sumaPensiones.puntos, pib.puntos);
  const propioConComplemento = porcentajeDelPib(
    suma(ejecucion.sumaPensiones.puntos, ejecucion.complementoMinimos.puntos),
    pib.puntos,
  );
  const vejez = gastoSobrePib.eurostatVejez.puntos;
  const vejezMasSupervivencia = suma(vejez, gastoSobrePib.eurostatSupervivencia.puntos);
  const ocde = gastoSobrePib.ocde.puntos;

  // Último año con todas las definiciones (la OCDE limita la comparación).
  const comunes = aniosComunes(aniosComunes2(propio, vejez), ocde);
  const anioComun = comunes.at(-1);
  const en = (p: readonly PuntoAnual[]) => p.find((x) => x.anio === anioComun)?.valor ?? 0;

  return (
    <section className="seccion prosa" aria-labelledby="gasto-pib">
      <h2 id="gasto-pib">El gasto en pensiones sobre el PIB: varias formas de medirlo</h2>
      <p>
        Para comparar el gasto en pensiones a lo largo del tiempo se suele dividir entre el PIB. El
        resultado cambia según qué prestaciones se incluyan en el numerador: solo las pensiones
        contributivas de la Seguridad Social, con o sin el complemento a mínimos, las prestaciones
        de vejez y supervivencia de la estadística europea de protección social, o el gasto público
        en pensiones que recoge la OCDE.
      </p>
      <GraficoSeries
        titulo="Gasto en pensiones sobre el PIB según varias medidas"
        descripcion="Gasto en pensiones dividido entre el PIB corriente, por definición. Unidad: porcentaje del PIB."
        series={[
          { clave: 'propio', etiqueta: 'Contributivas (ejecución)', puntos: propio },
          {
            clave: 'propio-mm',
            etiqueta: 'Contributivas con complemento a mínimos',
            puntos: propioConComplemento,
          },
          { clave: 'vejez', etiqueta: 'Eurostat: vejez', puntos: vejez },
          {
            clave: 'vejez-sup',
            etiqueta: 'Eurostat: vejez y supervivencia',
            puntos: vejezMasSupervivencia,
          },
          { clave: 'ocde', etiqueta: 'OCDE: gasto público en pensiones', puntos: ocde },
        ]}
        unidadEje="% del PIB"
        incluirCero
        decimales={2}
        decimalesEje={0}
        alto={380}
        fuentes={[
          ejecucion.sumaPensiones.dato,
          ejecucion.complementoMinimos.dato,
          pib.dato,
          gastoSobrePib.eurostatVejez.dato,
          gastoSobrePib.eurostatSupervivencia.dato,
          gastoSobrePib.ocde.dato,
        ]}
        nota="Las dos primeras líneas son cálculos propios (obligaciones reconocidas ÷ PIB corriente del INE; confianza media); Eurostat vejez y supervivencia es la suma de las dos series de Eurostat. Las medidas no coinciden porque abarcan prestaciones distintas."
        comoLeerlo={
          <>
            <p>
              En {anioComun ?? ''}, último año con todas las medidas, el gasto es del{' '}
              {puntosAPorcentaje(en(propio))} del PIB si se cuentan solo las pensiones contributivas
              de la ejecución, del {puntosAPorcentaje(en(propioConComplemento))} si se añade el
              complemento a mínimos, del {puntosAPorcentaje(en(vejez))} según Eurostat (vejez), del{' '}
              {puntosAPorcentaje(en(vejezMasSupervivencia))} (vejez y supervivencia) y del{' '}
              {puntosAPorcentaje(en(ocde))} según la OCDE.
            </p>
            <p>
              Las líneas difieren sobre todo por el perímetro: Clases Pasivas, pensiones no
              contributivas o prestaciones de otra naturaleza pueden estar dentro o fuera. Con los
              datos descargados no se pueden reconciliar una a una. Una cifra más alta no significa
              un sistema más caro en términos absolutos: depende también de la evolución del PIB (
              {decimal1(en(pib.puntos) / 1000)} miles de millones de euros ese año).
            </p>
          </>
        }
      />
    </section>
  );
}

function aniosComunes2(a: readonly PuntoAnual[], b: readonly PuntoAnual[]): PuntoAnual[] {
  const anios = new Set(aniosComunes(a, b));
  return a.filter((p) => anios.has(p.anio));
}
