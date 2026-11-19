import type { EntradaIndice } from '../../components/anclas';
import { ID_LINEA, TITULO_LINEA } from './LineaDelTiempo';

/**
 * Apartados de la página: el mismo texto pinta el encabezado (`<h2>`) y su entrada en el índice
 * «En esta página». Las fichas de cada norma tienen su propio índice, la línea del tiempo.
 */
export const APARTADOS = {
  alcance: { destino: 'ref-alcance-titulo', titulo: 'Qué recoge la cronología' },
  linea: { destino: `${ID_LINEA}-titulo`, titulo: TITULO_LINEA },
  graficos: { destino: 'ref-graficos-titulo', titulo: 'Parámetros a lo largo del tiempo' },
} as const satisfies Record<string, EntradaIndice>;

export const INDICE: readonly EntradaIndice[] = Object.values(APARTADOS);
