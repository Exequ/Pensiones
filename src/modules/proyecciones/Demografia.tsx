import { useMemo, useState } from 'react';
import { DataTable } from '../../components/DataTable';
import { SegmentedPills } from '../../components/SegmentedPills';
import { SourceLine } from '../../components/SourceLine';
import { diferenciasPorAnio, esIlustrativo } from '../../engine/proyecciones';
import { GraficoSeries, type SerieGrafico } from '../historico/GraficoSeries';
import { decimal2, entero, puntosAPorcentaje } from '../historico/formatos';
import { ComoFunciona, ListaVariables } from './Comunes';
import { datosProyecciones, type TablaModelo } from './datos-proyecciones';
import { GraficoProyeccion } from './GraficoProyeccion';
import type { SerieProyectada } from './grafico-proyeccion';
import { COL, MODELO } from './ids-datos';
import { puntosDeColumna, valoresDe } from './series';

const descripcionDe = (tabla: TablaModelo, id: string): string =>
  tabla.archivo.columnas.find((c) => c.id === id)?.descripcion ?? id;
const unidadDe = (tabla: TablaModelo, id: string): string =>
  tabla.archivo.columnas.find((c) => c.id === id)?.unidad ?? '';

const MILLON = 1_000_000;

/** Bloque M1: demografía proyectada por el modelo, frente al INE, prueba hacia atrás y escenarios. */
export function Demografia() {
  const d = datosProyecciones();
  const { contraste, backtest, escenarios } = d.m1;
  const horizonte = contraste.archivo.modelo.horizontePresentacion;
  const [escenario, setEscenario] = useState<string>(
    () => valoresDe(escenarios.filas, 'escenario')[0] ?? '',
  );

  // El histórico se muestra desde el año de partida de la prueba hacia atrás.
  const primerAnioBacktest = Math.min(...backtest.filas.map((f) => Number(f['anio'])));
  const desde = primerAnioBacktest - 1;
  const observadoDesde = (puntos: readonly { anio: number; valor: number }[]) =>
    puntos.filter((p) => p.anio >= desde);

  const mayoresM1 = puntosDeColumna(contraste.filas, COL.mayoresM1);
  const mayoresIne = puntosDeColumna(contraste.filas, COL.mayoresIne);
  const depM1 = puntosDeColumna(contraste.filas, COL.dependenciaM1);
  const depIne = puntosDeColumna(contraste.filas, COL.dependenciaIne);

  const serieContraste = (
    observado: readonly { anio: number; valor: number }[],
    modelo: readonly { anio: number; valor: number }[],
    ine: readonly { anio: number; valor: number }[],
  ): SerieProyectada[] => [
    {
      clave: 'observado',
      etiqueta: 'Observado (INE)',
      observado: observadoDesde(observado),
      proyeccion: [],
      origen: 'modelo',
      color: 'tinta',
    },
    {
      clave: 'modelo',
      etiqueta: `Modelo ${MODELO.m1}`,
      proyeccion: modelo,
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'ine',
      etiqueta: 'Proyección del INE',
      proyeccion: ine,
      origen: 'publicada',
      color: 1,
    },
  ];
  const serieMayores = serieContraste(d.observado.poblacion.mayores.puntos, mayoresM1, mayoresIne);
  const serieDep = serieContraste(d.observado.poblacion.dependencia.puntos, depM1, depIne);

  const dif65 = diferenciasPorAnio(mayoresM1, mayoresIne);
  const difDep = diferenciasPorAnio(depM1, depIne);
  const filasDiferencias = dif65.map((f, i) => {
    const dd = difDep[i];
    return {
      anio: String(f.anio),
      modelo: f.a,
      ine: f.b,
      dif: f.diferencia,
      difRel: f.relativa === null ? null : f.relativa * 100,
      depModelo: dd?.a ?? null,
      depIne: dd?.b ?? null,
      depDif: dd === undefined ? null : dd.diferencia * 100,
    };
  });
  const ultimo = dif65.at(-1);
  const enHorizonte = dif65.find((f) => f.anio === horizonte);

  // Prueba hacia atrás: errores del modelo frente a la población observada.
  const columnasError = [
    { clave: COL.errTotal, etiqueta: descripcionDe(backtest, COL.errTotal) },
    { clave: COL.errMayores, etiqueta: descripcionDe(backtest, COL.errMayores) },
    { clave: COL.errActivos, etiqueta: descripcionDe(backtest, COL.errActivos) },
    { clave: COL.errMenores, etiqueta: descripcionDe(backtest, COL.errMenores) },
  ];
  const etiquetasCortas = ['Total', 'Mayores', 'En edad de trabajar', 'Menores'];
  const seriesError: SerieGrafico[] = columnasError.map((c, i) => ({
    clave: c.clave,
    etiqueta: etiquetasCortas[i] ?? c.etiqueta,
    color: i,
    puntos: puntosDeColumna(backtest.filas, c.clave),
  }));

  // Escenarios demográficos.
  const nombresEscenarios = useMemo(() => valoresDe(escenarios.filas, 'escenario'), [escenarios]);
  const base = nombresEscenarios[0] ?? '';
  const delEscenario = (nombre: string, columna: string) =>
    puntosDeColumna(escenarios.filas, columna, (f) => f['escenario'] === nombre);
  const seriesEscenario = (columna: string, escala = 1): SerieProyectada[] => {
    const aEscala = (ps: readonly { anio: number; valor: number }[]) =>
      ps.map((p) => ({ anio: p.anio, valor: p.valor * escala }));
    const observado =
      columna === COL.mayores
        ? d.observado.poblacion.mayores.puntos
        : d.observado.poblacion.dependencia.puntos;
    return [
      {
        clave: 'observado',
        etiqueta: 'Observado (INE)',
        observado: aEscala(observadoDesde(observado)),
        proyeccion: [],
        origen: 'modelo',
        color: 'tinta',
      },
      {
        clave: 'base',
        etiqueta: base,
        proyeccion: aEscala(delEscenario(base, columna)),
        origen: 'modelo',
        color: 1,
      },
      ...(escenario === base
        ? []
        : [
            {
              clave: 'elegido',
              etiqueta: escenario,
              proyeccion: aEscala(delEscenario(escenario, columna)),
              origen: 'modelo' as const,
              color: 0,
            },
          ]),
    ];
  };
  const filasEscenarios = escenarios.filas.map((f) => ({
    escenario: String(f['escenario']),
    anio: String(f['anio']),
    total: Number(f['total']),
    menores: Number(f[COL.menores]),
    activos: Number(f[COL.activos]),
    mayores: Number(f[COL.mayores]),
    muyMayores: Number(f[COL.muyMayores]),
    dependencia: Number(f[COL.dependencia]),
    lectura: esIlustrativo(Number(f['anio']), horizonte) ? 'ilustrativo' : 'presentado',
  }));
  const aniosEscenarios = [...new Set(escenarios.filas.map((f) => Number(f['anio'])))].sort();
  const filaElegida = (anio: number) =>
    escenarios.filas.find((f) => f['escenario'] === escenario && f['anio'] === anio);
  const unidadDep = unidadDe(contraste, COL.dependenciaM1);
  const fuentesContraste = [
    contraste.dato,
    d.datoProyeccionIne,
    d.observado.poblacion.mayores.dato,
  ];

  return (
    <section className="seccion prosa" aria-labelledby="proy-demografia">
      <h2 id="proy-demografia">Demografía (modelo {MODELO.m1})</h2>
      <p>
        El modelo {MODELO.m1} proyecta la población por sexo y edad con las hipótesis de fecundidad,
        mortalidad y migración de las proyecciones del INE. Aquí se compara con la propia proyección
        del INE, se comprueba hacia atrás con la población ya observada y se muestran los escenarios
        que resultan de cambiar una hipótesis cada vez.
      </p>
      {horizonte === undefined ? null : (
        <p className="hist-aviso">
          El horizonte de presentación del modelo llega hasta {horizonte}. Lo posterior se muestra
          como ilustrativo: no se debe leer como una previsión.
        </p>
      )}

      <GraficoProyeccion
        titulo={`Población de mayores: observada, modelo ${MODELO.m1} y proyección del INE`}
        descripcion={`${descripcionDe(contraste, COL.mayoresM1)} Unidad: millones de personas, a primero de enero.`}
        series={serieMayores}
        unidadEje="Millones de personas"
        divisorEje={MILLON}
        decimalesEje={1}
        fuentes={fuentesContraste}
        horizonte={horizonte}
        nota="La población observada es la suma de las edades simples de la Estadística Continua de Población."
        comoLeerlo={
          <>
            <p>
              Mide cuántas personas del grupo de mayores hay a primero de enero, según el modelo y
              según el INE. Las dos curvas parten de la misma población y se separan porque el
              modelo es una versión simplificada del método del INE; la diferencia por año está en
              la tabla.
            </p>
            <p>
              No dice cuántas personas cobrarán pensión ni cuántas trabajarán: es un recuento de
              población por edad. Lo posterior al horizonte de presentación es ilustrativo.
            </p>
          </>
        }
      />

      <GraficoProyeccion
        titulo={`Relación de dependencia de mayores: observada, modelo ${MODELO.m1} y proyección del INE`}
        descripcion={`${descripcionDe(contraste, COL.dependenciaM1)}. Unidad: ${unidadDep}.`}
        series={serieDep}
        unidadEje="Razón"
        decimales={3}
        decimalesEje={2}
        fuentes={fuentesContraste}
        horizonte={horizonte}
        nota="Es un cociente demográfico, no económico."
        comoLeerlo={
          <>
            <p>
              Relaciona dos grupos de edad: el de mayores y el de edad de trabajar. Sube si el
              primero crece más deprisa que el segundo o si el segundo disminuye.
            </p>
            <p>
              No mide cuántas personas trabajan ni cuántas cobran una pensión: eso depende del
              empleo y de las reglas del sistema, que este cociente no incluye.
            </p>
          </>
        }
      />

      <h3 id="proy-diferencias">Diferencias entre el modelo y el INE, por año</h3>
      <p>
        {ultimo === undefined || enHorizonte === undefined || horizonte === undefined
          ? null
          : `En ${horizonte}, el modelo da ${entero(enHorizonte.a)} personas del grupo de mayores y el INE ${entero(enHorizonte.b)}: una diferencia de ${enHorizonte.relativa === null ? 'no calculable' : puntosAPorcentaje(enHorizonte.relativa * 100, 2)}. En ${ultimo.anio}, la diferencia es de ${ultimo.relativa === null ? 'no calculable' : puntosAPorcentaje(ultimo.relativa * 100, 2)}.`}
      </p>
      <details className="grafico-datos">
        <summary>Ver la tabla de diferencias por año</summary>
        <DataTable
          titulo={`Diferencias por año entre la proyección del modelo ${MODELO.m1} y la del INE`}
          columnas={[
            { clave: 'anio', titulo: 'Año' },
            { clave: 'modelo', titulo: 'Mayores, modelo', tipo: 'numero', decimales: 0 },
            { clave: 'ine', titulo: 'Mayores, INE', tipo: 'numero', decimales: 0 },
            { clave: 'dif', titulo: 'Diferencia (personas)', tipo: 'numero', decimales: 0 },
            { clave: 'difRel', titulo: 'Diferencia (%)', tipo: 'numero', decimales: 2 },
            { clave: 'depModelo', titulo: 'Dependencia, modelo', tipo: 'numero', decimales: 3 },
            { clave: 'depIne', titulo: 'Dependencia, INE', tipo: 'numero', decimales: 3 },
            {
              clave: 'depDif',
              titulo: 'Diferencia de dependencia (puntos)',
              tipo: 'numero',
              decimales: 2,
            },
          ]}
          filas={filasDiferencias}
        />
        <SourceLine datos={fuentesContraste} />
      </details>

      <h3 id="proy-backtest">Prueba hacia atrás: el modelo frente a lo observado</h3>
      <GraficoSeries
        titulo="Error del modelo frente a la población observada"
        descripcion="Diferencia relativa entre la población calculada por el modelo, partiendo del primer año de la prueba con las tasas realmente observadas, y la población observada a primero de enero. Unidad: porcentaje."
        series={seriesError}
        unidadEje="Error (%)"
        decimales={2}
        decimalesEje={1}
        fuentes={[backtest.dato, d.observado.poblacion.mayores.dato]}
        nota="Esta prueba compara el modelo con datos ya observados: no es una proyección."
        comoLeerlo={
          <>
            <p>
              Mide cuánto se aparta el modelo de la población que después se observó cuando se le
              dan las tasas reales de esos años. Un valor positivo significa que el modelo daba más
              población que la observada y uno negativo, menos.
            </p>
            <p>
              No mide el acierto de una proyección hacia el futuro, porque en el futuro las tasas no
              se conocen: solo comprueba que la mecánica del modelo reproduce el pasado.
            </p>
          </>
        }
      />

      <h3 id="proy-escenarios">Escenarios demográficos</h3>
      <p>
        Cada escenario cambia una sola hipótesis de las proyecciones del INE. El rótulo «{base}» es
        el modelo ejecutado con las hipótesis base del INE. Los rótulos son los del fichero de
        salida del modelo.
      </p>
      <div className="hist-selector">
        <SegmentedPills
          leyenda="Escenario demográfico"
          opciones={nombresEscenarios.map((n) => ({ valor: n, etiqueta: n }))}
          valor={escenario}
          onCambio={setEscenario}
        />
      </div>
      <GraficoProyeccion
        titulo={`Población de mayores en el escenario «${escenario}»`}
        descripcion={`${descripcionDe(escenarios, COL.mayores)}, a primero de enero. Unidad: millones de personas. Años de referencia del modelo: ${aniosEscenarios.join(', ')}.`}
        series={seriesEscenario(COL.mayores)}
        unidadEje="Millones de personas"
        divisorEje={MILLON}
        decimalesEje={1}
        fuentes={[escenarios.dato, d.observado.poblacion.mayores.dato]}
        horizonte={horizonte}
        puntos
        nota="Solo hay valores en los años de referencia del modelo; la línea los une sin interpolar datos intermedios."
        comoLeerlo={
          <>
            <p>
              Compara el escenario elegido con el escenario base en los años de referencia. La
              diferencia entre ambos es el efecto de cambiar una sola hipótesis.
            </p>
            <p>
              No dice que el escenario sea más o menos probable: son variaciones de una hipótesis,
              no pronósticos. Lo posterior al horizonte de presentación es ilustrativo.
            </p>
          </>
        }
      />
      <GraficoProyeccion
        titulo={`Relación de dependencia de mayores en el escenario «${escenario}»`}
        descripcion={`${descripcionDe(escenarios, COL.dependencia)}. Unidad: ${unidadDe(escenarios, COL.dependencia)}.`}
        series={seriesEscenario(COL.dependencia)}
        unidadEje="Razón"
        decimales={3}
        decimalesEje={2}
        fuentes={[escenarios.dato, d.observado.poblacion.dependencia.dato]}
        horizonte={horizonte}
        puntos
        nota="El fichero de salida redondea esta razón a tres decimales."
        comoLeerlo={
          <>
            <p>
              Muestra cómo cambia la razón entre mayores y personas en edad de trabajar al cambiar
              la hipótesis elegida. Cada hipótesis actúa por un camino distinto y con distinto
              retraso: la migración modifica antes el grupo en edad de trabajar que la fecundidad.
            </p>
            <p>No dice cuántas personas trabajan ni cuántas cobran una pensión.</p>
          </>
        }
      />
      <details className="grafico-datos">
        <summary>Ver el valor de cada escenario en los años disponibles</summary>
        <DataTable
          titulo={`Escenarios demográficos de ${MODELO.m1} en los años de referencia`}
          columnas={[
            { clave: 'escenario', titulo: 'Escenario' },
            { clave: 'anio', titulo: 'Año' },
            { clave: 'total', titulo: 'Población total', tipo: 'numero', decimales: 0 },
            {
              clave: 'menores',
              titulo: descripcionDe(escenarios, COL.menores),
              tipo: 'numero',
              decimales: 0,
            },
            {
              clave: 'activos',
              titulo: descripcionDe(escenarios, COL.activos),
              tipo: 'numero',
              decimales: 0,
            },
            {
              clave: 'mayores',
              titulo: descripcionDe(escenarios, COL.mayores),
              tipo: 'numero',
              decimales: 0,
            },
            {
              clave: 'muyMayores',
              titulo: descripcionDe(escenarios, COL.muyMayores),
              tipo: 'numero',
              decimales: 0,
            },
            {
              clave: 'dependencia',
              titulo: 'Dependencia de mayores',
              tipo: 'numero',
              decimales: 3,
            },
            { clave: 'lectura', titulo: 'Lectura' },
          ]}
          filas={filasEscenarios}
        />
      </details>
      <p>
        {aniosEscenarios.map((anio, i) => {
          const f = filaElegida(anio);
          return f === undefined ? null : (
            <span key={anio}>
              {i > 0 ? ' ' : ''}
              En {anio}: {entero(Number(f[COL.mayores]))} personas del grupo de mayores y una
              relación de {decimal2(Number(f[COL.dependencia]))}
              {esIlustrativo(anio, horizonte) ? ' (ilustrativo).' : '.'}
            </span>
          );
        })}
      </p>
      <SourceLine datos={[escenarios.dato]} />

      <ComoFunciona>
        <p>
          <strong>Qué hace.</strong> Parte de la población por sexo y edad a primero de enero del
          último año publicado por el INE y la hace avanzar un año cada vez: cada persona cumple un
          año, una parte fallece según la probabilidad de muerte de su sexo y edad, se suman los
          inmigrantes y se restan los emigrantes de cada edad, y nacen niños según cuántas mujeres
          de cada edad hay y cuántos hijos tienen de media. Es el método de cohortes y componentes,
          el que usan los institutos de estadística. La última edad es un tramo abierto.
        </p>
        <p>
          <strong>Datos de entrada.</strong> Población por edad y sexo, tablas de mortalidad,
          fecundidad por edad de la madre y migraciones del INE, más las hipótesis de las
          proyecciones del INE, que se usan como escenario base.
        </p>
        <p>
          <strong>Variables principales.</strong> Para cada año, la población por sexo y edad y
          estos resúmenes (definiciones tomadas de los ficheros de datos):
        </p>
        <ListaVariables
          columnas={contraste.archivo.columnas.filter((c) =>
            (
              [
                COL.totalM1,
                COL.menoresM1,
                COL.activosM1,
                COL.mayoresM1,
                COL.muyMayoresM1,
                COL.dependenciaM1,
              ] as readonly string[]
            ).includes(c.id),
          )}
        />
        <p>
          <strong>Qué se puede cambiar en el código para hacer pruebas.</strong> Un factor sobre las
          tasas de fecundidad del INE; una mejora anual adicional de la mortalidad; un factor sobre
          el saldo migratorio del INE (cero equivale a no tener migración neta); un factor sobre las
          probabilidades de morir a partir de las edades altas; el año de partida y de fin, y la
          proporción de niños que nacen varones. Estas palancas están en el código del modelo, en la
          carpeta de modelos del repositorio; esta página muestra los escenarios ya calculados y no
          permite modificarlos.
        </p>
        <p>
          <strong>Qué no hace.</strong> No modela la economía ni el empleo. Las hipótesis de
          fecundidad, mortalidad y migración son las del INE: son escenarios, no predicciones. La
          mortalidad del último tramo de edad está aproximada, las migraciones históricas proceden
          de dos series del INE que no encajan del todo en el año de cambio de metodología y no hay
          estructura por nacionalidad, región ni estado civil.
        </p>
        <p>
          <strong>Comprobaciones.</strong> El contraste con el INE y la prueba hacia atrás de esta
          sección son las comprobaciones de la descripción del modelo. En esa descripción consta
          también una corrección de un error del propio modelo, que afectaba a la mortalidad de las
          edades altas y se resolvió al contrastar con las defunciones registradas.
        </p>
      </ComoFunciona>
    </section>
  );
}
