import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/** Fase 5-A2: la página «Hucha» frente a las transferencias del Estado. */

const GRAFICO_POSICION = 'figure.grafico:has(.grafico-titulo:text("Suma conjunta"))';
const GRAFICO_FONDO_MENOS_DEUDA = 'figure.grafico:has(.grafico-titulo:text("Fondo menos deuda"))';
const GRAFICO_APOYO = 'figure.grafico:has(.grafico-titulo:text("Apoyo financiero del Estado"))';

/** Activa la suma conjunta (opción desactivada por defecto). */
async function activarSumaConjunta(page: import('@playwright/test').Page): Promise<void> {
  await page.getByRole('checkbox', { name: /Mostrar la suma conjunta/ }).check();
}

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
      /dos lecturas separadas/,
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: nombre })).toBeVisible();
    }
    await expect(page.locator(GRAFICO_FONDO_MENOS_DEUDA)).toHaveCount(1);
    await expect(page.locator(GRAFICO_APOYO)).toHaveCount(1);
    // La suma conjunta es una opción: desactivada por defecto y sin gráfico hasta que se activa.
    await expect(
      page.getByRole('checkbox', { name: /Mostrar la suma conjunta/ }),
    ).not.toBeChecked();
    await expect(page.locator(GRAFICO_POSICION)).toHaveCount(0);
    await expect(page.getByText(/Construcciones ilustrativas, no cifras oficiales/)).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('la casilla de la suma conjunta muestra el aviso reforzado al activarla y la oculta al desactivarla', async ({
    page,
  }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await activarSumaConjunta(page);
    await expect(page.locator(GRAFICO_POSICION)).toHaveCount(1);
    await expect(page.getByText(/no son aditivas/).first()).toBeVisible();
    await expect(
      page.getByText(/esta suma junta un activo \(el Fondo\), un pasivo \(la deuda\)/),
    ).toBeVisible();
    await page.getByRole('checkbox', { name: /Mostrar la suma conjunta/ }).uncheck();
    await expect(page.locator(GRAFICO_POSICION)).toHaveCount(0);
  });

  test('las casillas cambian la línea de suma y se manejan con el teclado', async ({ page }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    await activarSumaConjunta(page);
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

  test('el año de inicio cambia la tabla del apoyo financiero del Estado', async ({ page }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    const selector = page.getByLabel('Año de inicio de las transferencias acumuladas', {
      exact: true,
    });
    const opciones = await selector.locator('option').allTextContents();
    const otro = opciones[3] ?? '';
    await selector.selectOption(otro);
    await expect(page.locator(`${GRAFICO_APOYO} thead`)).toContainText(`desde ${otro}`);
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
    await activarSumaConjunta(page);
    for (const casilla of await page.locator('.hucha-casilla').all()) {
      const caja = await casilla.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
    }
    await contexto.close();
  });

  test('axe sin violaciones con las casillas y el selector en uso', async ({ page }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await activarSumaConjunta(page);
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
