/**
 * Datos de la página «Tipos de pensión». Único módulo que importa ficheros de /data para esa
 * página; `FICHEROS_TIPOS_DE_PENSION` los lista para el test de procedencia.
 */
import prestacionesJson from '../../../data/normativa/prestaciones.json';
import maximaJson from '../../../data/parametros/pension-maxima.json';
import minimaIncapacidadJson from '../../../data/parametros/pension-minima-incapacidad.json';
import minimaJubilacionJson from '../../../data/parametros/pension-minima-jubilacion.json';
import minimaOrfandadJson from '../../../data/parametros/pension-minima-orfandad-familiares.json';
import minimaViudedadJson from '../../../data/parametros/pension-minima-viudedad.json';
import pncImporteJson from '../../../data/parametros/pnc-importe-anual.json';
import pncReglasJson from '../../../data/parametros/pnc-reglas.json';
import supervivenciaJson from '../../../data/parametros/supervivencia-reglas.json';
import imserso from '../../../data/sistema/imserso-pnc-evolucion.csv?raw';
import imsersoJson from '../../../data/sistema/imserso-pnc-evolucion.json';
import perfilJson from '../../../data/sistema/imserso-pnc-perfil-2025.json';
import numeroJson from '../../../data/sistema/pensiones-vigor-numero.json';
import mediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import {
  ArchivoPrestaciones,
  Dato,
  type ArchivoDatos,
  type DatoConId,
  type Prestacion,
} from '../../engine/esquema-datos';
import {
  datoDeArchivo,
  filasCsv,
  numeroCsv,
  puntosDeDatos,
  type PuntoAnual,
} from '../../engine/series-historicas';
import {
  cargarSerie,
  datoDeTabla,
  memorizar,
  validarArchivo,
  validarTabla,
  type SerieCargada,
} from '../historico/cargar';
import {
  PAGAS_CONTRIBUTIVAS,
  etiquetaDeCuantia,
  importePorPaga,
  porcentajeDeImporte,
  situacionDeCuantia,
} from './cuantias';
import { FICHEROS_TIPOS_DE_PENSION } from './ficheros';
import {
  FICHAS,
  PERFIL_PNC,
  PNC_REGLA_MINIMA,
  PNC_REGLA_PAGAS,
  SERIE_AMBOS,
  SERIE_HOMBRES,
  SERIE_MUJERES,
  type ConfigFicha,
  type FicheroMinimas,
} from './ids-datos';

export { FICHEROS_TIPOS_DE_PENSION };

export interface FilaCuantia {
  readonly id: string;
  /** Rótulo literal de la fila del Anexo I. */
  readonly concepto: string;
  readonly situacion: string | null;
  readonly anual: number;
  /** Importe por paga con catorce pagas (cálculo derivado). */
  readonly porPaga: number;
}

export interface FilaPorcentaje {
  readonly id: string;
  readonly valor: number;
  readonly unidad: string;
  readonly cita: string;
  readonly ubicacion: string;
  readonly dato: Dato;
}

export interface FilaNumero {
  readonly etiqueta: string;
  readonly numero: number;
  /** Pensión media mensual; `null` si la fuente no la da para esa fila. */
  readonly media: number | null;
  readonly dato: Dato;
}

export interface CuantiaMaxima {
  readonly anio: number;
  readonly mensual: number;
  /** Importe anual con catorce pagas (cálculo derivado). */
  readonly anual: number;
  readonly dato: Dato;
}

export interface CuantiaPnc {
  readonly anio: number;
  readonly anual: number;
  readonly porPaga: number;
  readonly minimaPorcentaje: number;
  readonly minimaAnual: number;
  readonly minimaPorPaga: number;
  readonly datos: readonly Dato[];
}

export interface DatosFicha {
  readonly config: ConfigFicha;
  readonly prestacion: Prestacion;
  /** Norma de la que procede la ficha (BOE) para la línea de fuente. */
  readonly datoNorma: Dato;
  readonly modalidades: readonly Prestacion[];
  readonly cuantias: readonly FilaCuantia[];
  readonly datosCuantias: readonly Dato[];
  readonly maxima: CuantiaMaxima | null;
  readonly pnc: CuantiaPnc | null;
  readonly porcentajes: readonly FilaPorcentaje[];
  readonly enVigor: readonly FilaNumero[];
  /** Año de los datos de pensiones en vigor y mes de la nómina del IMSERSO, para los rótulos. */
  readonly fechaVigor: string;
}

