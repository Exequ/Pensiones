/**
 * Datos de la página «Proyecciones» (Fase 5-B1). Único módulo que importa ficheros de /data para esa
 * página; `FICHEROS_PROYECCIONES` los lista para el test de procedencia.
 *
 * Aquí se mantienen separados, siempre, lo observado y lo que sale de un modelo: las salidas de M1,
 * M2 y M3 son `TablaModelo` (naturaleza «proyección de modelo») y lo observado son series de /data.
 * Los datos observados que se agregan aquí (población por grupos de edad, cotizantes y bases del
 * Régimen General) llevan naturaleza «derivado» y su cálculo en las notas.
 */
import ageingJson from '../../../data/demografia/ageing-report-2024-espana.json';
import baseMediaCsv from '../../../data/macro/base-media-cotizacion-rg-mensual.csv?raw';
import baseMediaJson from '../../../data/macro/base-media-cotizacion-rg-mensual.json';
import ipcJson from '../../../data/parametros/ipc-indice-medio-anual.json';
import afiliacionJson from '../../../data/sistema/afiliacion-anual.json';
import m1BacktestJson from '../../../data/proyecciones/m1-backtest.json';
import m1ContrasteJson from '../../../data/proyecciones/m1-contraste-ine.json';
import m1EscenariosJson from '../../../data/proyecciones/m1-escenarios.json';
import m2CotizantesJson from '../../../data/proyecciones/m2-cotizantes.json';
import m2RelacionJson from '../../../data/proyecciones/m2-relacion-pensiones.json';
import m3PensionesJson from '../../../data/proyecciones/m3-pensiones.json';
import m3ResumenJson from '../../../data/proyecciones/m3-resumen.json';
import poblacionCsv from '../../../data/demografia/poblacion-edad-sexo.csv?raw';
import poblacionJson from '../../../data/demografia/poblacion-edad-sexo.json';
import proyeccionesIneJson from '../../../data/demografia/proyecciones-poblacion.json';
import numeroPensionesJson from '../../../data/sistema/pensiones-vigor-numero.json';
import relacionJson from '../../../data/sistema/relacion-afiliados-pensiones.json';
import {
  ArchivoProyeccion,
  Dato,
  type ArchivoProyeccion as ArchivoProyeccionTipo,
  type ArchivoTabla,
  type Dato as DatoTipo,
} from '../../engine/esquema-datos';
import { serieAEurosConstantes, serieIPCDesdeArchivo } from '../../engine/euros-constantes';
import { filasCsv, numeroCsv, type PuntoAnual } from '../../engine/series-historicas';
import { CLASES_PENSION, type ClasePension } from '../../engine/sistema-historico';
import {
  cargarSerie,
  memorizar,
  validarArchivo,
  validarTabla,
  type SerieCargada,
} from '../historico/cargar';
import { FICHEROS_PROYECCIONES } from './ficheros';

export type FilaModelo = Readonly<Record<string, string | number>>;

/** Una salida de modelo ya validada: el fichero, sus filas por columna y el `Dato` para `SourceLine`. */
export interface TablaModelo {
  readonly archivo: ArchivoProyeccionTipo;
  readonly filas: readonly FilaModelo[];
  readonly dato: DatoTipo;
}

/** Observado derivado de una agregación de /data, con el `Dato` que lo rotula como «derivado». */
export interface ObservadoDerivado {
  readonly puntos: readonly PuntoAnual[];
  readonly dato: DatoTipo;
}

export interface DatosProyecciones {
  readonly m1: {
    readonly contraste: TablaModelo;
    readonly backtest: TablaModelo;
    readonly escenarios: TablaModelo;
  };
  readonly m2: { readonly cotizantes: TablaModelo; readonly relacion: TablaModelo };
  readonly m3: { readonly pensiones: TablaModelo; readonly resumen: TablaModelo };
  readonly observado: {
    /** Población de 65 años o más, de 16 a 64 años y su cociente, a 1 de enero (INE, ECP). */
    readonly poblacion: {
      readonly mayores: ObservadoDerivado;
      readonly activos: ObservadoDerivado;
      readonly dependencia: ObservadoDerivado;
    };
    readonly pensionesTotal: SerieCargada;
    readonly pensionesPorClase: Readonly<Record<ClasePension, SerieCargada>>;
    readonly afiliadosDiciembre: SerieCargada;
    readonly relacionDiciembre: SerieCargada;
    /** Cotizantes del Régimen General (media anual de los doce meses) y base total, años completos. */
    readonly cotizantesRg: ObservadoDerivado;
    readonly baseTotalCorrientes: ObservadoDerivado;
    readonly baseTotalReales: ObservadoDerivado;
  };
  /** Proyección del INE con la que M1 se contrasta (fuente de las columnas «_ine»). */
  readonly datoProyeccionIne: DatoTipo;
  /** Ageing Report 2024: pensionistas, cotizantes y cociente (cotizantes por 100 pensionistas). */
  readonly ageing: {
    readonly pensionistas: SerieCargada;
    readonly cotizantes: SerieCargada;
    readonly apoyo: SerieCargada;
  };
}

