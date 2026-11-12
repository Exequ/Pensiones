/**
 * Entrada de carrera: de una lista de periodos (con huecos permitidos) a una base nominal por mes.
 */
import type { Contexto } from './contexto.ts';
import { anioDeMes, parsearMes, type MesAbs } from './tiempo.ts';
import type { Carrera, PeriodoCarrera } from './tipos.ts';

export interface CarreraProcesada {
  /** Base mensual nominal de cotización de cada mes cotizado (ya topada si se pidió). */
  readonly bases: ReadonlyMap<MesAbs, number>;
  readonly primerMes: MesAbs | undefined;
  /** Meses cuya base se redujo a la base máxima. */
  readonly mesesTopados: number;
}

function baseDelPeriodo(p: PeriodoCarrera, mes: MesAbs): number {
  if ('baseMensual' in p) return p.baseMensual;
  if ('basesPorAnio' in p) {
    const v = p.basesPorAnio[String(anioDeMes(mes))];
    if (v === undefined)
      throw new RangeError(
        `Periodo ${p.desde}..${p.hasta}: falta la base del año ${anioDeMes(mes)}`,
      );
    return v;
  }
  const clave = `${anioDeMes(mes)}-${String((mes % 12) + 1).padStart(2, '0')}`;
  const v = p.basesPorMes[clave];
  if (v === undefined)
    throw new RangeError(`Periodo ${p.desde}..${p.hasta}: falta la base del mes ${clave}`);
  return v;
}

export function procesarCarrera(
  carrera: Carrera,
  ctx: Contexto,
  topeBases: boolean,
): CarreraProcesada {
  const sumas = new Map<MesAbs, number>();
  for (const p of carrera) {
    const desde = parsearMes(p.desde);
    const hasta = parsearMes(p.hasta);
    if (hasta < desde)
      throw new RangeError(`Periodo ${p.desde}..${p.hasta}: el fin es anterior al inicio`);
    for (let m = desde; m <= hasta; m++) {
      const base = baseDelPeriodo(p, m);
      if (!Number.isFinite(base) || base <= 0) {
        throw new RangeError(
          `Periodo ${p.desde}..${p.hasta}: la base mensual debe ser positiva (${base})`,
        );
      }
      sumas.set(m, (sumas.get(m) ?? 0) + base);
    }
  }
  let topados = 0;
  const bases = new Map<MesAbs, number>();
  const maximos = new Map<number, number>();
  let primerMes: MesAbs | undefined;
  for (const [m, suma] of sumas) {
    let base = suma;
    const anio = anioDeMes(m);
    if (topeBases && anio < ctx.params.baseMaxima.primero) {
      ctx.avisos.add(
        `Bases anteriores a ${ctx.params.baseMaxima.primero}: no hay base máxima en /data, no se topan.`,
      );
    } else if (topeBases) {
      let maximo = maximos.get(anio);
      if (maximo === undefined) {
        maximo = ctx.baseMaxima(anio).valor;
        maximos.set(anio, maximo);
      }
      if (base > maximo) {
        base = maximo;
        topados++;
      }
    }
    bases.set(m, base);
    if (primerMes === undefined || m < primerMes) primerMes = m;
  }
  return { bases, primerMes, mesesTopados: topados };
}

/** Meses con cotización estrictamente anteriores a `mesLimite`. */
export function mesesCotizadosAntesDe(
  bases: ReadonlyMap<MesAbs, number>,
  mesLimite: MesAbs,
): number {
  let n = 0;
  for (const m of bases.keys()) if (m < mesLimite) n++;
  return n;
}

/** Meses con cotización en `[desde, hasta]` (ambos incluidos). */
export function mesesCotizadosEntre(
  bases: ReadonlyMap<MesAbs, number>,
  desde: MesAbs,
  hasta: MesAbs,
): number {
  let n = 0;
  for (const m of bases.keys()) if (m >= desde && m <= hasta) n++;
  return n;
}
