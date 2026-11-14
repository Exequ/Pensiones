import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { seleccionarPaises, valorEnAnio } from '../../engine/comparativa-internacional';
import { aniosOcde, serieEurostat, serieOcde, valoresEurostat, valoresOcde } from './consultas';
import { datosSistemas } from './datos-sistemas';
import { GraficoBarrasPaises, GraficoLineasPaises } from './GraficoPaises';
import { CONTRASTE, INDICADOR_EUROSTAT_GASTO, MEDIDA, UNIDAD_EUROSTAT_PIB } from './ids-datos';
import { CODIGOS_PAISES, CODIGO_ESPANA } from './paises';

const FILTRO_OCDE = { medida: MEDIDA.gasto } as const;
const FILTRO_EUROSTAT = {
  indicador: INDICADOR_EUROSTAT_GASTO,
  unidad: UNIDAD_EUROSTAT_PIB,
} as const;

/** Gasto público en pensiones sobre el PIB: dos medidas del mismo concepto, lado a lado. */
export function SeccionGasto({ seleccion }: { readonly seleccion: ReadonlySet<string> }) {
  const d = datosSistemas();
  const anios = useMemo(() => aniosOcde(d.ocde.observaciones, FILTRO_OCDE), [d]);
  const [anio, setAnio] = useState(anios.at(-1) ?? 0);

  const ocde = useMemo(
    () =>
      seleccionarPaises(
        valoresOcde(d.ocde.observaciones, FILTRO_OCDE, anio, CODIGOS_PAISES),
        seleccion,
      ),
    [d, anio, seleccion],
  );
  const eurostat = useMemo(
    () =>
      seleccionarPaises(
        valoresEurostat(d.eurostat.observaciones, FILTRO_EUROSTAT, anio, CODIGOS_PAISES),
        seleccion,
      ),
    [d, anio, seleccion],
  );
  const espanaOcde = valorEnAnio(serieOcde(d.ocde.observaciones, FILTRO_OCDE, CODIGO_ESPANA), anio);
  const espanaEurostat = valorEnAnio(
    serieEurostat(d.eurostat.observaciones, FILTRO_EUROSTAT, CODIGO_ESPANA),
    anio,
  );

  const seriesOcde = useMemo(
    () =>
      seleccionarPaises(
        CODIGOS_PAISES.map((pais) => ({
          pais,
          puntos: serieOcde(d.ocde.observaciones, FILTRO_OCDE, pais),
        })),
        seleccion,
      ),
    [d, seleccion],
  );
  const seriesEurostat = useMemo(
    () =>
      seleccionarPaises(
        CODIGOS_PAISES.map((pais) => ({
          pais,
          puntos: serieEurostat(d.eurostat.observaciones, FILTRO_EUROSTAT, pais),
        })),
        seleccion,
      ),
    [d, seleccion],
  );

  const propio = d.contraste.serie(CONTRASTE.gastoPropio);
  const espanaPropio = valorEnAnio(propio.puntos, anio);

  const datoOcde = d.ocde.dato('2021');
  const datoEurostat = d.eurostat.dato('2025');

  return (
    <section className="seccion prosa sistemas-seccion" aria-labelledby="gasto">
      <h2 id="gasto">Gasto público en pensiones sobre el PIB</h2>
      <p>
        El mismo concepto —cuánto gasta el sector público en pensiones, en proporción a lo que
        produce la economía— lo miden la OCDE y Eurostat con definiciones distintas. Aquí se
        muestran las dos, cada una ordenada por sus propios valores, y no se elige ninguna como la
        correcta. España, en el color de resaltado; las medias, con contorno.
      </p>
      <div className="sistemas-controles">
        <SegmentedPills
          leyenda="Año de la comparación entre países"
          opciones={anios.map((a) => ({ valor: a, etiqueta: String(a) }))}
          valor={anio}
          onCambio={setAnio}
        />
      </div>

      <div className="paneles-dos">
        <GraficoBarrasPaises
          titulo={`Gasto público en pensiones sobre el PIB, según la OCDE, ${anio}`}
          descripcion="Porcentaje del PIB. Medida «Public expenditure on pensions» de la OCDE."
          unidadEje="% del PIB"
          decimales={1}
          valores={ocde}
          valorEspana={espanaOcde}
          tituloDiferencia="Diferencia con España (puntos de PIB)"
          fuentes={datoOcde}
          nota={
            <>
              Literal de la medida en la fuente: «{d.ocde.literalMedida(MEDIDA.gasto)}». Perímetro:
              no verificado en las fuentes descargadas (no consta qué regímenes y prestaciones
              incluye).
            </>
          }
          comoLeerlo={
            <>
              <p>
                Cada barra es el gasto público en pensiones del año elegido, como porcentaje del PIB
                de ese país, según la OCDE. El orden es de mayor a menor valor en esta medida.
              </p>
              <p>
                No dice por qué un país gasta más o menos que otro: el cociente depende del
                numerador (qué prestaciones y regímenes se cuentan), del denominador (el PIB) y de
                la estructura de edades de cada población. La OCDE publica esta medida solo para
                años sueltos.
              </p>
            </>
          }
        />
        <GraficoBarrasPaises
          titulo={`Gasto en prestaciones de vejez y supervivencia sobre el PIB, según Eurostat, ${anio}`}
          descripcion="Porcentaje del PIB. Prestaciones de vejez y de supervivencia (ESSPROS, spr_exp_func)."
          unidadEje="% del PIB"
          decimales={1}
          valores={eurostat}
          valorEspana={espanaEurostat}
          tituloDiferencia="Diferencia con España (puntos de PIB)"
          fuentes={datoEurostat}
          nota={
            <>
              Perímetro de la serie de Eurostat: no verificado en las fuentes descargadas (los
              metadatos solo dicen que es gasto en prestaciones de protección social por función).
              Eurostat no publica Estados Unidos ni, antes de 2008, la Unión Europea, y para el
              Reino Unido solo hasta donde lo publica.
            </>
          }
          comoLeerlo={
            <>
              <p>
                Cada barra es el gasto en prestaciones de vejez y de supervivencia del año elegido,
                como porcentaje del PIB, según Eurostat. El orden es de mayor a menor valor en esta
                medida, que puede ser distinto del de la OCDE.
              </p>
              <p>
                No es lo mismo que el gasto en pensiones de la OCDE: las delimitaciones difieren y
                los datos descargados no permiten reconciliarlas. Un país sin dato en un año aparece
                en la tabla con «—».
              </p>
            </>
          }
        />
      </div>

      <h3 id="gasto-espana">España según cada delimitación</h3>
      <p>
        Para el año elegido, el gasto sobre el PIB de España no es una única cifra: depende de qué
        se cuente. La tercera fila es el cociente propio entre las obligaciones reconocidas por
        pensiones contributivas del Sistema de la Seguridad Social y el PIB (cálculo derivado de los
        datos de la sección «Financiación y déficit»).
      </p>
      <div className="sistemas-ancho sistemas-tabla">
        <DataTable
          titulo="Gasto sobre el PIB de España en el año elegido, según tres delimitaciones"
          columnas={[
            { clave: 'medida', titulo: 'Delimitación' },
            { clave: 'valor', titulo: '% del PIB', tipo: 'numero', decimales: 1 },
          ]}
          filas={[
            { medida: 'OCDE: gasto público en pensiones', valor: espanaOcde },
            { medida: 'Eurostat: prestaciones de vejez y de supervivencia', valor: espanaEurostat },
            {
              medida:
                'Propia: pensiones contributivas del Sistema (sin Clases Pasivas ni no contributivas)',
              valor: espanaPropio,
            },
          ]}
          pie="Los datos descargados no permiten reconciliar las tres cifras partida a partida; la nota de definición de cada gráfico recoge lo que consta de cada delimitación."
        />
        <SourceLine datos={[datoOcde, datoEurostat, propio.dato]} />
      </div>

      <h3 id="gasto-evolucion">Cómo ha evolucionado</h3>
      <p>
        Las dos medidas, para los países elegidos. Eurostat publica un dato por año; la OCDE, solo
        algunos años (los puntos del gráfico).
      </p>
      <div className="paneles-dos">
        <GraficoLineasPaises
          titulo="Evolución del gasto público en pensiones sobre el PIB, según la OCDE"
          descripcion="Porcentaje del PIB, años con dato."
          unidadEje="% del PIB"
          decimales={1}
          series={seriesOcde}
          fuentes={datoOcde}
          comoLeerlo={
            <p>
              Cada línea une los años en que la OCDE publica la medida para ese país. Los tramos
              entre dos puntos son una simple unión, no datos intermedios. No dice qué causó un
              cambio ni qué pasará después; la serie solo llega hasta el último año publicado.
            </p>
          }
        />
        <GraficoLineasPaises
          titulo="Evolución del gasto en prestaciones de vejez y supervivencia sobre el PIB, según Eurostat"
          descripcion="Porcentaje del PIB, un dato por año."
          unidadEje="% del PIB"
          decimales={1}
          series={seriesEurostat}
          fuentes={datoEurostat}
          comoLeerlo={
            <p>
              Cada línea es la serie anual de Eurostat. Las series empiezan en años distintos según
              el país y la del Reino Unido termina cuando Eurostat deja de publicarla. El cociente
              sube también cuando cae el PIB aunque el gasto no cambie: una variación puede venir
              del numerador, del denominador o de ambos.
            </p>
          }
        />
      </div>
    </section>
  );
}
