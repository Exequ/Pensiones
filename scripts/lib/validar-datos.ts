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
  ArchivoExtraccionPdf,
  ArchivoPersonas,
  ArchivoPrestaciones,
  ArchivoProyeccion,
  ArchivoTabla,
  RegistroAfirmaciones,
  type ArchivoExtraccionPdf as TipoExtraccionPdf,
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
          : tipo === 'extraccion-pdf'
            ? ArchivoExtraccionPdf
            : tipo === 'mitos'
              ? ArchivoMitos
              : tipo === 'personas'
                ? ArchivoPersonas
                : tipo === 'proyeccion'
                  ? ArchivoProyeccion
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
  // Fase 5-B1: lo que sale de un modelo se distingue siempre de lo observado. Todo fichero de
  // `data/proyecciones/` es una proyección de modelo y ninguna proyección vive fuera de esa carpeta.
  const enCarpetaProyecciones = /(^|[\\/])proyecciones[\\/][^\\/]+\.json$/.test(fichero);
  if (enCarpetaProyecciones && tipo !== 'proyeccion') {
    errores.push({
      fichero,
      ruta: 'tipo',
      mensaje: 'Los ficheros de data/proyecciones/ deben ser de tipo «proyeccion»',
    });
  }
  if (!enCarpetaProyecciones && tipo === 'proyeccion') {
    errores.push({
      fichero,
      ruta: 'tipo',
      mensaje: 'Los ficheros de tipo «proyeccion» solo pueden estar en data/proyecciones/',
    });
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
 * Comprueba el CSV de una extracción de PDF (Fase 5-A3): además de la cabecera y del número de
 * filas, cada fila cita un PDF de `origenes` con su huella, una página dentro del documento, cifras
 * numéricas en las columnas con unidad y un identificador único; y las filas marcadas como no
 * verificadas coinciden con las tablas cuyas validaciones fallan.
 */
export function validarCsvExtraccion(
  archivo: TipoExtraccionPdf,
  lineas: readonly string[],
  relativo: string,
): ErrorValidacion[] {
  const errores: ErrorValidacion[] = [];
  const error = (ruta: string, mensaje: string) =>
    errores.push({ fichero: relativo, ruta, mensaje });
  const columnas = archivo.columnas.map((c) => c.id);
  const cabecera = celdasCsv(lineas[0] ?? '');
  if (cabecera.join(',') !== columnas.join(',')) {
    return [
      {
        fichero: relativo,
        ruta: '(csv)',
        mensaje: `La cabecera del CSV no coincide con «columnas»`,
      },
    ];
  }
  if (lineas.length - 1 !== archivo.filas) {
    return [
      {
        fichero: relativo,
        ruta: '(csv)',
        mensaje: `«filas» indica ${archivo.filas} y el CSV tiene ${lineas.length - 1}`,
      },
    ];
  }
  const origenes = new Map(archivo.origenes.map((o) => [o.fichero, o]));
  const indice = (columna: string) => columnas.indexOf(columna);
  const columnasNumericas = archivo.columnas.filter((c) => c.unidad !== null).map((c) => c.id);
  const vistos = new Set<string>();
  const sinVerificar = new Set<string>();
  lineas.slice(1).forEach((linea, k) => {
    const n = k + 2;
    const celdas = celdasCsv(linea);
    if (celdas.length !== columnas.length) {
      error(`(csv) línea ${n}`, `La fila no tiene ${columnas.length} columnas`);
      return;
    }
    const celda = (columna: string) => celdas[indice(columna)] ?? '';
    const origen = origenes.get(celda('fichero'));
    if (origen === undefined) {
      error(`(csv) línea ${n}`, `El fichero «${celda('fichero')}» no figura en «origenes»`);
    } else if (celda('sha256') !== origen.sha256) {
      error(`(csv) línea ${n}`, 'La huella SHA-256 de la fila no coincide con la de «origenes»');
    }
    const pagina = Number(celda('pagina'));
    const paginaEnDocumento =
      indice('pagina_extracto') >= 0 ? Number(celda('pagina_extracto')) : pagina;
    if (!Number.isInteger(pagina) || pagina < 1) error(`(csv) línea ${n}`, 'Página no válida');
    else if (
      origen !== undefined &&
      (!Number.isInteger(paginaEnDocumento) ||
        paginaEnDocumento < 1 ||
        paginaEnDocumento > origen.paginas)
    ) {
      error(`(csv) línea ${n}`, 'La página queda fuera del documento');
    }
    for (const columna of columnasNumericas) {
      if (celda(columna) !== '' && !Number.isFinite(Number(celda(columna)))) {
        error(`(csv) línea ${n}`, `«${columna}» no es numérico`);
      }
    }
    if (indice('id') >= 0) {
      if (vistos.has(celda('id')))
        error(`(csv) línea ${n}`, `Identificador repetido: ${celda('id')}`);
      vistos.add(celda('id'));
    }
    if (indice('verificado') >= 0) {
      const v = celda('verificado');
      if (v !== 'si' && v !== 'no') error(`(csv) línea ${n}`, '«verificado» debe ser «si» o «no»');
      if (v === 'no') sinVerificar.add(`${celda('ejercicio_pdf')}|${celda('tabla')}`);
    }
  });
  if (indice('verificado') >= 0) {
    const fallan = new Set(
      archivo.validacionesPorTabla
        .filter((v) => v.incorrectas > 0)
        .map((v) => `${v.ejercicio_pdf}|${v.tabla}`),
    );
    for (const clave of fallan) {
      if (!sinVerificar.has(clave)) {
        error(
          '(csv)',
          `La tabla ${clave} tiene validaciones fallidas y sus cifras no están marcadas «no»`,
        );
      }
    }
    for (const clave of sinVerificar) {
      if (!fallan.has(clave)) {
        error(
          '(csv)',
          `La tabla ${clave} está marcada «no» sin una validación fallida que lo explique`,
        );
      }
    }
  }
  return errores;
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
  const extraccion = ArchivoExtraccionPdf.safeParse(json);
  const resultado = ArchivoTabla.safeParse(json);
  if (!resultado.success && !extraccion.success) return [];
  const csv = ficheroJson.replace(/\.json$/, '.csv');
  const error = (mensaje: string): ErrorValidacion[] => [
    { fichero: relativo, ruta: '(csv)', mensaje },
  ];
  if (!existsSync(csv)) return error(`Falta el CSV hermano ${path.basename(csv)}`);
  const lineas = (await readFile(csv, 'utf8')).split('\n').filter((l) => l.trim() !== '');
  if (extraccion.success) return validarCsvExtraccion(extraccion.data, lineas, relativo);
  if (!resultado.success) return [];
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
  for (const coleccion of ['data', 'series', 'normas', 'prestaciones', 'personas']) {
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
