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
  diferenciasConBase,
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
import { formatearPorcentaje } from '../../engine/formato';
import type { DatosFinanciero, EscenarioM4 } from './datos-financiero';
import type { FilaModelo } from './datos-proyecciones';
import type { SerieProyectada } from './grafico-proyeccion';
import { MODELO } from './ids-datos';
import { COL4, ESCENARIO_BASE } from './ids-financiero';
import { aniosDe, puntosDeColumna } from './series';

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
    // Solo los años que calcula M4: el Ageing Report llega más lejos, pero el gráfico no proyecta más allá.
    const ultimoAnio = pib.at(-1)?.anio ?? d.anioInicio;
    series.push({
      clave: 'ageing',
      etiqueta: 'Ageing Report: balance de pensiones',
      proyeccion: d.ageing.saldoSistemaPensiones.puntos.filter(
        (p) => p.anio >= d.anioInicio && p.anio <= ultimoAnio,
      ),
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
export function rentabilidadImplicita(
  d: DatosFinanciero,
  escenario: string = d.escenarioActivo.id,
): {
  readonly minima: number;
  readonly maxima: number;
} {
  const filas = d.filasPorEscenario[escenario] ?? [];
  const valores = puntosDeColumna(filas, COL4.fondo);
  const dotacion = new Map(puntosDeColumna(filas, COL4.dotacion).map((p) => [p.anio, p.valor]));
  const disposicion = new Map(
    puntosDeColumna(filas, COL4.disposicion).map((p) => [p.anio, p.valor]),
  );
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

// ---------------------------------------------------------------------------
// Escenarios de sensibilidad (Ajustes de M4)
// ---------------------------------------------------------------------------

const porcentajeEscenario = (fraccion: number): string =>
  formatearPorcentaje(fraccion, { maxDecimales: 2 });

/** Qué hipótesis cambian respecto al escenario base, dicho con los valores de cada uno. */
export function descripcionCambio(e: EscenarioM4, base: EscenarioM4): string {
  const partes: string[] = [];
  if (e.g !== base.g) {
    partes.push(
      `crecimiento real de los salarios: ${porcentajeEscenario(e.g)} en lugar de ${porcentajeEscenario(base.g)}`,
    );
  }
  if (e.ipc !== base.ipc) {
    partes.push(`IPC: ${porcentajeEscenario(e.ipc)} en lugar de ${porcentajeEscenario(base.ipc)}`);
  }
  return partes.length === 0
    ? 'Es el escenario de referencia: el de los demás modelos'
    : `Cambia solo el ${partes.join(' y el ')}`;
}

/** Fila de la tabla que compara los escenarios en el último año de la salida. */
export type FilaComparacionEscenario = {
  readonly id: string;
  readonly escenario: string;
  /** Gasto en pensiones, % del PIB aproximado del modelo. */
  readonly gastoPib: number | null;
  /** Diferencia con el escenario base, puntos de PIB. */
  readonly gastoDiferencia: number | null;
  readonly saldoPib: number | null;
  readonly saldoDiferencia: number | null;
  /** Valor del Fondo a fin de año, miles de millones de euros corrientes. */
  readonly fondo: number | null;
  /** Pensión media de todas las clases en euros constantes del último año observado (con el IPC del escenario). */
  readonly pensionMediaConstante: number | null;
};

export interface ComparacionEscenarios {
  /** Último año de la salida, en el que se comparan los escenarios. */
  readonly anio: number;
  readonly anioBase: number;
  readonly filas: readonly FilaComparacionEscenario[];
}

/**
 * Compara los escenarios en el último año de la salida: gasto y saldo en % del PIB aproximado de cada
 * uno (con su diferencia respecto al base, en puntos), valor del Fondo y pensión media en euros
 * constantes. Cada escenario usa su propio PIB aproximado y su propio IPC.
 */
export function comparacionEscenarios(d: DatosFinanciero): ComparacionEscenarios {
  const anio = columnaM4(d, COL4.gasto).at(-1)?.anio;
  if (anio === undefined) throw new Error('La salida del modelo no tiene filas');
  const anioBase = anioBaseConstante(d);
  const de = (id: string, columna: string): number | undefined =>
    valorEn(puntosDeColumna(d.filasPorEscenario[id] ?? [], columna), anio);
  const gastoBase = de(ESCENARIO_BASE, COL4.gastoPctPib);
  const saldoBase = de(ESCENARIO_BASE, COL4.saldoNoFinancieroPctPib);
  const filas = d.escenarios.map((e): FilaComparacionEscenario => {
    const gasto = de(e.id, COL4.gastoPctPib);
    const saldo = de(e.id, COL4.saldoNoFinancieroPctPib);
    const fondo = de(e.id, COL4.fondo);
    const media = puntosDeColumna(d.filasPorEscenario[e.id] ?? [], COL4.pensionMediaTotal);
    const constante = valorEn(aEurosConstantesConIpcSupuesto(media, e.ipc, anioBase), anio);
    return {
      id: e.id,
      escenario: e.etiqueta,
      gastoPib: gasto ?? null,
      gastoDiferencia: gasto === undefined || gastoBase === undefined ? null : gasto - gastoBase,
      saldoPib: saldo ?? null,
      saldoDiferencia: saldo === undefined || saldoBase === undefined ? null : saldo - saldoBase,
      fondo: fondo === undefined ? null : fondo / MILLONES_A_MIL_MILLONES,
      pensionMediaConstante: constante ?? null,
    };
  });
  return { anio, anioBase, filas };
}

/** Rótulo de un gráfico con el escenario mostrado. */
export const tituloConEscenario = (d: DatosFinanciero, titulo: string): string =>
  `${titulo} · escenario ${d.escenarioActivo.etiqueta}`;

/** Rentabilidad real a partir de la nominal y el IPC; un cero numérico (±1e-12) se devuelve como cero, sin signo. */
export function rentabilidadReal(nominal: number, ipc: number): number {
  const r = tasaReal(nominal, ipc);
  return Math.abs(r) < 1e-12 ? 0 : r;
}

// ---------------------------------------------------------------------------
// Sensibilidades: una palanca cada vez respecto al escenario base
// ---------------------------------------------------------------------------

/** Años que tienen todos los casos de sensibilidad (los calculados por el modelo), en orden. */
export function aniosSensibilidades(d: DatosFinanciero): number[] {
  return aniosDe(d.sensibilidades.tabla.filas);
}

/**
 * Rótulo de la palanca de una sensibilidad: el texto del LEEME de la salida, salvo dos correcciones
 * verificadas en el código del modelo (modelos/m2/m2_cotizantes.py; Ajustes actuariales 3, n.º 69, y
 * Motor: cambios de la revisión actuarial 3):
 *
 * - la palanca de las edades próximas a la jubilación multiplica las tasas de afiliación y de
 *   cotización de M2 (afiliados y cotizantes entre población por tramo: `ra` y `rb`), no las tasas de
 *   empleo de la EPA, y avanza linealmente desde el primer año proyectado;
 * - la convergencia de las mujeres (`convergencia_mujeres`) acerca a las de los hombres de su tramo
 *   esas mismas tasas de afiliación y de cotización (`ra` y `rb`, tramos de 25 a 64 años), con el mismo
 *   avance lineal desde el primer año proyectado hasta 2050; no son tasas de empleo.
 *
 * La salida del modelo no se toca; el texto no lleva cifras (salen del LEEME).
 */
export function rotuloPalanca(parametro: string | null): string | null {
  if (parametro === null) return null;
  const AVANCE = `avance lineal desde el primer año proyectado; el número de pensiones de ${MODELO.m3} no cambia`;
  return parametro
    .replace(
      /tasas de empleo(?= de \d+ a \d+ años multiplicadas)/,
      'tasas de afiliación y de cotización',
    )
    .replace('(avance lineal)', `(${AVANCE})`)
    .replace(
      /tasas de empleo(?= de las mujeres de \d+ a \d+ años igualan)/,
      'tasas de afiliación y de cotización',
    )
    .replace(/(igualan a las de los hombres de su tramo)$/, `$1 (${AVANCE})`);
}

/** Fila de la tabla de sensibilidades: el caso base o uno de los casos, con su diferencia con el base. */
export interface FilaSensibilidad {
  readonly id: string;
  /** Qué palanca cambia y su valor, tal cual el LEEME; `null` en el caso base. */
  readonly parametro: string | null;
  /** Gasto en pensiones, % del PIB aproximado del modelo. */
  readonly gasto: number;
  /** Diferencia con el caso base, puntos de PIB; `null` en el caso base. */
  readonly gastoDiferencia: number | null;
  /** Saldo no financiero, % del PIB aproximado del modelo. */
  readonly saldo: number;
  readonly saldoDiferencia: number | null;
}

export interface TablaSensibilidades {
  readonly anio: number;
  /** El caso base primero y después los casos en el orden del LEEME (sin ordenar por tamaño). */
  readonly filas: readonly FilaSensibilidad[];
}

/**
 * Tabla de las sensibilidades en un año: el escenario base de la salida de escenarios y los casos de la
 * salida de sensibilidades, con el gasto en pensiones y el saldo no financiero en % del PIB aproximado y la
 * diferencia de cada caso con el base (calculada con los valores sin redondear). Falla si falta el año en
 * el base o en algún caso.
 */
export function tablaSensibilidades(d: DatosFinanciero, anio: number): TablaSensibilidades {
  const valor = (filas: readonly FilaModelo[], columna: string, id: string): number => {
    const v = valorEn(puntosDeColumna(filas, columna), anio);
    if (v === undefined) throw new RangeError(`Falta ${anio} en ${id}`);
    return v;
  };
  const resultado = (id: string, filas: readonly FilaModelo[]) => ({
    id,
    gasto: valor(filas, COL4.gastoPctPib, id),
    saldo: valor(filas, COL4.saldoNoFinancieroPctPib, id),
  });
  const base = resultado(ESCENARIO_BASE, d.filasPorEscenario[ESCENARIO_BASE] ?? []);
  const casos = diferenciasConBase(
    base,
    d.sensibilidades.casos.map((c) => resultado(c.id, d.sensibilidades.filasPorCaso[c.id] ?? [])),
  );
  return {
    anio,
    filas: [
      {
        id: base.id,
        parametro: null,
        gasto: base.gasto,
        gastoDiferencia: null,
        saldo: base.saldo,
        saldoDiferencia: null,
      },
      ...casos.map((c, i) => ({
        id: c.id,
        parametro: rotuloPalanca(d.sensibilidades.casos[i]?.parametro ?? null),
        gasto: c.gasto,
        gastoDiferencia: c.gastoDiferencia,
        saldo: c.saldo,
        saldoDiferencia: c.saldoDiferencia,
      })),
    ],
  };
}
