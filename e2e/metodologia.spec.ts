import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import path from 'node:path';
import { calcularRecuentos } from '../src/engine/metodologia.ts';
import { APARTADOS_INDICE } from '../src/modules/metodologia/apartados.ts';
import { leerEntradasMetodologia } from '../scripts/lib/entradas-metodologia.ts';
import { abrirIndice, esperarPagina, url, vigilar } from './utilidades.ts';

/**
 * Fase «Metodología»: la página carga sin errores, se recorre con el teclado, no desborda en móvil
 * con las tablas abiertas y cumple axe (WCAG AA). Los recuentos se leen de los ficheros del
 * repositorio con la misma función que la página; no se escriben cifras aquí.
 */

const RUTA = '/metodologia';
const recuentos = calcularRecuentos(
  leerEntradasMetodologia(path.resolve(import.meta.dirname, '..')),
);

async function abrirPagina(page: Page): Promise<void> {
  await page.goto(url(RUTA));
  await esperarPagina(page);
  await page.waitForLoadState('networkidle');
  await expect(page.locator('section.met-seccion')).toHaveCount(APARTADOS_INDICE.length);
}

async function axe(page: Page, incluir?: string): Promise<string[]> {
  let constructor = new AxeBuilder({ page }).withTags([
    'wcag2a',
    'wcag2aa',
    'wcag21a',
    'wcag21aa',
    'wcag22aa',
  ]);
  if (incluir !== undefined) constructor = constructor.include(incluir);
  const resultado = await constructor.analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

test.describe('página «Metodología»', () => {
  test('carga sin errores de consola ni peticiones externas, con los apartados en orden y sin marcador de construcción', async ({
    page,
  }) => {
    const registro = vigilar(page);
    await abrirPagina(page);
    await expect(page.getByRole('heading', { level: 1, name: 'Metodología' })).toBeVisible();
    const ids = await page.locator('section.met-seccion').evaluateAll((n) => n.map((e) => e.id));
    expect(ids).toEqual(APARTADOS_INDICE.map((e) => e.id));
    await expect(page.getByText('En construcción')).toHaveCount(0);
    expect(registro.errores, 'errores de consola').toEqual([]);
    expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
  });

  test('el índice se recorre con el teclado y mueve el foco al encabezado del apartado', async ({
    page,
  }) => {
    await abrirPagina(page);
    const enlaces = (await abrirIndice(page)).getByRole('link');
    await expect(enlaces).toHaveCount(APARTADOS_INDICE.length);
    await enlaces.first().focus();
    await expect(enlaces.first()).toBeFocused();
    await page.keyboard.press('Tab');
    await expect(enlaces.nth(1)).toBeFocused();
    await page.keyboard.press('Enter');
    await expect(page.locator(`#${APARTADOS_INDICE[1]?.id ?? ''}-titulo`)).toBeFocused();
    await expect(page).toHaveURL(/#\/metodologia$/);
  });

  test('cada apartado, salvo el de límites, termina con los ficheros donde consta lo que afirma', async ({
    page,
  }) => {
    await abrirPagina(page);
    for (const e of APARTADOS_INDICE) {
      const seccion = page.locator(`#${e.id}`);
      if (e.id === 'met-limites') {
        await expect(seccion.locator('li a').first()).toBeVisible();
        continue;
      }
      await expect(seccion.getByRole('heading', { level: 3, name: 'Dónde consta' })).toBeVisible();
      await expect(seccion.locator('.met-respaldo a').first()).toHaveAttribute(
        'href',
        /^https:\/\/github\.com\/Exequ\/Pensiones\/blob\/main\//,
      );
    }
  });

  test('todas las lecturas, todos los modelos y todas las afirmaciones pendientes están a la vista', async ({
    page,
  }) => {
    await abrirPagina(page);
    const tabla = (titulo: string) =>
      page.locator('table', { has: page.locator(`caption:text-is("${titulo}")`) });
    await expect(
      tabla('Lecturas abiertas del motor, con su estado y su valor por defecto').locator(
        'tbody tr',
      ),
    ).toHaveCount(recuentos.lecturas.total);
    await expect(page.locator('article.met-modelo')).toHaveCount(recuentos.modelos.length);
    await expect(
      tabla('Afirmaciones con revisión actuarial pendiente').locator('tbody tr'),
    ).toHaveCount(recuentos.afirmaciones.revision.pendiente);
    for (const m of await page.locator('article.met-modelo').all()) {
      await expect(m.getByRole('heading', { level: 4, name: 'Fiabilidad indicada' })).toBeVisible();
      await expect(m.getByRole('heading', { level: 4, name: 'Límites' })).toBeVisible();
    }
  });

  test('los enlaces a «Tu pensión» y «Cómo se calcula» llevan a esas páginas', async ({ page }) => {
    await abrirPagina(page);
    await page.locator('#met-lecturas').getByRole('link', { name: 'Tu pensión' }).click();
    await expect(page).toHaveURL(/#\/tu-pension$/);
    await page.goBack();
    await esperarPagina(page);
    await page.locator('#met-lecturas').getByRole('link', { name: 'Cómo se calcula' }).click();
    await expect(page).toHaveURL(/#\/como-se-calcula$/);
    await expect(page.getByRole('heading', { level: 1, name: 'Cómo se calcula' })).toBeVisible();
  });

  test('las tablas anchas se desplazan dentro de su región y se alcanzan con el teclado', async ({
    page,
  }) => {
    await abrirPagina(page);
    const regiones = page.locator('.tabla-datos-desplazable');
    expect(await regiones.count()).toBeGreaterThanOrEqual(12);
    await regiones.first().focus();
    await expect(regiones.first()).toBeFocused();
  });

  test('axe de la página completa, sin infracciones de WCAG AA', async ({ page }) => {
    await abrirPagina(page);
    expect(await axe(page)).toEqual([]);
  });

  for (const e of APARTADOS_INDICE) {
    test(`axe del apartado «${e.id}»`, async ({ page }) => {
      await abrirPagina(page);
      expect(await axe(page, `#${e.id}`)).toEqual([]);
    });
  }

  test('no desborda (en móvil y en escritorio) con todas las tablas a la vista', async ({
    page,
  }) => {
    await abrirPagina(page);
    const desborda = await page.evaluate(
      () => document.documentElement.scrollWidth > document.documentElement.clientWidth,
    );
    expect(desborda).toBe(false);
    const anchos = await page.evaluate(() =>
      [...document.querySelectorAll('section.met-seccion, article.met-modelo, .indice-pagina')].map(
        (s) => ({ id: s.id || s.className, desborda: s.scrollWidth > s.clientWidth }),
      ),
    );
    expect(anchos.filter((a) => a.desborda)).toEqual([]);
  });
});
