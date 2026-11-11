import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import DesignLab from './DesignLab';
import { MUESTRA } from './muestra';

describe('laboratorio de diseño', () => {
  it('declara explícitamente que sus datos son ficticios', () => {
    expect(MUESTRA.ficticio).toBe(true);
    expect(MUESTRA.aviso).toMatch(/FICTICIOS/);
  });

  it('el selector de años cambia el porcentaje de la frase', async () => {
    render(
      <MemoryRouter>
        <DesignLab />
      </MemoryRouter>,
    );
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      '¿De qué depende la cuantía de una pensión de jubilación?',
    );
    const resultado = screen.getByRole('status');
    const antes = resultado.textContent;
    await userEvent.click(screen.getByRole('radio', { name: '25' }));
    expect(resultado.textContent).not.toBe(antes);
    expect(screen.getByRole('combobox', { name: 'Años cotizados' })).toHaveValue('25');
  });
});
