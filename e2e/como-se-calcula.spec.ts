import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { ESQUEMAS } from '../src/modules/como-se-calcula/esquemas.ts';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Fase «Cómo se calcula»: la página carga sin errores, se recorre con el teclado, no desborda en
 * móvil con las tablas y los ejemplos abiertos y cumple axe (WCAG AA). Las secciones se leen del
 * esquema de la página y los importes, de la propia página: no se escriben cifras aquí.
 */

const RUTA = '/como-se-calcula';

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url(RUTA));
  await esperarPagina(page);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('section.como-seccion')).toHaveCount(ESQUEMAS.length);
}

async function abrirTodo(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('details')) d.open = true;
  });
}

async function axe(page: Page, incluir?: string): Promise<string[]> {
  let constructor = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ]);
  if (incluir !== undefined) constructor = constructor.include(incluir);
  const resultado = await constructor.analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

test.describe('página «Cómo se calcula»', () => {
  test('carga sin errores de consola ni peticiones externas, con las cuatro secciones en orden', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Cómo se calcula' })).toBeVisible();
    const ids = await page.locator('section.como-seccion').evaluateAll((n) => n.map((e) => e.id));
    expect(ids).toEqual(ESQUEMAS.map((e) => `como-${e.ancla}`));
    await expect(page.locator('#como-jubilacion figure.grafico').first()).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('cada sección tiene fuente, ejemplo calculado, lecturas con su estado y «Qué no calcula»', async ({
    page,
  }) => {
    await abrirPagina(page);
    for (const e of ESQUEMAS) {
      const s = page.locator(`#como-${e.ancla}`);
      await expect(s.locator('.como-parametros .linea-fuente')).toBeVisible();
      await expect(s.locator('.como-ejemplo').first()).toBeVisible();
      await expect(s.locator('.como-lectura').first()).toContainText(/Estado/);
      await expect(s.locator('.como-no-calcula')).toContainText('no calculadas aquí todavía');
      await expect(s.getByRole('link', { name: /«Tipos de pensión»/ })).toBeVisible();
      await expect(s.getByRole('link', { name: /«Tu pensión»/ })).toBeVisible();
    }
  });

  test('el resultado de un ejemplo coincide con el importe de su resumen', async ({ page }) => {
    await abrirPagina(page);
    const ejemplo = page.locator('#ejemplo-jub-ordinaria');
    await abrirTodo(page);
    const resumen = await ejemplo.locator(':scope > summary').innerText();
    const importe = await ejemplo.locator('.como-importe').innerText();
    expect(resumen).toContain(importe);
  });

  test('el índice se recorre con el teclado y mueve el foco al encabezado de la sección', async ({
    page,
  }) => {
    await abrirPagina(page);
    const indice = page.getByRole('navigation', { name: 'En esta página' });
    const enlaces = indice.getByRole('link');
    await expect(enlaces).toHaveCount(ESQUEMAS.length + 1);
    await enlaces.first().focus();
    await expect(enlaces.first()).toBeFocused();
    for (let i = 1; i < 3; i++) {
      await page.keyboard.press('Tab');
      await expect(enlaces.nth(i)).toBeFocused();
    }
    await page.keyboard.press('Enter');
    await expect(page.locator(`#como-${ESQUEMAS[1]!.ancla}-titulo`)).toBeFocused();
    await expect(page).toHaveURL(/#\/como-se-calcula$/);
  });

  test('los ejemplos se abren y se cierran con el teclado', async ({ page }) => {
    await abrirPagina(page);
    const ejemplo = page.locator('#como-incapacidad .como-ejemplo').nth(1);
    await expect(ejemplo).not.toHaveAttribute('open', '');
    await ejemplo.locator(':scope > summary').focus();
    await page.keyboard.press('Enter');
    await expect(ejemplo).toHaveAttribute('open', '');
    await expect(ejemplo.locator('table').first()).toBeVisible();
    await page.keyboard.press('Enter');
    await expect(ejemplo).not.toHaveAttribute('open', '');
  });

  test('el enlace a «Tu pensión» lleva al simulador', async ({ page }) => {
    await abrirPagina(page);
    await page
      .locator('#como-orfandad')
      .getByRole('link', { name: /«Tu pensión»/ })
      .click();
    await expect(page).toHaveURL(/#\/tu-pension$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Tu pensión' })).toBeVisible();
  });

  test('los tres gráficos de la jubilación tienen tabla, fuente y «Cómo leerlo»', async ({
    page,
  }) => {
    await abrirPagina(page);
    const figuras = page.locator('#como-jubilacion figure.grafico');
    expect(await figuras.count()).toBeGreaterThanOrEqual(3);
    for (let i = 0; i < (await figuras.count()); i++) {
      const f = figuras.nth(i);
      await expect(f.locator('figcaption')).toBeVisible();
      await expect(f.locator('details.grafico-datos table')).toHaveCount(1);
      await expect(f.locator('.linea-fuente')).toBeVisible();
    }
    await expect(page.locator('#como-jubilacion .como-leerlo').first()).toBeVisible();
  });

  test('axe de la página completa, sin infracciones de WCAG AA', async ({ page }) => {
    await abrirPagina(page);
    expect(await axe(page)).toEqual([]);
  });

  for (const e of ESQUEMAS) {
    test(`axe de la sección «${e.id}» con sus tablas y ejemplos abiertos`, async ({ page }) => {
      await abrirPagina(page);
      await abrirTodo(page);
      expect(await axe(page, `#como-${e.ancla}`)).toEqual([]);
    });
  }

  test('no desborda con las tablas y los ejemplos abiertos (en móvil y en escritorio)', async ({
    page,
  }) => {
    await abrirPagina(page);
    await abrirTodo(page);
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);
    const anchos = await page.evaluate(() =>
      [...document.querySelectorAll('section.como-seccion, .como-ejemplo')].map((s) => ({
        id: s.id,
        desborda: s.scrollWidth > s.clientWidth,
      })),
    );
    expect(anchos.filter((a) => a.desborda)).toEqual([]);
  });
});
