/**
 * Fase R5: las fórmulas estructuradas de `normativa/prestaciones.json` son coherentes con los datos
 * de `parametros/`: cada cifra coincide con el dato referenciado y aparece en el texto original de
 * la fórmula, cada símbolo de la expresión está en la leyenda y al revés, y la leyenda no lleva cifras
 * escritas a mano.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { ArchivoDatos, ArchivoPrestaciones } from '../src/engine/esquema-datos.ts';
import { formatearNumero, formatearPorcentaje } from '../src/engine/formato.ts';
import {
  comprobarFormula,
  referenciasUsadas,
  resolverFormula,
  simbolosUsados,
  type ValorReferencia,
} from '../src/engine/formulas.ts';
import { validarFormulas } from './lib/validar-datos.ts';

const RAIZ = path.resolve(import.meta.dirname, '..');
const leer = (ruta: string): unknown => JSON.parse(readFileSync(path.join(RAIZ, ruta), 'utf8'));
const prestaciones = ArchivoPrestaciones.parse(leer('data/normativa/prestaciones.json'));
const conFormula = prestaciones.prestaciones.filter(
  (p) => p.calculo.formulaEstructurada !== undefined,
);

const cache = new Map<string, ReturnType<typeof ArchivoDatos.parse>>();
function dato(fichero: string, id: string): ValorReferencia | undefined {
  if (!cache.has(fichero)) {
    cache.set(fichero, ArchivoDatos.parse(leer(`data/parametros/${fichero}.json`)));
  }
  const d = cache.get(fichero)?.data?.find((x) => x.id === id);
  return d && typeof d.value === 'number'
    ? { valor: d.value, unidad: d.unit, periodo: d.period }
    : undefined;
}
const resolver = (ref: { fichero: string; id: string }) => dato(ref.fichero, ref.id);
const sinEspaciosDuros = (t: string) => t.replaceAll(String.fromCharCode(160), ' ');

describe('fórmulas estructuradas de las prestaciones', () => {
  it('hay fórmula estructurada en la jubilación ordinaria y en la incapacidad permanente (gran incapacidad)', () => {
    expect(conFormula.map((p) => p.id).sort()).toEqual([
      'incapacidad-permanente',
      'jubilacion-ordinaria',
    ]);
  });

  it('las prestaciones sin fórmula cerrada en la norma no llevan fórmula estructurada', () => {
    for (const id of [
      'viudedad',
      'orfandad',
      'favor-de-familiares',
      'pnc-jubilacion',
      'pnc-incapacidad',
    ]) {
      const p = prestaciones.prestaciones.find((x) => x.id === id);
      expect(p?.calculo.formulaEstructurada, id).toBeUndefined();
    }
  });

  it.each(conFormula.map((p) => [p.id, p] as const))(
    '%s: el texto original de la fórmula se conserva y la estructurada no lo sustituye',
    (_id, p) => {
      expect(p.calculo.formula.length).toBeGreaterThan(40);
      expect(p.calculo.articulos.length).toBeGreaterThan(0);
    },
  );

  it.each(conFormula.map((p) => [p.id, p] as const))(
    '%s: cada símbolo de la expresión está en la leyenda y al revés; cada cifra apunta a un dato numérico',
    (_id, p) => {
      const f = p.calculo.formulaEstructurada;
      if (!f) throw new Error('sin fórmula');
      expect(comprobarFormula(f, resolver, (fichero, id) => dato(fichero, id))).toEqual([]);
      expect([...simbolosUsados(f)].sort()).toEqual(f.simbolos.map((s) => s.id).sort());
    },
  );

  it.each(conFormula.map((p) => [p.id, p] as const))(
    '%s: cada cifra de la fórmula coincide con el dato referenciado y consta en el texto original',
    (_id, p) => {
      const f = p.calculo.formulaEstructurada;
      if (!f) throw new Error('sin fórmula');
      const resuelta = resolverFormula(f, resolver, {
        anioVigente: 2026,
        resolverSerie: (fichero, id) => dato(fichero, id),
      });
      const nodos = referenciasUsadas(f);
      expect(resuelta.cifras).toHaveLength(nodos.length);
      for (const [i, nodo] of nodos.entries()) {
        const d = dato(nodo.ref.fichero, nodo.ref.id);
        if (!d) throw new Error(`Sin dato ${nodo.ref.fichero}#${nodo.ref.id}`);
        const esperado =
          nodo.como === 'porcentaje'
            ? formatearPorcentaje(d.valor / 100, { maxDecimales: 2 })
            : formatearNumero(d.valor);
        expect(resuelta.cifras[i]?.texto).toBe(esperado);
        expect(resuelta.cifras[i]?.valor).toBe(d.valor);
        // La cifra consta también en el texto original de la fórmula (trazabilidad).
        const original = p.calculo.formula;
        expect(sinEspaciosDuros(original), `${esperado} en el texto de ${p.id}`).toContain(
          sinEspaciosDuros(esperado),
        );
      }
    },
  );

  it.each(conFormula.map((p) => [p.id, p] as const))(
    '%s: el texto de la leyenda y las notas no llevan cifras escritas a mano',
    (_id, p) => {
      const f = p.calculo.formulaEstructurada;
      if (!f) throw new Error('sin fórmula');
      const textos = [
        f.titulo,
        ...(f.notas ?? []),
        ...f.simbolos.flatMap((s) => [s.nombre, s.significado, s.notacion, s.unidad ?? '']),
        ...referenciasUsadas(f).map((n) => n.etiqueta ?? ''),
      ];
      for (const t of textos) expect(t, t).not.toMatch(/\d/);
    },
  );

  it('el calendario transitorio de las cifras que lo tienen sale de la misma serie anual', () => {
    const jub = conFormula.find((p) => p.id === 'jubilacion-ordinaria')?.calculo
      .formulaEstructurada;
    if (!jub) throw new Error('sin fórmula');
    const resuelta = resolverFormula(jub, resolver, {
      anioVigente: 2026,
      resolverSerie: (fichero, id) => dato(fichero, id),
    });
    const conTransitorio = resuelta.cifras.filter((c) => c.transitorio !== undefined);
    expect(conTransitorio).toHaveLength(2);
    for (const c of conTransitorio) {
      const t = dato(c.referencia.fichero, '2026');
      expect(c.transitorio?.texto).toBe(formatearNumero(t?.valor ?? Number.NaN));
      expect(c.transitorio?.periodo).toBe('2026');
    }
  });
});

describe('validate:data comprueba las fórmulas', () => {
  const directorio = path.join(RAIZ, 'data');
  const relativo = 'data/normativa/prestaciones.json';
  const original: unknown = leer(relativo);

  it('los datos actuales no dan errores', async () => {
    expect(await validarFormulas(original, relativo, directorio)).toEqual([]);
  });

  it('señala una referencia a un dato que no existe y un símbolo sin leyenda', async () => {
    const roto = structuredClone(original) as {
      prestaciones: { id: string; calculo: { formulaEstructurada?: { simbolos: unknown[] } } }[];
    };
    const jub = roto.prestaciones.find((p) => p.id === 'jubilacion-ordinaria');
    const f = jub?.calculo.formulaEstructurada as unknown as {
      ecuaciones: { derecha: { denominador: { ref: { id: string } } } }[];
      simbolos: { id: string }[];
    };
    f.ecuaciones[0]!.derecha.denominador.ref.id = 'no-existe';
    f.simbolos = f.simbolos.filter((s) => s.id !== 'porcentaje');
    const errores = (await validarFormulas(roto, relativo, directorio)).map((e) => e.mensaje);
    expect(errores.join('|')).toMatch(/divisor-base-reguladora#no-existe/);
    expect(errores.join('|')).toMatch(/«porcentaje» de la fórmula no está en la leyenda/);
  });
});
