import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

const ETIQUETAS_WCAG = ['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'];
const pensionPrincipal = (page: Page) => page.locator('.tp-cifra-principal dd');
const grupo = (page: Page, nombre: string) => page.getByRole('group', { name: nombre });

/** Persona fallecida en alta, 16 años de cotización a 2.000 €, fallecida en marzo de 2026. */
async function rellenarCausante(page: Page, anio = '2026') {
  await page.getByLabel('Mes del fallecimiento').selectOption('3');
  await page.getByLabel('Año del fallecimiento').fill(anio);
  await grupo(page, 'Causa de la muerte').getByRole('radio', { name: 'Enfermedad común' }).check();
  await grupo(page, 'Situación de la persona fallecida')
    .getByRole('radio', { name: 'En alta o situación asimilada' })
    .check();
  await page.getByLabel('Mes de inicio de la cotización').selectOption('1');
  await page.getByLabel('Año de inicio de la cotización').fill('2010');
  await page.getByLabel('Base mensual de cotización (euros)').fill('2000');
}

async function rellenarViudo(page: Page) {
  await grupo(page, 'Vínculo con la persona fallecida')
    .getByRole('radio', { name: 'Cónyuge', exact: true })
    .check();
  await page.getByLabel('Mes de nacimiento de la persona viuda').selectOption('5');
  await page.getByLabel('Año de nacimiento de la persona viuda').fill('1976');
  await grupo(page, 'Sexo de la persona viuda').getByRole('radio', { name: 'Hombre' }).check();
  await page.getByLabel('Mes del matrimonio').selectOption('6');
  await page.getByLabel('Año del matrimonio').fill('2005');
}

async function viudedad(page: Page) {
  await page.getByRole('radio', { name: 'Viudedad', exact: true }).check();
  await rellenarCausante(page);
  await rellenarViudo(page);
  await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
  await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
}

async function orfandadConFamilia(page: Page) {
  await page.getByRole('radio', { name: 'Orfandad', exact: true }).check();
  await rellenarCausante(page);
  await page.getByLabel('Mes de nacimiento', { exact: true }).selectOption('1');
  await page.getByLabel('Año de nacimiento', { exact: true }).fill('2016');
  await page.getByRole('button', { name: 'Añadir huérfano' }).click();
  await page.getByLabel('Mes de nacimiento del huérfano 1').selectOption('6');
  await page.getByLabel('Año de nacimiento del huérfano 1').fill('2013');
  await grupo(page, '¿Sobrevive un cónyuge o pareja con derecho a viudedad?')
    .getByRole('radio', { name: 'Sí' })
    .check();
  await rellenarViudo(page);
  await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
  await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
}

