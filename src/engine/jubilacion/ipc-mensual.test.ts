/**
 * IPC mensual del INE (Fase 2-D): lectura `mensual-ine` del motor, encadenamiento con el escenario
 * más allá del último mes publicado, alternativas anteriores y suelo del factor de actualización.
 */
import { describe, expect, it } from 'vitest';
import { DatoNoDisponible } from './errores.ts';
import { PARAMS, calc, contexto, continua } from './pruebas.ts';
import { parsearMes } from './tiempo.ts';

const M = (texto: string) => parsearMes(texto);
const dato = (texto: string): number => {
  const v = PARAMS.ipcIndiceMensual.valores.get(M(texto));
  if (v === undefined) throw new Error(`sin dato ${texto}`);
  return v;
};

describe('serie mensual cargada de /data', () => {
  it('cubre de enero de 1992 al último mes publicado sin huecos', () => {
    const s = PARAMS.ipcIndiceMensual;
    expect(s.primero).toBe(M('1992-01'));
    expect(s.ultimo).toBeGreaterThanOrEqual(M('2026-10'));
    for (let t = s.primero; t <= s.ultimo; t++) expect(s.valores.has(t)).toBe(true);
  });
});

describe('lectura mensual-ine (por defecto)', () => {
  it('ctx.ipc devuelve el índice publicado de cada mes', () => {
    const ctx = contexto();
    expect(ctx.lecturas.interpolacionIPC).toBe('mensual-ine');
    for (const mes of ['1996-05', '2001-12', '2002-01', '2024-01', '2024-09', '2026-10'])
      expect(ctx.ipc(M(mes))).toBe(dato(mes));
  });

  it('el cociente de septiembre de 2024 y enero de 2024 es el del INE y no el de las medias anuales', () => {
    const ctx = contexto();
    const real = ctx.ipc(M('2024-09')) / ctx.ipc(M('2024-01'));
    expect(real).toBe(dato('2024-09') / dato('2024-01'));
    const interpolada = contexto({ lecturas: { interpolacionIPC: 'interpolada' } });
    const aprox = interpolada.ipc(M('2024-09')) / interpolada.ipc(M('2024-01'));
    expect(aprox).toBeGreaterThan(real);
  });

  it('después del último mes publicado encadena con la tasa anual del escenario en tasas mensuales iguales', () => {
    const ctx = contexto({ escenario: { ipc: 0.03 } });
    const ultimo = PARAMS.ipcIndiceMensual.ultimo;
    const base = PARAMS.ipcIndiceMensual.valores.get(ultimo) ?? NaN;
    expect(ctx.ipc(ultimo + 12)).toBeCloseTo(base * 1.03, 9);
    expect(ctx.ipc(ultimo + 1)).toBeCloseTo(base * 1.03 ** (1 / 12), 9);
    expect([...ctx.avisos].some((a) => a.includes('último mes publicado'))).toBe(true);
  });

  it('después del último mes y sin escenario, DatoNoDisponible (no se inventa el IPC)', () => {
    const ctx = contexto();
    expect(() => ctx.ipc(PARAMS.ipcIndiceMensual.ultimo + 1)).toThrow(DatoNoDisponible);
  });

  it('antes del primer mes mensual usa la interpolación anual con aviso', () => {
    const ctx = contexto({ escenario: { ipc: 0.02 } });
    const v = ctx.ipc(M('1991-06'));
    expect(Number.isFinite(v)).toBe(true);
    expect([...ctx.avisos].some((a) => a.includes('interpolan las medias anuales'))).toBe(true);
  });

  it('el escenario que sustituye el histórico ignora la serie mensual', () => {
    const ctx = contexto({ escenario: { ipc: 0.02, sustituirHistoricoIPC: true } });
    expect(ctx.ipc(M('2024-09')) / ctx.ipc(M('2024-01'))).toBeCloseTo(1.02 ** (8 / 12), 2);
  });

  it('las alternativas interpolada y escalón anual siguen disponibles y dan otro índice', () => {
    const a = contexto({ lecturas: { interpolacionIPC: 'interpolada' } }).ipc(M('2024-03'));
    const b = contexto({ lecturas: { interpolacionIPC: 'escalon-anual' } }).ipc(M('2024-03'));
    expect(a).not.toBe(b);
    expect(a).not.toBe(dato('2024-03'));
  });

  it('un hecho causante de 2022 con carrera anterior a 2000 ya no lanza DatoNoDisponible sin escenario', () => {
    // Antes (medias anuales): la ventana de 2022 llega a 1996-1997, anterior al primer índice de /data.
    const r = calc(
      [continua('1980-01', '2021-11', 2000)],
      '1957-01-01',
      '2022-01-01',
      'ordinaria',
      {
        calcularAunqueNoCumpla: true,
      },
    );
    expect(r.baseReguladora).toBeGreaterThan(0);
    expect(() =>
      calc([continua('1980-01', '2021-11', 2000)], '1957-01-01', '2022-01-01', 'ordinaria', {
        lecturas: { interpolacionIPC: 'interpolada' },
        calcularAunqueNoCumpla: true,
      }),
    ).toThrow(DatoNoDisponible);
  });
});

describe('suelo del factor de actualización (actualizacionFactorMinimo)', () => {
  const carrera = [continua('1995-01', '2026-10', 2000)];
  const por = (suelo: 'sin-suelo' | 'suelo-1') =>
    calc(carrera, '1961-11-15', '2026-11-15', 'ordinaria', {
      escenario: { ipc: 0.02 },
      usarOpcion25Anos: false,
      lecturas: { actualizacionFactorMinimo: suelo },
    });

  it('por defecto no hay suelo', () => {
    expect(contexto().lecturas.actualizacionFactorMinimo).toBe('sin-suelo');
  });

  it('con septiembre de 2024 como referencia hay meses anteriores (junio de 2024) con factor menor que uno', () => {
    expect(dato('2024-09')).toBeLessThan(dato('2024-06'));
  });

  it('con suelo de uno la base reguladora es mayor o igual, y distinta en este caso', () => {
    const sin = por('sin-suelo').baseReguladora;
    const con = por('suelo-1').baseReguladora;
    expect(con).toBeGreaterThan(sin);
    expect(con / sin - 1).toBeLessThan(0.001);
  });

  it('sin meses con factor menor que uno, las dos lecturas coinciden', () => {
    const p = (suelo: 'sin-suelo' | 'suelo-1') =>
      calc([continua('1995-01', '2025-12', 2000)], '1961-01-01', '2026-01-01', 'ordinaria', {
        escenario: { ipc: 0.02 },
        usarOpcion25Anos: false,
        lecturas: { actualizacionFactorMinimo: suelo },
      }).baseReguladora;
    expect(p('suelo-1')).toBe(p('sin-suelo'));
  });
});
