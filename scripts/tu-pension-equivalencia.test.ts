/**
 * El mapeador de «Tu pensión» con la carrera simple equivalente da la misma pensión que la llamada
 * directa al motor en el caso `jub-ord-2026-plana-40a` de Sergio (±0,01). Está en `scripts/` porque
 * lee `data-raw/casos-oro/casos-sergio.md` con Node.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { formularioAEntrada } from '../src/modules/tu-pension/mapeador.ts';
import { crearMotor } from '../src/engine/fachada.ts';
import { FORMULARIO_BASE } from '../src/modules/tu-pension/pruebas.ts';
import { entradaDeCaso, leerCasosSergio } from './lib/casos-sergio.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';

describe('equivalencia con el motor en jub-ord-2026-plana-40a (casos de Sergio)', () => {
  const texto = readFileSync(
    path.resolve(import.meta.dirname, '../data-raw/casos-oro/casos-sergio.md'),
    'utf8',
  );
  const caso = leerCasosSergio(texto).casos.find(
    (c: { id: string }) => c.id === 'jub-ord-2026-plana-40a',
  );

  it('el mapeador da la misma pensión (±0,01) que la llamada directa al motor', () => {
    if (!caso) throw new Error('falta el caso jub-ord-2026-plana-40a');
    const esperada = (caso.esperado as { pensionMensual: number }).pensionMensual;
    // Llamada directa al motor con la entrada del propio caso (carrera con relleno y días 15).
    const directa = crearMotor(leerParametroDeDisco).jubilacion(entradaDeCaso(caso) as never);
    if (!directa.ok) throw directa.error.original;
    // Carrera simple equivalente: base constante de 2.500 desde 1986-11, jubilación en 2026-11.
    const mapeo = formularioAEntrada(FORMULARIO_BASE);
    if (!mapeo.ok) throw new Error('inválido');
    const viaMapeador = crearMotor(leerParametroDeDisco, mapeo.configuracion).jubilacion(
      mapeo.entrada,
    );
    if (!viaMapeador.ok) throw viaMapeador.error.original;
    expect(viaMapeador.detalle.cumpleRequisitos).toBe(true);
    expect(
      Math.abs(viaMapeador.detalle.pensionMensual - directa.detalle.pensionMensual),
    ).toBeLessThanOrEqual(0.01);
    expect(Math.abs(viaMapeador.detalle.pensionMensual - esperada)).toBeLessThanOrEqual(0.01);
  });
});