test.describe('Tu pensión: viudedad', () => {
  test('flujo completo: rellenar, ver el resultado, la receta y las lecturas', async ({ page }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await viudedad(page);
    // 24 × 2.000 / 28 = 1.714,29; 52 % = 891,43.
    await expect(pensionPrincipal(page)).toHaveText('891,43 €');
    await expect(page.getByText('Porcentaje aplicado de la base reguladora')).toBeVisible();
    await expect(page.getByText('Base reguladora de la persona fallecida').first()).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeVisible();
    await expect(page.locator('.tp-paso')).toHaveCount(6);
    await expect(page.getByRole('heading', { name: 'Requisitos de la viudedad' })).toBeVisible();
    await expect(page.locator('#tp-bases')).toHaveCount(0);
    await expect(page.getByText(/no incluye el gráfico de bases/)).toBeVisible();
    // La sección de lecturas está siempre: aquí ninguna cambia el resultado y lo dice.
    await expect(
      page.getByRole('heading', { name: 'Lecturas abiertas que intervienen en tu resultado' }),
    ).toBeVisible();
    await expect(
      page.getByText(/Ninguna de las lecturas abiertas de esta prestación cambia/),
    ).toBeVisible();
    await expect(page.getByText('Qué lecturas de jubilación se aplican aquí')).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Qué no tiene en cuenta el cálculo' }),
    ).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('las preguntas aparecen según el vínculo y la situación de la persona fallecida', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Viudedad', exact: true }).check();
    const vinculo = grupo(page, 'Vínculo con la persona fallecida');
    await vinculo.getByRole('radio', { name: 'Pareja de hecho', exact: true }).check();
    await expect(page.getByLabel('Meses de convivencia estable e ininterrumpida')).toBeVisible();
    await expect(page.getByLabel('Mes del matrimonio')).toHaveCount(0);
    await vinculo.getByRole('radio', { name: 'Excónyuge', exact: true }).check();
    await expect(
      page.getByLabel('Pensión compensatoria anual que se extingue con la muerte (€)'),
    ).toBeVisible();
    await grupo(page, 'Situación de la persona fallecida')
      .getByRole('radio', { name: 'Pensionista de jubilación o de incapacidad permanente' })
      .check();
    await expect(page.getByLabel('Mes de inicio de la cotización')).toHaveCount(0);
    await expect(page.getByLabel('Base reguladora mensual de su pensión (€)')).toBeVisible();
  });

  test('cambiar una lectura muestra la comparación y la lectura entre las que intervienen', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Viudedad', exact: true }).check();
    await rellenarCausante(page);
    await grupo(page, 'Vínculo con la persona fallecida')
      .getByRole('radio', { name: 'Excónyuge', exact: true })
      .check();
    await page.getByLabel('Mes de nacimiento de la persona viuda').selectOption('5');
    await page.getByLabel('Año de nacimiento de la persona viuda').fill('1976');
    await grupo(page, 'Sexo de la persona viuda').getByRole('radio', { name: 'Mujer' }).check();
    await page
      .getByLabel('Pensión compensatoria anual que se extingue con la muerte (€)')
      .fill('6000');
    await grupo(page, 'Aplicar el complemento a mínimos')
      .getByRole('radio', { name: 'No' })
      .check();
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    // 6.000 / 14 pagas = 428,57 (anual) y 6.000 / 12 = 500,00 (mensual).
    await expect(pensionPrincipal(page)).toHaveText('428,57 €');
    const bloque = page.locator('.tp-intervienen');
    await expect(bloque).toContainText('Comparación de la viudedad con la pensión compensatoria');
    await expect(bloque).toContainText('Efecto de la alternativa');
    await expect(bloque).toContainText('Motivo del registro');
    await expect(bloque).toContainText('500,00');
    await expect(bloque).not.toContainText(/\b(mejor|peor|conviene|debes)\b/i);
    await page
      .getByRole('group', {
        name: 'Cómo se lee: Comparación de la viudedad con la pensión compensatoria',
      })
      .getByRole('radio', { name: /En importes mensuales/ })
      .check();
    await expect(pensionPrincipal(page)).toHaveText('500,00 €');
    await expect(page.locator('.tp-comparacion')).toContainText('Has cambiado una lectura');
    await expect(page.locator('.tp-comparacion').getByRole('table')).toBeVisible();
  });

  test('copiar el enlace y abrirlo en una pestaña nueva da el mismo resultado', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await viudedad(page);
    const pension = await pensionPrincipal(page).innerText();
    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    await expect(page.getByText('Enlace copiado al portapapeles.')).toBeVisible();
    const enlace = await page.evaluate(() => navigator.clipboard.readText());
    expect(enlace).toContain('#/tu-pension?v=1&p=viu&hc=2026-03');
    expect(enlace).toContain('vin=con');
    const nueva = await context.newPage();
    const registro = vigilar(nueva);
    await nueva.goto(enlace);
    await esperarPagina(nueva);
    await expect(nueva.getByRole('radio', { name: 'Viudedad', exact: true })).toBeChecked();
    await expect(nueva.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
    await expect(nueva.locator('.tp-cifra-principal dd')).toHaveText(pension);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('un fallecimiento anterior a la cobertura da el mensaje con la fecha y el motivo, sin cifras', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Viudedad', exact: true }).check();
    await rellenarCausante(page, '2018');
    await page.getByLabel('Año de inicio de la cotización').fill('2000');
    await grupo(page, 'Vínculo con la persona fallecida')
      .getByRole('radio', { name: 'Pareja de hecho', exact: true })
      .check();
    await page.getByLabel('Mes de nacimiento de la persona viuda').selectOption('5');
    await page.getByLabel('Año de nacimiento de la persona viuda').fill('1976');
    await grupo(page, 'Sexo de la persona viuda').getByRole('radio', { name: 'Mujer' }).check();
    await page.getByLabel('Meses de convivencia estable e ininterrumpida').fill('80');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const alerta = page.getByRole('alert').filter({ hasText: 'Fallecimiento anterior' });
    await expect(alerta).toBeVisible();
    await expect(alerta).toContainText('2018');
    await expect(alerta).toContainText(/no los sustituye por otros ni los estima/);
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toHaveCount(0);
  });

  test('errores del formulario en español y sin resultado', async ({ page }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Viudedad', exact: true }).check();
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const alerta = page.getByRole('alert').first();
    await expect(alerta).toContainText('Elige la causa de la muerte.');
    await expect(alerta).toContainText('Elige tu vínculo con la persona fallecida.');
    await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toHaveCount(0);
  });
});

