import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Fase RI: cajas «Interpretación» en /diseno (los dos registros de ejemplo) y apartado de
 * «Metodología», en los dos proyectos (escritorio, 1360 px, y móvil, 390 px).
 */

test.describe('Cajas «Interpretación»', () => {
  test('/diseno: las dos cajas de ejemplo, con nombre accesible, después de la tabla y sin desbordes ni infracciones de axe', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/diseno'));
    await esperarPagina(page);
    const autor = page.getByRole('region', { name: 'Interpretación: Ejemplo de caja del autor' });
    const atribuida = page.getByRole('region', {
      name: 'Interpretación: Ejemplo de caja atribuida a una publicación',
    });
    await autor.scrollIntoViewIfNeeded();
    await expect(autor).toBeVisible();
    await expect(atribuida).toBeVisible();
    await expect(autor.locator('.interpretacion-rotulo')).toHaveText('Interpretación');
    await expect(atribuida.locator('.interpretacion-rotulo')).toHaveText(
      'Interpretación de Autoría ficticia (2025)',
    );
    await expect(autor).toContainText('Criterio de cada valoración');
    await expect(autor).toContainText('Grado de confianza (escala provisional)');
    // Después de lo que interpretan, en el orden del documento.
    const despues = await page.evaluate(() => {
      const ancla = document.getElementById('diseno-interpretado');
      const cajas = [...document.querySelectorAll('[data-interpretacion]')];
      return (
        ancla !== null &&
        cajas.length === 2 &&
        cajas.every(
          (c) => (ancla.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0,
        )
      );
    });
    expect(despues).toBe(true);
    // Sin desbordes: ni la página ni las cajas.
    const desborda = await page.evaluate(
      () =>
        document.documentElement.scrollWidth > document.documentElement.clientWidth ||
        [...document.querySelectorAll('[data-interpretacion]')].some(
          (c) => c.scrollWidth > c.clientWidth + 1,
        ),
    );
    expect(desborda).toBe(false);
    // La fuente se abre como la de un gráfico.
    await atribuida.getByRole('button', { name: /^Fuentes?: Interpretación de/ }).click();
    await expect(page.getByRole('dialog')).toContainText(
      'Publicación ficticia para el laboratorio de diseño',
    );
    await page.keyboard.press('Escape');
    const axe = await new AxeBuilder({ page })
      .include('#cat-interpretacion')
      .include('[data-interpretacion]')
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      axe.violations.map((v) => `${v.id}: ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`),
    ).toEqual([]);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('/metodologia: apartado de las cajas con la escala provisional y sin interpretaciones publicadas', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/metodologia'));
    await esperarPagina(page);
    const seccion = page.locator('#met-interpretaciones');
    await expect(seccion.getByRole('heading', { level: 2 })).toHaveText(
      'Las cajas «Interpretación»',
    );
    await expect(seccion).toContainText('Juicio profesional');
    await expect(seccion).toContainText('Hoy no hay ninguna interpretación publicada.');
    await expect(page.locator('[data-interpretacion]')).toHaveCount(0);
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });
});
