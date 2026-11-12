// @vitest-environment node
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { inventario } from './inventario-casos-oro.ts';
import { RAIZ } from './lib/motor-jubilacion.ts';

describe('inventario de casos de oro', () => {
  it('docs/INVENTARIO_CASOS_ORO.md está al día (npx tsx scripts/inventario-casos-oro.ts)', () => {
    const actual = readFileSync(path.join(RAIZ, 'docs/INVENTARIO_CASOS_ORO.md'), 'utf8');
    expect(actual.trimEnd()).toBe(inventario().trimEnd());
  });

  it('cumple los mínimos del encargo: 12 casos de PNC y 6 de MEI', () => {
    const t = inventario();
    const pnc = /\| Pensiones no contributivas \| (\d+) \|/g;
    const sumaPnc = [...t.matchAll(pnc)].reduce((a, m) => a + Number(m[1]), 0);
    expect(sumaPnc).toBeGreaterThanOrEqual(12);
    expect(Number(/\| MEI y solidaridad \| (\d+) \|/.exec(t)?.[1])).toBeGreaterThanOrEqual(6);
  });
});
