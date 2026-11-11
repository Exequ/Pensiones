import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';
import { esperarPagina, RUTAS, tokensColor, url, vigilar } from './utilidades.ts';

test.describe('todas las rutas', () => {
  for (const ruta of RUTAS) {
    test(`${ruta} carga y recarga sin errores ni peticiones externas`, async ({ page }) => {
      const registro = vigilar(page);
      await page.goto(url(ruta));
      await esperarPagina(page);
      await page.reload();
      await esperarPagina(page);
      await page.waitForLoadState('networkidle');

      expect(page.url()).toContain(`/Pensiones/#${ruta}`);
      await expect(page.locator('h1')).toHaveCount(1);
      await expect(page.getByText('Página no encontrada')).toHaveCount(0);
      expect(registro.errores, 'errores de consola').toEqual([]);
      expect(registro.externas, 'peticiones a dominios externos').toEqual([]);
    });

    test(`${ruta} no desborda horizontalmente ni corta texto`, async ({ page }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      const problemas = await page.evaluate(() => {
        const salida: string[] = [];
        const raiz = document.documentElement;
        if (raiz.scrollWidth > raiz.clientWidth) {
          salida.push(`documento: scrollWidth ${raiz.scrollWidth} > ${raiz.clientWidth}`);
        }
        const ancho = raiz.clientWidth;
        const dentroDeDesplazable = (el: Element): boolean => {
          for (let p = el.parentElement; p; p = p.parentElement) {
            const o = getComputedStyle(p).overflowX;
            if (o === 'auto' || o === 'scroll') return true;
          }
          return false;
        };
        for (const el of document.body.querySelectorAll('*')) {
          if (el.closest('.visualmente-oculto, .saltar-al-contenido')) continue;
          const caja = el.getBoundingClientRect();
          if (caja.width === 0 || caja.height === 0) continue;
          if ((caja.right > ancho + 1 || caja.left < -1) && !dentroDeDesplazable(el)) {
            salida.push(
              `${el.tagName}.${el.className}: fuera del viewport (${caja.left}–${caja.right})`,
            );
          }
          const estilo = getComputedStyle(el);
          if (
            ['hidden', 'clip'].includes(estilo.overflowX) &&
            el instanceof HTMLElement &&
            el.scrollWidth > el.clientWidth + 1
          ) {
            salida.push(`${el.tagName}.${el.className}: texto cortado`);
          }
        }
        return salida;
      });
      expect(problemas).toEqual([]);
    });

    test(`${ruta} cumple WCAG 2.1 AA (axe)`, async ({ page }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      const resultado = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa', 'wcag22aa'])
        .analyze();
      expect(
        resultado.violations.map(
          (v) => `${v.id}: ${v.help} → ${v.nodes.map((n) => n.target.join(' ')).join(', ')}`,
        ),
      ).toEqual([]);
    });
  }

  test('una ruta inexistente muestra «Página no encontrada»', async ({ page }) => {
    await page.goto(url('/no-existe'));
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Página no encontrada');
  });
});

test.describe('sistema de diseño en el navegador', () => {
  for (const ruta of ['/', '/diseno']) {
    test(`${ruta}: sin sombras, degradados, radios > 2 px ni colores fuera de los tokens`, async ({
      page,
    }) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      // Abre las tablas de los gráficos para auditarlas también.
      await page.evaluate(() => {
        for (const d of document.querySelectorAll('details')) d.open = true;
      });
      const problemas = await page.evaluate((tokens) => {
        const muestra = document.createElement('span');
        document.body.append(muestra);
        const permitidos = new Set(['rgba(0, 0, 0, 0)']);
        for (const t of tokens) {
          muestra.style.color = `var(${t})`;
          permitidos.add(getComputedStyle(muestra).color);
        }
        muestra.remove();

        const salida = new Set<string>();
        const revisar = (el: Element, propiedad: string, valor: string) => {
          if (!valor || valor === 'none' || valor.startsWith('url(')) return;
          if (!permitidos.has(valor))
            salida.add(`${el.tagName.toLowerCase()} ${propiedad}: ${valor}`);
        };
        for (const el of document.querySelectorAll('body *')) {
          const e = getComputedStyle(el);
          if (e.boxShadow !== 'none') salida.add(`${el.tagName} box-shadow`);
          if (e.textShadow !== 'none') salida.add(`${el.tagName} text-shadow`);
          if (e.backgroundImage !== 'none') salida.add(`${el.tagName} background-image`);
          if (e.filter !== 'none' || e.backdropFilter !== 'none')
            salida.add(`${el.tagName} filter`);
          for (const r of [
            e.borderTopLeftRadius,
            e.borderTopRightRadius,
            e.borderBottomLeftRadius,
            e.borderBottomRightRadius,
          ]) {
            if (parseFloat(r) > 2) salida.add(`${el.tagName} border-radius ${r}`);
          }
          revisar(el, 'color', e.color);
          revisar(el, 'background-color', e.backgroundColor);
          for (const lado of ['Top', 'Right', 'Bottom', 'Left'] as const) {
            if (parseFloat(e.getPropertyValue(`border-${lado.toLowerCase()}-width`)) > 0) {
              revisar(
                el,
                `border-${lado.toLowerCase()}-color`,
                e.getPropertyValue(`border-${lado.toLowerCase()}-color`),
              );
            }
          }
          if (el instanceof SVGElement) {
            revisar(el, 'fill', e.fill);
            revisar(el, 'stroke', e.stroke);
          }
        }
        return [...salida];
      }, tokensColor());
      expect(problemas).toEqual([]);
    });
  }

  test('el foco es visible: 3 px en color de acento', async ({ page }) => {
    await page.goto(url('/'));
    await esperarPagina(page);
    await page.keyboard.press('Tab');
    const foco = await page.evaluate(() => {
      const el = document.activeElement as HTMLElement;
      const e = getComputedStyle(el);
      const muestra = document.createElement('span');
      muestra.style.color = 'var(--color-acento)';
      document.body.append(muestra);
      const acento = getComputedStyle(muestra).color;
      muestra.remove();
      return { texto: el.textContent, ancho: e.outlineWidth, color: e.outlineColor, acento };
    });
    expect(foco.texto).toBe('Saltar al contenido');
    expect(foco.ancho).toBe('3px');
    expect(foco.color).toBe(foco.acento);
  });

  test('las fuentes son locales y se cargan', async ({ page }) => {
    const registro = vigilar(page);
    await page.goto(url('/'));
    await esperarPagina(page);
    const cargadas = await page.evaluate(() => ({
      lectura: document.fonts.check('20px "Newsreader Variable"'),
      interfaz: document.fonts.check('14px "Public Sans Variable"'),
      h1: getComputedStyle(document.querySelector('h1')!).fontFamily,
    }));
    expect(cargadas.lectura).toBe(true);
    expect(cargadas.interfaz).toBe(true);
    expect(cargadas.h1).toContain('Newsreader Variable');
    expect(registro.externas).toEqual([]);
  });

  test('los controles tienen un objetivo táctil de al menos 44 px', async ({ page }) => {
    await page.goto(url('/diseno'));
    await esperarPagina(page);
    const pequenos = await page.evaluate(() =>
      [...document.querySelectorAll('button, select, summary, .pildora-texto, nav a')]
        .filter((el) => (el as HTMLElement).offsetParent !== null)
        .map((el) => ({ el: el.textContent.trim(), caja: el.getBoundingClientRect() }))
        .filter(({ caja }) => caja.height < 44 || caja.width < 44)
        .map(({ el, caja }) => `${el}: ${caja.width}×${caja.height}`),
    );
    expect(pequenos).toEqual([]);
  });
});

