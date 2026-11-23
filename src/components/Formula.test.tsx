import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { formulaFicticia, MUESTRA } from '../design-lab/muestra';
import { formatearNumero } from '../engine/formato';
import { Formula } from './Formula';

describe('Formula', () => {
  const formula = formulaFicticia();

  it('dibuja cada ecuación en MathML nativo, con fracción, sumatorio y subíndice', () => {
    const { container } = render(<Formula formula={formula} />);
    const ecuaciones = container.querySelectorAll('math[display="block"]');
    expect(ecuaciones).toHaveLength(formula.ecuaciones.length);
    const primera = ecuaciones[0];
    expect(primera?.namespaceURI).toBe('http://www.w3.org/1998/Math/MathML');
    expect(primera?.querySelector('mfrac')).not.toBeNull();
    expect(primera?.querySelector('munderover')).not.toBeNull();
    expect(primera?.querySelector('msub')).not.toBeNull();
    // Los identificadores de varias letras y las cifras salen como tales.
    expect(container.querySelector('mi')?.textContent).toBe('Base');
    expect(
      [...container.querySelectorAll('math[display="block"] mn')].map((n) => n.textContent),
    ).toContain(formatearNumero(MUESTRA.formula.parametros[0]?.valor ?? Number.NaN));
  });

  it('cada ecuación tiene como nombre accesible su lectura en palabras', () => {
    const { container } = render(<Formula formula={formula} />);
    const ecuaciones = [...container.querySelectorAll('math[display="block"]')];
    expect(ecuaciones.map((e) => e.getAttribute('aria-label'))).toEqual(
      formula.ecuaciones.map((e) => e.lectura),
    );
    for (const e of ecuaciones) expect(e.getAttribute('role')).toBe('math');
    expect(formula.ecuaciones[1]?.lectura).toMatch(
      /^Pensión ficticia es igual a base ficticia por 60/,
    );
  });

  it('la caja de la fórmula es una región con nombre que se desplaza y se alcanza con el teclado', () => {
    render(<Formula formula={formula} />);
    const region = screen.getByRole('region', { name: formula.titulo });
    expect(region).toHaveAttribute('tabindex', '0');
    expect(region.querySelectorAll('math')).toHaveLength(formula.ecuaciones.length);
    expect(screen.getByRole('figure', { name: formula.titulo })).toBeInTheDocument();
  });

  it('la leyenda explica cada símbolo (nombre, significado y unidad) y cada cifra', () => {
    const { container } = render(<Formula formula={formula} />);
    const listas = container.querySelectorAll('dl.formula-leyenda');
    expect(listas).toHaveLength(2);
    const simbolos = listas[0] as HTMLElement;
    expect(simbolos.querySelectorAll('dt')).toHaveLength(formula.simbolos.length);
    for (const s of formula.simbolos) {
      expect(within(simbolos).getByText(`${s.nombre}.`)).toBeInTheDocument();
      expect(simbolos.textContent).toContain(s.significado);
      if (s.unidad !== null) expect(simbolos.textContent).toContain(`Unidad: ${s.unidad}.`);
    }
    const cifras = listas[1] as HTMLElement;
    expect(cifras.querySelectorAll('dt')).toHaveLength(formula.cifras.length);
    for (const c of formula.cifras) {
      expect(cifras.textContent).toContain(c.texto);
      expect(cifras.textContent).toContain(c.descripcion);
    }
    // Las listas de definición son listas reales, con encabezados que las nombran.
    expect(screen.getByText('Qué significa cada símbolo')).toBeInTheDocument();
    expect(screen.getByText('Qué significa cada cifra')).toBeInTheDocument();
  });

  it('cada símbolo de las ecuaciones consta en la leyenda y al revés', () => {
    const { container } = render(<Formula formula={formula} />);
    const enLeyenda = [...container.querySelectorAll('dl.formula-leyenda:first-of-type dt')].map(
      (dt) => dt.textContent,
    );
    const enFormula = new Set(
      [...container.querySelectorAll('math[display="block"] mi')].map((mi) => mi.textContent),
    );
    expect(enLeyenda.sort()).toEqual([...enFormula].sort());
  });

  it('el valor transitorio de una cifra se explica con sus dos periodos', () => {
    const conTransitorio = {
      ...formula,
      cifras: [
        {
          ...(formula.cifras[0] as (typeof formula.cifras)[number]),
          transitorio: { texto: '9', periodo: '2001', descripcion: 'x' },
        },
      ],
    };
    const { container } = render(<Formula formula={conTransitorio} />);
    expect(container.textContent).toMatch(/cuando se aplica por completo \(desde 2000\)/);
    expect(container.textContent).toMatch(/en 2001 el valor transitorio es 9/);
  });

  it('muestra las notas y no pinta la leyenda de cifras si no hay cifras', () => {
    const { container } = render(<Formula formula={{ ...formula, cifras: [] }} />);
    expect(container.querySelectorAll('dl.formula-leyenda')).toHaveLength(1);
    expect(container.querySelector('.formula-notas li')?.textContent).toBe(formula.notas[0]);
  });

  it('dibuja la resta y la potencia con MathML (Fase R6)', () => {
    const f = {
      ...formula,
      ecuaciones: [
        {
          izquierda: { tipo: 'simbolo', texto: 'X' },
          derecha: {
            tipo: 'producto',
            factores: [
              {
                tipo: 'grupo',
                delimitador: 'parentesis',
                cuerpo: {
                  tipo: 'resta',
                  minuendo: { tipo: 'numero', texto: formatearNumero(1) },
                  sustraendo: { tipo: 'simbolo', texto: 'C' },
                },
              },
              {
                tipo: 'potencia',
                base: { tipo: 'simbolo', texto: 'Y' },
                exponente: { tipo: 'numero', texto: formatearNumero(2) },
              },
            ],
          },
          lectura: 'X es igual a uno menos C por Y elevado a dos.',
        },
      ],
    } as const;
    const { container } = render(<Formula formula={f} />);
    const ecuacion = container.querySelector('math[display="block"]');
    expect(ecuacion?.querySelector('msup')).not.toBeNull();
    expect(ecuacion?.querySelector('msup')?.namespaceURI).toBe(
      'http://www.w3.org/1998/Math/MathML',
    );
    expect([...(ecuacion?.querySelectorAll('mo') ?? [])].map((o) => o.textContent)).toContain('−');
  });
});
