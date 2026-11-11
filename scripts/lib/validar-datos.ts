/**
 * Validación de los JSON de /data contra el esquema común (src/engine/esquema-datos.ts)
 * y regla adicional: ningún valor numérico sin una fuente con URL y fetchedAt.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { ArchivoDatos, RegistroAfirmaciones } from '../../src/engine/esquema-datos.ts';

export interface ErrorValidacion {
  readonly fichero: string;
  readonly ruta: string;
  readonly mensaje: string;
}

export interface ResultadoValidacion {
  readonly ficheros: readonly string[];
  readonly errores: readonly ErrorValidacion[];
}

type Ruta = readonly (string | number)[];

function rutaATexto(ruta: Ruta): string {
  if (ruta.length === 0) return '(raíz)';
  return ruta
    .map((p) => (typeof p === 'number' ? `[${p}]` : `.${p}`))
    .join('')
    .replace(/^\./, '');
}

function esObjeto(valor: unknown): valor is Record<string, unknown> {
  return typeof valor === 'object' && valor !== null && !Array.isArray(valor);
}

function tieneFuenteVerificable(objeto: Record<string, unknown>): boolean {
  const fuente = objeto['source'];
  if (!esObjeto(fuente)) return false;
  const url = fuente['url'];
  const fecha = objeto['fetchedAt'];
  return (
    typeof url === 'string' &&
    /^https?:\/\/\S+$/.test(url) &&
    typeof fecha === 'string' &&
    fecha.trim() !== ''
  );
}

/**
 * Recorre el JSON y devuelve la ruta de cada número que no esté amparado por
 * un objeto antecesor con `source.url` y `fetchedAt`.
 */
export function buscarNumerosSinFuente(json: unknown): Ruta[] {
  const sinFuente: Ruta[] = [];
  const visitar = (valor: unknown, ruta: Ruta, amparado: boolean): void => {
    if (typeof valor === 'number') {
      if (!amparado) sinFuente.push(ruta);
      return;
    }
    if (Array.isArray(valor)) {
      valor.forEach((v, i) => {
        visitar(v, [...ruta, i], amparado);
      });
      return;
    }
    if (esObjeto(valor)) {
      const amparadoAqui = amparado || tieneFuenteVerificable(valor);
      for (const [clave, v] of Object.entries(valor)) {
        visitar(v, [...ruta, clave], amparadoAqui);
      }
    }
  };
  visitar(json, [], false);
  return sinFuente;
}

/** Valida el contenido (ya parseado) de un fichero de /data. */
export function validarContenido(json: unknown, fichero: string): ErrorValidacion[] {
  const errores: ErrorValidacion[] = buscarNumerosSinFuente(json).map((ruta) => ({
    fichero,
    ruta: rutaATexto(ruta),
    mensaje: 'Dato numérico sin fuente verificable (falta source.url o fetchedAt)',
  }));
  const resultado = ArchivoDatos.safeParse(json);
  if (!resultado.success) {
    for (const problema of resultado.error.issues) {
      errores.push({
        fichero,
        ruta: rutaATexto(problema.path as Ruta),
        mensaje: problema.message,
      });
    }
  }
  return errores;
}

async function listarJson(directorio: string): Promise<string[]> {
  const entradas = await readdir(directorio, { withFileTypes: true, recursive: true });
  return entradas
    .filter((e) => e.isFile() && e.name.endsWith('.json'))
    .map((e) => path.join(e.parentPath, e.name))
    .sort();
}

async function leerJson(
  fichero: string,
  relativo: string,
): Promise<{ json: unknown } | { error: ErrorValidacion }> {
  try {
    return { json: JSON.parse(await readFile(fichero, 'utf8')) as unknown };
  } catch (e) {
    const mensaje = e instanceof Error ? e.message : String(e);
    return { error: { fichero: relativo, ruta: '(raíz)', mensaje: `JSON no válido: ${mensaje}` } };
  }
}

/** Valida todos los JSON de un directorio (recursivo). */
export async function validarDirectorio(
  directorio: string,
  raiz = process.cwd(),
): Promise<ResultadoValidacion> {
  const ficheros = await listarJson(directorio);
  const errores: ErrorValidacion[] = [];
  for (const fichero of ficheros) {
    const relativo = path.relative(raiz, fichero);
    const leido = await leerJson(fichero, relativo);
    if ('error' in leido) {
      errores.push(leido.error);
      continue;
    }
    errores.push(...validarContenido(leido.json, relativo));
  }
  return { ficheros: ficheros.map((f) => path.relative(raiz, f)), errores };
}

/** Valida el registro de afirmaciones factuales (docs/claims.json). */
export async function validarAfirmaciones(
  fichero: string,
  raiz = process.cwd(),
): Promise<ErrorValidacion[]> {
  const relativo = path.relative(raiz, fichero);
  const leido = await leerJson(fichero, relativo);
  if ('error' in leido) return [leido.error];
  const resultado = RegistroAfirmaciones.safeParse(leido.json);
  if (resultado.success) return [];
  return resultado.error.issues.map((problema) => ({
    fichero: relativo,
    ruta: rutaATexto(problema.path as Ruta),
    mensaje: problema.message,
  }));
}