export interface DatosTipos {
  readonly vigenteA: string;
  readonly anioCuantias: number;
  readonly fichas: readonly DatosFicha[];
}

/** Los datos de cuantía son numéricos; los de regla de texto se descartan. */
function esNumero(v: unknown): v is number {
  return typeof v === 'number';
}

function datoPrestacion(p: Prestacion, vigenteA: string): Dato {
  return Dato.parse({
    value: p.nombre,
    unit: 'prestación',
    period: vigenteA.slice(0, 4),
    source: p.source,
    fetchedAt: p.fetchedAt,
    confidence: p.confidence,
    ...(p.notas === undefined ? {} : { notes: p.notas }),
  });
}

function valorMasReciente(serie: SerieCargada): { anio: number; valor: number } {
  const ultimo = serie.puntos.at(-1);
  if (!ultimo) throw new Error(`La serie ${serie.serie.id} no tiene puntos`);
  return { anio: ultimo.anio, valor: ultimo.valor };
}

/** Datos validados con el esquema de /data y memorizados: se leen y validan una sola vez. */
export const datosTipos = memorizar((): DatosTipos => {
  const archivoPrestaciones = ArchivoPrestaciones.parse(prestacionesJson);
  const minimas: Readonly<Record<FicheroMinimas, ArchivoDatos>> = {
    jubilacion: validarArchivo(minimaJubilacionJson),
    incapacidad: validarArchivo(minimaIncapacidadJson),
    viudedad: validarArchivo(minimaViudedadJson),
    'orfandad-familiares': validarArchivo(minimaOrfandadJson),
  };
  const maxima = validarArchivo(maximaJson);
  const pncImporte = validarArchivo(pncImporteJson);
  const pncReglas = validarArchivo(pncReglasJson);
  const supervivencia = validarArchivo(supervivenciaJson);
  const numero = validarArchivo(numeroJson);
  const media = validarArchivo(mediaJson);
  const perfil = validarArchivo(perfilJson);
  const tablaImserso = validarTabla(imsersoJson);
  const filasImserso = filasCsv(imserso);

  // Año de las cuantías vigentes: el último con pensión máxima publicada.
  const puntosMaxima: PuntoAnual[] = puntosDeDatos(maxima);
  const ultimaMaxima = puntosMaxima.at(-1);
  if (!ultimaMaxima) throw new Error('Sin datos de pensión máxima');
  const anioCuantias = ultimaMaxima.anio;

  const prestacionPorId = (id: string): Prestacion => {
    const p = archivoPrestaciones.prestaciones.find((x) => x.id === id);
    if (!p) throw new Error(`Falta la prestación «${id}»`);
    return p;
  };

  const fichas = FICHAS.map((config): DatosFicha => {
    const prestacion = prestacionPorId(config.id);

    // Cuantías mínimas del año vigente.
    const cuantiasDato: DatoConId[] =
      config.minimas === null
        ? []
        : (minimas[config.minimas.fichero].data ?? []).filter(
            (d) =>
              d.period === String(anioCuantias) &&
              config.minimas?.patron.test(d.id) === true &&
              esNumero(d.value),
          );
    const cuantias = cuantiasDato.map((d): FilaCuantia => {
      const anual = d.value as number;
      return {
        id: d.id,
        concepto: etiquetaDeCuantia(d.quote ?? '') || d.id,
        situacion: situacionDeCuantia(d.notes),
        anual,
        porPaga: importePorPaga(anual),
      };
    });
    const datosCuantias =
      config.minimas === null
        ? []
        : cuantiasDato.map((d) => datoDeArchivo(minimas[config.minimas!.fichero], d.id));

    // Pensión máxima (común a las contributivas) o importe de la no contributiva.
    const maximaFicha: CuantiaMaxima | null =
      config.modalidad === 'contributiva'
        ? {
            anio: anioCuantias,
            mensual: ultimaMaxima.valor,
            anual: ultimaMaxima.valor * PAGAS_CONTRIBUTIVAS,
            dato: datoDeArchivo(maxima, String(anioCuantias)),
          }
        : null;

    let pnc: CuantiaPnc | null = null;
    if (config.modalidad === 'no-contributiva') {
      const puntos = puntosDeDatos(pncImporte);
      const ultimo = puntos.at(-1);
      const minima = pncReglas.data?.find((d) => d.id === PNC_REGLA_MINIMA);
      const pagas = pncReglas.data?.find((d) => d.id === PNC_REGLA_PAGAS);
      if (!ultimo || !minima || !esNumero(minima.value) || !pagas || !esNumero(pagas.value)) {
        throw new Error('Faltan los importes o las reglas de las pensiones no contributivas');
      }
      pnc = {
        anio: ultimo.anio,
        anual: ultimo.valor,
        porPaga: importePorPaga(ultimo.valor, pagas.value),
        minimaPorcentaje: minima.value,
        minimaAnual: porcentajeDeImporte(ultimo.valor, minima.value),
        minimaPorPaga: importePorPaga(porcentajeDeImporte(ultimo.valor, minima.value), pagas.value),
        datos: [
          datoDeArchivo(pncImporte, String(ultimo.anio)),
          datoDeArchivo(pncReglas, PNC_REGLA_MINIMA),
          datoDeArchivo(pncReglas, PNC_REGLA_PAGAS),
        ],
      };
    }

    // Porcentajes de la base reguladora (reglamento).
    const porcentajes = config.porcentajes.map((id): FilaPorcentaje => {
      const d = supervivencia.data?.find((x) => x.id === id);
      if (!d || !esNumero(d.value) || d.quote === undefined || d.location === undefined) {
        throw new Error(`Falta el porcentaje «${id}» con su cita`);
      }
      return {
        id,
        valor: d.value,
        unidad: d.unit,
        cita: d.quote,
        ubicacion: d.location,
        dato: datoDeArchivo(supervivencia, id),
      };
    });

    // Cuántas pensiones hay y su cuantía media.
    const enVigor: FilaNumero[] = [];
    let fechaVigor = '';
    if (config.clase !== null) {
      const filasSexo = [
        ['Ambos sexos', SERIE_AMBOS(config.clase)],
        ['Hombres', SERIE_HOMBRES(config.clase)],
        ['Mujeres', SERIE_MUJERES(config.clase)],
      ] as const;
      for (const [etiqueta, id] of filasSexo) {
        const n = cargarSerie(numero, id);
        const m = cargarSerie(media, id);
        const { anio, valor } = valorMasReciente(n);
        fechaVigor = String(anio);
        enVigor.push({
          etiqueta,
          numero: valor,
          media: valorMasReciente(m).valor,
          dato: n.dato,
        });
      }
    } else if (config.clasePnc !== null) {
      const meses = filasImserso.filter(
        (f) => f['tipo_periodo'] === 'mes' && f['clase'] === config.clasePnc,
      );
      const ultimoMes = meses
        .map((f) => f['periodo'] ?? '')
        .sort()
        .at(-1);
      const fila = meses.find((f) => f['periodo'] === ultimoMes);
      const n = numeroCsv(fila?.['pensiones']);
      if (!fila || n === null) throw new Error('Sin datos de la nómina de las PNC');
      fechaVigor = ultimoMes ?? '';
      enVigor.push({
        etiqueta: 'Pensiones en la nómina del mes',
        numero: n,
        media: numeroCsv(fila['pension_media_eur_mes']),
        dato: datoDeTabla(tablaImserso, (ultimoMes ?? '').slice(0, 4)),
      });
      const idPerfil = PERFIL_PNC[config.clasePnc];
      const p = perfil.data?.find((x) => x.id === idPerfil);
      if (p && esNumero(p.value)) {
        enVigor.push({
          etiqueta: 'Pensionistas en el perfil del pensionista',
          numero: p.value,
          media: null,
          dato: datoDeArchivo(perfil, idPerfil),
        });
      }
    }

    return {
      config,
      prestacion,
      datoNorma: datoPrestacion(prestacion, archivoPrestaciones.vigenteA),
      modalidades: config.modalidades.map(prestacionPorId),
      cuantias,
      datosCuantias,
      maxima: maximaFicha,
      pnc,
      porcentajes,
      enVigor,
      fechaVigor,
    };
  });

  return { vigenteA: archivoPrestaciones.vigenteA, anioCuantias, fichas };
});
