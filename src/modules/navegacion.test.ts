import { describe, expect, it } from 'vitest';
import {
  GRUPOS_NAVEGACION,
  PAGINAS_SOBRE_LA_WEB,
  RUTAS_NAVEGACION,
  grupoDeRuta,
  grupoSobreLaWeb,
} from './navegacion';
import { SECCIONES } from './secciones';

describe('grupos del menú (única fuente de verdad)', () => {
  it('cada sección de SECCIONES pertenece a un único grupo', () => {
    for (const s of SECCIONES) {
      const grupos = GRUPOS_NAVEGACION.filter((g) => g.enlaces.some((e) => e.slug === s.slug));
      expect(grupos, s.slug).toHaveLength(1);
    }
  });

  it('las páginas generales están en «Sobre la web» y ninguna ruta se repite', () => {
    for (const p of PAGINAS_SOBRE_LA_WEB)
      expect(grupoDeRuta(`/${p.slug}`)?.id).toBe('sobre-la-web');
    const rutas = RUTAS_NAVEGACION.map((e) => e.ruta);
    expect(new Set(rutas).size).toBe(rutas.length);
    expect(rutas).toHaveLength(SECCIONES.length + PAGINAS_SOBRE_LA_WEB.length);
  });

  it('los grupos y su contenido son los acordados', () => {
    expect(GRUPOS_NAVEGACION.map((g) => [g.titulo, g.enlaces.map((e) => e.slug)])).toEqual([
      ['Tu pensión', ['tu-pension']],
      ['Cómo funciona', ['tipos-de-pension', 'como-se-calcula', 'reformas']],
      [
        'El sistema por dentro',
        ['financiacion-y-deficit', 'hucha', 'cotizantes-y-pensionistas', 'proyecciones'],
      ],
      ['Comparar y contrastar', ['otros-sistemas', 'mitos-y-realidades']],
      ['Sobre la web', ['metodologia', 'fuentes', 'cambios']],
    ]);
  });

  it('solo un grupo es directo y tiene una única ruta', () => {
    const directos = GRUPOS_NAVEGACION.filter((g) => g.directo);
    expect(directos.map((g) => g.enlaces.length)).toEqual([1]);
  });

  it('los títulos de grupos y enlaces salen de SECCIONES y no contienen cifras', () => {
    for (const e of RUTAS_NAVEGACION) {
      const s = SECCIONES.find((x) => x.slug === e.slug);
      if (s) expect(e.titulo).toBe(s.tituloNav);
    }
    const textos = [
      ...GRUPOS_NAVEGACION.map((g) => g.titulo),
      ...RUTAS_NAVEGACION.map((e) => e.titulo),
    ];
    for (const t of textos) expect(t).not.toMatch(/\d/);
  });

  it('el pie repite el grupo «Sobre la web»', () => {
    expect(grupoSobreLaWeb().enlaces.map((e) => e.titulo)).toEqual([
      'Metodología',
      'Fuentes',
      'Registro de cambios',
    ]);
  });
});
