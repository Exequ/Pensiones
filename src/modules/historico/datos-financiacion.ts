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
import type { DatoRotulado } from '../../components/fuentes';
import { Dato } from '../../engine/esquema-datos';
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
  cargarSerieConCita,
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

/**
 * Conceptos de la ejecución (tal como los nombra la fuente) que la página lee o cita. Los rótulos no
 * se ven en el cuerpo: van como cita al desplegable «Fuentes» (fase R7).
 */
export const CONCEPTO = {
  cotizaciones: '1. COTIZACIONES SOCIALES',
  sumaPensiones: 'SUMA DE PENSIONES',
  complementoMinimos: 'COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS',
  bloqueNoContributivas: 'SUMA DE PENSIONES NO CONTR. Y COMPL. A MÍNIMOS DE PENSIONES CONTR.',
} as const;

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
        concepto: CONCEPTO.cotizaciones,
      }),
      sumaPensiones: cap4(CONCEPTO.sumaPensiones),
      jubilacion: cap4('JUBILACIÓN'),
      incapacidad: cap4(['INVALIDEZ', 'INCAPACIDAD PERMANENTE']),
      viudedad: cap4('VIUDEDAD'),
      orfandad: cap4('ORFANDAD'),
      favorFamiliares: cap4('A FAVOR DE FAMILIARES'),
      complementoMinimos: serieDeEjecucion(filas, dato, {
        tabla: 'gastos-cap4-no-contributivas',
        concepto: CONCEPTO.complementoMinimos,
      }),
    },
    gastoSobrePib: {
      eurostatVejez: cargarSerie(eurostat, 'gasto-old-no-aplica-no-aplica-pc-gdp'),
      eurostatSupervivencia: cargarSerie(eurostat, 'gasto-srv-no-aplica-no-aplica-pc-gdp'),
      ocde: cargarSerieConCita(ocde, 'pep-no-aplica-z-z-pt-b1gq'),
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

/** Rótulo («Se refiere a») de la cita de cada registro de `deficit-definiciones` en «Fuentes». */
const ROTULO_CITA_DEFINICION: Readonly<Record<string, string>> = {
  'saldo-presupuestario-no-financiero': 'Rótulo de la fuente para las operaciones no financieras',
  'saldo-presupuestario-total': 'Rótulos de la fuente para los totales de ingresos y gastos',
  [ID_DEFINICION_SEC]: 'Definición del saldo en los metadatos de Eurostat',
  [ID_NOTA_SANIDAD]: 'Nota de Eurostat sobre el cambio de perímetro del subsector',
};

/**
 * Datos de las filas de la ejecución que la página nombra: la fuente es la de la tabla y la cita, el
 * rótulo del concepto en la fuente (fase R7).
 */
export function datosFilasEjecucion(): {
  readonly sumaPensiones: DatoRotulado;
  readonly complementoMinimos: DatoRotulado;
} {
  const { dato } = ejecucionDelPresupuesto();
  const fila = (concepto: string, location: string, rotulo: string): DatoRotulado => ({
    ...Dato.parse({ ...dato, quote: concepto, location }),
    rotulo,
  });
  return {
    sumaPensiones: fila(
      CONCEPTO.sumaPensiones,
      'Ejecución de gastos, detalle del capítulo de transferencias corrientes (pensiones por clase)',
      'Fila que suma las pensiones contributivas de las cinco clases',
    ),
    complementoMinimos: fila(
      CONCEPTO.complementoMinimos,
      `Ejecución de gastos, capítulo de transferencias corrientes, bloque «${CONCEPTO.bloqueNoContributivas}»`,
      'Fila del complemento a mínimos de las pensiones contributivas',
    ),
  };
}

/**
 * Fuentes de las definiciones del módulo de definiciones que muestra la página (fase R7): da el
 * `Dato` de cada referencia con los ficheros que la página ya carga. En las definiciones de
 * `deficit-definiciones`, la cita es el literal completo del registro (`value`), que incluye los dos
 * rótulos del saldo total. Devuelve `undefined` si la referencia no es de esta página.
 */
export function fuentesDefinicionFinanciacion(
  referencia: string,
  idDefinicion: string,
): DatoRotulado | readonly DatoRotulado[] | undefined {
  const d = datosFinanciacion();
  const { dato: ejecucion } = ejecucionDelPresupuesto();
  const filas = datosFilasEjecucion();
  const [fichero, id] = referencia.split('#');
  switch (fichero) {
    case 'sistema/deficit-definiciones.json': {
      const def = d.definiciones.find((x) => x.id === id);
      if (def === undefined) return undefined;
      return {
        ...Dato.parse({ ...def.dato, quote: def.literal }),
        rotulo: ROTULO_CITA_DEFINICION[def.id] ?? def.id,
      };
    }
    case 'sistema/deficit-presupuestario-seguridad-social.json': {
      const p = d.presupuesto;
      const porId: Readonly<Record<string, SerieCargada>> = {
        'saldo-presupuestario-no-financiero': p.saldoNoFinanciero,
        'derechos-no-financieros': p.derechosNoFinancieros,
        'obligaciones-no-financieras': p.obligacionesNoFinancieras,
        'saldo-presupuestario-total': p.saldoTotal,
        'derechos-totales': p.derechosTotales,
        'obligaciones-totales': p.obligacionesTotales,
        'transferencias-estado-corrientes': p.transferenciasEstado,
      };
      return id === undefined ? undefined : porId[id]?.dato;
    }
    case 'sistema/deficit-sec-fondos-seguridad-social.json':
      return id === 'b9-mio-eur'
        ? d.saldoSec.millones.dato
        : id === 'b9-pc-gdp'
          ? d.saldoSec.porcentajePib.dato
          : undefined;
    case 'sistema/presupuesto-ss-ejecucion.json':
      if (idDefinicion === 'gasto-pensiones-contributivas-sin-complemento')
        return [filas.sumaPensiones];
      if (idDefinicion === 'gasto-pensiones-contributivas-con-complemento')
        return [filas.sumaPensiones, filas.complementoMinimos];
      return ejecucion;
    case 'internacional/eurostat-espana.json':
      return id === 'gasto-old-no-aplica-no-aplica-pc-gdp'
        ? d.gastoSobrePib.eurostatVejez.dato
        : id === 'gasto-srv-no-aplica-no-aplica-pc-gdp'
          ? d.gastoSobrePib.eurostatSupervivencia.dato
          : undefined;
    case 'internacional/ocde-espana.json':
      return id === 'pep-no-aplica-z-z-pt-b1gq' ? d.gastoSobrePib.ocde.dato : undefined;
    case 'macro/pib-ine.json':
      return id === 'pib-corriente' ? d.pib.dato : undefined;
    default:
      return undefined;
  }
}

export { FICHEROS_FINANCIACION };
