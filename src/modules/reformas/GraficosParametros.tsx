import { useMemo } from 'react';
import { GraficoSeries } from '../historico/GraficoSeries';
import { graficosParametros } from './datos-reformas';

const TEXTOS = {
  edad: {
    titulo: 'Edad ordinaria de jubilación por año',
    descripcion: 'Edad ordinaria de jubilación, en meses de edad, por año de jubilación.',
    unidad: 'meses de edad',
  },
  periodo: {
    titulo: 'Periodo de cálculo de la base reguladora por año',
    descripcion:
      'Meses de bases de cotización que entran en la ventana de cálculo de la base reguladora, por año del hecho causante.',
    unidad: 'meses de bases de cotización',
  },
  maximo: {
    titulo: 'Cotización con la que se alcanza el porcentaje máximo de la escala por año',
    descripcion:
      'Meses cotizados con los que la escala de porcentajes alcanza su porcentaje máximo, por año del hecho causante.',
    unidad: 'meses cotizados',
  },
} as const;

/**
 * Tres gráficos de parámetros que cambian con el calendario. Los datos son los de /data que
 * muestran las fichas; las líneas verticales marcan el año en que empieza el calendario de cada
 * norma. Ningún gráfico compara normas ni señala una como mejor o peor.
 */
export function GraficosParametros() {
  const graficos = useMemo(() => graficosParametros(), []);
  return (
    <div className="ref-graficos">
      {graficos.map((g) => (
        <GraficoSeries
          key={g.clave}
          titulo={TEXTOS[g.clave].titulo}
          descripcion={TEXTOS[g.clave].descripcion}
          series={g.series}
          unidadEje={TEXTOS[g.clave].unidad}
          rupturas={g.rupturas}
          fuentes={g.fuentes}
          nota={
            <>
              Definición: {g.definicion} Los últimos años de la serie son los que fijan las normas
              para el futuro, no valores observados.
            </>
          }
          comoLeerlo={
            <>
              <p>
                En horizontal, el año; en vertical, el valor del parámetro en meses. Un tramo plano
                es un periodo en el que el parámetro no cambia y un escalón, un año en que cambia.
                Cada línea vertical marca el año en que empieza el calendario que fija una de las
                normas de las fichas.
              </p>
              <p>
                El gráfico describe cómo cambia el parámetro con el tiempo: no dice cómo afecta a la
                pensión de una persona ni valora ninguna de las normas.
              </p>
            </>
          }
        />
      ))}
    </div>
  );
}
