/**
 * Fase R7: «Financiación y déficit» con el módulo de definiciones. A 1360 y 390 px (los dos
 * proyectos de Playwright): «Fuentes» de las definiciones del saldo trae el literal de la fuente (que
 * no se ve en el cuerpo); una definición del módulo se ve con su perímetro; una fórmula se ve con su
 * leyenda y no desborda la página; una pasada de axe, también con «Fuentes» abierto. Sin clic
 * forzado ni plazos ajustados.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url('/financiacion-y-deficit'));
  await esperarPagina(page);
  await expect(page.locator('.definicion-modulo')).toHaveCount(12);
}

async function paginaSinDesborde(page: Page): Promise<void> {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda, 'la página no desborda').toBe(false);
}

test.describe('«Financiación y déficit»: definiciones, «Fuentes» y fórmulas', () => {
  test('«Fuentes» de las definiciones del saldo trae el literal, que no está en el cuerpo', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    const cuerpo = page.locator('article');
    await expect(cuerpo).not.toContainText('TOTAL INGRESOS');
    await expect(cuerpo).not.toContainText('net lending/net borrowing');
    await expect(cuerpo).not.toContainText(/ResumenP[IG]|\.xlsx|TRLGSS|\bart\.\s*\d/);
    const casos = [
      { id: 'saldo-presupuestario-total', literal: 'TOTAL INGRESOS / TOTAL GASTOS' },
      {
        id: 'capacidad-necesidad-financiacion-sec',
        literal:
          'The difference between total revenue and total expenditure equals net lending/net borrowing (B.9).',
      },
    ];
    for (const { id, literal } of casos) {
      const bloque = page.locator(`#definicion-${id}`);
      const boton = bloque.getByRole('button', { name: /^Fuentes?: Definición:/ });
      await boton.scrollIntoViewIfNeeded();
      await boton.click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toContainText(literal);
      await expect(dialogo).toContainText('Se refiere a');
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
    const bloque = page.locator('#definicion-gasto-pensiones-contributivas-con-complemento');
    await bloque.scrollIntoViewIfNeeded();
    await expect(bloque.locator('dfn')).toHaveText(
      'Gasto en pensiones contributivas del Sistema, con complemento a mínimos',
    );
    await expect(bloque.getByText('Incluye', { exact: true })).toBeVisible();
    await expect(bloque.getByText('No incluye', { exact: true })).toBeVisible();
    await expect(bloque.getByText('Criterio', { exact: true })).toBeVisible();
    await expect(bloque).toContainText('Las pensiones de Clases Pasivas.');
    await paginaSinDesborde(page);
  });

  test('la fórmula del saldo no financiero se ve con su leyenda y no desborda', async ({
    page,
  }) => {
    await abrirPagina(page);
    const figura = page.locator('#definicion-saldo-presupuestario-no-financiero figure.formula');
    await figura.scrollIntoViewIfNeeded();
    const ecuacion = figura.locator('math[display="block"]');
    await expect(ecuacion).toHaveCount(1);
    await expect(ecuacion).toBeVisible();
    expect(await ecuacion.getAttribute('aria-label')).toBe(
      'Saldo no financiero es igual a ingresos no financieros menos gastos no financieros.',
    );
    await expect(figura.getByText('Qué significa cada símbolo')).toBeVisible();
    await expect(figura.locator('dl.formula-leyenda dt')).toHaveCount(3);
    await paginaSinDesborde(page);
    const [cajaAncho, figuraAncho] = await Promise.all([
      figura.locator('.formula-caja').evaluate((e) => e.getBoundingClientRect().width),
      figura.evaluate((e) => e.getBoundingClientRect().width),
    ]);
    expect(cajaAncho).toBeLessThanOrEqual(figuraAncho + 1);
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
      .locator('#definicion-saldo-presupuestario-total')
      .getByRole('button', { name: /^Fuentes?: Definición:/ });
    await boton.scrollIntoViewIfNeeded();
    await boton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(informe(await new AxeBuilder({ page }).withTags(etiquetas).analyze())).toEqual([]);
  });
});
