import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { aEurosConstantes } from '../../engine/euros-constantes';
import { formatearNumero } from '../../engine/formato';
import { datosCotizantes } from '../historico/datos-cotizantes';
import Cotizantes from './Pagina';
import {
  DEFINICIONES_RELACION,
  MARCA_FECHAS_DISTINTAS,
  MARCA_MISMA_FECHA,
} from './definiciones-relacion';

function pintar() {
  return render(
    <MemoryRouter>
      <Cotizantes />
    </MemoryRouter>,
  );
}

const euros2 = (v: number) => formatearNumero(v, { decimales: 2 });

function figura(contenedor: HTMLElement, titulo: string): HTMLElement {
  const encontrada = [...contenedor.querySelectorAll('figure.grafico')].find((f) =>
    f.querySelector('.grafico-titulo')?.textContent.includes(titulo),
  );
  if (!(encontrada instanceof HTMLElement)) throw new Error(`Sin figura «${titulo}»`);
  return encontrada;
}

describe('«Cotizantes y pensionistas»: definiciones de la relación', () => {
  it('la tabla indica, de cada una de las seis definiciones, qué cuenta el denominador y la fecha de cada serie', () => {
    pintar();
    const tabla = screen.getByRole('table', {
      name: /Definiciones de la relación entre afiliados/,
      hidden: true,
    });
    const cabeceras = [...tabla.querySelectorAll('thead th')].map((th) => th.textContent);
    expect(cabeceras).toEqual(
      expect.arrayContaining([
        'El denominador cuenta',
        'Fecha de referencia del numerador',
        'Fecha de referencia del denominador',
        'Fechas de referencia',
      ]),
    );
    const filas = [...tabla.querySelectorAll('tbody tr')];
    expect(filas).toHaveLength(6);
    expect(DEFINICIONES_RELACION).toHaveLength(6);
    for (const [i, def] of DEFINICIONES_RELACION.entries()) {
      const celdas = [...(filas[i]?.querySelectorAll('th, td') ?? [])].map((c) => c.textContent);
      expect(celdas).toContain(def.definicion);
      expect(celdas).toContain(def.cuenta);
      expect(celdas).toContain(def.fechaNumerador);
      expect(celdas).toContain(def.fechaDenominador);
    }
    // Tres definiciones cuentan pensiones y tres, personas.
    expect(DEFINICIONES_RELACION.filter((d) => d.cuenta === 'Pensiones')).toHaveLength(3);
    expect(DEFINICIONES_RELACION.filter((d) => d.cuenta.startsWith('Personas'))).toHaveLength(3);
  });

  it('solo las parejas con fechas contiguas llevan la marca «misma fecha de referencia», sin presentarlas como la mejor', () => {
    pintar();
    const tabla = screen.getByRole('table', {
      name: /Definiciones de la relación entre afiliados/,
      hidden: true,
    });
    const marcadas = [...tabla.querySelectorAll('tbody tr')].filter((fila) =>
      fila.textContent.includes(MARCA_MISMA_FECHA),
    );
    expect(marcadas.map((f) => f.querySelector('th')?.textContent)).toEqual([
      'Afiliados a último día de diciembre por pensión',
      'Afiliados a último día de diciembre por pensionista',
    ]);
    const otras = [...tabla.querySelectorAll('tbody tr')].filter((fila) =>
      fila.textContent.includes(MARCA_FECHAS_DISTINTAS),
    );
    expect(otras).toHaveLength(4);
    expect(MARCA_MISMA_FECHA.toLowerCase()).toContain('misma fecha de referencia');
    const texto = document.body.textContent;
    expect(texto).toMatch(/no una indicación de que esa\s+definición sea más adecuada/);
    expect(texto).not.toMatch(/la buena|la mejor|más correcta/i);
  });

  it('avisa del perímetro (Clases Pasivas) y deja la definición con cotizantes efectivos como pendiente', () => {
    pintar();
    const texto = document.body.textContent;
    expect(texto).toMatch(/Régimen de Clases Pasivas del Estado\s+es otro régimen/);
    expect(texto).toMatch(/cotizantes efectivos \(sin suspendidos ni convenio especial\)/);
    expect(texto).toMatch(/dato pendiente/);
    expect(texto).not.toMatch(/sistemas especiales\)? (que|como definición)/);
  });
});

