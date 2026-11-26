import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { seleccionarPaises, valorEnAnio } from '../../engine/comparativa-internacional';
import { aniosOcde, serieEurostat, serieOcde, valoresEurostat, valoresOcde } from './consultas';
import { datosSistemas } from './datos-sistemas';
import { DefinicionesSistemas } from './DefinicionSistemas';
import { GraficoBarrasPaises, GraficoLineasPaises } from './GraficoPaises';
import { CONTRASTE, INDICADOR_EUROSTAT_GASTO, MEDIDA, UNIDAD_EUROSTAT_PIB } from './ids-datos';
import { CODIGOS_PAISES, CODIGO_ESPANA, CODIGO_REINO_UNIDO, CODIGO_UE } from './paises';
import { APARTADOS } from './apartados';

const FILTRO_OCDE = { medida: MEDIDA.gasto } as const;
const FILTRO_EUROSTAT = {
  indicador: INDICADOR_EUROSTAT_GASTO,
  unidad: UNIDAD_EUROSTAT_PIB,
} as const;

/** Gasto en pensiones sobre el PIB: dos medidas distintas, la de la OCDE y la de Eurostat, lado a lado. */
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

  const datoOcde = d.ocde.datoMedida(String(anio), MEDIDA.gasto);
  const datoEurostat = d.eurostat.datoGasto(String(anio));
  const primeraUE = serieEurostat(d.eurostat.observaciones, FILTRO_EUROSTAT, CODIGO_UE)[0]?.anio;
  const ultimaGBR = serieEurostat(d.eurostat.observaciones, FILTRO_EUROSTAT, CODIGO_REINO_UNIDO).at(
    -1,
  )?.anio;

  return (
    <section
      className="seccion prosa sistemas-seccion ancho-completo"
      aria-labelledby={APARTADOS.gasto.destino}
    >
      <h2 id={APARTADOS.gasto.destino} tabIndex={-1}>
        {APARTADOS.gasto.titulo}
      </h2>
      <p>
        La OCDE y Eurostat publican cada una su propia medida del gasto en pensiones en proporción
        al PIB. Son medidas distintas, con delimitaciones propias: no son dos estimaciones de la
        misma cifra y el perímetro exacto de cada una no consta en las fuentes consultadas. Aquí se
        muestran las dos, cada una ordenada por sus propios valores, sin mezclarlas en una misma
        serie y sin elegir ninguna como la correcta. España, en el color de resaltado; las medias,
        con contorno. El gasto en pensiones tampoco es la financiación de las pensiones: responden a
        preguntas distintas.
      </p>
      <DefinicionesSistemas
        ids={[
          'gasto-pensiones-ocde',
          'gasto-pensiones-esspros-vejez-supervivientes',
          'gasto-frente-a-financiacion',
        ]}
      />
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
          descripcion="Porcentaje del PIB. Gasto público en pensiones de la OCDE."
          unidadEje="% del PIB"
          decimales={1}
          valores={ocde}
          valorEspana={espanaOcde}
          tituloDiferencia="Diferencia con España (puntos de PIB)"
          fuentes={datoOcde}
          nota="Perímetro: los datos consultados no detallan qué regímenes y prestaciones incluye la medida."

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
          descripcion="Porcentaje del PIB. Prestaciones de vejez y de supervivencia de la estadística europea de protección social (ESSPROS)."
          unidadEje="% del PIB"
          decimales={1}
          valores={eurostat}
          valorEspana={espanaEurostat}
          tituloDiferencia="Diferencia con España (puntos de PIB)"
          fuentes={datoEurostat}
          nota={
            <>
              Perímetro: los metadatos consultados no detallan qué administraciones o regímenes
              entran en la serie; solo dicen que es gasto en prestaciones de protección social por
              función. Eurostat no publica Estados Unidos; publica la Unión Europea desde{' '}
              {primeraUE} y el Reino Unido hasta {ultimaGBR}.
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
                No es lo mismo que el gasto en pensiones de la OCDE: cada fuente delimita lo que
                mide y los datos consultados no permiten reconciliarlas. Un país sin dato en un año
                aparece en la tabla con «—».
              </p>
            </>
          }
        />
      </div>

      <h3 id="gasto-espana">España según cada delimitación</h3>
      <p>
        Para el año elegido, el gasto sobre el PIB de España no es una única cifra: depende de qué
        se cuente. La tercera fila es un cálculo propio de esta web, el gasto en pensiones
        contributivas del Sistema sobre el PIB, con los datos que se muestran en la página
        «Financiación y déficit».
      </p>
      <div className="sistemas-tabla">
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
                'Cálculo propio: pensiones contributivas del Sistema, sin complemento a mínimos',
              valor: espanaPropio,
            },
          ]}
          pie="Los datos consultados no permiten reconciliar las tres cifras partida a partida; cada delimitación se define arriba y debajo."
        />
        <SourceLine
          datos={[datoOcde, datoEurostat, propio.dato]}
          titulo="Gasto sobre el PIB de España en el año elegido, según tres delimitaciones"
        />
      </div>
      <DefinicionesSistemas
        ids={['gasto-pensiones-contributivas-sin-complemento', 'gasto-sobre-pib']}
      />

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
