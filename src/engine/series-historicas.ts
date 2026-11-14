/**
 * Utilidades para series históricas anuales de /data (Fase 5-A).
 *
 * Lógica pura, sin React ni DOM. Cada cálculo derivado (índice base 100, cociente, porcentaje del
 * PIB, suma, diferencia) es una función pequeña y documentada, reproducible a partir de los
 * ficheros de /data. Los datos con fuente se rastrean con `datoDeSerie`, que construye el `Dato`
 * que espera `SourceLine`.
 */
import { Dato, type ArchivoDatos, type Serie } from './esquema-datos';

/** Valor de una serie en un año natural. */
export interface PuntoAnual {
  readonly anio: number;
  readonly valor: number;
}

const PATRON_ANIO = /^\d{4}$/;

/** Busca una serie por su `id`; falla si no existe (los datos son una dependencia dura). */
export function encontrarSerie(archivo: ArchivoDatos, id: string): Serie {
  const serie = archivo.series?.find((s) => s.id === id);
  if (!serie) throw new Error(`Falta la serie «${id}» en el fichero «${archivo.id}»`);
  return serie;
}

/** Puntos anuales de una serie, ordenados por año. Rechaza periodos que no sean un año. */
export function puntosAnuales(serie: Serie): PuntoAnual[] {
  return serie.points
    .map((punto) => {
      if (!PATRON_ANIO.test(punto.period)) {
        throw new RangeError(`La serie ${serie.id} no es anual (periodo ${punto.period})`);
      }
      return { anio: Number(punto.period), valor: punto.value };
    })
    .sort((a, b) => a.anio - b.anio);
}

/** Puntos anuales de los datos sueltos de un fichero (`data`), p. ej. el límite de desembolso. */
export function puntosDeDatos(archivo: ArchivoDatos): PuntoAnual[] {
  return (archivo.data ?? [])
    .map((dato) => {
      if (!PATRON_ANIO.test(dato.period) || typeof dato.value !== 'number') {
        throw new RangeError(`${archivo.id}/${dato.id}: se esperaba un valor numérico anual`);
      }
      return { anio: Number(dato.period), valor: dato.value };
    })
    .sort((a, b) => a.anio - b.anio);
}

/** Valor de un año, o `undefined` si la serie no lo tiene. */
export function valorEn(puntos: readonly PuntoAnual[], anio: number): number | undefined {
  return puntos.find((p) => p.anio === anio)?.valor;
}

/** Primer y último punto; falla si la serie está vacía. */
export function extremos(puntos: readonly PuntoAnual[]): {
  primero: PuntoAnual;
  ultimo: PuntoAnual;
} {
  const primero = puntos[0];
  const ultimo = puntos.at(-1);
  if (!primero || !ultimo) throw new RangeError('La serie no tiene puntos');
  return { primero, ultimo };
}

/** Años presentes en las dos series, en orden. */
export function aniosComunes(a: readonly PuntoAnual[], b: readonly PuntoAnual[]): number[] {
  const deB = new Set(b.map((p) => p.anio));
  return a.filter((p) => deB.has(p.anio)).map((p) => p.anio);
}

/** Recorta una serie al intervalo cerrado [desde, hasta]. */
export function recortar(
  puntos: readonly PuntoAnual[],
  desde: number,
  hasta: number,
): PuntoAnual[] {
  return puntos.filter((p) => p.anio >= desde && p.anio <= hasta);
}

/**
 * Índice base 100: valor(t) ÷ valor(año base) × 100. Falla si el año base no existe o su valor es
 * cero (no se puede rebasar).
 */
export function indiceBase100(puntos: readonly PuntoAnual[], anioBase: number): PuntoAnual[] {
  const base = valorEn(puntos, anioBase);
  if (base === undefined) throw new RangeError(`La serie no tiene dato en el año base ${anioBase}`);
  if (base === 0) throw new RangeError(`El valor del año base ${anioBase} es cero`);
  return puntos.map((p) => ({ anio: p.anio, valor: (p.valor / base) * 100 }));
}

/** Combina dos series año a año (solo los años comunes). */
function combinar(
  a: readonly PuntoAnual[],
  b: readonly PuntoAnual[],
  operacion: (x: number, y: number) => number,
): PuntoAnual[] {
  const deB = new Map(b.map((p) => [p.anio, p.valor]));
  const salida: PuntoAnual[] = [];
  for (const p of a) {
    const otro = deB.get(p.anio);
    if (otro !== undefined) salida.push({ anio: p.anio, valor: operacion(p.valor, otro) });
  }
  return salida;
}

