import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { TechnicalDetail } from './TechnicalDetail';

describe('TechnicalDetail', () => {
  it('está plegado por defecto: botón con aria-expanded y región asociada', () => {
    render(
      <TechnicalDetail titulo="Cómo se calcula">
        <p>Contenido técnico</p>
      </TechnicalDetail>,
    );
    const boton = screen.getByRole('button', { name: 'Cómo se calcula' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton.closest('h3')).not.toBeNull();
    const region = document.getElementById(boton.getAttribute('aria-controls') ?? '');
    expect(region).not.toBeVisible();
    expect(screen.queryByText('Contenido técnico')).toBeNull();
  });

  it('se despliega y se pliega con clic y con teclado, y la región se nombra con el título', async () => {
    const usuario = userEvent.setup();
    render(
      <TechnicalDetail titulo="Detalle" nivel={4}>
        <p>Contenido técnico</p>
      </TechnicalDetail>,
    );
    const boton = screen.getByRole('button', { name: 'Detalle' });
    expect(boton.closest('h4')).not.toBeNull();
    await usuario.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: 'Detalle' })).toHaveTextContent('Contenido técnico');
    boton.focus();
    await usuario.keyboard('{Enter}');
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    await usuario.keyboard(' ');
    expect(boton).toHaveAttribute('aria-expanded', 'true');
  });

  it('admite empezar desplegado', () => {
    render(
      <TechnicalDetail titulo="Abierto" abiertoInicial>
        <p>Visible</p>
      </TechnicalDetail>,
    );
    expect(screen.getByText('Visible')).toBeVisible();
  });
});
