/**
 * Series del bloque «Sistema financiero (M4)» (Fase 5-B2), construidas a partir de `DatosFinanciero`
 * sin React. Lógica pura y comprobada en `series-financiero.test.ts`.
 *
 * Reglas de este módulo:
 *  - lo observado, lo derivado de datos observados y lo proyectado por M4 van siempre en listas
 *    separadas (`observado` y `proyeccion` de cada `SerieProyectada`): nunca se mezclan en una serie;
 *  - el porcentaje del PIB observado usa el PIB del INE y el proyectado el PIB aproximado del modelo: son
 *    definiciones distintas y la interfaz lo avisa; aquí solo se mantienen separadas.
 */
import {
  aEurosConstantesConIpcSupuesto,
  diferenciasPorAnio,
  indiceDesdeBase,
  porcentajeAImporte,
  tasaDeVariacionAnual,
  tasaReal,
  type DiferenciaAnual,
} from '../../engine/proyecciones';
import { serieAEurosConstantes } from '../../engine/euros-constantes';
import {
  escalar,
  porcentajeDelPib,
  valorEn,
  type PuntoAnual,
} from '../../engine/series-historicas';
import type { DatosFinanciero } from './datos-financiero';
import type { SerieProyectada } from './grafico-proyeccion';
import { COL4 } from './ids-financiero';
import { puntosDeColumna } from './series';

/** Los importes se muestran en miles de millones de euros: el modelo y la ejecución van en millones. */
export const MILLONES_A_MIL_MILLONES = 1000;

/** Millones de euros a miles de millones de euros (la unidad con la que se dibujan los importes). */
export const aMilMillones = (puntos: readonly PuntoAnual[]): PuntoAnual[] =>
  escalar(puntos, 1 / MILLONES_A_MIL_MILLONES);

export type UnidadImporte = 'euros' | 'pib';
export type UnidadPension = 'corrientes' | 'constantes';

/** Columna numérica de la salida del modelo, como serie anual. */
export const columnaM4 = (d: DatosFinanciero, columna: string): PuntoAnual[] =>
  puntosDeColumna(d.m4.filas, columna);

/** Importe observado y proyectado en una unidad: millones de euros corrientes o puntos de PIB. */
function enUnidad(
  unidad: UnidadImporte,
  observado: readonly PuntoAnual[],
  proyeccion: readonly PuntoAnual[],
  pibProyeccion: readonly PuntoAnual[],
  pibObservado: readonly PuntoAnual[],
): { observado: PuntoAnual[]; proyeccion: PuntoAnual[] } {
  if (unidad === 'euros')
    return { observado: aMilMillones(observado), proyeccion: aMilMillones(proyeccion) };
  return {
    observado: porcentajeDelPib(observado, pibObservado),
    proyeccion: porcentajeDelPib(proyeccion, pibProyeccion),
  };
}

// ---------------------------------------------------------------------------
// a) Gasto en pensiones contributivas
// ---------------------------------------------------------------------------

export function seriesGasto(d: DatosFinanciero, unidad: UnidadImporte): SerieProyectada[] {
  const pib = columnaM4(d, COL4.pib);
  const v =
    unidad === 'pib'
      ? {
          observado: porcentajeDelPib(d.observado.gastoPensiones.puntos, d.observado.pibIne.puntos),
          proyeccion: columnaM4(d, COL4.gastoPctPib),
        }
      : enUnidad(
          unidad,
          d.observado.gastoPensiones.puntos,
          columnaM4(d, COL4.gasto),
          pib,
          d.observado.pibIne.puntos,
        );
  return [
    {
      clave: 'gasto',
      etiqueta: 'Gasto en pensiones contributivas',
      observado: v.observado,
      proyeccion: v.proyeccion,
      origen: 'modelo',
      color: 0,
    },
  ];
}

/** PIB de cada tramo en millones de euros, con la definición que corresponde (tabla del aviso). */
export type FilaPibDeTramo = {
  readonly anio: string;
  readonly definicion: string;
  readonly pib: number;
};

export const DEFINICION_PIB_OBSERVADO = 'PIB corriente del INE';
export const DEFINICION_PIB_PROYECTADO =
  'PIB aproximado del modelo (afiliados por salario nominal)';

