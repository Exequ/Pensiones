// @vitest-environment node
/**
 * Serie mensual del IPC (`data/parametros/ipc-indice-mensual.json`, Fase 2-D): meses consecutivos,
 * tramos con su confianza, valores recalculados a partir de las series del INE de
 * `data-raw/ine/ipc-mensual/` (con su SHA-256) y cita literal que contiene la cifra de partida.
 */
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos } from '../src/engine/esquema-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const RAW = path.join(RAIZ, 'data-raw/ine/ipc-mensual');
const archivo = ArchivoDatos.parse(
  JSON.parse(readFileSync(path.join(RAIZ, 'data/parametros/ipc-indice-mensual.json'), 'utf8')),
);
const datos = archivo.data ?? [];
const origen = JSON.parse(readFileSync(path.join(RAW, 'origen.json'), 'utf8')) as Record<
  string,
  { url: string; sha256: string; fetchedAt: string }
>;

function serieIne(cod: string): Map<string, number> {
  const crudo = readFileSync(path.join(RAW, `${cod}.json`));
  expect(createHash('sha256').update(crudo).digest('hex'), `${cod}: SHA-256`).toBe(
    origen[`${cod}.json`]?.sha256,
  );
  const d = JSON.parse(crudo.toString('utf8')) as {
    Data: { Anyo: number; FK_Periodo: number; Valor: number | null }[];
  };
  const m = new Map<string, number>();
  for (const e of d.Data)
    if (e.Valor !== null) m.set(`${e.Anyo}-${String(e.FK_Periodo).padStart(2, '0')}`, e.Valor);
  return m;
}

const i25 = serieIne('IPC290751');
const anual = serieIne('IPC290750');
const i92 = serieIne('IPC2401');
const coma = (x: number) => String(x).replace('.', ',');
const por = new Map(datos.map((d) => [d.id, d]));
const valor = (id: string): number => Number(por.get(id)?.value);

describe('ipc-indice-mensual.json', () => {
  it('meses consecutivos de 1992-01 al último de la serie del INE, con el año como periodo', () => {
    const ids = datos.map((d) => d.id);
    expect(ids[0]).toBe('1992-01');
    const ultimo = [...i25.keys()].sort().at(-1);
    expect(ids.at(-1)).toBe(ultimo);
    let [a, m] = [1992, 1];
    for (const d of datos) {
      expect(d.id).toBe(`${a}-${String(m).padStart(2, '0')}`);
      expect(d.period).toBe(String(a));
      expect(d.unit).toBe('índice (base 2025)');
      if (++m > 12) [a, m] = [a + 1, 1];
    }
  });

  it('tramo A (desde 2002-01): la serie IPC290751 sin transformar, confianza alta', () => {
    const tramo = datos.filter((d) => d.id >= '2002-01');
    expect(tramo.length).toBe(i25.size);
    for (const d of tramo) {
      expect(d.value, d.id).toBe(i25.get(d.id));
      expect(d.confidence, d.id).toBe('alta');
      expect(d.source.docId).toBe('IPC290751');
      expect(d.quote, d.id).toContain(coma(i25.get(d.id) ?? NaN));
    }
  });

  it('tramo B (2001): índice de 2002 ÷ (1 + variación anual publicada), confianza media', () => {
    for (let m = 1; m <= 12; m++) {
      const mm = String(m).padStart(2, '0');
      const d = por.get(`2001-${mm}`);
      const esperado =
        (i25.get(`2002-${mm}`) ?? NaN) / (1 + (anual.get(`2002-${mm}`) ?? NaN) / 100);
      expect(d?.value, `2001-${mm}`).toBeCloseTo(esperado, 3);
      expect(d?.confidence).toBe('media');
      expect(d?.source.docId).toBe('IPC290750');
      expect(d?.quote).toContain(coma(i25.get(`2002-${mm}`) ?? NaN));
      expect(d?.quote).toContain(coma(anual.get(`2002-${mm}`) ?? NaN));
    }
  });

  it('tramo C (1992-2000): serie IPC2401 por un único coeficiente que la iguala al tramo B en enero de 2001', () => {
    const b01 = valor('2001-01');
    const coef = b01 / (i92.get('2001-01') ?? NaN);
    for (const d of datos.filter((x) => x.id < '2001-01')) {
      // El coeficiente del ETL se calcula con el índice de 2001-01 sin redondear: diferencia relativa < 2e-5.
      expect(Math.abs(Number(d.value) / ((i92.get(d.id) ?? NaN) * coef) - 1), d.id).toBeLessThan(
        2e-5,
      );
      expect(d.confidence, d.id).toBe('media');
      expect(d.source.docId).toBe('IPC2401');
      expect(d.quote, d.id).toContain(coma(i92.get(d.id) ?? NaN));
    }
  });

  it('el índice enlazado conserva las variaciones mensuales de la base 1992 dentro de 1992-2000', () => {
    for (let a = 1992; a <= 2000; a++)
      for (let m = 1; m <= 12; m++) {
        if (a === 1992 && m === 1) continue;
        const id = (y: number, k: number) => `${y}-${String(k).padStart(2, '0')}`;
        const [pa, pm] = m === 1 ? [a - 1, 12] : [a, m - 1];
        const real = (i92.get(id(a, m)) ?? NaN) / (i92.get(id(pa, pm)) ?? NaN);
        const enlazado = valor(id(a, m)) / valor(id(pa, pm));
        expect(Math.abs(enlazado / real - 1), id(a, m)).toBeLessThan(0.0002);
      }
  });

  it('la fuente de cada tramo consta en origen.json con su URL y fecha de descarga', () => {
    for (const cod of ['IPC290751', 'IPC290750', 'IPC2401']) {
      const o = origen[`${cod}.json`];
      expect(o?.url).toContain(cod);
      expect(o?.fetchedAt).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    }
    for (const d of datos) expect(d.fetchedAt).toBe(origen['IPC290751.json']?.fetchedAt);
  });

  it('las bases 2001 y 2006 son proporcionales a la de base 2025 (no amplían la cobertura)', () => {
    for (const [cod, hasta] of [
      ['IPC4191', '2006-12'],
      ['IPC77344', '2011-12'],
    ] as const) {
      const s = serieIne(cod);
      expect([...s.keys()].sort()[0]).toBe('2002-01');
      const cs = [...s.entries()]
        .filter(([k]) => k <= hasta)
        .map(([k, v]) => (i25.get(k) ?? NaN) / v);
      expect(Math.max(...cs) - Math.min(...cs), cod).toBeLessThan(5e-5);
    }
  });

  it('el INE advierte de que no se pueden calcular variaciones entre IPC-92 e IPC-2001', () => {
    const px = readFileSync(path.join(RAW, 'tabla-249-base-2001.px'), 'latin1');
    expect(px.replace(/"\s*\n"/g, '')).toContain(
      'No se pueden calcular variaciones de índices de precios entre dos períodos utilizando índices del sistema IPC-92 e IPC-2001',
    );
    expect(origen['tabla-249-base-2001.px']?.url).toBe('https://www.ine.es/jaxiT3/files/es/249.px');
  });
});
