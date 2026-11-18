import { expect } from 'vitest';
import { fireEvent } from '@testing-library/react';

/**
 * Abre el desplegable de una línea de fuente (`.linea-fuente`) con un clic normal. Mientras está
 * abierto, `linea.textContent` incluye el contenido del desplegable (título, organismo, cita…).
 */
export function abrirFuente(linea: Element | null, nombre = 'línea de fuente'): HTMLElement {
  if (!linea) throw new Error(`No hay ${nombre}`);
  const boton = linea.querySelector<HTMLButtonElement>('.linea-fuente-boton');
  if (!boton) throw new Error(`La ${nombre} no tiene botón «Fuente(s)»`);
  fireEvent.click(boton);
  return linea as HTMLElement;
}

/** Cierra el desplegable de una línea de fuente, si está abierto. */
export function cerrarFuente(linea: Element | null): void {
  linea?.querySelector<HTMLButtonElement>('.fuentes-dialogo-cerrar')?.click();
}

/** Lo que muestra una o varias líneas de fuente al abrirlas una a una. */
export interface FuentesLeidas {
  /** Texto de cada línea abierta (botón, naturaleza y desplegable), unido. */
  readonly texto: string;
  /** Destino de cada enlace de los desplegables. */
  readonly enlaces: readonly string[];
  /** Número de líneas de fuente leídas. */
  readonly lineas: number;
}

/**
 * Abre el desplegable de cada línea de fuente de un contenedor, lo lee y lo cierra (un clic normal,
 * sin forzar nada).
 */
export function leerFuentes(contenedor: Element | null, selector = '.linea-fuente'): FuentesLeidas {
  const textos: string[] = [];
  const enlaces: string[] = [];
  let lineas = 0;
  for (const linea of contenedor?.querySelectorAll(selector) ?? []) {
    abrirFuente(linea);
    lineas += 1;
    textos.push(linea.textContent);
    for (const a of linea.querySelectorAll('dialog a[href]'))
      enlaces.push(a.getAttribute('href') ?? '');
    cerrarFuente(linea);
  }
  return { texto: textos.join(' '), enlaces, lineas };
}

/** Texto de las fuentes de un contenedor (véase `leerFuentes`). */
export function textoDeFuentes(contenedor: Element | null, selector = '.linea-fuente'): string {
  return leerFuentes(contenedor, selector).texto;
}

/**
 * Comprueba que un contenedor tiene al menos una línea de fuente, que abierta muestra el título con
 * enlace y el organismo, y que no muestra la fecha de descarga ni la confianza. Devuelve el texto
 * leído, por si el test quiere comprobar algo más (la naturaleza, una cita…).
 */
export function expectFuente(contenedor: Element | null, mensaje = 'fuente'): string {
  const { texto, enlaces, lineas } = leerFuentes(contenedor);
  expect(lineas, `${mensaje}: hay una línea de fuente`).toBeGreaterThan(0);
  expect(enlaces.length, `${mensaje}: el desplegable enlaza la fuente`).toBeGreaterThan(0);
  expect(texto, `${mensaje}: nombra el organismo`).toMatch(/Organismo/);
  expect(texto, `${mensaje}: ni fecha de descarga ni confianza`).not.toMatch(
    /descargad|confianza/i,
  );
  return texto;
}