/** Cociente año a año `a ÷ b × factor`. Falla si algún denominador es cero. */
export function cociente(
  a: readonly PuntoAnual[],
  b: readonly PuntoAnual[],
  factor = 1,
): PuntoAnual[] {
  return combinar(a, b, (x, y) => {
    if (y === 0) throw new RangeError('Cociente con denominador cero');
    return (x / y) * factor;
  });
}

/** Suma año a año. */
export function suma(a: readonly PuntoAnual[], b: readonly PuntoAnual[]): PuntoAnual[] {
  return combinar(a, b, (x, y) => x + y);
}

/** Diferencia año a año `a − b`. */
export function diferencia(a: readonly PuntoAnual[], b: readonly PuntoAnual[]): PuntoAnual[] {
  return combinar(a, b, (x, y) => x - y);
}

/** Multiplica cada valor por un factor (p. ej., 14 pagas o un cambio de unidades). */
export function escalar(puntos: readonly PuntoAnual[], factor: number): PuntoAnual[] {
  return puntos.map((p) => ({ anio: p.anio, valor: p.valor * factor }));
}

/**
 * Magnitud en millones de euros como porcentaje del PIB corriente en millones de euros:
 * magnitud ÷ PIB × 100. Devuelve los puntos en puntos de PIB (1,5 significa 1,5 % del PIB).
 */
export function porcentajeDelPib(
  magnitudMeur: readonly PuntoAnual[],
  pibMeur: readonly PuntoAnual[],
): PuntoAnual[] {
  return cociente(magnitudMeur, pibMeur, 100);
}

/** Variación entre dos años: absoluta y relativa (fracción). */
export interface Variacion {
  readonly desde: number;
  readonly hasta: number;
  readonly valorDesde: number;
  readonly valorHasta: number;
  readonly absoluta: number;
  /** Fracción (0,25 = +25 %). `null` si el valor inicial es cero. */
  readonly relativa: number | null;
}

/** Variación de una serie entre dos años (por defecto, entre sus extremos). */
export function variacion(
  puntos: readonly PuntoAnual[],
  desde?: number,
  hasta?: number,
): Variacion {
  const { primero, ultimo } = extremos(puntos);
  const a = desde ?? primero.anio;
  const b = hasta ?? ultimo.anio;
  const va = valorEn(puntos, a);
  const vb = valorEn(puntos, b);
  if (va === undefined || vb === undefined) {
    throw new RangeError(`La serie no tiene dato en ${va === undefined ? a : b}`);
  }
  return {
    desde: a,
    hasta: b,
    valorDesde: va,
    valorHasta: vb,
    absoluta: vb - va,
    relativa: va === 0 ? null : (vb - va) / Math.abs(va),
  };
}

/** Año y valor del máximo (primero que aparezca en caso de empate). */
export function maximo(puntos: readonly PuntoAnual[]): PuntoAnual {
  const { primero } = extremos(puntos);
  return puntos.reduce((m, p) => (p.valor > m.valor ? p : m), primero);
}

/** Año y valor del mínimo (primero que aparezca en caso de empate). */
export function minimo(puntos: readonly PuntoAnual[]): PuntoAnual {
  const { primero } = extremos(puntos);
  return puntos.reduce((m, p) => (p.valor < m.valor ? p : m), primero);
}

/** Variación entre dos años consecutivos de la serie. */
export interface SaltoInteranual extends Variacion {
  /** Valor de la variación relativa (fracción); nunca `null` (se descartan los años que parten de cero). */
  readonly relativa: number;
}

/**
 * Mayor variación relativa (en valor absoluto) entre dos años consecutivos presentes en la serie.
 * Descarta los pares cuyo primer valor es cero. `null` si no hay ningún par.
 */
export function mayorVariacionInteranual(puntos: readonly PuntoAnual[]): SaltoInteranual | null {
  let mejor: SaltoInteranual | null = null;
  for (let i = 1; i < puntos.length; i++) {
    const a = puntos[i - 1];
    const b = puntos[i];
    if (a === undefined || b === undefined || b.anio !== a.anio + 1 || a.valor === 0) continue;
    const relativa = (b.valor - a.valor) / Math.abs(a.valor);
    if (mejor === null || Math.abs(relativa) > Math.abs(mejor.relativa)) {
      mejor = {
        desde: a.anio,
        hasta: b.anio,
        valorDesde: a.valor,
        valorHasta: b.valor,
        absoluta: b.valor - a.valor,
        relativa,
      };
    }
  }
  return mejor;
}

