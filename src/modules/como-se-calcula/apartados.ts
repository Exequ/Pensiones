import type { EntradaIndice } from '../../components/anclas';
import { ESQUEMAS } from './esquemas';

export const ID_TERMINOS = 'como-terminos';

/** Título del apartado de términos: el mismo texto pinta su `<h2>` y su entrada en el índice. */
export const TITULO_TERMINOS = 'Los términos de esta página';

/** Entradas del índice «En esta página»: los términos y una por prestación, con su resumen. */
export const INDICE: readonly EntradaIndice[] = [
  {
    destino: `${ID_TERMINOS}-titulo`,
    titulo: TITULO_TERMINOS,
    resumen: 'Qué significa cada palabra.',
  },
  ...ESQUEMAS.map((e) => ({
    destino: `como-${e.ancla}-titulo`,
    titulo: e.titulo,
    resumen: e.resumen,
  })),
];
