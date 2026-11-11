import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { TEXTO_BANNER_DESARROLLO } from '../config';
import type { Dato } from '../engine/esquema-datos';
import { SECCIONES } from '../modules/secciones';
import { DataTable } from './DataTable';
import { Definition } from './Definition';
import { DevBanner } from './DevBanner';
import { Footer } from './Footer';
import { Header } from './Header';
import { InteractiveSentence, SentenceSelect, SentenceValue } from './InteractiveSentence';
import { Kicker } from './Kicker';
import { Lead } from './Lead';
import { MarginNote } from './MarginNote';
import { SegmentedPills } from './SegmentedPills';
import { SourceLine } from './SourceLine';

const NBSP = ' ';

const DATO: Dato = {
  value: 1,
  unit: 'u',
  period: '2024',
  source: { title: 'Documento A', publisher: 'Organismo A', url: 'https://example.org/a' },
  fetchedAt: '2024-05-01T10:00:00Z',
  confidence: 'alta',
};

describe('DevBanner', () => {
  it('muestra el aviso de desarrollo y se puede ocultar', () => {
    const { rerender } = render(<DevBanner visible />);
    expect(screen.getByRole('note')).toHaveTextContent(TEXTO_BANNER_DESARROLLO);
    rerender(<DevBanner visible={false} />);
    expect(screen.queryByRole('note')).toBeNull();
  });
});

