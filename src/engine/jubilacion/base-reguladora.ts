/**
 * Base reguladora de la jubilación (art. 209.1 y DT 8.ª, 40.ª y 4.ª.7 TRLGSS):
 * periodo de cómputo, actualización con el IPC, integración de lagunas y selección de las mejores bases.
 */
import type { MesAbs } from './tiempo.ts';
import { anioDeMes } from './tiempo.ts';
import type { Contexto } from './contexto.ts';
import { parametro, ref, valorEn, versionEn } from './parametros.ts';

export interface ReglaBR {
  readonly id: 'general' | 'opcion-25-anos';
  /** Meses de la ventana anterior al mes previo al hecho causante. */
  readonly ventana: number;
  /** Bases de mayor importe que se suman (resto descartado). */
  readonly nBases: number;
  readonly divisor: number;
  /** Año de la versión de lagunas/actualización que rige la regla. */
  readonly anioVersion: number;
  /** Integración reforzada de la DT 41.ª (solo la regla general). */
  readonly integracionReforzada: boolean;
  readonly refs: readonly string[];
}

export interface DetalleBR {
  readonly regla: ReglaBR;
  readonly baseReguladora: number;
  readonly sumaBases: number;
  readonly mesesConBase: number;
  readonly lagunas: number;
  readonly lagunasIntegradasAlCien: number;
  readonly refs: readonly string[];
}

/** Meses de la ventana de cálculo sin obligación de cotizar que se tratan como laguna. */
interface Laguna {
  readonly i: number;
  readonly mes: MesAbs;
}

export interface EntradaBR {
  readonly bases: ReadonlyMap<MesAbs, number>;
  readonly primerMesAlta: MesAbs | undefined;
  readonly mesHechoCausante: MesAbs;
  readonly actualizar: boolean;
}

/** Regla general del año: ventana, divisor y número de bases según /data. */
export function reglaGeneral(ctx: Contexto, anio: number, integracionReforzada: boolean): ReglaBR {
  const p = ctx.params;
  const v = valorEn(p.periodoCalculo, anio);
  const d = valorEn(p.divisor, anio);
  // El divisor recoge las pagas: divisor = bases computadas × pagas / 12
  const pagas = parametro(p.reglasBrecha, 'pagas-anuales', 'complemento-brecha-genero-reglas');
  return {
    id: 'general',
    ventana: v.valor,
    nBases: Math.round((d.valor * 12) / pagas),
    divisor: d.valor,
    anioVersion: anio,
    integracionReforzada,
    refs: [v.ref, d.ref],
  };
}

/** Opción de 25 años (DT 4.ª.7), si está disponible para el hecho causante. */
export function reglaOpcion25(
  ctx: Contexto,
  anio: number,
  esUltimoDia2040: boolean,
): ReglaBR | undefined {
  const p = ctx.params;
  if (anio < p.opcion25Aplicable.primero) return undefined;
  const aplicable = valorEn(p.opcion25Aplicable, anio);
  if (aplicable.valor !== 1) return undefined;
  if (esUltimoDia2040 && ctx.lecturas.opcion25EnUltimoDia2040 === 'excluida') return undefined;
  const v = valorEn(p.opcion25Ventana, anio);
  const d = valorEn(p.opcion25Divisor, anio);
  return {
    id: 'opcion-25-anos',
    ventana: v.valor,
    nBases: v.valor, // la DT 4.ª.7 computa todas las bases de la ventana (divisor = ventana × 14/12)
    divisor: d.valor,
    anioVersion: 2023, // «redacción vigente el 1 de enero de 2023»
    integracionReforzada: false,
    refs: [aplicable.ref, v.ref, d.ref],
  };
}

export function calcularBaseReguladora(
  ctx: Contexto,
  entrada: EntradaBR,
  regla: ReglaBR,
  anioHechoCausante: number,
): DetalleBR {
  const p = ctx.params;
  const mesPrevio = entrada.mesHechoCausante - 1;
  const vLag = versionEn(p.lagunas, regla.anioVersion, 'lagunas-integracion');
  const vAct = versionEn(p.actualizacion, regla.anioVersion, 'actualizacion-bases');
  const refs: string[] = [
    ...regla.refs,
    ref('lagunas-integracion', `${vLag.desde}-tramo1-meses`),
    ref('actualizacion-bases', `${vAct.desde}-meses-nominales`),
  ];

  // 1. Meses de la ventana: i = 1 es el mes inmediatamente anterior al mes previo al hecho causante.
  const lagunas: Laguna[] = [];
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

  const mesRef = mesPrevio - vAct.mesIndiceReferencia;
  const factor = (i: number): number => {
    if (!entrada.actualizar || i < vAct.mesIndiceReferencia + 0 || i <= vAct.mesesNominales)
      return 1;
    return ctx.ipc(mesRef) / ctx.ipc(mesPrevio - i);
  };

  for (const { i, base } of mesesBase) valores.push(base * factor(i));

  // 2. Lagunas: la primera es la más próxima al hecho causante.
  let alCien = 0;
  const refsLagunas = new Set<string>();
  lagunas.forEach(({ i, mes }, idx) => {
    const orden = idx + 1;
    let pct: number;
    if (
      regla.integracionReforzada &&
      orden >=
        parametro(p.lagunasBrecha, '2026-tramo-a-desde-mes', 'lagunas-integracion-brecha-genero')
    ) {
      const aHasta = parametro(
        p.lagunasBrecha,
        '2026-tramo-a-hasta-mes',
        'lagunas-integracion-brecha-genero',
      );
      const bDesde = parametro(
        p.lagunasBrecha,
        '2026-tramo-b-desde-mes',
        'lagunas-integracion-brecha-genero',
      );
      const bHasta = parametro(
        p.lagunasBrecha,
        '2026-tramo-b-hasta-mes',
        'lagunas-integracion-brecha-genero',
      );
      if (orden <= aHasta) {
        pct = parametro(
          p.lagunasBrecha,
          '2026-tramo-a-pct-base-minima',
          'lagunas-integracion-brecha-genero',
        );
        refsLagunas.add(ref('lagunas-integracion-brecha-genero', '2026-tramo-a-pct-base-minima'));
      } else if (orden >= bDesde && orden <= bHasta) {
        pct = parametro(
          p.lagunasBrecha,
          '2026-tramo-b-pct-base-minima',
          'lagunas-integracion-brecha-genero',
        );
        refsLagunas.add(ref('lagunas-integracion-brecha-genero', '2026-tramo-b-pct-base-minima'));
      } else pct = orden <= vLag.tramo1Meses ? vLag.tramo1Pct : vLag.tramo2Pct;
    } else pct = orden <= vLag.tramo1Meses ? vLag.tramo1Pct : vLag.tramo2Pct;
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
    regla,
    baseReguladora: suma / regla.divisor,
    sumaBases: suma,
    mesesConBase: mesesBase.length,
    lagunas: lagunas.length,
    lagunasIntegradasAlCien: alCien,
    refs: [...refs, ...refsLagunas],
  };
}