describe('«Cotizantes y pensionistas»: pensión media en euros constantes', () => {
  it('el selector de deflactor solo aparece en euros constantes y arranca en el IPC de diciembre', async () => {
    const usuario = userEvent.setup();
    pintar();
    expect(screen.queryByRole('group', { name: /Índice de precios/ })).toBeNull();
    await usuario.click(screen.getByRole('radio', { name: 'Euros constantes' }));
    const grupo = screen.getByRole('group', {
      name: 'Índice de precios para los euros constantes',
    });
    expect(within(grupo).getByRole('radio', { name: 'IPC de diciembre' })).toBeChecked();
    expect(within(grupo).getByRole('radio', { name: 'IPC medio anual' })).not.toBeChecked();
  });

  it('cambiar de deflactor cambia el título, la nota y las cifras, que coinciden con el cálculo a mano', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const d = datosCotizantes();
    await usuario.click(screen.getByRole('radio', { name: 'Euros constantes' }));

    const primero = d.pensionMediaPorClase.jubilacion.puntos[0];
    if (!primero) throw new Error('Sin datos de pensión media');
    const baseDic = d.ipcDiciembre.puntos.at(-1)?.anio ?? 0;
    const baseMedia = d.ipc.puntos.at(-1)?.anio ?? 0;
    const conDiciembre = aEurosConstantes(primero.valor, primero.anio, baseDic, d.ipcDiciembre);
    const conMedia = aEurosConstantes(primero.valor, primero.anio, baseMedia, d.ipc);
    expect(conDiciembre).not.toBeCloseTo(conMedia, 1);

    const titulo = 'Pensión media mensual por clase, en euros constantes de';
    let f = figura(container, titulo);
    expect(f.querySelector('.grafico-titulo')?.textContent).toContain(`diciembre de ${baseDic}`);
    expect(f.textContent).toMatch(/IPC de diciembre del año base/);
    // La primera fila de la tabla es el primer año; la columna 1 es jubilación (primera clase).
    const filaInicial = f.querySelector('tbody tr');
    const celdas = [...(filaInicial?.querySelectorAll('th, td') ?? [])].map((c) => c.textContent);
    expect(celdas[1]).toBe(euros2(conDiciembre));

    await usuario.click(screen.getByRole('radio', { name: 'IPC medio anual' }));
    f = figura(container, titulo);
    expect(f.querySelector('.grafico-titulo')?.textContent).toContain(String(baseMedia));
    expect(f.querySelector('.grafico-titulo')?.textContent).not.toContain('diciembre de');
    expect(f.textContent).toMatch(/IPC medio anual del año base/);
    const celdas2 = [...(f.querySelector('tbody tr')?.querySelectorAll('th, td') ?? [])].map(
      (c) => c.textContent,
    );
    expect(celdas2[1]).toBe(euros2(conMedia));
    // La fuente del deflactor aparece junto al gráfico y no se usa el deflactor del consumo de los hogares.
    expect(f.textContent).toMatch(/no se usa el deflactor del consumo de los hogares/);
  });

  it('lleva las advertencias sobre la media', () => {
    pintar();
    const lista = screen.getByRole('heading', {
      name: 'Qué es y qué no es esta pensión media',
    }).nextElementSibling;
    const texto = lista?.textContent ?? '';
    expect(texto).toMatch(/media por pensión, no por pensionista/);
    expect(texto).toMatch(/Incluye los complementos a mínimos/);
    expect(texto).toMatch(/Mezcla regímenes/);
    expect(texto).toMatch(/No es la pensión media de las altas nuevas/);
    expect(texto).toMatch(/efecto composición/);
    expect(texto).toMatch(/aunque ninguna\s+pensión se revalorice/);
  });
});
