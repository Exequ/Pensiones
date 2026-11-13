// @vitest-environment node
/**
 * Fase 3-B2, paso 2: capa de lecturas del simulador (`src/engine/comparar-lecturas.ts`) con tres
 * casos de Sergio como entrada. Está en `scripts/` porque lee `data-raw/casos-oro/casos-sergio.md`
 * con Node. Comprueba que la elección por defecto no cambia nada, que con una alternativa el
 * resultado coincide con la llamada directa al motor con esa lectura, y que elegir y restablecer
 * devuelve al valor por defecto.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  compararLecturas,
  lecturasCambiadas,
  lecturasOfrecidas,
  normalizarEleccion,
  valoresElegidos,
} from '../src/engine/comparar-lecturas.ts';
import {
  crearMotor,
  type ConfiguracionMotor,
  type EntradaJubilacion,
} from '../src/engine/fachada.ts';
import { LECTURAS_ABIERTAS } from '../src/engine/lecturas.ts';
import { entradaDeCaso, leerCasosSergio, type CasoSergio } from './lib/casos-sergio.ts';
import { RAIZ, leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const casos = leerCasosSergio(
  readFileSync(path.join(RAIZ, 'data-raw/casos-oro/casos-sergio.md'), 'utf8'),
).casos;
const caso = (id: string): CasoSergio => {
  const c = casos.find((x) => x.id === id);
  if (!c) throw new Error(`falta el caso ${id}`);
  return c;
};
const fabrica = (c: ConfiguracionMotor) => crearMotor(leerParametroDeDisco, c);

const IDS_CASOS = [
  'jub-ord-2026-plana-40a',
  'jub-ord-2026-bases-crecientes',
  'jub-ord-2026-carrera-20a',
] as const;

/** Entrada del caso y su configuración sin lecturas (solo el escenario, si lo hay). */
function preparar(id: string): { entrada: EntradaJubilacion; configuracion: ConfiguracionMotor } {
  const c = caso(id);
  const cfg = (c.datos['configuracion'] ?? {}) as ConfiguracionMotor;
  return {
    entrada: entradaDeCaso(c) as EntradaJubilacion,
    configuracion: cfg.escenario ? { escenario: cfg.escenario } : {},
  };
}

function directa(entrada: EntradaJubilacion, configuracion: ConfiguracionMotor) {
  const r = fabrica(configuracion).jubilacion(entrada);
  if (!r.ok) throw r.error.original;
  return r;
}

describe('qué lecturas se ofrecen', () => {
  it('solo las de la jubilación con al menos dos valores, y ninguna alternativa inventada', () => {
    const ofrecidas = lecturasOfrecidas();
    expect(ofrecidas.length).toBeGreaterThan(0);
    for (const l of ofrecidas) {
      expect(l.motor).toBe('jubilacion');
      expect(l.alternativas.length).toBeGreaterThanOrEqual(2);
      const registro = LECTURAS_ABIERTAS.find((x) => x.id === l.id);
      expect(registro?.alternativas).toEqual(l.alternativas);
    }
    expect(ofrecidas.map((l) => l.id)).toEqual(
      LECTURAS_ABIERTAS.filter((l) => l.motor === 'jubilacion').map((l) => l.id),
    );
    expect(ofrecidas.some((l) => l.id.startsWith('incapacidad.'))).toBe(false);
  });

  it('una elección con ids o valores inexistentes se ignora al normalizar', () => {
    expect(
      normalizarEleccion({
        'jubilacion.baseMaxima': 'valor-inventado',
        'jubilacion.noExiste': 'x',
        'incapacidad.edadFiccion': 'edad-general',
      }),
    ).toEqual({});
  });

  it('solo se guardan las lecturas que difieren del valor por defecto', () => {
    const l = lecturasOfrecidas()[0]!;
    const otro = l.alternativas.find((a) => a !== l.porDefecto)!;
    expect(normalizarEleccion({ [l.id]: l.porDefecto })).toEqual({});
    expect(normalizarEleccion({ [l.id]: otro })).toEqual({ [l.id]: otro });
    expect(valoresElegidos({ [l.id]: otro })[l.id]).toBe(otro);
    expect(valoresElegidos({})[l.id]).toBe(l.porDefecto);
  });
});

describe('elección por defecto', () => {
  for (const id of IDS_CASOS) {
    it(`${id}: sin cambios, idéntico a la llamada directa (3-A) y sin diferencia`, () => {
      const { entrada, configuracion } = preparar(id);
      const r = compararLecturas(entrada, configuracion, {}, fabrica);
      expect(r.tipo).toBe('sin-cambios');
      if (r.tipo !== 'sin-cambios') return;
      expect(r.resultado.detalle).toEqual(directa(entrada, configuracion).detalle);
      // Una elección que repite los valores por defecto tampoco muestra diferencia.
      const igual = compararLecturas(entrada, configuracion, valoresElegidos({}), fabrica);
      expect(igual.tipo).toBe('sin-cambios');
    });
  }
});

