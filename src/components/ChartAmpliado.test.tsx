/**
 * Gráfico ampliado (fase R4): botón «+» de `Chart` y diálogo modal con el gráfico redibujado, su
 * tabla, su nota, su fuente y su «Cómo leerlo», con el mismo patrón de foco que el desplegable de
 * fuentes. En jsdom no hay `showModal`: el diálogo se abre con el atributo `open` (la prueba del
 * modal nativo está en `e2e/graficos-ampliables.spec.ts`).
 */
import * as Plot from '@observablehq/plot';
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import type { Dato } from '../engine/esquema-datos';
import { Chart } from './Chart';
import type { Columna } from './DataTable';

const DATO: Dato = {
  value: 1,
  unit: 'u',
  period: '2024',
  source: { title: 'Documento A', publisher: 'Organismo A', url: 'https://example.org/a' },
  fetchedAt: '2024-05-01',
  confidence: 'alta',
};

type Fila = { anio: string; valor: number };
const COLUMNAS: readonly Columna<Fila>[] = [
  { clave: 'anio', titulo: 'Año' },
  { clave: 'valor', titulo: 'Valor', tipo: 'numero' },
];
const FILAS: readonly Fila[] = [
  { anio: 'a', valor: 1 },
  { anio: 'b', valor: 2 },
];
const opciones = (): Plot.PlotOptions => ({
  marks: [Plot.barY(FILAS, { x: 'anio', y: 'valor' })],
});

function Grafico({ titulo = 'Gráfico de prueba' }: { titulo?: string }) {
  return (
    <Chart
      titulo={titulo}
      descripcion="Qué mide y en qué unidad."
      opciones={opciones}
      tabla={{ columnas: COLUMNAS, filas: FILAS }}
      fuentes={DATO}
      nota="Nota de definición."
      comoLeerlo={<p>Texto para leer el gráfico.</p>}
    />
  );
}

const boton = (titulo = 'Gráfico de prueba') =>
  screen.getByRole('button', { name: `Ampliar gráfico: ${titulo}` });
const dialogo = (titulo = 'Gráfico de prueba') => screen.getByRole('dialog', { name: titulo });

function idsRepetidos(): string[] {
  const ids = [...document.querySelectorAll('[id]')].map((e) => e.id);
  return ids.filter((id, i) => ids.indexOf(id) !== i);
}

describe('botón «+» del gráfico', () => {
  it('tiene nombre accesible con el título, anuncia un diálogo y está cerrado', () => {
    render(<Grafico />);
    const b = boton();
    expect(b).toHaveTextContent('+');
    expect(b).toHaveAttribute('aria-haspopup', 'dialog');
    expect(b).toHaveAttribute('aria-expanded', 'false');
    expect(b.closest('figure')).not.toBeNull();
    expect(screen.queryByRole('dialog')).toBeNull();
  });

  it('el «Cómo leerlo» va después de la figura, fuera de ella', () => {
    const { container } = render(<Grafico />);
    const figura = container.querySelector('figure.grafico');
    expect(figura?.nextElementSibling).toHaveClass('como-leerlo');
    expect(figura?.querySelector('.como-leerlo')).toBeNull();
  });
});

