/**
 * Navegación (fase R3): menú agrupado y índice «En esta página», a 1360 px (escritorio) y a 390 px
 * (móvil). Los grupos salen de `GRUPOS_NAVEGACION`; los enlaces se abren con los ayudantes comunes de
 * `utilidades.ts`. Sin plazos ajustados ni clic forzado.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { GRUPOS_NAVEGACION, RUTAS_NAVEGACION } from '../src/modules/navegacion.ts';
import {
  abrirIndice,
  abrirMenuMovil,
  esperarPagina,
  irPorMenu,
  irPorMenuConTeclado,
  menu,
  url,
  vigilar,
} from './utilidades.ts';

const ETIQUETAS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function sinInfraccionesAxe(page: Page): Promise<void> {
  const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze();
  expect(
    resultado.violations.map(
      (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
    ),
  ).toEqual([]);
}

async function sinDesborde(page: Page): Promise<void> {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda, 'desbordamiento horizontal').toBe(false);
}

/** Sombras y radios calculados de un conjunto de elementos (deben ser ninguno y 0). */
async function sinSombrasNiRadios(page: Page, selector: string): Promise<void> {
  const problemas = await page.evaluate((sel) => {
    const salida: string[] = [];
    for (const el of document.querySelectorAll(`${sel}, ${sel} *`)) {
      const e = getComputedStyle(el);
      if (e.boxShadow !== 'none') salida.push(`${el.tagName} box-shadow`);
      for (const r of [e.borderTopLeftRadius, e.borderBottomRightRadius])
        if (parseFloat(r) > 2) salida.push(`${el.tagName} border-radius ${r}`);
    }
    return salida;
  }, selector);
  expect(problemas).toEqual([]);
}

test.describe('menú agrupado', () => {
  for (const enlace of RUTAS_NAVEGACION) {
    test(`con el ratón se llega a ${enlace.ruta}`, async ({ page }) => {
      const registro = vigilar(page);
      await page.goto(url('/'));
      await esperarPagina(page);
      await irPorMenu(page, enlace.titulo);
      await expect(page).toHaveURL(new RegExp(`#${enlace.ruta}$`));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByText('Página no encontrada')).toHaveCount(0);
      // Al elegir el enlace, el grupo se cierra.
      await expect(menu(page).getByRole('button', { expanded: true })).toHaveCount(0);
      expect(registro.errores, 'errores de consola').toEqual([]);
    });

    test(`con el teclado se llega a ${enlace.ruta}`, async ({ page }) => {
      await page.goto(url('/'));
      await esperarPagina(page);
      await irPorMenuConTeclado(page, enlace.titulo);
      await expect(page).toHaveURL(new RegExp(`#${enlace.ruta}$`));
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByText('Página no encontrada')).toHaveCount(0);
    });
  }

  test('Esc cierra el grupo y devuelve el foco a su botón; un solo grupo abierto', async ({
    page,
  }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await abrirMenuMovil(page);
    const [a, b] = GRUPOS_NAVEGACION.filter((g) => !g.directo);
    const botonA = menu(page).getByRole('button', { name: a!.titulo });
    const botonB = menu(page).getByRole('button', { name: b!.titulo });
    await botonA.click();
    await expect(botonA).toHaveAttribute('aria-expanded', 'true');
    await botonB.click();
    await expect(botonA).toHaveAttribute('aria-expanded', 'false');
    await expect(botonB).toHaveAttribute('aria-expanded', 'true');
    await page.keyboard.press('Tab');
    await expect(menu(page).getByRole('link', { name: b!.enlaces[0]!.titulo })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(botonB).toHaveAttribute('aria-expanded', 'false');
    await expect(botonB).toBeFocused();
    // El grupo de la página actual («Hucha») queda marcado.
    await expect(menu(page).locator('[data-actual="si"] > button')).toHaveText(b!.titulo);
    await sinDesborde(page);
  });

  test('se cierra al pulsar fuera del menú', async ({ page }) => {
    await page.goto(url('/reformas'));
    await esperarPagina(page);
    await abrirMenuMovil(page);
    const grupo = GRUPOS_NAVEGACION.find((g) => !g.directo)!;
    const boton = menu(page).getByRole('button', { name: grupo.titulo });
    await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    await page.locator('h1').click();
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
  });

  test('con un grupo abierto: axe sin infracciones, sin desbordes, sin sombras ni radios', async ({
    page,
  }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    await abrirMenuMovil(page);
    const ultimo = GRUPOS_NAVEGACION.at(-1)!;
    const boton = menu(page).getByRole('button', { name: ultimo.titulo });
    await boton.click();
    const panel = page.locator(`[id="${String(await boton.getAttribute('aria-controls'))}"]`);
    await expect(panel).toBeVisible();
    // Los enlaces del panel miden al menos 44 px y el panel cabe en la ventana.
    for (const a of await panel.getByRole('link').all()) {
      const caja = await a.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    const caja = await panel.boundingBox();
    const ancho = page.viewportSize()?.width ?? 0;
    expect((caja?.x ?? -1) >= 0 && (caja?.x ?? 0) + (caja?.width ?? 0) <= ancho).toBe(true);
    await sinDesborde(page);
    await sinSombrasNiRadios(page, '.navegacion');
    await sinInfraccionesAxe(page);
  });
});

