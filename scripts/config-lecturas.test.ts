// @vitest-environment node
/**
 * Configuración única de las lecturas abiertas (`lecturas-por-defecto.json`): cubre exactamente
 * las lecturas del registro, sus valores son alternativas válidas, cada entrada enlaza con su
 * pregunta actuarial y las decisiones tomadas constan en docs/DECISIONES_ACTUARIALES.md.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LECTURAS_INCAPACIDAD_POR_DEFECTO } from '../src/engine/incapacidad/tipos.ts';
import { LECTURAS_POR_DEFECTO } from '../src/engine/jubilacion/tipos.ts';
import { LECTURAS_ABIERTAS, lecturaPorId, valoresPorDefecto } from '../src/engine/lecturas.ts';
import { LECTURAS_MEI_POR_DEFECTO } from '../src/engine/mei/tipos.ts';
import { LECTURAS_PNC_POR_DEFECTO } from '../src/engine/no-contributivas/tipos.ts';
import { LECTURAS_SUPERVIVENCIA_POR_DEFECTO } from '../src/engine/supervivencia/tipos.ts';
import {
  CONFIG_LECTURAS,
  entradaDeLectura,
  porDefectoDelMotor,
} from '../src/engine/config/lecturas-por-defecto.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const claims = JSON.parse(readFileSync(path.join(RAIZ, 'docs/claims.json'), 'utf8')) as {
  claims: { id: string; revisionActuarial?: string }[];
};
const registro = readFileSync(path.join(RAIZ, 'docs/DECISIONES_ACTUARIALES.md'), 'utf8');

describe('configuración única de las lecturas abiertas', () => {
  it('tiene exactamente las lecturas del registro, sin repetir ninguna', () => {
    const ids = CONFIG_LECTURAS.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect([...ids].sort()).toEqual(LECTURAS_ABIERTAS.map((l) => l.id).sort());
  });

  it('cada valor es una alternativa de la lectura y el registro lo lee de la configuración', () => {
    for (const l of LECTURAS_ABIERTAS) {
      const e = entradaDeLectura(l.id);
      expect(l.alternativas, l.id).toContain(e.valor);
      expect(l.porDefecto, l.id).toBe(e.valor);
      expect(l.estado, l.id).toBe(e.estado);
      expect(l.fechaEstado, l.id).toBe(e.fecha);
      expect(e.pregunta, l.id).toBe(l.preguntaActuarial);
    }
    expect(valoresPorDefecto()).toEqual(
      Object.fromEntries(CONFIG_LECTURAS.map((e) => [e.id, e.valor])),
    );
  });

  it('las constantes de cada motor salen de la configuración', () => {
    expect(LECTURAS_POR_DEFECTO).toEqual(porDefectoDelMotor('jubilacion'));
    expect(LECTURAS_INCAPACIDAD_POR_DEFECTO).toEqual(porDefectoDelMotor('incapacidad'));
    expect(LECTURAS_SUPERVIVENCIA_POR_DEFECTO).toEqual(porDefectoDelMotor('supervivencia'));
    expect(LECTURAS_PNC_POR_DEFECTO).toEqual(porDefectoDelMotor('no-contributivas'));
    expect(LECTURAS_MEI_POR_DEFECTO).toEqual(porDefectoDelMotor('mei'));
  });

  it('cada entrada enlaza con una pregunta actuarial pendiente de docs/claims.json', () => {
    const preguntas = new Set(
      claims.claims.filter((c) => c.revisionActuarial === 'pendiente').map((c) => c.id),
    );
    for (const e of CONFIG_LECTURAS)
      expect(preguntas.has(e.pregunta), `${e.id}: ${e.pregunta}`).toBe(true);
  });

  it('las lecturas no pendientes llevan motivo, expuesto por el registro; las pendientes, no (salvo la que documenta una decisión de Sergio)', () => {
    // Una lectura pendiente puede llevar motivo si hay una decisión que documentar: hoy, solo esta.
    const pendientesConMotivo = ['incapacidad.lagunasAccidenteNoLaboral'];
    for (const l of LECTURAS_ABIERTAS) {
      if (l.estado === 'pendiente' && !pendientesConMotivo.includes(l.id))
        expect(l.motivo, l.id).toBeNull();
      else expect(l.motivo, l.id).toMatch(/\S/);
    }
    const estados = LECTURAS_ABIERTAS.map((l) => l.estado);
    // Revisión actuarial del 14-11-2026 (Ajustes actuariales 1).
    expect(estados.filter((e) => e === 'decidida')).toHaveLength(17);
    expect(estados.filter((e) => e === 'provisional')).toHaveLength(10);
    expect(estados.filter((e) => e === 'pendiente')).toHaveLength(1);
    expect(lecturaPorId('jubilacion.interpolacionIPC')?.estado).toBe('decidida');
    expect(lecturaPorId('incapacidad.lagunasAccidenteNoLaboral')?.estado).toBe('pendiente');
  });

  it('la confianza actuarial del motivo va en palabras o como porcentaje de la revisión del 14-11-2026, nunca con otra cifra', () => {
    // Fase 2-E: solo palabras. Desde el 14-11-2026 la revisión da porcentajes: «con confianza del 85 al 95 %»
    // o «del 70 %» (con espacio de no separación antes de «%»).
    const porcentaje = /confianza del \d{2}(?: al \d{2})?\u00a0%/;
    for (const e of CONFIG_LECTURAS) {
      if (e.motivo === undefined) continue;
      for (const frase of e.motivo.split(/(?<=\.)\s/)) {
        if (!/confianza/i.test(frase) || !/\d/.test(frase)) continue;
        expect(frase, `${e.id}: ${frase}`).toMatch(porcentaje);
        // Un solo bloque de cifras (el porcentaje o su intervalo) en la frase de la confianza, más la fecha de la revisión.
        expect(frase.replace(/\d{1,2}-\d{2}-\d{4}/, '').replace(porcentaje, ''), e.id).not.toMatch(
          /\d/,
        );
      }
    }
  });

  it('los valores por defecto que cambiaron: el suelo del factor (Fase 2-E, provisional) y las lagunas del accidente no laboral (14-11-2026, vuelve a sin-integrar y queda pendiente)', () => {
    expect(lecturaPorId('jubilacion.actualizacionFactorMinimo')?.estado).toBe('provisional');
    expect(entradaDeLectura('jubilacion.actualizacionFactorMinimo').valor).toBe('suelo-1');
    expect(lecturaPorId('incapacidad.lagunasAccidenteNoLaboral')?.estado).toBe('pendiente');
    expect(entradaDeLectura('incapacidad.lagunasAccidenteNoLaboral').valor).toBe('sin-integrar');
  });

  it('los cambios de estado del 14-11-2026 llevan esa fecha y el valor no cambia (salvo las lagunas del accidente no laboral)', () => {
    const decididas = [
      ['jubilacion.opcion25EnUltimoDia2040', 'incluida'],
      ['jubilacion.fraccionDemora', 'desde-segundo-anio'],
      ['supervivencia.ventanaBaseReguladora', 'anterior-al-mes-previo'],
      ['jubilacion.referenciaBaseMinimaLagunas', 'mes-de-la-laguna'],
      ['jubilacion.interpolacionIPC', 'mensual-ine'],
      ['incapacidad.divisorPeriodoCorto', 'coeficiente-rd-1799-1985'],
    ] as const;
    const provisionales = [
      ['incapacidad.computoFiccion', 'meses'],
      ['incapacidad.redondeoEdadCarencia', 'sin-redondeo'],
      ['incapacidad.diasCotizadosParcial', 'naturales'],
      ['supervivencia.diasCotizados', 'naturales'],
    ] as const;
    for (const [id, valor] of decididas) {
      const e = entradaDeLectura(id);
      expect([e.estado, e.valor, e.fecha], id).toEqual(['decidida', valor, '2026-11-14']);
    }
    for (const [id, valor] of provisionales) {
      const e = entradaDeLectura(id);
      expect([e.estado, e.valor, e.fecha], id).toEqual(['provisional', valor, '2026-11-14']);
    }
    // Siguen provisionales y la revisión se añade al motivo.
    for (const id of [
      'jubilacion.lagunasAnterioresAlPrimerAlta',
      'jubilacion.actualizacionFactorMinimo',
      'supervivencia.carenciaFamiliaresAccidenteNoLaboral',
      'supervivencia.comparacionCompensatoria',
      'supervivencia.reduccionLimiteConjunto',
      'no-contributivas.limiteConTerceraPersona',
    ]) {
      const e = entradaDeLectura(id);
      expect(e.estado, id).toBe('provisional');
      expect(e.motivo, id).toContain('revisión actuarial del 14-11-2026');
    }
    expect(entradaDeLectura('no-contributivas.limiteConTerceraPersona').motivo).toContain(
      'real decreto de revalorización de 2026',
    );
  });

  it('el registro de decisiones (docs/DECISIONES_ACTUARIALES.md) lista todas las lecturas y su estado', () => {
    for (const e of CONFIG_LECTURAS) {
      const fila = registro.split('\n').find((l) => l.includes(`\`${e.id}\``));
      expect(fila, `${e.id} sin fila en docs/DECISIONES_ACTUARIALES.md`).toBeDefined();
      expect(fila, e.id).toContain(e.estado);
      expect(fila, e.id).toContain(e.fecha);
      expect(fila, e.id).toContain(`\`${e.valor}\``);
    }
  });
});
