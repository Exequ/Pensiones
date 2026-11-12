// @vitest-environment node
/**
 * Registro único de lecturas abiertas (src/engine/lecturas.ts): cada lectura está completa y
 * enlazada con su efecto medido (docs/INFORME_VERIFICACION.md) y su pregunta actuarial
 * (docs/REVISION_ACTUARIAL.md / docs/claims.json); los valores por defecto son los de los motores.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { LECTURAS_INCAPACIDAD_POR_DEFECTO } from '../src/engine/incapacidad/tipos.ts';
import { LECTURAS_POR_DEFECTO } from '../src/engine/jubilacion/tipos.ts';
import {
  LECTURAS_ABIERTAS,
  type MotorLectura,
  erroresConfiguracion,
  lecturasDelMotor,
  resolverLecturas,
} from '../src/engine/lecturas.ts';
import { LECTURAS_MEI_POR_DEFECTO } from '../src/engine/mei/tipos.ts';
import { LECTURAS_PNC_POR_DEFECTO } from '../src/engine/no-contributivas/tipos.ts';
import { LECTURAS_SUPERVIVENCIA_POR_DEFECTO } from '../src/engine/supervivencia/tipos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const informe = readFileSync(path.join(RAIZ, 'docs/INFORME_VERIFICACION.md'), 'utf8');
const claims = JSON.parse(readFileSync(path.join(RAIZ, 'docs/claims.json'), 'utf8')) as {
  claims: { id: string; revisionActuarial?: string; preguntaActuarial?: string }[];
};
const revision = readFileSync(path.join(RAIZ, 'docs/REVISION_ACTUARIAL.md'), 'utf8');
const motorMd = readFileSync(path.join(RAIZ, 'docs/MOTOR.md'), 'utf8');

const DEFECTOS: Record<MotorLectura, Record<string, string>> = {
  jubilacion: { ...LECTURAS_POR_DEFECTO },
  incapacidad: { ...LECTURAS_INCAPACIDAD_POR_DEFECTO },
  supervivencia: { ...LECTURAS_SUPERVIVENCIA_POR_DEFECTO },
  'no-contributivas': { ...LECTURAS_PNC_POR_DEFECTO },
  mei: { ...LECTURAS_MEI_POR_DEFECTO },
};

describe('registro único de lecturas abiertas', () => {
  it('lista exactamente las opciones de cada motor, sin repetir ni olvidar ninguna', () => {
    const ids = LECTURAS_ABIERTAS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const motor of Object.keys(DEFECTOS) as MotorLectura[]) {
      const registradas = LECTURAS_ABIERTAS.filter((l) => l.motor === motor)
        .map((l) => l.opcion)
        .sort();
      expect(registradas, motor).toEqual(Object.keys(DEFECTOS[motor]).sort());
    }
  });

  it('el valor por defecto es el de la constante de cada motor y es una de las alternativas', () => {
    for (const l of LECTURAS_ABIERTAS) {
      expect(l.porDefecto, l.id).toBe(DEFECTOS[l.motor][l.opcion]);
      expect(l.alternativas, l.id).toContain(l.porDefecto);
      expect(l.alternativas.length, l.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('la descripción es de lenguaje llano y no lleva cifras', () => {
    for (const l of LECTURAS_ABIERTAS) {
      expect(l.descripcion.length, l.id).toBeGreaterThan(40);
      expect(l.descripcion, l.id).not.toMatch(/\d/);
    }
  });

  it('el efecto medido existe en docs/INFORME_VERIFICACION.md (sección y fila)', () => {
    for (const l of LECTURAS_ABIERTAS) {
      const [h2, h3] = l.efecto.seccion.split(' › ');
      const i = informe.indexOf(`## ${h2}`);
      expect(i, `${l.id}: sección «${h2}»`).toBeGreaterThanOrEqual(0);
      const j = informe.indexOf(`### ${h3}`, i);
      expect(j, `${l.id}: subsección «${h3}»`).toBeGreaterThan(i);
      const siguiente = informe.indexOf('\n## ', j);
      const trozo = informe.slice(j, siguiente < 0 ? undefined : siguiente);
      const escapada = l.efecto.fila.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      expect(trozo, `${l.id}: fila «${l.efecto.fila}»`).toMatch(
        new RegExp(`\\| ${escapada}\\s+\\|`),
      );
    }
  });

  it('la pregunta actuarial existe en docs/claims.json (pendiente, con pregunta) y en REVISION_ACTUARIAL.md', () => {
    for (const l of LECTURAS_ABIERTAS) {
      const c = claims.claims.find((x) => x.id === l.preguntaActuarial);
      expect(c, `${l.id}: ${l.preguntaActuarial}`).toBeDefined();
      expect(c?.revisionActuarial).toBe('pendiente');
      expect(c?.preguntaActuarial?.length).toBeGreaterThan(40);
      expect(revision).toContain(`\`${l.preguntaActuarial}\``);
    }
  });
});

describe('documentación', () => {
  it('docs/MOTOR.md lista todas las lecturas del registro con su valor por defecto', () => {
    for (const l of LECTURAS_ABIERTAS) {
      const id = l.id.replace('.', '\\.');
      expect(motorMd, l.id).toMatch(
        new RegExp('\\| `' + id + '` +\\| `' + l.porDefecto + '` +\\|'),
      );
    }
  });
});

describe('configuración de lecturas', () => {
  it('sin configuración, los valores son los de por defecto y no hay opciones que pasar a los motores', () => {
    const v = resolverLecturas();
    for (const l of LECTURAS_ABIERTAS) expect(v[l.id]).toBe(l.porDefecto);
    for (const motor of Object.keys(DEFECTOS) as MotorLectura[])
      expect(lecturasDelMotor(motor)).toEqual({});
  });

  it('una configuración válida sobrescribe y solo pasa al motor lo que cambia', () => {
    const c = { 'jubilacion.baseMaxima': 'sobre-cifra-inicial', 'mei.baseMEI': 'base-cotizacion' };
    expect(lecturasDelMotor('jubilacion', c)).toEqual({ baseMaxima: 'sobre-cifra-inicial' });
    expect(lecturasDelMotor('mei', c)).toEqual({});
  });

  it('ids desconocidos y valores que no son alternativas dan error claro', () => {
    expect(erroresConfiguracion({ 'jubilacion.noExiste': 'x' })[0]).toMatch(/desconocida/);
    expect(erroresConfiguracion({ 'jubilacion.baseMaxima': 'otra' })[0]).toMatch(
      /no es una alternativa/,
    );
    expect(() => resolverLecturas({ 'mei.baseMEI': 'otra' })).toThrow(RangeError);
  });
});
