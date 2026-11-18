import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { valoracionesEn } from '../../../scripts/lib/valoraciones.ts';
import { datosFinanciero } from './datos-financiero';
import { expectFuente, textoDeFuentes } from '../../test/fuentes';
import Financiero from './Financiero';
import Pagina from './Pagina';
import { COL4 } from './ids-financiero';
import { columnaM4 } from './series-financiero';

const d = datosFinanciero();

function pintar() {
  return render(
    <MemoryRouter>
      <Financiero />
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

const filasDeTabla = (figura: HTMLElement) =>
  [...figura.querySelectorAll('tbody tr')].map((f) => ({
    anio: Number(f.querySelector('th')?.textContent),
    celdas: [...f.querySelectorAll('td')].map((c) => c.textContent),
  }));

describe('bloque «Sistema financiero (M4)»', () => {
  // La carga diferida en un ejecutor lento (CI) puede tardar más de los cinco segundos por defecto.
  it('se carga bajo demanda dentro de la página «Proyecciones»', async () => {
    render(
      <MemoryRouter>
        <Pagina />
      </MemoryRouter>,
    );
    expect(
      await screen.findByRole('heading', { name: /^Sistema financiero/ }, { timeout: 40_000 }),
    ).toBeInTheDocument();
    // Los bloques anteriores siguen ahí.
    expect(screen.getByRole('heading', { name: /^Cotizantes y bases/ })).toBeInTheDocument();
  }, 60_000);

  it('muestra los siete apartados con título, subtítulos y el escenario leído de los metadatos', () => {
    const { container } = pintar();
    for (const nombre of [
      /^Gasto en pensiones contributivas$/,
      /^Pensión media$/,
      /^Cotizaciones, MEI y gasto en pensiones$/,
      /^Saldos: tres medidas$/,
      /^Fondo de Reserva$/,
      /^Contraste con el Ageing Report/,
      /^Posibles causas de la diferencia \(no verificadas\)$/,
    ]) {
      expect(screen.getByRole('heading', { name: nombre })).toBeInTheDocument();
    }
    expect(container.textContent).toMatch(
      /crecimiento real de los salarios del 1\s%\se IPC del 2\s%/,
    );
    expect(container.textContent).toMatch(/otros cuatro escenarios de sensibilidad/);
  });

  it('cada gráfico lleva título, imagen con nombre, tabla con la naturaleza del dato, fuente, nota y «Cómo leerlo»', () => {
    const { container } = pintar();
    const figuras = [...container.querySelectorAll('figure')];
    // a, b, c, d, valor del Fondo, flujos del Fondo, financiación adicional y contraste.
    expect(figuras).toHaveLength(8);
    for (const figura of figuras) {
      const titulo = figura.querySelector('figcaption .grafico-titulo')?.textContent ?? '';
      expect(titulo.length, 'título').toBeGreaterThan(5);
      expect(
        figura.querySelector('figcaption .grafico-descripcion')?.textContent.length,
      ).toBeGreaterThan(30);
      expect(figura.querySelector('svg[role="img"]')?.getAttribute('aria-label')).toBe(titulo);
      const tabla = figura.querySelector('table');
      expect(tabla, `tabla de «${titulo}»`).not.toBeNull();
      expect(tabla?.querySelector('thead')?.textContent).toMatch(/Naturaleza del dato/);
      expect(tabla?.querySelectorAll('tbody tr').length).toBeGreaterThan(0);
      const fuente = expectFuente(figura, `fuente de «${titulo}»`);
      expect(fuente).toMatch(/naturaleza: proyección (de modelo propio|publicada por la fuente)/);
      expect(figura.querySelector('.grafico-nota')?.textContent).toMatch(
        /no es un dato observado ni una previsión/,
      );
      expect(
        figura.closest('.bloque-grafico')?.querySelector('.como-leerlo-texto')?.textContent.length,
      ).toBeGreaterThan(80);
    }
  });

  it('la tabla de cada gráfico distingue los años observados de los proyectados sin repetir años', () => {
    const { container } = pintar();
    const filas = filasDeTabla(figuraDe(container, 'Gasto en pensiones contributivas: euros'));
    const anios = filas.map((f) => f.anio);
    expect(new Set(anios).size).toBe(anios.length);
    for (const f of filas)
      expect(f.celdas[0]).toBe(f.anio < d.anioInicio ? 'Observado' : 'Proyección');
    expect(filas.some((f) => f.celdas[0] === 'Observado')).toBe(true);
    expect(filas.some((f) => f.celdas[0] === 'Proyección')).toBe(true);
  });

  it('gasto: el selector de unidad cambia el gráfico, y en porcentaje del PIB se señala el cambio de definición', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    // La nota sobre el PIB es visible siempre.
    expect(container.textContent).toMatch(/Cambio de definición del PIB/);
    const grupo = screen.getByRole('group', { name: 'Unidad' });
    expect(within(grupo).getByRole('radio', { name: 'Euros corrientes' })).toBeChecked();
    const antes = figuraDe(container, 'Gasto en pensiones contributivas: euros');
    const ultimaEuros = filasDeTabla(antes).at(-1)?.celdas.at(-1);
    expect(antes.querySelector('table thead')?.textContent).not.toMatch(/PIB utilizado/);

    await usuario.click(within(grupo).getByRole('radio', { name: 'Porcentaje del PIB' }));
    const despues = figuraDe(container, 'Gasto en pensiones contributivas: porcentaje del PIB');
    expect(filasDeTabla(despues).at(-1)?.celdas.at(-1)).not.toBe(ultimaEuros);
    // El gráfico rotula el cambio y la tabla dice qué PIB se usa en cada fila.
    expect(despues.querySelector('svg')?.textContent).toMatch(/Proyección \(otro PIB\) →/);
    const filas = filasDeTabla(despues);
    expect(filas.find((f) => f.anio === d.anioInicio - 1)?.celdas[1]).toMatch(/INE/);
    expect(filas.find((f) => f.anio === d.anioInicio)?.celdas[1]).toMatch(/aproximado/);
    // El último año coincide con la columna en porcentaje del PIB de la salida de M4.
    const ultimo = columnaM4(d, COL4.gastoPctPib).at(-1)!.valor;
    expect(filas.at(-1)?.celdas.at(-1)).toBe(
      new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
        ultimo,
      ),
    );
    expect(despues.querySelector('.grafico-nota')?.textContent).toMatch(
      /denominador cambia de definición/,
    );
  });

  it('pensión media: el selector pasa a euros constantes con el IPC supuesto del escenario', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const corrientes = figuraDe(container, 'Pensión media mensual: euros corrientes');
    const proyectado = (figura: HTMLElement) =>
      filasDeTabla(figura).find((f) => f.anio === d.anioInicio + 1)?.celdas;
    const antes = proyectado(corrientes);
    const grupo = screen.getByRole('group', { name: 'Tipo de euros' });
    await usuario.click(within(grupo).getByRole('radio', { name: 'Euros constantes' }));
    const constantes = figuraDe(container, `euros constantes de ${d.anioInicio - 1}`);
    expect(constantes.querySelector('.grafico-descripcion')?.textContent).toMatch(
      /IPC supuesto del escenario \(2\s%/,
    );
    expect(textoDeFuentes(constantes)).toMatch(/Índice de Precios de Consumo/);
    expect(proyectado(constantes)).not.toEqual(antes);
  });

  it('saldos: tres medidas, la definición de cada una y el enlace a «Financiación y déficit»', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const euros = figuraDe(container, 'Saldos del sistema: euros corrientes');
    const cabeceras = [...euros.querySelectorAll('thead th')].map((c) => c.textContent);
    for (const medida of [
      'Cotizaciones menos pensiones',
      'Saldo sin transferencias',
      'Saldo no financiero',
    ]) {
      expect(cabeceras).toContain(medida);
    }
    expect(cabeceras).not.toContain('Ageing Report: balance de pensiones');
    const definiciones = [...container.querySelectorAll('table')].find((t) =>
      t.querySelector('caption')?.textContent.includes('Definición de las tres medidas'),
    );
    expect(definiciones?.querySelectorAll('tbody tr')).toHaveLength(3);
    expect(definiciones?.textContent).toMatch(/Ingreso Mínimo Vital/);
    const enlace = screen.getByRole('link', { name: /Financiación y déficit/ });
    expect(enlace).toHaveAttribute('href', '/financiacion-y-deficit');
    expect(container.textContent).toMatch(/no son idénticas a las que se muestran en la página/);

    // En porcentaje del PIB aparecen la nota del PIB (otra vez) y el balance del Ageing Report.
    const grupo = screen.getByRole('group', { name: 'Unidad de los saldos' });
    await usuario.click(within(grupo).getByRole('radio', { name: 'Porcentaje del PIB' }));
    const pib = figuraDe(container, 'Saldos del sistema: porcentaje del PIB');
    expect([...pib.querySelectorAll('thead th')].map((c) => c.textContent)).toContain(
      'Ageing Report: balance de pensiones',
    );
    expect(textoDeFuentes(pib)).toMatch(/proyección publicada por la fuente/);
    expect(container.textContent.match(/Cambio de definición del PIB/g)).toHaveLength(2);
  });

  it('Fondo: valor, dotaciones, disposiciones, límite legal y financiación adicional, con enlace a «Hucha»', () => {
    const { container } = pintar();
    expect(screen.getByRole('link', { name: /Hucha/ })).toHaveAttribute('href', '/hucha');
    expect(container.textContent).toMatch(/precio de adquisición/);
    expect(container.textContent).toMatch(/rentabilidad nominal anual implícita\s+es de 2,00\s%/);
    const flujos = figuraDe(container, 'Dotaciones y disposiciones del Fondo de Reserva');
    const cabeceras = [...flujos.querySelectorAll('thead th')].map((c) => c.textContent);
    expect(cabeceras).toContain('Límite legal de disposición');
    expect(textoDeFuentes(flujos)).toMatch(/Seguridad Social/);
    const adicional = figuraDe(
      container,
      'Disposición del Fondo de Reserva y financiación adicional',
    );
    expect(adicional.querySelector('.grafico-nota')?.textContent).toMatch(
      /lo que el Fondo no cubre|la parte de la necesidad/,
    );
    const tabla = [...container.querySelectorAll('table')].find((t) =>
      t
        .querySelector('caption')
        ?.textContent.includes('Límite legal de disposición del Fondo y disposición'),
    );
    expect(tabla?.querySelectorAll('tbody tr').length).toBeGreaterThan(10);
  });

  it('el último valor del Fondo se compara con la disposición de ese año sin valorarlo', () => {
    const { container } = pintar();
    expect(container.textContent).toMatch(/menor que la disposición de ese año/);
    expect(container.textContent).toMatch(/El modelo no calcula años posteriores/);
    expect(container.textContent).not.toMatch(/agot/);
  });

  it('contraste: índice con el primer año igual a cien, diferencias, niveles no comparables y candidatos no verificados', () => {
    const { container } = pintar();
    const figura = figuraDe(container, 'Gasto en pensiones sobre el PIB');
    const filas = filasDeTabla(figura);
    expect(filas).toHaveLength(25);
    expect(filas[0]?.celdas.slice(1)).toEqual(['100,0', '100,0']);
    expect(textoDeFuentes(figura)).toMatch(/Ageing Report/);
    expect(container.textContent).toMatch(/modelo menos Ageing Report/);
    expect(container.textContent).toMatch(/Los niveles no son comparables/);
    expect(container.textContent).toMatch(/candidatos no verificados/);
    const tablaDiferencias = [...container.querySelectorAll('table')].find((t) =>
      t
        .querySelector('caption')
        ?.textContent.includes('Diferencia entre el índice de gasto sobre el PIB'),
    );
    expect(tablaDiferencias?.querySelectorAll('tbody tr')).toHaveLength(25);
    expect(tablaDiferencias?.textContent).toMatch(/Nivel del Ageing Report/);
    const candidatos = [...container.querySelectorAll('table')].find((t) =>
      t.querySelector('caption')?.textContent.includes('candidatos'),
    );
    expect(candidatos?.querySelector('caption')?.textContent).toMatch(/no verificados/);
    expect(candidatos?.textContent).toMatch(/Tasa de reposición bruta/);
    expect(candidatos?.textContent).toMatch(/Crecimiento real del PIB aproximado/);
    // Sin explicar la diferencia como si estuviera demostrada.
    expect(container.textContent).toMatch(/no demuestra que sean su causa/);
  });

  it('«Cómo funciona este modelo»: plegable, cerrado, con sus apartados y sin cifras ni valoraciones', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const plegable = container.querySelector('details.proy-funciona')!;
    expect(plegable.hasAttribute('open')).toBe(false);
    expect(plegable.querySelector('summary')?.textContent).toBe('Cómo funciona este modelo');
    const texto = plegable.textContent;
    for (const apartado of [
      'Qué responde',
      'Cómo funciona',
      'Datos de entrada',
      'Variables principales',
      'Cómo leer los resultados',
      'Qué se puede cambiar en el código',
      'Qué no hace',
      'Comprobaciones y pendientes',
    ]) {
      expect(texto).toContain(apartado);
    }
    await usuario.click(plegable.querySelector('summary')!);
    expect(plegable.hasAttribute('open')).toBe(true);
    // Reformula las frases con valoración de la descripción de M4.
    expect(texto).not.toMatch(/aviso de tensi|más caro|se agotar|déficit estructural/i);
    expect(valoracionesEn(texto)).toEqual([]);
    // La lista de variables sale de los metadatos del fichero.
    expect(texto).toContain(
      d.m4.archivo.columnas.find((c) => c.id === 'financiacion_adicional')!.descripcion,
    );
    // El texto escrito a mano (sin la lista de variables) no lleva cifras de datos.
    const sinVariables = [...plegable.querySelectorAll('.proy-funciona-contenido > p')]
      .map((p) => p.textContent)
      .join(' ')
      .replace(/\bM\d\b/g, '');
    expect(sinVariables).not.toMatch(/\d/);
  });

  it('no muestra valores vacíos ni no numéricos y el texto no contiene palabras de valoración ni de alarma', () => {
    const { container } = pintar();
    const texto = container.textContent;
    expect(texto).not.toMatch(/NaN|undefined|Infinity|\[object/);
    expect(texto.length).toBeGreaterThan(8000);
    expect(valoracionesEn(texto)).toEqual([]);
  });

  it('el bloque señala que es proyección de un modelo propio y que no es una previsión', () => {
    const { container } = pintar();
    expect(container.textContent).toMatch(/Un cálculo\s+propio no es una previsión/);
  });
});
