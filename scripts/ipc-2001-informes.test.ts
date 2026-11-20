// @vitest-environment node
/**
 * Prueba del punto 5 de la cuarta tanda actuarial (Ajustes actuariales 4): ¿coinciden las
 * variaciones mes a mes de los factores de 2001 de los informes del autocálculo de la Seguridad
 * Social con las de la serie de base 1992 del INE (IPC2401)? Si coincidieran a siete decimales, se
 * usaría IPC2401 para todo 2001, encadenada en diciembre de 2001.
 *
 * Dentro de un mismo informe (misma referencia), factor(m1) ÷ factor(m2) = índice(m2) ÷ índice(m1):
 * la variación entre dos meses de 2001 no depende del enlace con 2002. Los factores son los de
 * `src/engine/jubilacion/ipc-informes.test.ts` (informes del 13/11/2026 que aportó Sergio).
 *
 * Resultado: no coinciden (diferencias de hasta un 1,1 %; la base 1992 no recoge el descenso de julio
 * de 2001 que sí recogen los informes), y el enlace actual (variaciones anuales de 2002, IPC290750)
 * queda más cerca (menos de un 0,05 %). Se mantiene el enlace actual.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos } from '../src/engine/esquema-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');

const INFORMES: readonly Readonly<Record<string, number>>[] = [
  {
    '2001-06': 1.6659269,
    '2001-08': 1.6767853,
    '2001-09': 1.6684318,
    '2001-10': 1.6596746,
    '2001-11': 1.6561403,
    '2001-12': 1.6518492,
  },
  {
    '2001-08': 1.7095982,
    '2001-09': 1.7010883,
    '2001-10': 1.6921528,
    '2001-11': 1.6885546,
    '2001-12': 1.6841756,
  },
  { '2001-11': 1.6664713, '2001-12': 1.6621501 },
];

function ipc2401(): Map<string, number> {
  const d = JSON.parse(
    readFileSync(path.join(RAIZ, 'data-raw/ine/ipc-mensual/IPC2401.json'), 'utf8'),
  ) as { Data: { Anyo: number; FK_Periodo: number; Valor: number | null }[] };
  const m = new Map<string, number>();
  for (const x of d.Data)
    if (x.Valor !== null)
      m.set(`${String(x.Anyo)}-${String(x.FK_Periodo).padStart(2, '0')}`, x.Valor);
  return m;
}

function motor(): Map<string, number> {
  const a = ArchivoDatos.parse(
    JSON.parse(readFileSync(path.join(RAIZ, 'data/parametros/ipc-indice-mensual.json'), 'utf8')),
  );
  return new Map((a.data ?? []).map((d) => [d.id, Number(d.value)]));
}

/** Variaciones consecutivas de cada informe: [mes1, mes2, índice(mes2) ÷ índice(mes1) según el informe]. */
function variaciones(): [string, string, number][] {
  const salida: [string, string, number][] = [];
  for (const f of INFORMES) {
    const meses = Object.keys(f).sort();
    for (let i = 1; i < meses.length; i++) {
      const a = meses[i - 1];
      const b = meses[i];
      if (a === undefined || b === undefined) continue;
      salida.push([a, b, (f[a] ?? Number.NaN) / (f[b] ?? Number.NaN)]);
    }
  }
  return salida;
}

describe('IPC de 2001: informes del autocálculo frente a la serie de base 1992 (IPC2401)', () => {
  const v = variaciones();
  const i92 = ipc2401();
  const enlace = motor();
  const desvio = (serie: Map<string, number>) =>
    Math.max(
      ...v.map(([a, b, inf]) =>
        Math.abs(inf / ((serie.get(b) ?? Number.NaN) / (serie.get(a) ?? Number.NaN)) - 1),
      ),
    );

  it('compara diez variaciones mes a mes de tres informes', () => {
    expect(v).toHaveLength(10);
  });

  it('IPC2401 no coincide a siete decimales: la diferencia llega a más del 1 %', () => {
    expect(desvio(i92)).toBeGreaterThan(0.01);
    const coinciden = v.filter(
      ([a, b, inf]) =>
        inf.toFixed(7) === ((i92.get(b) ?? Number.NaN) / (i92.get(a) ?? Number.NaN)).toFixed(7),
    );
    expect(coinciden).toHaveLength(0);
  });

  it('el enlace actual (variaciones anuales de 2002) queda más cerca, por debajo del 0,05 %', () => {
    expect(desvio(enlace)).toBeLessThan(5e-4);
    expect(desvio(enlace)).toBeLessThan(desvio(i92));
  });
});
