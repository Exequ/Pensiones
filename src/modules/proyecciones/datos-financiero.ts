/**
 * Datos del bloque «Sistema financiero (M4)» de la página «Proyecciones» (Fase 5-B2). Único módulo,
 * junto con `datos-proyecciones.ts`, que importa ficheros de /data en esa carpeta; se carga bajo
 * demanda con el bloque. `FICHEROS_FINANCIERO` lista los ficheros que importa directamente; la
 * ejecución del presupuesto, el PIB del INE y el saldo presupuestario llegan por
 * `historico/datos-financiacion.ts`, que ya comprueba su procedencia.
 *
 * Aquí se mantienen siempre separados lo observado, lo derivado de datos observados, lo que sale de
 * M4 y lo que publica el Ageing Report: cada serie lleva su `Dato` con su naturaleza.
 */
import ageingJson from '../../../data/demografia/ageing-report-2024-espana.json';
import limiteJson from '../../../data/parametros/fondo-reserva-desembolso-maximo.json';
import ipcJson from '../../../data/parametros/ipc-indice-medio-anual.json';
import m4Json from '../../../data/proyecciones/m4-escenarios.json';
import fondoSeriesJson from '../../../data/sistema/fondo-reserva-series.json';
import numeroPensionesJson from '../../../data/sistema/pensiones-vigor-numero.json';
import pensionMediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import type { Dato, FilaObservadaProyeccion } from '../../engine/esquema-datos';
import { factorDeCalibracion, gastoNominal } from '../../engine/proyecciones';
import { formatearPorcentaje } from '../../engine/formato';
import { serieIPCDesdeArchivo, type SerieIPC } from '../../engine/euros-constantes';
import {
  datoDeArchivo,
  diferencia,
  escalar,
  puntosDeDatos,
  valorEn,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { serieEjecucion, type TablaEjecucion } from '../../engine/sistema-historico';
import { cargarSerie, memorizar, validarArchivo, type SerieCargada } from '../historico/cargar';
import {
  datosFinanciacion,
  ejecucionDelPresupuesto,
  PRIMER_EJERCICIO,
  ULTIMO_EJERCICIO,
} from '../historico/datos-financiacion';
import { cargarProyeccion, type FilaModelo, type TablaModelo } from './datos-proyecciones';
import { FICHEROS_FINANCIERO } from './ficheros';
import {
  AGEING,
  CLASES_CALIBRACION,
  COL4,
  COMPLEMENTOS_MINIMOS,
  ESCENARIO_BASE,
  SERIE,
} from './ids-financiero';
import { puntosDeColumna } from './series';

/** Serie con el `Dato` que alimenta `SourceLine` (con su naturaleza: observado, derivado, publicada). */
export interface SerieConDato {
  readonly puntos: readonly PuntoAnual[];
  readonly dato: Dato;
}

/** Un escenario de sensibilidad de M4: sus dos hipótesis (fracciones) y un rótulo calculado con ellas. */
export interface EscenarioM4 {
  readonly id: string;
  readonly g: number;
  readonly ipc: number;
  /** «g 1 %, IPC 2 %» (con «base:» delante en el escenario base); sale de los valores, no está escrito. */
  readonly etiqueta: string;
}

/** Fila de la comparación entre el gasto de la ejecución y «pensiones × pensión media × catorce pagas». */
export interface FilaCalibracion {
  readonly clave: string;
  readonly clase: string;
  readonly pensiones: number;
  readonly pensionMediaMes: number;
  /** Gasto de la ejecución del presupuesto, millones de euros. */
  readonly gastoEjecucion: number;
  /** Pensiones × pensión media × pagas, millones de euros. */
  readonly gastoNominal: number;
  /** Gasto de la ejecución entre gasto nominal. */
  readonly factor: number;
}

/** Cálculo del factor de calibración con el último año observado (paso 1 de Ajustes de M4). */
export interface Calibracion {
  readonly anio: number;
  readonly clases: readonly FilaCalibracion[];
  readonly total: FilaCalibracion;
  /** Gasto de la ejecución que no pertenece a ninguna de las cinco clases (pensiones derivadas de la DANA). */
  readonly gastoSinClase: number;
  readonly complementos: {
    /** Complementos a mínimos de pensiones contributivas: partida aparte de la ejecución, millones de euros. */
    readonly importe: number;
    /** (gasto de la ejecución + complementos) entre gasto nominal. */
    readonly factorConComplementos: number;
    readonly dato: Dato;
  };
  readonly fuentes: readonly Dato[];
}

export interface DatosFinanciero {
  /** Salida de M4 del escenario activo: las filas calculadas (no incluye la fila observada del último año). */
  readonly m4: TablaModelo;
  readonly escenarioActivo: EscenarioM4;
  readonly escenarios: readonly EscenarioM4[];
  /** Filas calculadas de cada escenario, por identificador (para compararlos). */
  readonly filasPorEscenario: Readonly<Record<string, readonly FilaModelo[]>>;
  /** Palancas que valen igual en todos los escenarios, tal cual las recoge el LEEME de la salida. */
  readonly parametrosComunes: readonly string[];
  /** Fila del último año observado que acompaña a la salida (datos, no cálculo del modelo). */
  readonly filaObservada: FilaObservadaProyeccion;
  readonly calibracion: Calibracion;
  /** Primer año proyectado por M4 (el último observado es el anterior). */
  readonly anioInicio: number;
  readonly escenario: { readonly g: number; readonly ipc: number };
  readonly observado: {
    /** Importes en millones de euros corrientes (ejecución del presupuesto de la Seguridad Social). */
    readonly gastoPensiones: SerieConDato;
    readonly cotizaciones: SerieConDato;
    /** Solo existe desde que se creó el MEI. */
    readonly mei: SerieConDato;
    readonly saldoCotizacionesMenosPensiones: SerieConDato;
    readonly saldoSinTransferencias: SerieConDato;
    readonly saldoNoFinanciero: SerieConDato;
    /** PIB corriente del INE, millones de euros. */
    readonly pibIne: SerieConDato;
    /** Pensión media en vigor a 1 de diciembre, ambos sexos, euros al mes. */
    readonly pensionMediaTotal: SerieConDato;
    readonly pensionMediaJubilacion: SerieConDato;
    readonly fondoValor: SerieConDato;
    readonly fondoDotacionesMei: SerieConDato;
    /** Disposiciones del Fondo en valor absoluto (la fuente las registra con signo negativo). */
    readonly fondoDisposiciones: SerieConDato;
  };
  readonly ipc: { readonly serie: SerieIPC; readonly dato: Dato };
  /** Límite legal anual de disposición del Fondo, en porcentaje del PIB. */
  readonly limiteDisposicion: {
    readonly puntos: readonly PuntoAnual[];
    readonly dato: Dato;
    readonly articulo: string;
  };
  /** Ageing Report 2024: proyección publicada (naturaleza «proyección publicada»). */
  readonly ageing: {
    readonly gastoPensionesPib: SerieConDato;
    readonly saldoSistemaPensiones: SerieConDato;
    readonly tasaReposicionBruta: SerieConDato;
    readonly crecimientoPibPotencial: SerieConDato;
  };
}

const conNaturaleza = (dato: Dato, naturaleza: NonNullable<Dato['naturaleza']>): Dato => ({
  ...dato,
  naturaleza,
});

const observada = (s: SerieCargada): SerieConDato => ({
  puntos: s.puntos,
  dato: conNaturaleza(s.dato, 'observado'),
});

const publicada = (s: SerieCargada): SerieConDato => ({
  puntos: s.puntos,
  dato: conNaturaleza(s.dato, 'proyeccion-publicada'),
});

/** Serie calculada con datos observados: su `Dato` es el del origen con naturaleza «derivado» y el cálculo. */
const derivada = (puntos: readonly PuntoAnual[], origen: Dato, calculo: string): SerieConDato => ({
  puntos,
  dato: { ...origen, naturaleza: 'derivado', notes: calculo },
});

const rotuloEscenario = (g: number, ipc: number, esBase: boolean): string =>
  `${esBase ? 'base: ' : ''}g ${formatearPorcentaje(g, { maxDecimales: 2 })}, IPC ${formatearPorcentaje(ipc, { maxDecimales: 2 })}`;

/** Salida de M4 de un escenario: sus filas calculadas y el `Dato` que lo rotula en `SourceLine`. */
function tablaDeEscenario(
  completa: TablaModelo,
  filas: readonly FilaModelo[],
  e: EscenarioM4,
): TablaModelo {
  return {
    archivo: completa.archivo,
    filas,
    dato: {
      ...completa.dato,
      value: filas.length,
      notes: `Salida del modelo M4, ejecutada el ${completa.archivo.origen.ejecutadoEl}; escenario de sensibilidad ${e.etiqueta}; legislación congelada. Las filas del año observado no las calcula el modelo.`,
    },
  };
}

const datosBase = memorizar((): DatosFinanciero => {
  const completa = cargarProyeccion(m4Json);
  const archivoM4 = completa.archivo;
  const escenarios: EscenarioM4[] = (archivoM4.escenarios ?? []).map((e) => ({
    ...e,
    etiqueta: rotuloEscenario(e.g, e.ipc, e.id === ESCENARIO_BASE),
  }));
  const escenarioBase = escenarios.find((e) => e.id === ESCENARIO_BASE);
  const filaObservada = archivoM4.filaObservada;
  if (
    escenarioBase === undefined ||
    filaObservada === undefined ||
    archivoM4.parametrosComunes === undefined
  ) {
    throw new Error(
      'El fichero de escenarios de M4 no tiene escenario base, fila observada o parámetros comunes',
    );
  }
  const filasPorEscenario = Object.fromEntries(
    escenarios.map((e) => [e.id, completa.filas.filter((f) => f[COL4.escenario] === e.id)]),
  );
  const m4 = tablaDeEscenario(completa, filasPorEscenario[ESCENARIO_BASE] ?? [], escenarioBase);
  const filasM4 = m4.filas;
  const anioInicio = puntosDeColumna(filasM4, COL4.gasto)[0]?.anio;
  if (anioInicio === undefined) throw new Error('M4 no tiene filas');

  const financiacion = datosFinanciacion();
  const { ejecucion, presupuesto } = financiacion;
  const { filas: filasEjecucion, dato: datoEjecucion } = ejecucionDelPresupuesto();

  // MEI: la fila solo existe en los ejercicios posteriores a su creación; no se rellena ningún hueco.
  const meiPuntos: PuntoAnual[] = [];
  for (let anio = PRIMER_EJERCICIO; anio <= ULTIMO_EJERCICIO; anio++) {
    const hay = filasEjecucion.some(
      (f) =>
        f.periodo === `${anio}-T4` &&
        f.tabla === 'ingresos-cap1-cap4' &&
        f.concepto === 'MECANISMO DE EQUIDAD INTERGENERACIONAL',
    );
    if (hay) {
      meiPuntos.push(
        ...serieEjecucion(filasEjecucion, {
          tabla: 'ingresos-cap1-cap4',
          concepto: 'MECANISMO DE EQUIDAD INTERGENERACIONAL',
          desde: anio,
          hasta: anio,
        }),
      );
    }
  }

  const cotizaciones = ejecucion.cotizaciones;
  const gasto = ejecucion.sumaPensiones;
  const notaEjecucion =
    'Ejecución del presupuesto de la Seguridad Social, obligaciones y derechos reconocidos a fin de ejercicio, millones de euros corrientes.';

  const fondo = validarArchivo(fondoSeriesJson);
  const pensionMedia = validarArchivo(pensionMediaJson);
  const ipc = validarArchivo(ipcJson);
  const limite = validarArchivo(limiteJson);
  const ageing = validarArchivo(ageingJson);
  const primerLimite = limite.data?.[0];
  const ultimoIpc = ipc.data?.at(-1);
  if (!primerLimite || !ultimoIpc) throw new Error('Faltan datos del límite del Fondo o del IPC');
  const disposiciones = cargarSerie(fondo, SERIE.fondoDisposiciones);

  // Factor de calibración con el último año observado: gasto de la ejecución entre pensiones × pensión media × pagas.
  const anioObservado = anioInicio - 1;
  const numeroPensiones = validarArchivo(numeroPensionesJson);
  const valorAnio = (puntos: readonly PuntoAnual[]): number => {
    const v = valorEn(puntos, anioObservado);
    if (v === undefined) throw new Error(`Falta el dato de ${anioObservado}`);
    return v;
  };
  const importeEjecucion = (tabla: TablaEjecucion, concepto: string): number =>
    valorAnio(
      serieEjecucion(filasEjecucion, {
        tabla,
        concepto,
        desde: anioObservado,
        hasta: anioObservado,
      }),
    );
  const filaCalibracion = (clave: string, clase: string, concepto: string): FilaCalibracion => {
    const pensiones = valorAnio(cargarSerie(numeroPensiones, `${clave}-ambos`).puntos);
    const pensionMediaMes = valorAnio(cargarSerie(pensionMedia, `${clave}-ambos`).puntos);
    const gastoEjecucion = importeEjecucion(COMPLEMENTOS_MINIMOS.tablaPensiones, concepto);
    return {
      clave,
      clase,
      pensiones,
      pensionMediaMes,
      gastoEjecucion,
      gastoNominal: gastoNominal(pensiones, pensionMediaMes),
      factor: factorDeCalibracion(gastoEjecucion, pensiones, pensionMediaMes),
    };
  };
  const clasesCalibracion = CLASES_CALIBRACION.map((c) =>
    filaCalibracion(c.clave, c.clase, c.concepto),
  );
  const totalCalibracion = filaCalibracion(
    'total',
    'Todas las clases',
    COMPLEMENTOS_MINIMOS.conceptoSumaPensiones,
  );
  const importeComplementos = importeEjecucion(
    COMPLEMENTOS_MINIMOS.tabla,
    COMPLEMENTOS_MINIMOS.concepto,
  );
  const calibracion: Calibracion = {
    anio: anioObservado,
    clases: clasesCalibracion,
    total: totalCalibracion,
    gastoSinClase:
      totalCalibracion.gastoEjecucion - clasesCalibracion.reduce((a, c) => a + c.gastoEjecucion, 0),
    complementos: {
      importe: importeComplementos,
      factorConComplementos:
        (totalCalibracion.gastoEjecucion + importeComplementos) / totalCalibracion.gastoNominal,
      dato: {
        ...conNaturaleza(datoEjecucion, 'observado'),
        notes: `${notaEjecucion} Partida «${COMPLEMENTOS_MINIMOS.concepto}», fuera de la suma de pensiones contributivas.`,
      },
    },
    fuentes: [
      conNaturaleza(datoEjecucion, 'observado'),
      conNaturaleza(cargarSerie(numeroPensiones, 'total-ambos').dato, 'observado'),
      conNaturaleza(cargarSerie(pensionMedia, 'total-ambos').dato, 'observado'),
    ],
  };

  return {
    m4,
    escenarioActivo: escenarioBase,
    escenarios,
    filasPorEscenario,
    parametrosComunes: archivoM4.parametrosComunes,
    filaObservada,
    calibracion,
    anioInicio,
    escenario: { g: escenarioBase.g, ipc: escenarioBase.ipc },
    observado: {
      gastoPensiones: {
        puntos: gasto.puntos,
        dato: conNaturaleza(gasto.dato, 'observado'),
      },
      cotizaciones: {
        puntos: cotizaciones.puntos,
        dato: conNaturaleza(cotizaciones.dato, 'observado'),
      },
      mei: {
        puntos: meiPuntos,
        dato: { ...conNaturaleza(datoEjecucion, 'observado'), notes: notaEjecucion },
      },
      saldoCotizacionesMenosPensiones: derivada(
        diferencia(cotizaciones.puntos, gasto.puntos),
        datoEjecucion,
        `Cotizaciones sociales menos suma de pensiones contributivas. ${notaEjecucion}`,
      ),
      saldoSinTransferencias: derivada(
        diferencia(cotizaciones.puntos, presupuesto.obligacionesNoFinancieras.puntos),
        datoEjecucion,
        `Cotizaciones sociales menos obligaciones no financieras (gasto en pensiones y resto de gastos), sin transferencias ni otros ingresos. ${notaEjecucion}`,
      ),
      saldoNoFinanciero: observada(presupuesto.saldoNoFinanciero),
      pibIne: observada(financiacion.pib),
      pensionMediaTotal: observada(cargarSerie(pensionMedia, SERIE.pensionMediaTotal)),
      pensionMediaJubilacion: observada(cargarSerie(pensionMedia, SERIE.pensionMediaJubilacion)),
      fondoValor: observada(cargarSerie(fondo, SERIE.fondoValor)),
      fondoDotacionesMei: observada(cargarSerie(fondo, SERIE.fondoDotacionesMei)),
      fondoDisposiciones: {
        puntos: escalar(disposiciones.puntos, -1),
        dato: derivada(
          escalar(disposiciones.puntos, -1),
          disposiciones.dato,
          'Disposiciones anuales del Fondo de Reserva en valor absoluto: la fuente las registra con signo negativo.',
        ).dato,
      },
    },
    ipc: {
      serie: serieIPCDesdeArchivo(ipc),
      dato: conNaturaleza(datoDeArchivo(ipc, ultimoIpc.id), 'observado'),
    },
    limiteDisposicion: {
      puntos: puntosDeDatos(limite),
      dato: datoDeArchivo(limite, primerLimite.id),
      articulo: primerLimite.location ?? '',
    },
    ageing: {
      gastoPensionesPib: publicada(cargarSerie(ageing, AGEING.gastoPensionesPib)),
      saldoSistemaPensiones: publicada(cargarSerie(ageing, AGEING.saldoSistemaPensiones)),
      tasaReposicionBruta: publicada(cargarSerie(ageing, AGEING.tasaReposicionBruta)),
      crecimientoPibPotencial: publicada(cargarSerie(ageing, AGEING.crecimientoPibPotencial)),
    },
  };
});

const porEscenario = new Map<string, DatosFinanciero>();

/**
 * Datos del bloque financiero para un escenario de sensibilidad (por defecto, el base). Lo observado, la
 * calibración y el Ageing Report son los mismos en todos; cambian la salida de M4 (`m4`) y el escenario
 * (`escenario`, que usan los cálculos con el IPC supuesto). Lanza si el escenario no existe.
 */
export function datosFinanciero(id: string = ESCENARIO_BASE): DatosFinanciero {
  const guardado = porEscenario.get(id);
  if (guardado) return guardado;
  const base = datosBase();
  const e = base.escenarios.find((x) => x.id === id);
  const filas = base.filasPorEscenario[id];
  if (e === undefined || filas === undefined) throw new RangeError(`Escenario desconocido: ${id}`);
  const datos: DatosFinanciero =
    id === ESCENARIO_BASE
      ? base
      : {
          ...base,
          m4: tablaDeEscenario(base.m4, filas, e),
          escenarioActivo: e,
          escenario: { g: e.g, ipc: e.ipc },
        };
  porEscenario.set(id, datos);
  return datos;
}

export { FICHEROS_FINANCIERO };
