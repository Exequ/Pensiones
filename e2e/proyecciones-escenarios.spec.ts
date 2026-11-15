import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

const RUTA = '/proyecciones';
const ENCABEZADO = /^Sistema financiero/;
const GRUPO = 'Escenario de M4';

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

const selector = (page: Page) => page.getByRole('group', { name: GRUPO, exact: true });

test.describe('escenarios de sensibilidad de M4 en «Proyecciones»', () => {
  test('la sección carga sin errores de consola ni peticiones externas, con el escenario base seleccionado', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirBloque(page);
    await page.waitForLoadState('networkidle');
    const opciones = selector(page).getByRole('radio');
    await expect(opciones).toHaveCount(5);
    await expect(opciones.first()).toBeChecked();
    await expect(opciones.first()).toHaveAccessibleName(/^base: g .*IPC /);
    await expect(bloque(page).locator('.proy-escenario-activo')).toContainText(
      'Es el escenario de referencia',
    );
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('elegir otro escenario cambia las series de los gráficos y rotula el escenario en cada título', async ({
    page,
  }) => {
    await abrirBloque(page);
    const gasto = 'Gasto en pensiones contributivas: euros corrientes';
    const base = await trazos(page, gasto);
    const saldos = await trazos(page, 'Saldos del sistema');
    const fondo = await trazos(page, 'Valor del Fondo de Reserva');
    const vistos = new Set([base]);
    for (const nombre of [/^g 0 %/, /^g 2 %/, /^g 1 %, IPC 1 %/, /^g 1 %, IPC 3 %/]) {
      await selector(page).getByRole('radio', { name: nombre }).check();
      const activo = await selector(page)
        .getByRole('radio', { name: nombre })
        .getAttribute('value');
      expect(activo).toBeTruthy();
      await expect(page.locator('figure.grafico', { hasText: gasto }).first()).toContainText(
        '· escenario g',
      );
      const ahora = await trazos(page, gasto);
      expect(
        vistos.has(ahora),
        `las curvas del gasto de ${String(nombre)} no repiten otro escenario`,
      ).toBe(false);
      vistos.add(ahora);
    }
    // El último escenario (IPC más alto) cambia también los saldos y el Fondo respecto al base.
    expect(await trazos(page, 'Saldos del sistema')).not.toBe(saldos);
    expect(await trazos(page, 'Valor del Fondo de Reserva')).not.toBe(fondo);
    // Volver al base reproduce las curvas del base.
    await selector(page).getByRole('radio').first().check();
    expect(await trazos(page, gasto)).toBe(base);
  });

  test('el selector se maneja con teclado y las tablas destacan el escenario elegido', async ({
    page,
  }) => {
    await abrirBloque(page);
    const base = selector(page).getByRole('radio').first();
    await base.focus();
    await page.keyboard.press('ArrowRight');
    await expect(selector(page).getByRole('radio').nth(1)).toBeChecked();
    const tabla = bloque(page).getByRole('table', { name: /^Los escenarios de M4/ });
    await expect(tabla.locator('tbody tr').nth(1)).toHaveClass(/destacada/);
    await expect(bloque(page).locator('.proy-escenario-activo')).toContainText(
      'Cambia solo el crecimiento real de los salarios',
    );
    const comparacion = bloque(page).getByRole('table', {
      name: /^Resultado de cada escenario en/,
    });
    await expect(comparacion.locator('tbody tr')).toHaveCount(5);
    await expect(comparacion.locator('tbody tr').nth(1)).toHaveClass(/destacada/);
  });

  test('la tabla del factor de calibración y el punto de partida de 2025 están en el bloque', async ({
    page,
  }) => {
    await abrirBloque(page);
    const calibracion = bloque(page).getByRole('table', {
      name: /^Gasto de la ejecución del presupuesto de 2025/,
    });
    await expect(calibracion.locator('tbody tr')).toHaveCount(6);
    await expect(bloque(page)).toContainText('hipótesis de su autor que no se ha verificado');
    const plegable = bloque(page).locator('details', { hasText: 'punto de partida' }).first();
    await plegable.locator('summary').click();
    await expect(plegable.getByRole('table')).toBeVisible();
    await expect(plegable).toContainText('NO la calcula el modelo');
  });

  test('no desborda horizontalmente con las tablas abiertas y con otro escenario seleccionado', async ({
    page,
  }) => {
    await abrirBloque(page);
    await selector(page)
      .getByRole('radio', { name: /^g 1 %, IPC 3 %/ })
      .check();
    await page.waitForLoadState('networkidle');
    await page.evaluate(() => {
      for (const d of document.querySelectorAll('details')) d.open = true;
    });
    const medidas = await page.evaluate(() => {
      const raiz = document.documentElement;
      const fuera = [...document.querySelectorAll('figure.grafico svg')].filter(
        (s) => s.getBoundingClientRect().right > raiz.clientWidth + 1,
      ).length;
      const grupo = document.querySelector('fieldset.pildoras');
      const pildoras = grupo ? grupo.getBoundingClientRect().right <= raiz.clientWidth + 1 : false;
      return { desborda: raiz.scrollWidth > raiz.clientWidth, fuera, pildoras };
    });
    expect(medidas).toEqual({ desborda: false, fuera: 0, pildoras: true });
  });

  test('las opciones del selector miden al menos 44 px', async ({ page }) => {
    await abrirBloque(page);
    const pequenos = await selector(page)
      .locator('.pildora-texto')
      .evaluateAll((nodos) =>
        nodos.map((e) => e.getBoundingClientRect().height).filter((alto) => alto < 43.5),
      );
    expect(pequenos).toEqual([]);
  });

  test('cumple WCAG 2.1 AA (axe) con el selector en uso y los plegables abiertos', async ({
    page,
  }) => {
    // axe recorre una página con muchas tablas abiertas: en un ejecutor lento supera los 30 s por defecto.
    test.setTimeout(120_000);
    await abrirBloque(page);
    await selector(page)
      .getByRole('radio', { name: /^g 0 %/ })
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
