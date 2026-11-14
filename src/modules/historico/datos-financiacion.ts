/**
 * Datos de la página «Financiación y déficit». Único módulo que importa ficheros de /data para esa
 * página; `FICHEROS_FINANCIACION` los lista para el test de procedencia.
 */
import eurostatJson from '../../../data/internacional/eurostat-espana.json';
import ocdeJson from '../../../data/internacional/ocde-espana.json';
import pibJson from '../../../data/macro/pib-ine.json';
import definicionesJson from '../../../data/sistema/deficit-definiciones.json';
import deficitPresupuestarioJson from '../../../data/sistema/deficit-presupuestario-seguridad-social.json';
import deficitSecJson from '../../../data/sistema/deficit-sec-fondos-seguridad-social.json';
import gastosImpropiosJson from '../../../data/sistema/gastos-impropios.json';
import ejecucionCsv from '../../../data/sistema/presupuesto-ss-ejecucion.csv?raw';
import ejecucionJson from '../../../data/sistema/presupuesto-ss-ejecucion.json';
import type { Dato } from '../../engine/esquema-datos';
import { datoDeArchivo, type PuntoAnual } from '../../engine/series-historicas';
import {
  leerEjecucion,
  serieEjecucion,
  type FilaEjecucion,
  type OpcionesSerieEjecucion,
} from '../../engine/sistema-historico';
import { FICHEROS_FINANCIACION } from './ficheros';
import {
  cargarSerie,
  datoDeTabla,
  memorizar,
  validarArchivo,
  validarTabla,
  type SerieCargada,
} from './cargar';

/** Identificadores de las definiciones y notas de `deficit-definiciones` que usa la página. */
export const ID_DEFINICION_SEC = 'necesidad-financiacion-sec-s1314';
export const ID_NOTA_SANIDAD = 'nota-espana-sanidad-2002';
/** Única cifra de gastos impropios que muestra la página: una estimación, no un dato observado. */
export const ID_ESTIMACION_GASTOS_IMPROPIOS = 'gastos-impropios-previstos-2023';

/** Primer y último ejercicio con cifra de fin de año en la ejecución (2017 es la comparativa de 2018). */
export const PRIMER_EJERCICIO = 2017;
export const ULTIMO_EJERCICIO = 2025;

/** Serie de la ejecución del presupuesto con su `Dato` de fuente (tabla CSV + JSON hermano). */
export interface SerieEjecucionCargada {
  readonly puntos: readonly PuntoAnual[];
  readonly dato: Dato;
}

export interface DefinicionDeficit {
  readonly id: string;
  readonly literal: string;
  readonly notas: string;
  readonly dato: Dato;
}

export interface DatoPrevision {
  readonly id: string;
  readonly valor: number;
  readonly unidad: string;
  readonly periodo: string;
  readonly notas: string;
  readonly dato: Dato;
}

export interface DatosFinanciacion {
  readonly pib: SerieCargada;
  readonly presupuesto: {
    readonly derechosNoFinancieros: SerieCargada;
    readonly obligacionesNoFinancieras: SerieCargada;
    readonly saldoNoFinanciero: SerieCargada;
    readonly derechosTotales: SerieCargada;
    readonly obligacionesTotales: SerieCargada;
    readonly saldoTotal: SerieCargada;
    readonly transferenciasEstado: SerieCargada;
  };
  readonly saldoSec: { readonly millones: SerieCargada; readonly porcentajePib: SerieCargada };
  readonly ejecucion: {
    readonly cotizaciones: SerieEjecucionCargada;
    readonly sumaPensiones: SerieEjecucionCargada;
    readonly jubilacion: SerieEjecucionCargada;
    readonly incapacidad: SerieEjecucionCargada;
    readonly viudedad: SerieEjecucionCargada;
    readonly orfandad: SerieEjecucionCargada;
    readonly favorFamiliares: SerieEjecucionCargada;
    readonly complementoMinimos: SerieEjecucionCargada;
  };
  readonly gastoSobrePib: {
    readonly eurostatVejez: SerieCargada;
    readonly eurostatSupervivencia: SerieCargada;
    readonly ocde: SerieCargada;
  };
  readonly definiciones: readonly DefinicionDeficit[];
  readonly previsiones: readonly DatoPrevision[];
}

