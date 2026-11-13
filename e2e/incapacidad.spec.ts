import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/** Total por enfermedad común: nacida en marzo de 1981, 26 años cotizados a 2.000 €, hecho causante en marzo de 2026. */
async function rellenar(page: Page, grado = 'Total', origen = 'Enfermedad común') {
  await page.getByRole('radio', { name: 'Incapacidad permanente' }).check({ force: true });
  await page.getByLabel('Mes de nacimiento').selectOption('3');
  await page.getByLabel('Año de nacimiento').fill('1981');
  await page.getByRole('radio', { name: 'Hombre' }).check({ force: true });
  await page.getByLabel('Mes del hecho causante').selectOption('3');
  await page.getByLabel('Año del hecho causante').fill('2026');
  await page.getByLabel('Mes de inicio de la cotización').selectOption('1');
  await page.getByLabel('Año de inicio de la cotización').fill('2000');
  await page.getByLabel('Base mensual de cotización (euros)').fill('2000');
  await page.getByRole('radio', { name: grado, exact: true }).check({ force: true });
  await page.getByRole('radio', { name: origen, exact: true }).check({ force: true });
}

async function calcular(page: Page, grado?: string, origen?: string) {
  await rellenar(page, grado, origen);
  await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
  await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
}

const grupo = (page: Page, titulo: string) =>
  page.getByRole('group', { name: `Cómo se lee: ${titulo}` });
const LAGUNAS_ANL = 'Meses sin cotizar dentro del periodo elegido en el accidente no laboral';
const pensionPrincipal = (page: Page) => page.locator('.tp-cifra-principal dd');