test.describe('laboratorio de diseño', () => {
  test('el selector de años cambia la frase y resalta una única barra', async ({ page }) => {
    await page.goto(url('/diseno'));
    await esperarPagina(page);
    const barras = page.locator('.grafico').first().locator('svg rect');
    await expect(barras).toHaveCount(4);

    await page.getByRole('radio', { name: '30' }).check();
    await expect(page.locator('output.frase-valor')).toHaveText(/^80\s%$/);
    await expect(page.getByRole('combobox', { name: 'Años cotizados' })).toHaveValue('30');

    const fills = await barras.evaluateAll((rects) => rects.map((r) => getComputedStyle(r).fill));
    const acento = await page.evaluate(() => {
      const s = document.createElement('span');
      s.style.color = 'var(--color-acento)';
      document.body.append(s);
      const c = getComputedStyle(s).color;
      s.remove();
      return c;
    });
    expect(fills.filter((f) => f === acento)).toHaveLength(1);
    expect(fills[1]).toBe(acento);

    await page.getByRole('combobox', { name: 'Años cotizados' }).selectOption('40');
    await expect(page.locator('output.frase-valor')).toHaveText(/^100\s%$/);
    await expect(page.getByRole('radio', { name: '40' })).toBeChecked();
  });

  test('cada gráfico es un figure con figcaption y tabla de datos', async ({ page }) => {
    await page.goto(url('/diseno'));
    await esperarPagina(page);
    const figuras = page.locator('figure.grafico');
    await expect(figuras).toHaveCount(2);
    for (const figura of await figuras.all()) {
      await expect(figura.locator('figcaption')).toHaveCount(1);
      await expect(figura.locator('svg[role="img"][aria-label]')).toHaveCount(1);
      await figura.getByText('Ver los datos del gráfico en una tabla').click();
      await expect(figura.locator('table th[scope="col"]').first()).toBeVisible();
    }
  });

  test('no está enlazado desde la navegación', async ({ page }) => {
    await page.goto(url('/'));
    await esperarPagina(page);
    await expect(page.locator('a[href*="diseno"]')).toHaveCount(0);
  });
});

test.describe('navegación', () => {
  test('el menú enlaza las secciones y lleva a cada página', async ({ page, isMobile }, info) => {
    await page.goto(url('/'));
    await esperarPagina(page);
    if (info.project.name === 'movil' || isMobile) {
      const nav = page.getByRole('navigation', { name: 'Secciones' });
      await expect(nav).toBeHidden();
      await page.getByRole('button', { name: 'Menú' }).click();
      await expect(nav).toBeVisible();
    }
    await page
      .getByRole('navigation', { name: 'Secciones' })
      .getByRole('link', { name: 'Reformas' })
      .click();
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Reformas');
    await expect(page).toHaveURL(/#\/reformas$/);
    if (info.project.name === 'movil') {
      await expect(page.getByRole('button', { name: 'Menú' })).toHaveAttribute(
        'aria-expanded',
        'false',
      );
    }
  });
});

test.describe('capturas', () => {
  for (const [ruta, nombre] of [
    ['/', 'portada'],
    ['/diseno', 'diseno'],
  ] as const) {
    test(`captura de ${nombre}`, async ({ page }, info) => {
      await page.goto(url(ruta));
      await esperarPagina(page);
      await page.waitForLoadState('networkidle');
      const ancho = info.project.use.viewport?.width ?? 0;
      await page.screenshot({ path: `capturas/${nombre}-${ancho}.png`, fullPage: true });
    });
  }
});