/** Lee una fila de la ejecución y la acompaña del `Dato` de la tabla. */
export function serieDeEjecucion(
  filas: readonly FilaEjecucion[],
  dato: Dato,
  opciones: Omit<OpcionesSerieEjecucion, 'desde' | 'hasta'>,
): SerieEjecucionCargada {
  return {
    puntos: serieEjecucion(filas, {
      ...opciones,
      desde: PRIMER_EJERCICIO,
      hasta: ULTIMO_EJERCICIO,
    }),
    dato,
  };
}

/** Ejecución completa (filas y `Dato` de fuente), compartida con la página «Hucha». */
export const ejecucionDelPresupuesto = memorizar(() => {
  const tabla = validarTabla(ejecucionJson);
  return {
    filas: leerEjecucion(ejecucionCsv),
    dato: datoDeTabla(tabla, String(ULTIMO_EJERCICIO)),
  };
});

export const datosFinanciacion = memorizar((): DatosFinanciacion => {
  const { filas, dato } = ejecucionDelPresupuesto();
  const presupuesto = validarArchivo(deficitPresupuestarioJson);
  const sec = validarArchivo(deficitSecJson);
  const pib = validarArchivo(pibJson);
  const eurostat = validarArchivo(eurostatJson);
  const ocde = validarArchivo(ocdeJson);
  const definiciones = validarArchivo(definicionesJson);
  const impropios = validarArchivo(gastosImpropiosJson);

  const cap4 = (concepto: string | readonly string[]) =>
    serieDeEjecucion(filas, dato, { tabla: 'gastos-cap4', concepto });

  return {
    pib: cargarSerie(pib, 'pib-corriente'),
    presupuesto: {
      derechosNoFinancieros: cargarSerie(presupuesto, 'derechos-no-financieros'),
      obligacionesNoFinancieras: cargarSerie(presupuesto, 'obligaciones-no-financieras'),
      saldoNoFinanciero: cargarSerie(presupuesto, 'saldo-presupuestario-no-financiero'),
      derechosTotales: cargarSerie(presupuesto, 'derechos-totales'),
      obligacionesTotales: cargarSerie(presupuesto, 'obligaciones-totales'),
      saldoTotal: cargarSerie(presupuesto, 'saldo-presupuestario-total'),
      transferenciasEstado: cargarSerie(presupuesto, 'transferencias-estado-corrientes'),
    },
    saldoSec: {
      millones: cargarSerie(sec, 'b9-mio-eur'),
      porcentajePib: cargarSerie(sec, 'b9-pc-gdp'),
    },
    ejecucion: {
      cotizaciones: serieDeEjecucion(filas, dato, {
        tabla: 'ingresos',
        concepto: '1. COTIZACIONES SOCIALES',
      }),
      sumaPensiones: cap4('SUMA DE PENSIONES'),
      jubilacion: cap4('JUBILACIÓN'),
      incapacidad: cap4(['INVALIDEZ', 'INCAPACIDAD PERMANENTE']),
      viudedad: cap4('VIUDEDAD'),
      orfandad: cap4('ORFANDAD'),
      favorFamiliares: cap4('A FAVOR DE FAMILIARES'),
      complementoMinimos: serieDeEjecucion(filas, dato, {
        tabla: 'gastos-cap4-no-contributivas',
        concepto: 'COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS',
      }),
    },
    gastoSobrePib: {
      eurostatVejez: cargarSerie(eurostat, 'gasto-old-no-aplica-no-aplica-pc-gdp'),
      eurostatSupervivencia: cargarSerie(eurostat, 'gasto-srv-no-aplica-no-aplica-pc-gdp'),
      ocde: cargarSerie(ocde, 'pep-no-aplica-z-z-pt-b1gq'),
    },
    definiciones: (definiciones.data ?? []).map((d) => ({
      id: d.id,
      literal: String(d.value),
      notas: d.notes ?? '',
      dato: datoDeArchivo(definiciones, d.id),
    })),
    previsiones: (impropios.data ?? []).map((d) => ({
      id: d.id,
      valor: typeof d.value === 'number' ? d.value : Number.NaN,
      unidad: d.unit,
      periodo: d.period,
      notas: d.notes ?? '',
      dato: datoDeArchivo(impropios, d.id),
    })),
  };
});

export { FICHEROS_FINANCIACION };
