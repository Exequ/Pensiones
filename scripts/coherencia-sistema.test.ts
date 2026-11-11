// @vitest-environment node
/**
 * Tests de coherencia de los datos estadísticos del sistema (/data/sistema, Fase 1B-1):
 * años sin huecos, sumas por clase, régimen y sexo que igualan al total, ratios en rango.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoTabla } from '../src/engine/esquema-datos.ts';

const SISTEMA = path.resolve(import.meta.dirname, '../data/sistema');

function json(nombre: string): unknown {
  return JSON.parse(readFileSync(path.join(SISTEMA, `${nombre}.json`), 'utf8')) as unknown;
}

type Fila = Record<string, string>;
function csv(nombre: string): Fila[] {
  const [cab = '', ...resto] = readFileSync(path.join(SISTEMA, `${nombre}.csv`), 'utf8')
    .split('\n')
    .filter((l) => l !== '');
  const columnas = cab.split(',');
  return resto.map((l) => Object.fromEntries(l.split(',').map((v, i) => [columnas[i] ?? '', v])));
}

function num(fila: Fila | undefined, campo: string): number {
  const v = Number(fila?.[campo]);
  if (!Number.isFinite(v)) throw new Error(`Falta ${campo} en ${JSON.stringify(fila)}`);
  return v;
}

function serie(fichero: string, id: string): Map<string, number> {
  const archivo = ArchivoDatos.parse(json(fichero));
  const s = archivo.series?.find((x) => x.id === id);
  if (!s) throw new Error(`No existe la serie ${id} en ${fichero}`);
  return new Map(s.points.map((p) => [p.period, p.value]));
}

const CLASES = ['incapacidad', 'jubilacion', 'viudedad', 'orfandad', 'favor-familiares'];
const anios = (desde: number, hasta: number) =>
  Array.from({ length: hasta - desde + 1 }, (_, i) => String(desde + i));

describe('tablas del sistema: cabecera y filas', () => {
  for (const nombre of [
    'pensiones-vigor-regimen-clase-sexo',
    'altas-bajas-anual-clase-sexo',
    'complementos-minimos-regimen-clase-sexo',
    'afiliacion-media-mensual-regimen',
    'afiliados-sexo-edad',
  ]) {
    it(`${nombre}: el JSON hermano describe el CSV`, () => {
      const t = ArchivoTabla.parse(json(nombre));
      expect(t.filas).toBe(csv(nombre).length);
      expect(Object.keys(csv(nombre)[0] ?? {})).toEqual(t.columnas.map((c) => c.id));
    });
  }
});

describe('pensiones en vigor por régimen, clase y sexo', () => {
  const filas = csv('pensiones-vigor-regimen-clase-sexo');
  const dato = (a: string, rg: string, cl: string, sx: string) =>
    filas.find((f) => f.anio === a && f.regimen === rg && f.clase === cl && f.sexo === sx);

  it('tiene todos los años de 2008 a 2025 sin huecos', () => {
    const vistos = [...new Set(filas.map((f) => f.anio))].sort();
    expect(vistos).toEqual(anios(2008, 2025));
  });

  it('las cinco clases suman el total del sistema (cada año y sexo)', () => {
    for (const a of anios(2008, 2025)) {
      for (const sx of ['ambos', 'hombres', 'mujeres']) {
        const suma = CLASES.reduce((s, c) => s + num(dato(a, 'total-sistema', c, sx), 'numero'), 0);
        expect(suma, `${a} ${sx}`).toBe(num(dato(a, 'total-sistema', 'total', sx), 'numero'));
      }
    }
  });

  it('los regímenes suman el total del sistema (tolerancia de 20 pensiones, solo 2008)', () => {
    for (const a of anios(2008, 2025)) {
      for (const cl of ['total', ...CLASES]) {
        const regs = filas.filter(
          (f) =>
            f.anio === a && f.clase === cl && f.sexo === 'ambos' && f.regimen !== 'total-sistema',
        );
        const suma = regs.reduce((s, f) => s + Number(f.numero || 0), 0);
        const total = num(dato(a, 'total-sistema', cl, 'ambos'), 'numero');
        expect(Math.abs(suma - total), `${a} ${cl}`).toBeLessThanOrEqual(20);
      }
    }
  });

  it('hombres + mujeres + sin sexo = ambos', () => {
    for (const a of anios(2008, 2025)) {
      const h = num(dato(a, 'total-sistema', 'total', 'hombres'), 'numero');
      const m = num(dato(a, 'total-sistema', 'total', 'mujeres'), 'numero');
      const t = num(dato(a, 'total-sistema', 'total', 'ambos'), 'numero');
      expect(t - h - m, a).toBeGreaterThanOrEqual(0);
      expect(t - h - m, a).toBeLessThan(300);
    }
  });

  it('las pensiones medias están en un rango razonable y crecen en el periodo', () => {
    const pm = (a: string) =>
      num(dato(a, 'total-sistema', 'total', 'ambos'), 'pension_media_eur_mes');
    for (const a of anios(2008, 2025)) {
      expect(pm(a)).toBeGreaterThan(500);
      expect(pm(a)).toBeLessThan(2500);
    }
    expect(pm('2025')).toBeGreaterThan(pm('2008'));
  });

  it('las series de totales coinciden con la tabla', () => {
    const s = serie('pensiones-vigor-numero', 'total-ambos');
    for (const a of anios(2008, 2025)) {
      expect(s.get(a)).toBe(num(dato(a, 'total-sistema', 'total', 'ambos'), 'numero'));
    }
  });
});

describe('pensionistas, pensiones y afiliados', () => {
  const ptas = serie('pensionistas-pensiones-historico', 'pensionistas');
  const pnes = serie('pensionistas-pensiones-historico', 'pensiones');

  it('serie 2006-2025 sin huecos y con más pensiones que pensionistas', () => {
    expect([...ptas.keys()]).toEqual(anios(2006, 2025));
    for (const [a, v] of ptas) expect(pnes.get(a) ?? 0).toBeGreaterThan(v);
  });

  it('las pensiones de la serie histórica difieren menos de 0,01 % de la tabla por clase', () => {
    const tabla = serie('pensiones-vigor-numero', 'total-ambos');
    for (const a of anios(2008, 2025)) {
      const t = tabla.get(a) ?? 0;
      expect(Math.abs((pnes.get(a) ?? 0) - t) / t, a).toBeLessThan(0.0001);
    }
  });

  it('las razones afiliados/pensionista están entre 1,5 y 3', () => {
    for (const id of [
      'afiliados-diciembre-por-pensionista',
      'afiliados-diciembre-por-pension',
      'afiliados-media-anual-por-pensionista',
      'afiliados-media-anual-por-pension',
    ]) {
      const s = serie('relacion-afiliados-pensiones', id);
      expect([...s.keys()]).toEqual(anios(2006, 2025));
      for (const v of s.values()) {
        expect(v).toBeGreaterThan(1.5);
        expect(v).toBeLessThan(3);
      }
    }
  });

  it('afiliación mensual: sin meses sueltos y total = suma de regímenes (sin cuidadores)', () => {
    const filas = csv('afiliacion-media-mensual-regimen');
    const meses = [...new Set(filas.map((f) => f.mes))].sort();
    expect(meses[0]).toBe('2001-01');
    for (let i = 1; i < meses.length; i++) {
      const [a0 = 0, m0 = 0] = (meses[i - 1] ?? '').split('-').map(Number);
      const siguiente = m0 === 12 ? `${a0 + 1}-01` : `${a0}-${String(m0 + 1).padStart(2, '0')}`;
      expect(meses[i]).toBe(siguiente);
    }
    for (const mes of meses) {
      const delMes = filas.filter((f) => f.mes === mes);
      const total = num(
        delMes.find((f) => f.regimen === 'total-sistema'),
        'afiliados_medios',
      );
      const suma = delMes
        .filter((f) => !['total-sistema', 'cuidadores-no-profesionales'].includes(f.regimen ?? ''))
        .reduce((s, f) => s + Number(f.afiliados_medios), 0);
      expect(Math.abs(total - suma), mes).toBeLessThan(5);
    }
  });

  it('afiliados por sexo y edad: tramos y sexos suman el total y coinciden con la serie mensual', () => {
    const filas = csv('afiliados-sexo-edad');
    const mensual = csv('afiliacion-media-mensual-regimen');
    for (const a of anios(2021, 2025)) {
      const de = (sx: string) => filas.filter((f) => f.anio === a && f.sexo === sx);
      const total = (sx: string) =>
        num(
          de(sx).find((f) => f.tramo_edad === 'total'),
          'afiliados_diciembre',
        );
      const tramos = de('ambos').filter((f) => f.tramo_edad !== 'total');
      expect(tramos).toHaveLength(11);
      expect(
        Math.abs(tramos.reduce((s, f) => s + Number(f.afiliados_diciembre), 0) - total('ambos')),
      ).toBeLessThan(500);
      expect(Math.abs(total('hombres') + total('mujeres') - total('ambos'))).toBeLessThan(100);
      const mes = mensual.find((f) => f.mes === `${a}-12` && f.regimen === 'total-sistema');
      expect(Math.abs(total('ambos') - num(mes, 'afiliados_medios'))).toBeLessThan(1);
    }
  });
});

describe('altas y bajas anuales', () => {
  const filas = csv('altas-bajas-anual-clase-sexo');
  it('2021-2025 completos; las cinco clases suman el total; hombres + mujeres = ambos', () => {
    expect([...new Set(filas.map((f) => f.anio))].sort()).toEqual(anios(2021, 2025));
    const dato = (a: string, mv: string, cl: string, sx: string) =>
      filas.find((f) => f.anio === a && f.movimiento === mv && f.clase === cl && f.sexo === sx);
    for (const a of anios(2021, 2025)) {
      for (const mv of ['alta-inicial', 'baja-definitiva']) {
        for (const sx of ['ambos', 'hombres', 'mujeres']) {
          const suma = CLASES.reduce((s, c) => s + num(dato(a, mv, c, sx), 'numero'), 0);
          expect(suma, `${a} ${mv} ${sx}`).toBe(num(dato(a, mv, 'total', sx), 'numero'));
        }
        const dif =
          num(dato(a, mv, 'total', 'ambos'), 'numero') -
          num(dato(a, mv, 'total', 'hombres'), 'numero') -
          num(dato(a, mv, 'total', 'mujeres'), 'numero');
        expect(dif, `${a} ${mv}`).toBeGreaterThanOrEqual(0);
        expect(dif, `${a} ${mv}`).toBeLessThan(200);
      }
    }
  });
  it('edad media de las altas de jubilación entre 60 y 70 años', () => {
    const s = serie('edad-media-altas-jubilacion', 'edad-media-altas-jubilacion');
    expect([...s.keys()]).toEqual(anios(2022, 2025));
    for (const v of s.values()) {
      expect(v).toBeGreaterThan(60);
      expect(v).toBeLessThan(70);
    }
  });
});

describe('complementos por mínimos', () => {
  const min = csv('complementos-minimos-regimen-clase-sexo');
  const vigor = csv('pensiones-vigor-regimen-clase-sexo');
  it('años 2022-2025; nunca más complementos que pensiones; el porcentaje cuadra', () => {
    expect([...new Set(min.map((f) => f.anio))].sort()).toEqual(anios(2022, 2025));
    for (const f of min) {
      if (f.numero === '' || f.regimen === 'sovi') continue;
      const v = vigor.find(
        (x) =>
          x.anio === f.anio && x.regimen === f.regimen && x.clase === f.clase && x.sexo === f.sexo,
      );
      if (!v || v.numero === '' || Number(v.numero) < 500) continue;
      expect(Number(f.numero), JSON.stringify(f)).toBeLessThanOrEqual(Number(v.numero));
      const pct = (100 * Number(f.numero)) / Number(v.numero);
      expect(Math.abs(pct - Number(f.porcentaje_sobre_pensiones)), JSON.stringify(f)).toBeLessThan(
        0.6,
      );
    }
  });
});