export function filasPibDeTramo(d: DatosFinanciero): FilaPibDeTramo[] {
  return [
    ...d.observado.pibIne.puntos
      .filter((p) => p.anio < d.anioInicio)
      .map((p) => ({
        anio: String(p.anio),
        definicion: DEFINICION_PIB_OBSERVADO,
        pib: p.valor,
      })),
    ...columnaM4(d, COL4.pib).map((p) => ({
      anio: String(p.anio),
      definicion: DEFINICION_PIB_PROYECTADO,
      pib: p.valor,
    })),
  ];
}

// ---------------------------------------------------------------------------
// b) Pensión media
// ---------------------------------------------------------------------------

/** Año al que se expresan los euros constantes: el último año observado (el anterior al inicio del modelo). */
export const anioBaseConstante = (d: DatosFinanciero): number => d.anioInicio - 1;

export function seriesPensionMedia(d: DatosFinanciero, unidad: UnidadPension): SerieProyectada[] {
  const base = anioBaseConstante(d);
  const convertirObservado = (puntos: readonly PuntoAnual[]): PuntoAnual[] =>
    unidad === 'corrientes'
      ? [...puntos]
      : serieAEurosConstantes(
          puntos.map((p) => ({ anio: p.anio, importe: p.valor })),
          base,
          d.ipc.serie,
        ).map((p) => ({ anio: p.anio, valor: p.importe }));
  const convertirProyeccion = (puntos: readonly PuntoAnual[]): PuntoAnual[] =>
    unidad === 'corrientes'
      ? [...puntos]
      : aEurosConstantesConIpcSupuesto(puntos, d.escenario.ipc, base);
  return [
    {
      clave: 'total',
      etiqueta: 'Todas las clases',
      observado: convertirObservado(d.observado.pensionMediaTotal.puntos),
      proyeccion: convertirProyeccion(columnaM4(d, COL4.pensionMediaTotal)),
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'jubilacion',
      etiqueta: 'Jubilación',
      observado: convertirObservado(d.observado.pensionMediaJubilacion.puntos),
      proyeccion: convertirProyeccion(columnaM4(d, COL4.pensionMediaJubilacion)),
      origen: 'modelo',
      color: 1,
    },
  ];
}

/** Crecimiento anual medio (fracción, compuesto) de una serie entre dos años: (final ÷ inicial)^(1/años) − 1. */
export function crecimientoAnualMedio(puntos: readonly PuntoAnual[]): number | null {
  const primero = puntos[0];
  const ultimo = puntos.at(-1);
  if (!primero || !ultimo || ultimo.anio <= primero.anio || primero.valor <= 0) return null;
  return (ultimo.valor / primero.valor) ** (1 / (ultimo.anio - primero.anio)) - 1;
}

// ---------------------------------------------------------------------------
// c) Cotizaciones, MEI y gasto en pensiones
// ---------------------------------------------------------------------------

export function seriesIngresosYGasto(d: DatosFinanciero): SerieProyectada[] {
  return [
    {
      clave: 'cotizaciones',
      etiqueta: 'Cotizaciones (incluido el MEI)',
      observado: aMilMillones(d.observado.cotizaciones.puntos),
      proyeccion: aMilMillones(columnaM4(d, COL4.cotizaciones)),
      origen: 'modelo',
      color: 1,
    },
    {
      clave: 'gasto',
      etiqueta: 'Gasto en pensiones contributivas',
      observado: aMilMillones(d.observado.gastoPensiones.puntos),
      proyeccion: aMilMillones(columnaM4(d, COL4.gasto)),
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'mei',
      etiqueta: 'MEI',
      observado: aMilMillones(d.observado.mei.puntos),
      proyeccion: aMilMillones(columnaM4(d, COL4.mei)),
      origen: 'modelo',
      color: 2,
    },
  ];
}

// ---------------------------------------------------------------------------
// d) Saldos
// ---------------------------------------------------------------------------

