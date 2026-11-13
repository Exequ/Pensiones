/**
 * Validación de los JSON de /data contra el esquema común (src/engine/esquema-datos.ts)
 * y regla adicional: ningún valor numérico sin una fuente con URL y fetchedAt.
 */
import { existsSync } from 'node:fs';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import {
  ArchivoCronologia,
  ArchivoMitos,
  ArchivoDatos,
  ArchivoPersonas,
  ArchivoPrestaciones,
  ArchivoTabla,
  RegistroAfirmaciones,
} from '../../src/engine/esquema-datos.ts';

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
  const tipo = esObjeto(json) ? json['tipo'] : undefined;
  const esquema =
    tipo === 'cronologia'
      ? ArchivoCronologia
      : tipo === 'prestaciones'
        ? ArchivoPrestaciones
        : tipo === 'tabla'
          ? ArchivoTabla
          : tipo === 'mitos'
            ? ArchivoMitos
            : tipo === 'personas'
              ? ArchivoPersonas
              : ArchivoDatos;
  const resultado = esquema.safeParse(json);
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

/** Divide una línea CSV (RFC 4180 simplificado: comillas dobles con «""» como comilla escapada). */
export function celdasCsv(linea: string): string[] {
  const celdas: string[] = [];
  let actual = '';
  let entrecomillado = false;
  for (let i = 0; i < linea.length; i++) {
    const c = linea[i];
    if (entrecomillado) {
      if (c === '"' && linea[i + 1] === '"') {
        actual += '"';
        i++;
      } else if (c === '"') entrecomillado = false;
      else actual += c ?? '';
    } else if (c === '"') entrecomillado = true;
    else if (c === ',') {
      celdas.push(actual);
      actual = '';
    } else actual += c ?? '';
  }
  celdas.push(actual);
  return celdas;
}

/**
 * Comprueba el CSV hermano de una tabla: existe, su cabecera coincide con `columnas`, el número
 * de filas coincide con `filas` y cada fila tiene tantas celdas como columnas.
 */
export async function validarCsvHermano(
  json: unknown,
  ficheroJson: string,
  relativo: string,
): Promise<ErrorValidacion[]> {
  const resultado = ArchivoTabla.safeParse(json);
  if (!resultado.success) return [];
  const csv = ficheroJson.replace(/\.json$/, '.csv');
  const error = (mensaje: string): ErrorValidacion[] => [
    { fichero: relativo, ruta: '(csv)', mensaje },
  ];
  if (!existsSync(csv)) return error(`Falta el CSV hermano ${path.basename(csv)}`);
  const lineas = (await readFile(csv, 'utf8')).split('\n').filter((l) => l.trim() !== '');
  const cabecera = celdasCsv(lineas[0] ?? '');
  const esperada = resultado.data.columnas.map((c) => c.id);
  if (cabecera.join(',') !== esperada.join(',')) {
    return error(`La cabecera del CSV no coincide con «columnas»: ${cabecera.join(',')}`);
  }
  if (lineas.length - 1 !== resultado.data.filas) {
    return error(`«filas» indica ${resultado.data.filas} y el CSV tiene ${lineas.length - 1}`);
  }
  const mala = lineas.findIndex((l) => celdasCsv(l).length !== esperada.length);
  if (mala >= 0) return error(`La fila ${mala} del CSV no tiene ${esperada.length} columnas`);
  return [];
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
    errores.push(...(await validarCsvHermano(leido.json, fichero, relativo)));
  }
  // Todo CSV de /data necesita su JSON hermano con la procedencia.
  const entradas = await readdir(directorio, { withFileTypes: true, recursive: true });
  for (const e of entradas) {
    if (!e.isFile() || !e.name.endsWith('.csv')) continue;
    const csv = path.join(e.parentPath, e.name);
    if (!existsSync(csv.replace(/\.csv$/, '.json'))) {
      errores.push({
        fichero: path.relative(raiz, csv),
        ruta: '(csv)',
        mensaje: 'CSV sin JSON hermano con fuente, fecha de descarga y confianza',
      });
    }
  }
  return { ficheros: ficheros.map((f) => path.relative(raiz, f)), errores };
}

