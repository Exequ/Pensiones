/**
 * Carrera por tramos (Fase 3-B1): lectura, validación y paso a la carrera del motor. Lógica pura,
 * sin React ni DOM; no calcula nada de la pensión (eso es del motor, `src/engine`).
 *
 * Un tramo es «desde» (mes y año), «hasta» (mes y año) y una base mensual que es un importe en
 * euros o una referencia a una serie de /data que se expande año a año (base mínima, media o
 * máxima). Los meses sin tramo son lagunas. Los límites de base (mínima y máxima de cada año) no
 * bloquean: se avisa de lo que hará el motor con ellos.
 */
import type { Carrera, PeriodoCarrera } from '../../engine/jubilacion/tipos.ts';
import { formatearNumero } from '../../engine/formato.ts';
import { leerEntero, leerNumero } from './lectura.ts';
import {
  buscarReferencia,
  referenciaDeTipo,
  type CatalogoReferencias,
  type ReferenciaBase,
  type TipoReferencia,
} from './referencias.ts';
import { MESES } from './textos.ts';

/** Referencia de la base de un tramo tal como se elige en la tabla. */
export type ReferenciaTramo = 'importe' | TipoReferencia;

/** Un tramo tal como lo escribe la persona (texto); `id` solo sirve de clave estable. */
export interface TramoFormulario {
  readonly id: string;
  readonly desdeMes: string;
  readonly desdeAnio: string;
  readonly hastaMes: string;
  readonly hastaAnio: string;
  readonly referencia: ReferenciaTramo;
  /** Importe mensual en euros (solo si `referencia` es `importe`). */
  readonly importe: string;
}

export type CampoTramo =
  'desdeMes' | 'desdeAnio' | 'hastaMes' | 'hastaAnio' | 'importe' | 'referencia' | 'tramo';

export interface ErrorTramo {
  readonly tramoId: string;
  /** Posición (empezando en uno) para los mensajes. */
  readonly numero: number;
  readonly campo: CampoTramo;
  readonly mensaje: string;
}

export interface AvisoTramo {
  readonly tramoId: string | undefined;
  readonly mensaje: string;
}

/** Hueco de la carrera: meses consecutivos sin tramo. */
export interface Hueco {
  /** Primer y último mes, `AAAA-MM`. */
  readonly desde: string;
  readonly hasta: string;
  readonly meses: number;
}

export interface ResumenCarrera {
  readonly mesesCotizados: number;
  /** Meses sin tramo entre el primer tramo y el mes anterior a la jubilación (si se conoce). */
  readonly mesesSinCotizar: number;
  readonly huecos: readonly Hueco[];
  readonly primerMes: string | undefined;
  readonly ultimoMes: string | undefined;
}

/** Datos del resto del formulario que los tramos necesitan para validarse. */
export interface ContextoTramos {
  readonly catalogo: CatalogoReferencias;
  /** Identificador de la definición de «base media» elegida. */
  readonly definicionMedia: string;
  /** Mes anterior a la jubilación (meses absolutos), si la fecha de jubilación es válida. */
  readonly mesPrevio: number | undefined;
  /** Mes de nacimiento (meses absolutos), si es válido. */
  readonly nacimiento: number | undefined;
  /** «a la jubilación» (por defecto) o «al hecho causante»: cómo se nombra el final de la carrera. */
  readonly anteriorA?: string;
}

export interface ResultadoTramos {
  readonly errores: readonly ErrorTramo[];
  readonly avisos: readonly AvisoTramo[];
  readonly resumen: ResumenCarrera;
  /** Carrera para el motor; solo si no hay errores. */
  readonly carrera: Carrera | undefined;
}

/** Meses absolutos (año × 12 + mes − 1). */
export const mesAbsoluto = (anio: number, mes: number): number => anio * 12 + mes - 1;
const anioDe = (abs: number): number => Math.floor(abs / 12);
const mesDe = (abs: number): number => (abs % 12) + 1;
export const claveDeMes = (abs: number): string =>
  `${String(anioDe(abs))}-${String(mesDe(abs)).padStart(2, '0')}`;
/** «marzo de 2010». */
export function nombreDeMes(abs: number): string {
  return `${MESES[mesDe(abs) - 1] ?? ''} de ${String(anioDe(abs))}`;
}

let contador = 0;
/** Identificador nuevo para un tramo. */
export function nuevoIdTramo(): string {
  contador += 1;
  return `tramo-${String(contador)}`;
}

export function tramoVacio(): TramoFormulario {
  return {
    id: nuevoIdTramo(),
    desdeMes: '',
    desdeAnio: '',
    hastaMes: '',
    hastaAnio: '',
    referencia: 'importe',
    importe: '',
  };
}