describe('gráfico ampliado', () => {
  it('se abre con un clic, con el foco en «Cerrar», y lleva gráfico, tabla, nota, fuente y «Cómo leerlo»', async () => {
    render(<Grafico />);
    await userEvent.click(boton());
    const d = dialogo();
    expect(boton()).toHaveAttribute('aria-expanded', 'true');
    expect(within(d).getByRole('button', { name: 'Cerrar' })).toHaveFocus();
    expect(within(d).getByRole('img', { name: 'Gráfico de prueba' })).toBeInTheDocument();
    expect(within(d).getByText('Qué mide y en qué unidad.')).toBeInTheDocument();
    const tabla = within(d).getByRole('table', { name: 'Gráfico de prueba' });
    expect(within(tabla).getAllByRole('row')).toHaveLength(FILAS.length + 1);
    expect(within(d).getByText('Nota de definición.')).toBeInTheDocument();
    expect(
      within(d).getByRole('button', { name: 'Fuente: Gráfico de prueba' }),
    ).toBeInTheDocument();
    expect(within(d).getByText('Cómo leerlo')).toBeInTheDocument();
    expect(within(d).getByText('Texto para leer el gráfico.')).toBeInTheDocument();
    // El gráfico se dibuja otra vez dentro del diálogo (no es el mismo SVG).
    expect(document.querySelectorAll('svg[role="img"]')).toHaveLength(2);
    expect(idsRepetidos()).toEqual([]);
  });

  it('se abre con Intro y con Espacio', async () => {
    render(<Grafico />);
    boton().focus();
    await userEvent.keyboard('{Enter}');
    expect(dialogo()).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton()).toHaveFocus();
    await userEvent.keyboard(' ');
    expect(dialogo()).toBeInTheDocument();
  });

  it('Esc cierra y el foco vuelve al botón «+»', async () => {
    render(<Grafico />);
    await userEvent.click(boton());
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton()).toHaveFocus();
    expect(boton()).toHaveAttribute('aria-expanded', 'false');
  });

  it('«Cerrar» cierra y el foco vuelve al botón «+»', async () => {
    render(<Grafico />);
    await userEvent.click(boton());
    await userEvent.click(within(dialogo()).getByRole('button', { name: 'Cerrar' }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton()).toHaveFocus();
  });

  it('Tab y Mayús+Tab no sacan el foco del diálogo', async () => {
    render(<Grafico />);
    await userEvent.click(boton());
    const d = dialogo();
    const cerrar = within(d).getByRole('button', { name: 'Cerrar' });
    // Mayús+Tab desde el primero va al último control del diálogo; Tab desde el último, al primero.
    await userEvent.tab({ shift: true });
    expect(d.contains(document.activeElement)).toBe(true);
    expect(document.activeElement).not.toBe(cerrar);
    await userEvent.tab();
    expect(cerrar).toHaveFocus();
  });

  it('la fuente se abre dentro del gráfico ampliado y Esc cierra solo el desplegable de fuentes', async () => {
    render(<Grafico />);
    await userEvent.click(boton());
    const fuente = within(dialogo()).getByRole('button', { name: 'Fuente: Gráfico de prueba' });
    await userEvent.click(fuente);
    const desplegable = screen.getByRole('dialog', { name: 'Fuente: Gráfico de prueba' });
    expect(within(desplegable).getByRole('link', { name: 'Documento A' })).toBeInTheDocument();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog', { name: 'Fuente: Gráfico de prueba' })).toBeNull();
    expect(dialogo()).toBeInTheDocument();
    expect(fuente).toHaveFocus();
    await userEvent.keyboard('{Escape}');
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(boton()).toHaveFocus();
  });

  it('solo hay un gráfico ampliado a la vez', async () => {
    render(
      <>
        <Grafico titulo="Primero" />
        <Grafico titulo="Segundo" />
      </>,
    );
    await userEvent.click(boton('Primero'));
    expect(dialogo('Primero')).toBeInTheDocument();
    // Sin modal nativo (jsdom) el resto de la página no es inerte: abrir otro cierra el anterior.
    await userEvent.click(boton('Segundo'));
    expect(screen.queryByRole('dialog', { name: 'Primero' })).toBeNull();
    expect(dialogo('Segundo')).toBeInTheDocument();
    expect(screen.getAllByRole('dialog')).toHaveLength(1);
  });

  it('sin fuente ni «Cómo leerlo», el diálogo no los inventa', async () => {
    render(
      <Chart titulo="Sin más" opciones={opciones} tabla={{ columnas: COLUMNAS, filas: FILAS }} />,
    );
    await userEvent.click(boton('Sin más'));
    const d = dialogo('Sin más');
    expect(within(d).queryByRole('button', { name: /^Fuente/ })).toBeNull();
    expect(within(d).queryByText('Cómo leerlo')).toBeNull();
    expect(within(d).getByRole('table', { name: 'Sin más' })).toBeInTheDocument();
  });
});
