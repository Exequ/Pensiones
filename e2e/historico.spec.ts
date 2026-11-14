import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/** Páginas históricas de la Fase 5-A y el mínimo de gráficos que debe tener cada una. */
const PAGINAS = [
  { ruta: '/cotizantes-y-pensionistas', titulo: 'Cotizantes y pensionistas', graficos: 10 },
  { ruta: '/financiacion-y-deficit', titulo: 'Financiación y déficit', graficos: 6 },
  { ruta: '/hucha', titulo: 'La «hucha» de las pensiones', graficos: 10 },
] as const;

for (const { ruta, titulo, graficos } of PAGINAS) {
  test.describe(`página ${ruta}`, () => {
    test('carga sin errores de consola ni peticiones externas y tiene sus gráficos y tablas', async ({
      page,
    }) => {
      const registro = vigilar(page);
      await page.goto(url(ruta));
      await esperarPagina(page);
      await page.waitForLoadState('networkidle');

      await expect(page.getByRole('heading', { level: 1 })).toHaveText(titulo);
      await expect(page.getByText('En construcción')).toHaveCount(0);

      const figuras = page.locator('figure.grafico');
      expect(await figuras.count()).toBeGreaterThanOrEqual(graficos);
      for (const figura of await figuras.all()) {
        await expect(figura.locator('figcaption')).not.toBeEmpty();
        await expect(figura.locator('svg[role="img"]')).toHaveCount(1);
        // La tabla de datos está dentro de un <details>: existe y se puede abrir.
        await expect(figura.locator('table')).toHaveCount(1);
        await expect(figura.locator('.linea-fuente')).toContainText('descargado el');
      }
      await expect(page.locator('.como-leerlo')).toHaveCount(await figuras.count());

      expect(registro.errores, 'errores de consola').toEqual([]);
      expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
    });

    test('la tabla de datos de un gráfico se abre y es una tabla con cabeceras', async ({
      page,
    }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      const primera = page.locator('figure.grafico').first();
      await primera.locator('summary').click();
      const tabla = primera.locator('table');
      await expect(tabla).toBeVisible();
      expect(await tabla.locator('th[scope="col"]').count()).toBeGreaterThan(1);
      expect(await tabla.locator('tbody tr').count()).toBeGreaterThan(3);
    });

    test('no desborda horizontalmente y los gráficos caben en la ventana', async ({ page }) => {
      await page.goto(url(ruta));
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
    });

    test('cumple WCAG 2.1 AA (axe) con las tablas de datos abiertas', async ({ page }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
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
}

test.describe('interacción', () => {
  test('«Cotizantes»: el selector de clase cambia el gráfico por edad', async ({ page }) => {
    await page.goto(url('/cotizantes-y-pensionistas'));
    await esperarPagina(page);
    const grupo = page.getByRole('group', { name: 'Clase de pensión' }).first();
    await grupo.getByRole('radio', { name: 'Jubilación' }).check({ force: true });
    await expect(page.locator('.grafico-titulo', { hasText: 'jubilación' }).first()).toBeVisible();
  });

  test('«Financiación»: el selector de unidades cambia a porcentaje del PIB', async ({ page }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Porcentaje del PIB' }).check({ force: true });
    await expect(
      page.locator('.grafico-descripcion', { hasText: 'porcentaje del PIB corriente' }).first(),
    ).toBeVisible();
  });
});
