import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

async function rellenar(page: Page) {
  await page.getByLabel('Mes de nacimiento').selectOption('11');
  await page.getByLabel('Año de nacimiento').fill('1961');
  await page.getByRole('radio', { name: 'Hombre' }).check({ force: true });
  await page.getByLabel('Mes de jubilación').selectOption('11');
  await page.getByLabel('Año de jubilación').fill('2026');
  await page.getByLabel('Mes de inicio de la cotización').selectOption('11');
  await page.getByLabel('Año de inicio de la cotización').fill('1986');
  await page.getByLabel('Base mensual de cotización (euros)').fill('2500');
}

async function calcular(page: Page) {
  await rellenar(page);
  await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
  await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
}

const grupo = (page: Page, titulo: string) =>
  page.getByRole('group', { name: `Cómo se lee: ${titulo}` });
const INTERPOLACION = 'Índice de precios de cada mes';
const FACTOR = 'Factor de actualización de las bases cuando los precios han bajado';

const pensionPrincipal = (page: Page) => page.locator('.tp-cifra-principal dd');

test.describe('Tu pensión: lecturas alternativas', () => {
  test('cambiar una lectura muestra la comparación con las lecturas por defecto', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page);
    await expect(pensionPrincipal(page)).toHaveText('2.721,39 €');
    const bloque = page.locator('.tp-comparacion');
    await expect(bloque).toContainText('Todas las lecturas están en su valor por defecto.');
    await expect(bloque.getByRole('table')).toHaveCount(0);

    await grupo(page, INTERPOLACION)
      .getByRole('radio', { name: /Medias anuales en escalones/ })
      .check();
    await expect(bloque.getByRole('status')).toContainText('Has cambiado una lectura');
    await expect(bloque.getByRole('table')).toBeVisible();
    await expect(bloque.getByRole('columnheader')).toHaveText([
      'Concepto',
      'Con tus lecturas',
      'Con las lecturas por defecto',
      'Diferencia (euros al mes)',
      'Diferencia (%)',
    ]);
    // La columna de las lecturas por defecto conserva el resultado de la 3-A.
    await expect(bloque.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveText('2.721,39 €');
    await expect(bloque).toContainText('no una recomendación');
    // El foco se queda en la opción elegida.
    await expect(
      grupo(page, INTERPOLACION).getByRole('radio', { name: /Medias anuales en escalones/ }),
    ).toBeFocused();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('el teclado basta: flechas dentro del grupo y espacio para elegir', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page);
    const g = grupo(page, FACTOR);
    await g.getByRole('radio', { name: /Con suelo igual a uno/ }).focus();
    await page.keyboard.press('ArrowDown');
    await expect(g.getByRole('radio', { name: /Sin suelo/ })).toBeChecked();
    await expect(page.locator('.tp-comparacion-frase')).toContainText('Has cambiado una lectura');
  });

  test('restablecer devuelve todas las lecturas al valor por defecto', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page);
    await grupo(page, INTERPOLACION)
      .getByRole('radio', { name: /escalones/ })
      .check();
    await grupo(page, FACTOR)
      .getByRole('radio', { name: /Sin suelo/ })
      .check();
    await expect(page.locator('.tp-comparacion-frase')).toContainText('Has cambiado 2 lecturas');
    await page.getByRole('button', { name: 'Restablecer lecturas' }).click();
    await expect(
      grupo(page, INTERPOLACION).getByRole('radio', { name: /Índice mensual publicado/ }),
    ).toBeChecked();
    await expect(
      grupo(page, FACTOR).getByRole('radio', { name: /Con suelo igual a uno/ }),
    ).toBeChecked();
    await expect(page.locator('.tp-comparacion-frase')).toContainText('Lecturas restablecidas');
    await expect(pensionPrincipal(page)).toHaveText('2.721,39 €');
  });

  test('vista móvil y de escritorio: sin desbordes y opciones de al menos 44 px', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page);
    await grupo(page, INTERPOLACION)
      .getByRole('radio', { name: /escalones/ })
      .check();
    await expect(page.locator('.tp-comparacion').getByRole('table')).toBeVisible();
    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const raiz = document.documentElement;
      if (raiz.scrollWidth > raiz.clientWidth) salida.push('desborde horizontal del documento');
      for (const el of document.querySelectorAll<HTMLElement>(
        '.tp-opcion-etiqueta, .tp-restablecer button, .tp-enlace textarea',
      )) {
        const caja = el.getBoundingClientRect();
        if (caja.height < 43.5) salida.push(`${el.className}: alto ${caja.height}`);
      }
      return salida;
    });
    expect(problemas).toEqual([]);
  });

  test('axe sin violaciones con las lecturas, la comparación y el enlace a la vista', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page);
    await grupo(page, FACTOR)
      .getByRole('radio', { name: /Sin suelo/ })
      .check();
    await expect(page.locator('.tp-comparacion').getByRole('table')).toBeVisible();
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

