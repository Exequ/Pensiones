import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/** Fase 5-A2: la página «Hucha» frente a las transferencias del Estado. */

const GRAFICO_POSICION = 'figure.grafico:has(.grafico-titulo:text("Construcción ilustrativa"))';

/** Trazo de la línea de suma: el `path` más largo del gráfico (las barras son `rect`, los ejes `line`). */
async function datosDeLaLinea(page: import('@playwright/test').Page): Promise<string> {
  return page.locator(`${GRAFICO_POSICION} svg`).evaluate((svg) => {
    const trazos = [...svg.querySelectorAll('path')].map((p) => p.getAttribute('d') ?? '');
    return trazos.sort((a, b) => b.length - a.length)[0] ?? '';
  });
}

test.describe('página «Hucha»: transferencias', () => {
  test('carga sin errores de consola ni peticiones externas, con las secciones nuevas', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    for (const nombre of [
      /De dónde procede el dinero/,
      /transferencias del Estado a la Seguridad Social en el tiempo/,
      /El Fondo de Reserva frente a las transferencias/,
      /Una construcción ilustrativa/,
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: nombre })).toBeVisible();
    }
    await expect(page.locator(GRAFICO_POSICION)).toHaveCount(1);
    await expect(page.getByText('Construcción ilustrativa, no una cifra oficial.')).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('las casillas cambian la línea de suma y se manejan con el teclado', async ({ page }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    await page.locator(GRAFICO_POSICION).scrollIntoViewIfNeeded();
    const todas = await datosDeLaLinea(page);
    expect(todas.length).toBeGreaterThan(10);

    const deuda = page.getByRole('checkbox', { name: /Deuda con el Estado/ });
    await expect(deuda).toBeChecked();
    await deuda.focus();
    await page.keyboard.press('Space');
    await expect(deuda).not.toBeChecked();
    const sinDeuda = await datosDeLaLinea(page);
    expect(sinDeuda).not.toBe(todas);

    await page.getByRole('checkbox', { name: /Transferencias acumuladas/ }).uncheck();
    await page.getByRole('checkbox', { name: /Fondo de Reserva/ }).uncheck();
    await expect(page.locator(`${GRAFICO_POSICION} svg`)).toContainText(
      'Ningún componente seleccionado',
    );
  });

  test('el año de inicio cambia la tabla de la construcción', async ({ page }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    const selector = page.getByLabel('Año de inicio de las transferencias acumuladas', {
      exact: true,
    });
    const opciones = await selector.locator('option').allTextContents();
    const otro = opciones[3] ?? '';
    await selector.selectOption(otro);
    await expect(page.locator(`${GRAFICO_POSICION} thead`)).toContainText(`desde ${otro}`);
  });

  test('en móvil no desborda y las casillas tienen un objetivo táctil de 44 px', async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await contexto.newPage();
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    const medidas = await page.evaluate(() => {
      const raiz = document.documentElement;
      const fuera = [...document.querySelectorAll('figure.grafico svg')].filter(
        (s) => s.getBoundingClientRect().right > raiz.clientWidth + 1,
      ).length;
      return { desborda: raiz.scrollWidth > raiz.clientWidth, fuera };
    });
    expect(medidas).toEqual({ desborda: false, fuera: 0 });
    for (const casilla of await page.locator('.hucha-casilla').all()) {
      const caja = await casilla.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await contexto.close();
  });

  test('axe sin violaciones con las casillas y el selector en uso', async ({ page }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await page.getByRole('checkbox', { name: /Fondo de Reserva/ }).uncheck();
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
