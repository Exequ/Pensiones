/**
 * Piezas comunes de la base reguladora de las pensiones contributivas (jubilación, incapacidad
 * permanente y, en la Fase 2-B-2, muerte y supervivencia). No contienen ninguna cifra legal: la
 * ventana, el número de bases, el divisor, los tramos de lagunas y la actualización llegan en la
 * regla, construida por cada prestación desde /data.
 *
 * - `basesDeVentana`: suma de las mejores bases de una ventana de meses anteriores al mes previo al
 *   hecho causante, con actualización por el IPC e integración de lagunas (art. 209.1 y 197 TRLGSS).
 * - `basePeriodoElegido`: suma de un periodo ininterrumpido de meses elegido dentro de una ventana
 *   (art. 7 del Decreto 1646/1972: accidente no laboral; muerte y supervivencia).
 */
import type { Contexto } from '../jubilacion/contexto.ts';
import { anioDeMes, type MesAbs } from '../jubilacion/tiempo.ts';

export interface EntradaBases {
  readonly bases: ReadonlyMap<MesAbs, number>;
  readonly primerMesAlta: MesAbs | undefined;
  readonly mesHechoCausante: MesAbs;
  readonly actualizar: boolean;
}

/** Porcentaje de la base mínima con que se integra la laguna número `orden` (1 = la más próxima). */
export type IntegracionLaguna = (orden: number) => {
  readonly pct: number;
  readonly refs: readonly string[];
};

export interface ReglaVentana {
  /** Meses de la ventana anteriores al mes previo al hecho causante. */
  readonly ventana: number;
  /** Bases de mayor importe que se suman (el resto se descarta). */
  readonly nBases: number;
  readonly divisor: number;
  /** Meses más recientes que entran por su valor nominal. */
  readonly mesesNominales: number;
  /** Mes (contado hacia atrás desde el mes previo) cuyo IPC actualiza las demás bases. */
  readonly mesIndiceReferencia: number;
  readonly integrarLaguna: IntegracionLaguna;
  readonly refs: readonly string[];
}

export interface DetalleVentana {
  readonly baseReguladora: number;
  readonly sumaBases: number;
  readonly mesesConBase: number;
  readonly lagunas: number;
  readonly lagunasIntegradasAlCien: number;
  readonly refs: readonly string[];
}

/**
 * Base reguladora de una ventana de meses: actualiza con el IPC, integra lagunas, toma las
 * `nBases` mejores y divide por el divisor. Es el cálculo de la Fase 2-A, sin cambios.
 */
export function basesDeVentana(
  ctx: Contexto,
  entrada: EntradaBases,
  regla: ReglaVentana,
  anioHechoCausante: number,
): DetalleVentana {
  const mesPrevio = entrada.mesHechoCausante - 1;

  // 1. Meses de la ventana: i = 1 es el mes inmediatamente anterior al mes previo al hecho causante.
  const lagunas: { i: number; mes: MesAbs }[] = [];
  const valores: number[] = [];
  const mesesBase: { i: number; base: number }[] = [];
  for (let i = 1; i <= regla.ventana; i++) {
    const mes = mesPrevio - i;
    const base = entrada.bases.get(mes);
    if (base !== undefined) mesesBase.push({ i, base });
    else if (
      ctx.lecturas.lagunasAnterioresAlPrimerAlta === 'ignorar' &&
      (entrada.primerMesAlta === undefined || mes < entrada.primerMesAlta)
    ) {
      valores.push(0);
    } else lagunas.push({ i, mes });
  }

  const mesRef = mesPrevio - regla.mesIndiceReferencia;
  const factor = (i: number): number => {
    if (!entrada.actualizar || i < regla.mesIndiceReferencia || i <= regla.mesesNominales) return 1;
    return ctx.ipc(mesRef) / ctx.ipc(mesPrevio - i);
  };

  for (const { i, base } of mesesBase) valores.push(base * factor(i));

  // 2. Lagunas: la primera es la más próxima al hecho causante.
  let alCien = 0;
  const refsLagunas = new Set<string>();
  lagunas.forEach(({ i, mes }, idx) => {
    const { pct, refs } = regla.integrarLaguna(idx + 1);
    for (const r of refs) refsLagunas.add(r);
    if (pct === 100) alCien++;
    const hecho = ctx.lecturas.referenciaBaseMinimaLagunas === 'hecho-causante';
    const bm = ctx.baseMinima(hecho ? anioHechoCausante : anioDeMes(mes));
    for (const r of bm.refs) refsLagunas.add(r);
    // Con la base mínima del hecho causante la base ya está en euros actuales: no se actualiza.
    valores.push((pct / 100) * bm.valor * (hecho ? 1 : factor(i)));
  });

  // 3. Las `nBases` de mayor importe, entre las bases de la ventana.
  const mejores = [...valores].sort((a, b) => b - a).slice(0, regla.nBases);
  const suma = mejores.reduce((a, b) => a + b, 0);
  return {
    baseReguladora: suma / regla.divisor,
    sumaBases: suma,
    mesesConBase: mesesBase.length,
    lagunas: lagunas.length,
    lagunasIntegradasAlCien: alCien,
    refs: [...regla.refs, ...refsLagunas],
  };
}