test.describe('índice «En esta página»', () => {
  for (const [ruta, entrada] of [
    ['/metodologia', 2],
    ['/financiacion-y-deficit', 1],
    ['/como-se-calcula', 3],
  ] as const) {
    test(`${ruta}: lleva el foco al encabezado sin cambiar la ruta ni los parámetros`, async ({
      page,
    }) => {
      const registro = vigilar(page);
      // Parámetros de un enlace compartible en el hash: no deben cambiar.
      const direccion = `${ruta}?v=1&p=inc`;
      await page.goto(url(direccion));
      await esperarPagina(page);
      const antes = page.url();
      const indice = await abrirIndice(page);
      const enlace = indice.getByRole('link').nth(entrada);
      const destino = String(await enlace.getAttribute('data-destino'));
      await enlace.click();
      const encabezado = page.locator(`#${destino}`);
      await expect(encabezado).toBeFocused();
      await expect(encabezado).toBeInViewport();
      expect(page.url()).toBe(antes);
      expect(page.url()).toContain(`#${direccion}`);
      // Con el teclado: Intro en otra entrada.
      const otra = indice.getByRole('link').first();
      if (await otra.isVisible()) {
        await otra.focus();
        await page.keyboard.press('Enter');
        await expect(
          page.locator(`#${String(await otra.getAttribute('data-destino'))}`),
        ).toBeFocused();
        expect(page.url()).toBe(antes);
      }
      await sinDesborde(page);
      await sinSombrasNiRadios(page, '.indice-pagina');
      expect(registro.errores, 'errores de consola').toEqual([]);
    });
  }

  test('en escritorio va fijo en la columna de notas; en móvil, plegado y cerrado', async ({
    page,
  }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    const indice = page.getByRole('navigation', { name: 'En esta página' });
    const boton = indice.getByRole('button', { name: 'En esta página' });
    const ancho = page.viewportSize()?.width ?? 0;
    if (ancho >= 960) {
      await expect(boton).toBeHidden();
      await expect(indice.getByRole('link').first()).toBeVisible();
      // Sigue a la vista al desplazarse y no pisa la columna de texto.
      await page.locator('#prestamos').scrollIntoViewIfNeeded();
      await expect(indice).toBeInViewport();
      const cajaIndice = await indice.boundingBox();
      const cajaTexto = await page.locator('#prestamos').boundingBox();
      expect(cajaIndice!.x).toBeGreaterThan(cajaTexto!.x + cajaTexto!.width);
    } else {
      await expect(boton).toBeVisible();
      await expect(boton).toHaveAttribute('aria-expanded', 'false');
      await expect(indice.getByRole('link').first()).toBeHidden();
      await boton.click();
      await expect(indice.getByRole('link').first()).toBeVisible();
      const caja = await boton.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await sinDesborde(page);
  });

  test('con el índice abierto (móvil) o fijo (escritorio): axe sin infracciones', async ({
    page,
  }) => {
    await page.goto(url('/metodologia'));
    await esperarPagina(page);
    await abrirIndice(page);
    await sinInfraccionesAxe(page);
  });
});

test.describe('detalle técnico plegable (laboratorio de diseño)', () => {
  test('plegado por defecto; al desplegarlo, el gráfico conserva tabla, nota y fuente', async ({
    page,
  }) => {
    await page.goto(url('/diseno'));
    await esperarPagina(page);
    const boton = page.getByRole('button', { name: 'Cómo se ha calculado este ejemplo ficticio' });
    await expect(boton).toHaveAttribute('aria-expanded', 'false');
    await boton.focus();
    await page.keyboard.press('Enter');
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    const region = page.getByRole('region', { name: 'Cómo se ha calculado este ejemplo ficticio' });
    const figura = region.locator('figure');
    await expect(figura.locator('figcaption')).toHaveCount(1);
    await expect(figura.locator('svg[role="img"]')).toHaveCount(1);
    await expect(figura.locator('table')).toHaveCount(1);
    await expect(figura.locator('.linea-fuente')).toHaveCount(1);
    await expect(figura).toContainText('Datos ficticios.');
    const caja = await boton.boundingBox();
    expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
    await sinSombrasNiRadios(page, '.detalle-tecnico');
    await sinDesborde(page);
  });
});
