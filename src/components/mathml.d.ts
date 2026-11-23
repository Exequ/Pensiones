/**
 * Elementos MathML que usa `Formula`. React los crea en el espacio de nombres de MathML y el
 * navegador los dibuja de forma nativa, sin librerías.
 */
import type { Attributes, HTMLAttributes } from 'react';

type AtributosMath = Attributes &
  HTMLAttributes<Element> & {
    display?: 'block' | 'inline';
    mathvariant?: 'normal' | 'italic';
    stretchy?: boolean;
    fence?: boolean;
    separator?: boolean;
    form?: 'prefix' | 'infix' | 'postfix';
    lspace?: string;
    rspace?: string;
    linethickness?: string;
  };

declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      math: AtributosMath;
      mrow: AtributosMath;
      mi: AtributosMath;
      mn: AtributosMath;
      mo: AtributosMath;
      mfrac: AtributosMath;
      msub: AtributosMath;
      munderover: AtributosMath;
      mtext: AtributosMath;
    }
  }
}
