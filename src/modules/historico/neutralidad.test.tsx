/**
 * Neutralidad verificable (regla c de CLAUDE.md): el texto renderizado de las páginas «Hucha»,
 * «Financiación y déficit», «Cotizantes y pensionistas» y «Proyecciones» (Fase 5-B1, y su bloque financiero de la Fase 5-B2), «Otros sistemas» y «Tipos de pensión» (Fase 5-C), incluidas las citas de fuentes y las
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
import Financiero from '../proyecciones/Financiero';
import OtrosSistemas from '../otros-sistemas/Pagina';
import Proyecciones from '../proyecciones/Pagina';
import TiposDePension from '../tipos-de-pension/Pagina';

describe.each([
  { nombre: 'Hucha', Pagina: Hucha },
  { nombre: 'Financiación y déficit', Pagina: Financiacion },
  { nombre: 'Cotizantes y pensionistas', Pagina: Cotizantes },
  { nombre: 'Proyecciones', Pagina: Proyecciones },
  { nombre: 'Otros sistemas', Pagina: OtrosSistemas },
  { nombre: 'Tipos de pensión', Pagina: TiposDePension },
  // El bloque financiero se carga bajo demanda y no está en el primer renderizado de la página.
  { nombre: 'Proyecciones: bloque «Sistema financiero (M4)»', Pagina: Financiero },
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
