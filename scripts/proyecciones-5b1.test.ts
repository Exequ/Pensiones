/**
 * Fase 5-B1: salidas de los modelos M1, M2 y M3 en data/proyecciones/.
 *  1. Procedencia: cada fichero lleva fuente, fecha de descarga, confianza, naturaleza «proyección de
 *     modelo», escenario, commit del código y huella SHA-256 del CSV de origen.
 *  2. El JSON reproduce exactamente el CSV de data-raw/modelos-salidas/ y el LEEME.
 *  3. Coherencias internas que declaran las descripciones de los modelos (docs/modelos/).
 *  4. `validate:data` exige el esquema y la carpeta.
 *
 * No se imponen identidades que las descripciones no declaren; lo que no se cumple exactamente está
 * anotado en docs/DISCREPANCIAS.md («Fase 5-B1»).
 */
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoProyeccion } from '../src/engine/esquema-datos.ts';
import { validarContenido } from './lib/validar-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string) => readFileSync(path.join(RAIZ, ruta), 'utf8');

const ESPERADOS = [
  'm1-backtest',
  'm1-contraste-ine',
  'm1-escenarios',
  'm2-cotizantes',
  'm2-relacion-pensiones',
  'm3-pensiones',
  'm3-resumen',
] as const;
type Id = (typeof ESPERADOS)[number];

const cargar = (id: Id): ArchivoProyeccion =>
  ArchivoProyeccion.parse(JSON.parse(leer(`data/proyecciones/${id}.json`)));

/** Filas del fichero como objetos por columna. */
function filasDe(id: Id): Record<string, string | number>[] {
  const a = cargar(id);
  return a.filas.map((fila) => {
    const o: Record<string, string | number> = {};
    a.columnas.forEach((c, j) => {
      o[c.id] = fila[j]!;
    });
    return o;
  });
}
const num = (f: Record<string, string | number>, k: string): number => f[k] as number;

const leeme = leer('data-raw/modelos-salidas/LEEME.txt');
const fechaLeeme = /el (\d{4}-\d{2}-\d{2})/.exec(leeme)![1]!;
const commitLeeme = /commit que modifica modelos\/: ([0-9a-f]{7,40})/.exec(leeme)![1]!;

describe('procedencia de data/proyecciones', () => {
  it('contiene exactamente los siete ficheros previstos (sin M4)', () => {
    const ficheros = readdirSync(path.join(RAIZ, 'data/proyecciones'))
      .filter((f) => f.endsWith('.json'))
      .map((f) => f.replace(/\.json$/, ''))
      .sort();
    expect(ficheros).toEqual([...ESPERADOS].sort());
    expect(readdirSync(path.join(RAIZ, 'data/proyecciones')).some((f) => /m4/i.test(f))).toBe(
      false,
    );
  });

  it.each(ESPERADOS)('%s: esquema, fuente, fecha, confianza y naturaleza', (id) => {
    const bruto: unknown = JSON.parse(leer(`data/proyecciones/${id}.json`));
    expect(validarContenido(bruto, `data/proyecciones/${id}.json`)).toEqual([]);
    const a = cargar(id);
    expect(a.id).toBe(id);
    expect(a.naturaleza).toBe('proyeccion-de-modelo');
    expect(a.source.publisher).toBe('Elaboración propia: modelo de proyección');
    expect(a.source.url).toMatch(
      /^https:\/\/github\.com\/Exequ\/Pensiones\/blob\/[0-9a-f]{40}\/modelos\/m[123]\/m[123]_[a-z]+\.py$/,
    );
    expect(a.fetchedAt).toBe(fechaLeeme);
    expect(['alta', 'media', 'baja']).toContain(a.confidence);
  });

  it.each(ESPERADOS)('%s: escenario y commit del LEEME', (id) => {
    const a = cargar(id);
    expect(a.origen.commitModelos.startsWith(commitLeeme)).toBe(true);
    expect(a.source.url).toContain(a.origen.commitModelos);
    expect(a.origen.ejecutadoEl).toBe(fechaLeeme);
    // «g = 1 %, IPC = 2 %, legislación congelada» del LEEME, como fracciones.
    expect(a.escenario.g).toBeCloseTo(0.01, 12);
    expect(a.escenario.ipc).toBeCloseTo(0.02, 12);
    expect(a.escenario.legislacion).toBe('congelada');
    expect(leeme).toContain(a.escenario.literal);
  });

  it.each(ESPERADOS)('%s: la huella SHA-256 es la del CSV y las filas lo reproducen', (id) => {
    const a = cargar(id);
    const bytes = readFileSync(path.join(RAIZ, a.origen.csv));
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(a.origen.sha256);
    const lineas = bytes
      .toString('utf8')
      .split('\n')
      .filter((l) => l.trim() !== '');
    expect(lineas[0]!.split(',')).toEqual(a.columnas.map((c) => c.id));
    expect(lineas.length - 1).toBe(a.filas.length);
    lineas.slice(1).forEach((linea, i) => {
      const celdas = linea.split(',');
      a.columnas.forEach((c, j) => {
        const valor = a.filas[i]![j]!;
        if (c.tipo === 'numero') expect(valor, `${id} fila ${i} ${c.id}`).toBe(Number(celdas[j]));
        else expect(valor).toBe(celdas[j]);
      });
    });
  });

  it('M1 lleva el horizonte de presentación de su descripción y M2 el año base de los euros reales', () => {
    const descripcion = leer('docs/modelos/M1_descripcion.md');
    const horizonte = Number(/hasta (\d{4})\)/.exec(descripcion)![1]);
    for (const id of ['m1-backtest', 'm1-contraste-ine', 'm1-escenarios'] as const) {
      expect(cargar(id).modelo.horizontePresentacion).toBe(horizonte);
    }
    expect(cargar('m2-cotizantes').modelo.anioBaseReal).toBe(2025);
  });
});

