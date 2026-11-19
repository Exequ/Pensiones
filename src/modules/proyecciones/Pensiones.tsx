import { useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { BASE_INDICE, diferenciasPorAnio, indiceDesdeBase } from '../../engine/proyecciones';
import { CLASES_PENSION } from '../../engine/sistema-historico';
import { GraficoSeries, type SerieGrafico } from '../historico/GraficoSeries';
import { entero, ETIQUETA_CLASE, etiquetaEdad, SEXOS, decimal1 } from '../historico/formatos';
import { ComoFunciona, ListaVariables, SelectorAnio } from './Comunes';
import { datosProyecciones } from './datos-proyecciones';
import { GraficoProyeccion } from './GraficoProyeccion';
import type { SerieProyectada } from './grafico-proyeccion';
import { COL, MODELO } from './ids-datos';
import { aniosDe, pensionesPorEdadYSexo, puntosDeColumna, totalDeClase } from './series';
import { APARTADOS } from './apartados';

const OPCIONES_CLASE = ['total', ...CLASES_PENSION] as const;
type ClaseOTotal = (typeof OPCIONES_CLASE)[number];
const MILLON = 1_000_000;
const etiquetaClase = (c: string): string => ETIQUETA_CLASE[c] ?? c;

/** Bloque M3: pensiones contributivas en vigor proyectadas, por clase, edad y sexo, y contraste. */
export function Pensiones() {
  const d = datosProyecciones();
  const { pensiones, resumen } = d.m3;
  const anios = aniosDe(resumen.filas);
  const anioInicio = anios[0] ?? 0;
  const [clase, setClase] = useState<ClaseOTotal>('total');
  const [anio, setAnio] = useState<number>(anioInicio);

  const total = puntosDeColumna(resumen.filas, COL.total);
  const porClase: SerieProyectada[] = CLASES_PENSION.map((c, i) => ({
    clave: c,
    etiqueta: etiquetaClase(c),
    observado: d.observado.pensionesPorClase[c].puntos,
    proyeccion: puntosDeColumna(resumen.filas, c),
    origen: 'modelo',
    color: i,
  }));
  const fuentesPensiones = [resumen.dato, d.observado.pensionesTotal.dato];

  // Reparto por grupo de edad y sexo.
  const reparto = pensionesPorEdadYSexo(pensiones.filas, clase, anio);
  const etiquetasEdad = reparto.grupos.map(etiquetaEdad);
  const seriesEdad: SerieGrafico[] = SEXOS.map((s, i) => ({
    clave: s.clave,
    etiqueta: s.etiqueta,
    color: i,
    puntos: (s.clave === 'hombres' ? reparto.hombres : reparto.mujeres).map((valor, indice) => ({
      anio: indice,
      valor,
    })),
  }));
  const totalHombres = reparto.hombres.reduce((a, b) => a + b, 0);
  const totalMujeres = reparto.mujeres.reduce((a, b) => a + b, 0);
  const totalElegido = totalDeClase(pensiones.filas, clase, anio);

  // Contraste con el Ageing Report 2024 (índice, año de inicio = 100).
  const indiceModelo = indiceDesdeBase(total, anioInicio);
  const indiceAgeing = indiceDesdeBase(d.ageing.pensionistas.puntos, anioInicio).filter((p) =>
    anios.includes(p.anio),
  );
  const dif = diferenciasPorAnio(indiceModelo, indiceAgeing);
  const serieContraste: SerieProyectada[] = [
    {
      clave: 'modelo',
      etiqueta: `Modelo ${MODELO.m3}: pensiones`,
      proyeccion: indiceModelo,
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'ageing',
      etiqueta: 'Ageing Report: pensionistas',
      proyeccion: indiceAgeing,
      origen: 'publicada',
      color: 1,
    },
  ];
  const ultima = dif.at(-1);
  const filasDif = dif.map((f) => ({
    anio: String(f.anio),
    modelo: f.a,
    ageing: f.b,
    diferencia: f.diferencia,
  }));
  const razonesPensionistas = resumen.filas.map(
    (f) => Number(f[COL.pensionistas]) / Number(f[COL.total]),
  );
  const fraccionConstante =
    razonesPensionistas.length > 0 &&
    razonesPensionistas.every((r) => Math.abs(r - (razonesPensionistas[0] ?? 0)) < 1e-9);
  const fuentesContraste = [resumen.dato, d.ageing.pensionistas.dato];

  return (
    <section className="seccion prosa" aria-labelledby={APARTADOS.pensiones.destino}>
      <h2 id={APARTADOS.pensiones.destino} tabIndex={-1}>
        {APARTADOS.pensiones.titulo}
      </h2>
      <p>
        El modelo {MODELO.m3} cuenta cuántas pensiones contributivas habrá cada año si la proporción
        de personas de cada edad y sexo que cobra cada clase de pensión se mantiene como en la foto
        de la Seguridad Social del último dato de partida. Cuenta pensiones, no personas, y no
        calcula importes.
      </p>

      <GraficoProyeccion
        titulo="Pensiones contributivas en vigor: total, observado y proyección"
        descripcion="Número total de pensiones contributivas en vigor. El dato observado es el de principios de diciembre de cada año; la proyección del modelo corresponde a octubre. Unidad: millones de pensiones."
        series={[
          {
            clave: 'total',
            etiqueta: 'Total de pensiones',
            observado: d.observado.pensionesTotal.puntos,
            proyeccion: total,
            origen: 'modelo',
            color: 0,
          },
        ]}
        unidadEje="Millones de pensiones"
        divisorEje={MILLON}
        decimalesEje={1}
        fuentes={fuentesPensiones}
        nota="El empalme entre lo observado y lo proyectado cambia de fecha de referencia (diciembre frente a octubre)."
        comoLeerlo={
          <>
            <p>
              Cuenta pensiones contributivas en vigor. Con prevalencias constantes, el número de
              pensiones sigue a la población de cada edad y sexo: crece si aumentan las edades en
              las que hay más pensiones y se mantiene la proporción de cada grupo que las cobra.
            </p>
            <p>
              No dice cuánto cuestan: no hay importes. Una pensión no es una persona, porque una
              misma persona puede cobrar más de una. Tampoco recoge reformas, cambios en la edad
              efectiva de jubilación ni cambios de comportamiento.
            </p>
          </>
        }
      />

      <GraficoProyeccion
        titulo="Pensiones contributivas en vigor por clase, observado y proyección"
        descripcion="Número de pensiones de cada clase. El dato observado es el de principios de diciembre; la proyección del modelo, el de octubre. Unidad: millones de pensiones."
        series={porClase}
        unidadEje="Millones de pensiones"
        divisorEje={MILLON}
        decimalesEje={1}
        incluirCero
        alto={460}
        fuentes={fuentesPensiones}
        comoLeerlo={
          <>
            <p>
              Cada línea es una clase de pensión. El modelo mantiene constante la proporción de
              personas de cada edad y sexo que cobra cada clase, de modo que cada clase evoluciona
              según la población de las edades en las que es más frecuente.
            </p>
            <p>
              No dice que una clase vaya a sustituir a otra: por ejemplo, el modelo no reduce la
              viudedad cuando sube la jubilación, y las pensiones de incapacidad que pasan a
              jubilación a edad ordinaria solo aparecen porque la foto de partida las muestra en el
              grupo de edad correspondiente.
            </p>
          </>
        }
      />

      <h3 id="proy-reparto">Reparto por grupo de edad y sexo</h3>
      <div className="proy-controles">
        <SegmentedPills
          leyenda="Clase de pensión"
          opciones={OPCIONES_CLASE.map((c) => ({ valor: c, etiqueta: etiquetaClase(c) }))}
          valor={clase}
          onCambio={setClase}
        />
        <SelectorAnio etiqueta="Año" anios={anios} valor={anio} onCambio={setAnio} />
      </div>
      <GraficoSeries
        titulo={`Pensiones por grupo de edad y sexo (proyección de ${MODELO.m3}): ${etiquetaClase(clase).toLowerCase()}, ${anio}`}
        descripcion="Pensiones en octubre del año elegido, por grupo de edad quinquenal de la persona pensionista, en la proyección del modelo. Unidad: miles de pensiones."
        series={seriesEdad}
        etiquetasX={etiquetasEdad}
        tituloX="Grupo de edad"
        unidadEje="Miles de pensiones"
        divisorEje={1000}
        decimalesEje={1}
        incluirCero
        fuentes={[pensiones.dato]}
        nota="Proyección de modelo propio: no es un dato observado ni una previsión. Todas las líneas de este gráfico son proyección: aquí el tipo de trazo solo distingue el sexo, porque no hay datos observados por edad en el año elegido. El año de partida coincide con la foto de partida, salvo las pensiones de edad desconocida."
        comoLeerlo={
          <>
            <p>
              En {anio}, el modelo calcula {entero(totalHombres)} pensiones de esta clase de hombres
              y {entero(totalMujeres)} de mujeres, {entero(totalElegido)} en total. Dentro de cada
              grupo de edad se reparten como la población proyectada por {MODELO.m1}.
            </p>
            <p>
              No dice cuántas pensiones cobra cada persona ni cuánto: los grupos son de cinco años y
              no hay importes. Cambiar de año mueve la población por edades, no la proporción de
              cada grupo que cobra la pensión, que es la del año de partida.
            </p>
          </>
        }
      />

      <h3 id="proy-pensiones-ageing">Contraste con el Ageing Report de la Comisión Europea</h3>
      <p>
        La Comisión Europea publica una proyección de los pensionistas de España. Se compara con las
        pensiones del modelo en índice, con el año de inicio igual a {BASE_INDICE}, porque las dos
        series miden cosas distintas: el modelo cuenta pensiones y el Ageing Report, pensionistas.
        {fraccionConstante
          ? ' El modelo aplica una fracción constante para estimar los pensionistas, así que su índice de pensionistas coincide con el de pensiones.'
          : ''}
      </p>
      <GraficoProyeccion
        titulo={`Pensiones del modelo y pensionistas del Ageing Report: índice, año de inicio = ${BASE_INDICE}`}
        descripcion={`Cada serie dividida por su valor en ${anioInicio} y multiplicada por cien. Unidad: índice.`}
        series={serieContraste}
        unidadEje={`Índice (${anioInicio} = ${BASE_INDICE})`}
        decimales={1}
        decimalesEje={0}
        fuentes={fuentesContraste}
        nota="El Ageing Report es una proyección de la Comisión Europea y del Comité de Política Económica, con su escenario de referencia y sus propios supuestos demográficos, de empleo y de productividad."
        comoLeerlo={
          <>
            <p>
              Las dos curvas parten del mismo valor y muestran cuánto crece cada serie respecto al
              año de inicio. La diferencia entre ellas, en puntos de índice, está en la tabla.
            </p>
            <p>
              No dice cuál de las dos es más acertada: son proyecciones con supuestos distintos y
              con unidades de medida distintas (pensiones y pensionistas).
            </p>
          </>
        }
      />
      <p>
        {ultima === undefined
          ? null
          : `En ${ultima.anio}, el índice del modelo es ${decimal1(ultima.a)} y el del Ageing Report ${decimal1(ultima.b)}: una diferencia de ${decimal1(ultima.diferencia)} puntos de índice (modelo menos Ageing Report).`}
      </p>
      <details className="grafico-datos">
        <summary>Ver la tabla de diferencias por año</summary>
        <DataTable
          titulo="Diferencia entre el índice de pensiones del modelo y el de pensionistas del Ageing Report"
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            { clave: 'modelo', titulo: 'Índice del modelo', tipo: 'numero', decimales: 1 },
            { clave: 'ageing', titulo: 'Índice del Ageing Report', tipo: 'numero', decimales: 1 },
            {
              clave: 'diferencia',
              titulo: 'Diferencia (puntos de índice)',
              tipo: 'numero',
              decimales: 1,
            },
          ]}
          filas={filasDif}
        />
        <SourceLine datos={fuentesContraste} />
      </details>

      <ComoFunciona>
        <p>
          <strong>Qué hace.</strong> Parte de la foto real de pensiones en vigor de la Seguridad
          Social: cuántas pensiones de cada clase cobran los hombres y las mujeres de cada grupo de
          edad de cinco años. Divide cada cifra entre la población de ese grupo y obtiene una
          prevalencia (por ejemplo, las pensiones de jubilación por cada hombre de un grupo de
          edad). Después aplica esas prevalencias a la población de cada año que proyecta el modelo
          demográfico {MODELO.m1}: si hay más personas de edad avanzada, hay más pensiones de
          viudedad; si hay menos jóvenes, hay menos pensiones de orfandad.
        </p>
        <p>
          <strong>Datos de entrada.</strong> La foto de pensiones en vigor por edad, clase y sexo,
          la relación entre pensionistas y pensiones, y las proyecciones de población de {MODELO.m1}
          . Como contraste, el Ageing Report de la Comisión Europea.
        </p>
        <p>
          <strong>Variables principales.</strong> Para cada año, las pensiones por clase, sexo y
          grupo de edad, el total y una estimación de pensionistas (personas), que es menor porque
          hay quien cobra más de una pensión:
        </p>
        <ListaVariables columnas={resumen.archivo.columnas} />
        <p>
          <strong>Qué se puede cambiar en el código para hacer pruebas.</strong> Todas las palancas
          de {MODELO.m1} (fecundidad, mejora de mortalidad, migración y ajuste de mortalidad en
          edades altas); la convergencia de las mujeres, un valor entre cero y uno que acerca de
          forma gradual la proporción de mujeres de edad avanzada que cobra jubilación a la de los
          hombres de su grupo (es un caso extremo, porque hoy muchas mujeres mayores cobran viudedad
          y el modelo no reduce la viudedad al subir la jubilación); y el año final. Están en el
          código del modelo; esta página muestra el escenario ya calculado.
        </p>
        <p>
          <strong>Qué no hace.</strong> La prevalencia es constante: no recoge reformas, cambios en
          la edad efectiva de jubilación ni la incorporación gradual de mujeres con carreras largas,
          salvo como palanca. No hay importes. No distingue jubilación anticipada o demorada. Los
          grupos de edad son de cinco años y las pensiones de edad desconocida de la foto de partida
          se ignoran.
        </p>
        <p>
          <strong>Comprobaciones.</strong> La descripción del modelo recoge un contraste con el
          Ageing Report y una comprobación de las bajas esperadas por mortalidad frente a las bajas
          definitivas registradas por la Seguridad Social.
        </p>
      </ComoFunciona>
    </section>
  );
}
