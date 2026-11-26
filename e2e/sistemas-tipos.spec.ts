import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { comprobarFuente, esperarPagina, url, vigilar } from './utilidades.ts';

/** Fase 5-C: páginas «Otros sistemas» y «Tipos de pensión». */

const TIEMPO = 30_000;
const BARRAS_REPOSICION_BRUTA =
  'figure.grafico:has(.grafico-titulo:text("Tasa de reposición bruta teórica"))';

async function abrirTablas(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('details')) d.open = true;
  });
}

async function filasDeTabla(page: Page, selector: string): Promise<number> {
  return page.locator(`${selector} tbody tr`).count();
}

test.describe('página «Otros sistemas»', () => {
  test('carga sin errores de consola ni peticiones externas, con sus gráficos y tablas', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/otros-sistemas'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    for (const nombre of [
      /Qué países se comparan/,
      /Gasto en pensiones sobre el PIB según cada fuente/,
      /Edad de jubilación/,
      /Tasa de reposición teórica/,
      /Cómo se organizan los sistemas/,
    ]) {
      await expect(page.getByRole('heading', { level: 2, name: nombre })).toBeVisible({
        timeout: TIEMPO,
      });
    }
    expect(await page.locator('figure.grafico').count()).toBeGreaterThanOrEqual(7);
    expect(await page.locator('figure.grafico svg[role="img"]').count()).toBe(
      await page.locator('figure.grafico').count(),
    );
    for (const f of await page.locator('figure.grafico').all()) {
      await comprobarFuente(f);
      await expect(f.locator('table')).toHaveCount(1);
    }
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el selector de países cambia los países de los gráficos y de las tablas', async ({
    page,
  }) => {
    await page.goto(url('/otros-sistemas'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    const antes = await filasDeTabla(page, BARRAS_REPOSICION_BRUTA);
    expect(antes).toBeGreaterThan(1);
    await expect(page.locator(`${BARRAS_REPOSICION_BRUTA} svg`)).not.toContainText('Polonia');

    await page.getByRole('checkbox', { name: 'Polonia' }).check();
    await expect(page.locator(`${BARRAS_REPOSICION_BRUTA} svg`)).toContainText('Polonia', {
      timeout: TIEMPO,
    });
    expect(await filasDeTabla(page, BARRAS_REPOSICION_BRUTA)).toBe(antes + 1);
    await expect(page.getByRole('heading', { level: 3, name: 'Polonia' })).toBeVisible();

    await page.getByRole('button', { name: 'Solo España' }).click();
    await expect(page.locator(`${BARRAS_REPOSICION_BRUTA} svg`)).not.toContainText('Polonia', {
      timeout: TIEMPO,
    });
    expect(await filasDeTabla(page, BARRAS_REPOSICION_BRUTA)).toBe(1);
    await expect(page.getByRole('checkbox', { name: 'España' })).toBeDisabled();

    await page.getByRole('button', { name: 'Elegir todos' }).click();
    await expect(page.locator(`${BARRAS_REPOSICION_BRUTA} svg`)).toContainText('Media OCDE', {
      timeout: TIEMPO,
    });
  });

  test('el año, el sexo y el nivel de salario cambian los gráficos', async ({ page }) => {
    await page.goto(url('/otros-sistemas'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    const grupoAnio = page.getByRole('group', { name: 'Año de la comparación entre países' });
    await grupoAnio.getByRole('radio', { name: '2010' }).check();
    await expect(page.locator('figure.grafico .grafico-titulo').first()).toContainText('2010', {
      timeout: TIEMPO,
    });

    const grupoNivel = page.getByRole('group', { name: 'Nivel de salario de la persona modelo' });
    await grupoNivel.getByRole('radio', { name: '2 veces el salario medio' }).check();
    await expect(
      page.locator(BARRAS_REPOSICION_BRUTA.replace('bruta teórica', 'bruta teórica, 2 veces')),
    ).toHaveCount(1, {
      timeout: TIEMPO,
    });

    const grupoPlanes = page.getByRole('group', { name: 'Planes que se incluyen' });
    await grupoPlanes.getByRole('radio', { name: 'Obligatorios y voluntarios' }).check();
    const grupoSexoReposicion = page.getByRole('group', { name: 'Sexo' }).nth(1);
    await grupoSexoReposicion.getByRole('radio', { name: 'Mujeres' }).check();
    await expect(page.getByText(/solo para hombres/)).toBeVisible();
    await expect(
      grupoPlanes.getByRole('radio', { name: 'Obligatorios y voluntarios' }),
    ).toBeDisabled();
  });

  test('en móvil no desborda con las tablas abiertas y los controles miden al menos 44 px', async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await contexto.newPage();
    await page.goto(url('/otros-sistemas'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    await abrirTablas(page);
    const medidas = await page.evaluate(() => {
      const raiz = document.documentElement;
      const fuera = [...document.querySelectorAll('figure.grafico svg')].filter(
        (s) => s.getBoundingClientRect().right > raiz.clientWidth + 1,
      ).length;
      return { desborda: raiz.scrollWidth > raiz.clientWidth, fuera };
    });
    expect(medidas).toEqual({ desborda: false, fuera: 0 });
    for (const control of await page
      .locator('.sistemas-casilla, .sistemas-boton, .pildora')
      .all()) {
      const caja = await control.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(43.5);
    }
    await contexto.close();
  });

  test('axe sin violaciones con las tablas abiertas', async ({ page }) => {
    await page.goto(url('/otros-sistemas'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    await abrirTablas(page);
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

test.describe('página «Tipos de pensión»', () => {
  test('carga sin errores de consola ni peticiones externas, con una ficha por prestación', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/tipos-de-pension'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    await expect(page.locator('article.tipos-ficha')).toHaveCount(7, { timeout: TIEMPO });
    for (const f of await page.locator('article.tipos-ficha').all()) {
      await expect(f.locator('table').first()).toBeVisible();
      await comprobarFuente(f);
    }
    // Solo la jubilación y la incapacidad permanente enlazan a «Tu pensión».
    await expect(page.locator('.tipos-ficha a[href$="#/tu-pension"]')).toHaveCount(2);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el enlace de la ficha de jubilación abre «Tu pensión»', async ({ page }) => {
    await page.goto(url('/tipos-de-pension'));
    await esperarPagina(page);
    await page
      .locator('#ficha-jubilacion')
      .getByRole('link', { name: /Estimar esta pensión/ })
      .click();
    await expect(page.getByRole('heading', { level: 1, name: 'Tu pensión' })).toBeVisible({
      timeout: TIEMPO,
    });
  });

  test('en móvil no desborda y las tablas se desplazan dentro de su región', async ({
    browser,
  }) => {
    const contexto = await browser.newContext({ viewport: { width: 390, height: 800 } });
    const page = await contexto.newPage();
    await page.goto(url('/tipos-de-pension'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);
    await contexto.close();
  });

  test('axe sin violaciones', async ({ page }) => {
    await page.goto(url('/tipos-de-pension'));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');
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