test.describe('Tu pensión: orfandad', () => {
  test('flujo completo: un huérfano de 10 años cobra el 20 % de la base reguladora', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Orfandad', exact: true }).check();
    await rellenarCausante(page);
    await page.getByLabel('Mes de nacimiento', { exact: true }).selectOption('1');
    await page.getByLabel('Año de nacimiento', { exact: true }).fill('2016');
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    // 20 % × 1.714,29 = 342,86.
    await expect(pensionPrincipal(page)).toHaveText('342,86 €');
    await expect(page.getByRole('heading', { name: 'Requisitos de la orfandad' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Cómo se ha calculado' })).toBeVisible();
    await expect(page.getByText(/no incluye el gráfico de bases/)).toBeVisible();
    await expect(
      page.getByRole('heading', { name: 'Lecturas abiertas que intervienen en tu resultado' }),
    ).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });

  test('con otro huérfano y un cónyuge superviviente se muestra el reparto entre beneficiarios', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await orfandadConFamilia(page);
    const reparto = page.locator('section.tp-subseccion', {
      has: page.getByRole('heading', {
        name: 'Reparto entre los beneficiarios del mismo causante',
      }),
    });
    await expect(reparto.getByRole('table')).toBeVisible();
    await expect(reparto).toContainText('Tu orfandad');
    await expect(reparto).toContainText('Viudedad del cónyuge o pareja superviviente');
    await expect(reparto).toContainText('Orfandad de otro huérfano (n.º 1)');
    // Viudedad 891,43 y dos orfandades de 342,86: 1.577,14 ≤ 1.714,29, sin recorte.
    await expect(reparto).toContainText('891,43 € al mes');
    await expect(pensionPrincipal(page)).toHaveText('342,86 €');
  });

  test('copiar el enlace de orfandad y abrirlo da el mismo resultado', async ({
    page,
    context,
  }) => {
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await orfandadConFamilia(page);
    const pension = await pensionPrincipal(page).innerText();
    await page.getByRole('button', { name: 'Copiar enlace' }).click();
    const enlace = await page.evaluate(() => navigator.clipboard.readText());
    expect(enlace).toContain('p=orf');
    expect(enlace).toContain('hv=1');
    expect(enlace).toContain('oh=2013-06:0');
    const nueva = await context.newPage();
    const registro = vigilar(nueva);
    await nueva.goto(enlace);
    await esperarPagina(nueva);
    await expect(nueva.getByRole('radio', { name: 'Orfandad', exact: true })).toBeChecked();
    await expect(nueva.locator('.tp-cifra-principal dd')).toHaveText(pension);
    await expect(
      nueva.getByRole('heading', { name: 'Reparto entre los beneficiarios del mismo causante' }),
    ).toBeVisible();
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones externas').toEqual([]);
  });
});

test.describe('Tu pensión: accesibilidad y vista móvil de viudedad y orfandad', () => {
  test('sin desbordes y con objetivos táctiles de 44 px en viudedad con todas las preguntas abiertas', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await viudedad(page);
    await grupo(page, '¿Tienes cargas familiares?').getByRole('radio', { name: 'Sí' }).check();
    await page.getByRole('button', { name: 'Añadir huérfano' }).click();
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const problemas = await page.evaluate(() => {
      const salida: string[] = [];
      const raiz = document.documentElement;
      if (raiz.scrollWidth > raiz.clientWidth) salida.push('desborde horizontal del documento');
      for (const el of document.querySelectorAll<HTMLElement>(
        '.pildora-texto, .tp-boton, .tp-boton-secundario, .campo input[type="text"], .campo select',
      )) {
        if (el.closest('.pildora')?.querySelector('input:disabled')) continue;
        // Dentro de una nota plegable cerrada no hay objetivo táctil que medir.
        if (el.closest('details:not([open])')) continue;
        const caja = el.getBoundingClientRect();
        if (caja.height < 43.5) salida.push(`${el.className || el.tagName}: alto ${caja.height}`);
      }
      return salida;
    });
    expect(problemas).toEqual([]);
  });

  test('axe sin violaciones: formulario de viudedad con preguntas abiertas, resultado y reparto', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await page.getByRole('radio', { name: 'Viudedad', exact: true }).check();
    await grupo(page, 'Vínculo con la persona fallecida')
      .getByRole('radio', { name: 'Pareja de hecho', exact: true })
      .check();
    await grupo(page, '¿Tienes cargas familiares?').getByRole('radio', { name: 'Sí' }).check();
    await page.getByRole('button', { name: 'Añadir huérfano' }).click();
    const formulario = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
    expect(formulario.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
    await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
    const errores = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
    expect(errores.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('axe sin violaciones: resultado de orfandad con reparto, lecturas y comparación', async ({
    page,
  }) => {
    await page.goto(url('/tu-pension'));
    await esperarPagina(page);
    await orfandadConFamilia(page);
    await page
      .getByRole('group', { name: 'Cómo se lee: Qué pensiones se reducen por el límite conjunto' })
      .getByRole('radio', { name: /Se reducen todas en proporción/ })
      .check();
    await expect(page.locator('.tp-comparacion').getByRole('table')).toBeVisible();
    const resultado = await new AxeBuilder({ page }).withTags(ETIQUETAS_WCAG).analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });
});
