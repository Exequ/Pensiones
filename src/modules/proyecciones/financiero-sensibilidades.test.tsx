/**
 * Ajustes de M4 (sensibilidades): tabla «Sensibilidades» del bloque financiero. Las cifras se comparan
 * con las de los ficheros de /data (se recalculan desde las columnas del JSON), no con valores escritos a
 * mano.
 */
import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { valoracionesEn } from '../../../scripts/lib/valoraciones.ts';
import { formatearNumero } from '../../engine/formato';
import { datosFinanciero } from './datos-financiero';
import Financiero from './Financiero';
import { aniosSensibilidades, rotuloPalanca, tablaSensibilidades } from './series-financiero';

const d = datosFinanciero();
const s = d.sensibilidades;
const anios = aniosSensibilidades(d);
const ultimo = anios.at(-1)!;

function pintar() {
  return render(
    <MemoryRouter>
      <Financiero />
    </MemoryRouter>,
  );
}

const tablaDe = (anio: number): HTMLElement =>
  screen.getByRole('table', { name: new RegExp(`^Sensibilidades de M4 en ${anio}:`) });
const filasDe = (tabla: HTMLElement): HTMLElement[] => within(tabla).getAllByRole('row').slice(1);
/** Cabecera de fila (la palanca) seguida de las cuatro cifras de la fila. */
const celdas = (fila: HTMLElement): string[] => [
  within(fila).getByRole('rowheader').textContent,
  ...within(fila)
    .getAllByRole('cell')
    .map((c) => c.textContent),
];
const f2 = (x: number): string => formatearNumero(x, { decimales: 2 });
const columna = (filas: readonly Record<string, string | number>[], id: string, anio: number) =>
  filas.find((f) => f['anio'] === anio)![id] as number;

describe('datos de las sensibilidades', () => {
  it('la salida trae los casos del LEEME y el campo de reproducción local, falso', () => {
    expect(s.casos).toHaveLength(10);
    expect(s.reproduccionLocalPorAutor).toBe(false);
    expect(s.descripcionBase).toMatch(/^Cada caso cambia UNA palanca/);
  });

  it('los años son los de la salida (el último, el valor por defecto) y no incluyen el observado', () => {
    expect(anios[0]).toBe(d.anioInicio);
    expect(anios).toContain(ultimo);
    expect(anios).not.toContain(d.filaObservada.anio);
  });
});

describe('tablaSensibilidades', () => {
  it('el base va primero, los casos en el orden del LEEME y las diferencias son caso menos base', () => {
    const t = tablaSensibilidades(d, ultimo);
    expect(t.filas.map((f) => f.id)).toEqual(['base', ...s.casos.map((c) => c.id)]);
    const base = t.filas[0]!;
    expect(base.gastoDiferencia).toBeNull();
    expect(base.saldoDiferencia).toBeNull();
    // Valores recalculados desde las columnas del JSON, no de la propia función.
    expect(base.gasto).toBe(
      columna(d.filasPorEscenario['base']!, 'gasto_pensiones_pct_pib', ultimo),
    );
    for (const f of t.filas.slice(1)) {
      const filas = s.filasPorCaso[f.id]!;
      const gasto = columna(filas, 'gasto_pensiones_pct_pib', ultimo);
      const saldo = columna(filas, 'saldo_no_financiero_pct_pib', ultimo);
      expect(f.gasto).toBe(gasto);
      expect(f.saldo).toBe(saldo);
      expect(f.gastoDiferencia).toBeCloseTo(gasto - base.gasto, 12);
      expect(f.saldoDiferencia).toBeCloseTo(saldo - base.saldo, 12);
    }
  });

  it('falla con un año que no tiene la salida', () => {
    expect(() => tablaSensibilidades(d, d.filaObservada.anio)).toThrow(RangeError);
  });
});

