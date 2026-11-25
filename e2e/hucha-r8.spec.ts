/**
 * Fase R8: «La hucha» con las definiciones del módulo, las citas en «Fuentes» y las fórmulas. A 1360
 * y 390 px (los dos proyectos de Playwright): «Fuentes» de las reglas de dotación y de disposición
 * trae el literal de la norma (que no está en el cuerpo); una definición del módulo se ve con su
 * perímetro; una fórmula se ve con su leyenda y no desborda la página; una pasada de axe, también
 * con «Fuentes» abierto. Sin clic forzado ni plazos ajustados.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url('/hucha'));
  await esperarPagina(page);
  await expect(page.locator('#definicion-fondo-de-reserva')).toHaveCount(1);
}

async function paginaSinDesborde(page: Page): Promise<void> {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda, 'la página no desborda').toBe(false);
}

test.describe('«La hucha»: definiciones, «Fuentes» y fórmulas', () => {
  test('«Fuentes» de las reglas de dotación y de disposición trae el literal, que no está en el cuerpo', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    const cuerpo = page.locator('article');
    await expect(cuerpo).not.toContainText('nutrirá el Fondo de Reserva');
    await expect(cuerpo).not.toContainText('| 2033 |');
    await expect(cuerpo).not.toContainText(/\bart\.\s*\d|TRLGSS|\bRDL?\s*\d|Anexo\s*\d|D\.A\./);
    const casos = [
      {
        id: 'fondo-de-reserva',
        literal: 'nutrirá el Fondo de Reserva de la Seguridad Social',
        ubicacion: 'art. 127 bis.1 TRLGSS',
      },
      {
        id: 'fondo-de-reserva-limite-de-desembolso',
        literal: '| 2033 | 0,10% |',
        ubicacion: 'art. 121.2 TRLGSS',
      },
    ];
    for (const { id, literal, ubicacion } of casos) {
      const bloque = page.locator(`#definicion-${id}`);
      const boton = bloque.getByRole('button', { name: /^Fuentes?: Definición:/ });
      await boton.scrollIntoViewIfNeeded();
      await boton.click();
      const dialogo = page.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toContainText(literal);
      await expect(dialogo).toContainText(ubicacion);
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
    const bloque = page.locator('#definicion-fondo-de-reserva');
    await bloque.scrollIntoViewIfNeeded();
    await expect(bloque.locator('dfn')).toHaveText('Fondo de Reserva de la Seguridad Social');
    await expect(bloque.getByText('Incluye', { exact: true })).toBeVisible();
    await expect(bloque.getByText('No incluye', { exact: true })).toBeVisible();
    await expect(bloque.getByText('Criterio', { exact: true })).toBeVisible();
    await expect(bloque).toContainText('no existe un fondo separado');
    await paginaSinDesborde(page);
  });

  test('la fórmula de «Fondo menos deuda» se ve con su leyenda y no desborda', async ({ page }) => {
    await abrirPagina(page);
    const figura = page.locator('#definicion-fondo-menos-deuda figure.formula');
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
    // La del acumulado lleva un sumatorio con símbolos: también cabe.
    const acumulado = page.locator(
      '#definicion-deuda-mas-transferencias-acumuladas figure.formula',
    );
    await acumulado.scrollIntoViewIfNeeded();
    await expect(acumulado.locator('math[display="block"]')).toBeVisible();
    await paginaSinDesborde(page);
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
      .locator('#definicion-fondo-de-reserva-limite-de-desembolso')
      .getByRole('button', { name: /^Fuentes?: Definición:/ });
    await boton.scrollIntoViewIfNeeded();
    await boton.click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(informe(await new AxeBuilder({ page }).withTags(etiquetas).analyze())).toEqual([]);
  });
});
