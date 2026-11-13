import { describe, expect, it } from 'vitest';
import { PAGINAS } from './modules/paginas';
import { SECCIONES } from './modules/secciones';

describe('registro de secciones', () => {
  it('cada sección tiene su módulo y una ruta única', () => {
    const slugs = SECCIONES.map((s) => s.slug);
    expect(new Set(slugs).size).toBe(slugs.length);
    // Una página puede ser un componente o un componente perezoso (objeto con `$$typeof`).
    for (const slug of slugs) expect(['function', 'object']).toContain(typeof PAGINAS[slug]);
  });

  it('los textos de las secciones no contienen cifras escritas a mano', () => {
    for (const seccion of SECCIONES) {
      const textos = [seccion.titulo, seccion.resumen, ...seccion.previsto].join(' ');
      expect(textos, seccion.slug).not.toMatch(/\d/);
    }
  });
});
