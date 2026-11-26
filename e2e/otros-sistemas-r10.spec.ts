/**
 * Fase R10: «Otros sistemas» con las citas en «Fuentes», las definiciones del módulo y las fórmulas.
 * A 1360 y 390 px (los dos proyectos de Playwright): «Fuentes» de un gráfico de países trae el literal
 * de la medida (que no está en el cuerpo); una definición del módulo se ve con su criterio; una fórmula
 * se ve con su leyenda y no desborda la página; «Fuentes» de un país en la estructura trae la cita; una
 * pasada de axe. Sin clic forzado ni plazos ajustados.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url('/otros-sistemas'));
  await esperarPagina(page);
  await expect(page.locator('#definicion-reparto')).toHaveCount(1);
}

async function paginaSinDesborde(page: Page): Promise<void> {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda, 'la página no desborda').toBe(false);
}

test.describe('«Otros sistemas»: definiciones, «Fuentes» y fórmulas', () => {
  test('«Fuentes» de un gráfico de países trae el literal de la medida, que no está en el cuerpo', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    const cuerpo = page.locator('article.pagina');
    await expect(cuerpo).not.toContainText('Effective labour market exit age');
    await expect(cuerpo).not.toContainText('Public expenditure on pensions');
    await expect(cuerpo).not.toContainText('spr_exp_func');
    await expect(cuerpo).not.toContainText(/tabla \d+\.\d+|panel [AB]\b|ficha por país/);
    const casos = [
      {
        titulo: 'Edad efectiva de salida del mercado laboral',
        literal: 'Effective labour market exit age',
      },
      { titulo: 'según la OCDE, ', literal: 'Public expenditure on pensions' },
    ];
    for (const { titulo, literal } of casos) {
      const figura = page.locator('figure.grafico', {
        has: page.locator('.grafico-titulo', { hasText: titulo }),
      });
      await figura.first().scrollIntoViewIfNeeded();
      const boton = figura.first().getByRole('button', { name: /^Fuentes?:/ });
      await boton.click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toContainText(literal);
      await expect(dialogo).toContainText('Se refiere a');
      await expect(dialogo).toContainText('Ubicación en el documento');
      await paginaSinDesborde(page);
      await dialogo.getByRole('button', { name: 'Cerrar' }).click();
      await expect(dialogo).toBeHidden();
      await expect(boton).toBeFocused();
    }
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('una definición del módulo se ve con su término, su perímetro y su criterio', async ({
    page,
  }) => {
    await abrirPagina(page);
    const bloque = page.locator('#definicion-edad-efectiva-de-salida-del-mercado-laboral-ocde');
    await bloque.scrollIntoViewIfNeeded();
    await expect(bloque.locator('dfn')).toHaveText(
      'Edad efectiva de salida del mercado laboral (OCDE)',
    );
    await expect(bloque.getByText('Sin detalle en las fuentes', { exact: true })).toBeVisible();
    await expect(bloque.getByText('Criterio', { exact: true })).toBeVisible();
    await expect(bloque).toContainText('no a la edad en que se empieza a cobrar una pensión');
    await paginaSinDesborde(page);
  });

  test('la fórmula de «Diferencia con España» se ve con su leyenda y no desborda', async ({
    page,
  }) => {
    await abrirPagina(page);
    const figura = page.locator('#definicion-diferencia-con-espana figure.formula');
    await figura.scrollIntoViewIfNeeded();
    const ecuacion = figura.locator('math[display="block"]');
    await expect(ecuacion).toHaveCount(1);
    await expect(ecuacion).toBeVisible();
    await expect(figura.getByText('Qué significa cada símbolo')).toBeVisible();
    await expect(figura.locator('dl.formula-leyenda dt')).toHaveCount(3);
    await paginaSinDesborde(page);
    const [cajaAncho, figuraAncho] = await Promise.all([
      figura.locator('.formula-caja').evaluate((e) => e.getBoundingClientRect().width),
      figura.evaluate((e) => e.getBoundingClientRect().width),
    ]);
    expect(cajaAncho).toBeLessThanOrEqual(figuraAncho + 1);
    // La del cociente entre pensión y salario lleva un producto y un cociente: también cabe.
    const cociente = page.locator(
      '#definicion-cociente-pension-media-salario-medio figure.formula',
    );
    await cociente.scrollIntoViewIfNeeded();
    await expect(cociente.locator('math[display="block"]')).toBeVisible();
    await paginaSinDesborde(page);
  });

  test('«Fuentes» de un país en la estructura trae la etiqueta, la cita y su ubicación', async ({
    page,
  }) => {
    await abrirPagina(page);
    const pais = page.locator('.sistemas-pais[aria-label="España"]');
    await pais.scrollIntoViewIfNeeded();
    await expect(pais.locator('blockquote')).toHaveCount(0);
    await expect(pais).not.toContainText('Overview of the pension system');
    const boton = pais.getByRole('button', { name: /^Fuentes?:/ });
    await boton.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('Se refiere a');
    await expect(dialogo).toContainText('pay-as-you-go');
    await expect(dialogo).toContainText('Overview of the pension system');
    await paginaSinDesborde(page);
    await dialogo.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dialogo).toBeHidden();
  });

  test('axe sin violaciones, con la página y con «Fuentes» de una definición abierto', async ({
    page,
  }) => {
    await abrirPagina(page);
    await page.waitForLoadState('networkidle');
    const etiquetas = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
    const informe = (r: Awaited<ReturnType<AxeBuilder['analyze']>>) =>
      r.violations.map(
        (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      );
    expect(informe(await new AxeBuilder({ page }).withTags(etiquetas).analyze())).toEqual([]);
    const boton = page
      .locator('#definicion-cuentas-nocionales')
      .getByRole('button', { name: /^Fuentes?: Definición:/ });
    await boton.scrollIntoViewIfNeeded();
    await boton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(informe(await new AxeBuilder({ page }).withTags(etiquetas).analyze())).toEqual([]);
  });
});
