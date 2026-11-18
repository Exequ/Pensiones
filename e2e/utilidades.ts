import { readFileSync } from 'node:fs';
import path from 'node:path';
import { expect, type Locator, type Page } from '@playwright/test';
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
