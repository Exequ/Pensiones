import type { EntradaIndice } from '../../components/anclas';
import { ANCLA_FINANCIERO } from './ids-financiero';
import { MODELO } from './ids-datos';

/**
 * Apartados de la página: el mismo texto pinta el encabezado (`<h2>`) y su entrada en el índice
 * «En esta página». Sin cifras escritas a mano (el nombre de cada modelo sale de `MODELO`).
 */
export const APARTADOS = {
  queEs: { destino: 'proy-que-es', titulo: 'Qué es una proyección de esta página' },
  demografia: { destino: 'proy-demografia', titulo: `Demografía (modelo ${MODELO.m1})` },
  pensiones: { destino: 'proy-pensiones', titulo: `Pensiones en vigor (modelo ${MODELO.m3})` },
  cotizantes: { destino: 'proy-cotizantes', titulo: `Cotizantes y bases (modelo ${MODELO.m2})` },
  financiero: { destino: ANCLA_FINANCIERO, titulo: `Sistema financiero (modelo ${MODELO.m4})` },
} as const satisfies Record<string, EntradaIndice>;

export const INDICE: readonly EntradaIndice[] = Object.values(APARTADOS);

/** Encabezado del bloque que enlaza con el sistema financiero desde «Hucha» y «Financiación y déficit». */
export function apartadoEnlaceFinanciero(origen: 'hucha' | 'financiacion'): EntradaIndice {
  return {
    destino: `enlace-financiero-${origen}`,
    titulo: 'Lo que calcula un modelo con estos mismos conceptos',
  };
}
