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
import m4Json from '../../../data/proyecciones/m4-financiero.json';
import fondoSeriesJson from '../../../data/sistema/fondo-reserva-series.json';
import pensionMediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import type { Dato } from '../../engine/esquema-datos';
import { serieIPCDesdeArchivo, type SerieIPC } from '../../engine/euros-constantes';
import {
  datoDeArchivo,
  diferencia,
  escalar,
  puntosDeDatos,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { serieEjecucion } from '../../engine/sistema-historico';
import { cargarSerie, memorizar, validarArchivo, type SerieCargada } from '../historico/cargar';
import {
  datosFinanciacion,
  ejecucionDelPresupuesto,
  PRIMER_EJERCICIO,
  ULTIMO_EJERCICIO,
} from '../historico/datos-financiacion';
import { cargarProyeccion, type TablaModelo } from './datos-proyecciones';
import { FICHEROS_FINANCIERO } from './ficheros';
import { AGEING, COL4, SERIE } from './ids-financiero';
import { puntosDeColumna } from './series';

/** Serie con el `Dato` que alimenta `SourceLine` (con su naturaleza: observado, derivado, publicada). */
export interface SerieConDato {
  readonly puntos: readonly PuntoAnual[];
  readonly dato: Dato;
}

export interface DatosFinanciero {
  readonly m4: TablaModelo;
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

export const datosFinanciero = memorizar((): DatosFinanciero => {
  const m4 = cargarProyeccion(m4Json);
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

  return {
    m4,
    anioInicio,
    escenario: { g: m4.archivo.escenario.g, ipc: m4.archivo.escenario.ipc },
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

export { FICHEROS_FINANCIERO };
