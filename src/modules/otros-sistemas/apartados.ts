import type { EntradaIndice } from '../../components/anclas';

/**
 * Apartados de la página: el mismo texto pinta el encabezado (`<h2>`) y su entrada en el índice
 * «En esta página». Sin cifras.
 */
export const APARTADOS = {
  comparar: {
    destino: 'comparar',
    titulo: 'Qué países se comparan y por qué no son directamente comparables',
  },
  gasto: { destino: 'gasto', titulo: 'Gasto público en pensiones sobre el PIB' },
  edad: { destino: 'edad', titulo: 'Edad de jubilación' },
  reposicion: { destino: 'reposicion', titulo: 'Tasa de reposición teórica' },
  estructura: { destino: 'estructura', titulo: 'Cómo se organizan los sistemas' },
} as const satisfies Record<string, EntradaIndice>;

export const INDICE: readonly EntradaIndice[] = Object.values(APARTADOS);
