import type { EntradaIndice } from '../../components/anclas';

/**
 * Apartados de la página: el mismo texto pinta el encabezado (`<h2>`) y su entrada en el índice
 * «En esta página». Sin cifras.
 */
export const APARTADOS = {
  panorama: { destino: 'panorama', titulo: 'Cuántas pensiones hay de cada tipo' },
  fichas: { destino: 'fichas', titulo: 'Las prestaciones, una a una' },
  complementos: {
    destino: 'complementos',
    titulo: 'Complementos por hijos: cuántas pensiones los llevan y dónde',
  },
} as const satisfies Record<string, EntradaIndice>;

export const INDICE: readonly EntradaIndice[] = Object.values(APARTADOS);
