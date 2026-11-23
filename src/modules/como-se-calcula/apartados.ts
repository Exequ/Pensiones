import type { EntradaIndice } from '../../components/anclas';
import { DESTINO_MODALIDADES, ID_MODALIDADES, TITULO_MODALIDADES } from './anclas-modalidades';
import { ESQUEMAS } from './esquemas';

export { DESTINO_MODALIDADES, ID_MODALIDADES, TITULO_MODALIDADES };

export const ID_TERMINOS = 'como-terminos';

/** Título del apartado de términos: el mismo texto pinta su `<h2>` y su entrada en el índice. */
export const TITULO_TERMINOS = 'Los términos de esta página';

/** Resumen de una frase del apartado de modalidades para el índice. */
export const RESUMEN_MODALIDADES =
  'Anticipada, demorada, activa, flexible y parcial: qué exige cada una, cómo se calcula y cuánto cambia la pensión al adelantar o retrasar la jubilación.';

/** `id` del encabezado de una lectura abierta de una sección, destino de los enlaces a ella. */
export const idLectura = (motor: string, lectura: string): string =>
  `como-${motor}-lectura-${lectura.replace(/\W+/g, '-').toLowerCase()}`;

/** `id` del encabezado de la tabla del efecto de adelantar o retrasar la jubilación. */
export const DESTINO_EFECTO_MESES = 'como-efecto-meses-titulo';

/**
 * Entradas del índice «En esta página»: los términos, una por prestación con su resumen y, tras la
 * jubilación, sus modalidades.
 */
export const INDICE: readonly EntradaIndice[] = [
  {
    destino: `${ID_TERMINOS}-titulo`,
    titulo: TITULO_TERMINOS,
    resumen: 'Qué significa cada palabra.',
  },
  ...ESQUEMAS.flatMap((e): EntradaIndice[] => [
    { destino: `como-${e.ancla}-titulo`, titulo: e.titulo, resumen: e.resumen },
    ...(e.id === 'jubilacion'
      ? [
          {
            destino: DESTINO_MODALIDADES,
            titulo: TITULO_MODALIDADES,
            resumen: RESUMEN_MODALIDADES,
          },
        ]
      : []),
  ]),
];