describe('tabla «Sensibilidades» del bloque financiero', () => {
  it('es una tabla con cabeceras y una fila por caso más la del base, en el orden del LEEME', () => {
    pintar();
    const tabla = tablaDe(ultimo);
    expect(within(tabla).getAllByRole('columnheader')).toHaveLength(5);
    const filas = filasDe(tabla);
    expect(filas).toHaveLength(s.casos.length + 1);
    expect(celdas(filas[0]!)[0]).toMatch(/^Ninguna: es el caso base/);
    s.casos.forEach((c, i) => {
      // La palanca y su valor son el texto del LEEME (que ya habla de tasas de afiliación y de
      // cotización, Ajustes actuariales 3, n.º 69), con el aviso del avance lineal en los dos casos de M2.
      expect(celdas(filas[i + 1]!)[0]).toBe(rotuloPalanca(c.parametro));
      if (/^M2: tasas de afiliación y de cotización de 55 a 64 años/.test(c.parametro))
        expect(celdas(filas[i + 1]!)[0]).toMatch(
          /^M2: tasas de afiliación y de cotización de 55 a 64 años multiplicadas por .* \(avance lineal desde el primer año proyectado; el número de pensiones de M3 no cambia\)$/,
        );
      else if (
        /^M2: en .* las tasas de afiliación y de cotización de las mujeres de 25 a 64 años/.test(
          c.parametro,
        )
      )
        expect(celdas(filas[i + 1]!)[0]).toMatch(
          /^M2: en .* las tasas de afiliación y de cotización de las mujeres de 25 a 64 años igualan a las de los hombres de su tramo \(avance lineal desde el primer año proyectado; el número de pensiones de M3 no cambia\)$/,
        );
      else expect(celdas(filas[i + 1]!)[0]).toBe(c.parametro);
    });
  });

  it('el gasto, el saldo y las diferencias son los del año mostrado, con formato es-ES', () => {
    pintar();
    const t = tablaSensibilidades(d, ultimo);
    const filas = filasDe(tablaDe(ultimo));
    t.filas.forEach((f, i) => {
      const [, gasto, gastoDif, saldo, saldoDif] = celdas(filas[i]!);
      expect(gasto).toBe(f2(f.gasto));
      expect(saldo).toBe(f2(f.saldo));
      expect(gastoDif).toBe(f.gastoDiferencia === null ? '—' : f2(f.gastoDiferencia));
      expect(saldoDif).toBe(f.saldoDiferencia === null ? '—' : f2(f.saldoDiferencia));
    });
  });

  it('no resalta ninguna fila ni ordena los casos por tamaño', () => {
    pintar();
    const tabla = tablaDe(ultimo);
    expect(tabla.querySelectorAll('tr.destacada')).toHaveLength(0);
    const gastos = tablaSensibilidades(d, ultimo)
      .filas.slice(1)
      .map((f) => f.gasto);
    const ordenados = [...gastos].sort((a, b) => a - b);
    expect(gastos).not.toEqual(ordenados);
    expect(gastos).not.toEqual([...ordenados].reverse());
  });

  it('lleva fuente, definiciones, «Cómo leerlo», aviso de proyección y nota de procedencia', () => {
    const { container } = pintar();
    const tabla = tablaDe(ultimo);
    // Fuente justo debajo de la tabla, con la naturaleza de proyección de modelo.
    const bloque = tabla.closest('.tabla-datos')!;
    const fuente = bloque.closest('.proy-sensibilidades')!.nextElementSibling!;
    expect(fuente).toHaveClass('linea-fuente');
    expect(fuente.textContent).toMatch(/naturaleza: proyección de modelo/);
    expect(fuente.textContent).toContain(s.tabla.archivo.origen.ejecutadoEl);
    // Definición de las magnitudes y del PIB aproximado en la nota de la tabla.
    expect(bloque.textContent).toMatch(/Saldo no financiero: ingresos/);
    expect(bloque.textContent).toMatch(/PIB aproximado de cada caso/);
    expect(tabla.querySelector('caption')!.textContent).toMatch(/proyección de modelo/);

    const titulo = screen.getByRole('heading', { name: /Sensibilidades: una palanca cada vez/ });
    const seccion = [...container.querySelectorAll('.como-leerlo')].find(
      (c) => titulo.compareDocumentPosition(c) & Node.DOCUMENT_POSITION_FOLLOWING,
    )!;
    // El primer «Cómo leerlo» posterior al encabezado es el de las sensibilidades (el de los escenarios va antes).
    expect(seccion.querySelector('.como-leerlo-etiqueta')).toHaveTextContent('Cómo leerlo');
    const texto = seccion.textContent;
    expect(texto).toMatch(/Cada fila cambia solo una palanca/);
    expect(texto).toMatch(/Los casos no se\s+combinan/);
    expect(texto).toMatch(/No es una predicción/);
    expect(texto).toMatch(/puede depender del escenario del que se parte/);
    expect(texto).toMatch(/orden del LEEME/);
    expect(texto).toMatch(/Procedencia/);
    expect(texto).toMatch(/con el código de los modelos del\s+repositorio/);
    expect(texto).toMatch(/no en local por el autor/);
    expect(texto).toMatch(/coincide con la ejecución local del autor/);
  });

  it('la reproducción local por el autor se muestra según el campo del fichero (falso: «no, todavía no»)', () => {
    const { container } = pintar();
    expect(s.reproduccionLocalPorAutor).toBe(false);
    expect(container.textContent).toMatch(
      /Reproducción local por el\s+autor de todos los casos:\s+no, todavía no\./,
    );
    expect(container.textContent).not.toMatch(/reproducidas por el autor/);
  });
});

