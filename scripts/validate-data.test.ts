// @vitest-environment node
import { execFile } from 'node:child_process';
import path from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { buscarNumerosSinFuente, validarDirectorio } from './lib/validar-datos.ts';

const ejecutar = promisify(execFile);
const FIXTURES = path.resolve(import.meta.dirname, 'fixtures');
const TSX = path.resolve(import.meta.dirname, '../node_modules/.bin/tsx');
const SCRIPT = path.resolve(import.meta.dirname, 'validate-data.ts');

async function validateData(directorio: string): Promise<{ codigo: number; salida: string }> {
  try {
    const { stdout, stderr } = await ejecutar(TSX, [SCRIPT, directorio]);
    return { codigo: 0, salida: stdout + stderr };
  } catch (e) {
    const error = e as { code: number; stdout: string; stderr: string };
    return { codigo: error.code, salida: error.stdout + error.stderr };
  }
}

describe('npm run validate:data (script real)', () => {
  it('pasa con un dato correcto', async () => {
    const { codigo, salida } = await validateData(path.join(FIXTURES, 'datos-validos'));
    expect(salida).toContain('Todos los datos cumplen el esquema');
    expect(codigo).toBe(0);
  }, 30_000);

  it('falla con un dato sin fuente', async () => {
    const { codigo, salida } = await validateData(path.join(FIXTURES, 'datos-sin-fuente'));
    expect(codigo).toBe(1);
    expect(salida).toContain('Dato numérico sin fuente verificable');
    expect(salida).toContain('data[0].value');
  }, 30_000);

  it('falla con una fuente sin fecha de descarga', async () => {
    const { codigo, salida } = await validateData(path.join(FIXTURES, 'datos-sin-fecha'));
    expect(codigo).toBe(1);
    expect(salida).toContain('falta fetchedAt');
  }, 30_000);
});

describe('validarDirectorio', () => {
  it('no da errores con los ejemplos válidos', async () => {
    const r = await validarDirectorio(path.join(FIXTURES, 'datos-validos'));
    expect(r.ficheros).toHaveLength(1);
    expect(r.errores).toEqual([]);
  });

  it('localiza el dato sin fuente', async () => {
    const r = await validarDirectorio(path.join(FIXTURES, 'datos-sin-fuente'));
    expect(r.errores.map((e) => e.ruta)).toContain('data[0].value');
  });
});

describe('buscarNumerosSinFuente', () => {
  it('ampara los números que cuelgan de un objeto con fuente y fecha', () => {
    const fuente = { title: 't', publisher: 'p', url: 'https://example.org' };
    expect(buscarNumerosSinFuente({ source: fuente, fetchedAt: '2024-01-01', value: 1 })).toEqual(
      [],
    );
    expect(
      buscarNumerosSinFuente({
        series: [{ source: fuente, fetchedAt: '2024-01-01', points: [{ value: 2 }] }],
      }),
    ).toEqual([]);
  });

  it('señala números sueltos o con fuente sin URL', () => {
    expect(buscarNumerosSinFuente({ total: 5 })).toEqual([['total']]);
    expect(
      buscarNumerosSinFuente({
        source: { title: 't', url: 'no-es-url' },
        fetchedAt: 'x',
        value: 3,
      }),
    ).toEqual([['value']]);
  });
});
