/**
 * Reproducibilidad del generador de afirmaciones y de fuentes (`scripts/etl/fuentes_claims.py`).
 *  1. Ejecutado dos veces, da exactamente la misma salida (`FUENTES.md`, `claims.json` y
 *     `REVISION_ACTUARIAL.md`).
 *  2. Esa salida coincide byte a byte con los ficheros versionados de `docs/`.
 *  3. No se pierde ninguna afirmación: todas las de `claims-web.json` (incluidas las nueve de
 *     «Reformas») están en `claims.json` con su mismo texto y su mismo estado.
 * Causa de la diferencia que motivó el test: el generador escribía con `json.dump` y tablas sin
 * formato, mientras que los ficheros versionados pasan por Prettier (`npm run lint`). El generador
 * da ahora el formato final con la misma configuración (véase `data/README.md`).
 */
import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

const RAIZ = path.resolve(import.meta.dirname, '..');
const FICHEROS = ['FUENTES.md', 'claims.json', 'REVISION_ACTUARIAL.md'];
const carpetas: string[] = [];

function genera(): string {
  const salida = mkdtempSync(path.join(tmpdir(), 'claims-'));
  carpetas.push(salida);
  const env = { ...process.env, SALIDA_DOCS: salida };
  delete env['FECHA_DESCARGA'];
  const r = spawnSync('python3', ['-I', path.join(RAIZ, 'scripts/etl/fuentes_claims.py')], {
    cwd: RAIZ,
    env,
    encoding: 'utf8',
  });
  expect(r.status, r.stderr).toBe(0);
  return salida;
}

const leer = (carpeta: string, fichero: string) =>
  readFileSync(path.join(carpeta, fichero), 'utf8');

afterAll(() => {
  for (const c of carpetas) rmSync(c, { recursive: true, force: true });
});

describe('generador de afirmaciones y fuentes', () => {
  const primera = genera();
  const segunda = genera();

  it.each(FICHEROS)('dos ejecuciones dan la misma salida: %s', (f) => {
    expect(leer(segunda, f)).toBe(leer(primera, f));
  });

  it.each(FICHEROS)('la salida coincide con docs/%s', (f) => {
    expect(leer(primera, f)).toBe(readFileSync(path.join(RAIZ, 'docs', f), 'utf8'));
  });

  it('no pierde ninguna afirmación de claims-web.json ni cambia su texto o su estado', () => {
    interface Afirmacion {
      id: string;
      texto: string;
      estado: string;
      revisionActuarial?: string;
    }
    const web = (
      JSON.parse(readFileSync(path.join(RAIZ, 'docs/claims-web.json'), 'utf8')) as {
        claims: Afirmacion[];
      }
    ).claims;
    const todas = (JSON.parse(leer(primera, 'claims.json')) as { claims: Afirmacion[] }).claims;
    const porId = new Map(todas.map((c) => [c.id, c]));
    expect(web.filter((c) => c.id.startsWith('web-reformas')).length).toBeGreaterThanOrEqual(9);
    for (const w of web) {
      const c = porId.get(w.id);
      expect(c, w.id).toBeDefined();
      expect(c?.texto, w.id).toBe(w.texto);
      expect(c?.estado, w.id).toBe(w.estado);
      if (w.revisionActuarial !== undefined) {
        expect(c?.revisionActuarial, w.id).toBe(w.revisionActuarial);
      }
    }
    expect(new Set(todas.map((c) => c.id)).size).toBe(todas.length);
  });
});
