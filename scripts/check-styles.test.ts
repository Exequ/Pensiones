// @vitest-environment node
import { describe, expect, it } from 'vitest';
import {
  auditarFichero,
  variablesDefinidas,
  variablesNoDefinidas,
} from './lib/auditoria-estilos.ts';

const reglas = (fichero: string, css: string) => auditarFichero(fichero, css).map((i) => i.regla);

describe('auditoría de estilos', () => {
  it('acepta CSS que solo usa tokens', () => {
    const css = `.a { color: var(--color-tinta); border-radius: 2px; box-shadow: none; font-family: var(--fuente-lectura); }`;
    expect(auditarFichero('a.css', css)).toEqual([]);
  });

  it('detecta sombras, degradados y desenfoques', () => {
    expect(reglas('a.css', '.a { box-shadow: 0 1px 2px var(--color-tinta); }')).toContain(
      'sin-sombras',
    );
    expect(reglas('a.css', '.a { background: linear-gradient(var(--a), var(--b)); }')).toContain(
      'sin-degradados',
    );
    expect(reglas('a.css', '.a { backdrop-filter: blur(4px); }')).toContain('sin-glassmorphism');
  });

  it('detecta radios mayores de 2 px', () => {
    expect(reglas('a.css', '.a { border-radius: 4px; }')).toContain('radio-maximo-2px');
    expect(reglas('a.css', '.a { border-radius: 50%; }')).toContain('radio-maximo-2px');
    expect(reglas('a.css', '.a { border-top-left-radius: 0.5rem; }')).toContain('radio-maximo-2px');
    expect(reglas('a.tsx', 'const s = { borderRadius: 8 };')).toContain('radio-maximo-2px');
    expect(reglas('a.css', '.a { border-radius: 0; }')).toEqual([]);
  });

  it('detecta colores fuera de los tokens', () => {
    expect(reglas('a.css', '.a { color: #ff0000; }')).toContain('colores-solo-tokens');
    expect(reglas('a.css', '.a { background: rgb(0 0 0); }')).toContain('colores-solo-tokens');
    expect(reglas('a.css', '.a { color: white; }')).toContain('colores-solo-tokens');
    expect(reglas('a.tsx', `const c = { fill: '#8C2F1B' };`)).toContain('colores-solo-tokens');
    expect(reglas('a.tsx', `<rect fill="white" />`)).toContain('colores-solo-tokens');
    expect(auditarFichero('tokens.css', ':root { --x: #fff; }', { permitirColores: true })).toEqual(
      [],
    );
  });

  it('detecta animaciones, fuentes sueltas y recursos externos', () => {
    expect(reglas('a.css', '.a { transition: color 0.2s; }')).toContain('sin-animaciones');
    expect(reglas('a.css', '.a { font-family: Arial; }')).toContain('fuentes-solo-tokens');
    expect(reglas('a.css', `@import url('https://fonts.googleapis.com/x');`)).toContain(
      'sin-recursos-externos',
    );
  });

  it('ignora los comentarios', () => {
    expect(auditarFichero('a.css', '/* box-shadow: 0 0 4px #000 */')).toEqual([]);
  });

  it('detecta variables no definidas', () => {
    const definidas = variablesDefinidas(':root { --color-tinta: #000; }');
    expect(variablesNoDefinidas('a.css', '.a { color: var(--color-tinta); }', definidas)).toEqual(
      [],
    );
    expect(
      variablesNoDefinidas('a.css', '.a { color: var(--color-nada); }', definidas),
    ).toHaveLength(1);
  });
});
