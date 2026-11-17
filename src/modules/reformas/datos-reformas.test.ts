/**
 * Datos de la página «Reformas»: cada identificador de `ids-datos.ts` existe en /data, los valores
 * «antes» y «después» son los de los ficheros leídos por otra vía (el sistema de ficheros) y los
 * gráficos usan los mismos datos que las tablas.
 */
import { describe, expect, it } from 'vitest';
import cotizacionPara100Json from '../../../data/parametros/cotizacion-para-100.json';
import cuotaSolidaridadJson from '../../../data/parametros/cuota-solidaridad-calendario.json';
import edadOrdinariaJson from '../../../data/parametros/edad-ordinaria-jubilacion.json';
import periodoCalculoJson from '../../../data/parametros/periodo-calculo-base-reguladora.json';
import revalorizacionJson from '../../../data/parametros/revalorizacion-general.json';
import { formatearDuracion, formatearNumero, formatearPorcentaje } from '../../engine/formato';
import {
  cronologia,
  formatearValor,
  graficosParametros,
  nombreCorto,
  reformas,
} from './datos-reformas';
import { FICHEROS_PARAMETROS_REFORMAS } from './ficheros';
import { CALENDARIOS, DESTINOS, NOTAS_DE_ORIGEN, ROTULOS_PARAMETRO, VALORES } from './ids-datos';
import { PARAMETROS_NORMATIVOS } from '../../engine/esquema-datos';

interface ElementoCrudo {
  id: string;
  value: number | string;
  location?: string;
}
// El JSON sin tratar de cada fichero (no pasa por `elementosDe` ni por el esquema).
const CRUDOS: Record<string, { data: ElementoCrudo[] }> = {
  'edad-ordinaria-jubilacion': edadOrdinariaJson,
  'periodo-calculo-base-reguladora': periodoCalculoJson,
  'cotizacion-para-100': cotizacionPara100Json,
  'cuota-solidaridad-calendario': cuotaSolidaridadJson,
  'revalorizacion-general': revalorizacionJson,
};
const crudo = (nombre: string): ElementoCrudo[] => CRUDOS[nombre]?.data ?? [];
const valorCrudo = (nombre: string, id: string): number => {
  const v = crudo(nombre).find((e) => e.id === id)?.value;
  if (typeof v !== 'number') throw new Error(`${nombre}#${id}`);
  return v;
};

