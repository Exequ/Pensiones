import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

async function rellenar(page: Page, anioJubilacion = '2026') {
  await page.getByLabel('Mes de nacimiento').selectOption('11');
  await page.getByLabel('Año de nacimiento').fill('1961');
  await page.getByRole('radio', { name: 'Hombre' }).check({ force: true });
  await page.getByLabel('Mes de jubilación').selectOption('11');
  await page.getByLabel('Año de jubilación').fill(anioJubilacion);
  await page.getByLabel('Mes de inicio de la cotización').selectOption('11');
  await page.getByLabel('Año de inicio de la cotización').fill('1986');
  await page.getByLabel('Base mensual de cotización (euros)').fill('2500');
}

test.describe('Tu pensión', () => {
  test('flujo completo: rellenar, ver el resultado y la explicación', async ({ page }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(page.locator('.tp-cifra-principal dd')).toHaveText('2.721,39 €');
    await expect(page.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeVisible();
    await expect(page.locator('.tp-paso')).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'Supuestos y lecturas' })).toBeVisible();
    await expect(page.getByText('Estado: Provisional').first()).toBeVisible();
    await expect(page.getByText('Estado: Pendiente de decidir').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Qué no tiene en cuenta el cálculo' }),
    ).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('el teclado basta para rellenar y calcular', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByLabel('Mes de nacimiento').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Año de nacimiento')).toBeFocused();
    await page.getByRole('button', { name: 'Calcular mi pensión' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByLabel('Mes de nacimiento')).toBeFocused();
  });

  test('errores de entrada: se anuncian y no hay resultado', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const alerta = page.getByRole('alert').first();
    await expect(alerta).toContainText('Hay datos que revisar');
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toHaveCount(0);
    await expect(page.locator('.campo-con-error').first()).toBeVisible();
  });

  test('error del motor: IPC supuesto ausente con jubilación lejana', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page, '2031');
    await page.getByLabel('IPC anual supuesto (%)').fill('');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const alerta = page.getByRole('alert');
    await expect(alerta.getByRole('heading', { name: 'Falta un IPC supuesto' })).toBeVisible();
    await expect(alerta).toContainText('Qué puedes hacer');
  });

  test('axe sin violaciones con el resultado a la vista', async ({ page }) => {
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
  });

  test('axe sin violaciones con errores de formulario', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(resultado.violations.map((v) => v.id)).toEqual([]);
  });

  test('no desborda y los controles miden al menos 44 px', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const raiz = document.documentElement;
      if (raiz.scrollWidth > raiz.clientWidth) salida.push('desborde horizontal del documento');
      for (const el of document.querySelectorAll<HTMLElement>(
        '.tp-formulario input[type="text"], .tp-formulario select, .tp-boton, .pildora-texto',
      )) {
        const caja = el.getBoundingClientRect();
        if (caja.height < 43.5) salida.push(`${el.tagName}.${el.className}: alto ${caja.height}`);
      }
      return salida;
    });
    expect(problemas).toEqual([]);
  });
});
