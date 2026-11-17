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
import contraste2025Csv from '../../../data/sistema/liquidacion-ss-2025-contraste.csv?raw';
import contraste2025Json from '../../../data/sistema/liquidacion-ss-2025-contraste.json';
import liquidacionJson from '../../../data/sistema/liquidacion-ss-series.json';
import tribunalJson from '../../../data/sistema/prestamos-transferencias-tribunal-cuentas.json';
import anexoPrestamosCsv from '../../../data/sistema/tribunal-cuentas-cge2023-prestamos.csv?raw';
import anexoPrestamosJson from '../../../data/sistema/tribunal-cuentas-cge2023-prestamos.json';
import tribunal2023Json from '../../../data/sistema/tribunal-cuentas-cge2023-ss.json';
import fondoCsv from '../../../data/sistema/fondo-reserva-anual.csv?raw';
import fondoTablaJson from '../../../data/sistema/fondo-reserva-anual.json';
import fondoSeriesJson from '../../../data/sistema/fondo-reserva-series.json';
import pensionMediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import numeroPensionesJson from '../../../data/sistema/pensiones-vigor-numero.json';
import {
  ArchivoCronologia,
  ArchivoExtraccionPdf,
  Dato,
  type ArchivoDatos,
  type DatoConId,
  type Norma,
} from '../../engine/esquema-datos';
import {
  datoDeArchivo,
  datoDeSerie,
  encontrarSerie,
  extremos,
  filasCsv,
  numeroCsv,
  puntosDeDatos,
  suma,
  valorEn,
  type PuntoAnual,
} from '../../engine/series-historicas';
import {
  CLASES_PENSION,
  serieEjecucion,
  type ClasePension,
  type TablaEjecucion,
} from '../../engine/sistema-historico';
import { empalmarConRuptura, type SerieEmpalmada } from '../../engine/series-empalme';
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

/** Series de las liquidaciones del presupuesto de la Seguridad Social (PDF de 2010 a 2016). */
export interface DatosLiquidacion {
  /** Transferencias corrientes «Del Estado» más «De Organismos Autónomos administrativos», M€. */
  readonly delEstado: SerieDeEjecucion;
  /** Total de transferencias corrientes recibidas, de cualquier origen, M€. */
  readonly totalCorrientes: SerieCargada;
  /** Pasivos financieros (capítulo 9 de ingresos), M€. */
  readonly pasivosFinancieros: SerieCargada;
  /** Pensiones contributivas con el complemento a mínimos (obligaciones reconocidas, derivado), M€. */
  readonly gastoPensiones: SerieCargada;
  /** Primer ejercicio en que el complemento a mínimos figura aparte de las cinco clases de pensión. */
  readonly primerAnioComplementoAparte: number;
}

/** Fila del Anexo 10 de la Declaración del Tribunal de Cuentas sobre la CGE de 2023. */
export interface FilaPrestamo {
  readonly id: string;
  readonly tipo: 'prestamo' | 'subtotal' | 'total';
  readonly bloque: string;
  readonly norma: string;
  readonly importe: number;
  readonly vencimiento: string;
  readonly anioConcesion: number | null;
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

/** Una partida de la liquidación de 2025 frente a la ejecución del mismo ejercicio (Fase 5-A4). */
export interface FilaContraste2025 {
  readonly ejercicio: number;
  readonly tabla: string;
  readonly partida: string;
  readonly liquidacion: number;
  readonly ejecucion: number;
  readonly diferencia: number;
  readonly coincide: boolean;
}

export interface DatosHucha {
  /** Contraste de definición: la liquidación de 2025 frente a la ejecución al cierre de 2025 y de 2024. */
  readonly contraste2025: {
    readonly filas: readonly FilaContraste2025[];
    readonly dato: Dato;
    readonly mei: readonly {
      readonly anio: number;
      readonly derechos: number;
      readonly dotacion: number;
    }[];
    readonly datoDotaciones: Dato;
  };
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
  /** Complemento a mínimos de las pensiones contributivas (fila propia de la ejecución). */
  readonly complementoMinimos: { readonly puntos: readonly PuntoAnual[]; readonly dato: Dato };
  readonly transferencias: DatosTransferencias;
  /** Liquidaciones de 2010 a 2016 (PDF de la Seguridad Social). */
  readonly liquidacion: DatosLiquidacion;
  /**
   * Transferencias anuales del Estado empalmadas con ruptura de serie: liquidación (2010 a 2016) y
   * ejecución (desde 2017). Son dos documentos con rótulos distintos y no se unen en una sola línea.
   */
  readonly transferenciasAnuales: SerieEmpalmada;
  /** Pasivos financieros de ingresos empalmados con ruptura de serie (liquidación y ejecución). */
  readonly pasivosFinancierosAnuales: SerieEmpalmada;
  readonly deuda: DatosDeuda;
  /** Cifras y citas del Tribunal de Cuentas (BOE-A-2025-25090), por identificador. */
  readonly tribunal: Readonly<Record<string, DatoCargado>>;
  /** Cifras y citas de la Declaración del Tribunal de Cuentas sobre la CGE de 2023, por identificador. */
  readonly tribunal2023: Readonly<Record<string, DatoCargado>>;
  /** Préstamos concedidos por el Estado por año de concesión (derivado del Anexo 10), M€. */
  readonly prestamosPorAnio: SerieCargada;
  /** Anexo 10 del Tribunal de Cuentas, línea a línea, con el dato de su fuente. */
  readonly anexoPrestamos: {
    readonly filas: readonly FilaPrestamo[];
    readonly dato: Dato;
    /** Rótulo del anexo tal como consta en la fuente («Anexo 10»). */
    readonly nombre: string;
  };
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

