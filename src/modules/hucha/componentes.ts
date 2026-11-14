import type { ComponentePosicion } from '../../engine/transferencias';

/** Rótulo y color (índice categórico) de cada componente. */
export const COMPONENTE: Readonly<Record<ComponentePosicion, { etiqueta: string; color: number }>> =
  {
    fondo: { etiqueta: 'Fondo de Reserva', color: 1 },
    deuda: { etiqueta: 'Deuda con el Estado', color: 2 },
    transferencias: { etiqueta: 'Transferencias acumuladas', color: 3 },
  };
