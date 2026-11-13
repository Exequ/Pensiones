/** Lo que los avisos de límites de base dicen que hará el motor, comprobado con el motor. */
import { describe, expect, it } from 'vitest';
import { FORMULARIO_BASE } from './pruebas';
import { formularioAEntrada } from './mapeador';
import { crearMotorDelRepositorio } from './motor';
import { catalogoPorDefecto } from './referencias-datos';
import type { FormularioTuPension } from './tipos';
import type { TramoFormulario } from './tramos';

function bases(importe: string, hastaMes = '12') {
  const tramo: TramoFormulario = {
    id: 't1',
    desdeMes: '1',
    desdeAnio: '1990',
    hastaMes: '12',
    hastaAnio: '2019',
    referencia: 'importe',
    importe: '2000',
  };
  const critico: TramoFormulario = {
    id: 't2',
    desdeMes: '1',
    desdeAnio: '2020',
    hastaMes,
    hastaAnio: '2020',
    referencia: 'importe',
    importe,
  };
  const f: FormularioTuPension = {
    ...FORMULARIO_BASE,
    tipoCarrera: 'tramos',
    tramos: [tramo, critico],
    nacimientoMes: '1',
    nacimientoAnio: '1960',
    jubilacionMes: '1',
    jubilacionAnio: '2026',
  };
  const mapeo = formularioAEntrada(f, catalogoPorDefecto());
  if (!mapeo.ok) throw new Error(JSON.stringify([mapeo.errores, mapeo.erroresTramos]));
  const r = crearMotorDelRepositorio(mapeo.configuracion).jubilacion(mapeo.entrada);
  if (!r.ok) throw r.error.original;
  return r.detalle.basesPeriodo.meses.filter(
    (m) => m.mes.startsWith('2020') && m.tipo === 'cotizado',
  );
}

describe('qué hace el motor con una base fuera de los límites', () => {
  it('por debajo de la mínima: la usa tal cual (no la sube)', () => {
    const meses = bases('500');
    expect(meses.length).toBeGreaterThan(0);
    expect(meses.every((m) => m.baseNominal === 500)).toBe(true);
  });

  it('por encima de la máxima: la reduce a la máxima de ese año', () => {
    const meses = bases('9000');
    const maxima = catalogoPorDefecto().referencias.find((r) => r.id === 'base-maxima');
    expect(meses.every((m) => m.baseNominal === maxima?.valores.get(2020))).toBe(true);
  });
});
