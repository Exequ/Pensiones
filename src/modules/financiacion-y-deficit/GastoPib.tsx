import { useState } from 'react';
import { SegmentedPills } from '../../components/SegmentedPills';
import {
  aniosComunes,
  porcentajeDelPib,
  suma,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { GraficoSeries, type SerieGrafico } from '../historico/GraficoSeries';
import { decimal1, puntosAPorcentaje } from '../historico/formatos';
import { datosFinanciacion } from '../historico/datos-financiacion';

type VarianteComplemento = 'con' | 'sin' | 'ambas';

/** Gasto en pensiones sobre el PIB según las definiciones disponibles. */
export function GastoPib() {
  const d = datosFinanciacion();
  // Referencia por defecto: gasto con complemento a mínimos; la variante sin complemento está disponible.
  const [variante, setVariante] = useState<VarianteComplemento>('con');
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

  const seriesPropias: SerieGrafico[] = [
    ...(variante === 'sin'
      ? []
      : [
          {
            clave: 'propio-mm',
            etiqueta: 'Contributivas con complemento (referencia)',
            puntos: propioConComplemento,
          },
        ]),
    ...(variante === 'con'
      ? []
      : [{ clave: 'propio', etiqueta: 'Contributivas sin complemento', puntos: propio }]),
  ];

  return (
    <section className="seccion prosa" aria-labelledby="gasto-pib">
      <h2 id="gasto-pib">El gasto en pensiones sobre el PIB: varias formas de medirlo</h2>
      <p>
        Para comparar el gasto en pensiones a lo largo del tiempo se suele dividir entre el PIB. El
        resultado cambia según qué prestaciones se incluyan en el numerador: solo las pensiones
        contributivas de la Seguridad Social, con o sin el complemento a mínimos, las prestaciones
        de vejez y supervivencia de la estadística europea de protección social (ESSPROS), o el
        gasto público en pensiones que recoge la OCDE.
      </p>
      <p>
        La referencia por defecto para el gasto contributivo propio es la de obligaciones
        reconocidas con complemento a mínimos, porque ese complemento se abona como parte de la
        pensión; es una convención de esta página, no una definición oficial. La variante sin
        complemento está disponible. En la ejecución, el complemento se anota en una fila propia del
        capítulo de transferencias corrientes (bloque de pensiones no contributivas y complementos a
        mínimos de pensiones contributivas), distinta de la fila «suma de pensiones».
      </p>
      <p>
        La serie de Eurostat es de ESSPROS (siglas de la fuente, en inglés): gasto registrado en
        prestaciones de protección social, clasificado por función. Aquí se usan las funciones
        «vejez» y «supervivientes». No es comparable con el gasto contributivo propio: este incluye
        la clase «incapacidad permanente», que no está entre las series de Eurostat descargadas, y
        los metadatos descargados no delimitan qué administraciones o regímenes entran en la serie,
        por lo que esta página no lo afirma.
      </p>
      <div className="hist-selector">
        <SegmentedPills
          leyenda="Gasto contributivo propio (obligaciones reconocidas)"
          opciones={[
            { valor: 'con', etiqueta: 'Con complemento a mínimos' },
            { valor: 'sin', etiqueta: 'Sin complemento a mínimos' },
            { valor: 'ambas', etiqueta: 'Con y sin complemento' },
          ]}
          valor={variante}
          onCambio={setVariante}
        />
      </div>
      <GraficoSeries
        titulo="Gasto en pensiones sobre el PIB según varias medidas"
        descripcion="Gasto en pensiones dividido entre el PIB corriente, por definición. Unidad: porcentaje del PIB."
        series={[
          ...seriesPropias,
          { clave: 'vejez', etiqueta: 'ESSPROS (Eurostat): vejez', puntos: vejez },
          {
            clave: 'vejez-sup',
            etiqueta: 'ESSPROS (Eurostat): vejez y supervivientes',
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
        nota="Las líneas del gasto contributivo propio son cálculos propios (obligaciones reconocidas ÷ PIB corriente del INE; confianza media); ESSPROS vejez y supervivientes es la suma de las dos series de Eurostat. Las medidas no coinciden porque abarcan prestaciones distintas y no son comparables entre sí sin conciliar su perímetro."
        comoLeerlo={
          <>
            <p>
              En {anioComun ?? ''}, último año con todas las medidas, el gasto es del{' '}
              {puntosAPorcentaje(en(propioConComplemento))} del PIB con las pensiones contributivas
              de la ejecución y el complemento a mínimos (referencia), del{' '}
              {puntosAPorcentaje(en(propio))} sin el complemento, del {puntosAPorcentaje(en(vejez))}{' '}
              según ESSPROS (vejez), del {puntosAPorcentaje(en(vejezMasSupervivencia))} (vejez y
              supervivientes) y del {puntosAPorcentaje(en(ocde))} según la OCDE.
            </p>
            <p>
              Las líneas difieren por el perímetro: qué prestaciones y qué regímenes entran en cada
              una. El gasto contributivo propio incluye incapacidad permanente y no incluye Clases
              Pasivas ni pensiones no contributivas; de las demás medidas no se conoce el detalle
              con los metadatos descargados. Con los datos descargados no se pueden reconciliar una
              a una. Una cifra más alta no significa un sistema más caro en términos absolutos:
              depende también de la evolución del PIB ({decimal1(en(pib.puntos) / 1000)} miles de
              millones de euros ese año).
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
