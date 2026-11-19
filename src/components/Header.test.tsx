/**
 * Menú agrupado (fase R3): patrón de «disclosure» con los grupos de `GRUPOS_NAVEGACION`. Un solo
 * grupo abierto; se cierra con Esc (el foco vuelve a su botón), al elegir un enlace, al cambiar de
 * ruta, al pulsar fuera y cuando el foco sale del menú; el grupo de la página actual se marca.
 */
import { render, screen, within } from '@testing-library/react';
import { useEffect } from 'react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, useLocation, useNavigate } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { GRUPOS_NAVEGACION, PAGINAS_SOBRE_LA_WEB, RUTAS_NAVEGACION } from '../modules/navegacion';
import { SECCIONES } from '../modules/secciones';
import { Header } from './Header';

/** Muestra la ruta actual y, si recibe `destino`, navega a ella sin pasar por el menú. */
function Captura({ destino }: { readonly destino?: string | undefined }) {
  const navegar = useNavigate();
  const { pathname } = useLocation();
  useEffect(() => {
    if (destino) void navegar(destino);
  }, [destino, navegar]);
  return <p data-testid="ruta">{pathname}</p>;
}

function Arbol({ ruta, destino }: { readonly ruta: string; readonly destino?: string }) {
  return (
    <MemoryRouter initialEntries={[ruta]}>
      <Header />
      <Captura destino={destino} />
      <button type="button">Después del menú</button>
    </MemoryRouter>
  );
}

function pintar(ruta = '/') {
  return render(<Arbol ruta={ruta} />);
}

const nav = () => screen.getByRole('navigation', { name: 'Secciones' });
const GRUPOS_DESPLEGABLES = GRUPOS_NAVEGACION.filter((g) => !g.directo);
const boton = (titulo: string) => within(nav()).getByRole('button', { name: titulo });

