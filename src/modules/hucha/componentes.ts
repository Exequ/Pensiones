import type { ComponentePosicion } from '../../engine/transferencias';
import type { ComponenteGrafico } from './GraficoPosicion';

/** Rótulo y color (índice categórico) de cada componente. */
export const COMPONENTE: Readonly<Record<ComponentePosicion, { etiqueta: string; color: number }>> =
  {
    fondo: { etiqueta: 'Fondo de Reserva', color: 1 },
    deuda: { etiqueta: 'Deuda con el Estado', color: 2 },
    transferencias: { etiqueta: 'Transferencias acumuladas', color: 3 },
  };

/** Componente de gráfico de cada partida; las transferencias dependen del año de inicio elegido. */
export function componenteGrafico(
  clave: ComponentePosicion,
  anioInicio: number,
): ComponenteGrafico {
  const { etiqueta, color } = COMPONENTE[clave];
  return {
    clave,
    etiqueta,
    color,
    columnaTabla:
      clave === 'transferencias'
        ? `${etiqueta} desde ${anioInicio} (millones de euros)`
        : `${etiqueta} (millones de euros)`,
  };
}
