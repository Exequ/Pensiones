/**
 * Fase 5-A2: datos nuevos de la página «Hucha» (deuda de la Seguridad Social, cifras del Tribunal de
 * Cuentas y artículo 109 del TRLGSS). Comprueba procedencia, coherencia interna y coherencia entre
 * fuentes independientes (Banco de España, BOE y ejecución del presupuesto).
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos } from '../src/engine/esquema-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const cargar = (ruta: string) =>
  ArchivoDatos.parse(JSON.parse(readFileSync(path.join(RAIZ, ruta), 'utf8')) as unknown);

const deuda = cargar('data/sistema/deuda-pde-seguridad-social.json');
const tribunal = cargar('data/sistema/prestamos-transferencias-tribunal-cuentas.json');
const trlgss = cargar('data/normativa/trlgss-financiacion.json');
const deficit = cargar('data/sistema/deficit-presupuestario-seguridad-social.json');

const serie = (a: ArchivoDatos, id: string) => {
  const s = a.series?.find((x) => x.id === id);
  if (!s) throw new Error(`Sin serie ${id}`);
  return s;
};
const dato = (a: ArchivoDatos, id: string) => {
  const d = a.data?.find((x) => x.id === id);
  if (!d || typeof d.value !== 'number') throw new Error(`Sin dato numérico ${id}`);
  return d.value;
};
/** Formato de cifras de los textos del BOE: «5.012», «106.162,6» (punto de miles también en cuatro cifras). */
const formatoBoe = (v: number): string => {
  const [entera = '', decimal] = String(v).split('.');
  const conMiles = entera.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  return decimal === undefined ? conMiles : `${conMiles},${decimal}`;
};
const cerca = (a: number, b: number, tolerancia: number) =>
  Math.abs(a - b) / Math.max(Math.abs(a), Math.abs(b)) <= tolerancia;

describe('procedencia de los ficheros nuevos', () => {
  it.each([
    ['deuda-pde-seguridad-social', deuda],
    ['prestamos-transferencias-tribunal-cuentas', tribunal],
    ['trlgss-financiacion', trlgss],
  ] as const)('%s: fuente, fecha de descarga y confianza en cada elemento', (_nombre, archivo) => {
    const elementos = [...(archivo.series ?? []), ...(archivo.data ?? [])];
    expect(elementos.length).toBeGreaterThan(0);
    for (const e of elementos) {
      expect(e.source.url, e.id).toMatch(/^https:\/\//);
      expect(e.fetchedAt, e.id).toMatch(/^\d{4}-\d{2}-\d{2}$/);
      expect(['alta', 'media', 'baja'], e.id).toContain(e.confidence);
    }
  });

  it('los datos con cita literal la llevan con su localización', () => {
    for (const d of [...(tribunal.data ?? []), ...(trlgss.data ?? [])]) {
      expect(d.quote?.length, d.id).toBeGreaterThan(20);
      expect(d.location, d.id).toBeTruthy();
      // La cifra del dato aparece en la cita con el formato del BOE (punto de miles, coma decimal).
      if (typeof d.value === 'number') {
        expect(d.quote, d.id).toContain(formatoBoe(d.value));
      }
    }
  });
});

describe('deuda PDE de la Seguridad Social (Banco de España)', () => {
  const trimestral = serie(deuda, 'deuda-pde-trimestral').points;
  const finAno = serie(deuda, 'deuda-pde-fin-ano').points;

  it('la serie trimestral es continua, sin trimestres repetidos ni huecos', () => {
    const indices = trimestral.map((p) => {
      const m = /^(\d{4})-T([1-4])$/.exec(p.period);
      if (!m?.[1] || !m[2]) throw new Error(`Periodo no trimestral ${p.period}`);
      return Number(m[1]) * 4 + Number(m[2]);
    });
    for (let i = 1; i < indices.length; i++) expect(indices[i]).toBe((indices[i - 1] ?? 0) + 1);
  });

  it('la serie de fin de año coincide con el cuarto trimestre', () => {
    for (const p of finAno) {
      const q4 = trimestral.find((t) => t.period === `${p.period}-T4`);
      expect(q4?.value, p.period).toBe(p.value);
    }
  });

  it('el saldo de 2022 coincide con el endeudamiento frente al Estado del Tribunal de Cuentas (±0,1 %)', () => {
    const bde = finAno.find((p) => p.period === '2022')?.value ?? 0;
    expect(cerca(bde, dato(tribunal, 'deuda-ss-con-estado-2022'), 0.001)).toBe(true);
  });

  it('el aumento del saldo entre 2016 y 2022 coincide con los préstamos de 2017 a 2022 (±0,5 %)', () => {
    const v = (a: string) => finAno.find((p) => p.period === a)?.value ?? 0;
    expect(
      cerca(v('2022') - v('2016'), dato(tribunal, 'prestamos-concedidos-2017-2022'), 0.005),
    ).toBe(true);
  });
});

describe('cifras del Tribunal de Cuentas', () => {
  it('los préstamos antiguos y recientes suman el endeudamiento de 2022', () => {
    const suma =
      dato(tribunal, 'prestamos-1992-1999') + dato(tribunal, 'prestamos-concedidos-2017-2022');
    expect(suma).toBeCloseTo(dato(tribunal, 'deuda-ss-con-estado-2022'), 1);
  });

  it('los tres grupos de préstamos antiguos suman su total (diferencia de redondeo ≤ 0,2)', () => {
    const suma =
      dato(tribunal, 'prestamos-insalud-1991') +
      dato(tribunal, 'prestamos-equilibrio-presupuestario-90') +
      dato(tribunal, 'prestamos-desfases-tesoreria-90');
    expect(Math.abs(suma - dato(tribunal, 'prestamos-1992-1999'))).toBeLessThanOrEqual(0.2);
  });

  it('las transferencias por finalidad suman el total del Tribunal (2018-2022)', () => {
    const suma =
      dato(tribunal, 'transferencias-equilibrio-2018-2021') +
      dato(tribunal, 'transferencias-costes-impropios-2021-2022');
    expect(suma).toBeCloseTo(dato(tribunal, 'transferencias-corrientes-2018-2022'), 1);
  });

  it('los préstamos de 2017 a 2022 coinciden con los pasivos financieros de la ejecución (±0,1 %)', () => {
    const pasivos = serie(deficit, 'pasivos-financieros').points.filter(
      (p) => Number(p.period) >= 2017 && Number(p.period) <= 2022,
    );
    const total = pasivos.reduce((s, p) => s + p.value, 0);
    expect(cerca(total, dato(tribunal, 'prestamos-concedidos-2017-2022'), 0.001)).toBe(true);
  });
});

describe('artículo 109 del TRLGSS', () => {
  it('cada cita es una frase del artículo y sigue en el texto consolidado descargado', () => {
    const texto = readFileSync(path.join(RAIZ, 'data-raw/boe/trlgss-2015-consolidado.txt'), 'utf8');
    for (const d of trlgss.data ?? []) {
      expect(texto.includes(d.quote ?? '\0'), d.id).toBe(true);
    }
  });
});
