/**
 * Ajustes de M4 (sensibilidades), paso 1: verificación reproducible de `m4_sensibilidades.csv` con los
 * otros CSV de M4 y con lo que dice `docs/modelos/M4_descripcion.md`. No ejecuta el modelo: lee los CSV
 * y los LEEME de `data-raw/modelos-salidas/m4/` y la descripción.
 *
 *   (a) Caso base. El CSV de sensibilidades no trae una fila «base» (son diez casos): el caso base de
 *       referencia es el escenario `base` de `m4_escenarios.csv`, que a su vez debe reproducir
 *       `m4_financiero.csv` (tolerancia relativa `TOLERANCIA_BASE`). Además, la fila observada de 2025 es
 *       igual en los diez casos y en el base, y el caso de +1 punto de cotización, que no toca el gasto,
 *       reproduce el gasto del base en todos los años y las cotizaciones del base en 2026 (la subida
 *       empieza en 2027), lo que ata los casos al base por dentro.
 *   (b) Para cada caso, el gasto en pensiones y el saldo no financiero de 2050 (% del PIB), calculados
 *       desde las columnas de importes y el PIB aproximado, se comparan con los del LEEME (dos decimales)
 *       y con los de la sección 7 de la descripción (un decimal). Una diferencia es «mayor que el
 *       redondeo» si supera media unidad del último decimal citado.
 *   (c) Coherencia interna: las columnas «_pct_pib» son importe / PIB aproximado × 100.
 *   (d) Dos cifras de la sección 3 de la descripción que dependen de las sensibilidades: sin enlace con M5
 *       el cambio en 2050 es menor que 0,1 puntos de PIB, y con g = 1,8 % el índice del gasto
 *       (2026 = 100) baja a 134 en 2050.
 *
 * Uso: `npx tsx scripts/verificacion-m4-sensibilidades.ts` imprime el resultado; `verificarSensibilidades()`
 * lo devuelve (lo usa `scripts/verificacion-m4-sensibilidades.test.ts`). Los resultados y su lectura están
 * en `docs/DISCREPANCIAS.md`.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { filasCsv } from '../src/engine/series-historicas.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const M4 = 'data-raw/modelos-salidas/m4';
const leer = (ruta: string): string => readFileSync(path.join(RAIZ, ruta), 'utf8');

type Registro = Record<string, string>;
const csv = (ruta: string): Registro[] => filasCsv(leer(ruta));
const num = (f: Registro, k: string): number => {
  const v = f[k];
  if (v === undefined || v === '') throw new Error(`Falta «${k}»`);
  return Number(v);
};

/** Tolerancia relativa con la que el base de los escenarios reproduce `m4_financiero.csv` (último bit de coma flotante). */
export const TOLERANCIA_BASE = 1e-12;
/** Año de las comparaciones con la descripción. */
export const ANIO = 2050;
const ANIO_INICIO = 2026;
const ANIO_OBSERVADO = 2025;
const CASO_COTIZACION = 'cotizacion_mas_1';
const CASO_SIN_ENLACE = 'sin_enlace_m5';
const CASO_G_ALTA = 'g1_8';

/**
 * Valores que cita la sección 7 de la descripción (un decimal) y fragmento literal del texto que debe
 * constar en ella. Es el contenido de la descripción transcrito para compararlo, no un dato de la web.
 */
export const CITAS_SECCION_7: Record<
  string,
  { gasto: number | null; saldo: number | null; fragmento: string }
> = {
  g1_5: {
    gasto: 15.2,
    saldo: -4.6,
    fragmento: 'Con g = 1,5 %, el gasto de 2050 baja al 15,2 % del PIB y el saldo a −4,6 %',
  },
  reval_menos_0_5: {
    gasto: 15.2,
    saldo: -4.7,
    fragmento: '−0,5 puntos: gasto 15,2 % y saldo −4,7 % en 2050',
  },
  cotizacion_mas_1: {
    gasto: null,
    saldo: -5.3,
    fragmento: 'sube el saldo de 2050 de −5,6 % a −5,3 %',
  },
  altas_topadas_20: {
    gasto: 15.9,
    saldo: null,
    fragmento: 'el gasto de 2050 baja del 16,1 % al 15,9 % del PIB',
  },
  sin_migracion: {
    gasto: 21.4,
    saldo: -10.9,
    fragmento: 'el gasto de 2050 sube al 21,4 % del PIB y el saldo cae a −10,9 %',
  },
  fecundidad_mas_20: { gasto: 16.0, saldo: -5.5, fragmento: 'apenas cambia (16,0 % y −5,5 %)' },
  mujeres_convergen: { gasto: 15.5, saldo: -5.2, fragmento: 'gasto 15,5 %, saldo −5,2 %' },
  empleo_55_64_mas_10: { gasto: 15.8, saldo: -5.3, fragmento: '(15,8 % y −5,3 %)' },
};
/** Base de la sección 3 de la descripción (2050): gasto 16,1 y saldo no financiero −5,6. */
const CITA_BASE = { gasto: 16.1, saldo: -5.6 };

