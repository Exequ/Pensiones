import { describe, expect, it } from 'vitest';
import { formatearEuros } from '../../engine/formato';
import {
  anioVigente,
  elementosDe,
  FICHEROS_COMO_SE_CALCULA,
  resolverParametro,
  resolverReferencia,
} from './datos-como';
import {
  PARAMETROS_INCAPACIDAD,
  PARAMETROS_JUBILACION,
  PARAMETROS_SUPERVIVENCIA,
} from './ids-datos';

const TODOS = [...PARAMETROS_JUBILACION, ...PARAMETROS_INCAPACIDAD, ...PARAMETROS_SUPERVIVENCIA];

describe('parámetros vigentes de /data', () => {
  it('el año vigente es el último con dato de la pensión máxima', () => {
    const anios = elementosDe('pension-maxima').map((d) => Number(d.id));
    expect(anioVigente()).toBe(Math.max(...anios));
  });

  it.each(TODOS.map((p) => [p.clave, p] as const))(
    '%s se resuelve con fuente y rótulo',
    (_c, p) => {
      const r = resolverParametro(p);
      expect(r, `${p.fichero}#${p.id}`).toBeDefined();
      expect(r!.dato.source.url).toMatch(/^https?:\/\//);
      expect(r!.dato.fetchedAt).toBeTruthy();
      expect(['alta', 'media', 'baja']).toContain(r!.dato.confidence);
      expect(r!.valor.length).toBeGreaterThan(0);
      expect(/\d/.test(p.rotulo), `rótulo con cifras: ${p.rotulo}`).toBe(false);
      expect(FICHEROS_COMO_SE_CALCULA).toContain(`data/parametros/${p.fichero}.json`);
    },
  );

  it('las claves de cada lista son únicas', () => {
    for (const lista of [PARAMETROS_JUBILACION, PARAMETROS_INCAPACIDAD, PARAMETROS_SUPERVIVENCIA]) {
      expect(new Set(lista.map((p) => p.clave)).size).toBe(lista.length);
    }
  });

  it('la versión vigente de una escala por tramos no supera el año vigente', () => {
    for (const p of TODOS.filter((x) => x.id.startsWith('@version'))) {
      const r = resolverParametro(p)!;
      expect(Number(r.idDato.slice(0, 4)), p.clave).toBeLessThanOrEqual(anioVigente());
    }
  });

  it('los importes se formatean con el valor del dato', () => {
    const maxima = resolverParametro(
      PARAMETROS_JUBILACION.find((p) => p.clave === 'pension-maxima')!,
    )!;
    const dato = elementosDe('pension-maxima').find((d) => d.id === String(anioVigente()))!;
    expect(maxima.valor).toBe(`${formatearEuros(dato.value as number, { decimales: 2 })} al mes`);
  });
});

describe('referencias de los pasos del motor', () => {
  it('resuelve «parametros/fichero.json#id» con ubicación y cita', () => {
    const r = resolverReferencia('parametros/divisor-base-reguladora.json#2030');
    expect(r.fichero).toBe('divisor-base-reguladora');
    expect(r.valor).toBe(361.67);
    expect(r.ubicacion).toBeTruthy();
    expect(r.dato?.source.url).toMatch(/^https:/);
  });
  it('una referencia que no existe se devuelve sin dato en lugar de lanzar', () => {
    const r = resolverReferencia('parametros/divisor-base-reguladora.json#no-existe');
    expect(r.dato).toBeUndefined();
    expect(resolverReferencia('parametros/fichero-inexistente.json#x').dato).toBeUndefined();
  });
});