describe('cronología y fichas', () => {
  it('hay una ficha por norma de la cronología, en el mismo orden (por fecha de aprobación)', () => {
    const normas = cronologia().normas;
    expect(reformas().map((r) => r.id)).toEqual(normas.map((n) => n.id));
    const fechas = normas.map((n) => n.fecha);
    expect([...fechas].sort()).toEqual(fechas);
  });

  it('cada ficha tiene fechas, al menos un cambio con cita y línea de fuente', () => {
    for (const r of reformas()) {
      expect(r.aprobacion, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.publicacion, r.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(r.publicacion >= r.aprobacion, r.id).toBe(true);
      expect(r.cambios.length, r.id).toBeGreaterThan(0);
      for (const c of r.cambios) {
        expect(c.evidencia.length, `${r.id} ${c.parametro}`).toBeGreaterThan(10);
        expect(c.articulos.length, `${r.id} ${c.parametro}`).toBeGreaterThan(3);
      }
      expect(r.fuente.source.url, r.id).toMatch(/^https:\/\/www\.boe\.es\//);
      expect(r.fuente.fetchedAt, r.id).toBeTruthy();
    }
  });

  it('la entrada en vigor es null solo si la cronología declara que no consta', () => {
    for (const r of reformas()) {
      expect(r.entradaEnVigor === null, r.id).toBe(r.norma.entradaEnVigor.base === 'sin-texto');
    }
  });

  it('cada parámetro de la cronología tiene rótulo y destino', () => {
    for (const p of PARAMETROS_NORMATIVOS) {
      expect(ROTULOS_PARAMETRO[p].length, p).toBeGreaterThan(3);
      expect(DESTINOS[p], p).toBeDefined();
    }
  });
});

describe('qué datos de /data se enlazan a cada norma', () => {
  const normas = new Map(cronologia().normas.map((n) => [n.id, n]));

  it('cada norma y cada parámetro de la configuración están en la cronología', () => {
    for (const c of [...CALENDARIOS, ...VALORES]) {
      const n = normas.get(c.norma);
      expect(n, c.norma).toBeDefined();
      expect(
        n?.cambios.map((x) => x.parametro),
        `${c.norma}: ${c.parametro}`,
      ).toContain(c.parametro);
    }
  });

  it('cada nota de origen corresponde a una norma y un parámetro configurados', () => {
    const claves = new Set([...CALENDARIOS, ...VALORES].map((c) => `${c.norma}:${c.parametro}`));
    for (const k of Object.keys(NOTAS_DE_ORIGEN)) expect(claves.has(k), k).toBe(true);
  });

  it('los ficheros que usa la configuración son los declarados', () => {
    const usados = new Set([
      ...CALENDARIOS.flatMap((c) => c.columnas.map((x) => x.fichero)),
      ...VALORES.flatMap((v) => v.filas.map((f) => f.fichero)),
      'edad-ordinaria-jubilacion',
      'periodo-calculo-base-reguladora',
      'cotizacion-para-100',
    ]);
    const declarados = new Set(
      FICHEROS_PARAMETROS_REFORMAS.map((f) =>
        f.replace(/^data\/parametros\//, '').replace(/\.json$/, ''),
      ),
    );
    expect(usados).toEqual(declarados);
  });

  it('los calendarios tienen una fila por año y los años en orden', () => {
    for (const r of reformas())
      for (const t of r.tablas.filter((x) => x.tipo === 'calendario')) {
        const anios = t.filas.map((f) => Number(f[0]));
        expect(anios.length, t.clave).toBeGreaterThan(1);
        anios.forEach((a, i) => {
          if (i > 0) expect(a, t.clave).toBe((anios[i - 1] ?? 0) + 1);
        });
        for (const f of t.filas) expect(f.length, t.clave).toBe(t.columnas.length);
      }
  });

  it('la edad ordinaria de la Ley 27/2011: antes y después son los de /data leídos del fichero', () => {
    const r = reformas().find((x) => x.id === 'ley-27-2011');
    const t = r?.tablas.find((x) => x.parametro === 'edad-ordinaria');
    expect(t).toBeDefined();
    const antes = valorCrudo('edad-ordinaria-jubilacion', '2012');
    const despues = valorCrudo('edad-ordinaria-jubilacion', '2027');
    expect(t?.antes).toContain(formatearDuracion(antes));
    expect(t?.antes).toContain(formatearNumero(antes));
    expect(t?.despues).toContain(formatearDuracion(despues));
    expect(t?.filas[0]?.[0]).toBe('2013');
    expect(t?.filas.at(-1)?.[0]).toBe('2027');
    expect(t?.filas.at(-1)?.[2]).toBe(formatearDuracion(despues));
  });

  it('el periodo de cálculo de la reforma de 2023: del valor de 2025 al de 2037', () => {
    const t = reformas()
      .find((x) => x.id === 'rdl-2-2023')
      ?.tablas.find((x) => x.parametro === 'periodo-calculo');
    expect(t?.antes).toContain(
      formatearDuracion(valorCrudo('periodo-calculo-base-reguladora', '2025')),
    );
    expect(t?.despues).toContain(
      formatearDuracion(valorCrudo('periodo-calculo-base-reguladora', '2037')),
    );
  });

  it('el calendario de la cotización adicional de solidaridad tiene tres tramos por año', () => {
    const t = reformas()
      .find((x) => x.id === 'rdl-2-2023')
      ?.tablas.find((x) => x.parametro === 'cuota-solidaridad');
    expect(t?.columnas).toEqual(['Año', 'Tramo a', 'Tramo b', 'Tramo c', 'Dónde está en la norma']);
    const fila = t?.filas.find((f) => f[0] === '2025');
    expect(fila?.[1]).toBe(
      formatearPorcentaje(valorCrudo('cuota-solidaridad-calendario', '2025-tramo-a') / 100, {
        maxDecimales: 2,
      }),
    );
  });

  it('una norma sin serie en /data lo dice en vez de inventar un valor', () => {
    const r = reformas().find((x) => x.id === 'ley-26-1985');
    expect(r?.tablas).toEqual([]);
  });

  it('el incremento de las pensiones de cada real decreto es el de /data', () => {
    for (const [id, anio] of [
      ['rd-316-2025', '2025'],
      ['rd-241-2026', '2026'],
      ['rdl-28-2018', '2019'],
    ] as const) {
      const t = reformas()
        .find((x) => x.id === id)
        ?.tablas.find((x) => x.parametro === 'revalorizacion');
      expect(t?.filas[0]?.[1], id).toBe(
        formatearPorcentaje(valorCrudo('revalorizacion-general', anio) / 100, { maxDecimales: 2 }),
      );
    }
  });
});

describe('formato', () => {
  it('formatea meses, duración y porcentaje con el formato es-ES', () => {
    expect(formatearValor(1, 'meses')).toMatch(/^1 mes$/);
    expect(formatearValor(24, 'duracion')).toBe(formatearDuracion(24));
    expect(formatearValor(0.25, 'porcentaje')).toBe(
      formatearPorcentaje(0.0025, { maxDecimales: 2 }),
    );
    expect(formatearValor('texto', 'meses')).toBe('texto');
  });
  it('abrevia el nombre de la norma', () => {
    expect(nombreCorto('Real Decreto-ley 2/2023, de 16 de marzo, de medidas')).toMatch(
      /^RDL 2\/2023$/,
    );
    expect(nombreCorto('Ley 27/2011, de 1 de agosto, sobre')).toMatch(/^Ley 27\/2011$/);
    expect(nombreCorto('Real Decreto Legislativo 8/2015, de 30')).toMatch(/^RDLeg 8\/2015$/);
    expect(nombreCorto('Real Decreto 316/2025, de 15')).toMatch(/^RD 316\/2025$/);
  });
});

describe('gráficos', () => {
  it('usan los mismos valores que /data y que las tablas de las fichas', () => {
    const graficos = graficosParametros();
    expect(graficos.map((g) => g.clave)).toEqual(['edad', 'periodo', 'maximo']);
    const ficheros = {
      edad: 'edad-ordinaria-jubilacion',
      periodo: 'periodo-calculo-base-reguladora',
      maximo: 'cotizacion-para-100',
    } as const;
    for (const g of graficos) {
      const puntos = g.series[0]?.puntos ?? [];
      const esperados = crudo(ficheros[g.clave]).map((e) => [Number(e.id), e.value]);
      expect(puntos.map((p) => [p.anio, p.valor])).toEqual(esperados);
      expect(g.definicion.length).toBeGreaterThan(20);
      expect(g.fuentes.length).toBe(esperados.length);
    }
  });

  it('las rupturas marcan el primer año del calendario de cada norma (salvo el primero de la serie)', () => {
    const periodo = graficosParametros().find((g) => g.clave === 'periodo');
    const esperados = CALENDARIOS.filter(
      (c) => c.columnas[0]?.fichero === 'periodo-calculo-base-reguladora' && c.desde !== '2000',
    ).map((c) => Number(c.desde));
    expect(periodo?.rupturas.map((r) => r.anio)).toEqual(esperados);
    for (const r of periodo?.rupturas ?? [])
      expect(r.etiqueta).toMatch(/^(RDL|RD|RDLeg|Ley) \d+\/\d{4}$/);
  });
});
