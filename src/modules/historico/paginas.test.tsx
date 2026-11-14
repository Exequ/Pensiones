import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import Cotizantes from '../cotizantes-y-pensionistas/Pagina';
import Financiacion from '../financiacion-y-deficit/Pagina';
import Hucha from '../hucha/Pagina';
import { buscarSeccion } from '../secciones';

function pintar(Pagina: () => React.JSX.Element) {
  return render(
    <MemoryRouter>
      <Pagina />
    </MemoryRouter>,
  );
}

const PAGINAS = [
  {
    nombre: 'Cotizantes y pensionistas',
    slug: 'cotizantes-y-pensionistas',
    Pagina: Cotizantes,
    minimo: 10,
  },
  {
    nombre: 'Financiación y déficit',
    slug: 'financiacion-y-deficit',
    Pagina: Financiacion,
    minimo: 6,
  },
  { nombre: 'Hucha', slug: 'hucha', Pagina: Hucha, minimo: 4 },
] as const;

describe.each(PAGINAS)('página «$nombre»', ({ slug, Pagina, minimo }) => {
  it('renderiza el título de la sección y sustituye el marcador en construcción', () => {
    pintar(Pagina);
    const seccion = buscarSeccion(slug);
    expect(screen.getByRole('heading', { level: 1, name: seccion.titulo })).toBeInTheDocument();
    expect(screen.queryByText('En construcción')).not.toBeInTheDocument();
  });

  it('cada gráfico lleva título, imagen con nombre, tabla de datos, fuente y «Cómo leerlo»', () => {
    const { container } = pintar(Pagina);
    const figuras = [...container.querySelectorAll('figure')];
    expect(figuras.length).toBeGreaterThanOrEqual(minimo);
    for (const figura of figuras) {
      const titulo = figura.querySelector('figcaption .grafico-titulo')?.textContent ?? '';
      expect(titulo.length, 'título del gráfico').toBeGreaterThan(5);
      const svg = figura.querySelector('svg[role="img"]');
      expect(svg, `imagen de «${titulo}»`).not.toBeNull();
      expect(svg?.getAttribute('aria-label')).toBe(titulo);
      const tabla = figura.querySelector('table');
      expect(tabla, `tabla de «${titulo}»`).not.toBeNull();
      expect(tabla?.querySelectorAll('th[scope="col"]').length).toBeGreaterThan(1);
      expect(tabla?.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
      const fuente = figura.querySelector('.linea-fuente');
      expect(fuente?.textContent, `fuente de «${titulo}»`).toMatch(
        /Fuentes?:.*descargado el \d{4}-\d{2}-\d{2}.*confianza: (alta|media|baja)/s,
      );
      const bloque = figura.closest('.bloque-grafico');
      expect(
        bloque?.querySelector('.como-leerlo-texto')?.textContent.length,
        `«Cómo leerlo» de «${titulo}»`,
      ).toBeGreaterThan(40);
    }
  });

  it('no muestra valores vacíos ni no numéricos en los textos', () => {
    const { container } = pintar(Pagina);
    expect(container.textContent).not.toMatch(/NaN|undefined|Infinity|\[object/);
  });

  it('lista al final lo que cubre y lo que queda fuera', () => {
    pintar(Pagina);
    const seccion = buscarSeccion(slug);
    const encabezado = screen.getByRole('heading', { name: /Qué cubre esta página/ });
    expect(encabezado).toBeInTheDocument();
    for (const punto of seccion.previsto) expect(screen.getByText(punto)).toBeInTheDocument();
  });
});

describe('interacciones', () => {
  it('«Cotizantes»: el selector de clase cambia los gráficos por edad', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar(Cotizantes);
    const titulos = () =>
      [...container.querySelectorAll('.grafico-titulo')].map((t) => t.textContent);
    expect(titulos().some((t) => t.includes('todas las clases'))).toBe(true);
    const grupo = screen.getAllByRole('group', { name: 'Clase de pensión' })[0]!;
    await usuario.click(within(grupo).getByRole('radio', { name: 'Viudedad' }));
    expect(titulos().some((t) => t.includes('viudedad'))).toBe(true);
  });

  it('«Cotizantes»: el selector de precios pasa a euros constantes', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar(Cotizantes);
    await usuario.click(screen.getByRole('radio', { name: 'Euros constantes' }));
    const titulos = [...container.querySelectorAll('.grafico-titulo')].map((t) => t.textContent);
    expect(titulos.some((t) => t.includes('euros constantes'))).toBe(true);
  });

  it('«Financiación»: el selector cambia las unidades a porcentaje del PIB', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar(Financiacion);
    await usuario.click(screen.getByRole('radio', { name: 'Porcentaje del PIB' }));
    const descripciones = [...container.querySelectorAll('.grafico-descripcion')].map(
      (t) => t.textContent,
    );
    expect(descripciones.some((t) => t.includes('porcentaje del PIB corriente'))).toBe(true);
    // La fuente del PIB aparece entonces entre las fuentes del gráfico.
    expect(container.textContent).toMatch(/Contabilidad Nacional/);
  });
});
