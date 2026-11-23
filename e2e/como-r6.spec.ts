/**
 * Fase R6: «Cómo se calcula» con las normas en «Fuentes», las modalidades de la jubilación con su
 * fórmula y su leyenda, la tabla del efecto de adelantar o retrasar la jubilación y el enlace desde
 * «Tipos de pensión» al apartado de modalidades. A 1360 y 390 px (los dos proyectos de Playwright),
 * con una pasada de axe. Sin clic forzado ni plazos ajustados; los textos se leen de las constantes
 * de la página y los importes, de la propia página: no se escriben cifras aquí.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import {
  DESTINO_MODALIDADES,
  ID_MODALIDADES,
  TITULO_MODALIDADES,
} from '../src/modules/como-se-calcula/anclas-modalidades.ts';
import { abrirIndice, esperarPagina, url, vigilar } from './utilidades.ts';

const RUTA = '/como-se-calcula';
const TITULO_TABLA =
  'Cambio de la pensión de jubilación según los meses que se adelanta o se retrasa';
const ETIQUETAS_AXE = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url(RUTA));
  await esperarPagina(page);
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`#${ID_MODALIDADES}`)).toBeAttached();
}

async function paginaSinDesborde(page: Page): Promise<void> {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda, 'la página no desborda').toBe(false);
}

const informeAxe = (r: Awaited<ReturnType<AxeBuilder['analyze']>>) =>
  r.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );

test.describe('«Cómo se calcula»: citas, modalidades, fórmula y tabla del efecto', () => {
  test('«Fuentes» de un paso del esquema trae la norma con el paso como etiqueta; el cuerpo no la muestra', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    const seccion = page.locator('#como-jubilacion');
    await expect(seccion.locator('ol.como-pasos')).not.toContainText(
      /\bart\.|TRLGSS|\bDT\s*\d|Norma:/,
    );
    const boton = seccion.getByRole('button', { name: /^Fuentes?: Normas de cada paso/ });
    await boton.scrollIntoViewIfNeeded();
    await boton.click();
    const dialogo = page.getByRole('dialog');
    await expect(dialogo).toBeVisible();
    await expect(dialogo).toContainText('Se refiere a');
    await expect(dialogo).toContainText('Se comprueban los requisitos');
    await expect(dialogo).toContainText(/art\. 205/);
    await expect(dialogo).toContainText('Ubicación en el documento');
    await dialogo.getByRole('button', { name: 'Cerrar' }).click();
    await expect(dialogo).toBeHidden();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el apartado de modalidades muestra una fórmula con su leyenda y sin desbordar', async ({
    page,
  }) => {
    await abrirPagina(page);
    const apartado = page.locator(`#${ID_MODALIDADES}`);
    await expect(
      apartado.getByRole('heading', { level: 2, name: TITULO_MODALIDADES }),
    ).toBeVisible();
    const figura = page.locator('#como-modalidad-jubilacion-anticipada-voluntaria figure.formula');
    await figura.scrollIntoViewIfNeeded();
    await expect(figura.locator('math').first()).toBeVisible();
    expect(
      await figura.locator('math[display="block"]').first().getAttribute('aria-label'),
    ).toMatch(/pensión es igual a/i);
    await expect(figura.getByText('Qué significa cada símbolo')).toBeVisible();
    await expect(figura.locator('dl.formula-leyenda').first().locator('dt')).not.toHaveCount(0);
    await paginaSinDesborde(page);
    // La demora lleva la leyenda de cifras, con el umbral leído de los datos.
    const demora = page.locator('#como-modalidad-jubilacion-demorada figure.formula');
    await expect(demora.getByText('Qué significa cada cifra')).toBeAttached();
    await expect(demora).toContainText('Cotización acumulada que separa los dos importes');
  });

  test('la tabla del efecto de los meses se ve con su nota, su fuente y «Cómo leerlo»', async ({
    page,
  }) => {
    await abrirPagina(page);
    const tabla = page.getByRole('table', { name: TITULO_TABLA });
    await tabla.scrollIntoViewIfNeeded();
    await expect(tabla).toBeVisible();
    await expect(tabla.getByRole('columnheader').first()).toHaveText('Meses');
    expect(await tabla.locator('tbody tr').count()).toBeGreaterThan(24);
    const bloque = page.locator('.como-efecto');
    await expect(bloque.locator('.tabla-datos-pie')).toContainText('Qué no incluye.');
    await expect(bloque.locator('.tabla-datos-pie')).toContainText(
      /pensión máxima, el complemento a mínimos ni la salvaguarda/,
    );
    await expect(
      bloque.getByRole('button', { name: /^Fuentes?: Cambio de la pensión/ }),
    ).toBeVisible();
    await expect(bloque.locator('.como-leerlo')).toBeVisible();
    // Enlace al simulador, que calcula la jubilación ordinaria.
    await expect(bloque.getByRole('link', { name: /«Tu pensión»/ })).toBeVisible();
    await paginaSinDesborde(page);
  });

  test('el enlace de la lectura de la salvaguarda lleva a ella sin cambiar la dirección', async ({
    page,
  }) => {
    await abrirPagina(page);
    const antes = await page.evaluate(() => window.location.hash);
    await page
      .locator('.como-efecto')
      .getByRole('link', { name: 'ver la lectura y su estado' })
      .click();
    await expect(page.locator('#como-jubilacion .como-lectura h4:focus')).toHaveCount(1);
    expect(await page.evaluate(() => window.location.hash)).toBe(antes);
  });

  test('el enlace de «Tipos de pensión» llega al apartado de modalidades sin añadir nada a la dirección', async ({
    page,
  }) => {
    await page.goto(url('/tipos-de-pension'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    await page
      .locator('#ficha-jubilacion')
      .getByRole('link', { name: `«${TITULO_MODALIDADES}»` })
      .click();
    const titulo = page.locator(`#${DESTINO_MODALIDADES}`);
    await expect(page.getByRole('heading', { level: 1, name: 'Cómo se calcula' })).toBeVisible();
    await expect(titulo).toBeFocused();
    await expect(titulo).toBeInViewport();
    // La dirección es la de la página, sin «#ancla» ni query añadidos.
    expect(await page.evaluate(() => window.location.hash)).toBe(`#${RUTA}`);
  });

  test('el índice lleva al apartado sin tocar los parámetros del hash', async ({ page }) => {
    await page.goto(url(`${RUTA}?v=1&p=prueba`));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    const antes = await page.evaluate(() => window.location.hash);
    const indice = await abrirIndice(page);
    await indice.getByRole('link', { name: TITULO_MODALIDADES }).click();
    await expect(page.locator(`#${DESTINO_MODALIDADES}`)).toBeFocused();
    expect(await page.evaluate(() => window.location.hash)).toBe(antes);
  });

  test('axe sin violaciones, con la página, con «Fuentes» abierto y con las modalidades', async ({
    page,
  }) => {
    await abrirPagina(page);
    expect(informeAxe(await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze())).toEqual(
      [],
    );
    await page
      .locator('#como-jubilacion')
      .getByRole('button', { name: /^Fuentes?: Normas de cada paso/ })
      .click();
    await expect(page.getByRole('dialog')).toBeVisible();
    expect(informeAxe(await new AxeBuilder({ page }).withTags(ETIQUETAS_AXE).analyze())).toEqual(
      [],
    );
  });
});
