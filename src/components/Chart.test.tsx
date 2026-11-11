import { render, screen, within } from '@testing-library/react';
import * as Plot from '@observablehq/plot';
import { describe, expect, it } from 'vitest';
import { Chart } from './Chart';
import { aplicarEstiloCasa, formatoEje, token } from './estiloGrafico';

describe('estilo de la casa', () => {
  it('usa tokens y formato es-ES', () => {
    expect(token('acento')).toBe('var(--color-acento)');
    expect(formatoEje(1680)).toBe('1.680');
    expect(formatoEje(0.25)).toBe('0,25');
    expect(formatoEje('25 años')).toBe('25 años');
    const opciones = aplicarEstiloCasa({ marks: [] }, 500, 200);
    expect(opciones.width).toBe(500);
    expect(opciones.height).toBe(200);
    expect(opciones.style).toMatchObject({
      background: 'transparent',
      color: 'var(--color-tinta)',
    });
  });
});

describe('Chart', () => {
  it('pinta figure, figcaption, SVG accesible y tabla alternativa', () => {
    const datos = [
      { x: 'A', y: 1 },
      { x: 'B', y: 2 },
    ];
    render(
      <Chart
        titulo="Gráfico de prueba"
        descripcion="Unidades de prueba"
        opciones={() => ({ marks: [Plot.barY(datos, { x: 'x', y: 'y' })] })}
        tabla={{
          columnas: [
            { clave: 'x', titulo: 'Categoría' },
            { clave: 'y', titulo: 'Valor', tipo: 'numero' },
          ],
          filas: datos,
        }}
        nota="Datos ficticios."
      />,
    );
    const figura = screen.getByRole('figure');
    expect(figura.querySelector('figcaption')).toHaveTextContent(
      'Gráfico de pruebaUnidades de prueba',
    );
    expect(within(figura).getByRole('img', { name: 'Gráfico de prueba' }).tagName).toBe('svg');
    expect(within(figura).getByRole('table', { hidden: true })).toBeInTheDocument();
    expect(within(figura).getByText('Ver los datos del gráfico en una tabla')).toBeInTheDocument();
    expect(within(figura).getByText('Datos ficticios.')).toBeInTheDocument();
  });
});