describe('selector de año', () => {
  it('lista los años de la salida y empieza en el último', () => {
    pintar();
    const selector = screen.getByRole('combobox', { name: 'Año de las sensibilidades' });
    const opciones = within(selector).getAllByRole('option');
    expect(opciones.map((o) => o.textContent)).toEqual(anios.map(String));
    expect(selector).toHaveValue(String(ultimo));
  });

  it('al cambiar de año cambian el título, las filas y el aviso, y la tabla sigue completa', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const antes = filasDe(tablaDe(ultimo)).map(celdas);
    const otro = anios[0]!;
    expect(otro).not.toBe(ultimo);
    await usuario.selectOptions(
      screen.getByRole('combobox', { name: 'Año de las sensibilidades' }),
      String(otro),
    );
    const filas = filasDe(tablaDe(otro));
    expect(filas).toHaveLength(s.casos.length + 1);
    expect(filas.map(celdas)).not.toEqual(antes);
    const t = tablaSensibilidades(d, otro);
    t.filas.forEach((f, i) => {
      expect(celdas(filas[i]!)[1]).toBe(f2(f.gasto));
      expect(celdas(filas[i]!)[3]).toBe(f2(f.saldo));
    });
    const avisos = [...container.querySelectorAll('[aria-live="polite"]')].map(
      (a) => a.textContent,
    );
    expect(avisos.some((a) => a.includes(`Año mostrado: ${otro}`))).toBe(true);
  });

  it('es independiente del selector de escenario: el base de la tabla es siempre el escenario base', async () => {
    const usuario = userEvent.setup();
    pintar();
    const antes = filasDe(tablaDe(ultimo)).map(celdas);
    const g0 = d.escenarios.find((e) => e.id === 'g0')!;
    await usuario.click(
      within(screen.getByRole('group', { name: /^Escenario de M4$/ })).getByRole('radio', {
        name: g0.etiqueta,
      }),
    );
    expect(filasDe(tablaDe(ultimo)).map(celdas)).toEqual(antes);
  });
});

describe('textos de las sensibilidades', () => {
  it('ningún año produce palabras de valoración, valores vacíos ni cifras no numéricas', async () => {
    const usuario = userEvent.setup();
    const { container } = pintar();
    const selector = screen.getByRole('combobox', { name: 'Año de las sensibilidades' });
    for (const anio of anios) {
      await usuario.selectOptions(selector, String(anio));
      const texto = container.textContent;
      expect(valoracionesEn(texto), String(anio)).toEqual([]);
      expect(texto, String(anio)).not.toMatch(/NaN|undefined|Infinity|\[object/);
    }
  });
});
