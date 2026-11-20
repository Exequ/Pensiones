/**
 * Ayudantes de prueba de las cajas «Interpretación» (fase RI). Las cajas se identifican por el
 * componente (atributo `data-interpretacion` de `InterpretationBox`), nunca por su texto.
 */
import { SELECTOR_INTERPRETACION } from '../components/InterpretationBox';

/**
 * Texto de un elemento sin el contenido de las cajas «Interpretación»: es el que recorren las pruebas
 * de valoraciones y de veredictos. Fuera de las cajas, esas pruebas se aplican igual que siempre.
 */
export function textoSinInterpretaciones(raiz: Element): string {
  const copia = raiz.cloneNode(true) as Element;
  for (const caja of copia.querySelectorAll(SELECTOR_INTERPRETACION)) caja.remove();
  return copia.textContent;
}

/** Cajas «Interpretación» de un elemento. */
export function cajasEn(raiz: ParentNode): HTMLElement[] {
  return [...raiz.querySelectorAll<HTMLElement>(SELECTOR_INTERPRETACION)];
}

/**
 * Problemas de orden: cada caja tiene que ir DESPUÉS, en el orden del documento, del elemento que
 * interpreta (el de id `data-interpreta`), sin estar dentro de él ni contenerlo; nunca antes ni sola.
 */
export function problemasDeOrden(raiz: ParentNode): string[] {
  const doc = (raiz as Node).ownerDocument ?? (raiz as Document);
  const problemas: string[] = [];
  for (const caja of cajasEn(raiz)) {
    const id = caja.getAttribute('data-interpreta') ?? '';
    const ancla = id === '' ? null : doc.getElementById(id);
    const nombre = caja.getAttribute('data-interpretacion') ?? '';
    if (ancla === null) {
      problemas.push(`${nombre}: no existe el elemento interpretado «${id}»`);
      continue;
    }
    if (ancla.contains(caja) || caja.contains(ancla)) {
      problemas.push(`${nombre}: la caja y el elemento interpretado se contienen`);
      continue;
    }
    if (!(ancla.compareDocumentPosition(caja) & Node.DOCUMENT_POSITION_FOLLOWING))
      problemas.push(`${nombre}: la caja va antes del elemento que interpreta`);
  }
  return problemas;
}