const aNumero = (s: string): number => Number(s.replace('−', '-').replace(',', '.'));

export interface ResultadoCaso {
  readonly id: string;
  /** Texto del LEEME que describe el caso. */
  readonly parametro: string;
  /** Gasto y saldo de 2050 (% del PIB aproximado) calculados desde los importes y el PIB. */
  readonly gasto: number;
  readonly saldo: number;
  /** Valores del LEEME (dos decimales). */
  readonly leeme: { readonly gasto: number; readonly saldo: number };
  /** Mayor diferencia absoluta con el LEEME. */
  readonly diferenciaLeeme: number;
  /** Valores de la sección 7 (un decimal), si los cita, y si el fragmento consta en la descripción. */
  readonly descripcion: {
    readonly gasto: number | null;
    readonly saldo: number | null;
    readonly fragmentoPresente: boolean;
  };
  /** Mayor diferencia absoluta con la descripción, o `null` si no cita cifras. */
  readonly diferenciaDescripcion: number | null;
  /** `true` si la diferencia con la descripción o con el LEEME supera el redondeo. */
  readonly superaRedondeo: boolean;
}

export interface ResultadoSensibilidades {
  readonly casos: readonly ResultadoCaso[];
  readonly aniosPorCaso: number;
  readonly base: {
    readonly tolerancia: number;
    /** Mayor diferencia relativa entre el base de los escenarios y `m4_financiero.csv` (2026-2050). */
    readonly diferenciaRelativaConFinanciero: number;
    readonly gasto: number;
    readonly saldo: number;
    readonly leeme: { readonly gasto: number; readonly saldo: number };
    readonly descripcion: { readonly gasto: number; readonly saldo: number };
  };
  readonly fila2025: { readonly igualEnLosCasos: boolean; readonly igualAlBase: boolean };
  readonly cotizacionMas1: {
    readonly diferenciaRelativaGasto: number;
    readonly diferenciaCotizaciones2026: number;
  };
  /** Mayor diferencia relativa entre las columnas «_pct_pib» y importe / PIB × 100, en todas las filas. */
  readonly diferenciaPctPib: number;
  readonly seccion3: {
    readonly cambioSinEnlace: number;
    readonly indiceGasto2050ConG1_8: number;
  };
  readonly parametroEmpleo: string;
  /** Nota del LEEME sobre los dos casos de M2 (avance lineal desde 2026). */
  readonly notaM2: string;
}

const pctGasto = (f: Registro): number => (num(f, 'gasto_pensiones') / num(f, 'pib_proxy')) * 100;
const pctSaldo = (f: Registro): number =>
  (num(f, 'saldo_no_financiero') / num(f, 'pib_proxy')) * 100;

const relativa = (a: number, b: number): number =>
  a === b ? 0 : Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b));

/** Casos del LEEME de las sensibilidades, en su orden: identificador y descripción del parámetro. */
export function casosDelLeeme(texto: string): { id: string; parametro: string }[] {
  const a = texto.indexOf('\nCASOS');
  const b = texto.indexOf('\nRESULTADOS EN 2050');
  if (a < 0 || b < 0) throw new Error('El LEEME no tiene los apartados CASOS y RESULTADOS EN 2050');
  return texto
    .slice(a, b)
    .split('\n')
    .flatMap((l) => {
      const m = /^([a-z0-9_]+)\s*\|\s*(.+)$/.exec(l.trim());
      return m?.[1] !== undefined && m[2] !== undefined
        ? [{ id: m[1], parametro: m[2].trim() }]
        : [];
    });
}

/** Resultados de 2050 del LEEME: base y casos, gasto y saldo con dos decimales. */
export function resultadosDelLeeme(
  texto: string,
): Record<string, { gasto: number; saldo: number }> {
  const a = texto.indexOf('RESULTADOS EN 2050');
  const linea = texto.slice(texto.indexOf('\n', a) + 1).split('\n')[0] ?? '';
  const salida: Record<string, { gasto: number; saldo: number }> = {};
  for (const trozo of linea.split('|')) {
    const m = /^\s*([a-z0-9_]+) ([\d,]+) y (−?[\d,]+)\s*(?:\(.*\))?\s*$/.exec(trozo);
    if (m?.[1] && m[2] && m[3]) salida[m[1]] = { gasto: aNumero(m[2]), saldo: aNumero(m[3]) };
  }
  return salida;
}