test.describe('Tu pensión: incapacidad permanente', () => {
  test('flujo completo: rellenar, ver el resultado y la explicación', async ({ page }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page);
    await expect(page.getByText('Porcentaje aplicable según el grado')).toBeVisible();
    await expect(page.getByText('Periodo mínimo de cotización exigido')).toBeVisible();
    await expect(pensionPrincipal(page)).toHaveText(/\d.*€$/);
    await expect(page.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeVisible();
    await expect(page.locator('.tp-paso').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: /Requisitos de la incapacidad/ })).toBeVisible();
    // Sin gráfico de bases (el motor no las expone), con la nota que lo explica.
    await expect(page.locator('#tp-bases')).toHaveCount(0);
    await expect(page.getByText(/no expone las bases mes a mes/)).toBeVisible();
    await expect(page.getByText(/tribunal médico/).first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Qué no tiene en cuenta el cálculo' }),
    ).toBeVisible();
    await expect(page.getByText(/contingencias profesionales/).first()).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('el selector de prestación se maneja con el teclado y muestra «próximamente» sin cifras', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    const g = page.getByRole('group', { name: 'Prestación' });
    await expect(g.getByRole('radio', { name: 'Jubilación ordinaria' })).toBeChecked();
    await expect(g.getByRole('radio', { name: 'Viudedad (próximamente)' })).toBeDisabled();
    await g.getByRole('radio', { name: 'Jubilación ordinaria' }).focus();
    await page.keyboard.press('ArrowRight');
    await expect(g.getByRole('radio', { name: 'Incapacidad permanente' })).toBeChecked();
    await expect(page.getByLabel('Mes del hecho causante')).toBeVisible();
  });

  test('accidente no laboral: junto al resultado, la lectura provisional con su estado y motivo', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page, 'Total', 'Accidente no laboral');
    await page.getByLabel('Meses sin cotizar (lagunas)').fill('70');
    await page
      .getByRole('radio', { name: 'Justo antes del hecho causante' })
      .check({ force: true });
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const bloque = page.locator('.tp-intervienen');
    await expect(bloque).toBeVisible();
    await expect(bloque).toContainText('Provisional');
    await expect(bloque).toContainText('Motivo del registro');
    await expect(bloque).toContainText('Efecto de la alternativa');
    await expect(bloque).toContainText(/sería/);
  });

  test('cambiar una lectura muestra la comparación con los valores por defecto', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page, 'Total', 'Accidente no laboral');
    await page.getByLabel('Meses sin cotizar (lagunas)').fill('70');
    await page
      .getByRole('radio', { name: 'Justo antes del hecho causante' })
      .check({ force: true });
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const antes = await pensionPrincipal(page).innerText();
    const bloque = page.locator('.tp-comparacion');
    await expect(bloque).toContainText('Todas las lecturas están en su valor por defecto.');
    await grupo(page, LAGUNAS_ANL)
      .getByRole('radio', { name: /Contarlos como cero/ })
      .check();
    await expect(bloque.getByRole('status')).toContainText('Has cambiado una lectura');
    await expect(bloque.getByRole('table')).toBeVisible();
    await expect(bloque).toContainText('no una recomendación');
    const despues = await pensionPrincipal(page).innerText();
    expect(despues).not.toBe(antes);
    // La columna de los valores por defecto conserva el resultado inicial.
    await expect(bloque.getByRole('row').nth(1).getByRole('cell').nth(1)).toHaveText(antes);
  });

  test('copiar el enlace de incapacidad y abrirlo en una pestaña nueva da el mismo resultado', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page, 'Absoluta');
    const pension = await pensionPrincipal(page).innerText();
    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await expect(page.getByText('Enlace copiado al portapapeles.')).toBeVisible();
    const enlace = await page.evaluate(() => navigator.clipboard.readText());
    expect(enlace).toContain('#/tu-pension?v=1&p=inc&');
    expect(enlace).toContain('gr=abs');
    const nueva = await context.newPage();
    const registro = vigilar(nueva);
    await nueva.goto(enlace);
    await esperarPagina(nueva);
    await expect(nueva.getByRole('radio', { name: 'Incapacidad permanente' })).toBeChecked();
    await expect(nueva.getByRole('radio', { name: 'Absoluta', exact: true })).toBeChecked();
    await expect(nueva.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(nueva.locator('.tp-cifra-principal dd')).toHaveText(pension);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('un enlace antiguo de jubilación (sin p=) sigue siendo una jubilación', async ({ page }) => {
    await page.goto(
      url(
        '/tu-pension?v=1&nac=1961-11&jub=2026-11&sex=h&car=s&ini=1986-11&lag=0&ubi=m&base=2500&med=media-cotizacion-rg&min=1&max=1&ipc=2',
      ),
    );
    await esperarPagina(page);
    await expect(page.getByRole('radio', { name: 'Jubilación ordinaria' })).toBeChecked();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(pensionPrincipal(page)).toHaveText('2.721,39 €');
    await expect(page.locator('.tp-paso')).toHaveCount(7);
  });

  test('errores: faltan grado y origen; y un hecho causante anterior a la cobertura del motor', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Incapacidad permanente' }).check({ force: true });
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const alerta = page.getByRole('alert').first();
    await expect(alerta).toContainText('Elige el grado de incapacidad.');
    await expect(alerta).toContainText('Elige el origen de la incapacidad.');
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toHaveCount(0);

    await rellenar(page);
    await page.getByLabel('Año del hecho causante').fill('2019');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByText('Este caso queda fuera del simulador')).toBeVisible();
    await expect(page.getByRole('alert').filter({ hasText: 'hecho causante' })).toBeVisible();
  });

  test('la parcial muestra una cantidad a tanto alzado', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page, 'Parcial');
    await expect(page.getByText('Cantidad a tanto alzado (pago único)')).toBeVisible();
    await expect(pensionPrincipal(page)).toHaveText(/€$/);
  });

  test('vista móvil y escritorio: sin desbordes y con objetivos táctiles de 44 px', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await calcular(page, 'Gran incapacidad', 'Accidente no laboral');
    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const raiz = document.documentElement;
      if (raiz.scrollWidth > raiz.clientWidth) salida.push('desborde horizontal del documento');
      for (const el of document.querySelectorAll<HTMLElement>(
        '.pildora-texto, .tp-opcion-etiqueta, .tp-boton',
      )) {
        if (el.closest('.pildora')?.querySelector('input:disabled')) continue;
        const caja = el.getBoundingClientRect();
        if (caja.height < 43.5) salida.push(`${el.className}: alto ${caja.height}`);
      }
      return salida;
    });
    expect(problemas).toEqual([]);
  });

  test('axe sin violaciones: formulario, resultado, lecturas y bloque de lecturas que intervienen', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Incapacidad permanente' }).check({ force: true });
    const configuracion = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
    const sinFormulario = await new AxeBuilder({ page }).withTags(configuracion).analyze();
    expect(sinFormulario.violations.map((v) => v.id + ': ' + v.help)).toEqual([]);
    await calcular(page, 'Total', 'Accidente no laboral');
    await grupo(page, LAGUNAS_ANL)
      .getByRole('radio', { name: /Contarlos como cero/ })
      .check();
    await expect(page.locator('.tp-comparacion').getByRole('table')).toBeVisible();
    const resultado = await new AxeBuilder({ page }).withTags(configuracion).analyze();
    expect(
      resultado.violations.map(
        (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  });
});
