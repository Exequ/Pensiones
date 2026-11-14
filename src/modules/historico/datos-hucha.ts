/**
 * Datos de la página «Hucha». Único módulo que importa ficheros de /data para esa página;
 * `FICHEROS_HUCHA` los lista para el test de procedencia. La ejecución del presupuesto y las
 * pensiones en vigor se comparten con las otras páginas.
 */
import cronologiaJson from '../../../data/normativa/cronologia.json';
import trlgssJson from '../../../data/normativa/trlgss-financiacion.json';
import pibJson from '../../../data/macro/pib-ine.json';
import desembolsoJson from '../../../data/parametros/fondo-reserva-desembolso-maximo.json';
import meiDestinoJson from '../../../data/parametros/mei-destino.json';
import prestamosLeyesJson from '../../../data/parametros/prestamos-estado-seguridad-social.json';
import prestamosPlazoJson from '../../../data/parametros/prestamos-plazo-ampliado-2026.json';
import deudaJson from '../../../data/sistema/deuda-pde-seguridad-social.json';
import tribunalJson from '../../../data/sistema/prestamos-transferencias-tribunal-cuentas.json';
import fondoCsv from '../../../data/sistema/fondo-reserva-anual.csv?raw';
import fondoTablaJson from '../../../data/sistema/fondo-reserva-anual.json';
import fondoSeriesJson from '../../../data/sistema/fondo-reserva-series.json';
import pensionMediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import numeroPensionesJson from '../../../data/sistema/pensiones-vigor-numero.json';
import {
  ArchivoCronologia,
  type ArchivoDatos,
  type Dato,
  type DatoConId,
  type Norma,
} from '../../engine/esquema-datos';
import {
  datoDeArchivo,
  datoDeSerie,
  encontrarSerie,
  filasCsv,
  numeroCsv,
  puntosDeDatos,
  type PuntoAnual,
} from '../../engine/series-historicas';
import {
  CLASES_PENSION,
  serieEjecucion,
  type ClasePension,
  type TablaEjecucion,
} from '../../engine/sistema-historico';
import {
  acumuladoTrimestral,
  flujoDelTrimestre,
  flujosTrimestrales,
  puntosTrimestrales,
  type PuntoTrimestral,
} from '../../engine/transferencias';
import { FICHEROS_HUCHA } from './ficheros';
import {
  cargarSerie,
  datoDeTabla,
  memorizar,
  validarArchivo,
  validarTabla,
  type SerieCargada,
} from './cargar';
import {
  datosFinanciacion,
  ejecucionDelPresupuesto,
  PRIMER_EJERCICIO,
  ULTIMO_EJERCICIO,
} from './datos-financiacion';

/** Dato numérico o textual de un fichero de datos sueltos, con su `Dato` para `SourceLine`. */
export interface DatoCargado {
  readonly id: string;
  readonly valor: number | string;
  readonly unidad: string;
  readonly periodo: string;
  readonly notas: string;
  readonly cita: string;
  readonly ubicacion: string;
  readonly dato: Dato;
}

/** Serie de la ejecución del presupuesto con su `Dato` de fuente. */
interface SerieDeEjecucion {
  readonly puntos: readonly PuntoAnual[];
  readonly dato: Dato;
}

export interface DatosTransferencias {
  /** Transferencias corrientes del Estado y organismos autónomos (ingresos, derechos reconocidos), M€. */
  readonly delEstado: SerieDeEjecucion;
  /** Total de transferencias corrientes recibidas, de cualquier origen, M€. */
  readonly totalCorrientes: SerieDeEjecucion;
  /** Transferencias de capital recibidas, de cualquier origen (la fuente no las separa por origen), M€. */
  readonly capital: SerieDeEjecucion;
  /** Pasivos financieros (capítulo 9 de ingresos), que incluyen los préstamos del Estado, M€. */
  readonly pasivosFinancieros: SerieDeEjecucion;
  /** Flujo de cada trimestre (acumulado de cierre menos el del trimestre anterior), M€. */
  readonly flujosTrimestrales: readonly PuntoTrimestral[];
  /** Flujo del cuarto trimestre de cada año, M€. */
  readonly cuartoTrimestre: readonly PuntoAnual[];
  readonly datoTrimestral: Dato;
}

