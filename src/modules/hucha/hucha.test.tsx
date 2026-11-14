import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { formatearNumero } from '../../engine/formato';
import { posicionIlustrativa } from '../../engine/transferencias';
import { datosHucha } from '../historico/datos-hucha';
import Hucha from './Pagina';

function pintar() {
  return render(
    <MemoryRouter>
      <Hucha />
    </MemoryRouter>,
  );
}

const entero = (v: number) => formatearNumero(v, { decimales: 0 });

/** Figura cuyo título contiene el texto dado. */
function figura(contenedor: HTMLElement, titulo: string): HTMLElement {
  const encontrada = [...contenedor.querySelectorAll('figure.grafico')].find((f) =>
    f.querySelector('.grafico-titulo')?.textContent.includes(titulo),
  );
  if (!(encontrada instanceof HTMLElement)) throw new Error(`Sin figura «${titulo}»`);
  return encontrada;
}

/** Última fila de la tabla de datos de una figura, como texto de celdas. */
function ultimaFila(f: HTMLElement): string[] {
  const filas = f.querySelectorAll('tbody tr');
  const ultima = filas[filas.length - 1];
  return [...(ultima?.querySelectorAll('th, td') ?? [])].map((c) => c.textContent);
}

describe('página «Hucha»: secciones de transferencias', () => {
  it('muestra las cuatro secciones nuevas con su encabezado', () => {
    pintar();
    for (const nombre of [
      /De dónde procede el dinero/,
      /transferencias del Estado a la Seguridad Social en el tiempo/,
      /El Fondo de Reserva frente a las transferencias/,
      /Una construcción ilustrativa/,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: nombre })).toBeInTheDocument();
    }
  });

  it('la construcción lleva el aviso de «no es una cifra oficial» y en el título del gráfico', () => {
    const { container } = pintar();
    expect(screen.getAllByText(/no una cifra oficial/i).length).toBeGreaterThanOrEqual(2);
    expect(figura(container, 'Construcción ilustrativa, no una cifra oficial')).toBeTruthy();
  });

  it('cada gráfico nuevo tiene tabla, línea de fuente y «Cómo leerlo»', () => {
    const { container } = pintar();
    for (const titulo of [
      'Transferencias corrientes del Estado y organismos autónomos a la Seguridad Social, por año',
      'por trimestre',
      'Transferencias acumuladas desde',
      'El valor del Fondo de Reserva, en meses de transferencias',
      'Construcción ilustrativa',
      'Deuda PDE de las Administraciones de Seguridad Social',
    ]) {
      const f = figura(container, titulo);
      expect(f.querySelector('table'), titulo).not.toBeNull();
      expect(f.querySelector('.linea-fuente')?.textContent, titulo).toMatch(/descargado el/);
      expect(f.closest('.bloque-grafico')?.querySelector('.como-leerlo'), titulo).not.toBeNull();
    }
  });

  it('las casillas son casillas con etiqueta, accesibles por teclado, y recalculan la suma', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosHucha();
    const grafico = () => figura(container, 'Construcción ilustrativa');
    const esperada = (seleccion: { fondo: boolean; deuda: boolean; transferencias: boolean }) => {
      const filas = posicionIlustrativa(
        {
          fondo: d.valor.puntos,
          deuda: d.deuda.finAno.puntos,
          transferenciasAnuales: d.transferencias.delEstado.puntos,
        },
        d.transferencias.delEstado.puntos[0]?.anio ?? 0,
        seleccion,
      );
      return filas.at(-1)?.suma ?? null;
    };

    const casillaDeuda = screen.getByRole('checkbox', { name: /Deuda con el Estado/ });
    expect(casillaDeuda).toBeChecked();
    expect(ultimaFila(grafico()).at(-1)).toBe(
      entero(esperada({ fondo: true, deuda: true, transferencias: true }) ?? 0),
    );

    // Se marca con el teclado (foco y barra espaciadora).
    casillaDeuda.focus();
    await usuario.keyboard(' ');
    expect(casillaDeuda).not.toBeChecked();
    expect(ultimaFila(grafico()).at(-1)).toBe(
      entero(esperada({ fondo: true, deuda: false, transferencias: true }) ?? 0),
    );

    await usuario.click(screen.getByRole('checkbox', { name: /Fondo de Reserva/ }));
    await usuario.click(screen.getByRole('checkbox', { name: /Transferencias acumuladas/ }));
    expect(ultimaFila(grafico()).at(-1)).toBe('—');
    expect(grafico().querySelector('svg')?.textContent).toMatch(/Ningún componente seleccionado/);
  });

  it('el año de inicio cambia las transferencias acumuladas de la construcción', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosHucha();
    const anios = d.transferencias.delEstado.puntos.map((p) => p.anio);
    const otro = anios[3] ?? 0;
    const antes = ultimaFila(figura(container, 'Construcción ilustrativa')).join('|');
    const selector = screen.getByLabelText('Año de inicio de las transferencias acumuladas');
    await usuario.selectOptions(selector, String(otro));
    const f = figura(container, 'Construcción ilustrativa');
    expect(ultimaFila(f).join('|')).not.toBe(antes);
    expect(f.querySelector('thead')?.textContent).toContain(`desde ${otro}`);
  });

  it('el selector de unidad pasa de meses a trimestres de transferencias', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const meses = ultimaFila(figura(container, 'en meses de transferencias'));
    await usuario.click(screen.getByRole('radio', { name: 'Trimestres de transferencias' }));
    const trimestres = ultimaFila(figura(container, 'en trimestres de transferencias'));
    // Un trimestre son tres meses: el valor en trimestres es un tercio del valor en meses.
    const aNumero = (t: string | undefined) =>
      Number((t ?? '').replace(/\./g, '').replace(',', '.'));
    expect(aNumero(trimestres[1])).toBeCloseTo(aNumero(meses[1]) / 3, 1);
  });

  it('el desglose por finalidad aparece y lo no disponible se marca como pendiente de datos', () => {
    const { container } = pintar();
    expect(container.textContent).toMatch(/Pendiente de datos: desglose anual/);
    const tabla = within(container).getByRole('table', {
      name: /por finalidad, según el Tribunal de Cuentas/,
      hidden: true,
    });
    expect(tabla.querySelectorAll('tbody tr').length).toBeGreaterThanOrEqual(5);
  });

  it('las anotaciones de la deuda dicen que no consta cancelación ni conversión', () => {
    const { container } = pintar();
    expect(container.textContent).toMatch(/no consta\s+ninguna cancelación ni conversión/);
    expect(container.textContent).toMatch(/no es una cancelación ni una conversión/);
  });
});
