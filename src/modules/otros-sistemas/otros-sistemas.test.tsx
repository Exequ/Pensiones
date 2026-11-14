import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { formatearNumero } from '../../engine/formato';
import { buscarSeccion } from '../secciones';
import { serieEurostat, serieOcde } from './consultas';
import { datosSistemas } from './datos-sistemas';
import { MEDIDA } from './ids-datos';
import OtrosSistemas from './Pagina';
import { nombrePais, PAISES } from './paises';

function pintar() {
  return render(
    <MemoryRouter>
      <OtrosSistemas />
    </MemoryRouter>,
  );
}

const decimal1 = (v: number) => formatearNumero(v, { decimales: 1 });

/** Figura cuyo título contiene el texto dado. */
function figura(contenedor: HTMLElement, titulo: string): HTMLElement {
  const encontrada = [...contenedor.querySelectorAll('figure.grafico')].find((f) =>
    f.querySelector('.grafico-titulo')?.textContent.includes(titulo),
  );
  if (!(encontrada instanceof HTMLElement)) throw new Error(`Sin figura «${titulo}»`);
  return encontrada;
}

/** Filas de la tabla de una figura como listas de texto de celdas. */
function filas(f: HTMLElement): string[][] {
  return [...f.querySelectorAll('tbody tr')].map((tr) =>
    [...tr.querySelectorAll('th, td')].map((c) => c.textContent),
  );
}

