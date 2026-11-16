/**
 * Fase 3-C2: neutralidad (regla c de CLAUDE.md) de los textos nuevos de viudedad y orfandad en «Tu
 * pensión»: preguntas, avisos, textos de las lecturas, mensajes de error y los textos que genera el
 * presentador para varios casos. Ninguno contiene palabras de valoración.
 */
import { describe, expect, it } from 'vitest';
import { errorDe } from '../../engine/fachada';
import { NoImplementada } from '../../engine/jubilacion/errores';
import { calcularTuPension, type Dependencias } from './calcular';
import { traducirError } from './errores';
import { crearMotorDelRepositorio, leerReferenciaDeRepositorio } from './motor';
import { FORMULARIO_ORFANDAD, FORMULARIO_VIUDEDAD } from './pruebas';
import { catalogoPorDefecto } from './referencias-datos';
import { TEXTOS_ORFANDAD, TEXTOS_SUPERVIVENCIA, TEXTOS_VIUDEDAD } from './textos-supervivencia';
import { TEXTOS_LECTURAS } from './textos-lecturas';
import type { FormularioTuPension } from './tipos';
import { valoracionesEn } from '../../../scripts/lib/valoraciones.ts';

const deps: Dependencias = {
  fabricaMotor: crearMotorDelRepositorio,
  leerReferencia: leerReferenciaDeRepositorio,
  catalogo: catalogoPorDefecto(),
};

function textos(valor: unknown, salida: string[] = []): string[] {
  if (typeof valor === 'string') salida.push(valor);
  else if (Array.isArray(valor)) for (const v of valor) textos(v, salida);
  else if (typeof valor === 'object' && valor !== null) {
    for (const v of Object.values(valor)) textos(v, salida);
  }
  return salida;
}

describe('el detector de valoraciones reconoce las palabras de la ampliación de la 3-C2', () => {
  it('marca los términos de privilegio, merecimiento y desamparo', () => {
    expect(valoracionesEn('Una pensión chollo')).toEqual(['chollo']);
    expect(valoracionesEn('Una pensión irrisoria')).toEqual(['irrisori']);
    expect(valoracionesEn('Quien la merece').length).toBe(0);
    expect(valoracionesEn('Una pensión merecida')).toEqual(['merecid']);
    expect(valoracionesEn('Los huérfanos desamparados')).toEqual(['desamparad']);
    expect(valoracionesEn('La pensión de viudedad es compatible con el trabajo')).toEqual([]);
  });
});

describe('textos de la viudedad y la orfandad', () => {
  it('las preguntas, avisos y explicaciones no contienen valoraciones', () => {
    const todo = [
      ...textos(TEXTOS_SUPERVIVENCIA),
      ...textos(TEXTOS_VIUDEDAD),
      ...textos(TEXTOS_ORFANDAD),
      ...Object.entries(TEXTOS_LECTURAS)
        .filter(([id]) => id.startsWith('supervivencia.'))
        .flatMap(([, t]) => textos(t)),
    ];
    expect(todo.length).toBeGreaterThan(100);
    for (const t of todo) expect(valoracionesEn(t), t).toEqual([]);
  });

  it('los mensajes de error de supervivencia no contienen valoraciones', () => {
    const anterior = traducirError(
      errorDe(
        new NoImplementada(
          'Prestaciones de muerte y supervivencia con hecho causante en 2018',
          'El motor cubre hechos causantes desde 2022.',
        ),
      ),
      'viudedad',
    );
    const dt13 = traducirError(
      errorDe(
        new NoImplementada('Viudedad de personas separadas (DT 13.ª TRLGSS)', 'No estructurada.'),
      ),
      'viudedad',
    );
    for (const m of [anterior, dt13]) {
      for (const t of textos(m)) expect(valoracionesEn(t), t).toEqual([]);
    }
  });

  it('los textos que genera el presentador para varios casos no contienen valoraciones', () => {
    const casos: FormularioTuPension[] = [
      FORMULARIO_VIUDEDAD,
      FORMULARIO_ORFANDAD,
      {
        ...FORMULARIO_VIUDEDAD,
        supervivencia: {
          ...FORMULARIO_VIUDEDAD.supervivencia,
          viudo: {
            ...FORMULARIO_VIUDEDAD.supervivencia.viudo,
            vinculo: 'excónyuge',
            compensatoriaAnual: '6000',
          },
        },
      },
      {
        ...FORMULARIO_VIUDEDAD,
        supervivencia: {
          ...FORMULARIO_VIUDEDAD.supervivencia,
          viudo: {
            ...FORMULARIO_VIUDEDAD.supervivencia.viudo,
            nacimientoAnio: '1981',
            cargas: true,
            miembros: '3',
            rendimientosUnidad: '10000',
          },
          otrosHuerfanos: [
            {
              id: 'a',
              nacimientoMes: '1',
              nacimientoAnio: '2012',
              incapacitado: false,
              discapacidad65: false,
              rentasTrabajo: '0',
              rendimientos: '0',
            },
            {
              id: 'b',
              nacimientoMes: '1',
              nacimientoAnio: '2014',
              incapacitado: false,
              discapacidad65: false,
              rentasTrabajo: '0',
              rendimientos: '0',
            },
          ],
        },
      },
      {
        ...FORMULARIO_ORFANDAD,
        supervivencia: { ...FORMULARIO_ORFANDAD.supervivencia, orfandadAbsoluta: true },
      },
    ];
    for (const f of casos) {
      const r = calcularTuPension(f, deps);
      expect(r.tipo).toBe('resultado');
      if (r.tipo !== 'resultado') continue;
      for (const t of textos([r.modelo, r.lecturas.map((l) => [l.titulo, l.efecto ?? ''])])) {
        expect(valoracionesEn(t), t).toEqual([]);
      }
    }
  });
});