describe('coherencias internas de las salidas', () => {
  const ANIOS_M = Array.from({ length: 25 }, (_, i) => 2026 + i);
  const CLASES = ['jubilacion', 'viudedad', 'incapacidad', 'orfandad', 'favor-familiares'];

  it('M3: años, clases, sexos y grupos de edad completos y sin repeticiones', () => {
    const f = filasDe('m3-pensiones');
    const claves = new Set(
      f.map((r) => `${r['anio']}|${r['clase']}|${r['sexo']}|${r['grupo_edad']}`),
    );
    expect(claves.size).toBe(f.length);
    expect(f.length).toBe(ANIOS_M.length * CLASES.length * 2 * 18);
    expect([...new Set(f.map((r) => r['anio']))]).toEqual(ANIOS_M);
    expect([...new Set(f.map((r) => r['clase']))].sort()).toEqual([...CLASES].sort());
    expect([...new Set(f.map((r) => r['sexo']))].sort()).toEqual(['hombres', 'mujeres']);
    expect(new Set(f.map((r) => r['grupo_edad'])).size).toBe(18);
    expect(f.every((r) => num(r, 'pensiones') >= 0)).toBe(true);
  });

  it('M3: la suma de pensiones por clase de m3_pensiones coincide con m3_resumen por año', () => {
    const detalle = filasDe('m3-pensiones');
    const resumen = filasDe('m3-resumen');
    expect(resumen.map((r) => r['anio'])).toEqual(ANIOS_M);
    for (const r of resumen) {
      let total = 0;
      for (const clase of CLASES) {
        const suma = detalle
          .filter((d) => d['anio'] === r['anio'] && d['clase'] === clase)
          .reduce((acc, d) => acc + num(d, 'pensiones'), 0);
        expect(suma, `${r['anio']} ${clase}`).toBeCloseTo(num(r, clase), 4);
        total += num(r, clase);
      }
      expect(total, `total ${r['anio']}`).toBeCloseTo(num(r, 'total'), 4);
    }
  });

  it('M3: los pensionistas aproximados son una fracción constante de las pensiones (la del último dato publicado)', () => {
    const resumen = filasDe('m3-resumen');
    const razones = resumen.map((r) => num(r, 'pensionistas_aprox') / num(r, 'total'));
    for (const razon of razones) expect(razon).toBeCloseTo(razones[0]!, 12);
    // Coincide con pensionistas / pensiones de diciembre del último año de la serie histórica (5-A).
    const historico = JSON.parse(leer('data/sistema/pensionistas-pensiones-historico.json')) as {
      series: { id: string; points: { period: string; value: number }[] }[];
    };
    const ultimo = (id: string) => historico.series.find((s) => s.id === id)!.points.at(-1)!.value;
    expect(razones[0]!).toBeCloseTo(ultimo('pensionistas') / ultimo('pensiones'), 6);
  });

  it('M2: la relación usa los afiliados de M2, las pensiones de M3 y es su cociente', () => {
    const rel = filasDe('m2-relacion-pensiones');
    const cot = filasDe('m2-cotizantes');
    const res = filasDe('m3-resumen');
    expect(rel.map((r) => r['anio'])).toEqual(ANIOS_M);
    expect(cot.map((r) => r['anio'])).toEqual(ANIOS_M);
    rel.forEach((r, i) => {
      expect(num(r, 'afiliados_dic')).toBeCloseTo(num(cot[i]!, 'afiliados_dic'), 6);
      expect(num(r, 'pensiones_oct')).toBeCloseTo(num(res[i]!, 'total'), 4);
      expect(num(r, 'afiliados_por_pension')).toBeCloseTo(
        num(r, 'afiliados_dic') / num(r, 'pensiones_oct'),
        10,
      );
    });
  });

  it('M2: la base en euros reales de 2025 no supera a la corriente y la recaudación es una parte de la base', () => {
    const cot = filasDe('m2-cotizantes');
    for (const r of cot) {
      expect(num(r, 'base_total_rg_meur_reales_2025')).toBeLessThan(num(r, 'base_total_rg_meur'));
      const tipo = num(r, 'recaudacion_cc_rg_meur') / num(r, 'base_total_rg_meur');
      // El tipo implícito es constante (el de contingencias comunes que indica M2, 28,3 %).
      expect(tipo).toBeCloseTo(
        num(cot[0]!, 'recaudacion_cc_rg_meur') / num(cot[0]!, 'base_total_rg_meur'),
        10,
      );
    }
    expect(num(cot[0]!, 'recaudacion_cc_rg_meur') / num(cot[0]!, 'base_total_rg_meur')).toBeCloseTo(
      0.283,
      4,
    );
  });

  it('M1: contraste con el INE completo; los errores se recalculan desde las columnas', () => {
    const f = filasDe('m1-contraste-ine');
    expect(f.map((r) => r['anio'])).toEqual(Array.from({ length: 51 }, (_, i) => 2026 + i));
    for (const r of f) {
      const err = (m: string, i: string) => ((num(r, m) - num(r, i)) / num(r, i)) * 100;
      expect(num(r, 'err_total_%')).toBeCloseTo(err('total_m1', 'total_ine'), 6);
      expect(num(r, 'err_65_mas_%')).toBeCloseTo(err('65_mas_m1', '65_mas_ine'), 6);
      expect(num(r, 'err_0_15_%')).toBeCloseTo(err('0_15_m1', '0_15_ine'), 6);
      expect(num(r, 'err_dep_pp')).toBeCloseTo(
        (num(r, 'dep_65_m1') - num(r, 'dep_65_ine')) * 100,
        6,
      );
      expect(num(r, 'dep_65_m1')).toBeCloseTo(num(r, '65_mas_m1') / num(r, '16_64_m1'), 8);
      expect(num(r, 'dep_65_ine')).toBeCloseTo(num(r, '65_mas_ine') / num(r, '16_64_ine'), 8);
    }
    // El año de partida coincide con el INE (el modelo arranca de su población).
    expect(num(f[0]!, 'total_m1')).toBe(num(f[0]!, 'total_ine'));
  });

  it('M1: las columnas del INE son las de data/demografia/proyecciones-poblacion', () => {
    const lineas = leer('data/demografia/proyecciones-poblacion.csv').split('\n').slice(1);
    const suma = new Map<string, number>();
    for (const linea of lineas) {
      const [anio, sexo, edad, poblacion] = linea.split(',');
      if (sexo !== 'ambos' || anio === undefined) continue;
      const e = Number(edad);
      const sumar = (clave: string) =>
        suma.set(`${anio}|${clave}`, (suma.get(`${anio}|${clave}`) ?? 0) + Number(poblacion));
      sumar('total');
      if (e >= 65) sumar('65');
      if (e >= 16 && e <= 64) sumar('16');
    }
    for (const r of filasDe('m1-contraste-ine')) {
      expect(num(r, 'total_ine')).toBeCloseTo(suma.get(`${r['anio']}|total`)!, 3);
      expect(num(r, '65_mas_ine')).toBeCloseTo(suma.get(`${r['anio']}|65`)!, 3);
      expect(num(r, '16_64_ine')).toBeCloseTo(suma.get(`${r['anio']}|16`)!, 3);
    }
  });

  it('M1: la prueba hacia atrás recalcula sus errores y coincide con la población observada (INE)', () => {
    const f = filasDe('m1-backtest');
    expect(f.map((r) => r['anio'])).toEqual(Array.from({ length: 15 }, (_, i) => 2011 + i));
    const observada = new Map<number, number>();
    for (const linea of leer('data/demografia/poblacion-edad-sexo.csv').split('\n').slice(1)) {
      const [anio, sexo, , poblacion] = linea.split(',');
      if (sexo === 'ambos')
        observada.set(Number(anio), (observada.get(Number(anio)) ?? 0) + Number(poblacion));
    }
    for (const r of f) {
      expect(num(r, 'err_total_%')).toBeCloseTo(
        ((num(r, 'total_m1') - num(r, 'total_real')) / num(r, 'total_real')) * 100,
        6,
      );
      // La población «observada» del CSV difiere de la suma por edades en unas pocas personas
      // (redondeos de la fuente): se comprueba con una tolerancia de diez personas.
      expect(Math.abs(num(r, 'total_real') - observada.get(Number(r['anio']))!)).toBeLessThan(10);
    }
  });

  it('M1: seis escenarios, cuatro años cada uno, con los rótulos del CSV y el mismo punto de partida', () => {
    const f = filasDe('m1-escenarios');
    const escenarios = [...new Set(f.map((r) => r['escenario'] as string))];
    expect(escenarios).toEqual([
      'INE (base)',
      'fecundidad -20 %',
      'fecundidad +20 %',
      'sin migración',
      'migración -50 %',
      'mortalidad -1 % anual extra',
    ]);
    for (const e of escenarios) {
      expect(f.filter((r) => r['escenario'] === e).map((r) => r['anio'])).toEqual([
        2026, 2035, 2050, 2076,
      ]);
    }
    const inicio = f.filter((r) => r['anio'] === 2026).map((r) => num(r, 'total'));
    expect(new Set(inicio).size).toBe(1);
    // «INE (base)» es el modelo con las hipótesis base del INE: coincide con la columna del modelo del
    // contraste (no con la proyección publicada del INE, de la que difiere en unas décimas).
    const contraste = new Map(filasDe('m1-contraste-ine').map((r) => [r['anio'], r]));
    for (const r of f.filter((x) => x['escenario'] === 'INE (base)')) {
      expect(num(r, '65_mas')).toBeCloseTo(num(contraste.get(r['anio'])!, '65_mas_m1'), 0);
    }
  });

  it('M3 y el año de partida: las pensiones de 2026 son las de la foto de octubre de 2026 salvo las de edad desconocida', () => {
    const foto = leer('data/sistema/pensiones-vigor-edad-clase-sexo.csv')
      .split('\n')
      .slice(1)
      .map((l) => l.split(','));
    const sumaFoto = (clave: string) =>
      foto
        .filter(
          (c) => c[3] === 'ambos' && c[2] === clave && c[1] !== 'total' && c[1] !== 'no-consta',
        )
        .reduce((acc, c) => acc + Number(c[4]), 0);
    const r = filasDe('m3-resumen')[0]!;
    // Diferencia máxima por clase: 100 pensiones (0,002 %); ver docs/DISCREPANCIAS.md, «Fase 5-B1».
    for (const clase of CLASES) {
      expect(Math.abs(num(r, clase) - sumaFoto(clase))).toBeLessThan(100);
    }
  });
});

