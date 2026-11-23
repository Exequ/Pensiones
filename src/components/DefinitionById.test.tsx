/**
 * Fase R7: `DefinitionById` pinta una definición del módulo por su id (término, explicación,
 * perímetro, criterio, fórmula con leyenda y «Fuentes» con la cita de los datos) y falla de forma
 * clara con un id inexistente o con una referencia sin fuente.
 */
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { definicionPorId, DEFINICIONES } from '../contenido/definiciones';
import { anclaDefinicion } from '../engine/definiciones';
import { Dato } from '../engine/esquema-datos';
import { abrirFuente } from '../test/fuentes';
import { DefinitionById } from './DefinitionById';
import type { DatoRotulado } from './fuentes';

/** Dato ficticio con cita, para no depender de los ficheros de una página. */
const dato = (ref: string): DatoRotulado => ({
  ...Dato.parse({
    value: 'valor',
    unit: 'texto',
    period: '2025',
    source: { title: `Fuente de ${ref}`, publisher: 'Organismo', url: 'https://example.org/' },
    fetchedAt: '2026-11-11',
    confidence: 'alta',
    quote: `Cita de ${ref}`,
  }),
  rotulo: 'Se refiere a la prueba',
});

describe('DefinitionById', () => {
  it('pinta el término, la explicación, el perímetro, el criterio y «Fuentes» con las citas', () => {
    const d = definicionPorId('gasto-pensiones-esspros-vejez');
    const { container } = render(<DefinitionById id={d.id} fuentes={dato} />);
    expect(container.querySelector(`#${anclaDefinicion(d.id)}`)).not.toBeNull();
    expect(container.querySelector('dfn')?.textContent).toBe(d.termino);
    for (const p of d.texto) expect(container.textContent).toContain(p);
    expect(container.textContent).toContain('Incluye');
    expect(container.textContent).toContain('No incluye');
    expect(container.textContent).toContain('Sin detalle en las fuentes');
    expect(container.textContent).toContain(d.criterio);
    // Sin abrir, la cita no se ve.
    expect(container.textContent).not.toContain(`Cita de ${d.datos[0]}`);
    const boton = screen.getByRole('button', { name: `Fuente: Definición: ${d.termino}` });
    const linea = abrirFuente(boton.closest('.linea-fuente'));
    expect(linea.textContent).toContain(`Cita de ${d.datos[0]}`);
    expect(linea.textContent).toContain('Se refiere a la prueba');
  });

  it('pinta la fórmula con su leyenda cuando la definición es un cálculo propio', () => {
    const d = definicionPorId('saldo-presupuestario-no-financiero');
    const { container } = render(<DefinitionById id={d.id} fuentes={dato} />);
    const figura = container.querySelector('figure.formula');
    expect(figura).not.toBeNull();
    expect(within(figura as HTMLElement).getByRole('math', { name: /menos/ })).toBeTruthy();
    expect(figura?.textContent).toContain('Qué significa cada símbolo');
    for (const s of d.formula?.simbolos ?? []) expect(figura?.textContent).toContain(s.nombre);
    expect(figura?.textContent).not.toMatch(/\d/);
  });

  it('puede omitir la fórmula', () => {
    const { container } = render(
      <DefinitionById id="saldo-presupuestario-no-financiero" fuentes={dato} sinFormula />,
    );
    expect(container.querySelector('figure.formula')).toBeNull();
  });

  it('pinta todas las definiciones del módulo sin cifras escritas', () => {
    for (const d of DEFINICIONES) {
      const { container, unmount } = render(<DefinitionById id={d.id} fuentes={dato} />);
      expect(container.textContent.replace(/Fuentes?/g, ''), d.id).not.toMatch(/\d/);
      unmount();
    }
  });

  it('falla de forma clara con un id inexistente', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() => render(<DefinitionById id="no-existe" fuentes={dato} />)).toThrow(
      /Definición desconocida: «no-existe»\. Ids válidos:/,
    );
    error.mockRestore();
  });

  it('falla si la página no da la fuente de una referencia', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    expect(() =>
      render(<DefinitionById id="saldo-presupuestario-total" fuentes={() => undefined} />),
    ).toThrow(/Definición «saldo-presupuestario-total»: falta la fuente de/);
    error.mockRestore();
  });
});