export function seriesSaldos(d: DatosFinanciero, unidad: UnidadImporte): SerieProyectada[] {
  const pib = columnaM4(d, COL4.pib);
  const pibIne = d.observado.pibIne.puntos;
  const sinTransferencias = columnaM4(d, COL4.saldoSinTransferencias);
  const medidas = [
    {
      clave: 'cotizacionesPensiones',
      etiqueta: 'Cotizaciones menos pensiones',
      observado: d.observado.saldoCotizacionesMenosPensiones.puntos,
      proyeccion: columnaM4(d, COL4.saldoCotizacionesPensiones),
      color: 1,
    },
    {
      clave: 'sinTransferencias',
      etiqueta: 'Saldo sin transferencias',
      observado: d.observado.saldoSinTransferencias.puntos,
      proyeccion: sinTransferencias,
      color: 2,
    },
    {
      clave: 'noFinanciero',
      etiqueta: 'Saldo no financiero',
      observado: d.observado.saldoNoFinanciero.puntos,
      proyeccion: columnaM4(d, COL4.saldoNoFinanciero),
      color: 0,
    },
  ];
  const series: SerieProyectada[] = medidas.map((m) => {
    const v = enUnidad(unidad, m.observado, m.proyeccion, pib, pibIne);
    return {
      clave: m.clave,
      etiqueta: m.etiqueta,
      observado: v.observado,
      proyeccion: v.proyeccion,
      origen: 'modelo',
      color: m.color,
    };
  });
  if (unidad === 'pib') {
    series.push({
      clave: 'ageing',
      etiqueta: 'Ageing Report: balance del sistema de pensiones',
      proyeccion: d.ageing.saldoSistemaPensiones.puntos.filter((p) => p.anio >= d.anioInicio),
      origen: 'publicada',
      color: 3,
    });
  }
  return series;
}

// ---------------------------------------------------------------------------
// e) Fondo de Reserva
// ---------------------------------------------------------------------------

export function seriesFondoValor(d: DatosFinanciero): SerieProyectada[] {
  return [
    {
      clave: 'valor',
      etiqueta: 'Valor del Fondo a fin de año',
      observado: aMilMillones(d.observado.fondoValor.puntos),
      proyeccion: aMilMillones(columnaM4(d, COL4.fondo)),
      origen: 'modelo',
      color: 0,
    },
  ];
}

/** Límite legal anual de disposición en millones de euros: porcentaje del PIB por el PIB aproximado del modelo. */
export function limiteEnEuros(d: DatosFinanciero): PuntoAnual[] {
  return porcentajeAImporte(d.limiteDisposicion.puntos, columnaM4(d, COL4.pib));
}

export function seriesFondoFlujos(d: DatosFinanciero): SerieProyectada[] {
  return [
    {
      clave: 'dotaciones',
      etiqueta: 'Dotaciones al Fondo (MEI)',
      observado: aMilMillones(d.observado.fondoDotacionesMei.puntos),
      proyeccion: aMilMillones(columnaM4(d, COL4.dotacion)),
      origen: 'modelo',
      color: 1,
    },
    {
      clave: 'disposiciones',
      etiqueta: 'Disposiciones del Fondo',
      observado: aMilMillones(d.observado.fondoDisposiciones.puntos),
      proyeccion: aMilMillones(columnaM4(d, COL4.disposicion)),
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'limite',
      etiqueta: 'Límite legal de disposición',
      proyeccion: aMilMillones(limiteEnEuros(d)),
      origen: 'modelo',
      color: 2,
    },
  ];
}

export function seriesFinanciacionAdicional(d: DatosFinanciero): SerieProyectada[] {
  return [
    {
      clave: 'disposicion',
      etiqueta: 'Disposición del Fondo',
      proyeccion: aMilMillones(columnaM4(d, COL4.disposicion)),
      origen: 'modelo',
      color: 0,
    },
    {
      clave: 'adicional',
      etiqueta: 'Financiación adicional',
      proyeccion: aMilMillones(columnaM4(d, COL4.financiacionAdicional)),
      origen: 'modelo',
      color: 3,
    },
  ];
}

/** Fila de la tabla del límite legal frente a la disposición del modelo. */
export type FilaLimite = {
  readonly anio: string;
  readonly limitePib: number;
  readonly limiteEuros: number;
  readonly disposicion: number;
  /** Disposición del modelo entre el límite legal, en porcentaje. */
  readonly disposicionSobreLimite: number | null;
};

export function filasLimite(d: DatosFinanciero): FilaLimite[] {
  const limite = new Map(limiteEnEuros(d).map((p) => [p.anio, p.valor]));
  const disposicion = new Map(columnaM4(d, COL4.disposicion).map((p) => [p.anio, p.valor]));
  return d.limiteDisposicion.puntos
    .filter((p) => limite.has(p.anio))
    .map((p) => {
      const euros = limite.get(p.anio) ?? 0;
      const disp = disposicion.get(p.anio) ?? 0;
      return {
        anio: String(p.anio),
        limitePib: p.valor,
        limiteEuros: euros,
        disposicion: disp,
        disposicionSobreLimite: euros === 0 ? null : (disp / euros) * 100,
      };
    });
}