describe('validate:data exige la naturaleza y la carpeta', () => {
  const base: Record<string, unknown> = JSON.parse(leer('data/proyecciones/m3-resumen.json'));

  it('el fichero válido no da errores', () => {
    expect(validarContenido(base, 'data/proyecciones/m3-resumen.json')).toEqual([]);
  });

  it('rechaza un fichero de proyección sin naturaleza', () => {
    const { naturaleza: _omitida, ...sinNaturaleza } = base;
    const errores = validarContenido(sinNaturaleza, 'data/proyecciones/m3-resumen.json');
    expect(errores.some((e) => e.ruta === 'naturaleza')).toBe(true);
  });

  it('rechaza una naturaleza distinta de «proyeccion-de-modelo»', () => {
    const errores = validarContenido(
      { ...base, naturaleza: 'observado' },
      'data/proyecciones/m3-resumen.json',
    );
    expect(errores.some((e) => e.ruta === 'naturaleza')).toBe(true);
  });

  it('rechaza una proyección sin fuente, sin huella o con una celda del tipo equivocado', () => {
    const { source: _fuente, ...sinFuente } = base;
    expect(validarContenido(sinFuente, 'data/proyecciones/m3-resumen.json').length).toBeGreaterThan(
      0,
    );
    const origen = { ...(base['origen'] as object), sha256: 'abc' };
    expect(
      validarContenido({ ...base, origen }, 'data/proyecciones/m3-resumen.json').some((e) =>
        e.ruta.startsWith('origen'),
      ),
    ).toBe(true);
    const filas = (base['filas'] as (number | string)[][]).map((f) => [...f]);
    filas[0]![1] = 'texto';
    expect(
      validarContenido({ ...base, filas }, 'data/proyecciones/m3-resumen.json').some((e) =>
        e.mensaje.includes('número finito'),
      ),
    ).toBe(true);
  });

  it('exige la carpeta: una proyección fuera de data/proyecciones/ y un fichero de otro tipo dentro', () => {
    expect(
      validarContenido(base, 'data/sistema/m3-resumen.json').some((e) => e.ruta === 'tipo'),
    ).toBe(true);
    expect(
      validarContenido({ ...base, tipo: 'datos' }, 'data/proyecciones/m3-resumen.json').some(
        (e) => e.ruta === 'tipo',
      ),
    ).toBe(true);
  });
});