export function verificarSensibilidades(): ResultadoSensibilidades {
  const sens = csv(`${M4}/m4_sensibilidades.csv`);
  const esc = csv(`${M4}/m4_escenarios.csv`);
  const fin = csv(`${M4}/m4_financiero.csv`);
  const leemeTexto = leer(`${M4}/LEEME_m4_sensibilidades.txt`);
  const descripcion = leer('docs/modelos/M4_descripcion.md');
  const casos = casosDelLeeme(leemeTexto);
  const leeme = resultadosDelLeeme(leemeTexto);

  const de = (filas: Registro[], id: string | null, anio: number): Registro => {
    const f = filas.find(
      (r) => (id === null || r['escenario'] === id) && Number(r['anio']) === anio,
    );
    if (!f) throw new Error(`Sin fila de ${id ?? 'm4_financiero'} en ${anio}`);
    return f;
  };

  // (a) Caso base.
  let diferenciaFinanciero = 0;
  for (const f of fin) {
    const b = de(esc, 'base', Number(f['anio']));
    for (const k of Object.keys(f)) {
      if (f[k] === '' && b[k] === '') continue;
      diferenciaFinanciero = Math.max(diferenciaFinanciero, relativa(num(f, k), num(b, k)));
    }
  }
  const sinEscenario = (f: Registro): string =>
    Object.entries(f)
      .filter(([k]) => k !== 'escenario')
      .map(([, v]) => v)
      .join('|');
  const f2025 = sens.filter((r) => Number(r['anio']) === ANIO_OBSERVADO);
  const base2025 = sinEscenario(de(esc, 'base', ANIO_OBSERVADO));
  const baseGasto = pctGasto(de(esc, 'base', ANIO));
  const baseSaldo = pctSaldo(de(esc, 'base', ANIO));
  const baseLeeme = leeme['base'];
  if (!baseLeeme) throw new Error('El LEEME no da el caso base de 2050');

  let gastoCot = 0;
  for (let anio = ANIO_INICIO; anio <= ANIO; anio++) {
    gastoCot = Math.max(
      gastoCot,
      relativa(
        num(de(sens, CASO_COTIZACION, anio), 'gasto_pensiones'),
        num(de(esc, 'base', anio), 'gasto_pensiones'),
      ),
    );
  }

  // (b) Cada caso en 2050.
  const resultados = casos.map(({ id, parametro }): ResultadoCaso => {
    const f = de(sens, id, ANIO);
    const gasto = pctGasto(f);
    const saldo = pctSaldo(f);
    const l = leeme[id];
    if (!l) throw new Error(`El LEEME no da los resultados de 2050 del caso ${id}`);
    const cita = CITAS_SECCION_7[id];
    const difLeeme = Math.max(Math.abs(gasto - l.gasto), Math.abs(saldo - l.saldo));
    const dg = cita?.gasto == null ? null : Math.abs(gasto - cita.gasto);
    const ds = cita?.saldo == null ? null : Math.abs(saldo - cita.saldo);
    const diffs = [dg, ds].filter((x): x is number => x !== null);
    const difDescripcion = diffs.length === 0 ? null : Math.max(...diffs);
    const fragmentoPresente = cita === undefined ? false : descripcion.includes(cita.fragmento);
    // Más de media unidad del último decimal citado (0,005 en el LEEME; 0,05 en la descripción).
    const EPS = 1e-9;
    const superaRedondeo =
      difLeeme > 0.005 + EPS || (difDescripcion !== null && difDescripcion > 0.05 + EPS);
    return {
      id,
      parametro,
      gasto,
      saldo,
      leeme: l,
      diferenciaLeeme: difLeeme,
      descripcion: { gasto: cita?.gasto ?? null, saldo: cita?.saldo ?? null, fragmentoPresente },
      diferenciaDescripcion: difDescripcion,
      superaRedondeo,
    };
  });

  // (c) Coherencia de las columnas «_pct_pib».
  let difPct = 0;
  for (const f of [...sens, ...esc, ...fin]) {
    difPct = Math.max(
      difPct,
      relativa(num(f, 'gasto_pensiones_pct_pib'), pctGasto(f)),
      relativa(num(f, 'saldo_no_financiero_pct_pib'), pctSaldo(f)),
    );
  }

  // (d) Sección 3.
  const gastoCaso = (id: string, anio: number): number => pctGasto(de(sens, id, anio));
  const sinEnlace = gastoCaso(CASO_SIN_ENLACE, ANIO) - baseGasto;
  const indiceG = (gastoCaso(CASO_G_ALTA, ANIO) / gastoCaso(CASO_G_ALTA, ANIO_INICIO)) * 100;

  const notaM2 = /NOTA SOBRE LOS DOS CASOS DE M2[^\n]*\n([^\n]*)/.exec(leemeTexto)?.[1] ?? '';
  const parametroEmpleo = casos.find((c) => c.id === 'empleo_55_64_mas_10')?.parametro ?? '';

  return {
    casos: resultados,
    aniosPorCaso: new Set(sens.filter((r) => r['escenario'] === casos[0]?.id).map((r) => r['anio']))
      .size,
    base: {
      tolerancia: TOLERANCIA_BASE,
      diferenciaRelativaConFinanciero: diferenciaFinanciero,
      gasto: baseGasto,
      saldo: baseSaldo,
      leeme: baseLeeme,
      descripcion: CITA_BASE,
    },
    fila2025: {
      igualEnLosCasos: new Set(f2025.map(sinEscenario)).size === 1,
      igualAlBase: f2025.every((f) => sinEscenario(f) === base2025),
    },
    cotizacionMas1: {
      diferenciaRelativaGasto: gastoCot,
      diferenciaCotizaciones2026: relativa(
        num(de(sens, CASO_COTIZACION, ANIO_INICIO), 'cotizaciones'),
        num(de(esc, 'base', ANIO_INICIO), 'cotizaciones'),
      ),
    },
    diferenciaPctPib: difPct,
    seccion3: { cambioSinEnlace: sinEnlace, indiceGasto2050ConG1_8: indiceG },
    parametroEmpleo,
    notaM2,
  };
}

