import { useMemo } from 'react';
import { formatearNumero } from '../../engine/formato';
import { GraficoSeries } from '../historico/GraficoSeries';
import { datosAnticipo, datosDemora, datosEscala } from './graficos';

/** Qué tiempo cotizado corresponde a cada tramo del gráfico (las etiquetas directas son cortas). */
function TramosDelCuadro({ textos }: { readonly textos: readonly string[] }) {
  return (
    <>
      Tramos de cotización acumulada:{' '}
      {textos.map((t, i) => `tramo ${formatearNumero(i + 1)}, ${t}`).join('; ')}.
    </>
  );
}

/**
 * Tres gráficos que explican la jubilación: la escala de porcentajes frente a los meses cotizados,
 * los coeficientes reductores de la jubilación anticipada y el porcentaje adicional de la demora.
 * Los datos salen de /data a través de las funciones del motor; nada se escribe a mano. Ningún
 * gráfico señala una opción como mejor: describen cómo funciona la norma.
 */
export function GraficosJubilacion() {
  const escala = useMemo(() => datosEscala(), []);
  const voluntaria = useMemo(() => datosAnticipo('voluntaria'), []);
  const involuntaria = useMemo(() => datosAnticipo('involuntaria'), []);
  const demora = useMemo(() => datosDemora(), []);
  return (
    <div className="como-graficos">
      <GraficoSeries
        titulo="Porcentaje de la base reguladora según los meses cotizados"
        descripcion="Porcentaje de la base reguladora que se aplica, por meses cotizados, en cada versión de la escala."
        series={escala.series}
        etiquetasX={escala.etiquetasX}
        tituloX="Cotización"
        unidadEje="% de la base reguladora"
        decimales={2}
        fuentes={escala.fuentes}
        nota={
          <>
            Definición: cada serie es una versión de la escala del artículo sobre la cuantía de la
            pensión y de su disposición transitoria; rige para los hechos causantes desde el año
            indicado hasta que entra la versión siguiente. El porcentaje parte de un valor por el
            periodo mínimo de cotización y crece por cada mes adicional hasta un máximo.
          </>
        }
        comoLeerlo={
          <>
            <p>
              En horizontal, el tiempo cotizado; en vertical, el porcentaje de la base reguladora
              que se cobra. Cada línea es una versión de la escala. Las líneas más inclinadas
              indican que cada mes adicional suma más porcentaje.
            </p>
            <p>
              El gráfico solo describe cómo cambia el porcentaje con la cotización: no dice cuándo
              conviene jubilarse ni valora ninguna versión de la escala.
            </p>
          </>
        }
      />
      <GraficoSeries
        titulo="Coeficientes reductores de la jubilación anticipada voluntaria"
        descripcion="Reducción de la pensión, en porcentaje, según los meses de anticipación y el tiempo cotizado."
        series={voluntaria.series}
        etiquetasX={voluntaria.etiquetasX}
        tituloX="Anticipación"
        unidadEje="% de reducción de la pensión"
        decimales={2}
        fuentes={voluntaria.fuentes}
        nota={
          <>
            Definición: el coeficiente se aplica sobre la pensión resultante de aplicar el
            porcentaje por meses cotizados. Hay una serie por tramo de cotización acumulada.{' '}
            <TramosDelCuadro textos={voluntaria.descripcionSeries ?? []} />
          </>
        }
        comoLeerlo={
          <>
            <p>
              En horizontal, cuánto se adelanta la jubilación respecto de la edad ordinaria; en
              vertical, el porcentaje que se descuenta de la pensión. Cada línea corresponde a un
              tramo de cotización acumulada.
            </p>
            <p>
              Muestra cómo funciona el cuadro de la norma; no compara la pensión de quien se jubila
              antes con la de quien se jubila después.
            </p>
          </>
        }
      />
      <GraficoSeries
        titulo="Coeficientes reductores de la jubilación anticipada por causa no imputable a la persona trabajadora"
        descripcion="Reducción de la pensión, en porcentaje, según los meses de anticipación y el tiempo cotizado."
        series={involuntaria.series}
        etiquetasX={involuntaria.etiquetasX}
        tituloX="Anticipación"
        unidadEje="% de reducción de la pensión"
        decimales={2}
        fuentes={involuntaria.fuentes}
        nota={
          <>
            Definición: es el cuadro que se aplica cuando el cese en el trabajo no se debe a la
            voluntad de la persona trabajadora y se cumplen los demás requisitos de la modalidad.{' '}
            <TramosDelCuadro textos={involuntaria.descripcionSeries ?? []} />
          </>
        }
        comoLeerlo={
          <>
            <p>
              Se lee igual que el gráfico anterior: el eje horizontal es el tiempo que se adelanta
              la jubilación y el vertical, el porcentaje de reducción, con una línea por tramo de
              cotización acumulada.
            </p>
            <p>El cuadro es distinto del de la modalidad voluntaria; el gráfico no los valora.</p>
          </>
        }
      />
      <GraficoSeries
        titulo="Porcentaje adicional de la jubilación demorada"
        descripcion="Porcentaje adicional de la pensión, según el tiempo cotizado después de la edad ordinaria."
        series={demora.series}
        etiquetasX={demora.etiquetasX}
        tituloX="Demora"
        unidadEje="% adicional"
        decimales={2}
        fuentes={demora.fuentes}
        nota="Definición: el porcentaje adicional es una de las formas de abonar el complemento por demora; las otras son una cantidad a tanto alzado o una combinación de ambas."
        comoLeerlo={
          <>
            <p>
              En horizontal, el tiempo cotizado desde la edad ordinaria hasta el hecho causante; en
              vertical, el porcentaje que se suma al de la escala. Sube por escalones: cada año
              completo suma lo mismo y, a partir del segundo año, una fracción de año suma una
              parte.
            </p>
            <p>
              No incluye las otras formas de abono ni dice si compensa seguir trabajando: solo
              describe cómo se calcula el porcentaje.
            </p>
          </>
        }
      />
    </div>
  );
}
