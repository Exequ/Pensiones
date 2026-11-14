import { useMemo, useState } from 'react';
import { SegmentedPills } from '../../components/SegmentedPills';
import { escalar, extremos } from '../../engine/series-historicas';
import { mesesDeFlujo } from '../../engine/transferencias';
import { datosHucha } from '../historico/datos-hucha';
import { GraficoSeries } from '../historico/GraficoSeries';
import { decimal2, millonesEuros } from '../historico/formatos';

type Unidad = 'meses' | 'trimestres';

/** «b. El Fondo de Reserva frente a las transferencias»: meses o trimestres de transferencias. */
export function SeccionFondoTransferencias() {
  const d = datosHucha();
  const [unidad, setUnidad] = useState<Unidad>('meses');
  const t = d.transferencias;

  const porAnio = useMemo(
    () => mesesDeFlujo(d.valor.puntos, t.delEstado.puntos, 12),
    [d.valor.puntos, t.delEstado.puntos],
  );
  const porTrimestre = useMemo(
    () => mesesDeFlujo(d.valor.puntos, t.cuartoTrimestre, 3),
    [d.valor.puntos, t.cuartoTrimestre],
  );
  const factor = unidad === 'meses' ? 1 : 1 / 3;
  const serieAnio = useMemo(() => escalar(porAnio, factor), [porAnio, factor]);
  const serieTrimestre = useMemo(() => escalar(porTrimestre, factor), [porTrimestre, factor]);

  const { primero: primeroA, ultimo: ultimoA } = extremos(porAnio);
  const ultimoT = porTrimestre.at(-1);
  const valorUltimo = d.valor.puntos.at(-1);
  const etiquetaUnidad = unidad === 'meses' ? 'meses' : 'trimestres';

  return (
    <section className="seccion prosa" aria-labelledby="fondo-transferencias">
      <h2 id="fondo-transferencias">El Fondo de Reserva frente a las transferencias</h2>
      <p>
        Otra forma de situar el tamaño del Fondo es compararlo con las transferencias que el Estado
        envía a la Seguridad Social: cuántos meses o trimestres de transferencias equivale su valor.
        El resultado depende del periodo con el que se midan las transferencias, por lo que se
        muestran dos definiciones: las transferencias de todo el año, que es la medida principal, y
        las del último trimestre del año, que es la secundaria.
      </p>
      <p className="hist-aviso">
        Los flujos trimestrales no son un dato publicado por trimestre: son diferencias entre
        acumulados de la ejecución (derechos reconocidos netos). Los derechos reconocidos de cada
        trimestre no se reparten por igual a lo largo del año (véase el gráfico por trimestre de la
        sección anterior), de modo que un trimestre aislado puede no ser representativo del resto.
        El Fondo se valora a precio de adquisición.
      </p>
      <div className="hist-selector">
        <SegmentedPills
          leyenda="Unidad de la comparación"
          opciones={[
            { valor: 'meses', etiqueta: 'Meses de transferencias' },
            { valor: 'trimestres', etiqueta: 'Trimestres de transferencias' },
          ]}
          valor={unidad}
          onCambio={setUnidad}
        />
      </div>
      <GraficoSeries
        titulo={`El valor del Fondo de Reserva, en ${etiquetaUnidad} de transferencias del Estado`}
        descripcion={`Valor del Fondo al cierre del año dividido entre las transferencias de cada periodo, expresado en ${etiquetaUnidad} de transferencias. Unidad: ${etiquetaUnidad}.`}
        series={[
          {
            clave: 'anual',
            etiqueta: 'Principal: transferencias del año',
            puntos: serieAnio,
          },
          {
            clave: 'trimestral',
            etiqueta: 'Secundaria: cuarto trimestre',
            puntos: serieTrimestre,
          },
        ]}
        unidadEje={unidad === 'meses' ? 'Meses de transferencias' : 'Trimestres de transferencias'}
        incluirCero
        decimales={2}
        decimalesEje={1}
        fuentes={[d.valor.dato, t.delEstado.dato, t.datoTrimestral]}
        nota="Cálculos propios (confianza media). Medida principal (año completo): valor del Fondo a fin de año ÷ (transferencias del año ÷ doce). Medida secundaria (cuarto trimestre): valor del Fondo a fin de año ÷ (transferencias del cuarto trimestre del mismo año ÷ tres). Un trimestre equivale a tres meses. Los flujos trimestrales son diferencias entre acumulados. Las transferencias son las corrientes del Estado y organismos autónomos de la ejecución del presupuesto; el Fondo está a precio de adquisición."
        comoLeerlo={
          <>
            <p>
              En {ultimoA.anio} el valor del Fondo ({millonesEuros(valorUltimo?.valor ?? 0)})
              equivale a {decimal2(ultimoA.valor)} meses de las transferencias del año (medida
              principal)
              {ultimoT === undefined
                ? ''
                : ` y a ${decimal2(ultimoT.valor)} meses de las del cuarto trimestre (medida secundaria)`}
              . En {primeroA.anio} equivalía a {decimal2(primeroA.valor)} meses de las del año. En
              trimestres, el valor de {ultimoA.anio} es de {decimal2(ultimoA.valor / 3)} trimestres
              de las transferencias del año.
            </p>
            <p>
              Es una comparación de tamaños en un año concreto: los derechos reconocidos por
              transferencias no son uniformes entre trimestres (el cuarto trimestre no es
              representativo de los demás) ni existe una regla que relacione el Fondo con ellas. El
              último dato del Fondo es de cierre de año; la ejecución de las transferencias llega a
              un trimestre posterior, pero no hay un valor del Fondo más reciente con el que
              compararlo.
            </p>
          </>
        }
      />
    </section>
  );
}
