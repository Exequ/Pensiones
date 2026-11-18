import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Dato } from '../engine/esquema-datos';
import { SourceLine } from './SourceLine';

const DATO: Dato = {
  value: 1,
  unit: 'u',
  period: '2024',
  source: { title: 'Documento A', publisher: 'Organismo A', url: 'https://example.org/a' },
  fetchedAt: '2024-05-01T10:00:00Z',
  confidence: 'alta',
};

const OTRO: Dato = {
  ...DATO,
  source: {
    title: 'Documento B',
    publisher: 'Organismo B',
    url: 'https://example.org/b',
    docId: 'ID-B',
  },
  fetchedAt: '2024-06-02',
  confidence: 'media',
};

const FECHA_O_CONFIANZA = /descargad|confianza|2024-05-01|2024-06-02|\balta\b|\bmedia\b/i;

describe('SourceLine cerrada', () => {
  it('con una fuente muestra «Fuente» como botón y no la abre', () => {
    render(<SourceLine datos={DATO} />);
    const boton = screen.getByRole('button', { name: 'Fuente' });
    expect(boton).toHaveAttribute('aria-haspopup', 'dialog');
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(screen.queryByRole('link')).toBeNull();
  });

  it('con varias fuentes muestra «Fuentes»; las repetidas cuentan una vez', () => {
    render(<SourceLine datos={[DATO, DATO]} />);
    expect(screen.getByRole('button', { name: 'Fuente' })).toBeInTheDocument();
    render(<SourceLine datos={[DATO, DATO, OTRO]} />);
    expect(screen.getByRole('button', { name: 'Fuentes' })).toBeInTheDocument();
  });

  it('no pinta nada si no hay datos', () => {
    const { container } = render(<SourceLine datos={[]} />);
    expect(container).toBeEmptyDOMElement();
  });

  it('sin abrir muestra la naturaleza cuando existe y no muestra fecha ni confianza', () => {
    const { container } = render(
      <SourceLine datos={[{ ...DATO, naturaleza: 'proyeccion-de-modelo' }]} />,
    );
    expect(container).toHaveTextContent('Fuente');
    expect(container).toHaveTextContent('naturaleza: proyección de modelo propio');
    expect(container.textContent).not.toMatch(FECHA_O_CONFIANZA);
  });

  it('sin naturaleza en el dato no muestra «naturaleza»', () => {
    const { container } = render(<SourceLine datos={DATO} />);
    expect(container.textContent).not.toMatch(/naturaleza/);
  });

  it('con varias naturalezas las muestra todas, sin repetir', () => {
    const { container } = render(
      <SourceLine
        datos={[
          { ...DATO, naturaleza: 'observado' },
          { ...OTRO, naturaleza: 'proyeccion-publicada' },
          { ...OTRO, naturaleza: 'observado' },
        ]}
      />,
    );
    expect(container).toHaveTextContent(
      'naturaleza: observado; proyección publicada por la fuente',
    );
  });

  it('con título, el nombre accesible es único y contiene la palabra visible', () => {
    render(
      <>
        <SourceLine datos={DATO} titulo="Gráfico uno" />
        <SourceLine datos={DATO} titulo="Gráfico dos" />
      </>,
    );
    const uno = screen.getByRole('button', { name: 'Fuente: Gráfico uno' });
    const dos = screen.getByRole('button', { name: 'Fuente: Gráfico dos' });
    expect(uno).not.toBe(dos);
    expect(uno).toHaveTextContent('Fuente');
  });
});

