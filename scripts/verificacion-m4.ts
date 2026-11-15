/**
 * Ajustes de M4, paso 1: verificación reproducible de lo que dice la descripción de M4
 * (`docs/modelos/M4_descripcion.md`) con los ficheros de `data/sistema` y las salidas del modelo.
 * No ejecuta el modelo: lee los CSV de `data-raw/modelos-salidas/m4/` y los ficheros descargados.
 *
 *   (a) el MEI está dentro de las cotizaciones de la salida y el desglose cuadra;
 *   (b) cociente entre el gasto en pensiones de 2025 de la ejecución y «pensiones × pensión media × 14»,
 *       en conjunto y por clase, y si el CSV de M4 lo reproduce;
 *   (c) si la ejecución trae los complementos a mínimos como partida aparte y su importe;
 *   (d) saldo sin transferencias = saldo no financiero − transferencias y otros ingresos;
 *   (e) si el valor inicial del Fondo consta a precio de adquisición en los ficheros descargados.
 *
 * Uso: `npx tsx scripts/verificacion-m4.ts` (imprime el resultado) o importar `verificarM4()` (lo usa
 * `scripts/verificacion-m4.test.ts`). Los resultados y su lectura están en `docs/DISCREPANCIAS.md`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { factorDeCalibracion, gastoNominal } from '../src/engine/proyecciones.ts';
import { filasCsv } from '../src/engine/series-historicas.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string): string => readFileSync(path.join(RAIZ, ruta), 'utf8');

type Registro = Record<string, string>;
const csv = (ruta: string): Registro[] => filasCsv(leer(ruta));
const num = (f: Registro, k: string): number => {
  const v = f[k];
  if (v === undefined || v === '') throw new Error(`Falta «${k}»`);
  return Number(v);
};

/** Clases de pensión: identificador de /data, concepto de la ejecución y rótulo. */
export const CLASES = [
  { id: 'jubilacion', concepto: 'JUBILACIÓN', rotulo: 'Jubilación' },
  { id: 'viudedad', concepto: 'VIUDEDAD', rotulo: 'Viudedad' },
  { id: 'incapacidad', concepto: 'INCAPACIDAD PERMANENTE', rotulo: 'Incapacidad permanente' },
  { id: 'orfandad', concepto: 'ORFANDAD', rotulo: 'Orfandad' },
  { id: 'favor-familiares', concepto: 'A FAVOR DE FAMILIARES', rotulo: 'A favor de familiares' },
] as const;

const PERIODO = '2025-T4';
const ANIO = 2025;
const OBLIGACIONES = 'derechos_u_obligaciones_meur';

interface PuntoJson {
  period: string;
  value: number;
}
const serieJson = (ruta: string, id: string): number => {
  const d = JSON.parse(leer(ruta)) as { series: { id: string; points: PuntoJson[] }[] };
  const p = d.series.find((s) => s.id === id)?.points.find((q) => q.period === String(ANIO));
  if (!p) throw new Error(`Sin dato de ${ANIO} en ${ruta}#${id}`);
  return p.value;
};

export interface FilaClase {
  readonly clase: string;
  readonly pensiones: number;
  readonly pensionMediaMes: number;
  readonly gastoEjecucion: number;
  readonly gastoNominal: number;
  readonly factor: number;
}

