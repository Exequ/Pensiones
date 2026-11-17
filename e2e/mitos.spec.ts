import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Fase «Mitos y realidades»: la página carga sin errores, se recorre con el teclado, no desborda en
 * móvil con las tablas abiertas y cumple axe (WCAG AA). Las afirmaciones se leen del catálogo, no
 * se escriben aquí.
 */

const RUTA = '/mitos-y-realidades';
const catalogo = JSON.parse(
  readFileSync(
    path.resolve(import.meta.dirname, '../data/mitos/afirmaciones-circulantes.json'),
    'utf8',
  ),
) as { mitos: { id: string; enunciado: string }[] };
const MITOS = catalogo.mitos;

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url(RUTA));
  await esperarPagina(page);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('section.mito')).toHaveCount(MITOS.length);
}

async function abrirTablas(page: Page): Promise<void> {
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

test.describe('página «Mitos y realidades»', () => {
  test('carga sin errores de consola ni peticiones externas, con una tarjeta por afirmación y en el orden del catálogo', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Mitos y realidades' })).toBeVisible();
    const ids = await page.locator('section.mito').evaluateAll((n) => n.map((e) => e.id));
    expect(ids).toEqual(MITOS.map((m) => m.id));
    await expect(page.locator('section.mito figure.grafico').first()).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el índice se recorre con el teclado y mueve el foco al encabezado de la afirmación', async ({
    page,
  }) => {
    await abrirPagina(page);
    const indice = page.getByRole('navigation', { name: 'Afirmaciones' });
    const enlaces = indice.getByRole('link');
    await expect(enlaces).toHaveCount(MITOS.length);
    // Se llega con Tab al primer enlace del índice y se recorre en el orden del catálogo.
    await enlaces.first().focus();
    await expect(enlaces.first()).toBeFocused();
    for (let i = 1; i < 4; i++) {
      await page.keyboard.press('Tab');
      await expect(enlaces.nth(i)).toBeFocused();
    }
    await page.keyboard.press('Enter');
    await expect(page.locator(`#${MITOS[3]!.id}-titulo`)).toBeFocused();
    // La ruta no cambia (HashRouter): sigue siendo la página de la sección.
    await expect(page).toHaveURL(/#\/mitos-y-realidades$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Mitos y realidades' })).toBeVisible();
  });

  test('los enlaces a otras páginas llevan a la sección indicada', async ({ page }) => {
    await abrirPagina(page);
    const enlace = page.locator(`#${MITOS[0]!.id} .mito-enlaces a`).first();
    const destino = await enlace.getAttribute('href');
    expect(destino).toMatch(/^#\/[a-z-]+$/);
    await enlace.click();
    await expect(page).toHaveURL(new RegExp(`${destino}$`));
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
  });

  test('la tarjeta del IPC declara los huecos y no muestra ningún acumulado', async ({ page }) => {
    await abrirPagina(page);
    const tarjeta = page.locator('#pensiones-siempre-con-el-ipc');
    await expect(tarjeta).toContainText('no muestra ningún acumulado');
    await expect(tarjeta.locator('figure.grafico')).toHaveCount(1);
    await expect(tarjeta.locator('table').first()).toBeVisible();
  });

  test('la tarjeta de «cobran más de lo cotizado» solo tiene el marco: sin gráficos', async ({
    page,
  }) => {
    await abrirPagina(page);
    const tarjeta = page.locator('#jubilados-cobran-mas-de-lo-cotizado');
    await expect(tarjeta.locator('figure.grafico')).toHaveCount(0);
    await expect(tarjeta.locator('.como-leerlo').first()).toBeVisible();
    await expect(tarjeta.locator('.linea-fuente').first()).toBeVisible();
  });

  test('axe de la página completa, sin infracciones de WCAG AA', async ({ page }) => {
    await abrirPagina(page);
    expect(await axe(page)).toEqual([]);
  });

  for (const mito of MITOS) {
    test(`axe de la tarjeta «${mito.id}» con sus tablas abiertas`, async ({ page }) => {
      await abrirPagina(page);
      await abrirTablas(page);
      expect(await axe(page, `#${mito.id}`)).toEqual([]);
    });
  }

  test('en móvil no desborda con las tablas abiertas', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'movil', 'solo en la ventana de móvil');
    await abrirPagina(page);
    await abrirTablas(page);
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);
    // Ningún bloque de las tarjetas se sale de su columna (las tablas se desplazan dentro de su región).
    const anchos = await page.evaluate(() =>
      [...document.querySelectorAll('section.mito')].map((s) => ({
        id: s.id,
        desborda: s.scrollWidth > s.clientWidth,
      })),
    );
    expect(anchos.filter((a) => a.desborda)).toEqual([]);
  });
});