/** Rentabilidad nominal anual implícita en la salida: (final − inicial − dotación + disposición) ÷ inicial. */
export function rentabilidadImplicita(d: DatosFinanciero): {
  readonly minima: number;
  readonly maxima: number;
} {
  const valores = columnaM4(d, COL4.fondo);
  const dotacion = new Map(columnaM4(d, COL4.dotacion).map((p) => [p.anio, p.valor]));
  const disposicion = new Map(columnaM4(d, COL4.disposicion).map((p) => [p.anio, p.valor]));
  const inicial = valorEn(d.observado.fondoValor.puntos, d.anioInicio - 1);
  if (inicial === undefined)
    throw new RangeError('Falta el valor del Fondo del último año observado');
  const tasas = valores.map((p, i) => {
    const previo = i === 0 ? inicial : (valores[i - 1]?.valor ?? Number.NaN);
    return (
      (p.valor - previo - (dotacion.get(p.anio) ?? 0) + (disposicion.get(p.anio) ?? 0)) / previo
    );
  });
  return { minima: Math.min(...tasas), maxima: Math.max(...tasas) };
}

/** Año y valor máximos de una serie. */
export function maximoDe(puntos: readonly PuntoAnual[]): PuntoAnual | undefined {
  return puntos.reduce<PuntoAnual | undefined>(
    (m, p) => (m === undefined || p.valor > m.valor ? p : m),
    undefined,
  );
}

// ---------------------------------------------------------------------------
// f) Contraste con el Ageing Report
// ---------------------------------------------------------------------------

export interface ContrasteAgeing {
  readonly anioBase: number;
  readonly indiceM4: PuntoAnual[];
  readonly indiceAgeing: PuntoAnual[];
  readonly diferencias: DiferenciaAnual[];
  /** Niveles (porcentaje del PIB) de cada serie: no son comparables entre sí. */
  readonly nivelM4: PuntoAnual[];
  readonly nivelAgeing: PuntoAnual[];
}

/** Gasto sobre el PIB del modelo y del Ageing Report en índice (primer año proyectado = 100). */
export function contrasteAgeing(d: DatosFinanciero): ContrasteAgeing {
  const nivelM4 = columnaM4(d, COL4.gastoPctPib);
  const anios = new Set(nivelM4.map((p) => p.anio));
  const nivelAgeing = d.ageing.gastoPensionesPib.puntos.filter((p) => anios.has(p.anio));
  const indiceM4 = indiceDesdeBase(nivelM4, d.anioInicio);
  const indiceAgeing = indiceDesdeBase(nivelAgeing, d.anioInicio);
  return {
    anioBase: d.anioInicio,
    indiceM4,
    indiceAgeing,
    diferencias: diferenciasPorAnio(indiceM4, indiceAgeing),
    nivelM4,
    nivelAgeing,
  };
}

/** Fila de las magnitudes relacionadas con los candidatos que cita la descripción del modelo (no verificados). */
export type FilaCandidatos = {
  readonly anio: string;
  /** Tasa de reposición bruta en la jubilación del Ageing Report, en %. */
  readonly tasaReposicionAgeing: number | null;
  /** Crecimiento real del PIB potencial del Ageing Report, en %. */
  readonly crecimientoPibAgeing: number | null;
  /** Crecimiento real del PIB aproximado del modelo (crecimiento nominal deflactado con el IPC supuesto), en %. */
  readonly crecimientoPibModelo: number | null;
};

export function filasCandidatos(d: DatosFinanciero): FilaCandidatos[] {
  const anios = columnaM4(d, COL4.pib).map((p) => p.anio);
  const reposicion = new Map(d.ageing.tasaReposicionBruta.puntos.map((p) => [p.anio, p.valor]));
  const pibAgeing = new Map(d.ageing.crecimientoPibPotencial.puntos.map((p) => [p.anio, p.valor]));
  const pibM4 = new Map(
    tasaDeVariacionAnual(columnaM4(d, COL4.pib)).map((p) => [
      p.anio,
      tasaReal(p.valor, d.escenario.ipc) * 100,
    ]),
  );
  return anios.map((anio) => ({
    anio: String(anio),
    tasaReposicionAgeing: reposicion.get(anio) ?? null,
    crecimientoPibAgeing: pibAgeing.get(anio) ?? null,
    crecimientoPibModelo: pibM4.get(anio) ?? null,
  }));
}
