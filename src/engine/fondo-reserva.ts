/**
 * Lecturas de los datos del Fondo de Reserva y de los préstamos del Estado que la página «La
 * hucha» explica con palabras (fase R8): qué componentes dotan el Fondo, en qué años, y cuándo
 * acaba el plazo de cada préstamo. Lógica pura, sin React ni DOM: los años y las cifras salen de los
 * datos, nunca del texto.
 */

/** Año de la tabla del Fondo con las dotaciones acumuladas desde el año 2000 por componente. */
export interface FilaDotacionAcumulada {
  readonly anio: number;
  /** Excedentes de entidades gestoras y servicios comunes, acumulado (millones de euros). */
  readonly entidades: number | null;
  /** Excedentes de las mutuas colaboradoras, acumulado. */
  readonly mutuas: number | null;
  /** Cotización finalista del Mecanismo de Equidad Intergeneracional, acumulado. */
  readonly mei: number | null;
  /** Dotaciones acumuladas totales. */
  readonly total: number | null;
  /** Disposiciones acumuladas (negativas). */
  readonly disposiciones?: number | null;
}

export interface ComponentesDotacion {
  /** Todas las filas con los cuatro datos cumplen: total = entidades + mutuas + MEI (±1 de redondeo). */
  readonly sumaCuadra: boolean;
  /** Último año en que aumenta la aportación acumulada de las entidades gestoras. */
  readonly ultimoAnioEntidades: number;
  /** Primer año con aportación del MEI. */
  readonly primerAnioMei: number;
  /** Tramos de años consecutivos sin aportación de las mutuas, entre el primer y el último año con aportación. */
  readonly tramosSinMutuas: readonly (readonly [number, number])[];
  /** Años con aportación de las mutuas. */
  readonly aniosConMutuas: readonly number[];
  /** Años con disposición del Fondo (variación negativa de las disposiciones acumuladas). */
  readonly aniosConDisposicion: readonly number[];
}

const completa = (f: FilaDotacionAcumulada) =>
  f.entidades !== null && f.mutuas !== null && f.mei !== null && f.total !== null;

/** Variaciones anuales de una serie acumulada (sin la primera fila, que acumula varios años). */
function variaciones(
  filas: readonly FilaDotacionAcumulada[],
  campo: 'entidades' | 'mutuas' | 'mei' | 'disposiciones',
): { anio: number; valor: number }[] {
  const salida: { anio: number; valor: number }[] = [];
  for (let i = 1; i < filas.length; i++) {
    const actual = filas[i]?.[campo];
    const previa = filas[i - 1]?.[campo];
    const anio = filas[i]?.anio;
    if (actual === null || actual === undefined || previa === null || previa === undefined)
      continue;
    if (anio === undefined) continue;
    salida.push({ anio, valor: actual - previa });
  }
  return salida;
}

/** Lee de las dotaciones acumuladas qué componentes dotan el Fondo y en qué años. */
export function componentesDotacion(filas: readonly FilaDotacionAcumulada[]): ComponentesDotacion {
  const ordenadas = [...filas].sort((a, b) => a.anio - b.anio);
  const sumaCuadra = ordenadas
    .filter(completa)
    .every(
      (f) => Math.abs((f.entidades ?? 0) + (f.mutuas ?? 0) + (f.mei ?? 0) - (f.total ?? 0)) <= 1,
    );
  const entidades = variaciones(ordenadas, 'entidades').filter((v) => v.valor > 0);
  const mei = variaciones(ordenadas, 'mei').filter((v) => v.valor > 0);
  const mutuas = variaciones(ordenadas, 'mutuas');
  const aniosConMutuas = mutuas.filter((v) => v.valor > 0).map((v) => v.anio);
  const primero = aniosConMutuas[0];
  const ultimo = aniosConMutuas.at(-1);
  const tramosSinMutuas: [number, number][] = [];
  if (primero !== undefined && ultimo !== undefined) {
    let inicio: number | null = null;
    let anterior = primero;
    for (const v of mutuas.filter((x) => x.anio > primero && x.anio < ultimo)) {
      if (v.valor <= 0) {
        inicio ??= v.anio;
        anterior = v.anio;
      } else if (inicio !== null) {
        tramosSinMutuas.push([inicio, anterior]);
        inicio = null;
      }
    }
    if (inicio !== null) tramosSinMutuas.push([inicio, anterior]);
  }
  const ultimoEntidades = entidades.at(-1);
  const primerMei = mei[0];
  if (ultimoEntidades === undefined || primerMei === undefined)
    throw new RangeError('Sin aportaciones de las entidades o del MEI en las dotaciones');
  return {
    sumaCuadra,
    ultimoAnioEntidades: ultimoEntidades.anio,
    primerAnioMei: primerMei.anio,
    tramosSinMutuas,
    aniosConMutuas,
    aniosConDisposicion: variaciones(ordenadas, 'disposiciones')
      .filter((v) => v.valor < 0)
      .map((v) => v.anio),
  };
}

