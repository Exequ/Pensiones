/**
 * Series de los gráficos de la sección de jubilación: escala de porcentajes frente a los meses
 * cotizados, coeficientes reductores por meses de anticipación y porcentaje adicional por demora.
 * Los valores los dan las funciones puras del motor (`porcentajes.ts`, `demora.ts`) sobre los
 * parámetros de /data; este módulo solo elige los puntos y las etiquetas.
 */
import type { Dato } from '../../engine/esquema-datos';
import { formatearDuracion } from '../../engine/formato';
import { tiempoDemora, porcentajeAdicional } from '../../engine/jubilacion/demora';
import { parametrosDelRepositorio } from '../../engine/jubilacion/parametros-datos';
import { mesesPara100, porcentajeEscala } from '../../engine/jubilacion/porcentajes';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { elementosDe } from './datos-como';
import type { SerieGrafico } from '../historico/GraficoSeries';

export interface DatosGrafico {
  readonly series: readonly SerieGrafico[];
  /** Etiqueta de cada posición del eje horizontal. */
  readonly etiquetasX: readonly string[];
  readonly fuentes: readonly Dato[];
}

const unDato = (fichero: string): Dato[] => {
  const d = elementosDe(fichero)[0];
  return d === undefined ? [] : [d];
};

/** Porcentaje de la base reguladora por meses cotizados, una serie por versión de la escala. */
export function datosEscala(paso = 12): DatosGrafico {
  const versiones = parametrosDelRepositorio().escala.toSorted((a, b) => a.desde - b.desde);
  const inicio = Math.min(...versiones.map((v) => v.baseMeses));
  const fin = Math.max(...versiones.map((v) => mesesPara100(v)));
  const posiciones = Math.ceil((fin - inicio) / paso) + 1;
  const meses = Array.from({ length: posiciones }, (_, i) => inicio + i * paso);
  return {
    series: versiones.map((v) => ({
      clave: `escala-${String(v.desde)}`,
      etiqueta: `Desde ${String(v.desde)}`,
      puntos: meses.map((m, i) => ({ anio: i, valor: porcentajeEscala(v, m) })),
    })),
    etiquetasX: meses.map((m) => formatearDuracion(m)),
    fuentes: unDato('escala-jubilacion-tramos'),
  };
}

export type CuadroAnticipo = 'voluntaria' | 'involuntaria';

/** Coeficiente reductor (% de la pensión) por meses de anticipación, una serie por tramo de cotización. */
export function datosAnticipo(cuadro: CuadroAnticipo): DatosGrafico {
  const p = parametrosDelRepositorio();
  const tabla = cuadro === 'voluntaria' ? p.coeficientesVoluntaria : p.coeficientesInvoluntaria;
  const maximo = Math.max(
    ...[...tabla.coeficientes.keys()].map((k) => Number(/^t\d-(\d+)$/.exec(k)?.[1] ?? 0)),
  );
  const meses = Array.from({ length: maximo }, (_, i) => i + 1);
  const [u2, u3, u4] = tabla.umbralesMeses;
  const dur = (m: number) => formatearDuracion(m);
  const etiquetas = [
    `Menos de ${dur(u2)} cotizados`,
    `De ${dur(u2)} a menos de ${dur(u3)}`,
    `De ${dur(u3)} a menos de ${dur(u4)}`,
    `${dur(u4)} o más`,
  ];
  return {
    series: etiquetas.map((etiqueta, i) => ({
      clave: `tramo-${String(i + 1)}`,
      etiqueta,
      puntos: meses.flatMap((m, j) => {
        const valor = tabla.coeficientes.get(`t${String(i + 1)}-${String(m)}`);
        return valor === undefined ? [] : [{ anio: j, valor }];
      }),
    })),
    etiquetasX: meses.map((m) => dur(m)),
    fuentes: unDato(
      cuadro === 'voluntaria'
        ? 'jubilacion-coeficientes-voluntaria'
        : 'jubilacion-coeficientes-involuntaria',
    ),
  };
}

/** Porcentaje adicional de la demora por tiempo cotizado después de la edad ordinaria. */
export function datosDemora(maximoMeses = 120, paso = 3): DatosGrafico {
  const reglas = parametrosDelRepositorio().reglasDemora;
  const lectura = LECTURAS_ABIERTAS.find((l) => l.id === 'jubilacion.fraccionDemora')?.porDefecto;
  const fraccion = lectura === 'desde-primer-anio' ? 'desde-primer-anio' : 'desde-segundo-anio';
  const meses = Array.from({ length: maximoMeses / paso + 1 }, (_, i) => i * paso);
  return {
    series: [
      {
        clave: 'demora',
        etiqueta: 'Porcentaje adicional',
        puntos: meses.map((m, i) => ({
          anio: i,
          valor: porcentajeAdicional(reglas, tiempoDemora(reglas, m, fraccion)),
        })),
      },
    ],
    etiquetasX: meses.map((m) => formatearDuracion(m)),
    fuentes: unDato('jubilacion-demora-reglas'),
  };
}