/** El mismo `Dato` con otra naturaleza (p. ej., una proyección publicada por una institución). */
function conNaturaleza(dato: DatoTipo, naturaleza: DatoTipo['naturaleza']): DatoTipo {
  return { ...dato, naturaleza };
}

/** Serie de /data cuya naturaleza es la de una proyección publicada (Ageing Report, INE). */
function serieProyeccionPublicada(s: SerieCargada): SerieCargada {
  return { ...s, dato: conNaturaleza(s.dato, 'proyeccion-publicada') };
}

function periodoInicial(filas: readonly FilaModelo[]): string {
  const anios = filas.map((f) => f['anio']).filter((a): a is number => typeof a === 'number');
  return String(Math.min(...anios));
}

/** Convierte un fichero de /data/proyecciones en sus filas por columna y su `Dato`. */
export function cargarProyeccion(json: unknown): TablaModelo {
  const archivo = ArchivoProyeccion.parse(json);
  const filas = archivo.filas.map((fila) => {
    const registro: Record<string, string | number> = {};
    archivo.columnas.forEach((columna, j) => {
      registro[columna.id] = fila[j] as string | number;
    });
    return registro;
  });
  const dato = Dato.parse({
    value: filas.length,
    unit: 'filas de la tabla',
    period: periodoInicial(filas),
    source: archivo.source,
    fetchedAt: archivo.fetchedAt,
    confidence: archivo.confidence,
    naturaleza: archivo.naturaleza,
    notes: `Salida del modelo ${archivo.modelo.id.toUpperCase()}, ejecutada el ${archivo.origen.ejecutadoEl}; escenario: ${archivo.escenario.literal}.`,
  });
  return { archivo, filas, dato };
}

/** `Dato` de una agregación propia de una tabla de /data: naturaleza «derivado» y el cálculo en la nota. */
function datoDerivado(tabla: ArchivoTabla, periodo: string, calculo: string): DatoTipo {
  return Dato.parse({
    value: tabla.filas,
    unit: 'filas de la tabla',
    period: periodo,
    source: tabla.source,
    fetchedAt: tabla.fetchedAt,
    confidence: tabla.confidence,
    naturaleza: 'derivado',
    notes: calculo,
  });
}

function poblacionObservada(): DatosProyecciones['observado']['poblacion'] {
  const tabla = validarTabla(poblacionJson);
  const mayores = new Map<number, number>();
  const activos = new Map<number, number>();
  for (const f of filasCsv(poblacionCsv)) {
    if (f['sexo'] !== 'ambos') continue;
    const anio = Number(f['anio']);
    const edad = Number(f['edad']);
    const valor = numeroCsv(f['poblacion']);
    if (valor === null) continue;
    if (edad >= 65) mayores.set(anio, (mayores.get(anio) ?? 0) + valor);
    if (edad >= 16 && edad <= 64) activos.set(anio, (activos.get(anio) ?? 0) + valor);
  }
  const aPuntos = (m: ReadonlyMap<number, number>): PuntoAnual[] =>
    [...m.entries()].map(([anio, valor]) => ({ anio, valor })).sort((a, b) => a.anio - b.anio);
  const pMayores = aPuntos(mayores);
  const pActivos = aPuntos(activos);
  const dependencia = pMayores.flatMap((p) => {
    const a = activos.get(p.anio);
    return a === undefined || a === 0 ? [] : [{ anio: p.anio, valor: p.valor / a }];
  });
  const ultimo = String(pMayores.at(-1)?.anio ?? '');
  const base = 'Población residente a 1 de enero, ambos sexos; suma de las edades simples';
  return {
    mayores: {
      puntos: pMayores,
      dato: datoDerivado(tabla, ultimo, `${base} de 65 años o más.`),
    },
    activos: {
      puntos: pActivos,
      dato: datoDerivado(tabla, ultimo, `${base} de 16 a 64 años.`),
    },
    dependencia: {
      puntos: dependencia,
      dato: datoDerivado(
        tabla,
        ultimo,
        `${base}: población de 65 años o más dividida por la de 16 a 64 años.`,
      ),
    },
  };
}

