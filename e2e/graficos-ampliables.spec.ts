/**
 * Fase R4: gráficos ampliables. En cinco gráficos de envoltorios distintos (GraficoSeries en
 * Financiación y déficit, GraficoPosicion en La hucha, GraficoProyeccion en Proyecciones,
 * GraficoBarrasPaises en Otros sistemas y GraficoBases en Tu pensión), en escritorio (1360 px) y en
 * móvil (390 px): el botón «+» abre el gráfico ampliado con el ratón y con el teclado, el gráfico
 * grande es más ancho que el normal, no hay desbordes de la página ni del diálogo, el foco no sale
 * del diálogo y vuelve al «+» al cerrar. Una pasada de axe con el diálogo abierto, la comprobación
 * de sombras y radios del botón y del diálogo, y el «·» del índice fijo. Sin clic forzado ni plazos
 * ajustados. Todas las comprobaciones de la fase van en este fichero, para no repetir recorridos.
 */
import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Locator, type Page } from '@playwright/test';
import { esperarPagina, url, vigilar } from './utilidades.ts';

interface CasoGrafico {
  readonly envoltorio: string;
  readonly ruta: string;
  /** Principio del título del gráfico (sin cifras). */
  readonly titulo: RegExp;
  /** Si el gráfico lleva «Cómo leerlo». */
  readonly comoLeerlo: boolean;
  /** Pasos previos para que el gráfico se pinte (p. ej., calcular en «Tu pensión»). */
  readonly preparar?: (page: Page) => Promise<void>;
}

async function calcularPension(page: Page): Promise<void> {
  await page.getByLabel('Mes de nacimiento').selectOption('11');
  await page.getByLabel('Año de nacimiento').fill('1961');
  await page.getByRole('radio', { name: 'Hombre' }).check();
  await page.getByLabel('Mes de jubilación').selectOption('11');
  await page.getByLabel('Año de jubilación').fill('2026');
  await page.getByLabel('Mes de inicio de la cotización').selectOption('11');
  await page.getByLabel('Año de inicio de la cotización').fill('1986');
  await page.getByLabel('Base mensual de cotización (euros)').fill('2500');
  await page.getByRole('button', { name: 'Calcular mi pensión' }).click();
  await expect(page.getByRole('heading', { name: 'Tu pensión estimada' })).toBeVisible();
}

const CASOS: readonly CasoGrafico[] = [
  {
    envoltorio: 'GraficoSeries',
    ruta: '/financiacion-y-deficit',
    titulo: /^Ingresos y gastos no financieros del Sistema/,
    comoLeerlo: true,
  },
  {
    envoltorio: 'GraficoPosicion',
    ruta: '/hucha',
    titulo: /^Fondo menos deuda/,
    comoLeerlo: true,
  },
  {
    envoltorio: 'GraficoProyeccion',
    ruta: '/proyecciones',
    titulo: /^Población de mayores/,
    comoLeerlo: true,
  },
  {
    envoltorio: 'GraficoBarrasPaises',
    ruta: '/otros-sistemas',
    titulo: /^Gasto público en pensiones sobre el PIB, según la OCDE/,
    comoLeerlo: true,
  },
  {
    envoltorio: 'GraficoBases',
    ruta: '/tu-pension',
    titulo: /^Base nominal y base actualizada/,
    comoLeerlo: false,
    preparar: calcularPension,
  },
];

async function abrirRuta(page: Page, caso: CasoGrafico): Promise<Locator> {
  await page.goto(url(caso.ruta));
  await esperarPagina(page);
  if (caso.preparar) await caso.preparar(page);
  const figura = page
    .locator('figure.grafico')
    .filter({ has: page.locator('.grafico-titulo', { hasText: caso.titulo }) })
    .first();
  await figura.scrollIntoViewIfNeeded();
  await expect(figura.locator('.grafico-lienzo svg')).toBeVisible();
  return figura;
}

/** Ancho del SVG (en px de CSS). */
async function anchoSvg(svg: Locator): Promise<number> {
  const caja = await svg.boundingBox();
  if (!caja) throw new Error('El SVG no tiene caja');
  return caja.width;
}

/** Ni la página ni el diálogo se desbordan en horizontal; el diálogo cabe en la ventana. */
async function sinDesbordes(dialogo: Locator): Promise<void> {
  const medidas = await dialogo.evaluate((d) => {
    const caja = d.getBoundingClientRect();
    return {
      pagina: document.documentElement.scrollWidth - window.innerWidth,
      dialogo: d.scrollWidth - d.clientWidth,
      izquierda: caja.left,
      derecha: caja.right - window.innerWidth,
      arriba: caja.top,
      abajo: caja.bottom - window.innerHeight,
    };
  });
  expect(medidas.pagina, 'desborde horizontal de la página').toBeLessThanOrEqual(0);
  expect(medidas.dialogo, 'desborde horizontal del diálogo').toBeLessThanOrEqual(0);
  expect(medidas.izquierda).toBeGreaterThanOrEqual(0);
  expect(medidas.derecha).toBeLessThanOrEqual(0);
  expect(medidas.arriba).toBeGreaterThanOrEqual(0);
  expect(medidas.abajo).toBeLessThanOrEqual(0);
}

