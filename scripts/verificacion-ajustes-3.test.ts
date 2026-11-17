// @vitest-environment node
/**
 * Ajustes actuariales 3 (tercera tanda de la revisión actuarial, 16-11-2026): recálculo desde /data de las
 * cifras que sustentan los estados de docs/revision-actuarial/aplicacion-tanda3.json, coherencia de esa
 * tabla con docs/claims.json y validación del campo `respuestaActuarial`. Las cifras del revisor no se
 * copian: cada una se recalcula aquí o no se usa.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { RegistroAfirmaciones } from '../src/engine/esquema-datos.ts';
import { valoracionesEn } from './lib/valoraciones.ts';
import { tasaBrutaReposicion } from './lib/reposicion-teorica.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string): unknown =>
  JSON.parse(readFileSync(path.join(RAIZ, ruta), 'utf8')) as unknown;

interface Punto {
  period: string;
  value: number;
}
interface Elemento {
  id: string;
  period: string;
  value: number | string;
  notes?: string;
}
interface Archivo {
  data?: Elemento[];
  series?: { id: string; points: Punto[] }[];
}
const parametro = (fichero: string): Map<string, number> =>
  new Map(
    ((leer(`data/parametros/${fichero}.json`) as Archivo).data ?? []).map((d) => [
      d.id,
      d.value as number,
    ]),
  );
const serie = (ruta: string, id: string): Map<string, number> => {
  const s = ((leer(`data/${ruta}.json`) as Archivo).series ?? []).find((x) => x.id === id);
  if (!s) throw new Error(`${ruta}#${id}`);
  return new Map(s.points.map((p) => [p.period, p.value]));
};
const v = (m: Map<string, number>, k: string): number => {
  const x = m.get(k);
  if (x === undefined) throw new Error(`falta ${k}`);
  return x;
};
const redondea = (x: number, d: number) => Math.round(x * 10 ** d) / 10 ** d;

interface Fila {
  n: number;
  parte: string;
  id: string;
  estado: 'revisada' | 'pendiente';
  respuestaActuarial: string;
  preguntaReducida?: string;
  comprobado: string;
  cambio: string;
}
const tabla = (leer('docs/revision-actuarial/aplicacion-tanda3.json') as { filas: Fila[] }).filas;
const claims = RegistroAfirmaciones.parse(leer('docs/claims.json'));

describe('tabla de aplicación (docs/revision-actuarial/aplicacion-tanda3.json)', () => {
  it('tiene una fila por cada número de la tanda (1 a 69; el 68 se separa en dos afirmaciones)', () => {
    const numeros = new Set(tabla.map((f) => f.n));
    expect([...numeros].sort((a, b) => a - b)).toEqual(Array.from({ length: 69 }, (_, i) => i + 1));
    expect(tabla.length).toBe(70);
    expect(
      tabla
        .filter((f) => f.n === 68)
        .map((f) => f.estado)
        .sort(),
    ).toEqual(['pendiente', 'revisada']);
    for (const f of tabla) {
      expect(f.comprobado.length, `n.º ${f.n}`).toBeGreaterThan(30);
      expect(f.cambio.length, `n.º ${f.n}`).toBeGreaterThan(5);
    }
  });

  it('cada fila coincide con el estado de su afirmación en docs/claims.json', () => {
    const porId = new Map(claims.claims.map((c) => [c.id, c]));
    for (const f of tabla) {
      const c = porId.get(f.id);
      expect(c, `n.º ${f.n}: ${f.id}`).toBeDefined();
      expect(c?.revisionActuarial, `n.º ${f.n}: ${f.id}`).toBe(f.estado);
      if (f.estado === 'revisada') {
        expect(c?.respuestaActuarial).toBe(f.respuestaActuarial);
        expect(c?.preguntaActuarial).toBeUndefined();
      } else {
        expect(f.preguntaReducida?.length).toBeGreaterThan(80);
        expect(c?.preguntaActuarial?.length).toBeGreaterThan(40);
      }
    }
  });

  it('el número de afirmaciones pendientes baja respecto de las 69 de partida y no supera el tope', () => {
    const pendientes = claims.claims.filter(
      (c) => (c.revisionActuarial ?? claims.revisionActuarialPorDefecto) === 'pendiente',
    );
    expect(pendientes.length).toBeLessThan(69);
    expect(pendientes.length).toBeLessThanOrEqual(70);
    // Las pendientes son las de la tabla de la tanda 3 más las tres de la página «Mitos y realidades»
    // (afirmaciones 21, 25 y 27 del catálogo, que siguen pendientes): cada una con su pregunta reducida
    // y sin agrupar con otras.
    const web = ['web-mitos-jubilados-marco', 'web-mitos-pobreza', 'web-mitos-gasto-europa'];
    expect(pendientes.map((c) => c.id).sort()).toEqual(
      [...tabla.filter((f) => f.estado === 'pendiente').map((f) => f.id), ...web].sort(),
    );
  });

  it('las preguntas pendientes reducidas no repiten las de las respuestas ya aceptadas', () => {
    for (const f of tabla.filter((x) => x.estado === 'pendiente')) {
      expect(f.preguntaReducida, `n.º ${f.n}`).not.toMatch(/cuadra con carrera-jubilacion-65/);
      expect(f.preguntaReducida, `n.º ${f.n}`).not.toMatch(/77,x|95,x/);
    }
  });

  it('los textos de la tabla que pasan a la web no llevan palabras de valoración', () => {
    for (const f of tabla) expect(valoracionesEn(f.cambio), `n.º ${f.n}`).toEqual([]);
  });
});

describe('respuestaActuarial en el esquema de las afirmaciones', () => {
  const base = JSON.parse(JSON.stringify(leer('docs/claims.json'))) as {
    claims: Record<string, unknown>[];
  };
  const idRevisada = tabla.find((f) => f.estado === 'revisada')?.id;
  const copia = () => {
    const c = JSON.parse(JSON.stringify(base)) as typeof base;
    const claim = c.claims.find((x) => x['id'] === idRevisada);
    if (!claim) throw new Error('sin afirmación revisada');
    return { c, claim };
  };
  it('acepta las afirmaciones revisadas con su referencia', () => {
    expect(RegistroAfirmaciones.safeParse(base).success).toBe(true);
  });
  it('rechaza una revisada sin respuestaActuarial', () => {
    const { c, claim } = copia();
    delete claim['respuestaActuarial'];
    expect(RegistroAfirmaciones.safeParse(c).success).toBe(false);
  });
  it('rechaza una referencia con formato no válido', () => {
    const { c, claim } = copia();
    claim['respuestaActuarial'] = 'según el revisor';
    expect(RegistroAfirmaciones.safeParse(c).success).toBe(false);
    claim['respuestaActuarial'] = 'Tanda 3, parte D, n.º 4';
    expect(RegistroAfirmaciones.safeParse(c).success).toBe(false);
  });
  it('acepta las referencias de tanda 3 y la de la revisión del 14-11-2026', () => {
    const { c, claim } = copia();
    claim['respuestaActuarial'] = 'Tanda 3, parte B, n.º 22';
    expect(RegistroAfirmaciones.safeParse(c).success).toBe(true);
    claim['respuestaActuarial'] = 'Revisión del 14-11-2026';
    expect(RegistroAfirmaciones.safeParse(c).success).toBe(true);
  });
  it('rechaza respuestaActuarial en una afirmación que no está revisada', () => {
    const { c } = copia();
    const otra = c.claims.find((x) => x['revisionActuarial'] === undefined);
    if (!otra) throw new Error('sin afirmación sin estado');
    otra['respuestaActuarial'] = 'Tanda 3, parte A, n.º 31';
    expect(RegistroAfirmaciones.safeParse(c).success).toBe(false);
  });
});

describe('recálculo desde /data de las cifras de la parte A (parámetros)', () => {
  it('n.º 31: la base máxima de 2026 es la de 2025 × (1 + (revalorización + 1,2)/100)', () => {
    const base = parametro('base-maxima-rg');
    const rev = parametro('revalorizacion-general');
    const calc = v(base, '2025') * (1 + (v(rev, '2026') + 1.2) / 100);
    expect(redondea(calc, 2)).toBe(5100.97);
    expect(v(base, '2026')).toBe(5101.2);
    expect(Math.abs(calc - v(base, '2026'))).toBeLessThan(0.3);
  });

  it('n.º 52: la pensión máxima de 2026 con +0,115 puntos compuesto', () => {
    const pm = parametro('pension-maxima');
    const rev = parametro('revalorizacion-general');
    const calc = v(pm, '2025') * (1 + (v(rev, '2026') + 0.115) / 100);
    expect(redondea(calc, 2)).toBe(3359.58);
    expect(v(pm, '2026')).toBe(3359.6);
  });

  it('n.º 34 y 54: el divisor de 2026 a 2037 es el número de bases × 14/12 con dos decimales', () => {
    const divisor = parametro('divisor-base-reguladora');
    const archivo = leer('data/parametros/divisor-base-reguladora.json') as Archivo;
    let comprobados = 0;
    for (let anio = 2026; anio <= 2037; anio++) {
      const nota = archivo.data?.find((d) => d.period === String(anio))?.notes ?? '';
      const bases = Number(/(?:Se computan las|toman las) (\d+) bases/.exec(nota)?.[1]);
      expect(redondea((bases * 14) / 12, 2), String(anio)).toBe(v(divisor, String(anio)));
      comprobados++;
    }
    expect(comprobados).toBe(12);
    expect(v(divisor, '2037')).toBe(378);
    expect(v(parametro('periodo-calculo-base-reguladora'), '2037')).toBe(348);
  });

  it('n.º 35 y 36: la escala da 50 / 73,78 / 96,58 / 100 en 2026 y 50 / 72,80 / 95,60 / 100 en 2027', () => {
    const porcentaje = (meses: number, hasta1: number, p1: number, p2: number) => {
      const adicionales = Math.max(0, meses - 180);
      return Math.min(
        100,
        50 + Math.min(adicionales, hasta1) * p1 + Math.max(0, adicionales - hasta1) * p2,
      );
    };
    const esc = (anio: 2026 | 2027, anios: number) =>
      redondea(
        anio === 2026
          ? porcentaje(anios * 12, 49, 0.21, 0.19)
          : porcentaje(anios * 12, 248, 0.19, 0.18),
        2,
      );
    expect([15, 25, 35, 37].map((a) => esc(2026, a))).toEqual([50, 73.78, 96.58, 100]);
    expect([15, 25, 35, 37].map((a) => esc(2027, a))).toEqual([50, 72.8, 95.6, 100]);
    const para100 = parametro('cotizacion-para-100');
    expect(v(para100, '2026')).toBe(438);
    expect(v(para100, '2027')).toBe(444);
    // La jubilación a los 65 años exige más meses que el 100 % de la escala: son conceptos distintos.
    expect(v(parametro('carrera-jubilacion-65'), '2027')).toBe(462);
    expect(v(parametro('carrera-jubilacion-65'), '2027')).toBeGreaterThan(v(para100, '2027'));
  });

  it('n.º 49 y 50: el divisor de la opción de 25 años es la ventana × 14/12', () => {
    const ventana = parametro('opcion-25-anos-ventana');
    const divisor = parametro('opcion-25-anos-divisor');
    for (let anio = 2026; anio <= 2043; anio++)
      expect((v(ventana, String(anio)) * 14) / 12, String(anio)).toBeCloseTo(
        v(divisor, String(anio)),
        10,
      );
    expect(v(ventana, '2043')).toBe(318);
    expect(v(divisor, '2043')).toBe(371);
  });

  it('n.º 48: el tipo total del MEI es la suma del de la empresa y el del trabajador (2023-2029)', () => {
    const t = parametro('mei-tipo-total');
    const e = parametro('mei-tipo-empresa');
    const w = parametro('mei-tipo-trabajador');
    for (let a = 2023; a <= 2029; a++)
      expect(redondea(v(e, String(a)) + v(w, String(a)), 2), String(a)).toBe(v(t, String(a)));
  });

  it('n.º 51: 26 × 0,115 = 2,99 puntos hasta 2050 y la suma literal de la tabla de 2051 a 2065 es 145,6', () => {
    expect(redondea(26 * 0.115, 2)).toBe(2.99);
    const t = parametro('pension-maxima-incremento-2051-2065');
    let suma = 0;
    for (let a = 2051; a <= 2065; a++) suma += v(t, String(a));
    expect(redondea(suma, 1)).toBe(145.6);
    expect(v(t, '2065-convergencia-total')).toBe(30);
  });

  it('n.º 56: la revalorización recalculada con el IPC mensual da 3,772, 2,800 y 2,667 (publicadas con un decimal)', () => {
    const indice = new Map(
      ((leer('data/parametros/ipc-indice-mensual.json') as Archivo).data ?? []).map((d) => [
        d.id,
        d.value as number,
      ]),
    );
    const rev = (anio: number) => {
      let suma = 0;
      const meses: [number, number][] = [
        [anio - 2, 12],
        ...Array.from({ length: 11 }, (_, k): [number, number] => [anio - 1, k + 1]),
      ];
      for (const [a, m] of meses) {
        const mm = String(m).padStart(2, '0');
        suma += (v(indice, `${a}-${mm}`) / v(indice, `${a - 1}-${mm}`) - 1) * 100;
      }
      return suma / 12;
    };
    const publicada = parametro('revalorizacion-general');
    expect([2024, 2025, 2026].map((a) => redondea(rev(a), 3))).toEqual([3.772, 2.8, 2.667]);
    for (const a of [2024, 2025, 2026]) {
      expect(redondea(rev(a), 1)).toBe(v(publicada, String(a)));
      expect(String(v(publicada, String(a)))).toMatch(/^\d+(\.\d)?$/);
    }
  });

  it('n.º 28: la serie de revalorización general no tiene 2011 ni 2012', () => {
    const rev = parametro('revalorizacion-general');
    const faltan = Array.from({ length: 27 }, (_, i) => 2000 + i).filter(
      (a) => !rev.has(String(a)),
    );
    expect(faltan).toEqual([2011, 2012]);
  });
});

describe('base mínima de 2021 por tramos (n.º 32)', () => {
  const tramos = new Map(
    ((leer('data/parametros/base-minima-rg-2021-tramos.json') as Archivo).data ?? []).map((d) => [
      d.id,
      d,
    ]),
  );
  it('1.108,50 hasta agosto (valor del año en base-minima-rg) y 1.125,90 desde septiembre', () => {
    expect(tramos.get('2021-enero-agosto')?.value).toBe(1108.5);
    expect(tramos.get('2021-septiembre-diciembre')?.value).toBe(1125.9);
    expect(v(parametro('base-minima-rg'), '2021')).toBe(tramos.get('2021-enero-agosto')?.value);
  });
  it('la cuantía de septiembre es el SMI diario × 7/6 × 30 dentro del redondeo diario (art. 19.2)', () => {
    const diario = redondea(((32.17 * 7) / 6) * 1, 2);
    expect(redondea(diario * 30, 2)).toBe(1125.9);
  });
  it('lleva fuente, fecha de descarga y confianza (alta con el BOE; media para el valor deducido)', () => {
    const sep = tramos.get('2021-septiembre-diciembre') as unknown as Record<string, unknown>;
    expect(sep['confidence']).toBe('alta');
    expect(sep['fetchedAt']).toBe('2026-11-16');
    expect((sep['source'] as { url: string }).url).toContain('BOE-A-2021-20075');
    expect(
      (tramos.get('2021-enero-agosto') as unknown as Record<string, unknown>)['confidence'],
    ).toBe('media');
  });
});

describe('recálculo desde /data de las cifras de las partes B y C', () => {
  it('n.º 18 y 62: la identidad del Fondo (dotaciones + rendimientos − disposiciones) cuadra con el valor publicado', () => {
    const filas = readFileSync(path.join(RAIZ, 'data/sistema/fondo-reserva-anual.csv'), 'utf8')
      .trim()
      .split('\n');
    const cab = (filas[0] ?? '').split(',');
    const f2025 = (filas.find((l) => l.startsWith('2025,')) ?? '').split(',');
    const col = (n: string) => Number(f2025[cab.indexOf(n)]);
    const calc =
      col('dotaciones_acumuladas_meur') +
      col('rendimientos_netos_acum_meur') +
      col('disposiciones_acum_meur');
    expect(calc).toBe(14069);
    expect(col('valor_fondo_meur')).toBe(14070);
  });

  it('n.º 22, 60 y 61: saldos presupuestario, total y SEC de 2025 y su diferencia', () => {
    const nofin = serie(
      'sistema/deficit-presupuestario-seguridad-social',
      'saldo-presupuestario-no-financiero',
    );
    const ing = serie('sistema/deficit-presupuestario-seguridad-social', 'derechos-no-financieros');
    const gas = serie(
      'sistema/deficit-presupuestario-seguridad-social',
      'obligaciones-no-financieras',
    );
    const total = serie(
      'sistema/deficit-presupuestario-seguridad-social',
      'saldo-presupuestario-total',
    );
    const sec = serie('sistema/deficit-sec-fondos-seguridad-social', 'b9-mio-eur');
    expect(redondea(v(ing, '2025') - v(gas, '2025'), 2)).toBe(-7187.89);
    expect(v(nofin, '2025')).toBe(-7187.89);
    expect(v(total, '2025')).toBe(-1797.69);
    expect(v(sec, '2025')).toBe(-5612);
    expect(Math.round(Math.abs(v(nofin, '2025') - v(sec, '2025')))).toBe(1576);
  });

  it('n.º 63, 64 y 65: razones de pensiones y afiliados de 2025', () => {
    const pensiones = serie('sistema/pensionistas-pensiones-historico', 'pensiones');
    const pensionistas = serie('sistema/pensionistas-pensiones-historico', 'pensionistas');
    expect(redondea(v(pensiones, '2025') / v(pensionistas, '2025'), 3)).toBe(1.106);
    const afil = serie(
      'sistema/relacion-afiliados-pensiones-alternativa-1',
      'afiliados-ultimo-dia-diciembre',
    );
    const pen = serie(
      'sistema/relacion-afiliados-pensiones-alternativa-1',
      'pensiones-vigor-1-enero-siguiente',
    );
    expect(redondea(v(afil, '2025') / v(pen, '2025'), 3)).toBe(2.074);
    const r = serie('sistema/relacion-afiliados-pensiones', 'afiliados-diciembre-por-pensionista');
    expect(v(r, '2025')).toBe(2.3144);
    expect(
      v(serie('sistema/relacion-afiliados-pensiones', 'afiliados-media-anual-por-pension'), '2025'),
    ).toBe(2.0734);
  });

  it('n.º 67: los préstamos por año suman los acumulados del Tribunal de Cuentas y coinciden con los pasivos financieros de la ejecución', () => {
    const prestamos = serie('sistema/tribunal-cuentas-cge2023-ss', 'prestamos-concedidos-por-anio');
    let hasta2022 = 0;
    for (let a = 2017; a <= 2022; a++) hasta2022 += v(prestamos, String(a));
    expect(redondea(hasta2022, 1)).toBe(88994);
    expect(redondea(hasta2022 + v(prestamos, '2023'), 1)).toBe(98997.8);
    // Pasivos financieros de ingresos de la ejecución (derechos reconocidos, cierre del año).
    const filas = readFileSync(path.join(RAIZ, 'data/sistema/presupuesto-ss-ejecucion.csv'), 'utf8')
      .trim()
      .split('\n');
    const ejecucion = (anio: number) => {
      const fila = filas.find((l) => {
        const c = l.split(',');
        return (
          c[0] === String(anio) &&
          c[1] === `${anio}-T4` &&
          c[2] === 'ingresos' &&
          c[3] === '9. PASIVOS FINANCIEROS'
        );
      });
      return Number((fila ?? '').split(',')[7]);
    };
    for (let a = 2018; a <= 2023; a++)
      expect(Math.abs(ejecucion(a) - v(prestamos, String(a))), String(a)).toBeLessThan(0.1);
  });

  it('n.º 1 y 3: el factor real medio por edad y el factor de Lexis (triangulación de la mortalidad)', () => {
    const filas = readFileSync(
      path.join(RAIZ, 'data/demografia/triangulacion-factor-qx.csv'),
      'utf8',
    )
      .trim()
      .split('\n')
      .slice(1)
      .map((l) => l.split(','));
    const f = (sexo: string, edad: string, col: number) =>
      Number(filas.find((c) => c[0] === sexo && c[1] === edad)?.[col]);
    expect(f('hombres', '85', 2)).toBe(1.0635);
    expect(f('hombres', '85', 5)).toBe(1.0584);
    expect(f('mujeres', '85', 2)).toBe(1.0751);
    expect(f('mujeres', '85', 5)).toBe(1.0745);
    const medios = filas.map((c) => Number(c[2]));
    expect(redondea(Math.min(...medios), 2)).toBe(1.04);
    expect(redondea(Math.max(...medios), 2)).toBe(1.08);
    // El factor varía con la edad: un 1,10 constante supera la media de todas las edades.
    expect(Math.max(...medios)).toBeLessThan(1.1);
    // El factor de Lexis llega a 1,08 en mujeres de 80 años: no es el rango 1,03 a 1,07 del revisor.
    expect(redondea(f('mujeres', '80', 5), 2)).toBe(1.08);
  });

  it('n.º 2: supervivencia publicada ÷ defunciones de la generación, hombres de 85 años', () => {
    const filas = readFileSync(
      path.join(RAIZ, 'data/demografia/triangulacion-cohortes.csv'),
      'utf8',
    )
      .trim()
      .split('\n')
      .slice(1)
      .map((l) => l.split(','));
    const r = (ventana: string) =>
      Number(filas.find((c) => c[0] === ventana && c[1] === 'hombres' && c[2] === '85')?.[11]);
    expect([r('2000-2010'), r('2010-2020'), r('2015-2020'), r('2021-2024')]).toEqual([
      1.0898, 0.9673, 0.9882, 0.9985,
    ]);
  });

  it('n.º 4: muertes implícitas con Lexis y con qx frente a las bajas definitivas de jubilación de 2025', () => {
    const lexis = Number(
      (leer('data/demografia/triangulacion-mortalidad.json') as Archivo).data?.find(
        (d) => d.id === 'muertes-implicitas-pensiones-jubilacion-lexis',
      )?.value,
    );
    const qx = Number(
      (leer('data/demografia/triangulacion-mortalidad.json') as Archivo).data?.find(
        (d) => d.id === 'muertes-implicitas-pensiones-jubilacion-qx',
      )?.value,
    );
    const filas = readFileSync(
      path.join(RAIZ, 'data/sistema/altas-bajas-anual-clase-sexo.csv'),
      'utf8',
    )
      .trim()
      .split('\n')
      .map((l) => l.split(','));
    const bajas = Number(
      filas.find(
        (c) =>
          c[0] === '2025' &&
          c[1] === 'baja-definitiva' &&
          c[2] === 'jubilacion' &&
          c[3] === 'ambos',
      )?.[4],
    );
    expect(bajas).toBe(269250);
    expect(redondea((lexis / bajas - 1) * 100, 1)).toBe(-2);
    expect(redondea((qx / bajas - 1) * 100, 1)).toBe(-8);
  });

  it('n.º 7, 14, 15 y 17: razones de la pensión de las altas y de los salarios', () => {
    const c = (id: string) => serie('internacional/contraste-espana', id);
    expect(v(c('pension-altas-sobre-salario-eaes'), '2024')).toBe(0.7423);
    expect(v(c('pension-altas-sobre-salario-etcl-x12'), '2024')).toBe(0.7939);
    expect(v(c('pension-altas-sobre-salario-base-media-x12'), '2024')).toBe(0.8287);
    expect(v(c('pension-altas-sobre-salario-cn-puesto'), '2024')).toBe(0.5555);
    const sal = (id: string) => serie('macro/salario-medio-definiciones', id);
    const eaes = v(sal('eaes-ambos'), '2024');
    expect(redondea(v(sal('etcl-coste-salarial-total-x12'), '2024') / eaes, 3)).toBe(0.935);
    expect(redondea((v(sal('base-media-cotizacion-rg-ambos'), '2024') * 12) / eaes, 3)).toBe(0.896);
    const razon = (id: string) => serie('macro/salario-medio-razon-base-maxima', id);
    expect(redondea(v(razon('razon-eaes-ambos'), '2024'), 4)).toBe(0.5215);
    expect(redondea(v(razon('razon-base-media-cotizacion-rg-ambos'), '2025'), 3)).toBe(0.466);
  });

  it('n.º 9: la carrera de la OCDE (516 meses) supera los 462 de la DT 7.ª y los 444 del 100 %', () => {
    const d = ((leer('data/internacional/contraste-espana.json') as Archivo).data ?? []).find(
      (x) => x.id === 'meses-carrera-completa-desde-22-hasta-65',
    );
    expect(d?.value).toBe(516);
    expect(516).toBeGreaterThan(v(parametro('carrera-jubilacion-65'), '2027'));
    expect(516).toBeGreaterThan(v(parametro('cotizacion-para-100'), '2027'));
  });

  it('n.º 13: el gasto público en pensiones del Ageing Report 2024 pasa de 13,1 % (2022) a 17,3 % (2050)', () => {
    const s = serie('demografia/ageing-report-2024-espana', 'ageing-report-2024-ii-1-64');
    expect(redondea(v(s, '2022'), 1)).toBe(13.1);
    expect(redondea(v(s, '2050'), 1)).toBe(17.3);
    expect(redondea(v(s, '2050') - v(s, '2022'), 1)).toBe(4.2);
  });
});

describe('tasa bruta de reposición teórica con las reglas de /data (n.º 8, 10, 12 y 26)', () => {
  const periodo = parametro('periodo-calculo-base-reguladora');
  const divisor = parametro('divisor-base-reguladora');
  const regla = {
    ventana: v(periodo, '2037'),
    bases: Math.round((v(divisor, '2037') * 12) / 14),
    mesesNominales: 24,
  };
  const ocde = (id: string) => {
    const d = (
      (leer('data/internacional/ocde-supuestos-reposicion.json') as Archivo).data ?? []
    ).find((x) => x.id === id);
    return Number(d?.value);
  };
  const meses = Number(
    ((leer('data/internacional/contraste-espana.json') as Archivo).data ?? []).find(
      (x) => x.id === 'meses-carrera-completa-desde-22-hasta-65',
    )?.value,
  );
  const tasa = (real: number, inflacion: number) =>
    redondea(
      100 *
        tasaBrutaReposicion(
          { crecimientoReal: real / 100, inflacion: inflacion / 100, mesesCarrera: meses },
          regla,
        ),
      1,
    );

  it('las reglas de 2037 son 348 meses y 324 bases', () => {
    expect(regla).toEqual({ ventana: 348, bases: 324, mesesNominales: 24 });
  });
  it('n.º 8: con los supuestos de la OCDE da 81,8 %, a 1,4 puntos del 80,4 % de la OCDE', () => {
    const t = tasa(
      ocde('ocde-pag-2025-crecimiento-real-salarios-base'),
      ocde('ocde-pag-2025-inflacion-base'),
    );
    expect(t).toBe(81.8);
    const publicada = Number(
      ((leer('data/internacional/ocde-espana.json') as Archivo).data ?? []).find(
        (x) => x.id === 'gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024',
      )?.value,
    );
    expect(publicada).toBe(80.4);
    expect(redondea(t - publicada, 1)).toBe(1.4);
  });
  it('n.º 10 y 26: la tasa baja unos cinco puntos por cada 0,5 puntos más de crecimiento real', () => {
    expect([0, 0.75, 1, 1.25, 1.75].map((g) => tasa(g, 2))).toEqual([96.3, 87.2, 84.4, 81.8, 76.8]);
  });
  it('n.º 12: el escenario alternativo (0,75 % real y 1 % de inflación) da 88,8 %, frente al 88,0 % de la OCDE', () => {
    const t = tasa(
      ocde('ocde-pag-2025-crecimiento-real-salarios-alternativo'),
      ocde('ocde-pag-2025-inflacion-alternativo'),
    );
    expect(t).toBe(88.8);
    expect(ocde('ocde-pag-2025-tasa-bruta-reposicion-alternativo-esp')).toBe(88);
  });
  it('n.º 10: el crecimiento real medio anual de la EAES de 2008 a 2024 (deflactada con el IPC medio anual) es 0,07 %', () => {
    const eaes = serie('macro/salario-medio-definiciones', 'eaes-ambos');
    const ipc = parametro('ipc-indice-medio-anual');
    const real = v(eaes, '2024') / v(ipc, '2024') / (v(eaes, '2008') / v(ipc, '2008'));
    expect(redondea((real ** (1 / 16) - 1) * 100, 2)).toBe(0.07);
  });
});
