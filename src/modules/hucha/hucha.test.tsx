import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { formatearNumero } from '../../engine/formato';
import {
  apoyoFinancieroDelEstado,
  posicionIlustrativa,
  posicionNeta,
} from '../../engine/transferencias';
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
      /dos lecturas separadas/,
    ]) {
      expect(screen.getByRole('heading', { level: 2, name: nombre })).toBeInTheDocument();
    }
  });

  it('las construcciones llevan el aviso de «no son cifras oficiales» y un título propio cada una', () => {
    const { container } = pintar();
    expect(screen.getAllByText(/no cifras oficiales/i).length).toBeGreaterThanOrEqual(1);
    expect(figura(container, 'Fondo menos deuda: valor del Fondo de Reserva')).toBeTruthy();
    expect(figura(container, 'Apoyo financiero del Estado: deuda más transferencias')).toBeTruthy();
  });

  it('el texto dice que préstamos, transferencias y Fondo no son aditivos y de qué naturaleza es cada uno', () => {
    const { container } = pintar();
    const seccion = container.querySelector('#posicion')?.closest('section')?.textContent ?? '';
    expect(seccion).toMatch(/no son\s+partidas aditivas/);
    expect(seccion).toMatch(/pasivo a devolver/);
    expect(seccion).toMatch(/flujo no reembolsable/);
    expect(seccion).toMatch(/activo acumulado/);
  });

  it('cada gráfico nuevo tiene tabla, línea de fuente y «Cómo leerlo»', () => {
    const { container } = pintar();
    for (const titulo of [
      'Transferencias corrientes del Estado y organismos autónomos a la Seguridad Social, por año',
      'por trimestre',
      'Transferencias acumuladas desde',
      'El valor del Fondo de Reserva, en meses de transferencias',
      'Fondo menos deuda: valor del Fondo de Reserva',
      'Apoyo financiero del Estado: deuda más transferencias',
      'Deuda PDE de las Administraciones de Seguridad Social',
    ]) {
      const f = figura(container, titulo);
      expect(f.querySelector('table'), titulo).not.toBeNull();
      expect(f.querySelector('.linea-fuente')?.textContent, titulo).toMatch(/descargado el/);
      expect(f.closest('.bloque-grafico')?.querySelector('.como-leerlo'), titulo).not.toBeNull();
    }
  });

  it('la suma conjunta es una opción desactivada por defecto, con aviso reforzado cuando se activa', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const casilla = screen.getByRole('checkbox', { name: /Mostrar la suma conjunta/ });
    expect(casilla).not.toBeChecked();
    expect(() => figura(container, 'Suma conjunta')).toThrow();
    expect(screen.queryByRole('checkbox', { name: /Deuda con el Estado/ })).toBeNull();
    await usuario.click(casilla);
    expect(casilla).toBeChecked();
    expect(figura(container, 'Suma conjunta, no aditiva')).toBeTruthy();
    const aviso = screen.getByText(/esta suma junta un activo \(el Fondo\), un pasivo \(la deuda\)/);
    expect(aviso.textContent).toMatch(/no son aditivas/);
    expect(aviso.textContent).toMatch(/un flujo/);
    await usuario.click(casilla);
    expect(() => figura(container, 'Suma conjunta')).toThrow();
  });

  it('las casillas de la suma conjunta son casillas con etiqueta, accesibles por teclado, y recalculan la suma', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosHucha();
    await usuario.click(screen.getByRole('checkbox', { name: /Mostrar la suma conjunta/ }));
    const grafico = () => figura(container, 'Suma conjunta, no aditiva');
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

  it('«Fondo menos deuda»: la tabla lleva Fondo, deuda y su diferencia con el signo', () => {
    const { container } = pintar();
    const d = datosHucha();
    const esperada = posicionNeta(d.valor.puntos, d.deuda.finAno.puntos).at(-1);
    const f = figura(container, 'Fondo menos deuda: valor del Fondo de Reserva');
    const fila = ultimaFila(f);
    expect(fila[0]).toBe(String(esperada?.anio));
    expect(fila[1]).toBe(entero(esperada?.fondo ?? 0));
    expect(fila[2]).toBe(entero(esperada?.deuda ?? 0));
    expect(fila[3]).toBe(entero(esperada?.neta ?? 0));
    // El signo es explícito: la cabecera lo dice y, si la diferencia es negativa, la celda lleva «−».
    expect(f.querySelector('thead')?.textContent).toMatch(/negativo si la deuda supera al Fondo/);
    if ((esperada?.neta ?? 0) < 0) expect(fila[3]).toMatch(/^[−-]/);
    const bloque = f.closest('.bloque-grafico')?.textContent ?? '';
    expect(bloque).toMatch(/Cómo leerlo/);
    expect(bloque).toMatch(/compara un activo con un pasivo|diferencia entre un activo y un pasivo/i);
  });

  it('«Apoyo financiero del Estado»: deuda y transferencias por separado y su suma, según el año de inicio', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosHucha();
    const anios = d.transferencias.delEstado.puntos.map((p) => p.anio);
    const calcular = (inicio: number) =>
      apoyoFinancieroDelEstado(
        {
          deuda: d.deuda.finAno.puntos,
          transferenciasAnuales: d.transferencias.delEstado.puntos,
        },
        inicio,
      ).at(-1);
    const titulo = 'Apoyo financiero del Estado: deuda más transferencias';
    const primera = calcular(anios[0] ?? 0);
    let fila = ultimaFila(figura(container, titulo));
    expect(fila[1]).toBe(entero(primera?.deuda ?? 0));
    expect(fila[2]).toBe(entero(primera?.transferencias ?? 0));
    expect(fila[3]).toBe(entero(primera?.apoyo ?? 0));

    const otro = anios[3] ?? 0;
    await usuario.selectOptions(
      screen.getByLabelText('Año de inicio de las transferencias acumuladas'),
      String(otro),
    );
    const segunda = calcular(otro);
    fila = ultimaFila(figura(container, titulo));
    expect(fila[3]).toBe(entero(segunda?.apoyo ?? 0));
    // La deuda no cambia con el año de inicio; las transferencias acumuladas, sí.
    expect(fila[1]).toBe(entero(primera?.deuda ?? 0));
    expect(fila[2]).not.toBe(entero(primera?.transferencias ?? 0));
    expect(figura(container, titulo).querySelector('thead')?.textContent).toContain(`desde ${otro}`);
  });

  it('los meses de gasto del Fondo usan la referencia con complemento, el contraste de catorce pagas y avisan del precio de adquisición', () => {
    const { container } = pintar();
    const f = figura(container, 'Meses de gasto en pensiones que equivale el valor del Fondo');
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/Referencia: obligaciones reconocidas con complemento/);
    expect(cabecera).toMatch(/Contraste: pensiones × pensión media × catorce pagas/);
    expect(container.textContent).toMatch(/El Fondo se valora a precio de adquisición/);
  });

  it('los meses de transferencias presentan el año completo como medida principal y el cuarto trimestre como secundaria', () => {
    const { container } = pintar();
    const f = figura(container, 'en meses de transferencias');
    const cabecera = f.querySelector('thead')?.textContent ?? '';
    expect(cabecera).toMatch(/Principal: transferencias del año/);
    expect(cabecera).toMatch(/Secundaria: cuarto trimestre/);
    const seccion = container.querySelector('#fondo-transferencias')?.closest('section')?.textContent ?? '';
    expect(seccion).toMatch(/son diferencias entre\s+acumulados/);
    expect(seccion).toMatch(/no se reparten por igual/);
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
