import type { EntradaIndice } from '../../components/anclas';
import { apartadoEnlaceFinanciero } from '../proyecciones/apartados';

/**
 * Apartados de la página: el mismo texto pinta el encabezado (`<h2>`) y su entrada en el índice
 * «En esta página». Sin cifras.
 */
export const APARTADOS = {
  ejecucion: { destino: 'ejecucion', titulo: 'Ingresos, gastos y gasto en pensiones' },
  saldos: { destino: 'saldos', titulo: 'Déficit y saldo: definiciones disponibles' },
  gastoPib: {
    destino: 'gasto-pib',
    titulo: 'El gasto en pensiones sobre el PIB: varias formas de medirlo',
  },
} as const satisfies Record<string, EntradaIndice>;

export const INDICE: readonly EntradaIndice[] = [
  ...Object.values(APARTADOS),
  apartadoEnlaceFinanciero('financiacion'),
];
