/**
 * Datos de la página «Mitos y realidades». Único módulo de la página que importa ficheros de /data
 * (`FICHEROS_MITOS` los lista para el test de procedencia); además reutiliza los cargadores de las
 * páginas «Hucha», «Financiación y déficit», «Cotizantes y pensionistas» y «Otros sistemas».
 * Cada fichero se valida con el esquema de /data al cargarlo. Los cálculos derivados están en
 * `src/engine/mitos.ts` y en las utilidades de series ya existentes.
 */
import ageingJson from '../../../data/demografia/ageing-report-2024-espana.json';
import europopJson from '../../../data/demografia/europop2025-indicadores.json';
import fecundidadJson from '../../../data/demografia/fecundidad-indicadores.json';
import migracionesJson from '../../../data/demografia/migraciones-exterior-anual.json';
import hipotesisJson from '../../../data/demografia/proyecciones-hipotesis.json';
import eurostatJson from '../../../data/internacional/eurostat-espana.json';
import ocdeJson from '../../../data/internacional/ocde-espana.json';
import catalogoJson from '../../../data/mitos/afirmaciones-circulantes.json';
import carreraJson from '../../../data/parametros/carrera-jubilacion-65.json';
import edadOrdinariaJson from '../../../data/parametros/edad-ordinaria-jubilacion.json';
import ipcDiciembreJson from '../../../data/parametros/ipc-variacion-diciembre.json';
import ipcMediaJson from '../../../data/parametros/ipc-variacion-media-anual.json';
import meiReglasJson from '../../../data/parametros/mei-reglas.json';
import minimaJson from '../../../data/parametros/pension-minima-jubilacion.json';
import pncJson from '../../../data/parametros/pnc-importe-anual.json';
import revalorizacionJson from '../../../data/parametros/revalorizacion-general.json';
import regla2011Json from '../../../data/normativa/revalorizacion-2011-regla.json';
import reglaJson from '../../../data/parametros/revalorizacion-regla.json';
import { ArchivoMitos, type ArchivoDatos, type Dato } from '../../engine/esquema-datos';
import {
  aniosSinDato,
  diferenciasEntreMedidas,
  filasRevalorizacion,
  mediaPeriodo,
  mesesAAnios,
  proporcion,
  razonAPorcentaje,
  tramosDeAnios,
  type DiferenciaEntreMedidas,
  type FilaRevalorizacion,
} from '../../engine/mitos';
import {
  datoDeArchivo,
  diferencia,
  extremos,
  maximo,
  puntosDeDatos,
  suma,
  type PuntoAnual,
} from '../../engine/series-historicas';
import { gastoAproximadoPensiones, mesesDeGasto } from '../../engine/sistema-historico';
import { cargarSerie, memorizar, validarArchivo } from '../historico/cargar';
import { datosCotizantes } from '../historico/datos-cotizantes';
import { datosFinanciacion } from '../historico/datos-financiacion';
import { datosHucha } from '../historico/datos-hucha';
import { serieEurostat } from '../otros-sistemas/consultas';
import { cifraSuelta, datosSistemas } from '../otros-sistemas/datos-sistemas';
import { FICHEROS_MITOS } from './ficheros';
import {
  AGEING,
  CONTRASTE_MITOS,
  COCIENTES_ALTAS,
  COCIENTES_EN_VIGOR,
  DA2,
  DEMOGRAFIA,
  EUROSTAT,
  IMPROPIOS,
  OCDE,
  PENSIONES_MINIMAS,
  PRESTAMOS,
  REGLA_REVALORIZACION,
  REPOSICION,
  SUPUESTOS_REPOSICION,
} from './ids-datos';

export { FICHEROS_MITOS };

/** Catálogo de afirmaciones validado con el esquema de /data. */
export const catalogo = memorizar(() => ArchivoMitos.parse(catalogoJson));

/** Serie con su `Dato` de fuente, o varias fuentes cuando cada año procede de una norma distinta. */
export interface SerieConFuentes {
  readonly puntos: readonly PuntoAnual[];
  readonly datos: readonly Dato[];
}

