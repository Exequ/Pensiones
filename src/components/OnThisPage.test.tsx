/**
 * Índice «En esta página» (fase R3): enlaces que mueven el desplazamiento y el foco al encabezado sin
 * cambiar la ruta ni el query del hash; plegable (cerrado por defecto) en móvil.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation } from 'react-router-dom';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { apartadoVisible, irAEncabezado, type EntradaIndice } from './anclas';
import { OnThisPage } from './OnThisPage';

const ENTRADAS: readonly EntradaIndice[] = [
  { destino: 'a-titulo', titulo: 'Primer apartado', resumen: 'Qué cuenta el primero.' },
  { destino: 'b-titulo', titulo: 'Segundo apartado' },
  { destino: 'c-titulo', titulo: 'Tercer apartado' },
];

function Ruta() {
  const { pathname, search, hash } = useLocation();
  return <p data-testid="ruta">{`${pathname}${search}${hash}`}</p>;
}

function pintar(ruta = '/tu-pension?v=1&p=inc', props: { titulo?: string; fijo?: boolean } = {}) {
  return render(
    <MemoryRouter initialEntries={[ruta]}>
      <div className="articulo">
        <OnThisPage entradas={ENTRADAS} {...props} />
        {ENTRADAS.map((e) => (
          <section key={e.destino}>
            <h2 id={e.destino} tabIndex={-1}>
              {e.titulo}
            </h2>
          </section>
        ))}
      </div>
      <Ruta />
    </MemoryRouter>,
  );
}

afterEach(() => {
  vi.restoreAllMocks();
});

describe('OnThisPage', () => {
  it('es una navegación «En esta página» con una entrada por encabezado, con el mismo texto', () => {
    pintar();
    const nav = screen.getByRole('navigation', { name: 'En esta página' });
    const enlaces = within(nav).getAllByRole('link');
    expect(enlaces.map((a) => a.textContent)).toEqual(ENTRADAS.map((e) => e.titulo));
    for (const [i, a] of enlaces.entries()) {
      const destino = document.getElementById(ENTRADAS[i]!.destino);
      expect(destino?.textContent).toBe(a.textContent);
    }
    expect(nav.querySelector('ol')).not.toBeNull();
    expect(nav).toHaveTextContent('Qué cuenta el primero.');
  });

  it('el «·» del resumen es un elemento propio, para quitarlo cuando el resumen va en su línea (fase R4)', () => {
    pintar();
    const resumen = document.querySelector('.indice-pagina-resumen');
    expect(resumen).toHaveTextContent('Qué cuenta el primero.');
    const separador = resumen?.querySelector('.indice-pagina-separador');
    expect(separador?.textContent).toBe(' · ');
    // El texto del resumen, sin el separador, no empieza por «·».
    const sinSeparador = [...(resumen?.childNodes ?? [])]
      .filter((n) => n !== separador)
      .map((n) => n.textContent)
      .join('');
    expect(sinSeparador).toBe('Qué cuenta el primero.');
    // Las entradas sin resumen no llevan separador.
    expect(document.querySelectorAll('.indice-pagina-separador')).toHaveLength(1);
  });

  it('el clic mueve el foco y el desplazamiento al encabezado sin cambiar la ruta ni el query', async () => {
    const usuario = userEvent.setup();
    const desplazar = vi.fn();
    Element.prototype.scrollIntoView = desplazar;
    pintar('/tu-pension?v=1&p=inc');
    const antes = screen.getByTestId('ruta').textContent;
    await usuario.click(screen.getByRole('link', { name: 'Segundo apartado' }));
    expect(document.activeElement?.id).toBe('b-titulo');
    expect(desplazar).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('ruta').textContent).toBe(antes);
    expect(antes).toBe('/tu-pension?v=1&p=inc');
  });

  it('con Intro desde el teclado hace lo mismo', async () => {
    const usuario = userEvent.setup();
    Element.prototype.scrollIntoView = vi.fn();
    pintar();
    screen.getByRole('link', { name: 'Tercer apartado' }).focus();
    await usuario.keyboard('{Enter}');
    expect(document.activeElement?.id).toBe('c-titulo');
  });

  it('el href de cada enlace es la propia página con su query, no un «#id» que cambiaría de ruta', () => {
    pintar('/hucha?v=1&p=viu');
    for (const a of screen.getAllByRole('link'))
      expect(a.getAttribute('href')).toBe('/hucha?v=1&p=viu');
  });

  it('en móvil se pliega tras el botón «En esta página», cerrado por defecto', async () => {
    const usuario = userEvent.setup();
    pintar();
    const nav = screen.getByRole('navigation', { name: 'En esta página' });
    const boton = within(nav).getByRole('button', { name: 'En esta página' });
    expect(boton).toHaveAttribute('aria-expanded', 'false');
    expect(nav).toHaveAttribute('data-abierto', 'no');
    expect(document.getElementById(boton.getAttribute('aria-controls') ?? '')?.tagName).toBe('OL');
    await usuario.click(boton);
    expect(boton).toHaveAttribute('aria-expanded', 'true');
    expect(nav).toHaveAttribute('data-abierto', 'si');
    await usuario.click(boton);
    expect(nav).toHaveAttribute('data-abierto', 'no');
  });

  it('admite otro nombre y la variante en línea', () => {
    const { container } = pintar('/', { titulo: 'Afirmaciones', fijo: false });
    expect(screen.getByRole('navigation', { name: 'Afirmaciones' })).toBeInTheDocument();
    expect(container.querySelector('.indice-pagina-marco--fijo')).toBeNull();
    expect(container.querySelector('.indice-pagina-marco')).not.toBeNull();
  });

  it('marca el apartado que se está leyendo con aria-current="location"', () => {
    const posiciones: Record<string, number> = {
      'a-titulo': -400,
      'b-titulo': 40,
      'c-titulo': 700,
    };
    vi.spyOn(Element.prototype, 'getBoundingClientRect').mockImplementation(function (
      this: Element,
    ) {
      return { top: posiciones[this.id] ?? 0 } as DOMRect;
    });
    pintar();
    expect(screen.getByRole('link', { name: 'Segundo apartado' })).toHaveAttribute(
      'aria-current',
      'location',
    );
    expect(screen.getByRole('link', { name: 'Primer apartado' })).not.toHaveAttribute(
      'aria-current',
    );
  });
});

describe('apartadoVisible', () => {
  it('devuelve el último encabezado que ha pasado el umbral, o null', () => {
    expect(apartadoVisible([500, 900], 160)).toBeNull();
    expect(apartadoVisible([-50, 120, 600], 160)).toBe(1);
    expect(apartadoVisible([-900, -400, -10], 160)).toBe(2);
    expect(apartadoVisible([null, 100, null], 160)).toBe(1);
  });
});

describe('irAEncabezado', () => {
  it('respeta prefers-reduced-motion: desplazamiento inmediato o suave', () => {
    document.body.innerHTML = '<h2 id="x">X</h2>';
    const desplazar = vi.fn();
    Element.prototype.scrollIntoView = desplazar;
    const coincide = (matches: boolean) =>
      vi.fn().mockReturnValue({ matches }) as unknown as typeof window.matchMedia;
    window.matchMedia = coincide(true);
    expect(irAEncabezado('x')).toBe(true);
    expect(desplazar).toHaveBeenLastCalledWith({ behavior: 'instant', block: 'start' });
    window.matchMedia = coincide(false);
    irAEncabezado('x');
    expect(desplazar).toHaveBeenLastCalledWith({ behavior: 'smooth', block: 'start' });
    // El destino recibe el foco aunque no tuviera tabindex.
    expect(document.getElementById('x')).toHaveAttribute('tabindex', '-1');
    expect(document.activeElement?.id).toBe('x');
    expect(irAEncabezado('no-existe')).toBe(false);
  });
});
