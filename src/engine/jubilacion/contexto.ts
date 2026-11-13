/**
 * Contexto de un cálculo: parámetros de /data, lecturas abiertas, escenario económico y avisos.
 * Aquí viven las magnitudes que dependen del año y que la ley fija solo hasta cierta fecha
 * (base máxima, pensión máxima, base mínima, mínimas, revalorización, IPC): hasta el último año
 * con dato salen de /data y, después, de la regla legal con el escenario indicado.
 */
import { aEurosConstantes, type SerieIPC } from '../euros-constantes.ts';
import { DatoNoDisponible } from './errores.ts';
import { ref, valorEn, valorExacto, type ParametrosJubilacion } from './parametros.ts';
import {
  LECTURAS_POR_DEFECTO,
  type Escenario,
  type LecturasAbiertas,
  type OpcionesJubilacion,
} from './tipos.ts';
import { anioDeMes, formatearMes, mesDelAnio, type MesAbs } from './tiempo.ts';

export interface ImporteConReferencia {
  readonly valor: number;
  readonly refs: readonly string[];
}

export interface Contexto {
  readonly params: ParametrosJubilacion;
  readonly lecturas: LecturasAbiertas;
  readonly escenario: Escenario | undefined;
  readonly huecoBaseMinima: 'error' | 'anterior';
  readonly avisos: Set<string>;
  /**
   * Índice mensual del IPC (base arbitraria; solo importan los cocientes): el del INE con la lectura
   * `mensual-ine` (por defecto) o el interpolado de las medias anuales.
   */
  ipc(mes: MesAbs): number;
  indiceAnual(anio: number): number;
  baseMaxima(anio: number): ImporteConReferencia;
  baseMinima(anio: number): ImporteConReferencia;
  /** Pensión máxima mensual (14 pagas). */
  pensionMaxima(anio: number): ImporteConReferencia;
  /** Cuantía mínima anual de una clase y situación familiar (p. ej. `jub65-unipersonal`). */
  pensionMinimaAnual(anio: number, claseSituacion: string): ImporteConReferencia;
  limiteIngresosMinimos(anio: number): ImporteConReferencia;
  /** Complemento de brecha de género por hijo, euros/mes (14 pagas). */
  importeBrechaPorHijo(anio: number): ImporteConReferencia;
  /** Porcentaje de revalorización general aplicado al comienzo de `anio` (en %). */
  revalorizacionPct(anio: number): number;
}

/** Fichero de /data de la cuantía mínima de una clase («ip-…», «viud-…», «orf-…», «fam…»…). */
export function ficheroMinima(claseSituacion: string): string {
  if (claseSituacion.startsWith('ip-')) return 'pension-minima-incapacidad';
  if (claseSituacion.startsWith('viud-')) return 'pension-minima-viudedad';
  if (/^(orf-|prest-orf-|fam)/.test(claseSituacion)) return 'pension-minima-orfandad-familiares';
  return 'pension-minima-jubilacion';
}

