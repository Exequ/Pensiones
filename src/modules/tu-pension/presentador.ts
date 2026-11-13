/**
 * Presentador: resultado del motor → modelo de vista con las cifras ya formateadas (es-ES).
 *
 * No calcula nada de la pensión: lee los pasos y los requisitos que devuelve la fachada y los
 * formatea con `src/engine/formato.ts`. Las cifras de reglas (divisor, meses nominales, tramos de
 * lagunas) se leen de /data mediante la referencia que cada paso del motor ya trae.
 */
import type { ResultadoOk } from '../../engine/fachada';
import {
  formatearDuracion,
  formatearEuros,
  formatearNumero,
  formatearPorcentaje,
} from '../../engine/formato';
import type { Paso, Requisito } from '../../engine/jubilacion/tipos';
import type { Sexo } from './tipos';

export type EstadoVista = 'contributiva' | 'minima' | 'maxima' | 'no-causa-derecho';

export interface Cifra {
  readonly etiqueta: string;
  readonly valor: string;
  readonly detalle?: string;
}

export interface RequisitoVista {
  readonly descripcion: string;
  readonly acreditado: string;
  readonly exigido: string;
  readonly cumple: boolean;
  readonly articulo: string;
}

export interface PasoVista {
  readonly id: string;
  readonly titulo: string;
  /** Párrafos de explicación con las cifras reales del motor. */
  readonly parrafos: readonly string[];
  readonly articulo: string;
}

export interface ModeloResultado {
  readonly cumpleRequisitos: boolean;
  readonly estado: EstadoVista;
  readonly textoEstado: string;
  readonly cifras: readonly Cifra[];
  readonly requisitos: readonly RequisitoVista[];
  readonly pasos: readonly PasoVista[];
  readonly avisos: readonly string[];
  /** Año de la normativa aplicada (el de la jubilación o el del hecho causante). */
  readonly anioNormativa: string;
  /** «de la jubilación», «del hecho causante»: a qué fecha se refiere el año de la normativa. */
  readonly momentoNormativa: string;
  /** Título de la tabla de requisitos. */
  readonly tituloRequisitos: string;
}

/** Lectura de un dato numérico de /data por su referencia `parametros/fichero.json#id`. */
export type LeerReferencia = (referencia: string) => number | undefined;

export interface ContextoPresentacion {
  readonly sexo: Sexo;
  readonly aplicarMinimos: boolean;
  readonly aplicarPensionMaxima: boolean;
  readonly leerReferencia: LeerReferencia;
  /** Valor actual de la lectura `jubilacion.actualizacionFactorMinimo`. */
  readonly factorMinimo: string;
}

const TEXTO_ESTADO: Record<EstadoVista, string> = {
  contributiva: 'Pensión contributiva calculada con la base reguladora y el porcentaje.',
  minima:
    'La pensión contributiva queda por debajo de la mínima: se añade el complemento a mínimos.',
  maxima: 'La pensión calculada supera el límite máximo: se aplica el límite.',
  'no-causa-derecho': 'Con estos datos no se cumplen los requisitos de la jubilación ordinaria.',
};

const euros = (v: number): string => formatearEuros(v, { decimales: 2 });
const eurosMes = (v: number): string => `${euros(v)} al mes`;

function paso(pasos: readonly Paso[], id: string): Paso | undefined {
  return pasos.find((p) => p.id === id);
}

function numeroDe(p: Paso | undefined): number | undefined {
  return typeof p?.valor === 'number' ? p.valor : undefined;
}

/** `«302 bases de 304 meses ÷ 352.33»` → sus tres números. Formato fijado por un test. */
export function leerPeriodoCalculo(
  p: Paso | undefined,
):
  | { nBases: number; ventana: number; divisor: number; mesesConBase?: number; lagunas?: number }
  | undefined {
  if (typeof p?.valor !== 'string') return undefined;
  const m = /^(\d+) bases de (\d+) meses ÷ ([\d.]+)$/.exec(p.valor);
  if (!m) return undefined;
  const base = { nBases: Number(m[1]), ventana: Number(m[2]), divisor: Number(m[3]) };
  const d = /^(\d+) meses con base y (\d+) lagunas/.exec(p.detalle ?? '');
  return d ? { ...base, mesesConBase: Number(d[1]), lagunas: Number(d[2]) } : base;
}

