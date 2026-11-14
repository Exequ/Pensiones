import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

const RUTA = '/proyecciones';
const ENCABEZADO = /^Sistema financiero/;

/** Cadena `d` del trazado de las líneas del gráfico cuyo título contiene el texto (cambia con los datos). */
async function trazos(page: Page, parte: string): Promise<string> {
  const figura = page.locator('figure.grafico', { hasText: parte }).first();
  return figura
    .locator('svg path')
    .evaluateAll((nodos) => nodos.map((n) => n.getAttribute('d') ?? '').join('|'));
}

async function abrirBloque(page: Page): Promise<void> {
  await page.goto(url(RUTA));
  await esperarPagina(page);
  await page.getByRole('heading', { name: ENCABEZADO }).waitFor();
}

const bloque = (page: Page) =>
  page.locator('section', { has: page.getByRole('heading', { name: ENCABEZADO }) });

test.describe('bloque «Sistema financiero (M4)» de «Proyecciones»', () => {
  test('aparece con sus gráficos, tablas, fuentes y notas, sin errores de consola ni peticiones externas', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirBloque(page);
    await page.waitForLoadState('networkidle');
    const seccion = bloque(page);
    const figuras = seccion.locator('figure.grafico');
    await expect(figuras).toHaveCount(8);
    for (const figura of await figuras.all()) {
      await expect(figura.locator('figcaption')).not.toBeEmpty();
      await expect(figura.locator('svg[role="img"]')).toHaveCount(1);
      await expect(figura.locator('table')).toHaveCount(1);
      await expect(figura.locator('.linea-fuente')).toContainText('descargado el');
      await expect(figura.locator('.linea-fuente')).toContainText('naturaleza:');
      await expect(figura.locator('.grafico-nota')).toContainText(
        'no es un dato observado ni una previsión',
      );
    }
    await expect(seccion.locator('.como-leerlo')).toHaveCount(8);
    await expect(seccion.locator('details.proy-funciona')).toHaveCount(1);
    await expect(seccion).toContainText('Cambio de definición del PIB');
    await expect(seccion).toContainText('no verificadas');
    await expect(seccion.locator('svg').first()).toContainText('Proyección');
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('se carga en un trozo aparte, solo al visitar «Proyecciones»', async ({ page }) => {
    const trozos: string[] = [];
    page.on('request', (peticion) => {
      if (/\/assets\/Financiero-[^/]+\.js$/.test(peticion.url())) trozos.push(peticion.url());
    });
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    expect(trozos, 'el trozo del bloque no debe cargarse en otras páginas').toEqual([]);
    await page.goto(url(RUTA));
    await esperarPagina(page);
    await page.getByRole('heading', { name: ENCABEZADO }).waitFor();
    expect(trozos.length).toBeGreaterThan(0);
  });

  test('el selector de unidad del gasto cambia las curvas y señala el cambio de PIB', async ({
    page,
  }) => {
    await abrirBloque(page);
    const grupo = page.getByRole('group', { name: 'Unidad', exact: true });
    await expect(grupo.getByRole('radio', { name: 'Euros corrientes' })).toBeChecked();
    const antes = await trazos(page, 'Gasto en pensiones contributivas: euros corrientes');
    await grupo.getByRole('radio', { name: 'Porcentaje del PIB' }).check();
    const figura = page.locator('figure.grafico', {
      hasText: 'Gasto en pensiones contributivas: porcentaje del PIB',
    });
    await expect(figura).toBeVisible();
    expect(await trazos(page, 'Gasto en pensiones contributivas: porcentaje del PIB')).not.toBe(
      antes,
    );
    await expect(figura.locator('svg')).toContainText('Proyección (otro PIB) →');
    await figura.locator('summary').click();
    await expect(figura.locator('thead')).toContainText('PIB utilizado');
    await expect(figura.locator('tbody')).toContainText('PIB corriente del INE');
    await expect(figura.locator('tbody')).toContainText('PIB aproximado');
  });

  test('el selector de euros constantes cambia la pensión media', async ({ page }) => {
    await abrirBloque(page);
    const antes = await trazos(page, 'Pensión media mensual: euros corrientes');
    await page
      .getByRole('group', { name: 'Tipo de euros' })
      .getByRole('radio', { name: 'Euros constantes' })
      .check();
    const figura = page.locator('figure.grafico', {
      hasText: 'Pensión media mensual: euros constantes de',
    });
    await expect(figura).toBeVisible();
    await expect(figura.locator('.grafico-descripcion')).toContainText(
      'IPC supuesto del escenario',
    );
    expect(await trazos(page, 'Pensión media mensual: euros constantes de')).not.toBe(antes);
  });

  test('el selector de unidad de los saldos cambia las curvas y añade el balance del Ageing Report', async ({
    page,
  }) => {
    await abrirBloque(page);
    const antes = await trazos(page, 'Saldos del sistema: euros corrientes');
    await page
      .getByRole('group', { name: 'Unidad de los saldos' })
      .getByRole('radio', { name: 'Porcentaje del PIB' })
      .check();
    const figura = page.locator('figure.grafico', {
      hasText: 'Saldos del sistema: porcentaje del PIB',
    });
    await expect(figura).toBeVisible();
    await expect(figura.locator('svg')).toContainText('Ageing Report');
    expect(await trazos(page, 'Saldos del sistema: porcentaje del PIB')).not.toBe(antes);
    await expect(bloque(page).getByText('Cambio de definición del PIB')).toHaveCount(2);
  });

  test('el contraste con el Ageing Report parte de cien y los candidatos figuran como no verificados', async ({
    page,
  }) => {
    await abrirBloque(page);
    const figura = page.locator('figure.grafico', { hasText: 'Gasto en pensiones sobre el PIB' });
    await figura.locator('summary').click();
    const primera = figura.locator('tbody tr').first();
    await expect(primera.locator('td').nth(1)).toHaveText('100,0');
    await expect(primera.locator('td').nth(2)).toHaveText('100,0');
    await expect(bloque(page)).toContainText('candidatos no verificados');
    await expect(bloque(page)).toContainText('no demuestra que sean su causa');
  });

  test('«Cómo funciona este modelo» se despliega con teclado', async ({ page }) => {
    await abrirBloque(page);
    const plegable = bloque(page).locator('details.proy-funciona');
    await expect(plegable).not.toHaveAttribute('open', '');
    await plegable.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(plegable).toHaveAttribute('open', '');
    await expect(plegable).toContainText('Qué se puede cambiar en el código');
    await expect(plegable).toContainText('Comprobaciones y pendientes');
  });

  for (const origen of [
    { ruta: '/hucha', nombre: 'Hucha' },
    { ruta: '/financiacion-y-deficit', nombre: 'Financiación y déficit' },
  ]) {
    test(`el enlace desde «${origen.nombre}» lleva al bloque financiero`, async ({ page }) => {
      await page.goto(url(origen.ruta));
      await esperarPagina(page);
      const enlace = page.getByRole('link', { name: '«Proyecciones»' });
      await enlace.scrollIntoViewIfNeeded();
      await enlace.click();
      await expect(page).toHaveURL(/#\/proyecciones$/);
      const titulo = page.getByRole('heading', { name: ENCABEZADO });
      await expect(titulo).toBeVisible();
      await expect(titulo).toBeInViewport();
    });
  }

  test('desde el bloque se enlaza a «Hucha» y a «Financiación y déficit»', async ({ page }) => {
    await abrirBloque(page);
    const seccion = bloque(page);
    await expect(seccion.getByRole('link', { name: '«Hucha»' })).toHaveAttribute(
      'href',
      /#\/hucha$/,
    );
    await expect(seccion.getByRole('link', { name: '«Financiación y déficit»' })).toHaveAttribute(
      'href',
      /#\/financiacion-y-deficit$/,
    );
  });

  test('no desborda horizontalmente y los gráficos y tablas del bloque caben en la ventana', async ({
    page,
  }) => {
    await abrirBloque(page);
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('details')) d.open = true;
    });
    const medidas = await page.evaluate(() => {
      const raiz = document.documentElement;
      const fuera = [...document.querySelectorAll('figure.grafico svg')].filter(
        (s) => s.getBoundingClientRect().right > raiz.clientWidth + 1,
      ).length;
      return { desborda: raiz.scrollWidth > raiz.clientWidth, fuera };
    });
    expect(medidas).toEqual({ desborda: false, fuera: 0 });
  });

  test('los controles del bloque miden al menos 44 px', async ({ page }) => {
    await abrirBloque(page);
    const pequenos = await bloque(page)
      .locator('.pildora-texto, details > summary')
      .evaluateAll((nodos) =>
        nodos
          .map((e) => ({ clase: e.getAttribute('class') ?? e.tagName, alto: e.getBoundingClientRect().height }))
          .filter((e) => e.alto < 43.5),
      );
    expect(pequenos).toEqual([]);
  });

  test('cumple WCAG 2.1 AA (axe) con los plegables abiertos y los selectores en uso', async ({
    page,
  }) => {
    await abrirBloque(page);
    await page
      .getByRole('group', { name: 'Unidad', exact: true })
      .getByRole('radio', { name: 'Porcentaje del PIB' })
      .check();
    await page
      .getByRole('group', { name: 'Tipo de euros' })
      .getByRole('radio', { name: 'Euros constantes' })
      .check();
    await page
      .getByRole('group', { name: 'Unidad de los saldos' })
      .getByRole('radio', { name: 'Porcentaje del PIB' })
      .check();
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
