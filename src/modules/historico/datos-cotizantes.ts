/**
 * Datos de la página «Cotizantes y pensionistas». Único módulo que importa ficheros de /data para
 * esa página; `FICHEROS_COTIZANTES` los lista para el test de procedencia.
 */
import afiliacionAnualJson from '../../../data/sistema/afiliacion-anual.json';
import afiliadosEdadCsv from '../../../data/sistema/afiliados-sexo-edad.csv?raw';
import afiliadosEdadJson from '../../../data/sistema/afiliados-sexo-edad.json';
import altasBajasCsv from '../../../data/sistema/altas-bajas-anual-clase-sexo.csv?raw';
import altasBajasJson from '../../../data/sistema/altas-bajas-anual-clase-sexo.json';
import edadMediaAltasJson from '../../../data/sistema/edad-media-altas-jubilacion.json';
import ipcJson from '../../../data/parametros/ipc-indice-medio-anual.json';
import ipcMensualJson from '../../../data/parametros/ipc-indice-mensual.json';
import pensionMediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import pensionesEdadCsv from '../../../data/sistema/pensiones-vigor-edad-clase-sexo.csv?raw';
import pensionesEdadJson from '../../../data/sistema/pensiones-vigor-edad-clase-sexo.json';
import numeroPensionesJson from '../../../data/sistema/pensiones-vigor-numero.json';
import pensionistasJson from '../../../data/sistema/pensionistas-pensiones-historico.json';
import relacionAlt1Json from '../../../data/sistema/relacion-afiliados-pensiones-alternativa-1.json';
import relacionJson from '../../../data/sistema/relacion-afiliados-pensiones.json';
import {
  serieIPCDesdeArchivo,
  serieIPCDiciembreDesdeArchivo,
  type SerieIPC,
} from '../../engine/euros-constantes';
import type { Dato } from '../../engine/esquema-datos';
import { filasCsv, numeroCsv } from '../../engine/series-historicas';
import { CLASES_PENSION, type ClasePension } from '../../engine/sistema-historico';
import { FICHEROS_COTIZANTES } from './ficheros';
import {
  cargarSerie,
  datoDeTabla,
  memorizar,
  validarArchivo,
  validarTabla,
  type SerieCargada,
} from './cargar';

export type Sexo = 'ambos' | 'hombres' | 'mujeres';

export interface FilaEdad {
  readonly grupoEdad: string;
  readonly clase: string;
  readonly sexo: string;
  readonly numero: number | null;
  readonly pensionMedia: number | null;
}

export interface FilaAfiliadosEdad {
  readonly anio: number;
  readonly sexo: string;
  readonly tramo: string;
  readonly afiliados: number | null;
}

export interface FilaAltaBaja {
  readonly anio: number;
  readonly movimiento: string;
  readonly clase: string;
  readonly sexo: string;
  readonly numero: number | null;
  readonly pensionMedia: number | null;
}

export interface DatosCotizantes {
  readonly afiliados: {
    readonly diciembreTotal: SerieCargada;
    readonly diciembreGeneral: SerieCargada;
    readonly diciembreAutonomos: SerieCargada;
    readonly mediaAnualTotal: SerieCargada;
  };
  readonly pensionistas: SerieCargada;
  readonly pensiones: SerieCargada;
  readonly numeroPorClase: Readonly<Record<ClasePension, SerieCargada>>;
  readonly numeroTotal: SerieCargada;
  /** Pensiones en vigor por clase y sexo (para el cuadro de la situación actual). */
  readonly numeroPorClaseSexo: Readonly<Record<ClasePension, Readonly<Record<Sexo, SerieCargada>>>>;
  readonly pensionMediaPorClase: Readonly<Record<ClasePension, SerieCargada>>;
  readonly pensionMediaTotal: SerieCargada;
  readonly pensionMediaPorClaseSexo: Readonly<
    Record<ClasePension, Readonly<Record<Sexo, SerieCargada>>>
  >;
  readonly ipc: SerieIPC;
  readonly datoIpc: Dato;
  /** IPC de diciembre de cada año (índice mensual del INE), para deflactar valores a 1 de diciembre. */
  readonly ipcDiciembre: SerieIPC;
  readonly datoIpcDiciembre: Dato;
  readonly relacion: {
    readonly porPensionDiciembre: SerieCargada;
    readonly porPensionMediaAnual: SerieCargada;
    readonly porPensionistaDiciembre: SerieCargada;
    readonly porPensionistaMediaAnual: SerieCargada;
    readonly porPensionUltimoDia: SerieCargada;
    readonly porPensionistaUltimoDia: SerieCargada;
  };
  readonly edad: {
    readonly mes: string;
    readonly filas: readonly FilaEdad[];
    readonly dato: Dato;
  };
  readonly afiliadosEdad: { readonly filas: readonly FilaAfiliadosEdad[]; readonly dato: Dato };
  readonly altasBajas: { readonly filas: readonly FilaAltaBaja[]; readonly dato: Dato };
  readonly edadMediaAltas: SerieCargada;
}

function porClase(
  archivo: ReturnType<typeof validarArchivo>,
  sufijo: Sexo,
): Record<ClasePension, SerieCargada> {
  return Object.fromEntries(
    CLASES_PENSION.map((c) => [c, cargarSerie(archivo, `${c}-${sufijo}`)]),
  ) as Record<ClasePension, SerieCargada>;
}

