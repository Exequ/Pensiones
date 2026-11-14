/**
 * Cálculos de la lectura «La hucha frente a las transferencias del Estado» (Fase 5-A2).
 *
 * Lógica pura, sin React ni DOM: recibe datos ya cargados de /data. Cubre cuatro operaciones:
 * flujos trimestrales a partir de la ejecución acumulada, acumulada de un flujo anual desde un año
 * de inicio, valor del Fondo medido en meses de un flujo y la «construcción ilustrativa de
 * posición» (suma seleccionable de saldos y flujo acumulado). Ninguna cifra es oficial: son
 * relaciones calculadas a partir de las series de origen.
 */
import type { Serie } from './esquema-datos';
import type { PuntoAnual } from './series-historicas';
import type { FilaEjecucion, TablaEjecucion } from './sistema-historico';

export type Trimestre = 1 | 2 | 3 | 4;

/** Valor en un trimestre natural. */
export interface PuntoTrimestral {
  readonly anio: number;
  readonly trimestre: Trimestre;
  readonly valor: number;
}

const PATRON_PERIODO = /^(\d{4})-T([1-4])$/;

/** Puntos de una serie trimestral de /data (periodos «AAAA-T1» a «AAAA-T4»), ordenados. */
export function puntosTrimestrales(serie: Serie): PuntoTrimestral[] {
  return serie.points
    .map((punto) => {
      const m = PATRON_PERIODO.exec(punto.period);
      if (!m)
        throw new RangeError(`La serie ${serie.id} no es trimestral (periodo ${punto.period})`);
      return { anio: Number(m[1]), trimestre: Number(m[2]) as Trimestre, valor: punto.value };
    })
    .sort((a, b) => a.anio - b.anio || a.trimestre - b.trimestre);
}

/** Años en que un saldo anual es menor que el del año anterior (años consecutivos presentes). */
export function aniosConDescenso(saldo: readonly PuntoAnual[]): number[] {
  const ordenado = [...saldo].sort((a, b) => a.anio - b.anio);
  const descensos: number[] = [];
  ordenado.forEach((p, i) => {
    const anterior = ordenado[i - 1];
    if (anterior && anterior.anio === p.anio - 1 && p.valor < anterior.valor)
      descensos.push(p.anio);
  });
  return descensos;
}

/**
 * Valores acumulados desde enero hasta el cierre de cada trimestre (millones de euros) de una fila
 * de la ejecución del presupuesto. Para cada periodo se usa la cifra «principal» del fichero de ese
 * periodo o, si no existe (periodos que solo figuran como comparativa del año siguiente), la
 * «comparativa». Los periodos sin fila no se rellenan. Falla si hay más de una candidata.
 */
export function acumuladoTrimestral(
  filas: readonly FilaEjecucion[],
  opciones: { readonly tabla: TablaEjecucion; readonly concepto: string },
): PuntoTrimestral[] {
  const porPeriodo = new Map<string, FilaEjecucion[]>();
  for (const f of filas) {
    if (f.tabla !== opciones.tabla || f.concepto !== opciones.concepto) continue;
    if (!PATRON_PERIODO.test(f.periodo) || f.reconocido === null) continue;
    porPeriodo.set(f.periodo, [...(porPeriodo.get(f.periodo) ?? []), f]);
  }
  const salida: PuntoTrimestral[] = [];
  for (const [periodo, candidatas] of porPeriodo) {
    const principal = candidatas.filter((f) => f.columna === 'principal');
    const elegidas = principal.length > 0 ? principal : candidatas;
    if (elegidas.length !== 1) {
      throw new RangeError(
        `Ejecución ${periodo}, «${opciones.concepto}»: ${elegidas.length} filas`,
      );
    }
    const coincidencia = PATRON_PERIODO.exec(periodo);
    const valor = elegidas[0]?.reconocido;
    if (!coincidencia || valor === null || valor === undefined) continue;
    salida.push({
      anio: Number(coincidencia[1]),
      trimestre: Number(coincidencia[2]) as Trimestre,
      valor,
    });
  }
  return salida.sort((a, b) => a.anio - b.anio || a.trimestre - b.trimestre);
}

/**
 * Flujo de cada trimestre a partir del acumulado a su cierre: el primer trimestre es su
 * acumulado; los demás, la diferencia con el acumulado del trimestre anterior del mismo año.
 * Si falta el acumulado anterior, el trimestre se omite (no se estima).
 */
export function flujosTrimestrales(acumulado: readonly PuntoTrimestral[]): PuntoTrimestral[] {
  const clave = (anio: number, trimestre: number) => anio * 10 + trimestre;
  const valores = new Map(acumulado.map((p) => [clave(p.anio, p.trimestre), p.valor]));
  const salida: PuntoTrimestral[] = [];
  for (const p of acumulado) {
    if (p.trimestre === 1) {
      salida.push(p);
      continue;
    }
    const anterior = valores.get(clave(p.anio, p.trimestre - 1));
    if (anterior !== undefined) salida.push({ ...p, valor: p.valor - anterior });
  }
  return salida;
}

