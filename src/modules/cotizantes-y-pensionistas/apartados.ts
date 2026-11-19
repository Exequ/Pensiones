import type { EntradaIndice } from '../../components/anclas';

/**
 * Apartados de la página: el mismo texto pinta el encabezado (`<h2>`) y su entrada en el índice
 * «En esta página». Sin cifras.
 */
export const APARTADOS = {
  evolucion: {
    destino: 'evolucion',
    titulo: 'Afiliados, pensiones y pensionistas a lo largo del tiempo',
  },
  pensionMedia: { destino: 'pension-media', titulo: 'Pensión media por clase' },
  relacion: {
    destino: 'relacion',
    titulo: 'Afiliados por pensión y por pensionista: varias formas de medirlo',
  },
  situacion: { destino: 'situacion', titulo: 'Situación actual: clase, sexo y edad' },
  altasBajas: { destino: 'altas-bajas', titulo: 'Altas y bajas de pensiones' },
} as const satisfies Record<string, EntradaIndice>;

export const INDICE: readonly EntradaIndice[] = Object.values(APARTADOS);