/** Dato suelto (`data`) de un fichero, con su valor, unidad y `Dato` de fuente. */
export interface CifraSuelta {
  readonly id: string;
  readonly valor: number | string;
  readonly unidad: string;
  readonly periodo: string;
  readonly notas: string;
  readonly cita: string;
  /** Artículo o apartado de la norma (campo `location` del dato). */
  readonly ubicacion: string;
  readonly dato: Dato;
}

function cifra(archivo: ArchivoDatos, id: string): CifraSuelta {
  const d = archivo.data?.find((x) => x.id === id);
  if (!d) throw new Error(`Falta el dato «${id}» en «${archivo.id}»`);
  return {
    id,
    valor: d.value,
    unidad: d.unit,
    periodo: d.period,
    notas: d.notes ?? '',
    cita: d.quote ?? '',
    ubicacion: d.location ?? '',
    dato: datoDeArchivo(archivo, id),
  };
}

/** Serie anual construida con los datos sueltos de un fichero (un dato por año). */
function serieDeDatos(archivo: ArchivoDatos, filtro?: (id: string) => boolean): SerieConFuentes {
  const elegidos = (archivo.data ?? []).filter((d) => filtro === undefined || filtro(d.id));
  const puntos = puntosDeDatos({ ...archivo, data: elegidos });
  return { puntos, datos: elegidos.map((d) => datoDeArchivo(archivo, d.id)) };
}

/** Años de una cita de la norma («periodo 2022-2050»): se leen del dato, no se escriben a mano. */
function periodoDeLaCita(cita: string): { desde: number; hasta: number } {
  const m = /periodo (\d{4})-(\d{4})/.exec(cita);
  if (!m?.[1] || !m[2]) throw new Error('La cita de la DA 2.ª no indica el periodo de comparación');
  return { desde: Number(m[1]), hasta: Number(m[2]) };
}

/** Último dato suelto de un fichero por año (el de mayor periodo). */
function ultimaCifra(archivo: ArchivoDatos): CifraSuelta {
  const ultimo = [...(archivo.data ?? [])].sort((a, b) => a.period.localeCompare(b.period)).at(-1);
  if (!ultimo) throw new Error(`«${archivo.id}» no tiene datos`);
  return cifra(archivo, ultimo.id);
}