interface TramoLeido {
  readonly id: string;
  readonly numero: number;
  readonly desde: number;
  readonly hasta: number;
  readonly referencia: ReferenciaTramo;
  readonly importe: number | undefined;
}

/** Años consecutivos como rangos: [2001, 2002, 2005] → «2001 a 2002 y 2005». */
function rangosDeAnios(anios: readonly number[]): string {
  const rangos: string[] = [];
  let i = 0;
  while (i < anios.length) {
    let j = i;
    while (j + 1 < anios.length && (anios[j + 1] ?? 0) === (anios[j] ?? 0) + 1) j++;
    rangos.push(i === j ? String(anios[i]) : `${String(anios[i])} a ${String(anios[j])}`);
    i = j + 1;
  }
  return rangos.length <= 1
    ? (rangos[0] ?? '')
    : `${rangos.slice(0, -1).join(', ')} y ${rangos.at(-1) ?? ''}`;
}

const aniosDeTramo = (t: { desde: number; hasta: number }): number[] => {
  const anios: number[] = [];
  for (let a = anioDe(t.desde); a <= anioDe(t.hasta); a++) anios.push(a);
  return anios;
};

/** Meses de un tramo dentro de un año concreto. */
function mesesEnAnio(t: { desde: number; hasta: number }, anio: number): number {
  const ini = Math.max(t.desde, mesAbsoluto(anio, 1));
  const fin = Math.min(t.hasta, mesAbsoluto(anio, 12));
  return Math.max(0, fin - ini + 1);
}

/** Base mensual de un tramo para un año (importe, o valor de la serie), si la hay. */
function baseDelAnio(
  t: TramoLeido,
  referencia: ReferenciaBase | undefined,
  anio: number,
): number | undefined {
  if (t.referencia === 'importe') return t.importe;
  return referencia?.valores.get(anio);
}

/** Lee y valida las fechas e importe de un tramo; añade los errores que encuentre. */
function leerTramo(
  f: TramoFormulario,
  numero: number,
  errores: ErrorTramo[],
): TramoLeido | undefined {
  const error = (campo: CampoTramo, mensaje: string) => {
    errores.push({ tramoId: f.id, numero, campo, mensaje });
  };
  const t = `Tramo ${String(numero)}`;
  const comprobar = (
    mesTexto: string,
    anioTexto: string,
    campoMes: CampoTramo,
    campoAnio: CampoTramo,
    nombre: string,
  ): number | undefined => {
    const mes = leerEntero(mesTexto);
    const anio = leerEntero(anioTexto);
    let ok = true;
    if (mes === undefined || mes < 1 || mes > 12) {
      error(campoMes, `${t}: elige el mes ${nombre}.`);
      ok = false;
    }
    if (anio === undefined || anioTexto.trim().length !== 4) {
      error(campoAnio, `${t}: escribe el año ${nombre} con cuatro cifras.`);
      ok = false;
    }
    return ok && mes !== undefined && anio !== undefined ? mesAbsoluto(anio, mes) : undefined;
  };
  const desde = comprobar(f.desdeMes, f.desdeAnio, 'desdeMes', 'desdeAnio', 'de inicio');
  const hasta = comprobar(f.hastaMes, f.hastaAnio, 'hastaMes', 'hastaAnio', 'de fin');
  let importe: number | undefined;
  if (f.referencia === 'importe') {
    importe = leerNumero(f.importe);
    if (importe === undefined || importe <= 0) {
      error(
        'importe',
        `${t}: escribe una base mensual mayor que cero en euros (por ejemplo, 2.000,50).`,
      );
      importe = undefined;
    }
  }
  if (desde === undefined || hasta === undefined) return undefined;
  if (f.referencia === 'importe' && importe === undefined) return undefined;
  return { id: f.id, numero, desde, hasta, referencia: f.referencia, importe };
}

/** Primer y último año de una lista, para los mensajes de cobertura. */
function descripcionCobertura(r: ReferenciaBase): string {
  return `de ${String(r.primerAnio)} a ${String(r.ultimoAnio)}`;
}

/**
 * Valida los tramos y los traduce a la carrera del motor. Los errores impiden calcular; los avisos
 * (bases fuera de los límites de cada año) cuentan lo que hará el motor y no bloquean.
 */