function porClaseYSexo(
  archivo: ReturnType<typeof validarArchivo>,
): Record<ClasePension, Record<Sexo, SerieCargada>> {
  return Object.fromEntries(
    CLASES_PENSION.map((c) => [
      c,
      {
        ambos: cargarSerie(archivo, `${c}-ambos`),
        hombres: cargarSerie(archivo, `${c}-hombres`),
        mujeres: cargarSerie(archivo, `${c}-mujeres`),
      },
    ]),
  ) as Record<ClasePension, Record<Sexo, SerieCargada>>;
}

export const datosCotizantes = memorizar((): DatosCotizantes => {
  const afiliacion = validarArchivo(afiliacionAnualJson);
  const hist = validarArchivo(pensionistasJson);
  const numero = validarArchivo(numeroPensionesJson);
  const media = validarArchivo(pensionMediaJson);
  const relacion = validarArchivo(relacionJson);
  const alt1 = validarArchivo(relacionAlt1Json);
  const ipc = validarArchivo(ipcJson);
  const ipcDato = ipc.data?.at(-1);
  if (!ipcDato) throw new Error('El fichero del IPC no tiene datos');
  const ipcMensual = validarArchivo(ipcMensualJson);
  const ipcDiciembre = serieIPCDiciembreDesdeArchivo(ipcMensual);
  const ultimoDiciembre = ipcDiciembre.puntos.at(-1);
  const ipcDatoDiciembre = ipcMensual.data?.find((d) => d.id === `${ultimoDiciembre?.anio}-12`);
  if (!ipcDatoDiciembre) throw new Error('El IPC mensual no tiene diciembre');

  const tablaEdad = validarTabla(pensionesEdadJson);
  const tablaAfEdad = validarTabla(afiliadosEdadJson);
  const tablaAltas = validarTabla(altasBajasJson);

  const filasEdad: FilaEdad[] = filasCsv(pensionesEdadCsv).map((f) => ({
    grupoEdad: f['grupo_edad'] ?? '',
    clase: f['clase'] ?? '',
    sexo: f['sexo'] ?? '',
    numero: numeroCsv(f['numero']),
    pensionMedia: numeroCsv(f['pension_media_eur_mes']),
  }));
  const mes = filasCsv(pensionesEdadCsv)[0]?.['mes'] ?? '';
  const filasAf: FilaAfiliadosEdad[] = filasCsv(afiliadosEdadCsv).map((f) => ({
    anio: Number(f['anio']),
    sexo: f['sexo'] ?? '',
    tramo: f['tramo_edad'] ?? '',
    afiliados: numeroCsv(f['afiliados_diciembre']),
  }));
  const filasAltas: FilaAltaBaja[] = filasCsv(altasBajasCsv).map((f) => ({
    anio: Number(f['anio']),
    movimiento: f['movimiento'] ?? '',
    clase: f['clase'] ?? '',
    sexo: f['sexo'] ?? '',
    numero: numeroCsv(f['numero']),
    pensionMedia: numeroCsv(f['pension_media_eur_mes']),
  }));
  const ultimoAnioAf = Math.max(...filasAf.map((f) => f.anio));
  const ultimoAnioAltas = Math.max(...filasAltas.map((f) => f.anio));

  return {
    afiliados: {
      diciembreTotal: cargarSerie(afiliacion, 'diciembre-total-sistema'),
      diciembreGeneral: cargarSerie(afiliacion, 'diciembre-general'),
      diciembreAutonomos: cargarSerie(afiliacion, 'diciembre-autonomos'),
      mediaAnualTotal: cargarSerie(afiliacion, 'media-anual-total-sistema'),
    },
    pensionistas: cargarSerie(hist, 'pensionistas'),
    pensiones: cargarSerie(hist, 'pensiones'),
    numeroPorClase: porClase(numero, 'ambos'),
    numeroTotal: cargarSerie(numero, 'total-ambos'),
    numeroPorClaseSexo: porClaseYSexo(numero),
    pensionMediaPorClase: porClase(media, 'ambos'),
    pensionMediaTotal: cargarSerie(media, 'total-ambos'),
    pensionMediaPorClaseSexo: porClaseYSexo(media),
    ipc: serieIPCDesdeArchivo(ipc),
    datoIpc: (() => {
      const { id: _id, ...sinId } = ipcDato;
      return sinId;
    })(),
    ipcDiciembre,
    datoIpcDiciembre: (() => {
      const { id: _id, ...sinId } = ipcDatoDiciembre;
      return sinId;
    })(),
    relacion: {
      porPensionDiciembre: cargarSerie(relacion, 'afiliados-diciembre-por-pension'),
      porPensionMediaAnual: cargarSerie(relacion, 'afiliados-media-anual-por-pension'),
      porPensionistaDiciembre: cargarSerie(relacion, 'afiliados-diciembre-por-pensionista'),
      porPensionistaMediaAnual: cargarSerie(relacion, 'afiliados-media-anual-por-pensionista'),
      porPensionUltimoDia: cargarSerie(alt1, 'afiliados-por-pension-alternativa-1'),
      porPensionistaUltimoDia: cargarSerie(alt1, 'afiliados-por-pensionista-alternativa-1'),
    },
    edad: { mes, filas: filasEdad, dato: datoDeTabla(tablaEdad, mes.slice(0, 4)) },
    afiliadosEdad: {
      filas: filasAf,
      dato: datoDeTabla(tablaAfEdad, String(ultimoAnioAf)),
    },
    altasBajas: {
      filas: filasAltas,
      dato: datoDeTabla(tablaAltas, String(ultimoAnioAltas)),
    },
    edadMediaAltas: cargarSerie(validarArchivo(edadMediaAltasJson), 'edad-media-altas-jubilacion'),
  };
});

export { FICHEROS_COTIZANTES };
