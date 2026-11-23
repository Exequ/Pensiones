/**
 * Fase R2: la línea de fuente es el botón «Fuente(s)» que abre un desplegable (`<dialog>` modal).
 * Se recorre en tres rutas con gráficos y tablas distintos, con teclado y con ratón, en escritorio y
 * en móvil: foco, Esc, «Cerrar», clic fuera, que no haya desbordes ni nada fuera de pantalla, y una
 * pasada de axe con el desplegable abierto. Sin clic forzado ni plazos ajustados.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

const RUTAS_FUENTES = [
  { ruta: '/financiacion-y-deficit', titulo: 'Financiación y déficit' },
  { ruta: '/proyecciones', titulo: 'Proyecciones' },
  { ruta: '/mitos-y-realidades', titulo: 'Mitos y realidades' },
  { ruta: '/tu-pension', titulo: 'Tu pensión' },
] as const;

const FECHA_O_CONFIANZA = /descargad|confianza/i;

/** Primer botón «Fuente(s)» de la página dentro de un gráfico o una tabla, ya a la vista. */
async function primerBoton(
  page: Page,
  dentroDe = 'figure.grafico, .tabla-datos, main',
): Promise<Locator> {
  const boton = page.locator(dentroDe).locator('.linea-fuente-boton').first();
  await boton.scrollIntoViewIfNeeded();
  await expect(boton).toBeVisible();
  return boton;
}

async function dialogoAbierto(boton: Locator): Promise<Locator> {
  const dialogo = boton
    .locator('xpath=ancestor::div[contains(@class,"linea-fuente")][1]')
    .getByRole('dialog');
  await expect(dialogo).toBeVisible();
  return dialogo;
}

