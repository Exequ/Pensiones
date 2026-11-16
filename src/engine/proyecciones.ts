/**
 * Utilidades para unir lo observado con la proyección de un modelo propio y compararla con otra
 * serie (Fase 5-B1).
 *
 * Lógica pura, sin React ni DOM. Nunca mezcla observado y proyectado en una misma serie: devuelve
 * siempre dos listas separadas, para que la interfaz las dibuje con trazos distintos y las rotule.
 */
import { indiceBase100, type PuntoAnual } from './series-historicas.ts';

/** Serie observada y proyección de la misma magnitud, separadas por el año de inicio. */
export interface ObservadoYProyeccion {
  /** Puntos observados anteriores al año de inicio de la proyección, en orden. */
  readonly observado: readonly PuntoAnual[];
  /** Puntos de la proyección del modelo, en orden. */
  readonly proyeccion: readonly PuntoAnual[];
  /** Primer año de la proyección. */
  readonly anioInicio: number;
  /** Puntos observados descartados por coincidir en año con la proyección o ser posteriores. */
  readonly solapados: number;
}

/** Valor del índice en el año base («2026 = 100»). */
export const BASE_INDICE = 100;

const porAnio = (a: PuntoAnual, b: PuntoAnual): number => a.anio - b.anio;

/**
 * Une la serie observada con la proyección. El año de inicio es el primer año de la proyección: lo
 * observado de ese año en adelante no se dibuja en la línea observada (el año de inicio pertenece a
 * la proyección), de modo que un mismo año nunca aparece en las dos listas. Falla si la proyección
 * está vacía o repite años.
 */
export function unirObservadoProyeccion(
  observado: readonly PuntoAnual[],
  proyeccion: readonly PuntoAnual[],
): ObservadoYProyeccion {
  if (proyeccion.length === 0) throw new RangeError('La proyección no tiene puntos');
  const ordenada = [...proyeccion].sort(porAnio);
  for (let i = 1; i < ordenada.length; i++) {
    if (ordenada[i]?.anio === ordenada[i - 1]?.anio) {
      throw new RangeError(`La proyección repite el año ${ordenada[i]?.anio}`);
    }
  }
  const anioInicio = ordenada[0]?.anio ?? 0;
  const previos = [...observado].filter((p) => p.anio < anioInicio).sort(porAnio);
  return {
    observado: previos,
    proyeccion: ordenada,
    anioInicio,
    solapados: observado.length - previos.length,
  };
}

/** Proyección dividida en lo presentado y lo ilustrativo (posterior al horizonte). */
export interface TramosDeProyeccion {
  /** Años hasta el horizonte, inclusive. */
  readonly presentada: readonly PuntoAnual[];
  /**
   * Años desde el horizonte, inclusive: el punto del horizonte se repite para que las dos líneas se
   * toquen. Vacía si la proyección no pasa del horizonte.
   */
  readonly ilustrativa: readonly PuntoAnual[];
}

/**
 * Divide la proyección en el tramo presentado y el ilustrativo. Sin horizonte (`undefined`), todo es
 * presentado. Lo posterior al horizonte se etiqueta «ilustrativo» en la interfaz.
 */
export function partirIlustrativo(
  proyeccion: readonly PuntoAnual[],
  horizonte: number | undefined,
): TramosDeProyeccion {
  if (horizonte === undefined) return { presentada: proyeccion, ilustrativa: [] };
  const presentada = proyeccion.filter((p) => p.anio <= horizonte);
  const posterior = proyeccion.filter((p) => p.anio > horizonte);
  if (posterior.length === 0) return { presentada, ilustrativa: [] };
  const punto = presentada.at(-1);
  return { presentada, ilustrativa: punto ? [punto, ...posterior] : posterior };
}

/** ¿Es ilustrativo el año? (posterior al horizonte de presentación). */
export function esIlustrativo(anio: number, horizonte: number | undefined): boolean {
  return horizonte !== undefined && anio > horizonte;
}

/** Fila de comparación de dos series en un año. */
export interface DiferenciaAnual {
  readonly anio: number;
  readonly a: number;
  readonly b: number;
  /** a − b, en la unidad de las series. */
  readonly diferencia: number;
  /** (a − b) / b como fracción; `null` si b es cero. */
  readonly relativa: number | null;
}

/** Diferencias año a año entre dos series (solo los años comunes, en orden). */
export function diferenciasPorAnio(
  a: readonly PuntoAnual[],
  b: readonly PuntoAnual[],
): DiferenciaAnual[] {
  const deB = new Map(b.map((p) => [p.anio, p.valor]));
  return [...a].sort(porAnio).flatMap((p) => {
    const otro = deB.get(p.anio);
    if (otro === undefined) return [];
    return [
      {
        anio: p.anio,
        a: p.valor,
        b: otro,
        diferencia: p.valor - otro,
        relativa: otro === 0 ? null : (p.valor - otro) / otro,
      },
    ];
  });
}

/**
 * Índice base 100 en `anioBase` de una serie recortada a los años desde la base (los anteriores no
 * tienen sentido en un contraste «2026 = 100»). Falla si falta el año base.
 */
export function indiceDesdeBase(puntos: readonly PuntoAnual[], anioBase: number): PuntoAnual[] {
  return indiceBase100(
    puntos.filter((p) => p.anio >= anioBase),
    anioBase,
  );
}

/** Cociente de dos series con un factor, año a año; ignora los años en que el denominador es cero. */
export function razonPorAnio(
  numerador: readonly PuntoAnual[],
  denominador: readonly PuntoAnual[],
  factor = 1,
): PuntoAnual[] {
  const deD = new Map(denominador.map((p) => [p.anio, p.valor]));
  return numerador.flatMap((p) => {
    const d = deD.get(p.anio);
    return d === undefined || d === 0 ? [] : [{ anio: p.anio, valor: (p.valor / d) * factor }];
  });
}