export interface ResultadoVerificacion {
  /** (a) Cotizaciones, MEI y desglose. */
  readonly mei: {
    readonly cotizacionesMayoresOIgualesQueMei: boolean;
    /** Mayor desviación relativa del cociente (cotizaciones − MEI) / base de M2 respecto a su media. */
    readonly desviacionSinMei: number;
    /** Mayor desviación relativa del cociente MEI / (base de M2 × tipo legal) respecto a su media. */
    readonly desviacionConTipo: number;
    readonly anios: number;
    readonly ejecucion2025: {
      readonly cotizaciones: number;
      readonly mei: number;
      readonly sumaPartidas: number;
    };
  };
  /** (b) Gasto de 2025 de la ejecución frente a pensiones × pensión media × 14. */
  readonly gasto: {
    readonly porClase: readonly FilaClase[];
    readonly total: {
      readonly pensiones: number;
      readonly pensionMediaMes: number;
      readonly gastoEjecucion: number;
      readonly gastoNominal: number;
      readonly factor: number;
      /** Exceso del gasto nominal sobre el de la ejecución, en %. */
      readonly excesoPct: number;
    };
    /** Gasto de la ejecución que no está en ninguna de las cinco clases (pensiones derivadas de la DANA). */
    readonly gastoSinClase: number;
    /** El CSV de M4 (fila de 2025): pensiones, pensión media y gasto, y su cociente. */
    readonly csv2025: {
      readonly pensiones: number;
      readonly pensionMediaTotal: number;
      readonly gasto: number;
      readonly factor: number;
    };
    /** Cociente de la salida de M4 en los años proyectados (mínimo y máximo). */
    readonly factorProyectado: { readonly minimo: number; readonly maximo: number };
  };
  /** (c) Complementos a mínimos de la ejecución. */
  readonly complementos: {
    readonly partidaAparte: boolean;
    readonly tabla: string;
    readonly concepto: string;
    readonly importe: number;
    /** Gasto de la ejecución más los complementos entre el gasto nominal. */
    readonly factorConComplementos: number;
    /** Otros gastos de M4 (fila de 2025). */
    readonly otrosGastosCsv2025: number;
    /**
     * Las dos tablas de transferencias corrientes de la ejecución (contributivas y no contributivas, donde
     * están los complementos) suman la partida «transferencias corrientes» del gasto total: los complementos
     * forman parte del gasto no financiero, fuera de la suma de pensiones.
     */
    readonly incluidosEnGastoNoFinanciero: boolean;
  };
  /** (d) Saldos. */
  readonly saldos: {
    /** Mayor diferencia absoluta (millones de euros) en todas las filas de los dos CSV. */
    readonly desviacionMaxima: number;
    readonly filas: number;
    readonly ejecucion2025: {
      readonly cotizaciones: number;
      readonly pensiones: number;
      readonly obligacionesNoFinancieras: number;
      readonly derechosNoFinancieros: number;
      readonly saldoSinTransferencias: number;
      readonly saldoNoFinanciero: number;
      readonly transferenciasYOtros: number;
    };
  };
  /** (e) Valor inicial del Fondo de Reserva. */
  readonly fondo: {
    readonly valorFicheroMeur: number;
    readonly valorCsv2025: number;
    readonly descripcionFichero: string;
    /** Valor a 31 de diciembre de 2025 sin redondear, a precio de adquisición, según el informe a las Cortes. */
    readonly informeAdquisicion: number | null;
    readonly informeMercado: number | null;
  };
}

function desviacionRelativa(valores: readonly number[]): number {
  const media = valores.reduce((a, v) => a + v, 0) / valores.length;
  return Math.max(...valores.map((v) => Math.abs(v - media) / media));
}

/**
 * Texto del informe a las Cortes de 2025 (PDF descargado, no versionado) con los valores del Fondo a
 * precio de adquisición y de mercado. Se pasa a la función porque el PDF no está en el repositorio:
 * sin él, el valor se comprueba solo contra la descripción del fichero descargado.
 */
export function valoresInforme(textoInforme: string | undefined): {
  adquisicion: number | null;
  mercado: number | null;
} {
  if (!textoInforme) return { adquisicion: null, mercado: null };
  const numero = (s: string): number => Number(s.replace(/,/g, ''));
  const a = /FRSS at acquisition price\s+[\d,.]+\s+([\d,.]+)/.exec(textoInforme);
  const m = /FRSS at market value\s+[\d,.]+\s+([\d,.]+)/.exec(textoInforme);
  return {
    adquisicion: a?.[1] ? numero(a[1]) : null,
    mercado: m?.[1] ? numero(m[1]) : null,
  };
}

