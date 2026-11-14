import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { CLASES_PENSION } from '../../engine/sistema-historico';
import { GraficoSeries, type SerieGrafico } from '../historico/GraficoSeries';
import {
  entero,
  ETIQUETA_CLASE,
  etiquetaEdad,
  etiquetaTramoAfiliados,
  euros,
  mesEnTexto,
  puntosAPorcentaje,
  SEXOS,
} from '../historico/formatos';
import { datosCotizantes, type Sexo } from '../historico/datos-cotizantes';

const OPCIONES_CLASE = ['total', ...CLASES_PENSION] as const;
type ClaseOTotal = (typeof OPCIONES_CLASE)[number];

/** Orden numérico de un grupo de edad («5-9» antes que «10-14»). */
const inicioDeGrupo = (g: string): number => Number.parseInt(g, 10);

/** Situación actual por edad y sexo, y cuadro de pensiones por clase y sexo del último año. */
export function Situacion() {
  const d = datosCotizantes();
  const [clase, setClase] = useState<ClaseOTotal>('total');

  const grupos = useMemo(
    () =>
      [
        ...new Set(
          d.edad.filas.map((f) => f.grupoEdad).filter((g) => g !== 'total' && g !== 'no-consta'),
        ),
      ].sort((a, b) => inicioDeGrupo(a) - inicioDeGrupo(b)),
    [d],
  );
  const etiquetasEdad = useMemo(() => grupos.map(etiquetaEdad), [grupos]);

  const porEdad = (campo: 'numero' | 'pensionMedia'): SerieGrafico[] =>
    SEXOS.map((s, i) => ({
      clave: s.clave,
      etiqueta: s.etiqueta,
      color: i,
      puntos: grupos.flatMap((g, indice) => {
        const fila = d.edad.filas.find(
          (f) => f.grupoEdad === g && f.clase === clase && f.sexo === s.clave,
        );
        const valor = fila?.[campo];
        return valor === null || valor === undefined ? [] : [{ anio: indice, valor }];
      }),
    }));
  const numeroPorEdad = porEdad('numero');
  const mediaPorEdad = porEdad('pensionMedia');

  const totalClase = (sexo: string) =>
    d.edad.filas.find((f) => f.grupoEdad === 'total' && f.clase === clase && f.sexo === sexo);
  const hombres = totalClase('hombres');
  const mujeres = totalClase('mujeres');
  const mesTexto = mesEnTexto(d.edad.mes);

  // Afiliados por tramo de edad (último año disponible).
  const ultimoAnioAfiliados = Math.max(...d.afiliadosEdad.filas.map((f) => f.anio));
  const tramos = useMemo(
    () => [
      ...new Set(d.afiliadosEdad.filas.filter((f) => f.tramo !== 'total').map((f) => f.tramo)),
    ],
    [d],
  );
  const afiliadosPorEdad: SerieGrafico[] = SEXOS.map((s, i) => ({
    clave: s.clave,
    etiqueta: s.etiqueta,
    color: i,
    puntos: tramos.flatMap((t, indice) => {
      const fila = d.afiliadosEdad.filas.find(
        (f) => f.anio === ultimoAnioAfiliados && f.sexo === s.clave && f.tramo === t,
      );
      return fila?.afiliados === null || fila === undefined
        ? []
        : [{ anio: indice, valor: fila.afiliados }];
    }),
  }));

  // Cuadro por clase y sexo del último año de las series anuales.
  const filasCuadro = CLASES_PENSION.map((c) => {
    const ult = (s: Sexo, tipo: 'numero' | 'media') =>
      (tipo === 'numero' ? d.numeroPorClaseSexo[c][s] : d.pensionMediaPorClaseSexo[c][s]).puntos.at(
        -1,
      )?.valor ?? null;
    return {
      clase: ETIQUETA_CLASE[c] ?? c,
      hombres: ult('hombres', 'numero'),
      mujeres: ult('mujeres', 'numero'),
      ambos: ult('ambos', 'numero'),
      mediaHombres: ult('hombres', 'media'),
      mediaMujeres: ult('mujeres', 'media'),
    };
  });
  const anioCuadro = d.numeroPorClaseSexo.jubilacion.ambos.puntos.at(-1)?.anio ?? 0;
  const cuota =
    hombres?.numero && mujeres?.numero ? mujeres.numero / (hombres.numero + mujeres.numero) : null;

  return (
    <section className="seccion prosa" aria-labelledby="situacion">
      <h2 id="situacion">Situación actual: clase, sexo y edad</h2>
      <p>
        El portal de la Seguridad Social publica la distribución por edades solo del mes más
        reciente, por lo que estos gráficos son una fotografía de {mesTexto}, no una evolución. Los
        afiliados por edad son los de diciembre del último año con dato.
      </p>

      <div className="hist-selector">
        <SegmentedPills
          leyenda="Clase de pensión"
          opciones={OPCIONES_CLASE.map((c) => ({ valor: c, etiqueta: ETIQUETA_CLASE[c] ?? c }))}
          valor={clase}
          onCambio={setClase}
        />
      </div>

      <GraficoSeries
        titulo={`Pensiones en vigor por grupo de edad y sexo: ${(ETIQUETA_CLASE[clase] ?? clase).toLowerCase()}`}
        descripcion={`Número de pensiones en vigor a principios de ${mesTexto}, por grupo de edad quinquenal de la persona pensionista. Unidad: miles de pensiones.`}
        series={numeroPorEdad}
        etiquetasX={etiquetasEdad}
        tituloX="Grupo de edad"
        unidadEje="Miles de pensiones"
        divisorEje={1000}
        decimalesEje={1}
        incluirCero
        fuentes={d.edad.dato}
        nota="No se representan las pensiones cuyo grupo de edad no consta."
        comoLeerlo={
          <>
            <p>
              En {mesTexto} hay {entero(hombres?.numero ?? 0)} pensiones de esta clase de hombres y{' '}
              {entero(mujeres?.numero ?? 0)} de mujeres
              {cuota === null
                ? ''
                : ` (las mujeres son el ${puntosAPorcentaje(cuota * 100)} del total de hombres y mujeres)`}
              . Cada punto es el número de pensiones en un tramo de edad.
            </p>
            <p>
              Una pensión pertenece a la persona que la cobra, no a quien cotizó: en viudedad y
              orfandad la edad y el sexo son los de la persona beneficiaria. La gráfica no muestra
              el importe (véase la siguiente) ni cómo ha cambiado el reparto con el tiempo.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo={`Pensión media por grupo de edad y sexo: ${(ETIQUETA_CLASE[clase] ?? clase).toLowerCase()}`}
        descripcion={`Pensión media mensual de las pensiones en vigor a principios de ${mesTexto}. Unidad: euros al mes.`}
        series={mediaPorEdad}
        etiquetasX={etiquetasEdad}
        tituloX="Grupo de edad"
        unidadEje="Euros al mes"
        incluirCero
        decimales={2}
        fuentes={d.edad.dato}
        comoLeerlo={
          <>
            <p>
              La pensión media de esta clase es de {euros(hombres?.pensionMedia ?? 0)} al mes en los
              hombres y de {euros(mujeres?.pensionMedia ?? 0)} en las mujeres (todas las edades).
            </p>
            <p>
              Las diferencias entre sexos y edades recogen carreras de cotización, clases y momentos
              de jubilación distintos; la gráfica por sí sola no permite atribuirlas a una causa
              concreta.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Afiliados en alta por tramo de edad y sexo"
        descripcion={`Afiliados medios de diciembre de ${ultimoAnioAfiliados} por tramo de edad. Unidad: miles de afiliados.`}
        series={afiliadosPorEdad}
        etiquetasX={tramos.map(etiquetaTramoAfiliados)}
        tituloX="Tramo de edad"
        unidadEje="Miles de afiliados"
        divisorEje={1000}
        incluirCero
        fuentes={d.afiliadosEdad.dato}
        nota="Hay un número pequeño de afiliados sin sexo o sin tramo de edad que no se representa: la suma por sexo o por tramo no coincide exactamente con el total."
        comoLeerlo={
          <>
            <p>
              Cada punto es el número de personas afiliadas en alta de un tramo de edad y sexo. Es
              la otra cara de la relación entre afiliados y pensiones: muestra por edades a quienes
              cotizan, aunque las fechas de las dos distribuciones no coinciden.
            </p>
            <p>
              La edad de los afiliados no determina cuándo cobrarán una pensión ni cuánto: depende
              de su carrera de cotización futura. Tampoco indica la base de cotización.
            </p>
          </>
        }
      />

      <div className="hist-definiciones">
        <DataTable
          titulo={`Pensiones contributivas en vigor por clase y sexo, a principios de diciembre de ${anioCuadro}`}
          columnas={[
            { clave: 'clase', titulo: 'Clase' },
            { clave: 'hombres', titulo: 'Pensiones de hombres', tipo: 'numero' },
            { clave: 'mujeres', titulo: 'Pensiones de mujeres', tipo: 'numero' },
            { clave: 'ambos', titulo: 'Ambos sexos', tipo: 'numero' },
            {
              clave: 'mediaHombres',
              titulo: 'Pensión media de hombres (€/mes)',
              tipo: 'euros',
              decimales: 2,
            },
            {
              clave: 'mediaMujeres',
              titulo: 'Pensión media de mujeres (€/mes)',
              tipo: 'euros',
              decimales: 2,
            },
          ]}
          filas={filasCuadro}
        />
        <SourceLine
          datos={[
            d.numeroPorClaseSexo.jubilacion.ambos.dato,
            d.pensionMediaPorClaseSexo.jubilacion.ambos.dato,
          ]}
        />
        <p className="como-leerlo-texto">
          «Ambos sexos» puede ser algo mayor que la suma de hombres y mujeres porque incluye las
          pensiones cuyo sexo no consta en la fuente.
        </p>
      </div>
    </section>
  );
}
