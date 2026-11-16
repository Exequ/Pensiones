import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Motor: cambios de la revisión actuarial 3. Lo que ve la persona: la lectura nueva de la salvaguarda
 * de la DT 34.ª en el panel de «Tu pensión» (pendiente, con sus dos opciones y sin efecto en una
 * jubilación ordinaria) y el rótulo corregido de la sensibilidad de las mujeres en «Proyecciones».
 */

async function rellenar(page: Page) {
  await page.getByLabel('Mes de nacimiento').selectOption('11');
  await page.getByLabel('Año de nacimiento').fill('1961');
  await page.getByRole('radio', { name: 'Hombre' }).check();
  await page.getByLabel('Mes de jubilación').selectOption('11');
  await page.getByLabel('Año de jubilación').fill('2026');
  await page.getByLabel('Mes de inicio de la cotización').selectOption('11');
  await page.getByLabel('Año de inicio de la cotización').fill('1986');
  await page.getByLabel('Base mensual de cotización (euros)').fill('2500');
}

test.describe('Motor: cambios de la revisión actuarial 3', () => {
  test('«Tu pensión»: la lectura de la salvaguarda consta como pendiente, con A por defecto y sin efecto en este caso', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const lectura = page
      .locator('.tp-lectura')
      .filter({ hasText: 'Salvaguarda de la disposición transitoria' });
    await expect(lectura).toHaveCount(1);
    await expect(lectura).toContainText('Estado: Pendiente de decidir');
    await expect(lectura).toContainText('No afecta a tu resultado');
    await expect(lectura.getByRole('radio')).toHaveCount(2);
    await expect(
      lectura.getByRole('radio', { name: /Se compara con el resultado de las normas anteriores/ }),
    ).toBeChecked();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('«Tu pensión»: axe sin violaciones y sin desborde horizontal con la lectura nueva', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      resultado.violations.map(
        (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
    const desborde = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborde).toBe(false);
  });

  test('«Proyecciones»: la sensibilidad de las mujeres habla de tasas de afiliación y de cotización', async ({
    page,
  }) => {
    await page.goto(url('/proyecciones'));
    await esperarPagina(page);
    const tabla = page.getByRole('table', { name: /^Sensibilidades de M4 en / });
    await expect(tabla).toContainText(
      'tasas de afiliación y de cotización de las mujeres de 25 a 64 años igualan a las de los hombres de su tramo',
    );
    await expect(tabla).not.toContainText('tasas de empleo de las mujeres');
  });
});
