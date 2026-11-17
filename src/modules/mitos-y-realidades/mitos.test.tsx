/**
 * Página «Mitos y realidades»: estructura de cada tarjeta, índice, orden del catálogo, enlaces y
 * cálculos que se muestran. La neutralidad y la ausencia de cifras escritas a mano se comprueban en
 * `neutralidad.test.tsx` y en `scripts/mitos-fase.test.ts`.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { buscarSeccion } from '../secciones';
import { catalogo, datosMitos } from './datos-mitos';
import MitosYRealidades from './Pagina';
import { TARJETAS } from './tarjetas';

function pintar() {
  return render(
    <MemoryRouter>
      <MitosYRealidades />
    </MemoryRouter>,
  );
}

const tarjetas = (c: HTMLElement) => [...c.querySelectorAll<HTMLElement>('section.mito')];

describe('página «Mitos y realidades»', () => {
  it('renderiza el título y sustituye el marcador en construcción', () => {
    pintar();
    expect(
      screen.getByRole('heading', { level: 1, name: buscarSeccion('mitos-y-realidades').titulo }),
    ).toBeInTheDocument();
    expect(screen.queryByText('En construcción')).not.toBeInTheDocument();
  });

  it('hay una tarjeta por afirmación del catálogo, en el orden del catálogo', () => {
    const { container } = pintar();
    const mitos = catalogo().mitos;
    expect(Object.keys(TARJETAS).sort()).toEqual(mitos.map((m) => m.id).sort());
    expect(tarjetas(container).map((t) => t.id)).toEqual(mitos.map((m) => m.id));
  });

  it('cada tarjeta lleva el enunciado literal, definiciones, «Cómo leerlo» y fuente', () => {
    const { container } = pintar();
    const mitos = catalogo().mitos;
    tarjetas(container).forEach((t, i) => {
      const mito = mitos[i]!;
      const titulo = t.querySelector('h2');
      expect(titulo?.textContent, mito.id).toBe(mito.enunciado);
      const nombres = [...t.querySelectorAll('.mito-definiciones dfn')].map((n) => n.textContent);
      expect(nombres, mito.id).toEqual(mito.definiciones.map((d) => d.nombre));
      expect(
        t.querySelectorAll('.como-leerlo').length,
        `«Cómo leerlo» de ${mito.id}`,
      ).toBeGreaterThan(0);
      expect(t.querySelector('.linea-fuente'), `fuente de ${mito.id}`).not.toBeNull();
      expect(t.textContent).toContain('Qué se puede medir');
      expect(t.textContent).toContain('Definiciones alternativas');
      expect(t.textContent).toContain('Qué no se puede concluir con los datos');
      for (const texto of mito.noSePuedeConcluir) expect(t.textContent).toContain(texto);
      for (const texto of mito.faltan ?? []) expect(t.textContent).toContain(texto);
    });
  });

  it('cada gráfico lleva imagen con nombre, tabla alternativa y fuente', () => {
    const { container } = pintar();
    const figuras = [...container.querySelectorAll('figure.grafico')];
    expect(figuras.length).toBeGreaterThanOrEqual(12);
    for (const f of figuras) {
      const titulo = f.querySelector('.grafico-titulo')?.textContent ?? '';
      const svg = f.querySelector('svg[role="img"]');
      expect(svg, titulo).not.toBeNull();
      expect(svg?.getAttribute('aria-label')).toBe(titulo);
      expect(f.querySelectorAll('tbody tr').length, titulo).toBeGreaterThan(0);
      expect(f.querySelector('.linea-fuente'), titulo).not.toBeNull();
    }
  });

  it('el índice enlaza con todas las afirmaciones, en orden, y mueve el foco al título', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const indice = screen.getByRole('navigation', { name: 'Afirmaciones' });
    const enlaces = within(indice).getAllByRole('link');
    const mitos = catalogo().mitos;
    expect(enlaces.map((a) => a.textContent)).toEqual(mitos.map((m) => m.enunciado));
    // jsdom no implementa scrollIntoView.
    Element.prototype.scrollIntoView = () => undefined;
    await usuario.click(enlaces[3]!);
    expect(container.ownerDocument.activeElement?.id).toBe(`${mitos[3]!.id}-titulo`);
  });

  it('los enlaces a otras páginas apuntan a rutas de secciones existentes', () => {
    const { container } = pintar();
    const rutas = [...container.querySelectorAll<HTMLAnchorElement>('.mito-enlaces a')].map((a) =>
      a.getAttribute('href'),
    );
    expect(rutas.length).toBeGreaterThan(12);
    for (const r of rutas) expect(r).toMatch(/^\/[a-z-]+$/);
  });

  it('no muestra el estado de la revisión interna del catálogo (voz de la web, fase R1); el catálogo lo conserva', () => {
    const { container } = pintar();
    const mitos = catalogo().mitos;
    expect(tarjetas(container)).toHaveLength(mitos.length);
    tarjetas(container).forEach((t, i) => {
      expect(t.querySelector('.mito-estado'), mitos[i]?.id).toBeNull();
      expect(t.textContent, mitos[i]?.id).not.toMatch(/revisi[oó]n actuarial/i);
    });
    // El estado sigue en los datos (y en «Metodología», que lista las afirmaciones pendientes).
    for (const mito of mitos) {
      expect(['pendiente', 'revisada'], mito.id).toContain(mito.revisionActuarial);
      if (mito.revisionActuarial === 'revisada')
        expect(mito.respuestaActuarial, mito.id).toMatch(/\S/);
    }
  });
});

describe('cálculos que muestra la página', () => {
  it('las filas de revalorización coinciden con /data y declaran los huecos', () => {
    const d = datosMitos().ipc;
    expect(d.aniosSinRevalorizacion.length).toBeGreaterThan(0);
    for (const [desde, hasta] of d.aniosSinRevalorizacion) {
      for (let a = desde; a <= hasta; a++) {
        const fila = d.filas.find((f) => f.anio === a);
        expect(fila?.revalorizacion, `revalorización ${a}`).toBeNull();
        expect(fila?.diferenciaMedia, `diferencia ${a}`).toBeNull();
      }
    }
  });

  it('la tarjeta del IPC no publica ningún acumulado', () => {
    const { container } = pintar();
    const t = container.querySelector('#pensiones-siempre-con-el-ipc');
    expect(t?.textContent).toMatch(/no muestra ningún acumulado/);
    expect(t?.textContent).not.toMatch(/acumulado de \w+ por ciento/);
  });

  it('la tarjeta del IPC resume la regla de 2011 de los BOE: suspensión, porcentaje de las excluidas y huecos que quedan (Fase 5-A4)', () => {
    const { container } = pintar();
    const t = container.querySelector('#pensiones-siempre-con-el-ipc');
    const r = datosMitos().ipc.regla2011;
    const tabla = [...(t?.querySelectorAll('table') ?? [])].find((x) =>
      /sin porcentaje general/.test(x.querySelector('caption')?.textContent ?? ''),
    );
    if (!tabla) throw new Error('Sin la tabla de la regla de 2011');
    const filas = [...tabla.querySelectorAll('tbody tr')].map((tr) =>
      [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
    );
    expect(filas).toHaveLength(3);
    expect(filas[0]?.[1]).toBe('Suspendida');
    expect(r.excluidas.valor).toBe(1);
    expect(filas[1]?.[1]).toBe('1,0\u00a0%');
    expect(filas[2]?.[1]).toBe('2,3\u00a0%');
    // cita el artículo y la norma de cada fila
    expect(filas[0]?.[2]).toMatch(/Artículo 4\.Uno/);
    expect(filas[1]?.[2]).toMatch(/Exposición de motivos/);
    // el año de la regla no es un hueco «sin norma» y sí lo sigue siendo el siguiente
    const texto = t?.textContent ?? '';
    expect(texto).toMatch(/De \d{4} consta la norma/);
    expect(texto).toMatch(/de\s+\d{4} no consta la norma/);
    expect(texto).toMatch(/no muestra ningún acumulado/);
    // el porcentaje de 2011 de la regla no entra en la serie general (la usa el motor)
    expect(datosMitos().ipc.filas.find((f) => f.anio === r.anio)?.revalorizacion).toBeNull();
  });

  it('la tarjeta de «cobran más de lo cotizado» no contiene cifras de lo cotizado ni de lo cobrado', () => {
    const { container } = pintar();
    const t = container.querySelector('#jubilados-cobran-mas-de-lo-cotizado');
    expect(t?.querySelector('figure')).toBeNull();
    const cuerpo = [...(t?.querySelectorAll('.mito-tabla, .como-leerlo, p') ?? [])]
      .map((n) => n.textContent)
      .join(' ');
    // Sin importes en euros ni porcentajes en la parte descriptiva del marco.
    expect(cuerpo).not.toMatch(/\d[\d.,]*\s?(€|%|euros)/);
  });

  it('el saldo se presenta con sus tres medidas', () => {
    const d = datosMitos().saldo;
    expect(d.medidas).toHaveLength(3);
    expect(d.diferencias).toHaveLength(3);
  });

  it('las tres medidas de la relación afiliados/pensiones son series distintas', () => {
    const d = datosMitos().cotizantes;
    const ids = [d.porPensionistaDiciembre, d.porPensionMediaAnual, d.porPensionUltimoDia].map(
      (s) => s.serie.id,
    );
    expect(new Set(ids).size).toBe(3);
  });
});
