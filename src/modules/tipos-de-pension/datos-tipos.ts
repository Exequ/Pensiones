/**
 * Datos de la página «Tipos de pensión». Único módulo que importa ficheros de /data para esa
 * página; `FICHEROS_TIPOS_DE_PENSION` los lista para el test de procedencia.
 */
import prestacionesJson from '../../../data/normativa/prestaciones.json';
import actualizacionBasesJson from '../../../data/parametros/actualizacion-bases.json';
import divisorJson from '../../../data/parametros/divisor-base-reguladora.json';
import incapacidadReglasJson from '../../../data/parametros/incapacidad-permanente-reglas.json';
import lagunasBrechaJson from '../../../data/parametros/lagunas-integracion-brecha-genero.json';
import maximaJson from '../../../data/parametros/pension-maxima.json';
import periodoCalculoJson from '../../../data/parametros/periodo-calculo-base-reguladora.json';
import minimaIncapacidadJson from '../../../data/parametros/pension-minima-incapacidad.json';
import minimaJubilacionJson from '../../../data/parametros/pension-minima-jubilacion.json';
import minimaOrfandadJson from '../../../data/parametros/pension-minima-orfandad-familiares.json';
import minimaViudedadJson from '../../../data/parametros/pension-minima-viudedad.json';
import pncImporteJson from '../../../data/parametros/pnc-importe-anual.json';
import pncReglasJson from '../../../data/parametros/pnc-reglas.json';
import supervivenciaJson from '../../../data/parametros/supervivencia-reglas.json';
import altasBajasCsv from '../../../data/sistema/altas-bajas-anual-clase-sexo.csv?raw';
import altasBajasJson from '../../../data/sistema/altas-bajas-anual-clase-sexo.json';
import complementosIndicadoresCsv from '../../../data/sistema/complementos-genero-indicadores.csv?raw';
import complementosIndicadoresJson from '../../../data/sistema/complementos-genero-indicadores.json';
import complementosTerritorioCsv from '../../../data/sistema/complementos-genero-territorio.csv?raw';
import complementosTerritorioJson from '../../../data/sistema/complementos-genero-territorio.json';
import imserso from '../../../data/sistema/imserso-pnc-evolucion.csv?raw';
import imsersoJson from '../../../data/sistema/imserso-pnc-evolucion.json';
import perfilJson from '../../../data/sistema/imserso-pnc-perfil-2025.json';
import numeroJson from '../../../data/sistema/pensiones-vigor-numero.json';
import mediaJson from '../../../data/sistema/pensiones-vigor-pension-media.json';
import type { DatoRotulado } from '../../components/fuentes';
import { brechasAnualesDA37, type BrechaAnual } from '../../engine/brecha-da37';
import { datoDeBloque as datoDeBloqueEngine, quitarCitas } from '../../engine/citas-normativas';
import {
  resolverFormula,
  type FormulaResuelta,
  type ResolverReferencia,
  type ValorReferencia,
} from '../../engine/formulas';
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
import { construirComplementos, type DatosComplementos } from './complementos';
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
  /** Situación a la que se aplica el porcentaje. La cita y la ubicación viajan en `dato`. */
  readonly rotulo: string;
  readonly dato: DatoRotulado;
}

/** Texto de una ficha sin las citas normativas (que van a los desplegables de fuentes). */
export interface TextosFicha {
  readonly aQuienCubre: string;
  readonly requisitos: readonly {
    readonly tipo: Prestacion['requisitos'][number]['tipo'];
    readonly descripcion: string;
  }[];
  readonly duracion: string;
  readonly compatibilidades: string;
  readonly formula: string;
  readonly limites: string;
}

