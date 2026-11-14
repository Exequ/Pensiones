import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { valoracionesEn } from '../../../scripts/lib/valoraciones.ts';
import { buscarSeccion } from '../secciones';
import { datosProyecciones } from './datos-proyecciones';
import Pagina from './Pagina';

function pintar() {
  return render(
    <MemoryRouter>
      <Pagina />
    </MemoryRouter>,
  );
}

const figuraDe = (container: HTMLElement, parte: string): HTMLElement => {
  const figura = [...container.querySelectorAll('figure')].find((f) =>
    f.querySelector('.grafico-titulo')?.textContent.includes(parte),
  );
  if (!figura) throw new Error(`No hay un gráfico cuyo título incluya «${parte}»`);
  return figura;
};

describe('página «Proyecciones»', () => {
  it('renderiza el título de la sección, la introducción y los tres bloques', () => {
    pintar();
    const seccion = buscarSeccion('proyecciones');
    expect(screen.getByRole('heading', { level: 1, name: seccion.titulo })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /Qué es una proyección/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Demografía/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Pensiones en vigor/ })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /^Cotizantes y bases/ })).toBeInTheDocument();
  });

  it('la introducción dice qué no es una proyección y muestra el escenario leído de los metadatos', () => {
    const { container } = pintar();
    const intro = container.querySelector('#proy-que-es')?.closest('section');
    expect(intro?.textContent).toMatch(/No es una predicción ni un pronóstico oficial/);
    expect(intro?.textContent).toMatch(/legislación actual congelada/);
    const esc = datosProyecciones().m3.resumen.archivo.escenario;
    const tabla = intro?.querySelector('table');
    expect(tabla?.textContent).toMatch(/(^|\D)1\s%/); // g = 0,01 del LEEME, formateado es-ES
    expect(tabla?.textContent).toMatch(/(^|\D)2\s%/); // IPC = 0,02
    expect(esc.g).toBeCloseTo(0.01, 12);
    expect(intro?.textContent).toMatch(/Salvo la demografía/);
  });

  it('cada gráfico lleva título, imagen con nombre, tabla, fuente con su naturaleza, nota de proyección y «Cómo leerlo»', () => {
    const { container } = pintar();
    const figuras = [...container.querySelectorAll('figure')];
    // Demografía: 2 + prueba hacia atrás + 2 de escenarios; pensiones: 3 + contraste; cotizantes: 4.
    expect(figuras.length).toBeGreaterThanOrEqual(13);
    for (const figura of figuras) {
      const titulo = figura.querySelector('figcaption .grafico-titulo')?.textContent ?? '';
      expect(titulo.length, 'título').toBeGreaterThan(5);
      expect(
        figura.querySelector('figcaption .grafico-descripcion')?.textContent.length,
      ).toBeGreaterThan(30);
      const svg = figura.querySelector('svg[role="img"]');
      expect(svg, `imagen de «${titulo}»`).not.toBeNull();
      expect(svg?.getAttribute('aria-label')).toBe(titulo);
      const tabla = figura.querySelector('table');
      expect(tabla, `tabla de «${titulo}»`).not.toBeNull();
      expect(tabla?.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
      const fuente = figura.querySelector('.linea-fuente');
      expect(fuente?.textContent, `fuente de «${titulo}»`).toMatch(
        /Fuentes?:.*descargado el \d{4}-\d{2}-\d{2}.*confianza: (alta|media|baja)/s,
      );
      // Siempre se ve de qué naturaleza es cada fuente: nunca una proyección sin rotular.
      expect(fuente?.textContent).toMatch(/naturaleza: /);
      // La prueba hacia atrás compara el modelo con datos ya observados: no es una proyección.
      if (!titulo.startsWith('Error del modelo')) {
        expect(figura.querySelector('.grafico-nota')?.textContent).toMatch(
          /no es un dato observado ni una previsión/,
        );
      }
      expect(
        figura.closest('.bloque-grafico')?.querySelector('.como-leerlo-texto')?.textContent.length,
        `«Cómo leerlo» de «${titulo}»`,
      ).toBeGreaterThan(80);
    }
  });

  it('las fuentes de las salidas de los modelos se rotulan «proyección de modelo propio»', () => {
    const { container } = pintar();
    const fuente = figuraDe(container, 'Pensiones contributivas en vigor: total').querySelector(
      '.linea-fuente',
    )?.textContent;
    expect(fuente).toMatch(/Elaboración propia: modelo de proyección/);
    expect(fuente).toMatch(/naturaleza: proyección de modelo propio/);
    // Y el dato observado de la misma figura no se presenta como proyección.
    expect(fuente).toMatch(/Seguridad Social/);
  });

  it('la tabla de cada gráfico distingue los años observados de los proyectados', () => {
    const { container } = pintar();
    const tabla = figuraDe(container, 'Pensiones contributivas en vigor: total').querySelector(
      'table',
    )!;
    const celdas = [...tabla.querySelectorAll('tbody tr')].map((fila) => ({
      anio: Number(fila.querySelector('th')?.textContent),
      tipo: fila.querySelectorAll('td')[0]?.textContent,
    }));
    const inicio = Math.min(...datosProyecciones().m3.resumen.filas.map((f) => Number(f['anio'])));
    for (const c of celdas) {
      expect(c.tipo).toBe(c.anio < inicio ? 'Observado' : 'Proyección');
    }
    expect(celdas.some((c) => c.tipo === 'Observado')).toBe(true);
    expect(celdas.some((c) => c.tipo === 'Proyección')).toBe(true);
  });

  it('M1: lo posterior al horizonte se rotula «ilustrativo» en la tabla y en el gráfico', () => {
    const { container } = pintar();
    const figura = figuraDe(container, 'Población de mayores: observada');
    const tipos = [...figura.querySelectorAll('tbody tr')].map(
      (f) => f.querySelectorAll('td')[0]?.textContent,
    );
    expect(tipos).toContain('Proyección (ilustrativa)');
    expect(figura.querySelector('svg')?.textContent).toMatch(/ilustrativo/);
    expect(figura.querySelector('svg')?.textContent).toMatch(/Proyección →/);
    const horizonte = datosProyecciones().m1.contraste.archivo.modelo.horizontePresentacion;
    expect(screen.getByText(new RegExp(`llega hasta ${horizonte}`))).toBeInTheDocument();
  });

  it('M1: el selector de escenarios usa los rótulos del CSV y cambia el gráfico y la tabla', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const grupo = screen.getByRole('group', { name: 'Escenario demográfico' });
    const rotulos = within(grupo)
      .getAllByRole('radio')
      .map((r) => r.parentElement?.textContent);
    expect(rotulos).toEqual([
      'INE (base)',
      'fecundidad -20 %',
      'fecundidad +20 %',
      'sin migración',
      'migración -50 %',
      'mortalidad -1 % anual extra',
    ]);
    expect(within(grupo).getByRole('radio', { name: 'INE (base)' })).toBeChecked();
    const antes = figuraDe(container, 'Población de mayores en el escenario');
    expect(antes.querySelector('.grafico-titulo')?.textContent).toContain('INE (base)');
    const valorBase = [...antes.querySelectorAll('tbody tr')].at(-1)?.textContent;
    const columnasAntes = antes.querySelectorAll('thead th').length;
    await usuario.click(within(grupo).getByRole('radio', { name: 'sin migración' }));
    const despues = figuraDe(container, 'Población de mayores en el escenario');
    expect(despues.querySelector('.grafico-titulo')?.textContent).toContain('sin migración');
    expect(despues.querySelector('svg')?.textContent).toContain('sin migración');
    expect(despues.querySelectorAll('thead th').length).toBeGreaterThan(columnasAntes);
    expect([...despues.querySelectorAll('tbody tr')].at(-1)?.textContent).not.toBe(valorBase);
  });

  it('M3: los selectores de clase y año cambian el reparto por edad y sexo', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const grupo = screen.getByRole('group', { name: 'Clase de pensión' });
    const tabla = () =>
      figuraDe(container, 'Pensiones por grupo de edad y sexo').querySelector('table')!;
    const suma = () =>
      [...tabla().querySelectorAll('tbody tr')]
        .map((f) => f.querySelectorAll('td')[0]?.textContent)
        .join('|');
    const inicial = suma();
    await usuario.click(within(grupo).getByRole('radio', { name: 'Viudedad' }));
    const viudedad = suma();
    expect(viudedad).not.toBe(inicial);
    expect(
      figuraDe(container, 'Pensiones por grupo de edad y sexo').querySelector('.grafico-titulo')
        ?.textContent,
    ).toMatch(/viudedad/);
    const selectorAnio = screen.getByRole('combobox', { name: 'Año' });
    const anios = within(selectorAnio)
      .getAllByRole('option')
      .map((o) => o.textContent);
    expect(anios.length).toBe(25);
    await usuario.selectOptions(selectorAnio, anios.at(-1) ?? '');
    expect(suma()).not.toBe(viudedad);
    expect(
      figuraDe(container, 'Pensiones por grupo de edad y sexo').querySelector('.grafico-titulo')
        ?.textContent,
    ).toContain(anios.at(-1));
  });

  it('cada bloque lleva un apartado plegable «Cómo funciona este modelo», cerrado al empezar', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const plegables = [...container.querySelectorAll('details.proy-funciona')];
    expect(plegables).toHaveLength(3);
    for (const p of plegables) {
      expect(p.hasAttribute('open')).toBe(false);
      expect(p.querySelector('summary')?.textContent).toBe('Cómo funciona este modelo');
      const texto = p.textContent;
      expect(texto).toMatch(/Qué hace/);
      expect(texto).toMatch(/Datos de entrada/);
      expect(texto).toMatch(/Variables principales/);
      expect(texto).toMatch(/Qué se puede cambiar en el código/);
      expect(texto).toMatch(/Qué no hace/);
    }
    const resumen = plegables[0]?.querySelector('summary');
    expect(resumen).toBeTruthy();
    await usuario.click(resumen!);
    expect(plegables[0]?.hasAttribute('open')).toBe(true);
  });

  it('contrasta con el Ageing Report en índice y describe la diferencia sin valorarla', () => {
    const { container } = pintar();
    for (const parte of [
      'Pensiones del modelo y pensionistas del Ageing Report',
      'Afiliados por pensión del modelo y cotizantes',
    ]) {
      const figura = figuraDe(container, parte);
      const filas = [...figura.querySelectorAll('tbody tr')];
      expect(filas.length).toBeGreaterThan(20);
      // El primer año vale cien en las dos series.
      const primera = [...(filas[0]?.querySelectorAll('td') ?? [])].map((c) => c.textContent);
      expect(primera.slice(1)).toEqual(['100,0', '100,0']);
      expect(figura.querySelector('.linea-fuente')?.textContent).toMatch(/Ageing Report/);
      expect(figura.querySelector('.linea-fuente')?.textContent).toMatch(
        /naturaleza: proyección publicada por la fuente/,
      );
    }
    expect(container.textContent).toMatch(/modelo menos Ageing Report/);
  });

  it('M2: la definición de la relación se contrasta con la del histórico y se avisa del salto de fecha', () => {
    const { container } = pintar();
    const tabla = [...container.querySelectorAll('table')].find((t) =>
      t.querySelector('caption')?.textContent.includes('Definición del modelo'),
    );
    expect(tabla?.textContent).toMatch(/octubre/);
    expect(tabla?.textContent).toMatch(/Primer día de diciembre|primer día de diciembre/);
    expect(container.textContent).toMatch(/salto de definición/);
  });

  it('no muestra valores vacíos ni no numéricos', () => {
    const { container } = pintar();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object/);
  });

  it('lista al final lo que cubre y lo que queda fuera', () => {
    pintar();
    const seccion = buscarSeccion('proyecciones');
    expect(screen.getByRole('heading', { name: /Qué cubre esta página/ })).toBeInTheDocument();
    for (const punto of seccion.previsto) expect(screen.getByText(punto)).toBeInTheDocument();
  });

  it('el texto renderizado no contiene palabras de valoración ni de alarma', () => {
    const { container } = pintar();
    expect(container.textContent.length).toBeGreaterThan(5000);
    expect(valoracionesEn(container.textContent)).toEqual([]);
  });
});