export interface DatosDeuda {
  readonly finAno: SerieCargada;
  readonly trimestral: {
    readonly puntos: readonly PuntoTrimestral[];
    readonly dato: Dato;
  };
}

export interface FlujoAnualFondo {
  readonly anio: number;
  readonly valor: number | null;
  readonly dotaciones: number | null;
  readonly dotacionesMei: number | null;
  readonly disposiciones: number | null;
}

export interface DatosHucha {
  readonly valor: SerieCargada;
  readonly flujos: { readonly filas: readonly FlujoAnualFondo[]; readonly dato: Dato };
  readonly limiteDesembolso: {
    readonly puntos: readonly PuntoAnual[];
    readonly dato: Dato;
    /** Texto de la norma tal como consta en el dato (nota con el artículo y el límite). */
    readonly nota: string;
    readonly articulo: string;
  };
  readonly destinoMei: { readonly nota: string; readonly dato: Dato };
  readonly normas: readonly Norma[];
  readonly pib: SerieCargada;
  readonly numeroPorClase: Readonly<Record<ClasePension, SerieCargada>>;
  readonly pensionMediaPorClase: Readonly<Record<ClasePension, SerieCargada>>;
  readonly gastoEjecucion: { readonly puntos: readonly PuntoAnual[]; readonly dato: Dato };
  readonly transferencias: DatosTransferencias;
  readonly deuda: DatosDeuda;
  /** Cifras y citas del Tribunal de Cuentas (BOE-A-2025-25090), por identificador. */
  readonly tribunal: Readonly<Record<string, DatoCargado>>;
  /** Artículo 109 del TRLGSS, por identificador. */
  readonly trlgss: Readonly<Record<string, DatoCargado>>;
  /** Importe máximo autorizado y plazo de los préstamos del Estado en las leyes de presupuestos. */
  readonly prestamosLeyes: Readonly<Record<string, DatoCargado>>;
  /** Nuevo plazo de cancelación de préstamos antiguos (RDL 3/2026). */
  readonly prestamosPlazo: Readonly<Record<string, DatoCargado>>;
}

/** Indexa los datos sueltos de un fichero por `id`. */
function datosPorId(archivo: ArchivoDatos): Record<string, DatoCargado> {
  return Object.fromEntries(
    (archivo.data ?? []).map((d: DatoConId) => [
      d.id,
      {
        id: d.id,
        valor: d.value,
        unidad: d.unit,
        periodo: d.period,
        notas: d.notes ?? '',
        cita: d.quote ?? '',
        ubicacion: d.location ?? '',
        dato: datoDeArchivo(archivo, d.id),
      },
    ]),
  );
}

