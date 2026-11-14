/**
 * Neutralidad verificable (regla c de CLAUDE.md): el texto renderizado de las páginas «Hucha»,
 * «Financiación y déficit» y «Cotizantes y pensionistas», incluidas las citas de fuentes y las
 * tablas de datos, no usa palabras de valoración (lista en `scripts/lib/valoraciones.ts`). Si una cita literal de una fuente
 * contuviera una de ellas, el test fallaría y habría que decidir si se muestra.
 */
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { valoracionesEn } from '../../../scripts/lib/valoraciones.ts';
import Cotizantes from '../cotizantes-y-pensionistas/Pagina';
import Financiacion from '../financiacion-y-deficit/Pagina';
import Hucha from '../hucha/Pagina';

describe.each([
  { nombre: 'Hucha', Pagina: Hucha },
  { nombre: 'Financiación y déficit', Pagina: Financiacion },
  { nombre: 'Cotizantes y pensionistas', Pagina: Cotizantes },
])('neutralidad de la página «$nombre»', ({ Pagina }) => {
  it('el texto renderizado no contiene palabras de valoración', () => {
    const { container } = render(
      <MemoryRouter>
        <Pagina />
      </MemoryRouter>,
    );
    expect(container.textContent.length).toBeGreaterThan(1000);
    expect(valoracionesEn(container.textContent)).toEqual([]);
  });
});
