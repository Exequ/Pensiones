import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { comprobarFuente, esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Fase 5-A4: las tres páginas que cambian con los cuatro PDF nuevos: «Tipos de pensión»
 * (complementos por brecha de género y por maternidad), «Hucha» (la liquidación frente a la ejecución) y
 * «Mitos y realidades» (la regla de 2011 en la tarjeta del IPC). Sin clic forzado ni plazos ajustados.
 */

const COMPLEMENTOS = 'section[aria-labelledby="complementos"]';
const CONTRASTE = 'section[aria-labelledby="contraste-liquidacion"]';
const TARJETA_IPC = '#pensiones-siempre-con-el-ipc';

async function abrir(page: Page, ruta: string): Promise<void> {
  await page.goto(url(ruta));
  await esperarPagina(page);
  await page.waitForLoadState('networkidle');
}

async function abrirTablas(page: Page): Promise<void> {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('details')) d.open = true;
  });
}

async function axe(page: Page, incluir: string): Promise<string[]> {
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .include(incluir)
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

async function sinDesbordes(page: Page): Promise<void> {
  const desborda = await page.evaluate(
    () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
  );
  expect(desborda).toBe(false);
}

test.describe('«Tipos de pensión»: complementos por brecha de género y por maternidad', () => {
  test('carga sin errores de consola ni peticiones externas, con tablas, fuente y «Cómo leerlo»', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrir(page, '/tipos-de-pension');
    const s = page.locator(COMPLEMENTOS);
    await expect(s.getByRole('heading', { level: 2 })).toBeVisible();
    await expect(s.locator('.linea-fuente').first()).toContainText(/naturaleza: observado/);
    await comprobarFuente(s);
    await expect(s.locator('.como-leerlo')).toContainText(/No miden la brecha de género/);
    expect(await s.locator('table').count()).toBeGreaterThanOrEqual(6);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el selector cambia de complemento y las tablas siguen teniendo el total y las comunidades', async ({
    page,
  }) => {
    await abrir(page, '/tipos-de-pension');
    const s = page.locator(COMPLEMENTOS);
    const primera = s.locator('table').first();
    await expect(primera.locator('caption')).toContainText(/brecha de género/);
    const filasBrecha = await primera.locator('tbody tr').count();
    await s.getByRole('radio', { name: 'Maternidad' }).check();
    await expect(s.locator('table').first().locator('caption')).toContainText(/por maternidad/);
    expect(await s.locator('table').first().locator('tbody tr').count()).toBe(filasBrecha);
    await expect(s.locator('table').first().locator('tbody tr').first()).toContainText('Total');
  });

  test('sin desbordes con las tablas abiertas (en móvil y en escritorio)', async ({ page }) => {
    await abrir(page, '/tipos-de-pension');
    await abrirTablas(page);
    await sinDesbordes(page);
  });

  test('axe de la sección con las tablas abiertas, sin infracciones de WCAG AA', async ({
    page,
  }) => {
    await abrir(page, '/tipos-de-pension');
    await abrirTablas(page);
    expect(await axe(page, COMPLEMENTOS)).toEqual([]);
  });
});

test.describe('«Hucha»: la liquidación frente a la ejecución', () => {
  test('carga sin errores de consola ni peticiones externas, con las tablas y su fuente', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrir(page, '/hucha');
    const s = page.locator(CONTRASTE);
    await expect(s.getByRole('heading', { level: 2 })).toBeVisible();
    await comprobarFuente(s);
    await expect(s.locator('.como-leerlo')).toContainText(/ruptura de serie sigue rotulada/);
    expect(await s.locator('table').count()).toBe(2);
    // el último ejercicio coincide con la ejecución en todas las partidas
    const diferencias = await s
      .locator('table')
      .first()
      .locator('tbody tr td:last-child')
      .allTextContents();
    expect(diferencias.length).toBeGreaterThanOrEqual(8);
    for (const d of diferencias) expect(d.trim()).toBe('0,00');
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el selector de ejercicio cambia el rótulo de la tabla', async ({ page }) => {
    await abrir(page, '/hucha');
    const s = page.locator(CONTRASTE);
    const antes = await s.locator('caption').first().textContent();
    const radios = s.getByRole('radio');
    await radios.first().check();
    await expect(s.locator('caption').first()).not.toHaveText(antes ?? '');
  });

  test('sin desbordes con las tablas abiertas (en móvil y en escritorio)', async ({ page }) => {
    await abrir(page, '/hucha');
    await abrirTablas(page);
    await sinDesbordes(page);
  });

  test('axe de la sección, sin infracciones de WCAG AA', async ({ page }) => {
    await abrir(page, '/hucha');
    await abrirTablas(page);
    expect(await axe(page, CONTRASTE)).toEqual([]);
  });
});

test.describe('«Mitos y realidades»: la regla de 2011 en la tarjeta del IPC', () => {
  test('carga sin errores de consola, con la tabla de la regla y sin acumulado', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrir(page, '/mitos-y-realidades');
    const t = page.locator(TARJETA_IPC);
    const tabla = t.locator('table', {
      has: page.locator('caption', { hasText: /sin porcentaje general/ }),
    });
    await expect(tabla).toHaveCount(1);
    await expect(tabla.locator('tbody tr')).toHaveCount(3);
    await expect(tabla.locator('tbody tr').first()).toContainText('Suspendida');
    await expect(t).toContainText(/no muestra ningún acumulado/);
    await expect(t).not.toContainText(/acumulado de \d+/);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('sin desbordes con las tablas abiertas (en móvil y en escritorio)', async ({ page }) => {
    await abrir(page, '/mitos-y-realidades');
    await abrirTablas(page);
    await sinDesbordes(page);
  });

  test('axe de la tarjeta con las tablas abiertas, sin infracciones de WCAG AA', async ({
    page,
  }) => {
    await abrir(page, '/mitos-y-realidades');
    await abrirTablas(page);
    expect(await axe(page, TARJETA_IPC)).toEqual([]);
  });
});