/** Integración de lagunas en dos tramos: los primeros `tramo1Meses` al `tramo1Pct` y el resto al `tramo2Pct`. */
export function integracionEnDosTramos(
  tramo1Meses: number,
  tramo1Pct: number,
  tramo2Pct: number,
  refs: readonly string[],
): IntegracionLaguna {
  return (orden) => ({ pct: orden <= tramo1Meses ? tramo1Pct : tramo2Pct, refs });
}

export interface ReglaPeriodoElegido {
  /** Meses ininterrumpidos que se suman. */
  readonly meses: number;
  /** Meses anteriores al hecho causante dentro de los que se elige el periodo. */
  readonly ventanaMeses: number;
  readonly divisor: number;
  readonly refs: readonly string[];
  /** Integración de los meses sin cotización dentro del periodo; sin ella cuentan como cero. */
  readonly integrarLaguna?: IntegracionLaguna;
}

export interface DetallePeriodoElegido {
  readonly baseReguladora: number;
  readonly sumaBases: number;
  /** Primer mes del periodo elegido. */
  readonly desde: MesAbs;
  readonly hasta: MesAbs;
  readonly lagunas: number;
  readonly refs: readonly string[];
}

/**
 * Base de un periodo ininterrumpido de `meses` meses elegido dentro de los `ventanaMeses` meses
 * anteriores al mes del hecho causante. Sin `desde`, se elige el periodo de mayor suma (el más
 * favorable). Las bases van por su valor nominal (la norma no prevé actualizarlas).
 */
export function basePeriodoElegido(
  ctx: Contexto,
  entrada: EntradaBases,
  regla: ReglaPeriodoElegido,
  desde?: MesAbs,
): DetallePeriodoElegido {
  const ultimo = entrada.mesHechoCausante - 1;
  const primero = entrada.mesHechoCausante - regla.ventanaMeses;
  const valor = (mes: MesAbs, orden: number): { v: number; laguna: boolean; refs: string[] } => {
    const base = entrada.bases.get(mes);
    if (base !== undefined) return { v: base, laguna: false, refs: [] };
    if (regla.integrarLaguna === undefined) return { v: 0, laguna: true, refs: [] };
    const { pct, refs } = regla.integrarLaguna(orden);
    const bm = ctx.baseMinima(anioDeMes(mes));
    return { v: (pct / 100) * bm.valor, laguna: true, refs: [...refs, ...bm.refs] };
  };
  const sumar = (inicio: MesAbs) => {
    let suma = 0;
    let lagunas = 0;
    const refs = new Set<string>();
    for (let m = inicio + regla.meses - 1; m >= inicio; m--) {
      const r = valor(m, lagunas + 1);
      suma += r.v;
      if (r.laguna) lagunas++;
      for (const x of r.refs) refs.add(x);
    }
    return { suma, lagunas, refs };
  };
  const candidatos: MesAbs[] = [];
  if (desde !== undefined) {
    if (desde < primero || desde + regla.meses - 1 > ultimo) {
      throw new RangeError('El periodo elegido debe quedar dentro de la ventana de la norma');
    }
    candidatos.push(desde);
  } else for (let m = primero; m + regla.meses - 1 <= ultimo; m++) candidatos.push(m);
  let mejor: { inicio: MesAbs; suma: number; lagunas: number; refs: Set<string> } | undefined;
  for (const inicio of candidatos) {
    const r = sumar(inicio);
    if (mejor === undefined || r.suma > mejor.suma) mejor = { inicio, ...r };
  }
  if (mejor === undefined) throw new RangeError('Ventana sin periodos posibles');
  return {
    baseReguladora: mejor.suma / regla.divisor,
    sumaBases: mejor.suma,
    desde: mejor.inicio,
    hasta: mejor.inicio + regla.meses - 1,
    lagunas: mejor.lagunas,
    refs: [...regla.refs, ...mejor.refs],
  };
}