const f2 = (x: number): string => x.toFixed(2).replace('.', ',');

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = verificarSensibilidades();
  console.log(`Años por caso: ${r.aniosPorCaso}`);
  console.log(
    `(a) Base de los escenarios frente a m4_financiero.csv: diferencia relativa máxima ${r.base.diferenciaRelativaConFinanciero.toExponential(1)} (tolerancia ${r.base.tolerancia.toExponential(0)})`,
  );
  console.log(
    `    Fila de 2025 igual en los diez casos: ${r.fila2025.igualEnLosCasos}; igual al base: ${r.fila2025.igualAlBase}`,
  );
  console.log(
    `    Caso de +1 punto de cotización: gasto igual al base (dif. relativa ${r.cotizacionMas1.diferenciaRelativaGasto.toExponential(1)}), cotizaciones de 2026 iguales (${r.cotizacionMas1.diferenciaCotizaciones2026.toExponential(1)})`,
  );
  console.log(
    `    Base ${ANIO}: gasto ${f2(r.base.gasto)} y saldo ${f2(r.base.saldo)} (LEEME ${f2(r.base.leeme.gasto)} y ${f2(r.base.leeme.saldo)}; descripción ${f2(r.base.descripcion.gasto)} y ${f2(r.base.descripcion.saldo)})`,
  );
  console.log(`(b) Casos en ${ANIO} (gasto % PIB, saldo % PIB):`);
  for (const c of r.casos) {
    console.log(
      `    ${c.id.padEnd(22)} ${f2(c.gasto)} ${f2(c.saldo)} | LEEME ${f2(c.leeme.gasto)} ${f2(c.leeme.saldo)} (dif. ${c.diferenciaLeeme.toFixed(4)}) | descripción ${c.descripcion.gasto ?? '—'} ${c.descripcion.saldo ?? '—'}${c.diferenciaDescripcion === null ? '' : ` (dif. ${c.diferenciaDescripcion.toFixed(4)})`}${c.superaRedondeo ? '  ← SUPERA EL REDONDEO' : ''}`,
    );
  }
  console.log(
    `(c) Columnas «_pct_pib» frente a importe / PIB: ${r.diferenciaPctPib.toExponential(1)}`,
  );
  console.log(
    `(d) Sin enlace con M5, cambio del gasto de ${ANIO}: ${r.seccion3.cambioSinEnlace.toFixed(3)} puntos; índice del gasto con g = 1,8 %: ${r.seccion3.indiceGasto2050ConG1_8.toFixed(1)}`,
  );
  console.log(`Parámetro del caso de empleo de 55 a 64 años según el LEEME: ${r.parametroEmpleo}`);
}
