import { describe, expect, it } from 'vitest';
import { formatearNumero } from '../../engine/formato';
import { filasDelPanel } from './supuestos';
import {
  explicacionOpcion25,
  fechaRedaccionOpcion25,
  ID_LECTURA_OPCION25,
  resumenOpcion25DelRepositorio,
  tituloOpcion25,
} from './texto-opcion25';

describe('texto de la opción de la DT 4.ª.7 (cifras de /data)', () => {
  const r = resumenOpcion25DelRepositorio();
  const texto = explicacionOpcion25();

  it('la fecha de la redacción sale de la cita de la norma guardada en el dato', () => {
    expect(fechaRedaccionOpcion25()).toBe('1 de enero de 2023');
  });

  it('el texto lleva el periodo, el divisor, los años de transición y el fin, todos de /data', () => {
    expect(texto).toContain(`Hasta ${String(r.ultimoAnio)},`);
    expect(texto).toContain(`los últimos ${formatearNumero(r.mesesBase)} meses`);
    expect(texto).toContain(`divididas entre ${formatearNumero(r.divisorBase)}`);
    expect(texto).toContain('sin descartar ninguna');
    for (const t of r.transicion) {
      expect(texto).toContain(String(t.anio));
      expect(texto).toContain(formatearNumero(t.meses));
      expect(texto).toContain(formatearNumero(t.divisor));
    }
    expect(texto).toContain(`Desde ${String(r.primerAnioSinOpcion)} solo rige la regla general.`);
    expect(texto).toBe(
      'Hasta 2043, si resulta más favorable, la base reguladora se calcula con la regla vigente el 1 de enero de 2023: las bases de los últimos 300 meses (25 años) divididas entre 350, sin descartar ninguna y con la integración de lagunas de esa regla. En 2041, 2042 y 2043 el periodo es de 306, 312 y 318 meses (divisores 357, 364 y 371). Se aplica el resultado más favorable entre esta opción y la regla general. Desde 2044 solo rige la regla general.',
    );
  });

  it('rótulo de la lectura con los años de la ventana', () => {
    expect(tituloOpcion25()).toBe(
      'Último día en que rige la opción de calcular la base reguladora con los últimos 25 años (DT 4.ª.7)',
    );
  });

  it('el panel de lecturas usa el rótulo y la explicación, y ningún texto habla de un periodo más largo', () => {
    const fila = filasDelPanel().find((l) => l.id === ID_LECTURA_OPCION25);
    expect(fila?.titulo).toBe(tituloOpcion25());
    expect(fila?.opciones.find((o) => o.valor === 'incluida')?.queCambia).toContain(texto);
    const todo = [
      fila?.titulo,
      fila?.descripcion,
      ...(fila?.opciones ?? []).map((o) => o.queCambia),
    ];
    expect(todo.join(' ')).not.toMatch(/periodo más largo/);
  });
});