for (const { ruta, titulo } of RUTAS_FUENTES) {
  test.describe(`fuentes desplegables en ${titulo}`, () => {
    test('se abre con Intro y con Espacio, el foco entra, Esc cierra y el foco vuelve', async ({
      page,
    }) => {
      const registro = vigilar(page);
      await page.goto(url(ruta));
      await esperarPagina(page);
      const boton = await primerBoton(page);
      await expect(boton).toHaveAttribute('aria-haspopup', 'dialog');
      await expect(boton).toHaveAttribute('aria-expanded', 'false');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      await boton.focus();
      await page.keyboard.press('Enter');
      const dialogo = await dialogoAbierto(boton);
      await expect(dialogo.getByRole('button', { name: 'Cerrar' })).toBeFocused();
      await expect(dialogo.getByRole('link').first()).toBeVisible();
      await expect(dialogo).toContainText('Organismo');
      await expect(dialogo).not.toContainText(FECHA_O_CONFIANZA);

      // El foco no se pierde: con Tab y con Mayús+Tab sigue dentro del desplegable.
      for (let i = 0; i < 4; i += 1) {
        await page.keyboard.press('Tab');
        await expect(dialogo.locator(':focus')).toHaveCount(1);
      }
      await page.keyboard.press('Shift+Tab');
      await expect(dialogo.locator(':focus')).toHaveCount(1);

      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(boton).toBeFocused();
      await expect(boton).toHaveAttribute('aria-expanded', 'false');

      await page.keyboard.press('Space');
      await expect(await dialogoAbierto(boton)).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);

      expect(registro.errores, 'errores de consola').toEqual([]);
      expect(registro.externas, 'peticiones externas').toEqual([]);
    });

    test('con el ratón: «Cerrar» y el clic fuera cierran y devuelven el foco', async ({ page }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      const boton = await primerBoton(page);

      await boton.click();
      let dialogo = await dialogoAbierto(boton);
      await dialogo.getByRole('button', { name: 'Cerrar' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(boton).toBeFocused();

      await boton.click();
      dialogo = await dialogoAbierto(boton);
      // Un clic dentro no cierra.
      await dialogo.getByRole('link').first().hover();
      await dialogo.locator('dt').first().click();
      await expect(dialogo).toBeVisible();
      // Un clic en la esquina de la ventana, fuera del desplegable, sí.
      await page.mouse.click(2, 2);
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(boton).toBeFocused();
    });

    test('el desplegable cabe en pantalla, sin desbordes, y no sale fecha ni confianza en la página', async ({
      page,
    }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      const boton = await primerBoton(page);
      const caja = await boton.boundingBox();
      expect(caja?.height ?? 0).toBeGreaterThanOrEqual(44);
      expect(caja?.width ?? 0).toBeGreaterThanOrEqual(44);

      await boton.click();
      const dialogo = await dialogoAbierto(boton);
      const { ancho, alto } = page.viewportSize()
        ? { ancho: page.viewportSize()!.width, alto: page.viewportSize()!.height }
        : { ancho: 0, alto: 0 };
      const c = await dialogo.boundingBox();
      expect(c, 'caja del desplegable').not.toBeNull();
      expect(c!.x).toBeGreaterThanOrEqual(0);
      expect(c!.y).toBeGreaterThanOrEqual(0);
      expect(c!.x + c!.width).toBeLessThanOrEqual(ancho);
      expect(c!.y + c!.height).toBeLessThanOrEqual(alto);

      const medidas = await page.evaluate(() => {
        const d = document.querySelector('dialog[open]') as HTMLElement;
        const estilo = getComputedStyle(d);
        const cerrar = d.querySelector('.fuentes-dialogo-cerrar') as HTMLElement;
        const rc = cerrar.getBoundingClientRect();
        return {
          documento: document.documentElement.scrollWidth - document.documentElement.clientWidth,
          dialogoX: d.scrollWidth - d.clientWidth,
          overflowY: estilo.overflowY,
          sombra: estilo.boxShadow,
          radio: estilo.borderTopLeftRadius,
          cerrarAlto: rc.height,
          cerrarAncho: rc.width,
          cerrarRadio: getComputedStyle(cerrar).borderTopLeftRadius,
        };
      });
      expect(medidas.documento, 'desborde horizontal de la página').toBeLessThanOrEqual(0);
      expect(medidas.dialogoX, 'desborde horizontal del desplegable').toBeLessThanOrEqual(0);
      expect(medidas.overflowY).toBe('auto');
      expect(medidas.sombra).toBe('none');
      expect(medidas.radio).toBe('0px');
      expect(medidas.cerrarRadio).toBe('0px');
      expect(medidas.cerrarAlto).toBeGreaterThanOrEqual(44);
      expect(medidas.cerrarAncho).toBeGreaterThanOrEqual(44);

      await page.keyboard.press('Escape');
      // Ni fecha de descarga ni confianza en el texto visible de la página (fuera de «Metodología»).
      const visible = await page.evaluate(() => document.body.innerText);
      expect(visible).not.toMatch(
        /descargad|fecha de descarga|nivel(es)? de confianza|confianza:/i,
      );
    });

    test('axe: sin infracciones WCAG 2.1 AA con el desplegable abierto', async ({ page }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      const boton = await primerBoton(page);
      await boton.click();
      await dialogoAbierto(boton);
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
}

test.describe('contenido del desplegable', () => {
  test('«Financiación y déficit»: las definiciones llevan sus citas, ubicaciones y organismos', async ({
    page,
  }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    // Fase R7: cada definición del módulo tiene su propio «Fuentes»; los literales que R1 quitó del
    // cuerpo se ven en el de su definición, tal como constan en los datos (el saldo total, con el par
    // completo de rótulos).
    const casos = [
      { id: 'saldo-presupuestario-no-financiero', literal: 'SUMA DE OPERACIONES NO FINANCIERAS' },
      { id: 'saldo-presupuestario-total', literal: 'TOTAL INGRESOS / TOTAL GASTOS' },
      {
        id: 'capacidad-necesidad-financiacion-sec',
        literal:
          'The difference between total revenue and total expenditure equals net lending/net borrowing (B.9).',
      },
    ];
    for (const { id, literal } of casos) {
      const linea = page.locator(
        `section[aria-labelledby="saldos"] .hist-definiciones #definicion-${id} .linea-fuente`,
      );
      await linea.scrollIntoViewIfNeeded();
      await linea.getByRole('button', { name: /^Fuentes?\b/ }).click();
      const dialogo = linea.getByRole('dialog');
      await expect(dialogo).toBeVisible();
      await expect(dialogo).toContainText(literal);
      await expect(dialogo).toContainText('Cita');
      await expect(dialogo).toContainText('Ubicación en el documento');
      await expect(dialogo).not.toContainText(FECHA_O_CONFIANZA);
      // La de contabilidad nacional tiene más de una fuente (metadatos y datos de Eurostat).
      if (id === 'capacidad-necesidad-financiacion-sec')
        expect(await dialogo.getByRole('link').count()).toBeGreaterThan(1);
      await dialogo.getByRole('button', { name: 'Cerrar' }).click();
      await expect(dialogo).toBeHidden();
    }
  });

  test('«Proyecciones»: la naturaleza se ve sin abrir y el desplegable la repite', async ({
    page,
  }) => {
    await page.goto(url('/proyecciones'));
    await esperarPagina(page);
    const figura = page.locator('figure.grafico', {
      hasText: 'Pensiones contributivas en vigor: total',
    });
    const linea = figura.locator('.linea-fuente');
    await expect(linea).toContainText('naturaleza: proyección de modelo propio');
    await linea.getByRole('button', { name: /^Fuentes?\b/ }).click();
    await expect(linea.getByRole('dialog')).toContainText('Naturaleza');
    await expect(linea.getByRole('dialog')).toContainText('proyección de modelo propio');
  });

  test('el nombre accesible del botón es único en un gráfico y su tabla', async ({ page }) => {
    await page.goto(url('/financiacion-y-deficit'));
    await esperarPagina(page);
    const nombres = await page
      .locator('figure.grafico .linea-fuente-boton')
      .evaluateAll((bs) => bs.map((b) => b.getAttribute('aria-label')));
    expect(nombres.length).toBeGreaterThan(3);
    expect(nombres.every((n) => n !== null && /^Fuentes?: /.test(n))).toBe(true);
    expect(new Set(nombres).size).toBe(nombres.length);
  });
});
