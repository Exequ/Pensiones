/**
 * Fase R5: «Tipos de pensión» con las citas en «Fuentes» y la fórmula legible. A 1360 y 390 px (los
 * dos proyectos de Playwright), en tres fichas distintas (jubilación, viudedad y pensión no
 * contributiva de jubilación): el desplegable de los requisitos contiene el artículo y el
 * requisito al que se refiere; la fórmula de la jubilación es visible con su leyenda y no desborda
 * la página; la ampliación de los gráficos sigue funcionando; una pasada de axe. Sin clic forzado
 * ni plazos ajustados.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

const FICHAS = [
  { ancla: 'jubilacion', titulo: 'Jubilación' },
  { ancla: 'viudedad', titulo: 'Viudedad' },
  { ancla: 'pnc-jubilacion', titulo: 'Pensión no contributiva de jubilación' },
] as const;

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url('/tipos-de-pension'));
  await esperarPagina(page);
  await expect(page.locator('article.tipos-ficha')).toHaveCount(7);
}

async function paginaSinDesborde(page: Page): Promise<void> {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda, 'la página no desborda').toBe(false);
}

test.describe('«Tipos de pensión»: citas en «Fuentes» y fórmula', () => {
  test('el cuerpo de las fichas no muestra artículos y «Fuentes» de los requisitos los trae', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    for (const { ancla } of FICHAS) {
      const ficha = page.locator(`#ficha-${ancla}`);
      await expect(ficha).not.toContainText(/\bart\.|\barts\.|TRLGSS|\bDT\s*\d/);
      // La tabla de requisitos no tiene columna «Norma».
      const tabla = ficha.getByRole('table', { name: /^Requisitos principales de la prestación/ });
      await expect(tabla.getByRole('columnheader')).toHaveText(['Requisito', 'Qué exige']);
      // «Fuentes» de los requisitos: el artículo, con el requisito como rótulo.
      const boton = ficha.getByRole('button', { name: /^Fuentes?: Requisitos principales/ });
      await boton.click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toContainText(/art\./);
      await expect(dialogo).toContainText('Se refiere a');
      await expect(dialogo).toContainText('Ubicación en el documento');
      const primerRequisito = await tabla.locator('tbody tr').first().locator('td').innerText();
      await expect(dialogo).toContainText(primerRequisito.slice(0, 40));
      await dialogo.getByRole('button', { name: 'Cerrar' }).click();
      await expect(dialogo).toBeHidden();
    }
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('la ficha de jubilación no lista modalidades y enlaza a «Cómo se calcula»', async ({
    page,
  }) => {
    await abrirPagina(page);
    const ficha = page.locator('#ficha-jubilacion');
    await expect(ficha).not.toContainText(/Jubilación parcial|Jubilación flexible/);
    await ficha.getByRole('link', { name: 'Cómo se calcula' }).click();
    await expect(page.getByRole('heading', { level: 1, name: 'Cómo se calcula' })).toBeVisible();
  });

  test('la fórmula de la jubilación es visible, tiene leyenda y no desborda', async ({ page }) => {
    await abrirPagina(page);
    const figura = page.locator('#ficha-jubilacion figure.formula');
    await figura.scrollIntoViewIfNeeded();
    await expect(figura.locator('math').first()).toBeVisible();
    await expect(figura.locator('math[display="block"]')).toHaveCount(2);
    const ecuacion = figura.locator('math[display="block"]').first();
    expect(await ecuacion.getAttribute('aria-label')).toMatch(/base reguladora es igual a/i);
    // Leyenda de símbolos y de cifras.
    await expect(figura.getByText('Qué significa cada símbolo')).toBeVisible();
    await expect(figura.getByText('Qué significa cada cifra')).toBeVisible();
    await expect(figura.locator('dl.formula-leyenda').first().locator('dt')).toHaveCount(6);
    // La fórmula se desplaza dentro de su caja: la página no se ensancha y la caja no la rebasa.
    await paginaSinDesborde(page);
    const caja = figura.locator('.formula-caja');
    const [cajaAncho, figuraAncho] = await Promise.all([
      caja.evaluate((e) => e.getBoundingClientRect().width),
      figura.evaluate((e) => e.getBoundingClientRect().width),
    ]);
    expect(cajaAncho).toBeLessThanOrEqual(figuraAncho + 1);
    // Fórmulas en las fichas sin fórmula cerrada: no hay (se mantiene la regla en texto).
    await expect(page.locator('#ficha-viudedad figure.formula')).toHaveCount(0);
    await expect(page.locator('#ficha-pnc-jubilacion figure.formula')).toHaveCount(0);
  });

  test('la ampliación de los gráficos sigue funcionando', async ({ page }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    const ampliar = page.getByRole('button', { name: /^Ampliar gráfico:/ }).first();
    await ampliar.scrollIntoViewIfNeeded();
    await ampliar.click();
    const dialogo = page.getByRole('dialog').first();
    await expect(dialogo).toBeVisible();
    await expect(dialogo.locator('svg').first()).toBeVisible();
    await paginaSinDesborde(page);
    await dialogo.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dialogo).toBeHidden();
  });

  test('axe sin violaciones, con la página y con «Fuentes» abierto', async ({ page }) => {
    await abrirPagina(page);
    await page.waitForLoadState('networkidle');
    const etiquetas = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
    const informe = (r: Awaited<ReturnType<AxeBuilder['analyze']>>) =>
      r.violations.map(
        (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      );
    expect(informe(await new AxeBuilder({ page }).withTags(etiquetas).analyze())).toEqual([]);
    await page
      .locator('#ficha-jubilacion')
      .getByRole('button', { name: /^Fuentes?: Requisitos principales/ })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(informe(await new AxeBuilder({ page }).withTags(etiquetas).analyze())).toEqual([]);
  });
});