export function crearContexto(
  params: ParametrosJubilacion,
  opciones: OpcionesJubilacion = {},
): Contexto {
  const lecturas: LecturasAbiertas = { ...LECTURAS_POR_DEFECTO, ...opciones.lecturas };
  const escenario = opciones.escenario;
  const avisos = new Set<string>();
  const huecoBaseMinima = opciones.huecoBaseMinima ?? 'error';

  const tasaIPC = (anio: number): number => {
    if (escenario === undefined) {
      throw new DatoNoDisponible(
        `el IPC de ${anio} no está en /data y no se ha indicado un escenario (opciones.escenario.ipc)`,
      );
    }
    return typeof escenario.ipc === 'function' ? escenario.ipc(anio) : escenario.ipc;
  };

  // --- IPC -------------------------------------------------------------------------------
  const cacheIndice = new Map<number, number>();
  const sustituir = escenario?.sustituirHistoricoIPC === true;
  const ANIO_REF = params.ipcIndiceMedio.ultimo;

  function indiceAnual(anio: number): number {
    const guardado = cacheIndice.get(anio);
    if (guardado !== undefined) return guardado;
    let v: number;
    if (sustituir) {
      v = 100;
      for (let t = ANIO_REF + 1; t <= anio; t++) v *= 1 + tasaIPC(t);
      for (let t = ANIO_REF; t > anio; t--) v /= 1 + tasaIPC(t);
    } else {
      const dato = valorExacto(params.ipcIndiceMedio, anio);
      if (dato !== undefined) v = dato;
      else if (anio > params.ipcIndiceMedio.ultimo) {
        v = indiceAnual(anio - 1) * (1 + tasaIPC(anio));
        avisos.add(
          `IPC posterior a ${params.ipcIndiceMedio.ultimo}: se usa la tasa del escenario.`,
        );
      } else {
        // Antes del primer índice de /data: variación de diciembre a diciembre del INE (si consta).
        const variacion = valorExacto(params.ipcVariacionDiciembre, anio + 1);
        const siguiente = indiceAnual(anio + 1);
        if (variacion !== undefined) {
          v = siguiente / (1 + variacion / 100);
          avisos.add(
            `IPC anterior a ${params.ipcIndiceMedio.primero}: índice reconstruido con la variación de diciembre a diciembre del INE (${ref('ipc-variacion-diciembre', anio + 1)}).`,
          );
        } else {
          v = siguiente / (1 + tasaIPC(anio + 1));
          avisos.add(
            `IPC anterior a ${params.ipcIndiceMedio.primero}: se usa la tasa del escenario.`,
          );
        }
      }
    }
    cacheIndice.set(anio, v);
    return v;
  }

  /** Interpolación en logaritmos entre las medias anuales (situadas a mitad de año). */
  function ipcInterpolado(mes: MesAbs): number {
    const anio = anioDeMes(mes);
    if (lecturas.interpolacionIPC === 'escalon-anual') return indiceAnual(anio);
    const t = anio + (mesDelAnio(mes) - 0.5) / 12;
    const y0 = Math.floor(t - 0.5);
    const w = t - (y0 + 0.5);
    const a0 = indiceAnual(y0);
    const a1 = indiceAnual(y0 + 1);
    return Math.exp(Math.log(a0) + w * (Math.log(a1) - Math.log(a0)));
  }

  // Índice mensual del INE (lectura `mensual-ine`): el publicado; después del último mes, la tasa
  // anual del escenario repartida en tasas mensuales iguales; antes del primero, la interpolación.
  const mensual = params.ipcIndiceMensual;
  const usarMensual = lecturas.interpolacionIPC === 'mensual-ine' && !sustituir;
  const cacheMensual = new Map<MesAbs, number>();

  function ipcMensual(mes: MesAbs): number {
    const publicado = mensual.valores.get(mes);
    if (publicado !== undefined) return publicado;
    if (mes < mensual.primero) {
      avisos.add(
        `IPC anterior a ${formatearMes(mensual.primero)}: sin índice mensual en /data; se interpolan las medias anuales.`,
      );
      return ipcInterpolado(mes);
    }
    const guardado = cacheMensual.get(mes);
    if (guardado !== undefined) return guardado;
    avisos.add(
      `IPC posterior a ${formatearMes(mensual.ultimo)} (último mes publicado por el INE): se usa la tasa anual del escenario repartida en tasas mensuales iguales.`,
    );
    let v = mensual.valores.get(mensual.ultimo) as number;
    for (let t = mensual.ultimo + 1; t <= mes; t++) {
      const previo = cacheMensual.get(t);
      if (previo !== undefined) {
        v = previo;
        continue;
      }
      v *= (1 + tasaIPC(anioDeMes(t))) ** (1 / 12);
      cacheMensual.set(t, v);
    }
    return v;
  }

  function ipc(mes: MesAbs): number {
    return usarMensual ? ipcMensual(mes) : ipcInterpolado(mes);
  }

  // --- Revalorización ----------------------------------------------------------------------
  function revalorizacionPct(anio: number): number {
    const dato = valorExacto(params.revalorizacion, anio);
    if (dato !== undefined) return dato;
    if (anio <= params.revalorizacion.ultimo) {
      throw new DatoNoDisponible(`revalorización de ${anio}: consta en docs/PENDIENTE_DATOS.md`);
    }
    avisos.add(
      `Revalorización posterior a ${params.revalorizacion.ultimo}: IPC del escenario (art. 58.2, suelo del 0 %).`,
    );
    return Math.max(0, tasaIPC(anio - 1) * 100);
  }

  const memo = new Map<string, ImporteConReferencia>();
  const memoizar = (clave: string, f: () => ImporteConReferencia): ImporteConReferencia => {
    const g = memo.get(clave);
    if (g) return g;
    const v = f();
    memo.set(clave, v);
    return v;
  };

  // --- Base máxima (DT 38.ª) -----------------------------------------------------------------
  function baseMaxima(anio: number): ImporteConReferencia {
    return memoizar(`bm-${anio}`, () => {
      const s = params.baseMaxima;
      if (anio <= s.ultimo) {
        const v = valorEn(s, anio);
        return { valor: v.valor, refs: [v.ref] };
      }
      const previa = baseMaxima(anio - 1);
      const inicial = valorEn(s, s.ultimo).valor;
      const inc = valorExacto(params.incrementoBaseMaxima, anio) ?? 0;
      const r = revalorizacionPct(anio);
      if (inc === 0)
        avisos.add(
          `Base máxima posterior a ${params.incrementoBaseMaxima.ultimo}: solo la revalorización (la DT 38.ª no fija más incrementos).`,
        );
      const valor =
        lecturas.baseMaxima === 'compuesto'
          ? previa.valor * (1 + (r + inc) / 100)
          : previa.valor * (1 + r / 100) + (inicial * inc) / 100;
      const refs = [
        ref(s.fichero, s.ultimo),
        ...(inc !== 0 ? [ref(params.incrementoBaseMaxima.fichero, anio)] : []),
      ];
      return { valor, refs };
    });
  }

  // --- Base mínima ---------------------------------------------------------------------------
  function baseMinima(anio: number): ImporteConReferencia {
    return memoizar(`bmin-${anio}`, () => {
      const s = params.baseMinima;
      if (anio <= s.ultimo) {
        const dato = valorExacto(s, anio);
        if (dato !== undefined) return { valor: dato, refs: [ref(s.fichero, anio)] };
        if (anio < s.primero) throw new DatoNoDisponible(`${s.fichero}: sin dato para ${anio}`);
        if (huecoBaseMinima === 'error') {
          throw new DatoNoDisponible(
            `base mínima de ${anio} (consta en docs/PENDIENTE_DATOS.md); use opciones.huecoBaseMinima = 'anterior' para usar el último valor conocido`,
          );
        }
        avisos.add(`Base mínima de ${anio} sin dato: se usa la del último año anterior con dato.`);
        return baseMinima(anio - 1);
      }
      avisos.add(
        `Base mínima posterior a ${s.ultimo}: crece con el IPC del escenario (la regla legal no está en /data).`,
      );
      const previa = baseMinima(anio - 1);
      return { valor: previa.valor * (1 + tasaIPC(anio - 1)), refs: previa.refs };
    });
  }

  // --- Pensión máxima (DT 39.ª) -------------------------------------------------------------------
  function pensionMaxima(anio: number): ImporteConReferencia {
    return memoizar(`pm-${anio}`, () => {
      const s = params.pensionMaxima;
      if (anio <= s.ultimo) {
        const v = valorEn(s, anio);
        return { valor: v.valor, refs: [v.ref] };
      }
      const previa = pensionMaxima(anio - 1);
      const r = revalorizacionPct(anio);
      const incs = params.incrementoPensionMaxima;
      const tabla = params.incrementoMaxima2051;
      let factor: number;
      let refs: string[];
      if (anio <= incs.ultimo) {
        const pp = valorExacto(incs, anio) ?? 0;
        const efectivo =
          lecturas.pensionMaxima === 'compuesto' ? pp : pp * (anio - (incs.primero - 1));
        factor = 1 + (r + efectivo) / 100;
        refs = [ref(incs.fichero, anio)];
      } else if (anio <= tabla.ultimo) {
        avisos.add(
          'Pensión máxima de 2051 a 2065: tabla de la DT 39.ª.4 (lectura abierta, véase LecturasAbiertas.maximaDesde2051).',
        );
        const c = valorExacto(tabla, anio) ?? 0;
        if (lecturas.maximaDesde2051 === 'incremento-anual-literal') {
          factor = 1 + (r + c) / 100;
        } else {
          const acumuladoPrevio =
            anio === tabla.primero
              ? [...incs.valores.values()].reduce((a, b) => a + b, 0)
              : (valorExacto(tabla, anio - 1) ?? 0);
          factor = (1 + r / 100) * ((1 + c / 100) / (1 + acumuladoPrevio / 100));
        }
        refs = [ref(tabla.fichero, anio)];
      } else {
        avisos.add(
          `Pensión máxima posterior a ${tabla.ultimo}: solo la revalorización (la DT 39.ª.4 no fija más incrementos).`,
        );
        factor = 1 + r / 100;
        refs = [];
      }
      return { valor: previa.valor * factor, refs: [...previa.refs.slice(0, 1), ...refs] };
    });
  }

  // --- Mínimas, límite de ingresos y complemento de brecha ---------------------------------------
  function revalorizar(base: number, desde: number, hasta: number): number {
    let v = base;
    for (let t = desde + 1; t <= hasta; t++) v *= 1 + revalorizacionPct(t) / 100;
    return v;
  }

  function pensionMinimaAnual(anio: number, claseSituacion: string): ImporteConReferencia {
    const ultimo = params.revalorizacion.ultimo;
    const anioDato = Math.min(anio, ultimo);
    const id = `${anioDato}-${claseSituacion}`;
    const v = params.pensionMinima.get(id);
    // Las clases de incapacidad permanente y de supervivencia están en su propio fichero de /data.
    const fichero = ficheroMinima(claseSituacion);
    if (v === undefined) throw new DatoNoDisponible(`parametros/${fichero}.json#${id}`);
    const r = ref(fichero, id);
    if (anio <= ultimo) return { valor: v, refs: [r] };
    avisos.add(
      'Pensión mínima posterior a 2026: se revaloriza con el IPC del escenario; no se aplica la reducción de la brecha con el umbral de pobreza de la DA 53.ª (2027).',
    );
    return { valor: revalorizar(v, ultimo, anio), refs: [r] };
  }

  function limiteIngresosMinimos(anio: number): ImporteConReferencia {
    const s = params.limiteIngresosMinimos;
    const v = valorEn(s, Math.min(anio, s.ultimo));
    if (anio <= s.ultimo) return { valor: v.valor, refs: [v.ref] };
    avisos.add(
      'Límite de ingresos de los mínimos posterior a 2026: se revaloriza con el IPC del escenario.',
    );
    return { valor: revalorizar(v.valor, s.ultimo, anio), refs: [v.ref] };
  }

  function importeBrechaPorHijo(anio: number): ImporteConReferencia {
    const s = params.complementoBrecha;
    const v = valorEn(s, Math.min(anio, s.ultimo));
    if (anio <= s.ultimo) return { valor: v.valor, refs: [v.ref] };
    avisos.add(
      'Complemento de brecha de género posterior a 2026: se revaloriza como las pensiones (art. 60.3), con el IPC del escenario.',
    );
    return { valor: revalorizar(v.valor, s.ultimo, anio), refs: [v.ref] };
  }

  return {
    params,
    lecturas,
    escenario,
    huecoBaseMinima,
    avisos,
    ipc,
    indiceAnual,
    baseMaxima,
    baseMinima,
    pensionMaxima,
    pensionMinimaAnual,
    limiteIngresosMinimos,
    importeBrechaPorHijo,
    revalorizacionPct,
  };
}

/** Expresa un importe nominal de `anioNominal` en euros constantes de `anioBase` con el IPC del contexto. */
export function aEurosConstantesDelContexto(
  ctx: Contexto,
  importe: number,
  anioNominal: number,
  anioBase: number,
): number {
  const anios = [anioNominal, anioBase];
  const serie: SerieIPC = {
    id: 'ipc-contexto',
    descripcion: 'Media anual del IPC (data/parametros/ipc-indice-medio-anual y escenario)',
    puntos: [...new Set(anios)].map((anio) => ({ anio, indice: ctx.indiceAnual(anio) })),
  };
  return aEurosConstantes(importe, anioNominal, anioBase, serie);
}