/** Identificadores de los elementos de un fichero de /data (datos, series, normas, prestaciones). */
export function idsDeArchivo(json: unknown): Set<string> {
  const ids = new Set<string>();
  if (!esObjeto(json)) return ids;
  for (const coleccion of ['data', 'series', 'normas', 'prestaciones']) {
    const elementos = json[coleccion];
    if (!Array.isArray(elementos)) continue;
    for (const elemento of elementos) {
      if (esObjeto(elemento) && typeof elemento['id'] === 'string') ids.add(elemento['id']);
    }
  }
  return ids;
}

/**
 * Valida el registro de afirmaciones factuales (docs/claims.json) y, si se
 * indica el directorio de datos, que cada referencia «carpeta/fichero.json#id» exista.
 */
export async function validarAfirmaciones(
  fichero: string,
  raiz = process.cwd(),
  directorioDatos?: string,
): Promise<ErrorValidacion[]> {
  const relativo = path.relative(raiz, fichero);
  const leido = await leerJson(fichero, relativo);
  if ('error' in leido) return [leido.error];
  const resultado = RegistroAfirmaciones.safeParse(leido.json);
  if (!resultado.success) {
    return resultado.error.issues.map((problema) => ({
      fichero: relativo,
      ruta: rutaATexto(problema.path as Ruta),
      mensaje: problema.message,
    }));
  }
  if (directorioDatos === undefined) return [];
  const errores: ErrorValidacion[] = [];
  const cache = new Map<string, Set<string> | null>();
  for (const [i, claim] of resultado.data.claims.entries()) {
    for (const [j, referencia] of claim.datos.entries()) {
      const [ruta = '', id = ''] = referencia.split('#');
      if (!cache.has(ruta)) {
        const leidoDato = await leerJson(path.join(directorioDatos, ruta), ruta);
        cache.set(ruta, 'error' in leidoDato ? null : idsDeArchivo(leidoDato.json));
      }
      const ids = cache.get(ruta);
      if (!ids?.has(id)) {
        errores.push({
          fichero: relativo,
          ruta: `claims[${i}].datos[${j}]`,
          mensaje: `La referencia ${referencia} no existe en /data`,
        });
      }
    }
  }
  return errores;
}

/** Referencias («carpeta/fichero.json» o «carpeta/fichero.json#id») de un catálogo de afirmaciones circulantes. */
function referenciasDeMitos(json: unknown): { ruta: string; referencia: string }[] {
  const out: { ruta: string; referencia: string }[] = [];
  if (!esObjeto(json) || json['tipo'] !== 'mitos' || !Array.isArray(json['mitos'])) return out;
  json['mitos'].forEach((m, i) => {
    if (!esObjeto(m)) return;
    const lista = (v: unknown, ruta: string) => {
      if (Array.isArray(v))
        v.forEach((r, j) => {
          if (typeof r === 'string') out.push({ ruta: `${ruta}[${j}]`, referencia: r });
        });
    };
    lista(m['datos'], `mitos[${i}].datos`);
    if (Array.isArray(m['definiciones']))
      m['definiciones'].forEach((d, k) => {
        if (esObjeto(d)) lista(d['datos'], `mitos[${i}].definiciones[${k}].datos`);
      });
  });
  return out;
}

/** Comprueba que cada referencia de los catálogos de afirmaciones circulantes existe en /data. */
export async function validarReferenciasMitos(
  directorio: string,
  raiz = process.cwd(),
): Promise<ErrorValidacion[]> {
  const errores: ErrorValidacion[] = [];
  const carpeta = path.join(directorio, 'mitos');
  if (!existsSync(carpeta)) return errores;
  const cache = new Map<string, Set<string> | null>();
  for (const fichero of await listarJson(carpeta)) {
    const relativo = path.relative(raiz, fichero);
    const leido = await leerJson(fichero, relativo);
    if ('error' in leido) continue;
    for (const { ruta, referencia } of referenciasDeMitos(leido.json)) {
      const [rutaDato = '', id] = referencia.split('#');
      if (!cache.has(rutaDato)) {
        const dato = await leerJson(path.join(directorio, rutaDato), rutaDato);
        cache.set(rutaDato, 'error' in dato ? null : idsDeArchivo(dato.json));
      }
      const ids = cache.get(rutaDato);
      if (ids === null || ids === undefined || (id !== undefined && !ids.has(id))) {
        errores.push({
          fichero: relativo,
          ruta,
          mensaje: `La referencia ${referencia} no existe en /data`,
        });
      }
    }
  }
  return errores;
}
