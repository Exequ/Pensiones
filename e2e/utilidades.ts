import { readFileSync } from 'node:fs';
import path from 'node:path';
import type { Page } from '@playwright/test';
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