describe('menú agrupado', () => {
  it('pinta los grupos de la fuente de verdad: un enlace directo y un botón por grupo', () => {
    pintar();
    const botones = within(nav()).getAllByRole('button');
    expect(botones.map((b) => b.textContent)).toEqual(GRUPOS_DESPLEGABLES.map((g) => g.titulo));
    // Cerrados, solo se ve el enlace directo («Tu pensión»).
    const directos = GRUPOS_NAVEGACION.filter((g) => g.directo).flatMap((g) => g.enlaces);
    expect(
      within(nav())
        .getAllByRole('link')
        .map((a) => a.textContent),
    ).toEqual(directos.map((e) => e.titulo));
  });

  it('cada botón es un disclosure: aria-expanded y aria-controls a su lista de enlaces', async () => {
    const usuario = userEvent.setup();
    pintar();
    for (const g of GRUPOS_DESPLEGABLES) {
      const b = boton(g.titulo);
      expect(b).toHaveAttribute('aria-expanded', 'false');
      const panel = document.getElementById(b.getAttribute('aria-controls') ?? '');
      expect(panel?.tagName).toBe('UL');
      expect(panel).not.toBeVisible();
      await usuario.click(b);
      expect(b).toHaveAttribute('aria-expanded', 'true');
      expect(panel).toBeVisible();
      expect(
        within(panel!)
          .getAllByRole('link')
          .map((a) => a.getAttribute('href')),
      ).toEqual(g.enlaces.map((e) => e.ruta));
      // No es un menú de aplicación (role="menu").
      expect(nav().querySelector('[role="menu"], [role="menuitem"]')).toBeNull();
    }
  });

  it('las trece rutas del menú están alcanzables: las once secciones, «Fuentes» y «Registro de cambios»', async () => {
    const usuario = userEvent.setup();
    pintar();
    const destinos = new Set<string>();
    for (const a of within(nav()).getAllByRole('link')) destinos.add(a.getAttribute('href') ?? '');
    for (const g of GRUPOS_DESPLEGABLES) {
      await usuario.click(boton(g.titulo));
      for (const a of within(nav()).getAllByRole('link'))
        destinos.add(a.getAttribute('href') ?? '');
    }
    const esperadas = [
      ...SECCIONES.map((s) => `/${s.slug}`),
      ...PAGINAS_SOBRE_LA_WEB.map((p) => `/${p.slug}`),
    ];
    expect(esperadas).toHaveLength(13);
    expect([...destinos].sort()).toEqual([...esperadas].sort());
    expect(RUTAS_NAVEGACION.map((e) => e.ruta).sort()).toEqual([...esperadas].sort());
    expect([...destinos].some((d) => d.includes('diseno'))).toBe(false);
  });

  it('solo hay un grupo abierto a la vez', async () => {
    const usuario = userEvent.setup();
    pintar();
    const [a, b] = GRUPOS_DESPLEGABLES;
    await usuario.click(boton(a!.titulo));
    await usuario.click(boton(b!.titulo));
    expect(boton(a!.titulo)).toHaveAttribute('aria-expanded', 'false');
    expect(boton(b!.titulo)).toHaveAttribute('aria-expanded', 'true');
    expect(within(nav()).getAllByRole('button', { expanded: true })).toHaveLength(1);
    // Pulsar el botón abierto lo cierra.
    await usuario.click(boton(b!.titulo));
    expect(within(nav()).queryAllByRole('button', { expanded: true })).toHaveLength(0);
  });

  it('Esc cierra el grupo y devuelve el foco a su botón', async () => {
    const usuario = userEvent.setup();
    pintar();
    const g = GRUPOS_DESPLEGABLES[1]!;
    await usuario.click(boton(g.titulo));
    await usuario.tab();
    expect(document.activeElement?.textContent).toBe(g.enlaces[0]!.titulo);
    await usuario.keyboard('{Escape}');
    expect(boton(g.titulo)).toHaveAttribute('aria-expanded', 'false');
    expect(boton(g.titulo)).toHaveFocus();
  });

  it('Tab recorre botones y enlaces en el orden natural, y el grupo se cierra cuando el foco sale del menú', async () => {
    const usuario = userEvent.setup();
    pintar();
    const ultimo = GRUPOS_DESPLEGABLES.at(-1)!;
    await usuario.click(boton(ultimo.titulo));
    for (const e of ultimo.enlaces) {
      await usuario.tab();
      expect(document.activeElement?.textContent).toBe(e.titulo);
    }
    await usuario.tab();
    expect(screen.getByRole('button', { name: 'Después del menú' })).toHaveFocus();
    expect(boton(ultimo.titulo)).toHaveAttribute('aria-expanded', 'false');
  });

  it('se cierra al pulsar fuera del menú', async () => {
    const usuario = userEvent.setup();
    pintar();
    const g = GRUPOS_DESPLEGABLES[0]!;
    await usuario.click(boton(g.titulo));
    await usuario.click(screen.getByTestId('ruta'));
    expect(boton(g.titulo)).toHaveAttribute('aria-expanded', 'false');
  });

  it('se cierra al elegir un enlace y lleva a su ruta', async () => {
    const usuario = userEvent.setup();
    pintar();
    const g = GRUPOS_DESPLEGABLES[1]!;
    const destino = g.enlaces[1]!;
    await usuario.click(boton(g.titulo));
    await usuario.click(within(nav()).getByRole('link', { name: destino.titulo }));
    expect(screen.getByTestId('ruta')).toHaveTextContent(destino.ruta);
    expect(boton(g.titulo)).toHaveAttribute('aria-expanded', 'false');
  });

  it('se cierra al cambiar de ruta por otro medio', async () => {
    const usuario = userEvent.setup();
    const { rerender } = pintar('/hucha');
    const g = GRUPOS_DESPLEGABLES[0]!;
    await usuario.click(boton(g.titulo));
    expect(boton(g.titulo)).toHaveAttribute('aria-expanded', 'true');
    rerender(<Arbol ruta="/hucha" destino="/reformas" />);
    expect(await screen.findByText('/reformas')).toBeInTheDocument();
    expect(boton(g.titulo)).toHaveAttribute('aria-expanded', 'false');
  });

  it('marca el grupo de la página actual y el enlace activo con aria-current="page"', async () => {
    const usuario = userEvent.setup();
    for (const enlace of RUTAS_NAVEGACION) {
      const { unmount } = pintar(enlace.ruta);
      const grupo = GRUPOS_NAVEGACION.find((g) => g.enlaces.includes(enlace))!;
      const marcados = nav().querySelectorAll('[data-actual="si"]');
      expect(marcados, enlace.ruta).toHaveLength(1);
      if (!grupo.directo) {
        expect(marcados[0]?.querySelector('button')?.textContent).toBe(grupo.titulo);
        await usuario.click(boton(grupo.titulo));
      }
      expect(within(nav()).getByRole('link', { name: enlace.titulo })).toHaveAttribute(
        'aria-current',
        'page',
      );
      unmount();
    }
  });

  it('en la portada no hay grupo marcado', () => {
    pintar('/');
    expect(nav().querySelectorAll('[data-actual="si"]')).toHaveLength(0);
  });
});