export function procesarTramos(
  tramos: readonly TramoFormulario[],
  ctx: ContextoTramos,
): ResultadoTramos {
  const errores: ErrorTramo[] = [];
  const avisos: AvisoTramo[] = [];
  if (tramos.length === 0) {
    errores.push({
      tramoId: '',
      numero: 0,
      campo: 'tramo',
      mensaje: 'Añade al menos un tramo de cotización.',
    });
  }
  const leidos: TramoLeido[] = [];
  tramos.forEach((f, i) => {
    const l = leerTramo(f, i + 1, errores);
    if (l) leidos.push(l);
  });

  const validos: TramoLeido[] = [];
  const referencias = new Map<string, ReferenciaBase | undefined>();
  const referenciaDe = (t: TramoLeido): ReferenciaBase | undefined => {
    if (t.referencia === 'importe') return undefined;
    const clave = t.referencia;
    if (!referencias.has(clave)) {
      referencias.set(clave, referenciaDeTipo(ctx.catalogo, t.referencia, ctx.definicionMedia));
    }
    return referencias.get(clave);
  };

  for (const t of leidos) {
    const error = (campo: CampoTramo, mensaje: string) => {
      errores.push({ tramoId: t.id, numero: t.numero, campo, mensaje });
    };
    const nombre = `Tramo ${String(t.numero)}`;
    let ok = true;
    if (t.hasta < t.desde) {
      error(
        'tramo',
        `${nombre}: empieza en ${nombreDeMes(t.desde)}, después de su fin (${nombreDeMes(t.hasta)}). El inicio debe ser anterior o igual al fin.`,
      );
      ok = false;
    }
    if (ctx.nacimiento !== undefined && t.desde <= ctx.nacimiento) {
      error('desdeAnio', `${nombre}: empieza antes de que nazcas o en el mes de tu nacimiento.`);
      ok = false;
    }
    if (ok && ctx.mesPrevio !== undefined) {
      if (t.desde > ctx.mesPrevio) {
        error(
          'tramo',
          `${nombre}: empieza en ${nombreDeMes(t.desde)}, después del mes anterior ${ctx.anteriorA ?? 'a la jubilación'} (${nombreDeMes(ctx.mesPrevio)}). Esos meses no se cuentan.`,
        );
        ok = false;
      } else if (t.hasta > ctx.mesPrevio) {
        error(
          'hastaAnio',
          `${nombre}: termina en ${nombreDeMes(t.hasta)}, después del mes anterior ${ctx.anteriorA ?? 'a la jubilación'} (${nombreDeMes(ctx.mesPrevio)}). Acórtalo hasta ese mes.`,
        );
        ok = false;
      }
    }
    if (ok && t.referencia !== 'importe') {
      const ref = referenciaDe(t);
      if (!ref) {
        error('referencia', `${nombre}: no hay datos para la referencia elegida.`);
        ok = false;
      } else {
        const sinDato = aniosDeTramo(t).filter((a) => !ref.valores.has(a));
        if (sinDato.length > 0) {
          error(
            'tramo',
            `${nombre}: la referencia «${ref.etiqueta}» solo tiene datos ${descripcionCobertura(ref)} y el tramo incluye años sin dato (${rangosDeAnios(sinDato)}). Acorta el tramo, elige otra referencia o escribe un importe.`,
          );
          ok = false;
        }
      }
    }
    if (ok) validos.push(t);
  }

  // Solapes entre tramos válidos: el error va en el tramo posterior.
  const ordenados = [...validos].sort((a, b) => a.desde - b.desde || a.numero - b.numero);
  const solapados = new Set<string>();
  ordenados.forEach((t, i) => {
    for (let j = 0; j < i; j++) {
      const o = ordenados[j];
      if (!o) continue;
      const ini = Math.max(t.desde, o.desde);
      const fin = Math.min(t.hasta, o.hasta);
      if (ini <= fin) {
        const [primero, segundo] = o.numero < t.numero ? [o, t] : [t, o];
        errores.push({
          tramoId: segundo.id,
          numero: segundo.numero,
          campo: 'tramo',
          mensaje: `Los tramos ${String(primero.numero)} y ${String(segundo.numero)} se solapan entre ${nombreDeMes(ini)} y ${nombreDeMes(fin)}. Los tramos no pueden coincidir en ningún mes: acorta uno de los dos.`,
        });
        solapados.add(t.id);
        solapados.add(o.id);
      }
    }
  });

  // Avisos de límites: solo con tramos sin errores propios.
  for (const t of validos) {
    if (solapados.has(t.id)) continue;
    const ref = referenciaDe(t);
    const minima = buscarReferencia(ctx.catalogo, 'base-minima');
    const maxima = buscarReferencia(ctx.catalogo, 'base-maxima');
    let bajoMinima = 0;
    let sobreMaxima = 0;
    let sinLimites = 0;
    const aniosBajo: number[] = [];
    const aniosSobre: number[] = [];
    for (const a of aniosDeTramo(t)) {
      const meses = mesesEnAnio(t, a);
      const base = baseDelAnio(t, ref, a);
      const min = minima?.valores.get(a);
      const max = maxima?.valores.get(a);
      if (base === undefined) continue;
      if (min === undefined || max === undefined) {
        sinLimites += meses;
        continue;
      }
      if (base < min) {
        bajoMinima += meses;
        aniosBajo.push(a);
      }
      if (base > max) {
        sobreMaxima += meses;
        aniosSobre.push(a);
      }
    }
    const nombre = `Tramo ${String(t.numero)}`;
    if (bajoMinima > 0) {
      avisos.push({
        tramoId: t.id,
        mensaje: `${nombre}: en ${formatearNumero(bajoMinima)} ${bajoMinima === 1 ? 'mes' : 'meses'} (${rangosDeAnios(aniosBajo)}) la base está por debajo de la base mínima de su año. El cálculo no la sube a la mínima: usa la base indicada.`,
      });
    }
    if (sobreMaxima > 0) {
      avisos.push({
        tramoId: t.id,
        mensaje: `${nombre}: en ${formatearNumero(sobreMaxima)} ${sobreMaxima === 1 ? 'mes' : 'meses'} (${rangosDeAnios(aniosSobre)}) la base supera la base máxima de su año. El cálculo la reduce a la máxima de cada año.`,
      });
    }
    if (sinLimites > 0) {
      avisos.push({
        tramoId: t.id,
        mensaje: `${nombre}: en ${formatearNumero(sinLimites)} ${sinLimites === 1 ? 'mes' : 'meses'} no hay límites de base en los datos (la base mínima y la máxima de /data cubren ${minima ? descripcionCobertura(minima) : 'ningún año'}); no se comprueban.`,
      });
    }
  }

  const resumen = resumirTramos(validos, ctx.mesPrevio);
  const carrera: Carrera | undefined =
    errores.length === 0 ? tramosACarrera(validos, ctx, referenciaDe) : undefined;
  return { errores, avisos, resumen, carrera };
}

