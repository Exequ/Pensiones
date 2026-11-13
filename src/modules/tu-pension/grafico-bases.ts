/**
 * Datos del gráfico de bases del periodo de cálculo: de `basesPeriodo` del motor a filas con el
 * estado del mes en texto («Se suma», «Se descarta», «Laguna integrada»). No calcula nada: solo
 * etiqueta lo que el motor ya devuelve.
 */
import type { BasesPeriodoCalculo } from '../../engine/jubilacion/tipos';
import { TEXTOS } from './textos';
import { mesAbsoluto, nombreDeMes } from './tramos';

export type EstadoMes =
  'se-suma' | 'se-descarta' | 'laguna-integrada' | 'laguna-descartada' | 'previo-al-alta';

export const ETIQUETA_ESTADO: Record<EstadoMes, string> = {
  'se-suma': TEXTOS.graficoUsada,
  'se-descarta': TEXTOS.graficoDescartada,
  'laguna-integrada': TEXTOS.graficoLaguna,
  'laguna-descartada': TEXTOS.graficoLagunaDescartada,
  'previo-al-alta': TEXTOS.graficoPrevioAlta,
};

export interface FilaBases {
  /** Mes en texto («marzo de 2010»). */
  readonly mes: string;
  readonly estado: string;
  readonly baseNominal: number;
  readonly factor: number;
  readonly baseActualizada: number;
  /** Primer día del mes (UTC), para el eje del tiempo. */
  readonly fecha: Date;
  readonly clave: EstadoMes;
}

function claveDeEstado(tipo: string, usado: boolean): EstadoMes {
  if (tipo === 'laguna-integrada') return usado ? 'laguna-integrada' : 'laguna-descartada';
  if (tipo === 'previo-al-alta-ignorado') return 'previo-al-alta';
  return usado ? 'se-suma' : 'se-descarta';
}

/** Una fila por mes de la ventana, del más antiguo al más reciente. */
export function filasGraficoBases(bases: BasesPeriodoCalculo): readonly FilaBases[] {
  return bases.meses.map((m) => {
    const [anio = 0, mes = 1] = m.mes.split('-').map(Number);
    const clave = claveDeEstado(m.tipo, m.usado);
    return {
      mes: nombreDeMes(mesAbsoluto(anio, mes)),
      estado: ETIQUETA_ESTADO[clave],
      baseNominal: m.baseNominal,
      factor: m.factor,
      baseActualizada: m.baseActualizada,
      fecha: new Date(Date.UTC(anio, mes - 1, 1)),
      clave,
    };
  });
}
