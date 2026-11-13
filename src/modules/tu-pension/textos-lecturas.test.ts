import { describe, expect, it } from 'vitest';
import { lecturasOfrecidas } from '../../engine/comparar-lecturas';
import { TEXTOS_LECTURAS } from './textos-lecturas';

describe('textos de las lecturas', () => {
  it('hay texto para cada lectura ofrecida y cada uno de sus valores, y no sobra ninguno', () => {
    const ofrecidas = lecturasOfrecidas();
    expect(Object.keys(TEXTOS_LECTURAS).sort()).toEqual(ofrecidas.map((l) => l.id).sort());
    for (const l of ofrecidas) {
      const t = TEXTOS_LECTURAS[l.id]!;
      expect(t.titulo.length).toBeGreaterThan(5);
      expect(Object.keys(t.valores).sort()).toEqual([...l.alternativas].sort());
      for (const v of Object.values(t.valores)) {
        expect(v.etiqueta.length).toBeGreaterThan(3);
        expect(v.queCambia.length).toBeGreaterThan(20);
      }
    }
  });

  it('no contienen cifras escritas a mano (regla a de CLAUDE.md)', () => {
    const todo = Object.values(TEXTOS_LECTURAS).flatMap((t) => [
      t.titulo,
      ...Object.values(t.valores).flatMap((v) => [v.etiqueta, v.queCambia]),
    ]);
    expect(todo.join(' ')).not.toMatch(/\d/);
  });

  it('explican qué cambia y no recomiendan: sin lenguaje de consejo ni de «lectura correcta»', () => {
    const todo = Object.values(TEXTOS_LECTURAS)
      .flatMap((t) => Object.values(t.valores).flatMap((v) => [v.etiqueta, v.queCambia]))
      .join(' ')
      .toLowerCase();
    expect(todo).not.toMatch(
      /\b(mejor|peor|conviene|correcta|incorrecta|debes|debería)\b|recomend|aconsej/,
    );
  });
});