describe('con una alternativa, el resultado coincide con la llamada directa al motor', () => {
  const alternativas: readonly [string, string][] = [
    ['jubilacion.actualizacionFactorMinimo', 'sin-suelo'],
    ['jubilacion.interpolacionIPC', 'escalon-anual'],
    ['jubilacion.lagunasAnterioresAlPrimerAlta', 'ignorar'],
    ['jubilacion.referenciaBaseMinimaLagunas', 'hecho-causante'],
    ['jubilacion.fraccionDemora', 'desde-primer-anio'],
  ];
  for (const id of IDS_CASOS) {
    for (const [lectura, valor] of alternativas) {
      it(`${id} con ${lectura} = ${valor}`, () => {
        const { entrada, configuracion } = preparar(id);
        const r = compararLecturas(entrada, configuracion, { [lectura]: valor }, fabrica);
        expect(r.tipo).toBe('comparado');
        if (r.tipo !== 'comparado') return;
        const elegida = directa(entrada, { ...configuracion, lecturas: { [lectura]: valor } });
        const porDefecto = directa(entrada, configuracion);
        expect(r.elegido.detalle).toEqual(elegida.detalle);
        expect(r.porDefecto.detalle).toEqual(porDefecto.detalle);
        expect(r.cambiadas).toEqual([
          {
            id: lectura,
            valor,
            porDefecto: LECTURAS_ABIERTAS.find((l) => l.id === lectura)?.porDefecto,
          },
        ]);
        const dPension = elegida.detalle.pensionMensual - porDefecto.detalle.pensionMensual;
        const dBase = elegida.detalle.baseReguladora - porDefecto.detalle.baseReguladora;
        expect(r.diferencia.pension.euros).toBeCloseTo(dPension, 9);
        expect(r.diferencia.baseReguladora.euros).toBeCloseTo(dBase, 9);
        expect(r.diferencia.pension.porcentaje).toBeCloseTo(
          (dPension / porDefecto.detalle.pensionMensual) * 100,
          9,
        );
        expect(r.diferencia.baseReguladora.porcentaje).toBeCloseTo(
          (dBase / porDefecto.detalle.baseReguladora) * 100,
          9,
        );
      });
    }
  }

  it('jub-ord-2026-carrera-20a: la lectura «ignorar» reproduce el resultado de Sergio (±0,02)', () => {
    const { entrada, configuracion } = preparar('jub-ord-2026-carrera-20a');
    const r = compararLecturas(
      entrada,
      configuracion,
      { 'jubilacion.lagunasAnterioresAlPrimerAlta': 'ignorar' },
      fabrica,
    );
    if (r.tipo !== 'comparado') throw new Error(r.tipo);
    const esperado = caso('jub-ord-2026-carrera-20a').esperado as { pensionMensual: number };
    expect(
      Math.abs(r.elegido.detalle.pensionMensual - esperado.pensionMensual),
    ).toBeLessThanOrEqual(0.02);
    // Con la lectura por defecto (integrar) la pensión es distinta: la diferencia es visible.
    expect(r.diferencia.pension.euros).toBeLessThan(0);
  });

  it('varias lecturas a la vez: todas figuran como cambiadas y coincide con el motor', () => {
    const { entrada, configuracion } = preparar('jub-ord-2026-bases-crecientes');
    const eleccion = {
      'jubilacion.actualizacionFactorMinimo': 'sin-suelo',
      'jubilacion.interpolacionIPC': 'interpolada',
    };
    const r = compararLecturas(entrada, configuracion, eleccion, fabrica);
    if (r.tipo !== 'comparado') throw new Error(r.tipo);
    expect(r.cambiadas.map((c) => c.id)).toEqual([
      'jubilacion.interpolacionIPC',
      'jubilacion.actualizacionFactorMinimo',
    ]);
    expect(r.elegido.detalle).toEqual(
      directa(entrada, { ...configuracion, lecturas: eleccion }).detalle,
    );
  });

  it('una lectura sin efecto en el caso da diferencia cero', () => {
    const { entrada, configuracion } = preparar('jub-ord-2026-plana-40a');
    const r = compararLecturas(
      entrada,
      configuracion,
      { 'jubilacion.fraccionDemora': 'desde-primer-anio' },
      fabrica,
    );
    if (r.tipo !== 'comparado') throw new Error(r.tipo);
    expect(r.diferencia.pension.euros).toBe(0);
    expect(r.diferencia.pension.porcentaje).toBe(0);
  });
});

describe('elegir y restablecer', () => {
  it('restablecer (elección vacía) devuelve al valor por defecto y a la ausencia de diferencia', () => {
    const { entrada, configuracion } = preparar('jub-ord-2026-bases-crecientes');
    const lectura = 'jubilacion.actualizacionFactorMinimo';
    let eleccion: Record<string, string> = { ...normalizarEleccion({ [lectura]: 'sin-suelo' }) };
    expect(lecturasCambiadas(eleccion)).toHaveLength(1);
    expect(compararLecturas(entrada, configuracion, eleccion, fabrica).tipo).toBe('comparado');
    eleccion = {};
    expect(lecturasCambiadas(eleccion)).toHaveLength(0);
    expect(valoresElegidos(eleccion)[lectura]).toBe(
      LECTURAS_ABIERTAS.find((l) => l.id === lectura)?.porDefecto,
    );
    const r = compararLecturas(entrada, configuracion, eleccion, fabrica);
    expect(r.tipo).toBe('sin-cambios');
    if (r.tipo === 'sin-cambios') {
      expect(r.resultado.detalle).toEqual(directa(entrada, configuracion).detalle);
    }
  });

  it('volver a elegir el valor por defecto de una lectura la quita de las cambiadas', () => {
    const lectura = 'jubilacion.fraccionDemora';
    const porDefecto = LECTURAS_ABIERTAS.find((l) => l.id === lectura)!.porDefecto;
    const cambiada = normalizarEleccion({ [lectura]: 'desde-primer-anio' });
    expect(lecturasCambiadas(cambiada)).toHaveLength(1);
    expect(lecturasCambiadas(normalizarEleccion({ ...cambiada, [lectura]: porDefecto }))).toEqual(
      [],
    );
  });
});
