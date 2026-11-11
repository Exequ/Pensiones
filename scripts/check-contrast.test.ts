// @vitest-environment node
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { contraste, simularDaltonismo } from './lib/color.ts';
import {
  evaluarPares,
  evaluarSecuencial,
  evaluarSeparacion,
  leerTokensColor,
} from './lib/paleta.ts';

describe('cálculo de contraste', () => {
  it('coincide con los valores de referencia de WCAG', () => {
    expect(contraste('#000000', '#FFFFFF')).toBeCloseTo(21, 5);
    expect(contraste('#777777', '#FFFFFF')).toBeCloseTo(4.48, 2);
    expect(contraste('#FFFFFF', '#FFFFFF')).toBe(1);
  });

  it('la acromatopsia simulada conserva la luminancia', () => {
    const gris = simularDaltonismo('#8C2F1B', 'acromatopsia');
    expect(gris.slice(1, 3)).toBe(gris.slice(3, 5));
  });
});

describe('tokens reales del proyecto', async () => {
  const css = await readFile(path.resolve(import.meta.dirname, '../src/styles/tokens.css'), 'utf8');
  const tokens = leerTokensColor(css);

  it('resuelve alias de var()', () => {
    expect(tokens.get('--color-cat-1')).toBe(tokens.get('--color-cat-granate'));
    expect(tokens.get('--color-papel')).toBe('#F6F1E7');
  });

  it('todos los pares usados cumplen AA', () => {
    const fallidos = evaluarPares(tokens).filter((r) => !r.cumple);
    expect(fallidos).toEqual([]);
  });

  it('la paleta categórica es distinguible y la secuencial monótona', () => {
    expect(evaluarSeparacion(tokens).filter((r) => !r.cumple)).toEqual([]);
    expect(evaluarSecuencial(tokens)).toBe(true);
  });

  it('detecta un par que no cumple', () => {
    const malos = new Map(tokens);
    malos.set('--color-apagado', '#B0A898');
    expect(evaluarPares(malos).some((r) => r.primerPlano === '--color-apagado' && !r.cumple)).toBe(
      true,
    );
  });
});