describe('página «Otros sistemas»', () => {
  it('renderiza el título y sustituye el marcador en construcción', () => {
    pintar();
    expect(
      screen.getByRole('heading', { level: 1, name: buscarSeccion('otros-sistemas').titulo }),
    ).toBeInTheDocument();
    expect(screen.queryByText('En construcción')).not.toBeInTheDocument();
  });

  it('cada gráfico lleva título, imagen con nombre, tabla, fuente y «Cómo leerlo»', () => {
    const { container } = pintar();
    const figuras = [...container.querySelectorAll('figure')];
    expect(figuras.length).toBeGreaterThanOrEqual(7);
    for (const f of figuras) {
      const titulo = f.querySelector('figcaption .grafico-titulo')?.textContent ?? '';
      expect(titulo.length).toBeGreaterThan(5);
      const svg = f.querySelector('svg[role="img"]');
      expect(svg, `imagen de «${titulo}»`).not.toBeNull();
      expect(svg?.getAttribute('aria-label')).toBe(titulo);
      expect(f.querySelectorAll('table th[scope="col"]').length).toBeGreaterThan(1);
      expect(f.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
      expect(f.querySelector('.linea-fuente')?.textContent, `fuente de «${titulo}»`).toMatch(
        /Fuentes?:.*descargado el \d{4}-\d{2}-\d{2}.*confianza: (alta|media|baja)/s,
      );
      expect(
        f.closest('.bloque-grafico')?.querySelector('.como-leerlo-texto')?.textContent.length,
        `«Cómo leerlo» de «${titulo}»`,
      ).toBeGreaterThan(40);
    }
  });

  it('las dos medidas de un mismo concepto se muestran lado a lado', () => {
    const { container } = pintar();
    const paneles = [...container.querySelectorAll('.paneles-dos')];
    // Gasto (barras y líneas), edad (barras) y tasa de reposición (bruta y neta).
    expect(paneles.length).toBe(4);
    for (const p of paneles) expect(p.querySelectorAll('figure.grafico').length).toBe(2);
    expect(figura(container, 'Tasa de reposición bruta teórica')).toBeTruthy();
    expect(figura(container, 'Tasa de reposición neta teórica')).toBeTruthy();
  });

  it('el perímetro no verificado consta en las notas del gasto', () => {
    const { container } = pintar();
    const gasto = container.querySelector('#gasto')?.closest('section')?.textContent ?? '';
    expect(gasto).toMatch(/no verificado en las fuentes descargadas/);
    expect(gasto).toMatch(/Public expenditure on pensions/);
  });

  it('muestra en la tabla los países ordenados de mayor a menor valor y España con su diferencia', () => {
    const { container } = pintar();
    const d = datosSistemas();
    const f = figura(container, 'según la OCDE, ');
    const tabla = filas(f);
    const valores = tabla
      .map((r) => Number((r[1] ?? '').replace(',', '.')))
      .filter((v) => !Number.isNaN(v));
    expect(valores.length).toBeGreaterThan(3);
    expect([...valores].sort((a, b) => b - a)).toEqual(valores);
    // Fila de España: valor del último año de la OCDE y diferencia cero.
    const anio = serieOcde(d.ocde.observaciones, { medida: MEDIDA.gasto }, 'ESP').at(-1);
    const espana = tabla.find((r) => r[0] === 'España');
    expect(espana?.[1]).toBe(decimal1(anio?.valor ?? 0));
    expect(espana?.[2]).toBe(decimal1(0));
  });

  it('el selector de años cambia los valores de las barras', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosSistemas();
    const grupo = screen.getByRole('group', { name: 'Año de la comparación entre países' });
    const opciones = within(grupo).getAllByRole('radio');
    const primero = opciones[0];
    if (!primero) throw new Error('sin años');
    const etiqueta = primero.closest('label')?.textContent ?? '';
    await usuario.click(primero);
    const f = figura(container, `según Eurostat, ${etiqueta}`);
    const esperado = serieEurostat(
      d.eurostat.observaciones,
      { indicador: 'gasto-old-srv', unidad: 'PC_GDP' },
      'FRA',
    ).find((p) => p.anio === Number(etiqueta));
    const fila = filas(f).find((r) => r[0] === 'Francia');
    expect(fila?.[1]).toBe(esperado === undefined ? '—' : decimal1(esperado.valor));
  });

  describe('selector de países', () => {
    it('«Solo España» deja una fila en cada tabla de barras y en la estructura', async () => {
      const usuario = userEvent.setup();
      const { container } = pintar();
      await usuario.click(screen.getByRole('button', { name: 'Solo España' }));
      expect(filas(figura(container, 'según la OCDE, ')).length).toBe(1);
      expect(filas(figura(container, 'Tasa de reposición bruta teórica')).length).toBe(1);
      expect(container.querySelectorAll('.sistemas-pais').length).toBe(1);
      // Al quedar un solo país, su casilla no se puede desmarcar.
      expect(screen.getByRole('checkbox', { name: 'España' })).toBeDisabled();
    });

    it('«Elegir todos» muestra todos los países y agregados con dato', async () => {
      const usuario = userEvent.setup();
      const { container } = pintar();
      await usuario.click(screen.getByRole('button', { name: 'Elegir todos' }));
      const nombres = filas(figura(container, 'Tasa de reposición bruta teórica')).map((r) => r[0]);
      expect(nombres.length).toBe(PAISES.length);
      expect(nombres).toContain(nombrePais('OECD_REP'));
      // La estructura solo muestra países, no las medias.
      expect(container.querySelectorAll('.sistemas-pais').length).toBe(
        PAISES.filter((p) => p.tipo === 'pais').length,
      );
    });

    it('marcar y desmarcar una casilla añade y quita el país de los gráficos', async () => {
      const usuario = userEvent.setup();
      const { container } = pintar();
      const antes = filas(figura(container, 'Tasa de reposición bruta teórica')).map((r) => r[0]);
      expect(antes).not.toContain('Polonia');
      await usuario.click(screen.getByRole('checkbox', { name: 'Polonia' }));
      const despues = filas(figura(container, 'Tasa de reposición bruta teórica')).map((r) => r[0]);
      expect(despues).toContain('Polonia');
      await usuario.click(screen.getByRole('checkbox', { name: 'Polonia' }));
      const final = filas(figura(container, 'Tasa de reposición bruta teórica')).map((r) => r[0]);
      expect(final).not.toContain('Polonia');
    });
  });

  describe('tasa de reposición', () => {
    it('el nivel de salario cambia el título y los valores', async () => {
      const usuario = userEvent.setup();
      const { container } = pintar();
      const antes = filas(figura(container, 'Tasa de reposición bruta teórica')).map((r) => r[1]);
      const grupo = screen.getByRole('group', { name: 'Nivel de salario de la persona modelo' });
      await usuario.click(within(grupo).getByRole('radio', { name: '2 veces el salario medio' }));
      const f = figura(container, 'Tasa de reposición bruta teórica, 2 veces el salario medio');
      expect(filas(f).map((r) => r[1])).not.toEqual(antes);
    });

    it('con mujeres, la opción de planes voluntarios se desactiva y se avisa', async () => {
      const usuario = userEvent.setup();
      pintar();
      const grupoPlanes = screen.getByRole('group', { name: 'Planes que se incluyen' });
      await usuario.click(
        within(grupoPlanes).getByRole('radio', { name: 'Obligatorios y voluntarios' }),
      );
      const grupoSexo = screen.getByRole('group', { name: 'Sexo' });
      await usuario.click(within(grupoSexo).getAllByRole('radio', { name: 'Mujeres' })[0]!);
      expect(
        within(grupoPlanes).getByRole('radio', { name: 'Obligatorios y voluntarios' }),
      ).toBeDisabled();
      expect(screen.getByText(/solo para hombres/)).toBeInTheDocument();
    });

    it('muestra los supuestos de la OCDE y el escenario alternativo', () => {
      const { container } = pintar();
      const seccion = container.querySelector('#reposicion')?.closest('section')?.textContent ?? '';
      expect(seccion).toMatch(/Supuestos de la OCDE a la vista/);
      expect(seccion).toMatch(/Escenario alternativo/);
      expect(seccion).toMatch(/Persona modelo/);
      expect(seccion).toMatch(/no equivale a los cocientes/);
    });
  });

  it('la estructura de cada país lleva la cita literal, la localización y la confianza', () => {
    const { container } = pintar();
    const espana = [...container.querySelectorAll('.sistemas-pais')].find(
      (a) => a.getAttribute('aria-label') === 'España',
    );
    expect(espana).toBeTruthy();
    const rasgos = espana?.querySelectorAll('.sistemas-rasgo') ?? [];
    expect(rasgos.length).toBeGreaterThan(0);
    for (const r of rasgos) {
      expect(r.querySelector('blockquote')?.getAttribute('lang')).toBe('en');
      expect(r.textContent).toMatch(/confianza: (alta|media|baja)/);
    }
    expect(espana?.querySelector('.linea-fuente')).not.toBeNull();
  });

  it('el glosario se declara como explicación conceptual y no como dato', () => {
    const { container } = pintar();
    expect(container.textContent).toMatch(/no procede de una\s+fuente descargada/);
  });

  it('no muestra valores vacíos ni no numéricos', () => {
    const { container } = pintar();
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object/);
  });

  it('lista al final lo que cubre y lo que queda fuera', () => {
    pintar();
    for (const punto of buscarSeccion('otros-sistemas').previsto) {
      expect(screen.getByText(punto)).toBeInTheDocument();
    }
  });
});