test.describe('Tu pensión: enlace compartible', () => {
  test('copiar el enlace y abrirlo en una pestaña nueva da el mismo resultado', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page);
    await grupo(page, FACTOR)
      .getByRole('radio', { name: /Sin suelo/ })
      .check();
    await expect(page.locator('.tp-comparacion-frase')).toContainText('Has cambiado una lectura');
    const pension = await pensionPrincipal(page).innerText();
    const frase = await page.locator('.tp-comparacion-frase').innerText();

    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await expect(page.getByText('Enlace copiado al portapapeles.')).toBeVisible();
    const enlace = await page.evaluate(() => navigator.clipboard.readText());
    expect(enlace).toContain('#/tu-pension?v=1&');
    expect(enlace).toContain('lec=jubilacion.actualizacionFactorMinimo:sin-suelo');
    expect(await page.getByLabel('Enlace a esta simulación').inputValue()).toBe(enlace);

    const nueva = await context.newPage();
    const registro = vigilar(nueva);
    await nueva.goto(enlace);
    await esperarPagina(nueva);
    await expect(nueva.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(nueva.getByLabel('Año de nacimiento')).toHaveValue('1961');
    await expect(nueva.getByLabel('Base mensual de cotización (euros)')).toHaveValue('2500');
    await expect(nueva.locator('.tp-cifra-principal dd')).toHaveText(pension);
    await expect(nueva.locator('.tp-comparacion-frase')).toHaveText(frase);
    await expect(grupo(nueva, FACTOR).getByRole('radio', { name: /Sin suelo/ })).toBeChecked();
    await expect(nueva.getByText('Qué se ha ignorado del enlace')).toHaveCount(0);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('un enlace de carrera por tramos se abre con sus tramos y el mismo resultado', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByLabel('Mes de nacimiento').selectOption('11');
    await page.getByLabel('Año de nacimiento').fill('1961');
    await page.getByRole('radio', { name: 'Hombre' }).check({ force: true });
    await page.getByLabel('Mes de jubilación').selectOption('11');
    await page.getByLabel('Año de jubilación').fill('2026');
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await page
      .getByRole('button', { name: /Cargar la persona «Carrera con bases máximas»/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const pension = await page.locator('.tp-resultado .tp-cifra').first().textContent();
    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    const enlace = await page.evaluate(() => navigator.clipboard.readText());
    expect(enlace).toMatch(/car=t&.*tr=/);
    const nueva = await context.newPage();
    await nueva.goto(enlace);
    await esperarPagina(nueva);
    await expect(nueva.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(nueva.locator('.tp-resultado .tp-cifra').first()).toHaveText(pension ?? '');
    await expect(nueva.getByLabel('Tramo 1, Base: referencia')).toHaveValue('maxima');
    await expect(nueva.getByText('Persona-ejemplo cargada:')).toBeVisible();
  });

  test('un enlace inválido carga los valores por defecto y avisa de qué se ha ignorado', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(
      url('/tu-pension?v=1&nac=1961-13&jub=2026-11&lec=jubilacion.noExiste:x&ipc=500'),
    );
    await esperarPagina(page);
    const aviso = page.locator('.tp-aviso-enlace');
    await expect(aviso).toBeVisible();
    await expect(aviso).toContainText('Qué se ha ignorado del enlace');
    await expect(aviso.getByRole('listitem')).toHaveCount(3);
    await expect(aviso).toContainText('jubilacion.noExiste');
    // Lo válido del enlace se carga; lo ignorado queda en su valor por defecto; la página no falla.
    await expect(page.getByLabel('Año de jubilación')).toHaveValue('2026');
    await expect(page.getByLabel('Año de nacimiento')).toHaveValue('');
    await expect(page.getByLabel('IPC anual supuesto (%)')).toHaveValue('2');
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toHaveCount(0);
    expect(registro.errores, 'errores de consola').toEqual([]);
  });

  test('una versión desconocida o un enlace roto no rompen la página', async ({ page }) => {
    const registro = vigilar(page);
    for (const ruta of [
      '/tu-pension?v=99&nac=1961-11',
      '/tu-pension?%E0%A4%A',
      '/tu-pension?basura',
    ]) {
      await page.goto(url(ruta));
      await esperarPagina(page);
      await expect(page.getByRole('heading', { level: 1, name: 'Tu pensión' })).toBeVisible();
      await expect(page.locator('.tp-aviso-enlace')).toContainText('se ha ignorado entero');
      await expect(page.getByLabel('Año de nacimiento')).toHaveValue('');
    }
    expect(registro.errores, 'errores de consola').toEqual([]);
  });

  test('axe sin violaciones con el aviso de enlace inválido', async ({ page }) => {
    await page.goto(url('/tu-pension?v=1&nac=xx&lec=jubilacion.noExiste:x'));
    await esperarPagina(page);
    await expect(page.locator('.tp-aviso-enlace')).toBeVisible();
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
