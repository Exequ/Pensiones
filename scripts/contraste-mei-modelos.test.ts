// @vitest-environment node
/**
 * Contraste de los parámetros del MEI de /data con los que usa el modelo M4 (solo lectura de
 * modelos/m4/m4_financiero.py; no se modifica). Las diferencias, si las hay, se anotan en
 * docs/DISCREPANCIAS.md (Fase 2-B-3).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos } from '../src/engine/esquema-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (f: string) =>
  ArchivoDatos.parse(
    JSON.parse(readFileSync(path.join(RAIZ, 'data/parametros', `${f}.json`), 'utf8')) as unknown,
  );
const M4 = readFileSync(path.join(RAIZ, 'modelos/m4/m4_financiero.py'), 'utf8');
const regla = (id: string): number => {
  const d = leer('mei-reglas').data?.find((x) => x.id === id);
  if (typeof d?.value !== 'number') throw new Error(`falta mei-reglas#${id}`);
  return d.value;
};

describe('MEI: /data frente a modelos/m4 (solo lectura)', () => {
  it('M4 lee el tipo total de mei-tipo-total.json', () => {
    expect(M4).toContain('"mei-tipo-total.json"');
  });

  it('el último año de efecto de M4 coincide con la DT 43.ª de /data', () => {
    const m = /self\.mei_ultimo_anio = (\d{4})/.exec(M4);
    expect(m?.[1]).toBeDefined();
    expect(Number(m?.[1])).toBe(regla('ultimo-anio'));
  });

  it('M4 mantiene el tipo del último año de la serie hasta 2050: coincide con la regla de 2030 a 2050', () => {
    expect(M4).toContain('d.mei_tipo[min(t, max(d.mei_tipo))]');
    const serie = leer('mei-tipo-total').data ?? [];
    const ultimo = serie.reduce((a, b) => (Number(b.period) > Number(a.period) ? b : a));
    expect(ultimo.value).toBe(regla('tipo-total-2030-2050'));
    expect(Number(ultimo.period)).toBe(2029);
  });

  it('M4 no aplica MEI después del último año (0): la ley no fija el tipo y el motor lanza NoImplementada', () => {
    expect(M4).toMatch(/if t > d\.mei_ultimo_anio:\s+return 0\.0/);
  });

  it('el reparto empresa/trabajador suma el tipo total en cada año (2023-2029 y 2030-2050)', () => {
    const e = leer('mei-tipo-empresa').data ?? [];
    const t = leer('mei-tipo-trabajador').data ?? [];
    const total = leer('mei-tipo-total').data ?? [];
    for (const d of total) {
      const a = e.find((x) => x.period === d.period)?.value as number;
      const b = t.find((x) => x.period === d.period)?.value as number;
      expect(a + b).toBeCloseTo(d.value as number, 9);
    }
    expect(regla('tipo-empresa-2030-2050') + regla('tipo-trabajador-2030-2050')).toBeCloseTo(
      regla('tipo-total-2030-2050'),
      9,
    );
  });
});
