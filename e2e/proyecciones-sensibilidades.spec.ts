import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

const RUTA = '/proyecciones';
const ENCABEZADO = /^Sistema financiero/;
const SUBTITULO = /^Sensibilidades: una palanca cada vez/;
const SELECTOR = 'Año de las sensibilidades';

async function abrirBloque(page: Page): Promise<void> {
  await page.goto(url(RUTA));
  await esperarPagina(page);
  await page.getByRole('heading', { name: ENCABEZADO }).waitFor();
}

const bloque = (page: Page) =>
  page.locator('section', { has: page.getByRole('heading', { name: ENCABEZADO }) });
const tabla = (page: Page) =>
  bloque(page).getByRole('table', { name: /^Sensibilidades de M4 en / });
const selector = (page: Page) => bloque(page).getByRole('combobox', { name: SELECTOR });

/** Contenido de las celdas de cifras de la tabla (cambia con el año). */
const cifras = (page: Page): Promise<string[]> => tabla(page).locator('tbody td').allTextContents();

test.describe('sensibilidades de M4 en «Proyecciones»', () => {
  test('la sección carga sin errores de consola ni peticiones externas, con la tabla y su fuente', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirBloque(page);
    await page.waitForLoadState('networkidle');
    await expect(bloque(page).getByRole('heading', { name: SUBTITULO })).toBeVisible();
    await expect(tabla(page)).toBeVisible();
    await expect(tabla(page).locator('tbody tr')).toHaveCount(11);
    await expect(tabla(page).locator('tr.destacada')).toHaveCount(0);
    const contenedor = tabla(page).locator(
      'xpath=ancestor::div[contains(@class,"proy-sensibilidades")][1]',
    );
    await expect(contenedor.locator('xpath=following-sibling::p[1]')).toContainText(
      'naturaleza: proyección de modelo',
    );
    const comoLeerlo = bloque(page).locator('.como-leerlo', {
      hasText: 'Cada fila cambia solo una palanca',
    });
    await expect(comoLeerlo).toContainText('Procedencia');
    await expect(comoLeerlo).toContainText('no, todavía no');
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el selector de año cambia las filas y el título de la tabla', async ({ page }) => {
    await abrirBloque(page);
    const opciones = await selector(page).locator('option').allTextContents();
    expect(opciones.length).toBeGreaterThan(2);
    const ultimo = opciones.at(-1)!;
    const primero = opciones[0]!;
    await expect(selector(page)).toHaveValue(ultimo);
    const antes = await cifras(page);
    await selector(page).selectOption(primero);
    await expect(tabla(page).locator('caption')).toContainText(
      `Sensibilidades de M4 en ${primero}:`,
    );
    await expect(tabla(page).locator('tbody tr')).toHaveCount(11);
    const despues = await cifras(page);
    expect(despues).not.toEqual(antes);
    await expect(
      bloque(page).locator('[aria-live="polite"]', { hasText: 'Año mostrado' }),
    ).toContainText(primero);
    await selector(page).selectOption(ultimo);
    expect(await cifras(page)).toEqual(antes);
  });

  test('no desborda horizontalmente con la tabla y los plegables abiertos', async ({ page }) => {
    await abrirBloque(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('details')) d.open = true;
    });
    await tabla(page).scrollIntoViewIfNeeded();
    const medidas = await page.evaluate(() => {
      const raiz = document.documentElement;
      return { desborda: raiz.scrollWidth > raiz.clientWidth };
    });
    expect(medidas).toEqual({ desborda: false });
    // La tabla desplazable es un control con foco por teclado (no se corta sin remedio).
    const region = bloque(page).getByRole('region', { name: /^Sensibilidades de M4 en / });
    await expect(region).toHaveAttribute('tabindex', '0');
  });

  test('cumple WCAG 2.1 AA (axe) con el selector en uso y los plegables abiertos', async ({
    page,
  }) => {
    // axe recorre una página con muchas tablas abiertas: en un ejecutor lento supera los 30 s por defecto.
    test.setTimeout(120_000);
    await abrirBloque(page);
    const opciones = await selector(page).locator('option').allTextContents();
    await selector(page).selectOption(opciones[0]!);
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('details')) d.open = true;
    });
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      resultado.violations.map(
        (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
