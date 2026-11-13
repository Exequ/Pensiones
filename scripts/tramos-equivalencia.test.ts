// @vitest-environment node
/**
 * Fase 3-B1, paso 3: expresando como tramos los casos de Sergio `jub-ord-2026-plana-40a`,
 * `jub-ord-2026-bases-crecientes` y `jub-ord-2026-carrera-20a`, el mapeador produce el mismo
 * resultado que la llamada directa al motor (±0,01). Además, una referencia a serie de /data
 * (base máxima) da lo mismo que escribir a mano los importes de esa serie.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { crearMotor, type ConfiguracionMotor } from '../src/engine/fachada.ts';
import { formularioAEntrada } from '../src/modules/tu-pension/mapeador.ts';
import { FORMULARIO_BASE } from '../src/modules/tu-pension/pruebas.ts';
import type { TramoFormulario } from '../src/modules/tu-pension/tramos.ts';
import { entradaDeCaso, leerCasosSergio, type CasoSergio } from './lib/casos-sergio.ts';
import { RAIZ, leerParametroDeDisco } from './lib/motor-jubilacion.ts';
import { catalogoDesdeDisco } from './lib/referencias-disco.ts';

const casos = leerCasosSergio(
  readFileSync(path.join(RAIZ, 'data-raw/casos-oro/casos-sergio.md'), 'utf8'),
).casos;
const catalogo = catalogoDesdeDisco();

interface Periodo {
  desde: string;
  hasta: string;
  baseMensual: number;
}

const caso = (id: string): CasoSergio => {
  const c = casos.find((x) => x.id === id);
  if (!c) throw new Error(`falta el caso ${id}`);
  return c;
};

/** Carrera del caso → tramos del formulario (un tramo por periodo). */
function aTramos(periodos: readonly Periodo[]): TramoFormulario[] {
  return periodos.map((p, i) => {
    const [da = '', dm = ''] = p.desde.split('-');
    const [ha = '', hm = ''] = p.hasta.split('-');
    return {
      id: `t${String(i)}`,
      desdeMes: String(Number(dm)),
      desdeAnio: da,
      hastaMes: String(Number(hm)),
      hastaAnio: ha,
      referencia: 'importe' as const,
      importe: String(p.baseMensual).replace('.', ','),
    };
  });
}

function pensionDelMapeador(c: CasoSergio, tramos: TramoFormulario[]) {
  const [na = '', nm = ''] = String(c.datos['nacimiento']).split('-');
  const [ja = '', jm = ''] = c.fecha.split('-');
  const cfg = (c.datos['configuracion'] ?? {}) as ConfiguracionMotor;
  const opciones = (c.datos['opciones'] ?? {}) as { aplicarMinimos?: boolean };
  const mapeo = formularioAEntrada(
    {
      ...FORMULARIO_BASE,
      nacimientoMes: String(Number(nm)),
      nacimientoAnio: na,
      jubilacionMes: String(Number(jm)),
      jubilacionAnio: ja,
      aplicarMinimos: opciones.aplicarMinimos ?? true,
      ipcSupuesto: '',
      tipoCarrera: 'tramos',
      tramos,
    },
    catalogo,
  );
  if (!mapeo.ok) throw new Error(JSON.stringify([mapeo.errores, mapeo.erroresTramos]));
  // El formulario no tiene selector de lecturas (es de la 3-B2): se usan las del propio caso para
  // que la comparación sea solo la de la carrera, el mapeo de fechas y las opciones.
  const motor = crearMotor(leerParametroDeDisco, {
    ...mapeo.configuracion,
    ...(cfg.lecturas ? { lecturas: cfg.lecturas } : {}),
  });
  const r = motor.jubilacion(mapeo.entrada);
  if (!r.ok) throw r.error.original;
  return r.detalle;
}

function pensionDirecta(c: CasoSergio) {
  const cfg = (c.datos['configuracion'] ?? {}) as ConfiguracionMotor;
  const r = crearMotor(leerParametroDeDisco, cfg).jubilacion(entradaDeCaso(c) as never);
  if (!r.ok) throw r.error.original;
  return r.detalle;
}

describe('la carrera por tramos del mapeador equivale a la llamada directa al motor', () => {
  for (const id of [
    'jub-ord-2026-plana-40a',
    'jub-ord-2026-bases-crecientes',
    'jub-ord-2026-carrera-20a',
  ]) {
    it(`${id}: mismos resultados (±0,01)`, () => {
      const c = caso(id);
      const periodos = c.carrera as Periodo[];
      const directa = pensionDirecta(c);
      const viaMapeador = pensionDelMapeador(c, aTramos(periodos));
      expect(viaMapeador.cumpleRequisitos).toBe(true);
      expect(Math.abs(viaMapeador.pensionMensual - directa.pensionMensual)).toBeLessThanOrEqual(
        0.01,
      );
      expect(Math.abs(viaMapeador.baseReguladora - directa.baseReguladora)).toBeLessThanOrEqual(
        0.01,
      );
      expect(viaMapeador.mesesCotizados).toBe(directa.mesesCotizados);
      // Y con el resultado de Sergio, dentro de su tolerancia.
      const esperado = c.esperado as { pensionMensual: number; tolerancia?: number };
      expect(Math.abs(viaMapeador.pensionMensual - esperado.pensionMensual)).toBeLessThanOrEqual(
        esperado.tolerancia ?? 0.01,
      );
    });
  }

  it('una referencia a la serie de la base máxima equivale a escribir sus importes (jub-ord-2026-bases-maximas-tope)', () => {
    const c = caso('jub-ord-2026-bases-maximas-tope');
    const periodos = c.carrera as Periodo[];
    const maxima = catalogo.referencias.find((r) => r.id === 'base-maxima');
    // Los periodos del caso que coinciden con una base máxima de /data pasan a referencia.
    const tramos = aTramos(periodos).map((t, i) => {
      const p = periodos[i];
      if (!p) return t;
      const desde = Number(p.desde.slice(0, 4));
      const hasta = Number(p.hasta.slice(0, 4));
      const coincide =
        desde === hasta &&
        maxima?.valores.get(desde) === p.baseMensual &&
        p.desde.endsWith('-01') &&
        p.hasta.endsWith('-12');
      return coincide ? { ...t, referencia: 'maxima' as const, importe: '' } : t;
    });
    expect(tramos.filter((t) => t.referencia === 'maxima').length).toBeGreaterThan(10);
    const viaReferencias = pensionDelMapeador(c, tramos);
    const viaImportes = pensionDelMapeador(c, aTramos(periodos));
    expect(viaReferencias.pensionMensual).toBeCloseTo(viaImportes.pensionMensual, 9);
    expect(viaReferencias.baseReguladora).toBeCloseTo(viaImportes.baseReguladora, 9);
    expect(
      Math.abs(viaReferencias.pensionMensual - pensionDirecta(c).pensionMensual),
    ).toBeLessThanOrEqual(0.01);
  });
});
