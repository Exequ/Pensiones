/**
 * Efecto del orden entre el límite conjunto (art. 229.1 TRLGSS) y el complemento a mínimos
 * (art. 59.1 TRLGSS) en la viudedad con varias orfandades (Ajustes actuariales 4, punto 2).
 *
 * El motor aplica primero el límite conjunto y después el complemento a mínimos (orden A). Ningún
 * artículo lo fija expresamente: se deduce de los arts. 229.1 («la suma de las cuantías de las
 * pensiones», en «la determinación inicial») y 59.1 («los complementos necesarios para alcanzar la
 * cuantía mínima»). Este test no cambia el orden del motor: mide qué pasaría con el orden inverso
 * (orden B: cada pensión se completa hasta su mínima y después la suma, con los complementos, se
 * limita a la base reguladora, reduciendo la orfandad como hace el motor, art. 229.3).
 *
 * Construcción del orden B sin tocar el motor: la cuantía de cada beneficiario antes del límite y
 * con su complemento a mínimos es la del cálculo aislado de ese beneficiario (la viudedad sola o un
 * huérfano solo no alcanzan nunca la base reguladora), y el límite se aplica después a la suma.
 */
import { describe, expect, it } from 'vitest';
import { reglaSV } from './parametros.ts';
import { parametrosSupervivenciaDelRepositorio } from './parametros-datos.ts';
import { calcularOrfandad, calcularSupervivencia, calcularViudedad } from './repositorio.ts';
import type { BeneficiarioViudedad, Causante } from './tipos.ts';

const P = parametrosSupervivenciaDelRepositorio();
const r = (id: string): number => reglaSV(P, id);

const causante = (baseMensual: number): Causante => ({
  fechaFallecimiento: '2026-03-15',
  causa: 'enfermedad-comun',
  situacion: 'alta',
  carrera: [{ desde: '2010-01', hasta: '2026-02', baseMensual }],
});
const CONYUGE: BeneficiarioViudedad = {
  vinculo: 'conyuge',
  nacimiento: '1976-05-01',
  fechaMatrimonio: '2005-06-01',
};
const huerfanos = (n: number) =>
  Array.from({ length: n }, (_, i) => ({ nacimiento: `${String(2010 + i)}-01-01` }));

interface Medida {
  readonly ordenA: number;
  readonly ordenB: number;
  readonly limite: number;
}

/** Suma mensual de viudedad y orfandad con el orden del motor (A) y con el inverso (B). */
function medir(baseMensual: number, n: number): Medida {
  const cau = causante(baseMensual);
  const hs = huerfanos(n);
  const conjunto = calcularSupervivencia(cau, { viudos: [CONYUGE], huerfanos: hs });
  const ordenA = [...conjunto.viudedad, ...conjunto.orfandad].reduce(
    (a, p) => a + p.pensionMensual,
    0,
  );
  const pasoLimite = conjunto.pasos.find((p) => p.id === 'limite-conjunto');
  if (pasoLimite === undefined) throw new Error('sin paso del límite conjunto');
  const limite = Number(pasoLimite.valor);

  // Orden B: cada pensión con su complemento a mínimos, calculada sola (antes del límite).
  const viudedad = calcularViudedad(cau, [CONYUGE]).viudedad[0];
  if (viudedad === undefined) throw new Error('sin viudedad');
  const orfandades = hs.map((h) => {
    const o = calcularOrfandad(cau, [h], { hayViudoOHuerfanosPensionistas: true }).orfandad[0];
    if (o === undefined) throw new Error('sin orfandad');
    return o.pensionMensual;
  });
  const V = viudedad.pensionMensual;
  const O = orfandades.reduce((a, b) => a + b, 0);
  const excepcion = viudedad.porcentaje > r('limite-excepcion-viudedad-umbral-pct') && n > 1;
  const br = (limite * 100) / r('limite-conjunto-pct-br');
  const hueco = excepcion
    ? Math.max(limite - V, (br * r('limite-orfandad-max-pct')) / 100)
    : Math.max(0, limite - V);
  const ordenB = V + Math.min(O, hueco);
  return { ordenA, ordenB, limite };
}

const BASES = [1000, 1200, 1500, 2000, 3000] as const;
const ORFANDADES = [3, 4, 5] as const;

describe('Orden entre el límite conjunto y el complemento a mínimos (arts. 229.1 y 59.1)', () => {
  const tabla = BASES.flatMap((base) => ORFANDADES.map((n) => ({ base, n, ...medir(base, n) })));

  it('el orden del motor (A) nunca da menos que el inverso (B), y B no supera nunca el límite', () => {
    for (const f of tabla) {
      expect(f.ordenA, `base ${String(f.base)}, ${String(f.n)} orfandades`).toBeGreaterThanOrEqual(
        f.ordenB - 0.005,
      );
      expect(f.ordenB).toBeLessThanOrEqual(f.limite + 0.005);
    }
  });

  it('el efecto no es nulo: con bases bajas y medias el orden B da menos en los tres números de orfandades', () => {
    for (const f of tabla.filter((x) => x.base <= 2000))
      expect(
        f.ordenA - f.ordenB,
        `base ${String(f.base)}, ${String(f.n)} orfandades`,
      ).toBeGreaterThan(1);
  });

  it('con una base alta y tres o cuatro orfandades, los dos órdenes coinciden', () => {
    for (const f of tabla.filter((x) => x.base === 3000 && x.n < 5))
      expect(f.ordenA).toBeCloseTo(f.ordenB, 2);
    const cinco = tabla.find((x) => x.base === 3000 && x.n === 5);
    expect(cinco && cinco.ordenA - cinco.ordenB).toBeGreaterThan(1);
  });
});
