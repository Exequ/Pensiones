// @vitest-environment node
/**
 * Ajustes actuariales 1, paso 6: la nota «Qué lecturas de jubilación se aplican aquí» de la pantalla
 * de incapacidad lista exactamente las lecturas `jubilacion.*` que lee el motor de incapacidad
 * (y su código compartido con la jubilación), y las demás no le afectan.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { crearMotor } from '../src/engine/fachada.ts';
import { LECTURAS_ABIERTAS } from '../src/engine/lecturas.ts';
import { LECTURAS_JUBILACION_EN_INCAPACIDAD } from '../src/modules/tu-pension/lecturas-jubilacion-en-incapacidad.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
/** Código que ejecuta el motor de incapacidad (y que comparte con la jubilación). */
const FICHEROS = [
  'src/engine/incapacidad/calculo.ts',
  'src/engine/incapacidad/revalorizacion.ts',
  'src/engine/incapacidad/parametros.ts',
  'src/engine/comun/base-reguladora.ts',
  'src/engine/jubilacion/contexto.ts',
  'src/engine/jubilacion/carrera.ts',
  'src/engine/jubilacion/porcentajes.ts',
  'src/engine/jubilacion/tiempo.ts',
  'src/engine/jubilacion/parametros.ts',
];
const JUBILACION = new Set(
  LECTURAS_ABIERTAS.filter((l) => l.motor === 'jubilacion').map((l) => l.opcion),
);

describe('lecturas de jubilación que rigen en la incapacidad', () => {
  it('la lista de la interfaz es la de las lecturas de jubilación que lee el código del motor de incapacidad', () => {
    const usadas = new Set<string>();
    for (const f of FICHEROS) {
      const codigo = readFileSync(path.join(RAIZ, f), 'utf8');
      for (const m of codigo.matchAll(/lecturas\.([A-Za-z0-9]+)/g)) {
        if (m[1] !== undefined && JUBILACION.has(m[1])) usadas.add(`jubilacion.${m[1]}`);
      }
    }
    expect([...usadas].sort()).toEqual([...LECTURAS_JUBILACION_EN_INCAPACIDAD].sort());
  });

  it('todas existen en el registro como lecturas de jubilación', () => {
    for (const id of LECTURAS_JUBILACION_EN_INCAPACIDAD) {
      const l = LECTURAS_ABIERTAS.find((x) => x.id === id);
      expect(l?.motor, id).toBe('jubilacion');
    }
  });

  const total = (
    lecturas: Record<string, string>,
    carrera: { desde: string; hasta: string; baseMensual: number }[],
  ) => {
    const r = crearMotor(leerParametroDeDisco, {
      lecturas,
      escenario: { ipc: 0.02 },
    }).incapacidadPermanente({
      carrera,
      nacimiento: '1981-03-10',
      fechaHechoCausante: '2026-03-15',
      grado: 'total',
      origen: 'enfermedad-comun',
      opciones: { aplicarMinimos: false },
    });
    if (!r.ok) throw r.error.original;
    return r.detalle.baseReguladora;
  };
  // Bases crecientes y meses sin cotizar: la actualización con el IPC y el relleno de lagunas importan.
  const CARRERA = [
    { desde: '2000-01', hasta: '2010-12', baseMensual: 1500 },
    { desde: '2012-01', hasta: '2026-02', baseMensual: 2000 },
  ];

  // Un año sin cotizar dentro de la ventana: el relleno de lagunas con la base mínima importa.
  const CON_LAGUNAS = [
    { desde: '2000-01', hasta: '2022-12', baseMensual: 1500 },
    { desde: '2024-01', hasta: '2026-02', baseMensual: 2000 },
  ];

  it('cambiar el índice del IPC o la base mínima de las lagunas cambia la base reguladora de la incapacidad', () => {
    expect(total({ 'jubilacion.interpolacionIPC': 'escalon-anual' }, CARRERA)).not.toBeCloseTo(
      total({}, CARRERA),
      6,
    );
    expect(
      total({ 'jubilacion.referenciaBaseMinimaLagunas': 'hecho-causante' }, CON_LAGUNAS),
    ).not.toBeCloseTo(total({}, CON_LAGUNAS), 6);
  });

  it('las lecturas de la demora y de la opción de periodo largo no afectan a la incapacidad', () => {
    const defecto = total({}, CARRERA);
    expect(total({ 'jubilacion.fraccionDemora': 'desde-primer-anio' }, CARRERA)).toBe(defecto);
    expect(total({ 'jubilacion.opcion25EnUltimoDia2040': 'excluida' }, CARRERA)).toBe(defecto);
  });
});