describe('Header', () => {
  it('enlaza todas las secciones y abre el menú móvil', async () => {
    render(
      <MemoryRouter initialEntries={['/reformas']}>
        <Header />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Secciones' });
    expect(within(nav).getAllByRole('link')).toHaveLength(SECCIONES.length);
    expect(within(nav).getByRole('link', { name: 'Reformas' })).toHaveAttribute(
      'aria-current',
      'page',
    );
    const boton = screen.getByRole('button', { name: 'Menú' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    await userEvent.click(boton);
    expect(screen.getByRole('button', { name: 'Cerrar' })).toHaveAttribute('aria-expanded', 'true');
    await userEvent.keyboard('{Escape}');
    expect(screen.getByRole('button', { name: 'Menú' })).toHaveAttribute('aria-expanded', 'false');
  });

  it('no enlaza el laboratorio de diseño', () => {
    render(
      <MemoryRouter>
        <Header />
        <Footer />
      </MemoryRouter>,
    );
    const destinos = screen.getAllByRole('link').map((a) => a.getAttribute('href'));
    expect(destinos.some((d) => d?.includes('diseno'))).toBe(false);
  });
});

describe('Footer', () => {
  it('enlaza Metodología, Fuentes y Registro de cambios', () => {
    render(
      <MemoryRouter>
        <Footer />
      </MemoryRouter>,
    );
    const nav = screen.getByRole('navigation', { name: 'Sobre esta web' });
    expect(
      within(nav)
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(['Metodología', 'Fuentes', 'Registro de cambios']);
  });
});

describe('Kicker, Lead, Definition y MarginNote', () => {
  it('pintan su contenido con la semántica esperada', () => {
    render(
      <>
        <Kicker>Antetítulo</Kicker>
        <Lead>Entradilla</Lead>
        <Definition termino="Base reguladora">Texto de la definición</Definition>
        <MarginNote>Texto de la nota</MarginNote>
      </>,
    );
    expect(screen.getByText('Antetítulo')).toHaveClass('kicker');
    expect(screen.getByText('Entradilla')).toHaveClass('lead');
    expect(screen.getAllByRole('term')[0]).toHaveTextContent('Base reguladora');
    expect(screen.getByRole('definition')).toHaveTextContent('Texto de la definición');
    expect(screen.getByText('Definición')).toBeInTheDocument();
    expect(screen.getByRole('note', { name: 'Nota' })).toHaveTextContent('Texto de la nota');
  });
});

describe('SegmentedPills', () => {
  function Prueba() {
    const [valor, setValor] = useState(30);
    return (
      <>
        <SegmentedPills
          leyenda="Años cotizados"
          opciones={[25, 30, 35].map((v) => ({ valor: v, etiqueta: String(v) }))}
          valor={valor}
          onCambio={setValor}
        />
        <span data-testid="valor">{valor}</span>
      </>
    );
  }

  it('es un grupo de botones de opción y cambia con clic y con flechas', async () => {
    render(<Prueba />);
    const grupo = screen.getByRole('group', { name: 'Años cotizados' });
    expect(within(grupo).getAllByRole('radio')).toHaveLength(3);
    expect(screen.getByRole('radio', { name: '30' })).toBeChecked();
    await userEvent.click(screen.getByText('35'));
    expect(screen.getByTestId('valor')).toHaveTextContent('35');
    expect(screen.getByRole('radio', { name: '35' })).toBeChecked();
  });
});

describe('InteractiveSentence', () => {
  function Prueba() {
    const [valor, setValor] = useState(1);
    return (
      <InteractiveSentence>
        Con{' '}
        <SentenceSelect
          etiqueta="Cantidad"
          opciones={[
            { valor: 1, texto: 'uno' },
            { valor: 2, texto: 'dos' },
          ]}
          valor={valor}
          onCambio={setValor}
        />{' '}
        el resultado es <SentenceValue>{valor * 10}</SentenceValue>.
      </InteractiveSentence>
    );
  }

  it('actualiza el resultado al cambiar el control insertado', async () => {
    render(<Prueba />);
    expect(screen.getByRole('status')).toHaveTextContent('10');
    await userEvent.selectOptions(screen.getByRole('combobox', { name: 'Cantidad' }), '2');
    expect(screen.getByRole('status')).toHaveTextContent('20');
  });
});

describe('SourceLine', () => {
  it('pinta título, organismo, fecha y confianza con enlace', () => {
    render(<SourceLine datos={DATO} />);
    const linea = screen.getByText(/Fuente:/).closest('p');
    expect(linea).toHaveTextContent(
      'Fuente: Documento A (Organismo A) · descargado el 2024-05-01 · confianza: alta',
    );
    expect(screen.getByRole('link', { name: 'Documento A' })).toHaveAttribute(
      'href',
      'https://example.org/a',
    );
  });

  it('agrupa fuentes repetidas y usa plural con varias', () => {
    const otro: Dato = {
      ...DATO,
      source: { title: 'Documento B', publisher: 'Organismo B', url: 'https://example.org/b' },
      fetchedAt: '2024-06-02',
      confidence: 'media',
    };
    render(<SourceLine datos={[DATO, DATO, otro]} />);
    const linea = screen.getByText(/Fuentes:/).closest('p');
    expect(linea).toHaveTextContent(
      'Fuentes: Documento A (Organismo A) · descargado el 2024-05-01 · confianza: alta; Documento B (Organismo B) · descargado el 2024-06-02 · confianza: media',
    );
    expect(screen.getAllByRole('link')).toHaveLength(2);
  });
});

describe('DataTable', () => {
  it('es una tabla real con cabeceras y cifras formateadas a la derecha', () => {
    render(
      <DataTable
        titulo="Casos"
        columnas={[
          { clave: 'caso', titulo: 'Caso' },
          { clave: 'importe', titulo: 'Importe', tipo: 'euros' },
          { clave: 'tasa', titulo: 'Tasa', tipo: 'porcentaje' },
        ]}
        filas={[
          { caso: 'A', importe: 1680, tasa: 0.9 },
          { caso: 'B', importe: null, tasa: 0.125 },
        ]}
        filaDestacada={0}
      />,
    );
    const tabla = screen.getByRole('table', { name: 'Casos' });
    expect(within(tabla).getAllByRole('columnheader')).toHaveLength(3);
    expect(
      within(tabla)
        .getAllByRole('rowheader')
        .map((c) => c.textContent),
    ).toEqual(['A', 'B']);
    const celda = within(tabla).getByText('1.680 €');
    expect(celda.textContent).toBe(`1.680${NBSP}€`);
    expect(celda).toHaveClass('num');
    expect(within(tabla).getByText('12,5 %')).toBeInTheDocument();
    expect(within(tabla).getByText('—')).toBeInTheDocument();
    expect(screen.getByRole('region', { name: 'Casos' })).toHaveAttribute('tabindex', '0');
  });
});
