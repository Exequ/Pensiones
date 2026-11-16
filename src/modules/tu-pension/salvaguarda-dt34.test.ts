/**
 * Salvaguarda de la DT 34.ª.1 en el panel de lecturas: la nota «Afecta a tu resultado» sale cuando
 * la lectura cambia la pensión del caso (anticipada voluntaria con la pensión por encima del límite)
 * y no sale cuando no la cambia. El formulario de «Tu pensión» solo ofrece la jubilación ordinaria:
 * se prueba con la entrada del motor, igual que la construye la receta.
 */
import { describe, expect, it } from 'vitest';
import type { EntradaJubilacion } from '../../engine/fachada';
import { ejecutarJubilacion } from '../../engine/comparar-lecturas';
import { crearMotorDelRepositorio } from './motor';
import { efectoPorLectura, filasDelPanel } from './supuestos';

const configuracion = { escenario: { ipc: 0.02 } } as const;
const entradaCon = (baseMensual: number): EntradaJubilacion => ({
  carrera: [{ desde: '1985-01', hasta: '2026-12', baseMensual }],
  nacimiento: '1963-01-01',
  fechaJubilacion: '2027-01-01',
  modalidad: 'anticipada-voluntaria',
  opciones: { aplicarMinimos: false, usarOpcion25Anos: false },
});

function efecto(baseMensual: number) {
  const entrada = entradaCon(baseMensual);
  const base = ejecutarJubilacion(crearMotorDelRepositorio(configuracion), entrada);
  if (!base.ok) throw new Error('el caso no se calcula');
  const efectos = efectoPorLectura(entrada, configuracion, base, crearMotorDelRepositorio);
  return efectos.get('jubilacion.salvaguardaDT34');
}

describe('nota de la lectura salvaguardaDT34', () => {
  it('con la pensión por encima del límite la lectura cambia el resultado y la nota lo dice', () => {
    const e = efecto(20000);
    expect(e?.afecta).toBe(true);
    expect(e?.texto).toMatch(/Sin comparación adicional/);
    expect(e?.texto).toMatch(/pensión mensual sería/);
  });

  it('con la pensión por debajo del límite no cambia nada y la nota lo dice', () => {
    const e = efecto(2000);
    expect(e?.afecta).toBe(false);
    expect(e?.texto).toMatch(/no cambia el resultado/);
  });

  it('el panel muestra la lectura pendiente con sus dos opciones y el valor por defecto', () => {
    const fila = filasDelPanel().find((l) => l.id === 'jubilacion.salvaguardaDT34');
    expect(fila?.estado).toBe('pendiente');
    expect(fila?.valorActual).toBe('A');
    expect(fila?.opciones.map((o) => o.valor)).toEqual(['A', 'B']);
    expect(fila?.opciones.every((o) => o.queCambia.length > 20)).toBe(true);
  });
});