// ---------------------------------------------------------------------------
// Fase 5-B2: pasos propios del bloque financiero (M4)
// ---------------------------------------------------------------------------

/**
 * Euros constantes de `anioBase` de una serie en euros corrientes, con una inflación anual constante
 * (el IPC supuesto del escenario): valor(t) ÷ (1 + IPC)^(t − año base). Para años anteriores al año
 * base el exponente es negativo y el valor se revaloriza hasta la base. Falla si el IPC no es
 * superior a −1.
 */
export function aEurosConstantesConIpcSupuesto(
  puntos: readonly PuntoAnual[],
  ipc: number,
  anioBase: number,
): PuntoAnual[] {
  if (!(ipc > -1)) throw new RangeError(`IPC supuesto no válido: ${ipc}`);
  return puntos.map((p) => ({ anio: p.anio, valor: p.valor / (1 + ipc) ** (p.anio - anioBase) }));
}

/**
 * Importe a partir de un porcentaje de otra magnitud: porcentaje ÷ 100 × magnitud, año a año (solo
 * los años comunes). Sirve para expresar en euros un límite dado en porcentaje del PIB.
 */
export function porcentajeAImporte(
  porcentaje: readonly PuntoAnual[],
  magnitud: readonly PuntoAnual[],
): PuntoAnual[] {
  const deM = new Map(magnitud.map((p) => [p.anio, p.valor]));
  return porcentaje.flatMap((p) => {
    const m = deM.get(p.anio);
    return m === undefined ? [] : [{ anio: p.anio, valor: (p.valor / 100) * m }];
  });
}

/**
 * Tasa de variación anual (fracción) entre años consecutivos: valor(t) ÷ valor(t − 1) − 1. El primer
 * año no tiene tasa; los años sin el anterior inmediato se saltan. Un valor anterior de cero no da tasa.
 */
export function tasaDeVariacionAnual(puntos: readonly PuntoAnual[]): PuntoAnual[] {
  const deAnio = new Map(puntos.map((p) => [p.anio, p.valor]));
  return [...puntos].sort(porAnio).flatMap((p) => {
    const previo = deAnio.get(p.anio - 1);
    return previo === undefined || previo === 0
      ? []
      : [{ anio: p.anio, valor: p.valor / previo - 1 }];
  });
}

/** Tasa real a partir de una tasa nominal y la inflación (fracciones): (1 + nominal) ÷ (1 + IPC) − 1. */
export function tasaReal(nominal: number, ipc: number): number {
  if (!(ipc > -1)) throw new RangeError(`IPC supuesto no válido: ${ipc}`);
  return (1 + nominal) / (1 + ipc) - 1;
}

// ---------------------------------------------------------------------------
// Factor de calibración del gasto en pensiones de M4 (Ajustes de M4)
// ---------------------------------------------------------------------------

/** Pagas al año de las pensiones contributivas: doce mensualidades y dos extraordinarias. */
export const PAGAS_POR_ANIO = 14;

/** Millones de euros que son un euro (los importes del presupuesto van en millones). */
const EUROS_POR_MILLON = 1_000_000;

/**
 * Gasto anual que resulta de multiplicar el número de pensiones por la pensión media mensual y por las
 * pagas: millones de euros. Es la fórmula «pensiones × pensión media × 14» de la descripción de M4,
 * sin factor de calibración.
 */
export function gastoNominal(pensiones: number, pensionMediaMes: number): number {
  return (pensiones * pensionMediaMes * PAGAS_POR_ANIO) / EUROS_POR_MILLON;
}

/**
 * Cociente entre el gasto en pensiones de la ejecución del presupuesto (millones de euros) y el gasto
 * nominal «pensiones × pensión media × 14». Es la magnitud que la descripción de M4 llama factor de
 * calibración (devengo) cuando se calcula con el último año observado. Falla si el gasto nominal no es
 * positivo.
 */
export function factorDeCalibracion(
  gastoEjecucionMeur: number,
  pensiones: number,
  pensionMediaMes: number,
): number {
  const nominal = gastoNominal(pensiones, pensionMediaMes);
  if (!(nominal > 0)) throw new RangeError('El gasto nominal debe ser positivo');
  return gastoEjecucionMeur / nominal;
}

// ---------------------------------------------------------------------------
// Sensibilidades de M4: una palanca cada vez respecto al caso base
// ---------------------------------------------------------------------------

/** Gasto en pensiones y saldo no financiero de un caso en un año, en porcentaje del PIB aproximado. */
export interface ResultadoDeCaso {
  readonly id: string;
  readonly gasto: number;
  readonly saldo: number;
}

/** Resultado de un caso y su diferencia con el caso base (caso menos base, en puntos de PIB). */
export interface ResultadoConDiferencia extends ResultadoDeCaso {
  readonly gastoDiferencia: number;
  readonly saldoDiferencia: number;
}

/**
 * Diferencia de cada caso con el caso base: valor del caso menos valor del base, en la misma unidad
 * (puntos de PIB). Conserva el orden de entrada (no ordena por tamaño). Una diferencia positiva del gasto
 * es más gasto que en el base; una positiva del saldo es un saldo mayor (menos negativo) que el del base.
 * El resultado de cada caso es independiente: no se combinan entre sí.
 */
export function diferenciasConBase(
  base: Pick<ResultadoDeCaso, 'gasto' | 'saldo'>,
  casos: readonly ResultadoDeCaso[],
): ResultadoConDiferencia[] {
  return casos.map((c) => ({
    ...c,
    gastoDiferencia: c.gasto - base.gasto,
    saldoDiferencia: c.saldo - base.saldo,
  }));
}