export const datosMitos = memorizar(() => {
  const hucha = datosHucha();
  const financiacion = datosFinanciacion();
  const cotizantes = datosCotizantes();
  const sistemas = datosSistemas();

  const ageing = validarArchivo(ageingJson);
  const europop = validarArchivo(europopJson);
  const fecundidad = validarArchivo(fecundidadJson);
  const migraciones = validarArchivo(migracionesJson);
  const hipotesis = validarArchivo(hipotesisJson);
  const eurostat = validarArchivo(eurostatJson);
  const ocde = validarArchivo(ocdeJson);
  const carrera = validarArchivo(carreraJson);
  const edadOrdinaria = validarArchivo(edadOrdinariaJson);
  const meiReglas = validarArchivo(meiReglasJson);

  // 1. Hucha: valor, disposiciones y meses de gasto (las mismas referencias que la página «Hucha»).
  const valorFondo = hucha.valor;
  const disposiciones: PuntoAnual[] = hucha.flujos.filas.flatMap((f) =>
    f.disposiciones === null ? [] : [{ anio: f.anio, valor: f.disposiciones }],
  );
  const claves = ['jubilacion', 'viudedad', 'incapacidad', 'orfandad', 'favor-familiares'] as const;
  const puntosPorClase = (r: typeof hucha.numeroPorClase) =>
    Object.fromEntries(claves.map((c) => [c, r[c].puntos])) as Record<
      (typeof claves)[number],
      readonly PuntoAnual[]
    >;
  const gastoConComplemento = suma(hucha.gastoEjecucion.puntos, hucha.complementoMinimos.puntos);
  const gastoCatorcePagas = gastoAproximadoPensiones(
    puntosPorClase(hucha.numeroPorClase),
    puntosPorClase(hucha.pensionMediaPorClase),
  );
  const mesesLiquidacion = mesesDeGasto(valorFondo.puntos, hucha.liquidacion.gastoPensiones.puntos);
  const mesesEjecucion = mesesDeGasto(valorFondo.puntos, gastoConComplemento);
  const mesesCatorcePagas = mesesDeGasto(valorFondo.puntos, gastoCatorcePagas);

  // 2. Financiación: cotizaciones y transferencias sobre los ingresos no financieros.
  const derechos = financiacion.presupuesto.derechosNoFinancieros.puntos;
  const cotizaciones = financiacion.ejecucion.cotizaciones.puntos;
  const transferencias = financiacion.presupuesto.transferenciasEstado.puntos;
  const prevision = (id: string) => {
    const p = financiacion.previsiones.find((x) => x.id === id);
    if (!p) throw new Error(`Falta la previsión «${id}»`);
    return p;
  };

  // 5. Saldo: tres medidas y diferencias.
  const desdeSaldo = financiacion.presupuesto.saldoNoFinanciero.puntos[0]?.anio ?? 0;
  const recortarDesde = (puntos: readonly PuntoAnual[]) =>
    puntos.filter((p) => p.anio >= desdeSaldo);
  const medidasSaldo = [
    {
      etiqueta: 'presupuestario no financiero',
      puntos: financiacion.presupuesto.saldoNoFinanciero.puntos,
    },
    { etiqueta: 'presupuestario total', puntos: financiacion.presupuesto.saldoTotal.puntos },
    { etiqueta: 'SEC', puntos: recortarDesde(financiacion.saldoSec.millones.puntos) },
  ];
  const diferenciasSaldo: DiferenciaEntreMedidas[] = diferenciasEntreMedidas(medidasSaldo);

  // 6. Edad: legal (meses → años), altas, salida efectiva de la OCDE.
  const edadLegalMeses = serieDeDatos(edadOrdinaria);
  const ocdeSalidaHombres = cargarSerie(ocde, OCDE.edadSalidaHombres);
  const ocdeSalidaMujeres = cargarSerie(ocde, OCDE.edadSalidaMujeres);

  // 7. Sostenibilidad: gasto del Ageing Report, balance, OCDE y criterio de la DA 2.ª.
  const gastoAgeing = cargarSerie(ageing, AGEING.gastoPensiones);
  const tope = cifra(meiReglas, DA2.tope);
  const periodoCriterio = periodoDeLaCita(tope.cita);

  // 11. Revalorización: huecos calculados, no escritos.
  const revalorizacion = serieDeDatos(validarArchivo(revalorizacionJson));
  const ipcMedia = serieDeDatos(validarArchivo(ipcMediaJson));
  const ipcDiciembre = serieDeDatos(validarArchivo(ipcDiciembreJson));
  const primerAnioRevalorizacion = revalorizacion.puntos[0]?.anio ?? 0;
  const ultimoAnioIpc = Math.max(
    ipcMedia.puntos.at(-1)?.anio ?? 0,
    ipcDiciembre.puntos.at(-1)?.anio ?? 0,
  );
  const ultimoAnioRevalorizacion = revalorizacion.puntos.at(-1)?.anio ?? 0;
  const filasIpc: FilaRevalorizacion[] = filasRevalorizacion(
    revalorizacion.puntos,
    ipcMedia.puntos,
    ipcDiciembre.puntos,
    primerAnioRevalorizacion,
    Math.max(ultimoAnioIpc, ultimoAnioRevalorizacion),
  );
  const regla = validarArchivo(reglaJson);
  const regla2011Archivo = validarArchivo(regla2011Json);
  const excluidas2011 = cifra(regla2011Archivo, 'porcentaje-excluidas-2011');
  const regla2011 = {
    anio: Number(excluidas2011.periodo),
    suspension: cifra(regla2011Archivo, 'suspension-contributivas-2011'),
    actualizacion: cifra(regla2011Archivo, 'suspension-actualizacion-ipc-2011'),
    excluidas: excluidas2011,
    aCuenta: cifra(regla2011Archivo, 'a-cuenta-del-ipc-2011'),
    resto: cifra(regla2011Archivo, 'resto-mantienen-cuantia-2011'),
    pagoUnico: cifra(regla2011Archivo, 'pago-unico-referencia-2010'),
  };

  // 8. Pensión mínima y PNC (euros al año).
  const minimaJubilacion = serieDeDatos(validarArchivo(minimaJson), (id) =>
    id.endsWith(PENSIONES_MINIMAS.sufijoJubilacion),
  );
  const pnc = serieDeDatos(validarArchivo(pncJson));

  // 10. Gasto: Eurostat (España y Unión Europea), OCDE y propio.
  const filtroGasto = { indicador: EUROSTAT.gastoVejezSupervivencia, unidad: EUROSTAT.unidadPib };
  const eurostatPais = (pais: string): readonly PuntoAnual[] =>
    serieEurostat(sistemas.eurostat.observaciones, filtroGasto, pais).map((p) => ({
      anio: p.anio,
      valor: p.valor,
    }));

  /** Serie de la tabla de Eurostat con el `Dato` del último año que publica. */
  const conDato = (puntos: readonly PuntoAnual[]) => ({
    puntos,
    dato: sistemas.eurostat.dato(String(extremos(puntos).ultimo.anio)),
  });
  const contrasteSerie = (id: string) => sistemas.contraste.serie(id);

  return {
    hucha: {
      valor: valorFondo,
      maximo: maximo(valorFondo.puntos),
      ultimo: extremos(valorFondo.puntos).ultimo,
      disposiciones: { puntos: disposiciones, dato: hucha.flujos.dato },
      mesesLiquidacion,
      mesesEjecucion,
      mesesCatorcePagas,
      datosMeses: [
        valorFondo.dato,
        hucha.liquidacion.gastoPensiones.dato,
        hucha.gastoEjecucion.dato,
        hucha.complementoMinimos.dato,
        hucha.numeroPorClase.jubilacion.dato,
        hucha.pensionMediaPorClase.jubilacion.dato,
      ] as readonly Dato[],
    },
    impuestos: {
      cotizaciones: { puntos: cotizaciones, dato: financiacion.ejecucion.cotizaciones.dato },
      transferencias: financiacion.presupuesto.transferenciasEstado,
      derechos: financiacion.presupuesto.derechosNoFinancieros,
      proporcionCotizaciones: proporcion(cotizaciones, derechos),
      proporcionTransferencias: proporcion(transferencias, derechos),
      transferenciaPrevistaPge: prevision(IMPROPIOS.transferenciaPrevista),
      prestamoMaximo: hucha.prestamosLeyes[PRESTAMOS.importeMaximo2021],
    },
    cotizantes: {
      porPensionistaDiciembre: cotizantes.relacion.porPensionistaDiciembre,
      porPensionMediaAnual: cotizantes.relacion.porPensionMediaAnual,
      porPensionUltimoDia: cotizantes.relacion.porPensionUltimoDia,
      afiliadosMediaAnual: cotizantes.afiliados.mediaAnualTotal,
      apoyoAgeing: cargarSerie(ageing, AGEING.apoyo),
      dependenciaAgeing: cargarSerie(ageing, AGEING.dependenciaMayores),
    },
    saldo: {
      noFinanciero: financiacion.presupuesto.saldoNoFinanciero,
      total: financiacion.presupuesto.saldoTotal,
      sec: financiacion.saldoSec.millones,
      secPib: financiacion.saldoSec.porcentajePib,
      medidas: medidasSaldo,
      diferencias: diferenciasSaldo,
      definiciones: financiacion.definiciones,
      deficitEstimado2023: prevision(IMPROPIOS.deficitEstimado),
    },
    jubilados: {
      // Solo se citan las fuentes de las piezas que figuran en los datos con definición propia: la
      // medida de riqueza de pensiones de la OCDE y su supuesto de carrera completa.
      fuentes: [
        cifra(ocde, OCDE.riquezaPensiones).dato,
        sistemas.supuesto(SUPUESTOS_REPOSICION[0]).dato,
      ] as readonly Dato[],
    },
    edad: {
      legal: {
        puntos: mesesAAnios(edadLegalMeses.puntos),
        datos: edadLegalMeses.datos,
        mesesUltimo: edadLegalMeses.puntos.at(-1),
      },
      altas: cotizantes.edadMediaAltas,
      salidaHombres: ocdeSalidaHombres,
      salidaMujeres: ocdeSalidaMujeres,
      edadActualOcde: cifra(ocde, OCDE.edadActualHombres),
      carrera65: ultimaCifra(carrera),
      carreraCompleta: cifraSuelta(CONTRASTE_MITOS.mesesCarreraCompleta),
    },
    sostenibilidad: {
      gastoAgeing,
      balanceAgeing: cargarSerie(ageing, AGEING.balance),
      gastoOcde: cargarSerie(ocde, OCDE.gastoProyectado),
      tope,
      impacto: cifra(meiReglas, DA2.impacto),
      fraccion: cifra(meiReglas, DA2.fraccion),
      periodoCriterio,
      mediaAgeing: mediaPeriodo(gastoAgeing.puntos, periodoCriterio.desde, periodoCriterio.hasta),
    },
    pobreza: {
      arope: cargarSerie(eurostat, EUROSTAT.pobrezaMayores),
      oaip: cargarSerie(ocde, OCDE.pobrezaMayores),
      oaipHombres: cargarSerie(ocde, OCDE.pobrezaMayoresHombres),
      oaipMujeres: cargarSerie(ocde, OCDE.pobrezaMayoresMujeres),
      minimaJubilacion,
      pnc,
    },
    reposicion: {
      bruta: REPOSICION.bruta.map((r) => ({ nivel: r.nivel, ...cifra(ocde, r.id) })),
      neta: REPOSICION.neta.map((r) => ({ nivel: r.nivel, ...cifra(ocde, r.id) })),
      supuestos: SUPUESTOS_REPOSICION.map((id) => sistemas.supuesto(id)),
      enVigor: COCIENTES_EN_VIGOR.map((id) => {
        const s = contrasteSerie(id);
        return { id, titulo: s.serie.title, puntos: razonAPorcentaje(s.puntos), dato: s.dato };
      }),
      altas: COCIENTES_ALTAS.map((id) => {
        const s = contrasteSerie(id);
        return { id, titulo: s.serie.title, puntos: razonAPorcentaje(s.puntos), dato: s.dato };
      }),
    },
    gasto: {
      espana: conDato(eurostatPais(EUROSTAT.paisEspana)),
      union: conDato(eurostatPais(EUROSTAT.paisUnion)),
      ocde: cargarSerie(ocde, OCDE.gastoPublico),
      contributivas: contrasteSerie(CONTRASTE_MITOS.gastoContributivas),
      eurostatEspana: cargarSerie(eurostat, 'gasto-old-srv-no-aplica-no-aplica-pc-gdp'),
    },
    ipc: {
      revalorizacion,
      ipcMedia,
      ipcDiciembre,
      filas: filasIpc,
      aniosSinRevalorizacion: tramosDeAnios(
        aniosSinDato(revalorizacion.puntos, primerAnioRevalorizacion, ultimoAnioRevalorizacion),
      ),
      diferenciaMedia: diferencia(revalorizacion.puntos, ipcMedia.puntos),
      diferenciaDiciembre: diferencia(revalorizacion.puntos, ipcDiciembre.puntos),
      regla2011,
      ultimoMes: cifra(regla, REGLA_REVALORIZACION.ultimoMes),
      meses: cifra(regla, REGLA_REVALORIZACION.meses),
      suelo: cifra(regla, REGLA_REVALORIZACION.suelo),
    },
    natalidad: {
      icfObservado: cargarSerie(fecundidad, DEMOGRAFIA.icfObservado),
      icfProyectado: cargarSerie(hipotesis, DEMOGRAFIA.icfProyectado),
      dependenciaIne: cargarSerie(hipotesis, DEMOGRAFIA.dependenciaIne),
      dependenciaEuropop: cargarSerie(europop, DEMOGRAFIA.dependenciaEuropop),
      dependenciaAgeing: cargarSerie(ageing, AGEING.dependenciaMayores),
      dependenciaEconomicaAgeing: cargarSerie(ageing, AGEING.dependenciaEconomicaMayores),
      saldoMigratorio: cargarSerie(migraciones, DEMOGRAFIA.saldoMigratorio),
    },
  };
});

export type DatosMitos = ReturnType<typeof datosMitos>;
