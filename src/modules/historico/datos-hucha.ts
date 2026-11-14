/**
 * Datos de la página «Hucha». Único módulo que importa ficheros de /data para esa página;
 * `FICHEROS_HUCHA` los lista para el test de procedencia. La ejecución del presupuesto y las
 * pensiones en vigor se comparten con las otras páginas.
 */
import cronologiaJson from '../../../data/normativa/cronologia.json';
import pibJson from '../../../data/macro/pib-ine.json';
import desembolsoJson from '../../../data/parametros/fondo-reserva-desembolso-maximo.json';
import meiDestinoJson from '../../../data/parametros/mei-destino.json';
import fondoCsv from '../../../data/sistema/fondo-reserva-anual.csv?raw';
import fondoTablaJson from '../../../data/sistema/fondo-reserva-anual.json';
import fondoSeriesJson from '../../../data/sistema/fondo-reserva-series.json';
import pensionMediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import numeroPensionesJson from '../../../data/sistema/pensiones-vigor-numero.json';
import { ArchivoCronologia, type Dato, type Norma } from '../../engine/esquema-datos';
import {
  datoDeArchivo,
  filasCsv,
  numeroCsv,
  puntosDeDatos,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { CLASES_PENSION, type ClasePension } from '../../engine/sistema-historico';
import { FICHEROS_HUCHA } from './ficheros';
import {
  cargarSerie,
  datoDeTabla,
  memorizar,
  validarArchivo,
  validarTabla,
  type SerieCargada,
} from './cargar';
import { datosFinanciacion } from './datos-financiacion';

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
  };
});

export { FICHEROS_HUCHA };
