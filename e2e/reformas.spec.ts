import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Fase «Reformas»: la página carga sin errores, se recorre con el teclado, no desborda en móvil con
 * todas las tablas abiertas y cumple axe (WCAG AA). Las normas se leen de la cronología de /data y
 * los textos, de la propia página: no se escriben cifras aquí.
 */

const RUTA = '/reformas';
const IDS = (
  JSON.parse(
    readFileSync(path.resolve(import.meta.dirname, '../data/normativa/cronologia.json'), 'utf8'),
  ) as { normas: { id: string }[] }
).normas.map((n) => n.id);

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url(RUTA));
  await esperarPagina(page);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('article.ref-ficha')).toHaveCount(IDS.length);
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

test.describe('página «Reformas»', () => {
  test('carga sin errores de consola ni peticiones externas, con una ficha por norma en orden', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Reformas' })).toBeVisible();
    const ids = await page.locator('article.ref-ficha').evaluateAll((n) => n.map((e) => e.id));
    expect(ids).toEqual(IDS.map((id) => `ref-${id}`));
    await expect(page.locator('.ref-graficos figure.grafico').first()).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('todas las fichas tienen los mismos apartados, fechas, cita y fuente', async ({ page }) => {
    await abrirPagina(page);
    const fichas = page.locator('article.ref-ficha');
    for (let i = 0; i < IDS.length; i++) {
      const f = fichas.nth(i);
      await expect(f.locator('h3')).toHaveText([
        'La norma',
        'Qué cambia',
        'Parámetros afectados: valor antes y valor después en /data',
        'Calendario de aplicación',
        'Dónde se explica en esta web',
      ]);
      await expect(f.locator('.ref-datos dt')).toHaveCount(5);
      await expect(f.locator('.ref-cambio blockquote').first()).toBeVisible();
      await expect(f.locator(':scope > .linea-fuente')).toBeVisible();
      await expect(f.locator('.ref-aviso')).toContainText('no equivale a un efecto');
    }
  });

  test('la línea del tiempo se recorre con el teclado y mueve el foco al encabezado de la ficha', async ({
    page,
  }) => {
    await abrirPagina(page);
    const enlaces = page.getByRole('navigation', { name: 'Línea del tiempo' }).getByRole('link');
    await expect(enlaces).toHaveCount(IDS.length);
    await enlaces.first().focus();
    await expect(enlaces.first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(enlaces.nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(`#ref-${IDS[1]}-titulo`)).toBeFocused();
    await expect(page).toHaveURL(/#\/reformas$/);
  });

  test('los enlaces a «Cómo se calcula» y a «Tipos de pensión» llevan a esas páginas', async ({
    page,
  }) => {
    await abrirPagina(page);
    const ficha = page.locator('#ref-ley-27-2011');
    await ficha.getByRole('link', { name: 'Tipos de pensión' }).click();
    await expect(page).toHaveURL(/#\/tipos-de-pension$/);
    await page.goBack();
    await esperarPagina(page);
    await page.locator('#ref-ley-27-2011').getByRole('link', { name: 'Cómo se calcula' }).click();
    await expect(page).toHaveURL(/#\/como-se-calcula$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cómo se calcula' })).toBeVisible();
  });

  test('los tres gráficos tienen tabla, fuente y «Cómo leerlo»', async ({ page }) => {
    await abrirPagina(page);
    const figuras = page.locator('.ref-graficos figure.grafico');
    expect(await figuras.count()).toBe(3);
    for (let i = 0; i < 3; i++) {
      const f = figuras.nth(i);
      await expect(f.locator('figcaption')).toBeVisible();
      await expect(f.locator('details.grafico-datos table')).toHaveCount(1);
      await expect(f.locator('.linea-fuente')).toBeVisible();
    }
    await expect(page.locator('.ref-graficos .como-leerlo').first()).toBeVisible();
  });

  test('las tablas de cada ficha se abren con «Cómo leerlo» y tienen fuente', async ({ page }) => {
    await abrirPagina(page);
    const tabla = page.locator('#ref-ley-27-2011 .ref-tabla').first();
    await expect(tabla.locator('table')).toBeVisible();
    await expect(tabla.locator('.linea-fuente')).toBeVisible();
    const resumen = tabla.locator('details > summary');
    await resumen.focus();
    await page.keyboard.press('Enter');
    await expect(tabla.locator('details')).toHaveAttribute('open', '');
    await expect(tabla.locator('details')).toContainText('no dice cómo afecta');
  });

  test('axe de la página completa, con todo abierto, sin infracciones de WCAG AA', async ({
    page,
  }) => {
    await abrirPagina(page);
    await abrirTodo(page);
    expect(await axe(page)).toEqual([]);
  });

  for (const id of ['ley-26-1985', 'ley-27-2011', 'rdl-2-2023', 'rd-241-2026']) {
    test(`axe de la ficha «${id}» con sus tablas abiertas`, async ({ page }) => {
      await abrirPagina(page);
      await abrirTodo(page);
      expect(await axe(page, `#ref-${id}`)).toEqual([]);
    });
  }

  test('no desborda con las tablas abiertas (en móvil y en escritorio)', async ({ page }) => {
    await abrirPagina(page);
    await abrirTodo(page);
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);
    const anchos = await page.evaluate(() =>
      [...document.querySelectorAll('article.ref-ficha, .ref-graficos figure')].map((s) => ({
        id: s.id,
        desborda: s.scrollWidth > s.clientWidth,
      })),
    );
    expect(anchos.filter((a) => a.desborda)).toEqual([]);
  });
});