/** Mayor descenso entre un máximo previo y un valor posterior de la serie. */
export interface Caida {
  readonly maximo: PuntoAnual;
  readonly minimo: PuntoAnual;
  /** Descenso absoluto (positivo). */
  readonly absoluta: number;
  /** Descenso relativo al máximo previo (fracción positiva); `null` si el máximo es cero. */
  readonly relativa: number | null;
}

/** Mayor caída «de pico a valle» de la serie, o `null` si la serie nunca desciende. */
export function mayorCaida(puntos: readonly PuntoAnual[]): Caida | null {
  let pico: PuntoAnual | undefined;
  let mejor: Caida | null = null;
  for (const p of puntos) {
    if (pico === undefined || p.valor > pico.valor) pico = p;
    const bajada = pico.valor - p.valor;
    if (bajada > 0 && (mejor === null || bajada > mejor.absoluta)) {
      mejor = {
        maximo: pico,
        minimo: p,
        absoluta: bajada,
        relativa: pico.valor === 0 ? null : bajada / Math.abs(pico.valor),
      };
    }
  }
  return mejor;
}

/**
 * `Dato` de una serie para `SourceLine`: toma el último punto, o el del periodo indicado. Hereda
 * fuente, fecha de descarga, confianza y notas de la serie.
 */
export function datoDeSerie(serie: Serie, periodo?: string): Dato {
  const masReciente = [...serie.points].sort((a, b) => a.period.localeCompare(b.period)).at(-1);
  const punto =
    periodo === undefined ? masReciente : serie.points.find((p) => p.period === periodo);
  if (!punto) throw new RangeError(`La serie ${serie.id} no tiene el periodo ${periodo ?? '—'}`);
  return Dato.parse({
    value: punto.value,
    unit: serie.unit,
    period: punto.period,
    source: serie.source,
    fetchedAt: serie.fetchedAt,
    confidence: serie.confidence,
    ...(serie.notes === undefined ? {} : { notes: serie.notes }),
  });
}

/** `Dato` de un dato suelto (`data`) de un fichero, por su `id`. */
export function datoDeArchivo(archivo: ArchivoDatos, id: string): Dato {
  const dato = archivo.data?.find((d) => d.id === id);
  if (!dato) throw new Error(`Falta el dato «${id}» en el fichero «${archivo.id}»`);
  const { id: _id, ...sinId } = dato;
  return Dato.parse(sinId);
}

// ---------------------------------------------------------------------------
// CSV de las tablas de /data (valores entre comillas con comas incluidas)
// ---------------------------------------------------------------------------

/** Divide el texto CSV en filas de celdas, respetando comillas dobles y saltos de línea CRLF. */
export function parsearCsv(texto: string): string[][] {
  const filas: string[][] = [];
  let fila: string[] = [];
  let celda = '';
  let entreComillas = false;
  for (let i = 0; i < texto.length; i++) {
    const c = texto.charAt(i);
    if (entreComillas) {
      if (c === '"') {
        if (texto.charAt(i + 1) === '"') {
          celda += '"';
          i++;
        } else {
          entreComillas = false;
        }
      } else {
        celda += c;
      }
    } else if (c === '"') {
      entreComillas = true;
    } else if (c === ',') {
      fila.push(celda);
      celda = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && texto.charAt(i + 1) === '\n') i++;
      fila.push(celda);
      celda = '';
      if (fila.length > 1 || fila[0] !== '') filas.push(fila);
      fila = [];
    } else {
      celda += c;
    }
  }
  if (celda !== '' || fila.length > 0) {
    fila.push(celda);
    filas.push(fila);
  }
  return filas;
}

/** Filas del CSV como objetos con las cabeceras de la primera fila. */
export function filasCsv(texto: string): Record<string, string>[] {
  const [cabecera, ...resto] = parsearCsv(texto);
  if (!cabecera) return [];
  return resto.map((celdas) => {
    const objeto: Record<string, string> = {};
    cabecera.forEach((nombre, i) => {
      objeto[nombre] = celdas[i] ?? '';
    });
    return objeto;
  });
}

/** Número de una celda CSV; `null` si está vacía. Falla si no es un número. */
export function numeroCsv(celda: string | undefined): number | null {
  if (celda === undefined || celda.trim() === '') return null;
  const n = Number(celda);
  if (!Number.isFinite(n)) throw new RangeError(`Celda no numérica: «${celda}»`);
  return n;
}