  const liq = validarArchivo(liquidacionJson);
  const liqEstado = cargarSerie(liq, 'ingresos-transferencias-corrientes-del-estado');
  const liqOrganismos = cargarSerie(liq, 'ingresos-transferencias-corrientes-organismos-autonomos');
  const liquidacion: DatosLiquidacion = {
    delEstado: {
      puntos: suma(liqEstado.puntos, liqOrganismos.puntos),
      dato: liqEstado.dato,
    },
    totalCorrientes: cargarSerie(liq, 'ingresos-transferencias-corrientes-total'),
    pasivosFinancieros: cargarSerie(liq, 'ingresos-pasivos-financieros'),
    gastoPensiones: cargarSerie(liq, 'gastos-pensiones-con-complemento-a-minimos'),
    primerAnioComplementoAparte: extremos(cargarSerie(liq, 'gastos-complemento-a-minimos').puntos)
      .primero.anio,
  };
  const tablaContraste = validarTabla(contraste2025Json);
  const filasContraste: FilaContraste2025[] = filasCsv(contraste2025Csv)
    .filter((f) => f['columna'] === 'ejercicio_actual' || f['columna'] === 'ejercicio_anterior')
    .map((f) => ({
      ejercicio: Number(f['ejercicio']),
      tabla: f['tabla'] ?? '',
      partida: f['partida'] ?? '',
      liquidacion: numeroCsv(f['liquidacion_meur']) ?? Number.NaN,
      ejecucion: numeroCsv(f['ejecucion_meur']) ?? Number.NaN,
      diferencia: numeroCsv(f['diferencia_meur']) ?? Number.NaN,
      coincide: f['estado'] === 'coincide',
    }));
  const dotacionesMeiSerie = cargarSerie(series, 'dotaciones-mei-anuales');
  const meiContraste = filasContraste
    .filter((f) => f.tabla === 'ingresos-cap1-cap4' && /^Mecanismo de Equidad/.test(f.partida))
    .map((f) => ({
      anio: f.ejercicio,
      derechos: f.liquidacion,
      dotacion: valorEn(dotacionesMeiSerie.puntos, f.ejercicio) ?? Number.NaN,
    }))
    .sort((a, b) => a.anio - b.anio);
  const ejecucionEstado = deDeEjecucion('ingresos-cap1-cap4', 'DEL ESTADO Y ORG.AUTÓNOMOS');
  const ejecucionPasivos = deDeEjecucion('ingresos', '9. PASIVOS FINANCIEROS');
  const tribunal2023 = validarArchivo(tribunal2023Json);
  const anexo = ArchivoExtraccionPdf.parse(anexoPrestamosJson);
  const filasAnexo: FilaPrestamo[] = filasCsv(anexoPrestamosCsv).map((f) => {
    const tipo = f['tipo_linea'];
    if (tipo !== 'prestamo' && tipo !== 'subtotal' && tipo !== 'total') {
      throw new Error(`Anexo 10: tipo de línea «${tipo ?? ''}» desconocido`);
    }
    const anio = numeroCsv(f['anio_concesion']);
    return {
      id: f['id'] ?? '',
      tipo,
      bloque: f['bloque'] ?? '',
      norma: f['norma'] ?? '',
      importe: numeroCsv(f['importe']) ?? Number.NaN,
      vencimiento: f['vencimiento'] ?? '',
      anioConcesion: anio,
    };
  });

  return {
    contraste2025: {
      filas: filasContraste,
      dato: datoDeTabla(tablaContraste, '2025'),
      mei: meiContraste,
      datoDotaciones: dotacionesMeiSerie.dato,
    },
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
    complementoMinimos: {
      puntos: financiacion.ejecucion.complementoMinimos.puntos,
      dato: financiacion.ejecucion.complementoMinimos.dato,
    },
    liquidacion,
    transferenciasAnuales: empalmarConRuptura([
      { clave: 'liquidacion', etiqueta: 'Liquidación', puntos: liquidacion.delEstado.puntos },
      { clave: 'ejecucion', etiqueta: 'Ejecución', puntos: ejecucionEstado.puntos },
    ]),
    pasivosFinancierosAnuales: empalmarConRuptura([
      {
        clave: 'liquidacion',
        etiqueta: 'Liquidación',
        puntos: liquidacion.pasivosFinancieros.puntos,
      },
      { clave: 'ejecucion', etiqueta: 'Ejecución', puntos: ejecucionPasivos.puntos },
    ]),
    transferencias: {
      delEstado: ejecucionEstado,
      totalCorrientes: deDeEjecucion('ingresos-cap1-cap4', 'TOTAL TRANSFERENCIAS CORRIENTES'),
      capital: deDeEjecucion('ingresos', '7. TRANSFERENCIAS DE CAPITAL'),
      pasivosFinancieros: ejecucionPasivos,
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
    tribunal2023: datosPorId(tribunal2023),
    prestamosPorAnio: cargarSerie(tribunal2023, 'prestamos-concedidos-por-anio'),
    anexoPrestamos: {
      filas: filasAnexo,
      nombre: filasCsv(anexoPrestamosCsv)[0]?.['tabla'] ?? '',
      dato: Dato.parse({
        value: anexo.filas,
        unit: 'líneas del Anexo 10',
        period: String(anexo.origenes[0]?.ejercicio ?? 2023),
        source: anexo.source,
        fetchedAt: anexo.fetchedAt,
        confidence: anexo.confidence,
        ...(anexo.notes === undefined ? {} : { notes: anexo.notes }),
      }),
    },
    trlgss: datosPorId(validarArchivo(trlgssJson)),
    prestamosLeyes: datosPorId(validarArchivo(prestamosLeyesJson)),
    prestamosPlazo: datosPorId(validarArchivo(prestamosPlazoJson)),
  };
});

export { FICHEROS_HUCHA };
