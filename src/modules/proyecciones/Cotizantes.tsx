import { DataTable } from '../../components/DataTable';
import { SourceLine } from '../../components/SourceLine';
import { BASE_INDICE, diferenciasPorAnio, indiceDesdeBase } from '../../engine/proyecciones';
import { DEFINICIONES_RELACION } from '../cotizantes-y-pensionistas/definiciones-relacion';
import { decimal1, decimal2 } from '../historico/formatos';
import { ComoFunciona, ListaVariables } from './Comunes';
import { datosProyecciones, type TablaModelo } from './datos-proyecciones';
import { GraficoProyeccion } from './GraficoProyeccion';
import type { SerieProyectada } from './grafico-proyeccion';
import { COL, MODELO } from './ids-datos';
import { puntosDeColumna } from './series';
import { APARTADOS } from './apartados';

const MILLON = 1_000_000;
const descripcionDe = (tabla: TablaModelo, id: string): string =>
  tabla.archivo.columnas.find((c) => c.id === id)?.descripcion ?? id;

/** Bloque M2: afiliados, cotizantes del Régimen General, bases de cotización y afiliados por pensión. */
export function Cotizantes() {
  const d = datosProyecciones();
  const { cotizantes, relacion } = d.m2;
  const anioBaseReal = cotizantes.archivo.modelo.anioBaseReal;
  const afiliadosM2 = puntosDeColumna(cotizantes.filas, COL.afiliados);
  const cotizantesM2 = puntosDeColumna(cotizantes.filas, COL.cotizantesRg);
  const baseM2 = puntosDeColumna(cotizantes.filas, COL.baseCorrientes);
  const baseRealM2 = puntosDeColumna(cotizantes.filas, COL.baseReales);
  const porPensionM2 = puntosDeColumna(relacion.filas, COL.afiliadosPorPension);
  const anioInicio = afiliadosM2[0]?.anio ?? 0;

  const serieAfiliados: SerieProyectada[] = [
    {
      clave: 'afiliados',
      etiqueta: 'Afiliados de diciembre',
      observado: d.observado.afiliadosDiciembre.puntos,
      proyeccion: afiliadosM2,
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'cotizantes',
      etiqueta: 'Cotizantes del Régimen General',
      observado: d.observado.cotizantesRg.puntos,
      proyeccion: cotizantesM2,
      origen: 'modelo',
      color: 1,
    },
  ];
  const serieBase: SerieProyectada[] = [
    {
      clave: 'corrientes',
      etiqueta: 'Euros corrientes',
      observado: d.observado.baseTotalCorrientes.puntos,
      proyeccion: baseM2,
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'reales',
      etiqueta: `Euros de ${anioBaseReal}`,
      observado: d.observado.baseTotalReales.puntos,
      proyeccion: baseRealM2,
      origen: 'modelo',
      color: 1,
    },
  ];
  const serieRelacion: SerieProyectada[] = [
    {
      clave: 'relacion',
      etiqueta: 'Afiliados por pensión',
      observado: d.observado.relacionDiciembre.puntos,
      proyeccion: porPensionM2,
      origen: 'modelo',
      color: 0,
    },
  ];

  // Contraste con el Ageing Report 2024: afiliados por pensión frente a cotizantes por pensionista.
  const indiceModelo = indiceDesdeBase(porPensionM2, anioInicio);
  const aniosModelo = new Set(porPensionM2.map((p) => p.anio));
  const indiceAgeing = indiceDesdeBase(d.ageing.apoyo.puntos, anioInicio).filter((p) =>
    aniosModelo.has(p.anio),
  );
  const dif = diferenciasPorAnio(indiceModelo, indiceAgeing);
  const serieContraste: SerieProyectada[] = [
    {
      clave: 'modelo',
      etiqueta: `Modelo ${MODELO.m2}: afiliados por pensión`,
      proyeccion: indiceModelo,
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'ageing',
      etiqueta: 'Ageing Report: cotizantes por pensionista',
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

  // Definición del modelo frente a la del histórico más próxima.
  const historica = DEFINICIONES_RELACION.find((x) => x.serie === 'porPensionDiciembre');
  const filasDefiniciones = [
    {
      origen: `Modelo ${MODELO.m2} (y ${MODELO.m3})`,
      numerador: descripcionDe(relacion, COL.afiliados),
      denominador: descripcionDe(relacion, COL.pensionesOct),
      fecha: 'Afiliados de diciembre; pensiones de octubre del mismo año',
    },
    {
      origen: 'Histórico de «Cotizantes y pensionistas»',
      numerador: historica?.numerador ?? '',
      denominador: historica?.denominador ?? '',
      fecha: `Afiliados: ${(historica?.fechaNumerador ?? '').toLowerCase()}; pensiones: ${(historica?.fechaDenominador ?? '').toLowerCase()}`,
    },
  ];

  const fuentesMagnitudes = [
    cotizantes.dato,
    d.observado.afiliadosDiciembre.dato,
    d.observado.cotizantesRg.dato,
  ];
  const fuentesBase = [
    cotizantes.dato,
    d.observado.baseTotalCorrientes.dato,
    d.observado.baseTotalReales.dato,
  ];
  const fuentesRelacion = [relacion.dato, d.observado.relacionDiciembre.dato];
  const fuentesContraste = [relacion.dato, d.ageing.apoyo.dato];

  return (
    <section className="seccion prosa" aria-labelledby={APARTADOS.cotizantes.destino}>
      <h2 id={APARTADOS.cotizantes.destino} tabIndex={-1}>
        {APARTADOS.cotizantes.titulo}
      </h2>
      <p>
        El modelo {MODELO.m2} aplica a la población proyectada por {MODELO.m1} las tasas de
        afiliación y de cotización del último año observado, que mantiene constantes, y hace crecer
        la base media de cotización con el salario real (g) y los precios (IPC) del escenario de
        referencia. Es la primera versión del modelo.
      </p>

      <GraficoProyeccion
        titulo="Afiliados y cotizantes del Régimen General: observado y proyección"
        descripcion="Afiliados de diciembre de todos los regímenes y cotizantes del Régimen General (media de los meses del año). Unidad: millones de personas."
        series={serieAfiliados}
        unidadEje="Millones de personas"
        divisorEje={MILLON}
        decimalesEje={1}
        fuentes={fuentesMagnitudes}
        nota="Los cotizantes observados son un cálculo propio sobre la estadística de bases de cotización, solo en los años con los doce meses publicados."
        comoLeerlo={
          <>
            <p>
              Con las tasas de afiliación y de cotización constantes, el número de afiliados y de
              cotizantes sigue a la población de cada sexo y edad: si baja la población de un tramo,
              bajan sus cotizantes.
            </p>
            <p>
              No es una previsión del empleo: responde a «qué pasaría si cada edad se comportara
              como en el último año observado». No modela el ciclo económico ni el paro. Los
              afiliados incluyen autónomos y demás regímenes y se miden en diciembre; los cotizantes
              del Régimen General son una media anual, y no son la misma cosa.
            </p>
          </>
        }
      />

      <GraficoProyeccion
        titulo="Base de cotización total del Régimen General: euros corrientes y euros reales"
        descripcion={`Suma de las bases de cotización por contingencias comunes del Régimen General. Unidad: miles de millones de euros, corrientes y constantes del año ${anioBaseReal}.`}
        series={serieBase}
        unidadEje="Miles de millones de euros"
        divisorEje={1000}
        decimalesEje={0}
        fuentes={fuentesBase}
        nota={`El observado en euros constantes se ha deflactado con el IPC medio anual del INE; la proyección en euros de ${anioBaseReal} es la que calcula el modelo con su IPC supuesto.`}
        comoLeerlo={
          <>
            <p>
              La base crece en euros corrientes por los salarios y por los precios; en euros
              constantes se descuenta el efecto de los precios, y las dos líneas coinciden en el año
              base. La recaudación del Régimen General es esta base por el tipo de cotización
              vigente.
            </p>
            <p>
              No es el ingreso total de la Seguridad Social: solo cubre las contingencias comunes
              del Régimen General y sirve como orden de magnitud. No incluye autónomos ni otros
              regímenes, no aplica topes de base y mantiene la legislación congelada.
            </p>
          </>
        }
      />

      <h3 id="proy-relacion">Afiliados por pensión</h3>
      <p>
        El cociente entre afiliados y pensiones depende de qué fechas se comparen. El modelo usa
        afiliados de diciembre y pensiones de octubre del mismo año; el histórico de «Cotizantes y
        pensionistas» ofrece varias definiciones, y la más próxima compara los afiliados de
        diciembre con las pensiones de primero de diciembre.
      </p>
      <DataTable
        titulo="Definición del modelo frente a la definición más próxima del histórico"
        columnas={[
          { clave: 'origen', titulo: 'Serie' },
          { clave: 'numerador', titulo: 'Numerador' },
          { clave: 'denominador', titulo: 'Denominador' },
          { clave: 'fecha', titulo: 'Fechas de referencia' },
        ]}
        filas={filasDefiniciones}
      />
      <GraficoProyeccion
        titulo="Afiliados por pensión: histórico y proyección del modelo"
        descripcion="Afiliados de diciembre entre pensiones contributivas. El histórico usa las pensiones de primero de diciembre; el modelo, las de octubre. Unidad: afiliados por pensión."
        series={serieRelacion}
        unidadEje="Afiliados por pensión"
        decimales={2}
        decimalesEje={1}
        fuentes={fuentesRelacion}
        nota="El tramo observado y el proyectado difieren en la fecha del denominador: hay un salto de definición, además de la evolución de las cifras."
        comoLeerlo={
          <>
            <p>
              Indica cuántos afiliados hay por cada pensión contributiva. Baja si las pensiones
              crecen más deprisa que los afiliados.
            </p>
            <p>
              No mide la situación financiera del sistema: no incluye cuantías, edades de jubilación
              ni otras fuentes de ingreso. Cuenta pensiones, no pensionistas, y depende de la fecha
              de referencia de cada término.
            </p>
          </>
        }
      />

      <h3 id="proy-cotizantes-ageing">Contraste con el Ageing Report de la Comisión Europea</h3>
      <p>
        El Ageing Report publica la relación de cotizantes por cada cien pensionistas. Se compara
        con los afiliados por pensión del modelo en índice, con el año de inicio igual a{' '}
        {BASE_INDICE}, porque las dos series tienen numeradores y denominadores distintos (afiliados
        y pensiones en el modelo; cotizantes y pensionistas en el Ageing Report).
      </p>
      <GraficoProyeccion
        titulo={`Afiliados por pensión del modelo y cotizantes por pensionista del Ageing Report: índice, año de inicio = ${BASE_INDICE}`}
        descripcion={`Cada serie dividida por su valor en ${anioInicio} y multiplicada por cien. Unidad: índice.`}
        series={serieContraste}
        unidadEje={`Índice (${anioInicio} = ${BASE_INDICE})`}
        decimales={1}
        decimalesEje={0}
        fuentes={fuentesContraste}
        nota="El Ageing Report es una proyección con sus propios supuestos de empleo, productividad y demografía."
        comoLeerlo={
          <>
            <p>
              Muestra cuánto cambia cada relación respecto al año de inicio. Si las dos curvas
              descienden, ambas indican menos afiliados o cotizantes por pensión o pensionista que
              en el año de inicio; la diferencia entre ellas, en puntos de índice, está en la tabla.
            </p>
            <p>
              No dice cuál de las dos es más acertada: las definiciones y los supuestos son
              distintos, y la comparación en índice solo contrasta la forma de la evolución.
            </p>
          </>
        }
      />
      <p>
        {ultima === undefined
          ? null
          : `En ${ultima.anio}, el índice del modelo es ${decimal1(ultima.a)} y el del Ageing Report ${decimal1(ultima.b)}: una diferencia de ${decimal2(ultima.diferencia)} puntos de índice (modelo menos Ageing Report).`}
      </p>
      <details className="grafico-datos">
        <summary>Ver la tabla de diferencias por año</summary>
        <DataTable
          titulo="Diferencia entre el índice de afiliados por pensión del modelo y el de cotizantes por pensionista del Ageing Report"
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
          <strong>Qué hace.</strong> Para cada sexo y tramo de edad toma la proporción de personas
          afiliadas (o cotizantes del Régimen General) en el último año observado y la aplica a la
          población que proyecta {MODELO.m1}. Si la población de un tramo baja, bajan sus
          cotizantes. La base de cotización media de cada tramo, observada en ese año, crece cada
          año con el salario real (g) y los precios (IPC). La recaudación de contingencias comunes
          del Régimen General es la base total por el tipo de cotización vigente.
        </p>
        <p>
          <strong>Datos de entrada.</strong> Los afiliados por sexo y edad, la base media de
          cotización del Régimen General, los tipos de cotización de los parámetros del sistema, la
          población proyectada de {MODELO.m1}, las pensiones de {MODELO.m3} y, para contrastar, el
          Ageing Report.
        </p>
        <p>
          <strong>Variables principales.</strong> Entradas por tramo: tasa de afiliación, tasa de
          cotización del Régimen General, base media mensual y tipo de cotización. Salidas por año:
        </p>
        <ListaVariables columnas={[...cotizantes.archivo.columnas, ...relacion.archivo.columnas]} />
        <p>
          <strong>Qué se puede cambiar en el código para hacer pruebas.</strong> g e IPC, que solo
          cambian importes y no personas; las palancas de {MODELO.m1} (fecundidad, mortalidad y
          migración), que cambian el número de personas; la convergencia de las mujeres (de cero a
          uno), por la que las mujeres de edad de trabajar alcanzan de forma gradual las tasas de
          los hombres de su tramo; un factor sobre la tasa de los tramos de mayor edad laboral y un
          factor sobre la tasa global. Los cambios llegan de forma lineal hasta el horizonte de
          presentación. Están en el código del modelo; esta página muestra el escenario ya
          calculado.
        </p>
        <p>
          <strong>Qué no hace.</strong> Mantiene las tasas constantes, sin ciclo económico ni paro;
          los autónomos y otros regímenes solo aparecen en los afiliados totales, sin su
          recaudación; no aplica topes de base ni bases mínimas por persona; la base media no cambia
          por la composición por edades salvo por el peso de cada tramo; y mantiene la legislación
          congelada. Más allá del horizonte de presentación sería ilustrativo.
        </p>
        <p>
          <strong>Pendiente según su descripción.</strong> Incorporar el régimen de autónomos,
          calibrar las tasas con la encuesta de población activa y conectar el modelo con el modelo
          financiero.
        </p>
      </ComoFunciona>
    </section>
  );
}