/** Serie anual formada por el flujo de un trimestre concreto de cada año. */
export function flujoDelTrimestre(
  flujos: readonly PuntoTrimestral[],
  trimestre: Trimestre,
): PuntoAnual[] {
  return flujos
    .filter((p) => p.trimestre === trimestre)
    .map((p) => ({ anio: p.anio, valor: p.valor }));
}

/**
 * Suma acumulada de un flujo anual desde `anioInicio` (incluido) hasta cada año de la serie.
 * Los años anteriores al de inicio no figuran. Falla si el año de inicio no tiene dato, porque
 * la acumulada empezaría en otro año sin avisar.
 */
export function acumuladaDesde(flujo: readonly PuntoAnual[], anioInicio: number): PuntoAnual[] {
  const ordenado = [...flujo].sort((a, b) => a.anio - b.anio);
  if (!ordenado.some((p) => p.anio === anioInicio)) {
    throw new RangeError(`La serie no tiene dato en el año de inicio ${anioInicio}`);
  }
  let suma = 0;
  const salida: PuntoAnual[] = [];
  for (const p of ordenado) {
    if (p.anio < anioInicio) continue;
    suma += p.valor;
    salida.push({ anio: p.anio, valor: suma });
  }
  return salida;
}

/**
 * Meses de un flujo que equivale un saldo: saldo ÷ (flujo del periodo ÷ meses del periodo). Con un
 * flujo anual, `mesesDelPeriodo` = 12; con un flujo trimestral, 3. Solo los años comunes; falla si
 * el flujo no es positivo (el cociente no tendría sentido).
 */
export function mesesDeFlujo(
  saldo: readonly PuntoAnual[],
  flujoDelPeriodo: readonly PuntoAnual[],
  mesesDelPeriodo: number,
): PuntoAnual[] {
  const flujo = new Map(flujoDelPeriodo.map((p) => [p.anio, p.valor]));
  const salida: PuntoAnual[] = [];
  for (const { anio, valor } of saldo) {
    const f = flujo.get(anio);
    if (f === undefined) continue;
    if (f <= 0) throw new RangeError(`Flujo no positivo en ${anio}`);
    salida.push({ anio, valor: valor / (f / mesesDelPeriodo) });
  }
  return salida;
}

/** Componentes de la construcción ilustrativa de posición. */
export const COMPONENTES_POSICION = ['fondo', 'deuda', 'transferencias'] as const;
export type ComponentePosicion = (typeof COMPONENTES_POSICION)[number];
export type SeleccionPosicion = Readonly<Record<ComponentePosicion, boolean>>;

export interface FilaPosicion {
  readonly anio: number;
  readonly fondo: number;
  readonly deuda: number;
  /** Transferencias acumuladas desde el año de inicio hasta este año, inclusive. */
  readonly transferencias: number;
  /** Suma de los componentes seleccionados; `null` si no hay ninguno seleccionado. */
  readonly suma: number | null;
}

/**
 * Construcción ilustrativa: para cada año desde `anioInicio` hasta el último en que existen los
 * tres datos, el valor del Fondo, el saldo de la deuda, las transferencias acumuladas desde el año
 * de inicio y la suma de los componentes seleccionados. Combina dos saldos con un flujo acumulado:
 * no es una cifra oficial ni una medida de déficit.
 */
export function posicionIlustrativa(
  entrada: {
    readonly fondo: readonly PuntoAnual[];
    readonly deuda: readonly PuntoAnual[];
    readonly transferenciasAnuales: readonly PuntoAnual[];
  },
  anioInicio: number,
  seleccion: SeleccionPosicion,
): FilaPosicion[] {
  const acumuladas = acumuladaDesde(entrada.transferenciasAnuales, anioInicio);
  const fondo = new Map(entrada.fondo.map((p) => [p.anio, p.valor]));
  const deuda = new Map(entrada.deuda.map((p) => [p.anio, p.valor]));
  const filas: FilaPosicion[] = [];
  for (const { anio, valor: transferencias } of acumuladas) {
    const f = fondo.get(anio);
    const d = deuda.get(anio);
    if (f === undefined || d === undefined) continue;
    const incluidos = [
      ...(seleccion.fondo ? [f] : []),
      ...(seleccion.deuda ? [d] : []),
      ...(seleccion.transferencias ? [transferencias] : []),
    ];
    filas.push({
      anio,
      fondo: f,
      deuda: d,
      transferencias,
      suma: incluidos.length === 0 ? null : incluidos.reduce((a, b) => a + b, 0),
    });
  }
  return filas;
}