describe('SourceLine abierta', () => {
  it('muestra título (enlace), organismo e identificador del documento', async () => {
    render(<SourceLine datos={[DATO, OTRO]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fuentes' }));
    const dialogo = screen.getByRole('dialog');
    expect(screen.getByRole('button', { name: 'Fuentes' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
    expect(within(dialogo).getByRole('link', { name: 'Documento A' })).toHaveAttribute(
      'href',
      'https://example.org/a',
    );
    expect(within(dialogo).getByRole('link', { name: 'Documento B' })).toHaveAttribute(
      'href',
      'https://example.org/b',
    );
    expect(dialogo).toHaveTextContent('Organismo A');
    expect(dialogo).toHaveTextContent('Organismo B');
    expect(dialogo).toHaveTextContent('Identificador del documento');
    expect(dialogo).toHaveTextContent('ID-B');
  });

  it('el diálogo lleva nombre accesible y repite el título si lo hay', async () => {
    render(<SourceLine datos={DATO} titulo="Gráfico uno" />);
    await userEvent.click(screen.getByRole('button', { name: 'Fuente: Gráfico uno' }));
    expect(screen.getByRole('dialog', { name: 'Fuente: Gráfico uno' })).toBeInTheDocument();
  });

  it('no muestra fecha de descarga ni confianza, ni en el texto ni en atributos', async () => {
    const { container } = render(
      <SourceLine datos={[DATO, { ...OTRO, naturaleza: 'derivado' }]} titulo="Un gráfico" />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fuentes: Un gráfico' }));
    expect(container.textContent).not.toMatch(FECHA_O_CONFIANZA);
    for (const el of container.querySelectorAll('[aria-label],[title],[alt],time')) {
      expect(el.getAttribute('aria-label') ?? '').not.toMatch(FECHA_O_CONFIANZA);
      expect(el.getAttribute('title')).toBeNull();
      expect(el.tagName).not.toBe('TIME');
    }
  });

  it('muestra la naturaleza del dato dentro del desplegable', async () => {
    render(<SourceLine datos={[{ ...DATO, naturaleza: 'proyeccion-de-modelo' }]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fuente' }));
    expect(screen.getByRole('dialog')).toHaveTextContent('Naturaleza');
    expect(screen.getByRole('dialog')).toHaveTextContent('proyección de modelo propio');
  });

  it('muestra la cita y la ubicación solo si el dato las lleva', async () => {
    const { rerender } = render(<SourceLine datos={DATO} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fuente' }));
    expect(screen.getByRole('dialog').textContent).not.toMatch(/Cita|Ubicación/);
    await userEvent.keyboard('{Escape}');

    rerender(
      <SourceLine
        datos={[
          { ...DATO, quote: 'Texto citado.', location: 'artículo 3' },
          { ...DATO, quote: 'Texto citado.', location: 'artículo 3' },
          { ...DATO, quote: 'Solo cita.' },
        ]}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fuente' }));
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toHaveTextContent('Texto citado.');
    expect(dialogo).toHaveTextContent('artículo 3');
    expect(dialogo).toHaveTextContent('Solo cita.');
    // La cita repetida se muestra una sola vez.
    expect(dialogo.textContent.split('Texto citado.').length - 1).toBe(1);
    // Una única fuente, aunque tenga varias citas.
    expect(within(dialogo).getAllByRole('link')).toHaveLength(1);
  });
});

describe('SourceLine: teclado y foco', () => {
  it('se abre con Intro y con Espacio, y el foco entra en el desplegable', async () => {
    render(<SourceLine datos={DATO} />);
    const boton = screen.getByRole('button', { name: 'Fuente' });
    boton.focus();
    await userEvent.keyboard('{Enter}');
    const dialogo = screen.getByRole('dialog');
    expect(dialogo).toContainElement(document.activeElement as HTMLElement);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton).toHaveFocus();

    await userEvent.keyboard(' ');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('Esc cierra y el foco vuelve al botón', async () => {
    render(<SourceLine datos={DATO} />);
    const boton = screen.getByRole('button', { name: 'Fuente' });
    await userEvent.click(boton);
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(boton).toHaveFocus();
  });

  it('el botón «Cerrar» cierra y el foco vuelve al botón', async () => {
    render(<SourceLine datos={DATO} />);
    const boton = screen.getByRole('button', { name: 'Fuente' });
    await userEvent.click(boton);
    await userEvent.click(screen.getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton).toHaveFocus();
  });

  it('un clic fuera (en el fondo del diálogo) cierra; un clic dentro no', async () => {
    render(<SourceLine datos={DATO} />);
    const boton = screen.getByRole('button', { name: 'Fuente' });
    await userEvent.click(boton);
    const dialogo = screen.getByRole('dialog');
    await userEvent.click(within(dialogo).getByText('Organismo A'));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    await userEvent.click(dialogo);
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton).toHaveFocus();
  });

  it('Tab y Mayús+Tab cierran el circuito: el foco no sale del desplegable', async () => {
    render(<SourceLine datos={[DATO, OTRO]} />);
    await userEvent.click(screen.getByRole('button', { name: 'Fuentes' }));
    const dialogo = screen.getByRole('dialog');
    const cerrar = within(dialogo).getByRole('button', { name: 'Cerrar' });
    const ultimo = within(dialogo).getByRole('link', { name: 'Documento B' });
    expect(cerrar).toHaveFocus();
    await userEvent.tab({ shift: true });
    expect(ultimo).toHaveFocus();
    await userEvent.tab();
    expect(cerrar).toHaveFocus();
    await userEvent.tab();
    expect(within(dialogo).getByRole('link', { name: 'Documento A' })).toHaveFocus();
  });

  it('solo hay un desplegable abierto a la vez', async () => {
    render(
      <>
        <SourceLine datos={DATO} titulo="Uno" />
        <SourceLine datos={OTRO} titulo="Dos" />
      </>,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Fuente: Uno' }));
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    // En el navegador el modal vuelve inerte el resto; aquí se fuerza la apertura de la segunda.
    screen.getByRole('button', { name: 'Fuente: Dos' }).click();
    await screen.findByRole('dialog', { name: 'Fuente: Dos' });
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
    expect(screen.getByRole('button', { name: 'Fuente: Uno' })).toHaveAttribute(
      'aria-expanded',
      'false',
    );
  });
});