/** Sin sombras y con radio de 2 px como mucho. */
async function sinSombrasNiRadios(elemento: Locator): Promise<void> {
  const estilo = await elemento.evaluate((e) => {
    const c = getComputedStyle(e);
    return {
      sombra: c.boxShadow,
      radios: [
        c.borderTopLeftRadius,
        c.borderTopRightRadius,
        c.borderBottomLeftRadius,
        c.borderBottomRightRadius,
      ].map((r) => Number.parseFloat(r) || 0),
    };
  });
  expect(estilo.sombra).toBe('none');
  for (const r of estilo.radios) expect(r).toBeLessThanOrEqual(2);
}

for (const caso of CASOS) {
  test.describe(`gráfico ampliado de ${caso.envoltorio} en ${caso.ruta}`, () => {
    test('se abre con el ratón, es más ancho, no se desborda y el foco vuelve al cerrar', async ({
      page,
    }, info) => {
      const registro = vigilar(page);
      const figura = await abrirRuta(page, caso);
      const titulo = (await figura.locator('.grafico-titulo').textContent()) ?? '';
      const boton = figura.getByRole('button', { name: `Ampliar gráfico: ${titulo}` });
      await expect(boton).toBeVisible();
      await expect(boton).toHaveText('+');
      await expect(boton).toHaveAttribute('aria-haspopup', 'dialog');
      const cajaBoton = await boton.boundingBox();
      expect(cajaBoton?.width).toBeGreaterThanOrEqual(44);
      expect(cajaBoton?.height).toBeGreaterThanOrEqual(44);
      // En la esquina superior derecha de la figura.
      const cajaFigura = await figura.boundingBox();
      expect(Math.abs((cajaBoton?.y ?? 0) - (cajaFigura?.y ?? 0))).toBeLessThanOrEqual(1);
      expect(
        Math.abs(
          (cajaBoton?.x ?? 0) +
            (cajaBoton?.width ?? 0) -
            (cajaFigura?.x ?? 0) -
            (cajaFigura?.width ?? 0),
        ),
      ).toBeLessThanOrEqual(1);
      await sinSombrasNiRadios(boton);
      const anchoNormal = await anchoSvg(figura.locator('.grafico-lienzo svg'));

      await boton.click();
      const dialogo = page.getByRole('dialog', { name: titulo });
      await expect(dialogo).toBeVisible();
      await expect(page.getByRole('dialog')).toHaveCount(1);
      await expect(dialogo.getByRole('button', { name: 'Cerrar' })).toBeFocused();
      await expect(boton).toHaveAttribute('aria-expanded', 'true');

      // El gráfico se redibuja al ancho del diálogo: más ancho que el normal.
      const svgGrande = dialogo.locator('.grafico-lienzo--ampliado svg');
      await expect(svgGrande).toBeVisible();
      const anchoGrande = await anchoSvg(svgGrande);
      expect(anchoGrande, 'ancho del gráfico ampliado').toBeGreaterThan(anchoNormal);
      const viewBox = await svgGrande.getAttribute('viewBox');
      expect(Number(viewBox?.split(' ')[2])).toBeCloseTo(anchoGrande, 0);

      // Dentro: tabla, fuente y «Cómo leerlo», los mismos de la versión normal.
      await expect(dialogo.getByRole('table')).toHaveCount(1);
      await expect(dialogo.locator('table caption')).toHaveText(
        (await figura.locator('table caption').textContent()) ?? '',
      );
      // La misma línea de fuente que la figura normal (GraficoBases no lleva).
      const fuentesNormales = await figura.locator('.linea-fuente-boton').count();
      await expect(dialogo.locator('.linea-fuente-boton')).toHaveCount(fuentesNormales);
      if (fuentesNormales > 0) {
        await expect(dialogo.locator('.linea-fuente-boton')).toHaveAccessibleName(
          (await figura.locator('.linea-fuente-boton').getAttribute('aria-label')) ?? '',
        );
      }
      await expect(dialogo.locator('.como-leerlo')).toHaveCount(caso.comoLeerlo ? 1 : 0);

      // Tamaño: casi toda la ventana en escritorio; pantalla completa en móvil.
      const cajaDialogo = await dialogo.boundingBox();
      const ventana = page.viewportSize();
      if (!cajaDialogo || !ventana) throw new Error('Sin medidas');
      if (info.project.name === 'movil') {
        expect(cajaDialogo.width).toBeCloseTo(ventana.width, 0);
        expect(cajaDialogo.height).toBeCloseTo(ventana.height, 0);
        // Si el gráfico necesita más ancho, se desplaza dentro de su marco, no la página.
        const desplazable = dialogo.locator('.grafico-dialogo-desplazable');
        const desborde = await desplazable.evaluate((d) => d.scrollWidth - d.clientWidth);
        expect(desborde).toBeGreaterThanOrEqual(0);
      } else {
        expect(cajaDialogo.width).toBeGreaterThan(ventana.width * 0.9);
        expect(cajaDialogo.height).toBeGreaterThan(ventana.height * 0.9);
      }
      await sinDesbordes(dialogo);
      await sinSombrasNiRadios(dialogo);
      await sinSombrasNiRadios(dialogo.getByRole('button', { name: 'Cerrar' }));

      // El contenido se desplaza dentro del diálogo y «Cerrar» sigue a la vista.
      await dialogo.locator('.grafico-dialogo-contenido > *').last().scrollIntoViewIfNeeded();
      await expect(dialogo.getByRole('button', { name: 'Cerrar' })).toBeInViewport();

      await dialogo.getByRole('button', { name: 'Cerrar' }).click();
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(boton).toBeFocused();
      await expect(boton).toHaveAttribute('aria-expanded', 'false');

      expect(registro.errores, 'errores de consola').toEqual([]);
      expect(registro.externas, 'peticiones externas').toEqual([]);
    });

    test('con el teclado: Intro y Espacio abren, Tab no sale, Esc cierra y el foco vuelve', async ({
      page,
    }) => {
      const figura = await abrirRuta(page, caso);
      const boton = figura.locator('.grafico-ampliar');
      await boton.focus();
      await page.keyboard.press('Enter');
      const dialogo = page.locator('dialog.grafico-dialogo');
      await expect(dialogo).toBeVisible();
      await expect(dialogo.getByRole('button', { name: 'Cerrar' })).toBeFocused();
      // El foco recorre los controles del diálogo y no sale de él, hacia delante y hacia atrás.
      const controles = await dialogo
        .locator('button, a[href], summary, [tabindex]:not([tabindex="-1"])')
        .count();
      for (let i = 0; i < controles + 2; i += 1) {
        await page.keyboard.press('Tab');
        await expect(dialogo.locator(':focus')).toHaveCount(1);
      }
      for (let i = 0; i < 3; i += 1) {
        await page.keyboard.press('Shift+Tab');
        await expect(dialogo.locator(':focus')).toHaveCount(1);
      }
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(boton).toBeFocused();

      await page.keyboard.press('Space');
      await expect(dialogo).toBeVisible();
      await page.keyboard.press('Escape');
      await expect(page.getByRole('dialog')).toHaveCount(0);
      await expect(boton).toBeFocused();
    });
  });
}

