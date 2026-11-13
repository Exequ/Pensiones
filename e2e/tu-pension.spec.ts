import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

async function rellenar(page: Page, anioJubilacion = '2026') {
  await page.getByLabel('Mes de nacimiento').selectOption('11');
  await page.getByLabel('Año de nacimiento').fill('1961');
  await page.getByRole('radio', { name: 'Hombre' }).check({ force: true });
  await page.getByLabel('Mes de jubilación').selectOption('11');
  await page.getByLabel('Año de jubilación').fill(anioJubilacion);
  await page.getByLabel('Mes de inicio de la cotización').selectOption('11');
  await page.getByLabel('Año de inicio de la cotización').fill('1986');
  await page.getByLabel('Base mensual de cotización (euros)').fill('2500');
}

test.describe('Tu pensión', () => {
  test('flujo completo: rellenar, ver el resultado y la explicación', async ({ page }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(page.locator('.tp-cifra-principal dd')).toHaveText('2.721,39 €');
    await expect(page.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeVisible();
    await expect(page.locator('.tp-paso')).toHaveCount(7);
    await expect(page.getByRole('heading', { name: 'Supuestos y lecturas' })).toBeVisible();
    await expect(page.getByText('Estado: Provisional').first()).toBeVisible();
    await expect(page.getByText('Estado: Pendiente de decidir').first()).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Qué no tiene en cuenta el cálculo' }),
    ).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('el teclado basta para rellenar y calcular', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByLabel('Mes de nacimiento').focus();
    await page.keyboard.press('Tab');
    await expect(page.getByLabel('Año de nacimiento')).toBeFocused();
    await page.getByRole('button', { name: 'Calcular mi pensión' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByRole('alert').first()).toBeVisible();
    await expect(page.getByLabel('Mes de nacimiento')).toBeFocused();
  });

  test('errores de entrada: se anuncian y no hay resultado', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const alerta = page.getByRole('alert').first();
    await expect(alerta).toContainText('Hay datos que revisar');
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toHaveCount(0);
    await expect(page.locator('.campo-con-error').first()).toBeVisible();
  });

  test('error del motor: IPC supuesto ausente con jubilación lejana', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page, '2031');
    await page.getByLabel('IPC anual supuesto (%)').fill('');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const alerta = page.getByRole('alert');
    await expect(alerta.getByRole('heading', { name: 'Falta un IPC supuesto' })).toBeVisible();
    await expect(alerta).toContainText('Qué puedes hacer');
  });

  test('axe sin violaciones con el resultado a la vista', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      resultado.violations.map(
        (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  });

  test('axe sin violaciones con errores de formulario', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(resultado.violations.map((v) => v.id)).toEqual([]);
  });

  test('no desborda y los controles miden al menos 44 px', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await rellenar(page);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const raiz = document.documentElement;
      if (raiz.scrollWidth > raiz.clientWidth) salida.push('desborde horizontal del documento');
      for (const el of document.querySelectorAll<HTMLElement>(
        '.tp-formulario input[type="text"], .tp-formulario select, .tp-boton, .pildora-texto',
      )) {
        const caja = el.getBoundingClientRect();
        if (caja.height < 43.5) salida.push(`${el.tagName}.${el.className}: alto ${caja.height}`);
      }
      return salida;
    });
    expect(problemas).toEqual([]);
  });
});

async function datosBasicos(page: Page) {
  await page.getByLabel('Mes de nacimiento').selectOption('11');
  await page.getByLabel('Año de nacimiento').fill('1961');
  await page.getByRole('radio', { name: 'Hombre' }).check({ force: true });
  await page.getByLabel('Mes de jubilación').selectOption('11');
  await page.getByLabel('Año de jubilación').fill('2026');
}

async function rellenarTramo(
  page: Page,
  n: number,
  desde: [string, string],
  hasta: [string, string],
  importe: string,
) {
  const t = `Tramo ${String(n)}`;
  await page.getByLabel(`${t}, Desde: mes`).selectOption(desde[0]);
  await page.getByLabel(`${t}, Desde: año`).fill(desde[1]);
  await page.getByLabel(`${t}, Hasta: mes`).selectOption(hasta[0]);
  await page.getByLabel(`${t}, Hasta: año`).fill(hasta[1]);
  await page.getByLabel(`${t}, Base: importe en euros`).fill(importe);
}

