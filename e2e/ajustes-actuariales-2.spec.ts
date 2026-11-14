import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

/** Ajustes actuariales 2: rotulado, avisos, deflactor y lecturas de la Hucha en las tres páginas. */

const PAGINAS = ['/cotizantes-y-pensionistas', '/financiacion-y-deficit', '/hucha'] as const;

const figura = (page: Page, titulo: string) =>
  page.locator(`figure.grafico:has(.grafico-titulo:text("${titulo}"))`);

async function primeraCeldaNumerica(page: Page, titulo: string): Promise<string> {
  const f = figura(page, titulo);
  await f.locator('summary').click();
  return (await f.locator('tbody tr').first().locator('td').first().textContent()) ?? '';
}

async function axe(page: Page): Promise<string[]> {
  await page.evaluate(() => {
    for (const d of document.querySelectorAll('details')) d.open = true;
  });
  const resultado = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
    .analyze();
  return resultado.violations.map(
    (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
  );
}

test.describe('Ajustes actuariales 2: las tres páginas', () => {
  for (const ruta of PAGINAS) {
    test(`${ruta}: sin errores de consola ni peticiones externas`, async ({ page }) => {
      const registro = vigilar(page);
      await page.goto(url(ruta));
      await esperarPagina(page);
      await page.waitForLoadState('networkidle');
      await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
      expect(registro.errores, 'errores de consola').toEqual([]);
      expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
    });

    test(`${ruta}: en móvil no desborda`, async ({ browser }) => {
      const contexto = await browser.newContext({ viewport: { width: 390, height: 800 } });
      const page = await contexto.newPage();
      await page.goto(url(ruta));
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
      await contexto.close();
    });
  }

  test('cotizantes: la tabla de definiciones marca las parejas con fechas contiguas y dice qué cuenta el denominador', async ({
    page,
  }) => {
    await page.goto(url('/cotizantes-y-pensionistas'));
    await esperarPagina(page);
    const tabla = page.getByRole('table', { name: /Definiciones de la relación/ });
    await expect(tabla.locator('tbody tr')).toHaveCount(6);
    await expect(tabla.getByRole('columnheader', { name: 'El denominador cuenta' })).toBeVisible();
    await expect(tabla.getByText(/Misma fecha de referencia/)).toHaveCount(2);
    await expect(tabla.getByText('Fechas distintas')).toHaveCount(4);
    await expect(
      page.getByText(/cotizantes efectivos \(sin suspendidos ni convenio especial\)/),
    ).toBeVisible();
  });

  test('cotizantes: el selector de deflactor aparece en euros constantes, arranca en el IPC de diciembre y cambia las cifras', async ({
    page,
  }) => {
    await page.goto(url('/cotizantes-y-pensionistas'));
    await esperarPagina(page);
    await expect(page.getByRole('group', { name: /Índice de precios/ })).toHaveCount(0);
    await page.getByRole('radio', { name: 'Euros constantes' }).check();
    const grupo = page.getByRole('group', { name: 'Índice de precios para los euros constantes' });
    await expect(grupo.getByRole('radio', { name: 'IPC de diciembre' })).toBeChecked();
    const titulo = 'Pensión media mensual por clase, en euros constantes de';
    await expect(figura(page, titulo).locator('.grafico-titulo')).toContainText('diciembre de');
    const conDiciembre = await primeraCeldaNumerica(page, titulo);

    await grupo.getByRole('radio', { name: 'IPC medio anual' }).check();
    await expect(figura(page, titulo).locator('.grafico-titulo')).not.toContainText('diciembre de');
    const conMedia = await primeraCeldaNumerica(page, titulo);
    expect(conMedia).not.toBe(conDiciembre);
    await expect(figura(page, titulo)).toContainText('IPC medio anual del año base');
  });

  test('cotizantes: las advertencias sobre la media están visibles', async ({ page }) => {
    await page.goto(url('/cotizantes-y-pensionistas'));
    await esperarPagina(page);
    const bloque = page.locator('#pension-media-advertencias + ul');
    await expect(bloque).toContainText('media por pensión, no por pensionista');
    await expect(bloque).toContainText('efecto composición');
  });

  test('financiación: rótulos del resto, del saldo sin transferencias y de los gastos impropios', async ({
    page,
  }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    await expect(
      figura(page, 'De dónde proceden los ingresos no financieros').locator('thead'),
    ).toContainText('Resto (por diferencia)');
    await expect(
      page
        .getByText(
          'Saldo no financiero menos transferencias corrientes del Estado y OO. AA. (cálculo propio)',
        )
        .first(),
    ).toBeVisible();
    await expect(page.getByText(/no equivale al saldo del sistema contributivo/)).toBeVisible();
    await expect(page.getByText(/Cuatro lecturas del saldo/)).toHaveCount(0);
    await expect(page.getByText(/estimación de \d{4}, no dato observado/).first()).toBeVisible();
  });

  test('financiación: el gasto contributivo parte con complemento y la variante sin complemento se puede elegir', async ({
    page,
  }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    const titulo = 'Gasto en pensiones sobre el PIB según varias medidas';
    const cabecera = figura(page, titulo).locator('thead');
    await figura(page, titulo).locator('summary').click();
    await expect(cabecera).toContainText('Contributivas con complemento (referencia)');
    await expect(cabecera).not.toContainText('Contributivas sin complemento');
    await expect(cabecera).toContainText('ESSPROS (Eurostat): vejez');
    await page.getByRole('radio', { name: 'Con y sin complemento' }).check();
    await expect(cabecera).toContainText('Contributivas sin complemento');
  });

  test('hucha: dos lecturas separadas y suma conjunta desactivada por defecto', async ({
    page,
  }) => {
    await page.goto(url('/hucha'));
    await esperarPagina(page);
    await expect(figura(page, 'Fondo menos deuda')).toHaveCount(1);
    await expect(figura(page, 'Apoyo financiero del Estado')).toHaveCount(1);
    const casilla = page.getByRole('checkbox', { name: /Mostrar la suma conjunta/ });
    await expect(casilla).not.toBeChecked();
    await expect(figura(page, 'Suma conjunta')).toHaveCount(0);
    await casilla.check();
    await expect(figura(page, 'Suma conjunta')).toHaveCount(1);
    await expect(page.getByText(/no son aditivas/).first()).toBeVisible();
  });

  for (const ruta of PAGINAS) {
    test(`${ruta}: axe sin violaciones con los controles nuevos en uso`, async ({ page }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      if (ruta === '/cotizantes-y-pensionistas') {
        await page.getByRole('radio', { name: 'Euros constantes' }).check();
      } else if (ruta === '/financiacion-y-deficit') {
        await page.getByRole('radio', { name: 'Con y sin complemento' }).check();
      } else {
        await page.getByRole('checkbox', { name: /Mostrar la suma conjunta/ }).check();
      }
      expect(await axe(page)).toEqual([]);
    });
  }
});
