import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { MarginNote } from '../../components/MarginNote';
import { SourceLine } from '../../components/SourceLine';
import { extremos } from '../../engine/series-historicas';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal2 } from '../historico/formatos';
import { datosCotizantes } from '../historico/datos-cotizantes';
import {
  DEFINICIONES_RELACION,
  MARCA_FECHAS_DISTINTAS,
  MARCA_MISMA_FECHA,
} from './definiciones-relacion';

/** Relación entre afiliados y pensiones o pensionistas con las definiciones disponibles. */
export function Relacion() {
  const { relacion } = datosCotizantes();

  const filas = DEFINICIONES_RELACION.map((f) => {
    const serie = relacion[f.serie];
    const { primero, ultimo } = extremos(serie.puntos);
    return {
      definicion: f.definicion,
      cuenta: f.cuenta,
      numerador: f.numerador,
      fechaNumerador: f.fechaNumerador,
      denominador: f.denominador,
      fechaDenominador: f.fechaDenominador,
      marca: f.mismaFecha ? MARCA_MISMA_FECHA : MARCA_FECHAS_DISTINTAS,
      periodo:
        primero.anio === ultimo.anio ? String(ultimo.anio) : `${primero.anio} a ${ultimo.anio}`,
      ultimo: ultimo.valor,
      anioUltimo: String(ultimo.anio),
    };
  });

  const ultimoPension = (s: { puntos: readonly { anio: number; valor: number }[] }) =>
    s.puntos.at(-1);
  const pD = ultimoPension(relacion.porPensionDiciembre);
  const pA = ultimoPension(relacion.porPensionUltimoDia);
  const sD = ultimoPension(relacion.porPensionistaDiciembre);
  const sM = ultimoPension(relacion.porPensionistaMediaAnual);

  return (
    <section className="seccion prosa" aria-labelledby="relacion">
      <h2 id="relacion">Afiliados por pensión y por pensionista: varias formas de medirlo</h2>
      <p>
        La relación entre afiliados y pensiones se calcula dividiendo una cifra de afiliados entre
        una de pensiones o de pensionistas. El resultado depende de tres elecciones: si el
        denominador cuenta pensiones o personas, si los afiliados son los de un mes concreto o la
        media del año, y en qué fecha se toma cada cifra. La Seguridad Social no publica esta razón
        como tal en los ficheros descargados: son cocientes calculados a partir de datos publicados.
        Aquí se muestran las seis definiciones disponibles, con la fecha de referencia de cada
        serie, sin escoger ninguna como la correcta.
      </p>
      <Definition termino="Razón entre afiliados y pensiones">
        Número de afiliados (numerador) dividido entre el de pensiones o pensionistas (denominador).
        Una razón de {decimal2(pD?.valor ?? 0)}, por ejemplo, significa que hay esa cantidad de
        afiliados por cada pensión en vigor.
      </Definition>
      <MarginNote etiqueta="Fechas de referencia">
        <p>
          La marca «{MARCA_MISMA_FECHA}» describe las parejas cuyo numerador y denominador se miden
          en fechas contiguas (el último día de diciembre y el primer día de enero siguiente), sin
          desfase de meses. Es una descripción de las fechas, no una indicación de que esa
          definición sea más adecuada que las demás. La definición por pensionista con esa pareja
          de fechas solo existe para un año, porque la Seguridad Social publica el número de
          pensionistas por mes únicamente del año en curso.
        </p>
      </MarginNote>

      <div className="hist-definiciones">
        <DataTable
          titulo="Definiciones de la relación entre afiliados y pensiones o pensionistas"
          columnas={[
            { clave: 'definicion', titulo: 'Definición' },
            { clave: 'cuenta', titulo: 'El denominador cuenta' },
            { clave: 'numerador', titulo: 'Numerador' },
            { clave: 'fechaNumerador', titulo: 'Fecha de referencia del numerador' },
            { clave: 'denominador', titulo: 'Denominador' },
            { clave: 'fechaDenominador', titulo: 'Fecha de referencia del denominador' },
            { clave: 'marca', titulo: 'Fechas de referencia' },
            { clave: 'periodo', titulo: 'Años con dato' },
            { clave: 'anioUltimo', titulo: 'Último año' },
            { clave: 'ultimo', titulo: 'Valor del último año', tipo: 'numero', decimales: 2 },
          ]}
          filas={filas}
        />
        <SourceLine
          datos={[
            relacion.porPensionDiciembre.dato,
            relacion.porPensionUltimoDia.dato,
            relacion.porPensionistaUltimoDia.dato,
          ]}
        />
      </div>

      <h3 id="relacion-perimetro">Perímetro y definiciones que no se muestran</h3>
      <p>
        Los afiliados son los de los regímenes de la Seguridad Social y las pensiones son las
        contributivas del Sistema de la Seguridad Social, que gestionan el Instituto Nacional de la
        Seguridad Social y el Instituto Social de la Marina. El Régimen de Clases Pasivas del Estado
        es otro régimen, con su propia norma, y sus pensiones no figuran en estas series: la razón
        no recoge a ese colectivo ni en el numerador ni en el denominador.
      </p>
      <p>
        No se muestra la definición con cotizantes efectivos (sin suspendidos ni convenio especial):
        los ficheros de afiliación descargados no separan esas situaciones, por lo que queda como
        dato pendiente. Tampoco se muestra ninguna definición que excluya sistemas especiales.
      </p>

      <GraficoSeries
        titulo="Afiliados por cada pensión contributiva"
        descripcion="Tres definiciones. Unidad: afiliados por pensión."
        series={[
          {
            clave: 'dic',
            etiqueta: 'Afiliados de diciembre',
            puntos: relacion.porPensionDiciembre.puntos,
          },
          {
            clave: 'media',
            etiqueta: 'Afiliados medios del año',
            puntos: relacion.porPensionMediaAnual.puntos,
          },
          {
            clave: 'alt',
            etiqueta: 'Último día de diciembre y primer día de enero',
            puntos: relacion.porPensionUltimoDia.puntos,
          },
        ]}
        unidadEje="Afiliados por pensión"
        incluirCero={false}
        decimales={2}
        decimalesEje={1}
        fuentes={[
          relacion.porPensionDiciembre.dato,
          relacion.porPensionMediaAnual.dato,
          relacion.porPensionUltimoDia.dato,
        ]}
        nota="Datos derivados (cociente de dos series publicadas), con confianza media. Las tres definiciones se muestran sin elegir una."
        comoLeerlo={
          <>
            <p>
              En el último año las tres definiciones dan {decimal2(pD?.valor ?? 0)},{' '}
              {decimal2(pA?.valor ?? 0)} y{' '}
              {decimal2(ultimoPension(relacion.porPensionMediaAnual)?.valor ?? 0)} afiliados por
              pensión. Un valor más alto significa más afiliados por cada pensión en vigor; uno más
              bajo, menos.
            </p>
            <p>
              Las diferencias entre líneas proceden solo de la fecha y del tipo de cifra elegidos,
              no de datos distintos. La razón no dice cuánto se cotiza ni cuánto se cobra, ni
              cuántas personas afiliadas cotizan de forma efectiva.
            </p>
          </>
        }
      />

      <GraficoSeries
        titulo="Afiliados por cada pensionista"
        descripcion="Dos definiciones y un punto de la tercera. Unidad: afiliados por pensionista (persona)."
        series={[
          {
            clave: 'dic',
            etiqueta: 'Afiliados de diciembre',
            puntos: relacion.porPensionistaDiciembre.puntos,
          },
          {
            clave: 'media',
            etiqueta: 'Afiliados medios del año',
            puntos: relacion.porPensionistaMediaAnual.puntos,
          },
          {
            clave: 'alt',
            etiqueta: 'Último día de diciembre y primer día de enero',
            puntos: relacion.porPensionistaUltimoDia.puntos,
          },
        ]}
        unidadEje="Afiliados por pensionista"
        incluirCero={false}
        decimales={2}
        decimalesEje={1}
        fuentes={[
          relacion.porPensionistaDiciembre.dato,
          relacion.porPensionistaMediaAnual.dato,
          relacion.porPensionistaUltimoDia.dato,
        ]}
        nota="Datos derivados (cociente de dos series publicadas), con confianza media. La tercera definición solo tiene un año."
        comoLeerlo={
          <>
            <p>
              En el último año las definiciones con serie completa dan {decimal2(sD?.valor ?? 0)} y{' '}
              {decimal2(sM?.valor ?? 0)} afiliados por pensionista. Cuenta personas, no pensiones:
              quien cobra dos pensiones cuenta una vez.
            </p>
            <p>
              Para la misma fecha hay más afiliados por pensionista que por pensión, porque hay
              menos pensionistas que pensiones. La comparación entre ambos gráficos solo tiene
              sentido si se mantiene el mismo denominador.
            </p>
          </>
        }
      />
    </section>
  );
}