export function verificarM4(textoInforme?: string): ResultadoVerificacion {
  const m4 = csv('data-raw/modelos-salidas/m4/m4_financiero.csv');
  const esc = csv('data-raw/modelos-salidas/m4/m4_escenarios.csv');
  const m2 = csv('data-raw/modelos-salidas/m2/m2_cotizantes.csv');
  const fila2025 = esc.find((f) => f['escenario'] === 'base' && f['anio'] === String(ANIO));
  if (!fila2025)
    throw new Error('El CSV de escenarios no tiene la fila de 2025 del escenario base');

  // Ejecución del presupuesto, fin de 2025.
  const ejec = csv('data/sistema/presupuesto-ss-ejecucion.csv').filter(
    (f) => f['periodo'] === PERIODO && f['columna'] === 'principal',
  );
  const importe = (tabla: string, concepto: string): number => {
    const f = ejec.find((g) => g['tabla'] === tabla && g['concepto'] === concepto);
    if (!f) throw new Error(`Sin «${concepto}» en ${tabla}`);
    return num(f, OBLIGACIONES);
  };

  // (a) MEI.
  const tipoJson = JSON.parse(leer('data/parametros/mei-tipo-total.json')) as {
    data: { period?: string; value?: number; id?: string }[];
  };
  const tipos = new Map<number, number>();
  for (const p of tipoJson.data) {
    const anio = Number((p.period ?? p.id ?? '').slice(0, 4));
    if (Number.isFinite(anio) && typeof p.value === 'number') tipos.set(anio, p.value);
  }
  const ultimoTipo = Math.max(...tipos.keys());
  const base = m2.map((f) => num(f, 'base_total_rg_meur'));
  const baseDe = (i: number): number => {
    const b = base[i];
    if (b === undefined) throw new Error(`Falta la base de M2 de la fila ${i}`);
    return b;
  };
  const tipoDe = (anio: number): number => {
    const v = tipos.get(Math.min(anio, ultimoTipo));
    if (v === undefined) throw new Error(`Falta el tipo del MEI de ${anio}`);
    return v;
  };
  const delCapitulo = ejec.filter((f) => f['tabla'] === 'ingresos-cap1-cap4');
  const partidas = delCapitulo.slice(
    0,
    delCapitulo.findIndex((f) => f['concepto'] === 'TOTAL COTIZACIONES SOCIALES'),
  );
  const mei = {
    cotizacionesMayoresOIgualesQueMei: m4.every((f) => num(f, 'cotizaciones') >= num(f, 'mei')),
    desviacionSinMei: desviacionRelativa(
      m4.map((f, i) => (num(f, 'cotizaciones') - num(f, 'mei')) / baseDe(i)),
    ),
    desviacionConTipo: desviacionRelativa(
      m4.map((f, i) => num(f, 'mei') / (baseDe(i) * tipoDe(num(f, 'anio')))),
    ),
    anios: m4.length,
    ejecucion2025: {
      cotizaciones: importe('ingresos', '1. COTIZACIONES SOCIALES'),
      mei: importe('ingresos-cap1-cap4', 'MECANISMO DE EQUIDAD INTERGENERACIONAL'),
      sumaPartidas: partidas.reduce((a, f) => a + num(f, OBLIGACIONES), 0),
    },
  };

  // (b) Gasto frente a pensiones × pensión media × 14.
  const porClase: FilaClase[] = CLASES.map((c) => {
    const pensiones = serieJson('data/sistema/pensiones-vigor-numero.json', `${c.id}-ambos`);
    const pensionMediaMes = serieJson(
      'data/sistema/pensiones-vigor-pension-media.json',
      `${c.id}-ambos`,
    );
    const gastoEjecucion = importe('gastos-cap4', c.concepto);
    return {
      clase: c.rotulo,
      pensiones,
      pensionMediaMes,
      gastoEjecucion,
      gastoNominal: gastoNominal(pensiones, pensionMediaMes),
      factor: factorDeCalibracion(gastoEjecucion, pensiones, pensionMediaMes),
    };
  });
  const pensionesTotal = serieJson('data/sistema/pensiones-vigor-numero.json', 'total-ambos');
  const mediaTotal = serieJson('data/sistema/pensiones-vigor-pension-media.json', 'total-ambos');
  const gastoTotal = importe('gastos-cap4', 'SUMA DE PENSIONES');
  const nominalTotal = gastoNominal(pensionesTotal, mediaTotal);
  const sumaClases = porClase.reduce((a, f) => a + f.gastoEjecucion, 0);
  const factoresProyectados = m4.map(
    (f) =>
      num(f, 'gasto_pensiones') /
      gastoNominal(num(f, 'pensiones_oct'), num(f, 'pension_media_total')),
  );
  const gasto = {
    porClase,
    total: {
      pensiones: pensionesTotal,
      pensionMediaMes: mediaTotal,
      gastoEjecucion: gastoTotal,
      gastoNominal: nominalTotal,
      factor: factorDeCalibracion(gastoTotal, pensionesTotal, mediaTotal),
      excesoPct: (nominalTotal / gastoTotal - 1) * 100,
    },
    gastoSinClase: gastoTotal - sumaClases,
    csv2025: {
      pensiones: num(fila2025, 'pensiones_oct'),
      pensionMediaTotal: num(fila2025, 'pension_media_total'),
      gasto: num(fila2025, 'gasto_pensiones'),
      factor: factorDeCalibracion(
        num(fila2025, 'gasto_pensiones'),
        num(fila2025, 'pensiones_oct'),
        num(fila2025, 'pension_media_total'),
      ),
    },
    factorProyectado: {
      minimo: Math.min(...factoresProyectados),
      maximo: Math.max(...factoresProyectados),
    },
  };

  // (c) Complementos a mínimos.
  const tablaCompl = 'gastos-cap4-no-contributivas';
  const conceptoCompl = 'COMPL. A MÍNIMOS PENSIONES CONTRIBUTIVAS';
  const complemento = importe(tablaCompl, conceptoCompl);
  const complementos = {
    // «Aparte» = la partida no está en la tabla de pensiones contributivas (gastos-cap4) y sí en otra.
    partidaAparte: !ejec.some(
      (f) => f['tabla'] === 'gastos-cap4' && f['concepto'] === conceptoCompl,
    ),
    tabla: tablaCompl,
    concepto: conceptoCompl,
    importe: complemento,
    factorConComplementos: (gastoTotal + complemento) / nominalTotal,
    otrosGastosCsv2025: num(fila2025, 'otros_gastos'),
    incluidosEnGastoNoFinanciero:
      Math.abs(
        importe('gastos-cap4', 'TOTAL TRANSFERENCIAS CORRIENTES') +
          importe(tablaCompl, 'TOTAL') -
          importe('gastos', '4. TRANSFERENCIAS CORRIENTES'),
      ) < 0.011,
  };

  // (d) Saldos, en las dos salidas.
  let desviacionMaxima = 0;
  let filas = 0;
  for (const f of [...m4, ...esc]) {
    const d = Math.abs(
      num(f, 'saldo_sin_transferencias') -
        (num(f, 'saldo_no_financiero') - num(f, 'transferencias_y_otros')),
    );
    desviacionMaxima = Math.max(desviacionMaxima, d);
    filas++;
  }
  const obligaciones = importe('gastos', 'SUMA DE OPERACIONES NO FINANCIERAS');
  const derechos = importe('ingresos', 'SUMA DE OPERACIONES NO FINANCIERAS');
  const cotizaciones = mei.ejecucion2025.cotizaciones;
  const saldos = {
    desviacionMaxima,
    filas,
    ejecucion2025: {
      cotizaciones,
      pensiones: gastoTotal,
      obligacionesNoFinancieras: obligaciones,
      derechosNoFinancieros: derechos,
      saldoSinTransferencias: cotizaciones - obligaciones,
      saldoNoFinanciero: derechos - obligaciones,
      transferenciasYOtros: derechos - cotizaciones,
    },
  };

  // (e) Fondo de Reserva.
  const fondoAnual = csv('data/sistema/fondo-reserva-anual.csv').find(
    (f) => f['anio'] === String(ANIO),
  );
  if (!fondoAnual) throw new Error('Sin 2025 en fondo-reserva-anual.csv');
  const descripcionFichero = (
    JSON.parse(leer('data/sistema/fondo-reserva-anual.json')) as { description: string }
  ).description;
  const informe = valoresInforme(textoInforme);

  return {
    mei,
    gasto,
    complementos,
    saldos,
    fondo: {
      valorFicheroMeur: num(fondoAnual, 'valor_fondo_meur'),
      valorCsv2025: num(fila2025, 'fondo_reserva'),
      descripcionFichero,
      informeAdquisicion: informe.adquisicion,
      informeMercado: informe.mercado,
    },
  };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const pdf = path.join(RAIZ, 'data-raw/seg-social-fin/fondo-reserva/2025.pdf');
  let texto: string | undefined;
  try {
    const { execFileSync } = await import('node:child_process');
    texto = execFileSync('pdftotext', ['-layout', pdf, '-'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    });
  } catch {
    texto = undefined;
  }
  console.log(JSON.stringify(verificarM4(texto), null, 2));
}