test.describe('gráfico ampliado: accesibilidad y fuentes dentro', () => {
  test('axe sin infracciones con el gráfico ampliado abierto', async ({ page }) => {
    const figura = await abrirRuta(page, CASOS[0]!);
    await figura.locator('.grafico-ampliar').click();
    const dialogo = page.locator('dialog.grafico-dialogo');
    await expect(dialogo).toBeVisible();
    const resultado = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();
    expect(resultado.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
  });

  test('la fuente se abre encima del gráfico ampliado y Esc cierra solo la fuente', async ({
    page,
  }) => {
    const figura = await abrirRuta(page, CASOS[1]!);
    await figura.locator('.grafico-ampliar').click();
    const dialogo = page.locator('dialog.grafico-dialogo');
    const fuente = dialogo.locator('.linea-fuente-boton');
    await fuente.scrollIntoViewIfNeeded();
    await fuente.click();
    const desplegable = page.locator('dialog.fuentes-dialogo');
    await expect(desplegable).toBeVisible();
    await expect(desplegable.getByRole('button', { name: 'Cerrar' })).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(desplegable).toHaveCount(0);
    await expect(dialogo).toBeVisible();
    await expect(fuente).toBeFocused();
    await page.keyboard.press('Escape');
    await expect(page.getByRole('dialog')).toHaveCount(0);
    await expect(figura.locator('.grafico-ampliar')).toBeFocused();
  });
});

test.describe('índice «En esta página» (retoque de R3)', () => {
  test('sin «·» delante del resumen cuando va en su propia línea', async ({ page }, info) => {
    await page.goto(url('/metodologia'));
    await esperarPagina(page);
    const resumen = page.locator('.indice-pagina-resumen').first();
    if (info.project.name === 'movil') {
      // En móvil el índice va plegado y en línea: el separador se mantiene.
      await page.getByRole('button', { name: 'En esta página' }).click();
      await expect(resumen).toBeVisible();
      await expect(resumen.locator('.indice-pagina-separador')).toBeVisible();
      return;
    }
    await expect(resumen).toBeVisible();
    await expect(resumen.locator('.indice-pagina-separador')).toBeHidden();
    expect((await resumen.innerText()).trim().startsWith('·')).toBe(false);
    // El resumen va en su línea, bajo el título de la entrada.
    const enlace = page.locator('.indice-pagina-enlace').first();
    const cajaEnlace = await enlace.boundingBox();
    const cajaResumen = await resumen.boundingBox();
    expect(cajaResumen!.y).toBeGreaterThanOrEqual(cajaEnlace!.y + cajaEnlace!.height - 1);
  });
});
