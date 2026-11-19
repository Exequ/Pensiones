/**
 * Página «Metodología»: estructura, índice accesible, respaldo de cada apartado, recuentos
 * mostrados, modelos con fiabilidad y límites, pendientes sin esconder y neutralidad del texto.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { valoracionesEn, veredictosEn } from '../../../scripts/lib/valoraciones.ts';
import { formatearNumero } from '../../engine/formato';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { buscarSeccion } from '../secciones';
import { APARTADOS_INDICE } from './apartados';
import Metodologia from './Pagina';
import { recuentos } from './recuentos';
import { LIMITES, REPOSITORIO, RESPALDO } from './respaldo';
import { TEXTOS_MODELOS } from './modelos';

const seccion = buscarSeccion('metodologia');

beforeAll(() => {
  Element.prototype.scrollIntoView = vi.fn();
});

const pintar = () =>
  render(
    <MemoryRouter>
      <Metodologia />
    </MemoryRouter>,
  );

const filasDe = (tabla: HTMLElement) => [...tabla.querySelectorAll('tbody tr')];

function tablaPorTitulo(contenedor: HTMLElement, titulo: string): HTMLElement {
  const t = [...contenedor.querySelectorAll('table')].find(
    (x) => x.querySelector('caption')?.textContent === titulo,
  );
  if (t === undefined) throw new Error(`Sin tabla «${titulo}»`);
  return t;
}

describe('estructura de la página', () => {
  it('tiene el título de la sección, el aviso de neutralidad y ningún marcador de construcción', () => {
    const { container } = pintar();
    expect(container.querySelector('h1')?.textContent).toBe(seccion.titulo);
    expect(container.querySelector('.hist-aviso')?.textContent).toMatch(
      /No defiende los resultados/,
    );
    expect(container.textContent).not.toMatch(/en construcci/i);
  });

  it('los apartados salen en el orden del índice, cada uno con su encabezado y su respaldo', () => {
    const { container } = pintar();
    const secciones = [...container.querySelectorAll<HTMLElement>('section.met-seccion')];
    expect(secciones.map((s) => s.id)).toEqual(APARTADOS_INDICE.map((e) => e.id));
    for (const [i, s] of secciones.entries()) {
      expect(s.querySelector('h2')?.textContent, s.id).toBe(APARTADOS_INDICE[i]?.titulo);
      expect(s.querySelector('h2')?.id).toBe(`${s.id}-titulo`);
      expect(
        s.querySelectorAll('a[href^="https://github.com/"], ul li').length,
        s.id,
      ).toBeGreaterThan(0);
    }
  });

  it('cada apartado, salvo «Qué no hace», termina con «Dónde consta» y enlaces a ficheros del repositorio', () => {
    const { container } = pintar();
    for (const [id, entradas] of Object.entries(RESPALDO)) {
      if (entradas.length === 0) continue;
      const lista = container.querySelector<HTMLElement>(`#met-${id}-respaldo`);
      expect(lista, id).not.toBeNull();
      const enlaces = [...(lista?.parentElement?.querySelectorAll<HTMLAnchorElement>('a') ?? [])];
      expect(enlaces.length, id).toBe(entradas.length);
      for (const [i, a] of enlaces.entries()) {
        expect(a.href).toBe(`${REPOSITORIO}/blob/main/${entradas[i]?.fichero ?? ''}`);
        expect(a.rel).toContain('noopener');
      }
    }
  });

  it('«Qué no hace esta web» lista todos los límites con su fichero', () => {
    const { container } = pintar();
    const items = [...container.querySelectorAll('#met-limites li')];
    expect(items.length).toBe(LIMITES.length);
    for (const [i, li] of items.entries()) {
      expect(li.textContent).toContain(LIMITES[i]?.texto.slice(0, 30));
      expect(li.querySelector('a')?.getAttribute('href')).toContain(LIMITES[i]?.fichero);
    }
  });

  it('enlaza con las otras secciones', () => {
    const { container } = pintar();
    const destinos = [...container.querySelectorAll('a')]
      .map((a) => a.getAttribute('href'))
      .filter((h): h is string => h !== null && h.startsWith('/'));
    for (const ruta of ['/tu-pension', '/como-se-calcula', '/proyecciones'])
      expect(destinos).toContain(ruta);
  });
});

describe('índice accesible y navegación con teclado', () => {
  it('el índice es una navegación con un enlace por apartado', () => {
    const { container } = pintar();
    const nav = screen.getByRole('navigation', { name: 'En esta página' });
    expect(nav.contains(container.querySelector('.indice-pagina'))).toBe(true);
    const enlaces = [...nav.querySelectorAll('a')];
    expect(enlaces.map((a) => a.textContent)).toEqual(APARTADOS_INDICE.map((e) => e.titulo));
    // Cada enlace lleva al encabezado de su apartado sin cambiar de ruta (`InternalLink`).
    expect(enlaces.map((a) => a.dataset.destino)).toEqual(
      APARTADOS_INDICE.map((e) => `${e.id}-titulo`),
    );
    // El `href` es la propia página (la ruta del `MemoryRouter` de la prueba), no un «#id».
    for (const a of enlaces) expect(a.getAttribute('href')).toBe('/');
  });

  it('con el teclado, Intro en un enlace del índice lleva el foco al encabezado del apartado', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const enlace = container.querySelector<HTMLAnchorElement>(
      '.indice-pagina a[data-destino="met-modelos-titulo"]',
    );
    expect(enlace).not.toBeNull();
    enlace?.focus();
    await usuario.keyboard('{Enter}');
    expect(document.activeElement?.id).toBe('met-modelos-titulo');
  });

  it('los encabezados de apartado admiten el foco programático y están en orden descendente', () => {
    const { container } = pintar();
    for (const h of container.querySelectorAll('section.met-seccion > h2'))
      expect(h.getAttribute('tabindex')).toBe('-1');
    const niveles = [...container.querySelectorAll('h1, h2, h3, h4')].map((h) =>
      Number(h.tagName[1]),
    );
    for (let i = 1; i < niveles.length; i++)
      expect((niveles[i] ?? 0) - (niveles[i - 1] ?? 0)).toBeLessThanOrEqual(1);
  });
});

describe('recuentos mostrados', () => {
  it('«De dónde salen los datos» muestra los recuentos de las fuentes, los ficheros y las confianzas', () => {
    const { container } = pintar();
    const texto = container.querySelector('#met-datos')?.textContent ?? '';
    const { fuentes, datos } = recuentos;
    for (const n of [
      fuentes.distintas,
      fuentes.organismos,
      datos.ficheros,
      datos.json,
      datos.csv,
      datos.elementosConConfianza.total,
      datos.elementosConConfianza.alta,
      datos.elementosConConfianza.media,
      datos.elementosConConfianza.baja,
    ])
      expect(texto).toContain(formatearNumero(n));
    const tabla = tablaPorTitulo(container, 'Ficheros de /data por carpeta');
    expect(filasDe(tabla).length).toBe(datos.porCarpeta.length);
  });

  it('las lecturas se muestran todas, con su estado, y los recuentos por estado', () => {
    const { container } = pintar();
    const tabla = tablaPorTitulo(
      container,
      'Lecturas abiertas del motor, con su estado y su valor por defecto',
    );
    expect(filasDe(tabla).length).toBe(LECTURAS_ABIERTAS.length);
    const estados = filasDe(tabla).map((f) => f.querySelectorAll('td, th')[1]?.textContent);
    expect(estados.filter((e) => e === 'Pendiente de decidir').length).toBe(
      recuentos.lecturas.estado.pendiente,
    );
    const texto = container.querySelector('#met-lecturas')?.textContent ?? '';
    expect(texto).toContain(`${formatearNumero(recuentos.lecturas.total)} lecturas abiertas`);
    expect(LECTURAS_ABIERTAS.length).toBe(recuentos.lecturas.total);
  });

  it('las afirmaciones con revisión pendiente se listan una a una, con su pregunta', () => {
    const { container } = pintar();
    const tabla = tablaPorTitulo(container, 'Afirmaciones con revisión actuarial pendiente');
    const filas = filasDe(tabla);
    expect(filas.length).toBe(recuentos.afirmaciones.revision.pendiente);
    expect(filas.length).toBe(recuentos.afirmaciones.pendientes.length);
    const ids = filas.map((f) => f.querySelector('th, td')?.textContent);
    expect(ids).toEqual(recuentos.afirmaciones.pendientes.map((p) => p.id));
    for (const f of filas) expect(f.textContent.length).toBeGreaterThan(80);
  });

  it('las tandas muestran el estado de cada parte, también las preguntas pendientes', () => {
    const { container } = pintar();
    const tabla = tablaPorTitulo(container, 'Tercera tanda: preguntas por parte y estado final');
    const filas = filasDe(tabla);
    expect(filas.length).toBe(recuentos.tandas.tanda3.partes.length);
    for (const [i, f] of filas.entries()) {
      const p = recuentos.tandas.tanda3.partes[i];
      const celdas = [...f.querySelectorAll('th, td')].map((c) => c.textContent);
      expect(celdas).toEqual([
        p?.parte,
        formatearNumero(p?.preguntasRevisadas ?? -1),
        formatearNumero(p?.preguntasPendientes ?? -1),
        formatearNumero(p?.afirmacionesRevisadas ?? -1),
      ]);
    }
  });

  it('los casos de oro y la auditoría muestran los recuentos calculados', () => {
    const { container } = pintar();
    const texto = container.querySelector('#met-comprobaciones')?.textContent ?? '';
    const { casosOro, auditoria, pruebas } = recuentos;
    expect(texto).toContain(
      `${formatearNumero(casosOro.total)} casos de oro: ${formatearNumero(casosOro.independientes)} independientes y ${formatearNumero(casosOro.derivados)} derivados de la norma`,
    );
    expect(texto).toContain(formatearNumero(pruebas.ficheros));
    const tabla = tablaPorTitulo(
      container,
      'Series contrastadas con una segunda fuente, por resultado',
    );
    expect(filasDe(tabla).length).toBe(auditoria.porResultado.length);
  });

  it('las tablas tienen título, cabeceras de columna y de fila', () => {
    const { container } = pintar();
    const tablas = [...container.querySelectorAll('table')];
    expect(tablas.length).toBeGreaterThanOrEqual(12);
    for (const t of tablas) {
      expect(t.querySelector('caption')?.textContent.length).toBeGreaterThan(5);
      expect(t.querySelectorAll('thead th[scope="col"]').length).toBeGreaterThan(1);
      for (const f of t.querySelectorAll('tbody tr'))
        expect(f.querySelector('th[scope="row"]')).not.toBeNull();
    }
  });
});

describe('los modelos de proyección', () => {
  it('cada modelo tiene su tarjeta con qué responde, hipótesis, fiabilidad indicada y límites', () => {
    const { container } = pintar();
    const tarjetas = [...container.querySelectorAll<HTMLElement>('article.met-modelo')];
    expect(tarjetas.length).toBe(recuentos.modelos.length);
    for (const [i, t] of tarjetas.entries()) {
      const m = recuentos.modelos[i];
      expect(t.querySelector('h3')?.textContent).toBe(m?.titulo);
      expect([...t.querySelectorAll('h4')].map((h) => h.textContent)).toEqual([
        'Qué responde',
        'Hipótesis',
        'Fiabilidad indicada',
        'Límites',
      ]);
      const texto = TEXTOS_MODELOS[m?.modelo ?? ''];
      expect(t.textContent).toContain(texto?.fiabilidad);
      const listas = t.querySelectorAll('ul');
      expect(listas[1]?.querySelectorAll('li').length).toBe(texto?.limites.length);
      expect(listas[1]?.querySelectorAll('li').length).toBeGreaterThanOrEqual(3);
      expect(t.querySelector('a')?.getAttribute('href')).toBe(
        `${REPOSITORIO}/blob/main/docs/modelos/${m?.modelo}_descripcion.md`,
      );
    }
  });

  it('los modelos sin salidas dicen que no tienen metadatos de confianza y los demás, su confianza y fecha', () => {
    const { container } = pintar();
    const tarjetas = [...container.querySelectorAll<HTMLElement>('article.met-modelo')];
    for (const [i, t] of tarjetas.entries()) {
      const m = recuentos.modelos[i];
      if (m === undefined) continue;
      if (m.ficheros === 0)
        expect(t.textContent).toContain('Sin ficheros ni metadatos de confianza en /data');
      else {
        expect(t.textContent).toContain(`Confianza de sus ficheros en /data: ${m.confianza ?? ''}`);
        expect(t.textContent).toContain(m.ejecutadoEl ?? '¿?');
      }
    }
  });

  it('la tabla de salidas coincide con los recuentos', () => {
    const { container } = pintar();
    const tabla = tablaPorTitulo(container, 'Salidas de los modelos en /data/proyecciones');
    const filas = filasDe(tabla);
    expect(filas.length).toBe(recuentos.modelos.length);
    for (const [i, f] of filas.entries()) {
      const m = recuentos.modelos[i];
      const celdas = [...f.querySelectorAll('th, td')].map((c) => c.textContent);
      expect(celdas[0]).toBe(m?.titulo);
      expect(celdas[1]).toBe(formatearNumero(m?.ficheros ?? -1));
      expect(celdas[2]).toBe(m?.confianza ?? 'Sin metadatos');
    }
  });
});

describe('neutralidad y texto', () => {
  it('el texto de la página, sin las tablas de datos, no tiene términos de valoración ni de veredicto', () => {
    const { container } = pintar();
    const copia = container.cloneNode(true) as HTMLElement;
    // Fuera las tablas de datos y los nombres de fichero (`code`): no son texto propio.
    for (const t of copia.querySelectorAll('.tabla-datos, code')) t.remove();
    const texto = copia.textContent;
    expect(valoracionesEn(texto)).toEqual([]);
    expect(veredictosEn(texto)).toEqual([]);
  });

  it('las tablas con datos propios del proyecto (recuentos y modelos) tampoco', () => {
    const { container } = pintar();
    for (const titulo of [
      'Series contrastadas con una segunda fuente, por resultado',
      'Direcciones de la muestra, por resultado',
      'Salidas de los modelos en /data/proyecciones',
      'Afirmaciones registradas por estado de revisión actuarial',
    ]) {
      const texto = tablaPorTitulo(container, titulo).textContent;
      expect(valoracionesEn(texto), titulo).toEqual([]);
      expect(veredictosEn(texto), titulo).toEqual([]);
    }
  });

  it('dice qué no hace y no defiende los resultados', () => {
    const { container } = pintar();
    const limites = within(
      container.querySelector<HTMLElement>('#met-limites') ?? container.ownerDocument.body,
    );
    expect(limites.getByRole('heading', { level: 2 }).textContent).toBe('Qué no hace esta web');
    expect(container.textContent).toMatch(/No defiende sus resultados ni los de ningún modelo/);
  });
});