/** Cotizantes y base total del Régimen General en los años con los doce meses publicados. */
function cotizantesObservados(anioBaseReal: number) {
  const tabla = validarTabla(baseMediaJson);
  const porAnio = new Map<number, { meses: number; cotizantes: number; base: number }>();
  for (const f of filasCsv(baseMediaCsv)) {
    if (f['sexo'] !== 'ambos' || f['tramo_edad'] !== 'total') continue;
    const cotizantes = numeroCsv(f['cotizantes']);
    const base = numeroCsv(f['base_total_eur']);
    if (cotizantes === null || base === null) continue;
    const anio = Number(f['anio']);
    const acum = porAnio.get(anio) ?? { meses: 0, cotizantes: 0, base: 0 };
    acum.meses += 1;
    acum.cotizantes += cotizantes;
    acum.base += base;
    porAnio.set(anio, acum);
  }
  const completos = [...porAnio.entries()]
    .filter(([, a]) => a.meses === 12)
    .sort((a, b) => a[0] - b[0]);
  const ultimo = String(completos.at(-1)?.[0] ?? '');
  const cotizantes: PuntoAnual[] = completos.map(([anio, a]) => ({
    anio,
    valor: a.cotizantes / a.meses,
  }));
  // Base total anual en millones de euros corrientes: suma de las doce bases mensuales.
  const baseCorriente: PuntoAnual[] = completos.map(([anio, a]) => ({
    anio,
    valor: a.base / 1_000_000,
  }));
  const ipc = validarArchivo(ipcJson);
  const reales = serieAEurosConstantes(
    baseCorriente.map((p) => ({ anio: p.anio, importe: p.valor })),
    anioBaseReal,
    serieIPCDesdeArchivo(ipc),
  ).map((p) => ({ anio: p.anio, valor: p.importe }));
  const nota =
    'Cotizantes y bases mensuales del Régimen General (ambos sexos, total de edades), solo en los años con los doce meses publicados.';
  return {
    cotizantesRg: {
      puntos: cotizantes,
      dato: datoDerivado(tabla, ultimo, `${nota} Cotizantes: media aritmética de los doce meses.`),
    },
    baseTotalCorrientes: {
      puntos: baseCorriente,
      dato: datoDerivado(
        tabla,
        ultimo,
        `${nota} Base total: suma de las bases mensuales, en millones de euros corrientes.`,
      ),
    },
    baseTotalReales: {
      puntos: reales,
      dato: datoDerivado(
        tabla,
        ultimo,
        `${nota} Base total en euros constantes del año base del modelo, con el IPC medio anual del INE.`,
      ),
    },
  };
}

export const datosProyecciones = memorizar((): DatosProyecciones => {
  const m1Contraste = cargarProyeccion(m1ContrasteJson);
  const m2Cotizantes = cargarProyeccion(m2CotizantesJson);
  const anioBaseReal = m2Cotizantes.archivo.modelo.anioBaseReal;
  if (anioBaseReal === undefined) throw new Error('M2 no indica el año base de los euros reales');

  const numero = validarArchivo(numeroPensionesJson);
  const ageing = validarArchivo(ageingJson);
  const proyeccionIne = validarTabla(proyeccionesIneJson);

  return {
    m1: {
      contraste: m1Contraste,
      backtest: cargarProyeccion(m1BacktestJson),
      escenarios: cargarProyeccion(m1EscenariosJson),
    },
    m2: { cotizantes: m2Cotizantes, relacion: cargarProyeccion(m2RelacionJson) },
    m3: { pensiones: cargarProyeccion(m3PensionesJson), resumen: cargarProyeccion(m3ResumenJson) },
    observado: {
      poblacion: poblacionObservada(),
      pensionesTotal: cargarSerie(numero, 'total-ambos'),
      pensionesPorClase: Object.fromEntries(
        CLASES_PENSION.map((c) => [c, cargarSerie(numero, `${c}-ambos`)]),
      ) as Record<ClasePension, SerieCargada>,
      afiliadosDiciembre: cargarSerie(validarArchivo(afiliacionJson), 'diciembre-total-sistema'),
      relacionDiciembre: cargarSerie(
        validarArchivo(relacionJson),
        'afiliados-diciembre-por-pension',
      ),
      ...cotizantesObservados(anioBaseReal),
    },
    datoProyeccionIne: conNaturaleza(
      datoDerivado(
        proyeccionIne,
        String(m1Contraste.filas[0]?.['anio'] ?? ''),
        'Proyecciones de población del INE (edición 2026-2076), escenario principal: son los valores «_ine» con los que M1 se contrasta.',
      ),
      'proyeccion-publicada',
    ),
    ageing: {
      pensionistas: serieProyeccionPublicada(cargarSerie(ageing, 'ageing-report-2024-ii-1-76')),
      cotizantes: serieProyeccionPublicada(cargarSerie(ageing, 'ageing-report-2024-ii-1-83')),
      apoyo: serieProyeccionPublicada(cargarSerie(ageing, 'ageing-report-2024-ii-1-84')),
    },
  };
});

export { FICHEROS_PROYECCIONES };