test.describe('Tu pensión: carrera por tramos', () => {
  test('construir una carrera por tramos y ver el resultado y el gráfico', async ({ page }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await datosBasicos(page);
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await rellenarTramo(page, 1, ['11', '1986'], ['12', '2005'], '1200');
    await page.getByRole('button', { name: 'Añadir tramo' }).click();
    await expect(page.getByLabel('Tramo 2, Desde: mes')).toBeFocused();
    await rellenarTramo(page, 2, ['1', '2007'], ['10', '2026'], '2500');
    const resumen = page.locator('.tp-resumen-carrera');
    await expect(resumen).toContainText('Meses sin cotizar (lagunas)');
    await expect(resumen).toContainText('de enero de 2006 a diciembre de 2006');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(page.locator('.tp-cifra-principal dd')).toBeVisible();
    const figura = page.locator('figure.grafico');
    await expect(figura).toBeVisible();
    await expect(figura.locator('svg').first()).toBeVisible();
    await figura.getByText('Ver los datos del gráfico en una tabla').click();
    await expect(figura.getByRole('table')).toBeVisible();
    await expect(figura.getByRole('table').getByRole('row').nth(1)).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('elegir una persona-ejemplo, ver el resultado y editar su carrera', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await datosBasicos(page);
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await page
      .getByRole('button', { name: /Cargar la persona «Carrera con bases máximas»/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(page.getByText('Persona-ejemplo cargada:')).toBeVisible();
    await expect(page.getByText('Ilustrativo').first()).toBeVisible();
    const referencia = page.getByLabel('Tramo 1, Base: referencia');
    await expect(referencia).toHaveValue('maxima');
    const antes = await page.locator('.tp-resultado .tp-cifra').first().innerText();
    await referencia.selectOption('minima');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(referencia).toHaveValue('minima');
    expect(await page.locator('.tp-resultado .tp-cifra').first().innerText()).not.toEqual(antes);
  });

  test('error de solape: se anuncia y no hay resultado', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await datosBasicos(page);
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await rellenarTramo(page, 1, ['1', '2000'], ['12', '2010'], '1500');
    await page.getByRole('button', { name: 'Añadir tramo' }).click();
    await rellenarTramo(page, 2, ['6', '2008'], ['12', '2012'], '1800');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('alert').first()).toContainText(
      'Los tramos 1 y 2 se solapan entre junio de 2008 y diciembre de 2010',
    );
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toHaveCount(0);
    await expect(page.getByLabel('Tramo 2, Desde: año')).toBeFocused();
  });

  test('quitar y duplicar tramos con el teclado', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await rellenarTramo(page, 1, ['1', '2000'], ['12', '2005'], '1500');
    await page.getByRole('button', { name: 'Duplicar el tramo 1' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Tramo 2, Desde: año')).toHaveValue('2000');
    await page.getByRole('button', { name: 'Quitar el tramo 2' }).focus();
    await page.keyboard.press('Enter');
    await expect(page.getByLabel('Tramo 2, Desde: año')).toHaveCount(0);
  });

  test('vista móvil y de escritorio: sin desbordes, controles de 44 px y tarjetas en móvil', async ({
    page,
  }, info) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await datosBasicos(page);
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await page
      .getByRole('button', { name: /Cargar la persona «Carrera con una interrupción larga»/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const raiz = document.documentElement;
      if (raiz.scrollWidth > raiz.clientWidth) salida.push('desborde horizontal del documento');
      for (const el of document.querySelectorAll<HTMLElement>(
        '.tp-tramos input[type="text"], .tp-tramos select, .tp-tramos button, .tp-personas button, .tp-boton-secundario',
      )) {
        const caja = el.getBoundingClientRect();
        if (caja.height < 43.5) salida.push(`${el.tagName}.${el.className}: alto ${caja.height}`);
        if (caja.width < 43.5) salida.push(`${el.tagName}.${el.className}: ancho ${caja.width}`);
      }
      const svg = document.querySelector<SVGElement>('figure.grafico svg');
      if (svg && svg.getBoundingClientRect().right > raiz.clientWidth + 1) {
        salida.push('el gráfico se sale de la pantalla');
      }
      return salida;
    });
    expect(problemas).toEqual([]);
    if (info.project.name === 'movil') {
      // Las filas son tarjetas: la fila ocupa el ancho y sus celdas se apilan.
      const fila = page.locator('tr.tp-tramo').first();
      const display = await fila.evaluate((el) => getComputedStyle(el).display);
      expect(display).toBe('block');
    }
  });

  test('axe sin violaciones con la carrera por tramos, la persona cargada y el gráfico', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await datosBasicos(page);
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await page
      .getByRole('button', { name: /Cargar la persona «Carrera con bases máximas»/ })
      .click();
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(
      resultado.violations.map(
        (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
      ),
    ).toEqual([]);
  });

  test('axe sin violaciones con errores en los tramos', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await datosBasicos(page);
    await page.getByRole('radio', { name: 'Carrera por tramos' }).check({ force: true });
    await rellenarTramo(page, 1, ['1', '2000'], ['12', '2010'], '1500');
    await page.getByRole('button', { name: 'Añadir tramo' }).click();
    await rellenarTramo(page, 2, ['6', '2008'], ['12', '2012'], '1800');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    await expect(page.getByRole('alert').first()).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
      .analyze();
    expect(resultado.violations.map((v) => v.id)).toEqual([]);
  });
});