export const datosHucha = memorizar((): DatosHucha => {
  const series = validarArchivo(fondoSeriesJson);
  const tabla = validarTabla(fondoTablaJson);
  const desembolso = validarArchivo(desembolsoJson);
  const mei = validarArchivo(meiDestinoJson);
  const cronologia = ArchivoCronologia.parse(cronologiaJson);
  const numero = validarArchivo(numeroPensionesJson);
  const media = validarArchivo(pensionMediaJson);
  const financiacion = datosFinanciacion();

  const primerLimite = desembolso.data?.[0];
  const destino = mei.data?.find((d) => d.id === 'destino-fondo-reserva');
  if (!primerLimite || !destino) throw new Error('Faltan datos de las reglas del Fondo de Reserva');

  const filas: FlujoAnualFondo[] = filasCsv(fondoCsv).map((f) => ({
    anio: Number(f['anio']),
    valor: numeroCsv(f['valor_fondo_meur']),
    dotaciones: numeroCsv(f['dotaciones_anuales_meur']),
    dotacionesMei: numeroCsv(f['dotaciones_mei_anuales_meur']),
    disposiciones: numeroCsv(f['disposiciones_anuales_meur']),
  }));

  const clases = (archivo: ReturnType<typeof validarArchivo>) =>
    Object.fromEntries(
      CLASES_PENSION.map((c) => [c, cargarSerie(archivo, `${c}-ambos`)]),
    ) as Record<ClasePension, SerieCargada>;

  const { filas: filasEjecucion, dato: datoEjecucion } = ejecucionDelPresupuesto();
  const deDeEjecucion = (tabla: TablaEjecucion, concepto: string): SerieDeEjecucion => ({
    puntos: serieEjecucion(filasEjecucion, {
      tabla,
      concepto,
      desde: PRIMER_EJERCICIO,
      hasta: ULTIMO_EJERCICIO,
    }),
    dato: datoEjecucion,
  });
  const acumulado = acumuladoTrimestral(filasEjecucion, {
    tabla: 'ingresos-cap1-cap4',
    concepto: 'DEL ESTADO Y ORG.AUTÓNOMOS',
  });
  const flujos = flujosTrimestrales(acumulado);
  const deuda = validarArchivo(deudaJson);
  const deudaTrimestral = encontrarSerie(deuda, 'deuda-pde-trimestral');

  return {
    valor: cargarSerie(series, 'valor-fin-ano'),
    flujos: {
      filas,
      dato: datoDeTabla(tabla, String(Math.max(...filas.map((f) => f.anio)))),
    },
    limiteDesembolso: {
      puntos: puntosDeDatos(desembolso),
      dato: datoDeArchivo(desembolso, primerLimite.id),
      nota: primerLimite.notes ?? '',
      articulo: primerLimite.location ?? '',
    },
    destinoMei: { nota: destino.notes ?? '', dato: datoDeArchivo(mei, destino.id) },
    normas: cronologia.normas.filter((n) => n.cambios.some((c) => c.parametro === 'fondo-reserva')),
    pib: cargarSerie(validarArchivo(pibJson), 'pib-corriente'),
    numeroPorClase: clases(numero),
    pensionMediaPorClase: clases(media),
    gastoEjecucion: {
      puntos: financiacion.ejecucion.sumaPensiones.puntos,
      dato: financiacion.ejecucion.sumaPensiones.dato,
    },
    transferencias: {
      delEstado: deDeEjecucion('ingresos-cap1-cap4', 'DEL ESTADO Y ORG.AUTÓNOMOS'),
      totalCorrientes: deDeEjecucion('ingresos-cap1-cap4', 'TOTAL TRANSFERENCIAS CORRIENTES'),
      capital: deDeEjecucion('ingresos', '7. TRANSFERENCIAS DE CAPITAL'),
      pasivosFinancieros: deDeEjecucion('ingresos', '9. PASIVOS FINANCIEROS'),
      flujosTrimestrales: flujos,
      cuartoTrimestre: flujoDelTrimestre(flujos, 4),
      datoTrimestral: datoEjecucion,
    },
    deuda: {
      finAno: cargarSerie(deuda, 'deuda-pde-fin-ano'),
      trimestral: {
        puntos: puntosTrimestrales(deudaTrimestral),
        dato: datoDeSerie(deudaTrimestral),
      },
    },
    tribunal: datosPorId(validarArchivo(tribunalJson)),
    trlgss: datosPorId(validarArchivo(trlgssJson)),
    prestamosLeyes: datosPorId(validarArchivo(prestamosLeyesJson)),
    prestamosPlazo: datosPorId(validarArchivo(prestamosPlazoJson)),
  };
});

export { FICHEROS_HUCHA };