/** Datos con las citas de cada bloque de la ficha, para su línea de fuentes. */
export interface FuentesFicha {
  readonly quien: readonly DatoRotulado[];
  /** Un dato por requisito (rótulo: su descripción), más la duración y las compatibilidades. */
  readonly requisitos: readonly DatoRotulado[];
  /** La fórmula y los límites. */
  readonly calculo: readonly DatoRotulado[];
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
  readonly textos: TextosFicha;
  readonly fuentes: FuentesFicha;
  /** Fórmula estructurada de la cuantía, si la norma da una fórmula cerrada (Fase R5). */
  readonly formula: FormulaResuelta | null;
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
  /** Complementos por brecha de género y por maternidad en vigor (Fase 5-A4). */
  readonly complementos: DatosComplementos;
  /**
   * Brecha de la DA 37.ª.1 TRLGSS calculada con la pensión media de las altas iniciales de jubilación
   * del último año completo (Ajustes actuariales 4), con el umbral del 5 % de la ley.
   */
  readonly brechaDA37: {
    readonly ultima: BrechaAnual;
    readonly datoAltas: Dato;
    /** Umbral en fracción (0,05). */
    readonly umbral: number;
    readonly datoUmbral: Dato;
  };
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

/** Parámetros a los que apuntan las cifras de las fórmulas estructuradas (`data/parametros`). */
const PARAMETROS_FORMULAS: Readonly<Record<string, ArchivoDatos>> = {
  'actualizacion-bases': validarArchivo(actualizacionBasesJson),
  'divisor-base-reguladora': validarArchivo(divisorJson),
  'incapacidad-permanente-reglas': validarArchivo(incapacidadReglasJson),
  'periodo-calculo-base-reguladora': validarArchivo(periodoCalculoJson),
};

/** Dato numérico de un parámetro: valor, unidad y periodo; `undefined` si no existe o no es numérico. */
const resolverReferencia: ResolverReferencia = ({ fichero, id }): ValorReferencia | undefined => {
  const dato = PARAMETROS_FORMULAS[fichero]?.data?.find((d) => d.id === id);
  if (!dato || !esNumero(dato.value)) return undefined;
  return { valor: dato.value, unidad: dato.unit, periodo: dato.period };
};

/** Dato de un bloque de la ficha: la fuente de la prestación y las citas del bloque como ubicación. */
function datoDeBloque(
  p: Prestacion,
  vigenteA: string,
  rotulo: string,
  texto: string,
  declarada?: string,
): DatoRotulado {
  return datoDeBloqueEngine(p, vigenteA.slice(0, 4), rotulo, texto, declarada);
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
    const ficheroMinimas = config.minimas?.fichero;
    const datosCuantias =
      ficheroMinimas === undefined
        ? []
        : cuantiasDato.map((d) => datoDeArchivo(minimas[ficheroMinimas], d.id));

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

    // Porcentajes de la base reguladora (reglamento). La cita y la ubicación van en el dato.
    const porcentajes = config.porcentajes.map(({ id, rotulo }): FilaPorcentaje => {
      const d = supervivencia.data?.find((x) => x.id === id);
      if (!d || !esNumero(d.value) || d.quote === undefined || d.location === undefined) {
        throw new Error(`Falta el porcentaje «${id}» con su cita`);
      }
      return {
        id,
        valor: d.value,
        unidad: d.unit,
        rotulo,
        dato: { ...datoDeArchivo(supervivencia, id), rotulo },
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

    // Textos sin citas y datos con las citas de cada bloque (Fase R5).
    const vigenteA = archivoPrestaciones.vigenteA;
    const textos: TextosFicha = {
      aQuienCubre: quitarCitas(prestacion.aQuienCubre),
      requisitos: prestacion.requisitos.map((r) => ({
        tipo: r.tipo,
        descripcion: quitarCitas(r.descripcion),
      })),
      duracion: quitarCitas(prestacion.duracion),
      compatibilidades: quitarCitas(prestacion.compatibilidades),
      formula: quitarCitas(prestacion.calculo.formula),
      limites: quitarCitas(prestacion.limites),
    };
    const fuentes: FuentesFicha = {
      quien: [datoDeBloque(prestacion, vigenteA, 'A quién cubre', prestacion.aQuienCubre)],
      requisitos: [
        ...prestacion.requisitos.map((r, i) =>
          datoDeBloque(
            prestacion,
            vigenteA,
            textos.requisitos[i]?.descripcion ?? r.descripcion,
            r.descripcion,
            r.articulo,
          ),
        ),
        datoDeBloque(prestacion, vigenteA, 'Duración', prestacion.duracion),
        datoDeBloque(prestacion, vigenteA, 'Compatibilidades', prestacion.compatibilidades),
      ],
      calculo: [
        datoDeBloque(
          prestacion,
          vigenteA,
          'Fórmula de la cuantía',
          prestacion.calculo.formula,
          prestacion.calculo.articulos,
        ),
        datoDeBloque(prestacion, vigenteA, 'Límites', prestacion.limites),
      ],
    };
    const formulaEstructurada = prestacion.calculo.formulaEstructurada;
    const formula =
      formulaEstructurada === undefined
        ? null
        : resolverFormula(formulaEstructurada, resolverReferencia, {
            anioVigente: anioCuantias,
            resolverSerie: (fichero, id) => resolverReferencia({ fichero, id }),
          });

    return {
      config,
      prestacion,
      datoNorma: datoPrestacion(prestacion, archivoPrestaciones.vigenteA),
      textos,
      fuentes,
      formula,
      cuantias,
      datosCuantias,
      maxima: maximaFicha,
      pnc,
      porcentajes,
      enVigor,
      fechaVigor,
    };
  });

  const complementos = construirComplementos(
    complementosTerritorioCsv,
    complementosTerritorioJson,
    complementosIndicadoresCsv,
    complementosIndicadoresJson,
  );

  const tablaAltas = validarTabla(altasBajasJson);
  const brechas = brechasAnualesDA37(
    filasCsv(altasBajasCsv).map((f) => ({
      anio: Number(f['anio']),
      movimiento: f['movimiento'] ?? '',
      clase: f['clase'] ?? '',
      sexo: f['sexo'] ?? '',
      pensionMedia: numeroCsv(f['pension_media_eur_mes']),
    })),
  );
  const ultima = brechas.at(-1);
  if (!ultima) throw new Error('Sin altas iniciales de jubilación por sexo');
  const archivoUmbral = validarArchivo(lagunasBrechaJson);
  const idUmbral = (archivoUmbral.data ?? [])
    .map((d) => d.id)
    .filter((id) => id.endsWith('-umbral-brecha-pct'))
    .sort()
    .at(-1);
  if (idUmbral === undefined) throw new Error('Sin umbral de la brecha de género');
  const datoUmbral = datoDeArchivo(archivoUmbral, idUmbral);
  if (typeof datoUmbral.value !== 'number') throw new Error('Umbral de la brecha no numérico');
  const brechaDA37 = {
    ultima,
    datoAltas: datoDeTabla(tablaAltas, String(ultima.anio)),
    umbral: datoUmbral.value / 100,
    datoUmbral,
  };

  return {
    vigenteA: archivoPrestaciones.vigenteA,
    anioCuantias,
    fichas,
    complementos,
    brechaDA37,
  };
});
