/**
 * Cálculos de las páginas históricas del sistema (Fase 5-A): lectura de la ejecución del
 * presupuesto de la Seguridad Social, gasto aproximado en pensiones y meses de gasto del Fondo de
 * Reserva. Lógica pura: recibe los datos ya cargados.
 */
import { filasCsv, numeroCsv, type PuntoAnual } from './series-historicas';

export type TablaEjecucion =
  'ingresos' | 'gastos' | 'gastos-cap4' | 'gastos-cap4-no-contributivas' | 'ingresos-cap1-cap4';

export interface FilaEjecucion {
  readonly periodo: string;
  readonly tabla: string;
  readonly concepto: string;
  /** «principal» (ejercicio del fichero) o «comparativa» (ejercicio anterior que acompaña a la cifra). */
  readonly columna: string;
  /** Derechos reconocidos (ingresos) u obligaciones reconocidas (gastos), en millones de euros. */
  readonly reconocido: number | null;
}

/** Filas de `presupuesto-ss-ejecucion.csv`. */
export function leerEjecucion(csv: string): FilaEjecucion[] {
  return filasCsv(csv).map((f) => ({
    periodo: f['periodo'] ?? '',
    tabla: f['tabla'] ?? '',
    concepto: (f['concepto'] ?? '').trim(),
    columna: f['columna'] ?? '',
    reconocido: numeroCsv(f['derechos_u_obligaciones_meur']),
  }));
}

export interface OpcionesSerieEjecucion {
  readonly tabla: TablaEjecucion;
  /** Rótulo de la fuente; una lista permite recoger rótulos que cambian entre años. */
  readonly concepto: string | readonly string[];
  readonly desde: number;
  readonly hasta: number;
}

/**
 * Serie anual (millones de euros) de una fila de la ejecución a fin de ejercicio (T4): la cifra
 * «principal» del fichero del año o, si no existe (2017), la «comparativa» que lo acompaña.
 * Falla si un año no tiene la fila o si hay más de una candidata: no se rellena ningún hueco.
 */
export function serieEjecucion(
  filas: readonly FilaEjecucion[],
  { tabla, concepto, desde, hasta }: OpcionesSerieEjecucion,
): PuntoAnual[] {
  const rotulos = typeof concepto === 'string' ? [concepto] : concepto;
  const salida: PuntoAnual[] = [];
  for (let anio = desde; anio <= hasta; anio++) {
    const delAnio = filas.filter(
      (f) => f.periodo === `${anio}-T4` && f.tabla === tabla && rotulos.includes(f.concepto),
    );
    const principal = delAnio.filter((f) => f.columna === 'principal');
    const candidatas = principal.length > 0 ? principal : delAnio;
    if (candidatas.length !== 1) {
      throw new RangeError(
        `Ejecución ${anio}-T4, tabla «${tabla}», «${rotulos.join('» o «')}»: ${candidatas.length} filas (se esperaba una)`,
      );
    }
    const valor = candidatas[0]?.reconocido;
    if (valor === null || valor === undefined) {
      throw new RangeError(
        `Ejecución ${anio}: la fila «${rotulos.join('» o «')}» no tiene importe`,
      );
    }
    salida.push({ anio, valor });
  }
  return salida;
}

/** Clases de pensión contributiva, con las claves de `pensiones-vigor-*`. */
export const CLASES_PENSION = [
  'jubilacion',
  'viudedad',
  'incapacidad',
  'orfandad',
  'favor-familiares',
] as const;
export type ClasePension = (typeof CLASES_PENSION)[number];

/**
 * Gasto anual aproximado en pensiones contributivas (millones de euros): suma de las clases de
 * número de pensiones a 1 de diciembre × pensión media mensual de diciembre × 14 pagas ÷ 1.000.000.
 * Es un cálculo propio, distinto de las obligaciones reconocidas de la ejecución (ver
 * docs/DISCREPANCIAS.md): no incluye atrasos ni efectos de calendario y asume catorce pagas.
 */
