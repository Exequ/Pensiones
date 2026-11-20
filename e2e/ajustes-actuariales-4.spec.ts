import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Ajustes actuariales 4 (cuarta tanda actuarial, bloque A): textos tocados, en los dos proyectos
 * (escritorio, 1360 px, y móvil, 390 px). Las cifras esperadas son las de /data (las recalculan los
 * tests unitarios del motor); aquí se comprueba que la página las muestra.
 *
 * El rango de la salvaguarda de la DT 34.ª no tiene prueba aquí: el formulario de «Tu pensión» solo
 * ofrece la jubilación ordinaria y el rango solo aparece en la anticipada voluntaria (se prueba con la
 * entrada del motor en src/modules/tu-pension/salvaguarda-dt34.test.ts; docs/DECISIONES.md).
 */

const TITULO_OPCION25 =
  'Último día en que rige la opción de calcular la base reguladora con los últimos 25 años (DT 4.ª.7)';
const EXPLICACION_OPCION25 =
  'Hasta 2043, si resulta más favorable, la base reguladora se calcula con la regla vigente el 1 de enero de 2023: las bases de los últimos 300 meses (25 años) divididas entre 350, sin descartar ninguna y con la integración de lagunas de esa regla. En 2041, 2042 y 2043 el periodo es de 306, 312 y 318 meses (divisores 357, 364 y 371).';

async function sinDesborde(page: Page) {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda).toBe(false);
}

async function axe(page: Page): Promise<string[]> {
  const r = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return r.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`);
}

test.describe('Ajustes actuariales 4', () => {
  test('Tu pensión: la opción de 25 años se explica con un periodo más corto y las cifras de /data', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByLabel('Mes de nacimiento').selectOption('11');
    await page.getByLabel('Año de nacimiento').fill('1961');
    await page.getByRole('radio', { name: 'Hombre' }).check();
    await page.getByLabel('Mes de jubilación').selectOption('11');
    await page.getByLabel('Año de jubilación').fill('2026');
    await page.getByLabel('Mes de inicio de la cotización').selectOption('11');
    await page.getByLabel('Año de inicio de la cotización').fill('1986');
    await page.getByLabel('Base mensual de cotización (euros)').fill('2500');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();

    const grupo = page.getByRole('group', { name: `Cómo se lee: ${TITULO_OPCION25}` });
    await expect(grupo).toHaveCount(1);
    await expect(grupo).toContainText(EXPLICACION_OPCION25);
    await expect(page.locator('main')).not.toContainText('periodo más largo');
    // El resultado de la jubilación ordinaria no se da como rango de la DT 34.ª.
    await expect(page.locator('.tp-cifra-principal dd')).not.toContainText('lectura');
    await sinDesborde(page);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('Tipos de pensión: brecha de la DA 37.ª calculada con las altas iniciales', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/tipos-de-pension'));
    await esperarPagina(page);
    const como = page.locator('.como-leerlo', { hasText: 'No miden la brecha de género' });
    await como.evaluate((e) => {
      const d = e.closest('details') ?? e.querySelector('details');
      if (d) d.open = true;
    });
    await expect(como).toContainText('fue del 18,5 % en 2025 (superior al 5 %)');
    await expect(como).toContainText(
      'la norma no precisa si el importe medio incluye complementos',
    );
    await sinDesborde(page);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('La hucha: diferencia acumulada del MEI sin desfase temporal', async ({ page }) => {
    const registro = vigilar(page);
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    const main = page.locator('main');
    await expect(main).toContainText(
      'la diferencia acumulada es de 715,03 millones de euros en 2024-2025',
    );
    await expect(main).toContainText('lo recaudado, no lo reconocido');
    await sinDesborde(page);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('Metodología: tres conceptos de confianza, sin errores ni infracciones de axe', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/metodologia'));
    await esperarPagina(page);
    for (const h of [
      'Confianza del dato',
      'Estado de la lectura de la norma',
      'Confianza de las salidas de los modelos',
    ])
      await expect(page.getByRole('heading', { level: 3, name: h })).toBeVisible();
    await sinDesborde(page);
    expect(await axe(page)).toEqual([]);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });
});
