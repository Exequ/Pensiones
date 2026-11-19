import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
import { GRUPOS_NAVEGACION } from '../src/modules/navegacion.ts';
import { SECCIONES } from '../src/modules/secciones.ts';

/** Todas las rutas de la web (HashRouter: van tras «#»). */
export const RUTAS: readonly string[] = [
  '/',
  ...SECCIONES.map((s) => `/${s.slug}`),
  '/fuentes',
  '/cambios',
  '/diseno',
];

export const url = (ruta: string): string => `./#${ruta}`;

export interface Registro {
  readonly errores: string[];
  readonly externas: string[];
}

/** Registra errores de consola, excepciones y peticiones a dominios externos. */
export function vigilar(page: Page): Registro {
  const registro: Registro = { errores: [], externas: [] };
  page.on('console', (mensaje) => {
    if (mensaje.type() === 'error') registro.errores.push(mensaje.text());
  });
  page.on('pageerror', (error) => {
    registro.errores.push(`Excepción: ${error.message}`);
  });
  page.on('request', (peticion) => {
    const destino = new URL(peticion.url());
    if (destino.protocol === 'data:' || destino.protocol === 'blob:') return;
    if (!['localhost', '127.0.0.1'].includes(destino.hostname)) {
      registro.externas.push(peticion.url());
    }
  });
  return registro;
}

/** Nombres de los tokens de color definidos en tokens.css. */
export function tokensColor(): string[] {
  const css = readFileSync(path.resolve(import.meta.dirname, '../src/styles/tokens.css'), 'utf8');
  return [...css.matchAll(/(--color-[a-z0-9-]+)\s*:/g)].map((m) => m[1]!);
}

/** Espera a que la página esté pintada con sus fuentes. */
export async function esperarPagina(page: Page): Promise<void> {
  await page.locator('h1').first().waitFor();
  await page.evaluate(async () => {
    await document.fonts.ready;
  });
}

/**
 * Abre la primera línea de fuente de un contenedor con un clic normal, comprueba que el desplegable
 * enseña título con enlace y organismo, que no enseña fecha de descarga ni confianza, y lo cierra con
 * «Cerrar» (el foco debe volver al botón).
 */
export async function comprobarFuente(contenedor: Locator): Promise<void> {
  const linea = contenedor.locator('.linea-fuente').first();
  const boton = linea.getByRole('button', { name: /^Fuentes?\b/ });
  await boton.scrollIntoViewIfNeeded();
  await boton.click();
  const dialogo = linea.getByRole('dialog');
  await expect(dialogo).toBeVisible();
  await expect(dialogo.getByRole('link').first()).toBeVisible();
  await expect(dialogo).toContainText('Organismo');
  await expect(dialogo).not.toContainText(/descargad|confianza/i);
  await dialogo.getByRole('button', { name: 'Cerrar' }).click();
  await expect(dialogo).toHaveCount(0);
  await expect(boton).toBeFocused();
}

/** Navegación principal («Secciones»). */
export const menu = (page: Page): Locator => page.getByRole('navigation', { name: 'Secciones' });

/** Grupo del menú que contiene un enlace (por su texto). */
function grupoDe(titulo: string) {
  const grupo = GRUPOS_NAVEGACION.find((g) => g.enlaces.some((e) => e.titulo === titulo));
  if (!grupo) throw new Error(`El menú no tiene el enlace «${titulo}»`);
  return grupo;
}

/** En móvil (< 960 px) abre el menú tras el botón «Menú», si está plegado. */
export async function abrirMenuMovil(page: Page): Promise<void> {
  const boton = page.getByRole('button', { name: 'Menú' });
  if (await boton.isVisible()) {
    await boton.click();
    await expect(page.getByRole('button', { name: 'Cerrar' })).toHaveAttribute(
      'aria-expanded',
      'true',
    );
  }
}

/**
 * Llega a una página desde el menú, como un usuario con ratón: abre el menú en móvil, despliega el
 * grupo del enlace (si no es un enlace directo) y pulsa el enlace. Único sitio de las pruebas que
 * sabe en qué grupo está cada enlace (lo dice `GRUPOS_NAVEGACION`). Cuando lo que se prueba no es el
 * menú, basta con `page.goto(url(ruta))`.
 */
export async function irPorMenu(page: Page, titulo: string): Promise<void> {
  await abrirMenuMovil(page);
  const grupo = grupoDe(titulo);
  if (!grupo.directo) {
    const boton = menu(page).getByRole('button', { name: grupo.titulo });
    if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
  }
  const enlace = menu(page).getByRole('link', { name: titulo, exact: true });
  await expect(enlace).toBeVisible();
  await enlace.click();
}

/** Lo mismo que `irPorMenu`, solo con el teclado (foco, Intro y Tab). */
export async function irPorMenuConTeclado(page: Page, titulo: string): Promise<void> {
  const botonMenu = page.getByRole('button', { name: 'Menú' });
  if (await botonMenu.isVisible()) {
    await botonMenu.focus();
    await page.keyboard.press('Enter');
  }
  const grupo = grupoDe(titulo);
  if (grupo.directo) {
    const enlace = menu(page).getByRole('link', { name: titulo, exact: true });
    await enlace.focus();
    await expect(enlace).toBeFocused();
  } else {
    const boton = menu(page).getByRole('button', { name: grupo.titulo });
    await boton.focus();
    await page.keyboard.press('Enter');
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
    for (const e of grupo.enlaces) {
      await page.keyboard.press('Tab');
      await expect(menu(page).getByRole('link', { name: e.titulo, exact: true })).toBeFocused();
      if (e.titulo === titulo) break;
    }
  }
  await page.keyboard.press('Enter');
}

/**
 * Devuelve el índice de la página («En esta página» o el nombre que tenga) y, si está plegado (en
 * móvil), lo abre con su botón.
 */
export async function abrirIndice(page: Page, nombre = 'En esta página'): Promise<Locator> {
  const indice = page.getByRole('navigation', { name: nombre });
  const boton = indice.getByRole('button', { name: nombre });
  if (await boton.isVisible()) {
    if ((await boton.getAttribute('aria-expanded')) !== 'true') await boton.click();
    await expect(boton).toHaveAttribute('aria-expanded', 'true');
  }
  await expect(indice.getByRole('link').first()).toBeVisible();
  return indice;
}
