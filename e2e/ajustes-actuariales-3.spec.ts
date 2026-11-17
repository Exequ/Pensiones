import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Ajustes actuariales 3 (tercera tanda de la revisión actuarial): textos de las páginas tocadas.
 * Cada prueba comprueba el texto nuevo, sin errores de consola ni peticiones externas.
 */

const PAGINAS = [
  '/cotizantes-y-pensionistas',
  '/financiacion-y-deficit',
  '/hucha',
  '/otros-sistemas',
  '/proyecciones',
  '/mitos-y-realidades',
] as const;

async function axe(page: Page): Promise<string[]> {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('details')) d.open = true;
  });
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

test.describe('Ajustes actuariales 3: páginas tocadas', () => {
  for (const ruta of PAGINAS) {
    test(`${ruta}: sin errores de consola ni peticiones externas y sin infracciones de axe`, async ({
      page,
    }) => {
      const registro = vigilar(page);
      await page.goto(url(ruta));
      await esperarPagina(page);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(registro.errores, 'errores de consola').toEqual([]);
      expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
      expect(await axe(page)).toEqual([]);
    });

    test(`${ruta}: en móvil no desborda`, async ({ browser }) => {
      const contexto = await browser.newContext({ viewport: { width: 390, height: 800 } });
      const page = await contexto.newPage();
      await page.goto(url(ruta));
      await esperarPagina(page);
      await page.waitForLoadState('networkidle');
      const desborda = await page.evaluate(
        () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
      );
      expect(desborda).toBe(false);
      await contexto.close();
    });
  }

  test('cotizantes: «afiliado» se define como una situación de alta, no como una persona', async ({
    page,
  }) => {
    await page.goto(url('/cotizantes-y-pensionistas'));
    await esperarPagina(page);
    const seccion = page.locator('#relacion').locator('xpath=ancestor::section[1]');
    await expect(seccion).toContainText('Una situación de alta en la Seguridad Social');
    await expect(seccion).toContainText('quien tiene más de un alta cuenta más de una vez');
  });

  test('financiación y déficit: la diferencia entre el saldo no financiero y el SEC no se concilia y no se habla de devengo', async ({
    page,
  }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    const seccion = page.locator('#saldos').locator('xpath=ancestor::section[1]');
    await expect(seccion).toContainText(
      'Con las fuentes consultadas no se puede conciliar esa diferencia',
    );
    await expect(seccion).toContainText('que cuentan como ingreso');
    await expect(seccion).not.toContainText(/devengo/i);
  });

  test('hucha: el año de los préstamos se deduce del plazo de cancelación y coincide con el registro en la ejecución', async ({
    page,
  }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    const seccion = page.locator('#prestamos').locator('xpath=ancestor::section[1]');
    await expect(seccion).toContainText('registra el préstamo como pasivo financiero de ingresos');
    await expect(seccion).toContainText('no es una fecha publicada en el anexo');
    await expect(page.locator('body')).toContainText(
      'es una deducción, porque los PDF no reclasifican',
    );
  });

  test('otros sistemas: dos ejes de clasificación y sin «mismo concepto» en el gasto', async ({
    page,
  }) => {
    await page.goto(url('/otros-sistemas'));
    await esperarPagina(page);
    const estructura = page.locator('#estructura').locator('xpath=ancestor::section[1]');
    await expect(estructura).toContainText('Dos ejes de clasificación');
    await expect(estructura).toContainText('prestación definida o aportación definida');
    const gasto = page.locator('#gasto').locator('xpath=ancestor::section[1]');
    await expect(gasto).toContainText('el perímetro de cada una no consta');
    await expect(gasto).not.toContainText('El mismo concepto');
  });

  test('proyecciones: la sensibilidad de 55 a 64 años habla de tasas de afiliación y de cotización', async ({
    page,
  }) => {
    await page.goto(url('/proyecciones'));
    await esperarPagina(page);
    const tabla = page.getByRole('table', { name: /^Sensibilidades de M4 en / });
    await expect(tabla).toContainText('tasas de afiliación y de cotización de 55 a 64 años');
    await expect(tabla).toContainText('el número de pensiones de M3 no cambia');
    await expect(tabla).not.toContainText('tasas de empleo de 55 a 64 años');
  });
});
