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
import { LECTURAS_ABIERTAS, valoresPorDefecto } from '../src/engine/lecturas.ts';
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