/** `«300 meses ÷ 350»` (detalle de la opción de 25 años). */
export function leerOpcion25(
  p: Paso | undefined,
): { ventana: number; divisor: number } | undefined {
  const m = /^(\d+) meses ÷ ([\d.]+)$/.exec(p?.detalle ?? '');
  return m ? { ventana: Number(m[1]), divisor: Number(m[2]) } : undefined;
}

function valorRequisito(r: Requisito, valor: number): string {
  return r.unidad.startsWith('meses')
    ? formatearDuracion(Math.max(0, Math.round(valor)))
    : formatearNumero(valor);
}

function pasoCarrera(pasos: readonly Paso[], mesesCotizados: number): PasoVista {
  const p = paso(pasos, 'meses-cotizados');
  return {
    id: 'carrera',
    titulo: 'Tiempo cotizado',
    parrafos: [
      `Hasta la fecha de jubilación se cuentan ${formatearDuracion(mesesCotizados)} de cotización. Cada mes con base cuenta como un mes cotizado; los meses sin cotizar no suman.`,
    ],
    articulo: p?.articulo ?? 'art. 205.1 TRLGSS',
  };
}

function pasoPeriodo(pasos: readonly Paso[]): PasoVista {
  const general = leerPeriodoCalculo(paso(pasos, 'periodo-calculo'));
  const brGeneral = numeroDe(paso(pasos, 'base-reguladora-general'));
  const pOp25 = paso(pasos, 'base-reguladora-opcion-25');
  const op25 = leerOpcion25(pOp25);
  const brOp25 = numeroDe(pOp25);
  const elegida = paso(pasos, 'base-reguladora');
  const eligeOp25 = (elegida?.detalle ?? '').includes('25 años');
  const parrafos: string[] = [];
  if (general) {
    parrafos.push(
      `Regla general: se toman las ${formatearNumero(general.nBases)} bases de mayor importe de los últimos ${formatearNumero(general.ventana)} meses (se descartan ${formatearNumero(general.ventana - general.nBases)}) y se dividen entre ${formatearNumero(general.divisor)}.${brGeneral === undefined ? '' : ` Resultado: ${eurosMes(brGeneral)}.`}`,
    );
  }
  if (op25 && brOp25 !== undefined) {
    parrafos.push(
      `Opción de 25 años: se toman todas las bases de los últimos ${formatearNumero(op25.ventana)} meses y se dividen entre ${formatearNumero(op25.divisor)}. Resultado: ${eurosMes(brOp25)}.`,
    );
  }
  const base = numeroDe(elegida);
  if (base !== undefined) {
    parrafos.push(
      op25
        ? `Se aplica ${eligeOp25 ? 'la opción de 25 años' : 'la regla general'}, que da la base reguladora más alta: ${eurosMes(base)}.`
        : `Solo existe la regla general para este año: ${eurosMes(base)}.`,
    );
  }
  return {
    id: 'periodo',
    titulo: 'Periodo de cálculo y base reguladora',
    parrafos,
    articulo: 'art. 209.1 y DT 4.ª.7 TRLGSS',
  };
}