/** Plazo de cancelación de un préstamo tal como lo escribe el anexo del Tribunal de Cuentas. */
export interface PlazoPrestamo {
  /** Años del plazo máximo. */
  readonly anios: number;
  /** Primer año del plazo. */
  readonly desde: number;
  /** Último año en que acaba el plazo máximo (el año de inicio más los años del plazo, menos uno). */
  readonly hasta: number;
}

/**
 * Lee un vencimiento del anexo («10 años a partir de 2018», «10 años partir de 2014»). Devuelve
 * `null` si no indica plazo («No se indica»). Un plazo de N años que empieza el 1 de enero del año A
 * acaba el 31 de diciembre del año A + N − 1.
 */
export function plazoDePrestamo(vencimiento: string): PlazoPrestamo | null {
  const m = /(\d+)\s+años\s+(?:a\s+)?partir\s+de\s+(\d{4})/i.exec(vencimiento);
  if (m === null) return null;
  const anios = Number(m[1]);
  const desde = Number(m[2]);
  return { anios, desde, hasta: desde + anios - 1 };
}

/** Línea de préstamo del anexo, con lo que hace falta para leer su plazo. */
export interface LineaPlazo {
  readonly vencimiento: string;
  /** Año de concesión (solo en los préstamos recientes), o `null`. */
  readonly anioConcesion: number | null;
}

export interface EstadoPlazos {
  /** Préstamos recientes (con año de concesión y plazo): primer y último año de concesión. */
  readonly recientes: { readonly desde: number; readonly hasta: number } | null;
  /** Último año del plazo máximo del primero de los préstamos recientes. */
  readonly primerVencimientoReciente: number | null;
  /** Ninguno de los préstamos recientes ha agotado su plazo máximo a fin del año de referencia. */
  readonly ningunoRecienteVencido: boolean;
  /** Préstamos sin año de concesión cuyo plazo máximo ya había acabado a fin del año de referencia. */
  readonly antiguosVencidos: number;
  /** Préstamos sin año de concesión y sin plazo indicado en el anexo. */
  readonly antiguosSinPlazo: number;
}

/** Estado de los plazos de los préstamos a fin del año de referencia (el de la declaración). */
export function estadoDePlazos(
  lineas: readonly LineaPlazo[],
  anioReferencia: number,
): EstadoPlazos {
  const recientes = lineas.filter((l) => l.anioConcesion !== null);
  const antiguos = lineas.filter((l) => l.anioConcesion === null);
  const anios = recientes.map((l) => l.anioConcesion ?? 0);
  const plazosRecientes = recientes
    .map((l) => plazoDePrestamo(l.vencimiento))
    .filter((p): p is PlazoPrestamo => p !== null);
  const primer =
    plazosRecientes.length === 0 ? null : Math.min(...plazosRecientes.map((p) => p.hasta));
  return {
    recientes: anios.length === 0 ? null : { desde: Math.min(...anios), hasta: Math.max(...anios) },
    primerVencimientoReciente: primer,
    ningunoRecienteVencido: plazosRecientes.every((p) => p.hasta > anioReferencia),
    antiguosVencidos: antiguos.filter((l) => {
      const p = plazoDePrestamo(l.vencimiento);
      return p !== null && p.hasta <= anioReferencia;
    }).length,
    antiguosSinPlazo: antiguos.filter((l) => plazoDePrestamo(l.vencimiento) === null).length,
  };
}
