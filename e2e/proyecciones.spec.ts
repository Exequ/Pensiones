import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { comprobarFuente, esperarPagina, irPorMenu, url, vigilar } from './utilidades.ts';

const RUTA = '/proyecciones';

/** Cadena `d` del trazado de las líneas del gráfico con el título dado (cambia si cambian los datos). */
async function trazos(page: Page, parte: string): Promise<string> {
  const figura = page.locator('figure.grafico', { hasText: parte }).first();
  return figura
    .locator('svg path')
    .evaluateAll((nodos) => nodos.map((n) => n.getAttribute('d') ?? '').join('|'));
}

test.describe('página «Proyecciones»', () => {
  test('carga sin errores de consola ni peticiones externas y tiene sus gráficos y tablas', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url(RUTA));
    await esperarPagina(page);
    await page.waitForLoadState('networkidle');

    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proyecciones');
    await expect(page.getByText('En construcción')).toHaveCount(0);
    const figuras = page.locator('figure.grafico');
    expect(await figuras.count()).toBeGreaterThanOrEqual(13);
    for (const figura of await figuras.all()) {
      await expect(figura.locator('figcaption')).not.toBeEmpty();
      await expect(figura.locator('svg[role="img"]')).toHaveCount(1);
      await expect(figura.locator('table')).toHaveCount(1);
      await comprobarFuente(figura);
      await expect(figura.locator('.linea-fuente')).toContainText('naturaleza:');
    }
    // Cada gráfico tiene su «Cómo leerlo» justo después; el bloque financiero añade dos más (escenarios y calibración).
    await expect(page.locator('figure.grafico + .como-leerlo')).toHaveCount(await figuras.count());
    await expect(page.locator('details.proy-funciona')).toHaveCount(4);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('aparece en la navegación y se llega a ella desde el menú', async ({ page }) => {
    await page.goto(url('/'));
    await esperarPagina(page);
    // En móvil el menú está plegado tras el botón «Menú»; «Proyecciones» va en su grupo.
    await irPorMenu(page, 'Proyecciones');
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Proyecciones');
  });

  test('las proyecciones se distinguen de lo observado: rótulos en el gráfico y en la tabla', async ({
    page,
  }) => {
    await page.goto(url(RUTA));
    await esperarPagina(page);
    const figura = page.locator('figure.grafico', {
      hasText: 'Pensiones contributivas en vigor: total',
    });
    await expect(figura.locator('svg')).toContainText('Proyección →');
    await expect(figura.locator('svg')).toContainText('Observado');
    await expect(figura.locator('.linea-fuente')).toContainText('proyección de modelo propio');
    await figura.locator('summary').click();
    await expect(figura.locator('tbody tr', { hasText: 'Observado' }).first()).toBeVisible();
    await expect(figura.locator('tbody tr', { hasText: 'Proyección' }).first()).toBeVisible();
    // Lo posterior al horizonte de la demografía se rotula «ilustrativo».
    const demografia = page.locator('figure.grafico', {
      hasText: 'Población de mayores: observada',
    });
    await expect(demografia.locator('svg')).toContainText('ilustrativo');
  });

  test('el selector de escenarios demográficos cambia las curvas', async ({ page }) => {
    await page.goto(url(RUTA));
    await esperarPagina(page);
    const grupo = page.getByRole('group', { name: 'Escenario demográfico' });
    await expect(grupo.getByRole('radio')).toHaveCount(6);
    await expect(grupo.getByRole('radio', { name: 'INE (base)' })).toBeChecked();
    const antes = await trazos(page, 'Población de mayores en el escenario');
    await grupo.getByRole('radio', { name: 'sin migración' }).check();
    await expect(
      page.locator('.grafico-titulo', {
        hasText: 'Población de mayores en el escenario «sin migración»',
      }),
    ).toBeVisible();
    const despues = await trazos(page, 'Población de mayores en el escenario');
    expect(despues).not.toBe(antes);
    // Y también cambia la relación de dependencia del escenario.
    await expect(
      page.locator('.grafico-titulo', {
        hasText: 'Relación de dependencia de mayores en el escenario «sin migración»',
      }),
    ).toBeVisible();
  });

  test('los selectores de clase y año de M3 cambian el reparto por edad y sexo', async ({
    page,
  }) => {
    await page.goto(url(RUTA));
    await esperarPagina(page);
    const titulo = page.locator('.grafico-titulo', {
      hasText: 'Pensiones por grupo de edad y sexo',
    });
    const antes = await trazos(page, 'Pensiones por grupo de edad y sexo');
    await page
      .getByRole('group', { name: 'Clase de pensión' })
      .getByRole('radio', { name: 'Viudedad' })
      .check();
    await expect(titulo).toContainText('viudedad');
    const claseCambiada = await trazos(page, 'Pensiones por grupo de edad y sexo');
    expect(claseCambiada).not.toBe(antes);
    const anio = page.getByRole('combobox', { name: 'Año', exact: true });
    const opciones = await anio.locator('option').allTextContents();
    await anio.selectOption(opciones.at(-1) ?? '');
    await expect(titulo).toContainText(opciones.at(-1) ?? '');
    expect(await trazos(page, 'Pensiones por grupo de edad y sexo')).not.toBe(claseCambiada);
  });

  test('«Cómo funciona este modelo» se despliega con teclado', async ({ page }) => {
    await page.goto(url(RUTA));
    await esperarPagina(page);
    const plegable = page.locator('details.proy-funciona').first();
    await expect(plegable).not.toHaveAttribute('open', '');
    await plegable.locator('summary').focus();
    await page.keyboard.press('Enter');
    await expect(plegable).toHaveAttribute('open', '');
    await expect(plegable).toContainText('Qué se puede cambiar en el código');
  });

  test('no desborda horizontalmente y los gráficos caben en la ventana', async ({ page }) => {
    await page.goto(url(RUTA));
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

  test('los controles táctiles miden al menos 44 px', async ({ page }) => {
    await page.goto(url(RUTA));
    await esperarPagina(page);
    // El bloque financiero se carga bajo demanda: se espera a que esté para medir también sus controles.
    await page.getByRole('heading', { name: /^Sistema financiero/ }).waitFor();
    const pequenos = await page.evaluate(() =>
      [
        ...document.querySelectorAll<HTMLElement>(
          '.pildora-texto, .proy-selector select, details.proy-funciona > summary',
        ),
      ]
        .map((e) => ({ clase: e.className || e.tagName, alto: e.getBoundingClientRect().height }))
        .filter((e) => e.alto < 43.5),
    );
    expect(pequenos).toEqual([]);
  });

  test('cumple WCAG 2.1 AA (axe) con los plegables y las tablas abiertos y los selectores en uso', async ({
    page,
  }) => {
    // axe recorre una página con muchas tablas abiertas: en un ejecutor lento supera los 30 s por defecto.
    test.setTimeout(120_000);
    await page.goto(url(RUTA));
    await esperarPagina(page);
    await page.getByRole('heading', { name: /^Sistema financiero/ }).waitFor();
    await page
      .getByRole('group', { name: 'Escenario demográfico' })
      .getByRole('radio', { name: 'migración -50 %' })
      .check();
    await page
      .getByRole('group', { name: 'Clase de pensión' })
      .getByRole('radio', { name: 'Jubilación' })
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