function pasoActualizacion(pasos: readonly Paso[], ctx: ContextoPresentacion): PasoVista {
  const refs = paso(pasos, 'periodo-calculo')?.parametros ?? [];
  const nominales = refs.find((r) => /actualizacion-bases\.json#\d{4}-meses-nominales$/.test(r));
  const indice = nominales?.replace('meses-nominales', 'mes-indice-referencia');
  const nNominales = nominales ? ctx.leerReferencia(nominales) : undefined;
  const nIndice = indice ? ctx.leerReferencia(indice) : undefined;
  const parrafos: string[] = [];
  if (nNominales !== undefined && nIndice !== undefined) {
    parrafos.push(
      `Los ${formatearNumero(nNominales)} meses más recientes entran por su valor nominal. Las bases anteriores se actualizan con el IPC: cada una se multiplica por el cociente entre el índice del mes ${formatearNumero(nIndice)} anterior al previo a la jubilación y el índice del mes de esa base.`,
    );
  } else {
    parrafos.push(
      'Las bases anteriores a los meses más recientes se actualizan con el IPC hasta el mes de referencia que fija la norma.',
    );
  }
  if (ctx.factorMinimo === 'suelo-1') {
    parrafos.push(
      'El factor de actualización de cada base no baja de uno (lectura provisional: véase «Supuestos y lecturas»).',
    );
  }
  return {
    id: 'actualizacion',
    titulo: 'Actualización por IPC',
    parrafos,
    articulo: 'art. 209.1 TRLGSS',
  };
}

function pasoLagunas(pasos: readonly Paso[], ctx: ContextoPresentacion): PasoVista {
  const pp = paso(pasos, 'periodo-calculo');
  const general = leerPeriodoCalculo(pp);
  const parrafos: string[] = [];
  if (general?.lagunas === undefined || general.lagunas === 0) {
    parrafos.push(
      'Todos los meses de la ventana de la regla general tienen base: no hay lagunas que integrar.',
    );
  } else {
    const tramo1 = (pp?.parametros ?? []).find((r) =>
      /lagunas-integracion\.json#\d{4}-tramo1-meses$/.test(r),
    );
    const n1 = tramo1 ? ctx.leerReferencia(tramo1) : undefined;
    const p1 = tramo1
      ? ctx.leerReferencia(tramo1.replace('tramo1-meses', 'tramo1-pct-base-minima'))
      : undefined;
    const p2 = tramo1
      ? ctx.leerReferencia(tramo1.replace('tramo1-meses', 'tramo2-pct-base-minima'))
      : undefined;
    parrafos.push(
      `En la ventana de la regla general hay ${formatearNumero(general.lagunas)} meses sin base (lagunas), que se integran con la base mínima de cotización.${
        n1 !== undefined && p1 !== undefined && p2 !== undefined
          ? ` Los primeros ${formatearNumero(n1)} meses con laguna, contados desde la jubilación hacia atrás, al ${formatearPorcentaje(p1 / 100, { decimales: 0 })} de la base mínima y el resto al ${formatearPorcentaje(p2 / 100, { decimales: 0 })}.`
          : ''
      }`,
    );
    if (ctx.sexo === 'mujer') {
      parrafos.push(
        'Para las mujeres, la regla general aplica la integración de lagunas reforzada de la DT 41.ª cuando rige en el año de jubilación.',
      );
    }
  }
  return {
    id: 'lagunas',
    titulo: 'Lagunas de cotización',
    parrafos,
    articulo: 'art. 209.1.b) y DT 41.ª TRLGSS',
  };
}

function pasoPorcentaje(pasos: readonly Paso[], mesesCotizados: number): PasoVista {
  const pct = numeroDe(paso(pasos, 'porcentaje'));
  return {
    id: 'porcentaje',
    titulo: 'Porcentaje por años cotizados',
    parrafos: [
      pct === undefined
        ? 'No se ha podido leer el porcentaje.'
        : `Con ${formatearDuracion(mesesCotizados)} cotizados corresponde el ${formatearPorcentaje(pct / 100, { decimales: 2 })} de la base reguladora.`,
    ],
    articulo: 'art. 210.1 y DT 9.ª TRLGSS',
  };
}

function pasoLimites(
  pasos: readonly Paso[],
  ctx: ContextoPresentacion,
  estado: EstadoVista,
): PasoVista {
  const parrafos: string[] = [];
  const maximo = paso(pasos, 'limite-maximo');
  const minimos = paso(pasos, 'complemento-minimos');
  const brecha = paso(pasos, 'complemento-brecha');
  if (maximo && typeof maximo.valor === 'number') {
    parrafos.push(
      `La pensión calculada supera el límite máximo de ${eurosMes(maximo.valor)}: se aplica ese límite.`,
    );
  } else if (!ctx.aplicarPensionMaxima) {
    parrafos.push('No se ha aplicado el límite de pensión máxima (opción desactivada).');
  } else {
    parrafos.push('La pensión calculada no supera el límite de pensión máxima.');
  }
  if (minimos && typeof minimos.valor === 'number') {
    parrafos.push(
      `La pensión contributiva queda por debajo de la cuantía mínima: se añade un complemento a mínimos de ${eurosMes(minimos.valor)}.`,
    );
  } else if (!ctx.aplicarMinimos) {
    parrafos.push('No se ha aplicado el complemento a mínimos (opción desactivada).');
  } else if (estado !== 'maxima') {
    parrafos.push(
      'La pensión contributiva alcanza la cuantía mínima: no hay complemento a mínimos.',
    );
  }
  if (brecha && typeof brecha.valor === 'number') {
    parrafos.push(
      `Se suma el complemento por hijos, ${eurosMes(brecha.valor)}, que no cuenta para el límite máximo.`,
    );
  }
  return {
    id: 'limites',
    titulo: 'Límites y complementos',
    parrafos,
    articulo: 'arts. 57 y 59 TRLGSS',
  };
}

/** Modelo de vista del resultado de la jubilación ordinaria. */
export function presentarResultado(
  r: ResultadoOk<'jubilacion'>,
  ctx: ContextoPresentacion,
): ModeloResultado {
  const d = r.detalle;
  const prestacion = r.prestaciones[0];
  const pasos = prestacion?.pasos ?? d.pasos;
  const estado = d.estado;
  const cumple = d.cumpleRequisitos;
  const edadLegal = numeroDe(paso(pasos, 'edad-legal'));
  const cifras: Cifra[] = [];
  if (cumple) {
    cifras.push(
      { etiqueta: 'Pensión mensual bruta (por paga)', valor: euros(d.pensionMensual) },
      {
        etiqueta: 'Pensión anual bruta',
        valor: euros(d.pensionAnual),
        detalle: `${formatearNumero(d.pagas)} pagas`,
      },
    );
  }
  cifras.push(
    { etiqueta: 'Base reguladora', valor: eurosMes(d.baseReguladora) },
    {
      etiqueta: 'Porcentaje aplicable',
      valor: formatearPorcentaje(d.porcentaje / 100, { decimales: 2 }),
    },
    { etiqueta: 'Tiempo cotizado', valor: formatearDuracion(d.mesesCotizados) },
    {
      etiqueta: 'Edad ordinaria de jubilación',
      valor: edadLegal === undefined ? '—' : formatearDuracion(edadLegal),
    },
    { etiqueta: 'Edad en la fecha de jubilación', valor: formatearDuracion(d.edadMeses) },
  );
  const pasosVista: PasoVista[] = [
    pasoCarrera(pasos, d.mesesCotizados),
    pasoPeriodo(pasos),
    pasoActualizacion(pasos, ctx),
    pasoLagunas(pasos, ctx),
    pasoPorcentaje(pasos, d.mesesCotizados),
  ];
  if (cumple) {
    pasosVista.push(pasoLimites(pasos, ctx, estado), {
      id: 'resultado',
      titulo: 'Pensión inicial',
      parrafos: [
        `${eurosMes(d.pensionMensual)} en cada una de las ${formatearNumero(d.pagas)} pagas, es decir, ${euros(d.pensionAnual)} al año, en euros del año de la jubilación.`,
      ],
      articulo: 'art. 210 TRLGSS',
    });
  }
  return {
    cumpleRequisitos: cumple,
    estado,
    textoEstado: TEXTO_ESTADO[estado],
    cifras,
    requisitos: (prestacion?.requisitos ?? d.requisitos).map((q) => ({
      descripcion: q.descripcion,
      acreditado: valorRequisito(q, q.valor),
      exigido: valorRequisito(q, q.exigido),
      cumple: q.cumple,
      articulo: q.articulo,
    })),
    pasos: pasosVista,
    avisos: r.avisos,
    anioNormativa: String(r.anioNormativa),
    momentoNormativa: 'de la jubilación',
    tituloRequisitos: 'Requisitos de la jubilación ordinaria',
  };
}
