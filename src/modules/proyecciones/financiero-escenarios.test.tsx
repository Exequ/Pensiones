/**
 * Ajustes de M4: selector de escenario, tablas de comparación y del punto de partida, factor de calibración
 * y textos del bloque financiero. Las cifras se comparan con las de los ficheros de /data, no con valores
 * escritos a mano.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { valoracionesEn } from '../../../scripts/lib/valoraciones.ts';
import { formatearNumero } from '../../engine/formato';
import { valorEn } from '../../engine/series-historicas';
import { datosFinanciero } from './datos-financiero';
import Financiero from './Financiero';
import { COL4 } from './ids-financiero';
import { columnaM4, comparacionEscenarios } from './series-financiero';

const base = datosFinanciero();

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

const ultimaFila = (figura: HTMLElement): string[] => {
  const filas = [...figura.querySelectorAll('tbody tr')];
  const ultima = filas.at(-1)!;
  return [...ultima.querySelectorAll('td')].map((c) => c.textContent);
};

const selector = () => screen.getByRole('group', { name: /^Escenario de M4$/ });

describe('selector de escenario', () => {
  it('es un grupo de opciones nativas con leyenda: cinco escenarios y el base seleccionado por defecto', () => {
    pintar();
    const opciones = within(selector()).getAllByRole('radio');
    expect(opciones).toHaveLength(base.escenarios.length);
    base.escenarios.forEach((e, i) => {
      expect(opciones[i]).toHaveAccessibleName(e.etiqueta);
    });
    expect(opciones[0]).toBeChecked();
    expect(opciones.slice(1).every((o) => !(o as HTMLInputElement).checked)).toBe(true);
  });

  it('el escenario mostrado se anuncia en una región «polite» con lo que cambia', () => {
    const { container } = pintar();
    const aviso = container.querySelector('.proy-escenario-activo')!;
    expect(aviso.getAttribute('aria-live')).toBe('polite');
    expect(aviso.textContent).toContain(base.escenarios[0]!.etiqueta);
    expect(aviso.textContent).toMatch(/referencia/);
  });

  it('al elegir otro escenario cambian las series de todos los gráficos, los títulos y el aviso', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const antes = {
      gasto: ultimaFila(figuraDe(container, 'Gasto en pensiones contributivas')),
      saldos: ultimaFila(figuraDe(container, 'Saldos del sistema')),
      fondo: ultimaFila(figuraDe(container, 'Valor del Fondo de Reserva')),
      contraste: ultimaFila(figuraDe(container, 'índice')),
    };
    const g0 = base.escenarios.find((e) => e.id === 'g0')!;
    await usuario.click(within(selector()).getByRole('radio', { name: g0.etiqueta }));
    expect(within(selector()).getByRole('radio', { name: g0.etiqueta })).toBeChecked();
    expect(container.querySelector('.proy-escenario-activo')!.textContent).toContain(g0.etiqueta);
    expect(container.querySelector('.proy-escenario-activo')!.textContent).toMatch(
      /Cambia solo el crecimiento real de los salarios/,
    );

    const gasto = figuraDe(container, 'Gasto en pensiones contributivas');
    expect(gasto.querySelector('.grafico-titulo')!.textContent).toContain(
      `escenario ${g0.etiqueta}`,
    );
    expect(ultimaFila(gasto)).not.toEqual(antes.gasto);
    expect(ultimaFila(figuraDe(container, 'Saldos del sistema'))).not.toEqual(antes.saldos);
    expect(ultimaFila(figuraDe(container, 'Valor del Fondo de Reserva'))).not.toEqual(antes.fondo);
    expect(ultimaFila(figuraDe(container, 'índice'))).not.toEqual(antes.contraste);
  });

  it('la última fila de la tabla del gasto es la del escenario elegido (euros corrientes, miles de millones)', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    for (const e of base.escenarios) {
      await usuario.click(within(selector()).getByRole('radio', { name: e.etiqueta }));
      const esperado = valorEn(columnaM4(datosFinanciero(e.id), COL4.gasto), 2050)! / 1000;
      const celdas = ultimaFila(figuraDe(container, 'Gasto en pensiones contributivas'));
      expect(celdas.at(-1)).toBe(formatearNumero(esperado, { decimales: 1 }));
    }
  });

  it('lo observado no cambia con el escenario: la primera fila observada es la misma', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const primera = () =>
      [...figuraDe(container, 'Gasto en pensiones contributivas').querySelectorAll('tbody tr')][0]!
        .textContent;
    const antes = primera();
    await usuario.click(
      within(selector()).getByRole('radio', {
        name: base.escenarios.find((e) => e.id === 'ipc3')!.etiqueta,
      }),
    );
    expect(primera()).toBe(antes);
  });

  it('el euro constante de la pensión media usa el IPC del escenario elegido', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    await usuario.click(
      within(selector()).getByRole('radio', {
        name: base.escenarios.find((e) => e.id === 'ipc3')!.etiqueta,
      }),
    );
    await usuario.click(screen.getByRole('radio', { name: 'Euros constantes' }));
    const figura = figuraDe(container, 'Pensión media mensual');
    expect(figura.querySelector('.grafico-descripcion, figcaption')?.textContent).toMatch(
      /3\s%\sanual/,
    );
  });
});

describe('tablas de los escenarios', () => {
  it('describe los cinco escenarios con g, IPC y lo que cambia, y destaca el seleccionado', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const tabla = screen.getByRole('table', {
      name: /Los escenarios de M4 y lo que cambia en cada uno respecto al base/,
    });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(base.escenarios.length);
    expect(filas[0]).toHaveClass('destacada');
    expect(
      within(tabla)
        .getAllByRole('columnheader')
        .map((c) => c.getAttribute('scope')),
    ).toEqual(Array(4).fill('col'));
    await usuario.click(
      within(selector()).getByRole('radio', { name: base.escenarios[2]!.etiqueta }),
    );
    const despues = within(container).getAllByRole('row');
    expect(despues.some((f) => f.classList.contains('destacada'))).toBe(true);
    expect(filas[0]).not.toHaveClass('destacada');
    expect(filas[2]).toHaveClass('destacada');
  });

  it('la comparación en el último año coincide con comparacionEscenarios y rotula las unidades', () => {
    pintar();
    const c = comparacionEscenarios(base);
    const tabla = screen.getByRole('table', {
      name: new RegExp(`^Resultado de cada escenario en ${c.anio}`),
    });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(c.filas.length);
    c.filas.forEach((f, i) => {
      const celdas = within(filas[i]!).getAllByRole('cell');
      expect(celdas[0]!.textContent).toBe(formatearNumero(f.gastoPib!, { decimales: 2 }));
      expect(celdas[4]!.textContent).toBe(formatearNumero(f.fondo!, { decimales: 1 }));
    });
    const cabeceras = within(tabla)
      .getAllByRole('columnheader')
      .map((h) => h.textContent);
    expect(cabeceras.some((h) => /euros constantes de/.test(h))).toBe(true);
    expect(cabeceras.some((h) => /puntos de PIB/.test(h))).toBe(true);
  });

  it('el punto de partida observado de 2025 está en una tabla plegable con las líneas del LEEME', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const plegable = [...container.querySelectorAll('details')].find((d) =>
      d.querySelector('summary')?.textContent.includes('punto de partida'),
    )!;
    expect(plegable.hasAttribute('open')).toBe(false);
    await usuario.click(plegable.querySelector('summary')!);
    expect(plegable.hasAttribute('open')).toBe(true);
    for (const linea of base.filaObservada.descripcion)
      expect(plegable.textContent).toContain(linea);
    const tabla = within(plegable as HTMLElement).getByRole('table');
    const gasto = base.filaObservada.valores['gasto_pensiones']!;
    expect(tabla.textContent).toContain(formatearNumero(gasto, { decimales: 0 }));
    // La magnitud sin equivalente observado no consta en la tabla: no se rellena.
    expect(tabla.textContent).not.toMatch(/Financiación adicional/);
  });

  it('lo que es igual en los cinco escenarios se muestra tal cual lo recoge el LEEME', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const plegable = [...container.querySelectorAll('details')].find((d) =>
      d.querySelector('summary')?.textContent.includes('igual en todos los escenarios'),
    )!;
    await usuario.click(plegable.querySelector('summary')!);
    for (const linea of base.parametrosComunes) expect(plegable.textContent).toContain(linea);
  });

  it('«Cómo leerlo» explica qué cambia en cada escenario y la rentabilidad real del Fondo', () => {
    const { container } = pintar();
    const bloques = [...container.querySelectorAll('.como-leerlo')];
    const delSelector = bloques.find((b) =>
      b.textContent.includes('Cada escenario es un cálculo'),
    )!;
    for (const e of base.escenarios) expect(delSelector.textContent).toContain(e.etiqueta);
    expect(delSelector.textContent).toMatch(/rentabilidad real es 0,99\s%/);
    expect(delSelector.textContent).toMatch(/rentabilidad real es -0,97\s%/);
    expect(delSelector.textContent).not.toMatch(/-0\s%/);
  });
});

describe('factor de calibración', () => {
  it('la tabla tiene una fila por clase y el total, con los cocientes calculados con los datos', () => {
    pintar();
    expect(
      screen.getByRole('heading', {
        name: /Del número de pensiones al gasto: el factor de calibración/,
      }),
    ).toBeInTheDocument();
    const tabla = screen.getByRole('table', {
      name: /Gasto de la ejecución del presupuesto de 2025 frente a/,
    });
    const filas = within(tabla).getAllByRole('row').slice(1);
    expect(filas).toHaveLength(base.calibracion.clases.length + 1);
    [...base.calibracion.clases, base.calibracion.total].forEach((f, i) => {
      const celdas = within(filas[i]!).getAllByRole('cell');
      expect(celdas.at(-1)!.textContent).toBe(formatearNumero(f.factor, { decimales: 3 }));
    });
    expect(within(filas.at(-1)!).getByRole('rowheader')).toHaveTextContent('Todas las clases');
  });

  it('presenta los complementos a mínimos como partida aparte y la atribución como hipótesis no verificada', () => {
    const { container } = pintar();
    const texto = container.textContent;
    expect(texto).toContain(
      formatearNumero(base.calibracion.complementos.importe, { decimales: 1 }),
    );
    expect(texto).toMatch(/partida aparte/);
    expect(texto).toMatch(
      /hipótesis de su autor que no se ha verificado contra la metodología de la fuente/,
    );
    // No afirma que la pensión media incluya los complementos ni que la diferencia se deba a ellos.
    expect(texto).not.toMatch(/causa principal/i);
    expect(texto).not.toMatch(/parece incluirlos/i);
    expect(texto).not.toMatch(/la diferencia se debe a los complementos/i);
    expect(texto).not.toMatch(
      /la pensión media (estadística |de las estadísticas )?incluye los complementos/i,
    );
  });
});

describe('textos del bloque con los escenarios', () => {
  it('ningún escenario produce palabras de valoración, valores vacíos ni cifras no numéricas', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    for (const e of base.escenarios) {
      await usuario.click(within(selector()).getByRole('radio', { name: e.etiqueta }));
      const texto = container.textContent;
      expect(valoracionesEn(texto), e.id).toEqual([]);
      expect(texto, e.id).not.toMatch(/NaN|undefined|Infinity|\[object/);
    }
  });

  it('la valoración inicial del Fondo y su rentabilidad salen de los datos y se dice que no es valor de mercado', () => {
    const { container } = pintar();
    const texto = container.textContent;
    expect(texto).toContain(
      `${formatearNumero(base.filaObservada.valores['fondo_reserva']!, { decimales: 0 })} millones de euros a fin de ${base.filaObservada.anio}`,
    );
    expect(texto).toMatch(/rentabilidad nominal constante supuesta/);
    expect(texto).toMatch(/la misma todos los años y en todos los escenarios/);
    expect(texto).toMatch(/no es valor de mercado/);
  });

  it('mantiene el rótulo de proyección y la nota del PIB con cualquier escenario', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    await usuario.click(
      within(selector()).getByRole('radio', { name: base.escenarios[4]!.etiqueta }),
    );
    await usuario.click(screen.getAllByRole('radio', { name: 'Porcentaje del PIB' })[0]!);
    expect(container.textContent).toMatch(/Cambio de definición del PIB/);
    expect(container.textContent).toMatch(/Proyección \(otro PIB\)/);
    expect(container.textContent).toMatch(/Un cálculo\s+propio no es una previsión/);
  });
});