/** Meses cotizados, meses sin cotizar y huecos de una lista de tramos válidos. */
export function resumirTramos(
  tramos: readonly { desde: number; hasta: number }[],
  mesPrevio: number | undefined,
): ResumenCarrera {
  if (tramos.length === 0) {
    return {
      mesesCotizados: 0,
      mesesSinCotizar: 0,
      huecos: [],
      primerMes: undefined,
      ultimoMes: undefined,
    };
  }
  const cotizados = new Set<number>();
  for (const t of tramos) for (let m = t.desde; m <= t.hasta; m++) cotizados.add(m);
  const primero = Math.min(...tramos.map((t) => t.desde));
  const ultimoTramo = Math.max(...tramos.map((t) => t.hasta));
  const fin = Math.max(ultimoTramo, mesPrevio ?? ultimoTramo);
  const huecos: Hueco[] = [];
  let inicio: number | undefined;
  for (let m = primero; m <= fin + 1; m++) {
    const hay = m <= fin && !cotizados.has(m);
    if (hay && inicio === undefined) inicio = m;
    if (!hay && inicio !== undefined) {
      huecos.push({ desde: claveDeMes(inicio), hasta: claveDeMes(m - 1), meses: m - inicio });
      inicio = undefined;
    }
  }
  return {
    mesesCotizados: cotizados.size,
    mesesSinCotizar: huecos.reduce((a, h) => a + h.meses, 0),
    huecos,
    primerMes: claveDeMes(primero),
    ultimoMes: claveDeMes(ultimoTramo),
  };
}

/** Un tramo → periodo del motor: base constante o una base por año de la serie. */
function tramoAPeriodo(t: TramoLeido, ref: ReferenciaBase | undefined): PeriodoCarrera {
  const desde = claveDeMes(t.desde);
  const hasta = claveDeMes(t.hasta);
  if (t.referencia === 'importe') return { desde, hasta, baseMensual: t.importe ?? 0 };
  const basesPorAnio: Record<string, number> = {};
  for (const a of aniosDeTramo(t)) {
    const v = ref?.valores.get(a);
    if (v !== undefined) basesPorAnio[String(a)] = v;
  }
  return { desde, hasta, basesPorAnio };
}

function tramosACarrera(
  validos: readonly TramoLeido[],
  _ctx: ContextoTramos,
  referenciaDe: (t: TramoLeido) => ReferenciaBase | undefined,
): Carrera {
  return [...validos]
    .sort((a, b) => a.desde - b.desde)
    .map((t) => tramoAPeriodo(t, referenciaDe(t)));
}

/** Texto de una hueco para la interfaz: «de enero de 2010 a marzo de 2011 (15 meses)». */
export function textoDeHueco(h: Hueco): string {
  const [a1, m1] = h.desde.split('-').map(Number);
  const [a2, m2] = h.hasta.split('-').map(Number);
  const d = mesAbsoluto(a1 ?? 0, m1 ?? 1);
  const f = mesAbsoluto(a2 ?? 0, m2 ?? 1);
  return `${d === f ? nombreDeMes(d) : `de ${nombreDeMes(d)} a ${nombreDeMes(f)}`} (${formatearNumero(h.meses)} ${h.meses === 1 ? 'mes' : 'meses'})`;
}