export function gastoAproximadoPensiones(
  numero: Readonly<Record<ClasePension, readonly PuntoAnual[]>>,
  pensionMedia: Readonly<Record<ClasePension, readonly PuntoAnual[]>>,
  pagas = 14,
): PuntoAnual[] {
  const porAnio = new Map<number, number>();
  const cuenta = new Map<number, number>();
  for (const clase of CLASES_PENSION) {
    const medias = new Map(pensionMedia[clase].map((p) => [p.anio, p.valor]));
    for (const { anio, valor } of numero[clase]) {
      const media = medias.get(anio);
      if (media === undefined) continue;
      porAnio.set(anio, (porAnio.get(anio) ?? 0) + (valor * media * pagas) / 1_000_000);
      cuenta.set(anio, (cuenta.get(anio) ?? 0) + 1);
    }
  }
  // Solo los años en que las cinco clases tienen número y pensión media.
  return [...porAnio.entries()]
    .filter(([anio]) => cuenta.get(anio) === CLASES_PENSION.length)
    .map(([anio, valor]) => ({ anio, valor }))
    .sort((a, b) => a.anio - b.anio);
}

/**
 * Meses de gasto que equivale el valor del Fondo de Reserva: valor ÷ (gasto anual ÷ 12). Los dos
 * argumentos están en millones de euros; solo se calculan los años comunes.
 */
export function mesesDeGasto(
  valorFondoMeur: readonly PuntoAnual[],
  gastoAnualMeur: readonly PuntoAnual[],
): PuntoAnual[] {
  const gasto = new Map(gastoAnualMeur.map((p) => [p.anio, p.valor]));
  const salida: PuntoAnual[] = [];
  for (const { anio, valor } of valorFondoMeur) {
    const g = gasto.get(anio);
    if (g === undefined) continue;
    if (g <= 0) throw new RangeError(`Gasto no positivo en ${anio}`);
    salida.push({ anio, valor: valor / (g / 12) });
  }
  return salida;
}

/** Fila mínima de altas y bajas para comparar la pensión media de unas y otras. */
export interface FilaMediaAltaBaja {
  readonly anio: number;
  readonly movimiento: string;
  readonly clase: string;
  readonly sexo: string;
  readonly pensionMedia: number | null;
}

export interface ComparacionAltasBajas {
  /** Clases en que la media de las altas supera a la de las bajas en todos los años con dato de ambas. */
  readonly altasSuperior: readonly string[];
  /** Clases en que la media de las altas es inferior a la de las bajas en todos esos años. */
  readonly altasInferior: readonly string[];
  /** Resto de clases (signo distinto según el año, o sin años con dato de ambas). */
  readonly mixtas: readonly string[];
  readonly desde: number;
  readonly hasta: number;
}

/**
 * Compara, clase a clase y con ambos sexos, la pensión media de las altas iniciales y de las
 * bajas definitivas. Solo cuenta los años en que hay media de las dos. Sirve para describir el
 * efecto composición de la pensión media de las pensiones en vigor sin suponer su sentido.
 */
export function compararMediaAltasBajas(
  filas: readonly FilaMediaAltaBaja[],
  clases: readonly string[],
): ComparacionAltasBajas {
  const altasSuperior: string[] = [];
  const altasInferior: string[] = [];
  const mixtas: string[] = [];
  const anios: number[] = [];
  for (const clase of clases) {
    const media = (movimiento: string, anio: number) =>
      filas.find(
        (f) =>
          f.clase === clase && f.sexo === 'ambos' && f.movimiento === movimiento && f.anio === anio,
      )?.pensionMedia ?? null;
    const aniosClase = [
      ...new Set(filas.filter((f) => f.clase === clase && f.sexo === 'ambos').map((f) => f.anio)),
    ].sort((a, b) => a - b);
    const signos = aniosClase.flatMap((anio) => {
      const alta = media('alta-inicial', anio);
      const baja = media('baja-definitiva', anio);
      if (alta === null || baja === null || alta === baja) return [];
      anios.push(anio);
      return [alta > baja ? 1 : -1];
    });
    if (signos.length > 0 && signos.every((s) => s === 1)) altasSuperior.push(clase);
    else if (signos.length > 0 && signos.every((s) => s === -1)) altasInferior.push(clase);
    else mixtas.push(clase);
  }
  return {
    altasSuperior,
    altasInferior,
    mixtas,
    desde: anios.length === 0 ? 0 : Math.min(...anios),
    hasta: anios.length === 0 ? 0 : Math.max(...anios),
  };
}
