import { describe, expect, it } from 'vitest';
import type { FormulaEstructurada, RefParametro } from './esquema-datos';
import { FormulaEstructurada as EsquemaFormula } from './esquema-datos';
import {
  comprobarFormula,
  referenciasUsadas,
  resolverFormula,
  simbolosUsados,
  type ValorReferencia,
} from './formulas';

/** Parámetros FICTICIOS: solo para probar el motor de fórmulas, sin relación con ninguna norma. */
const PARAMETROS: Readonly<Record<string, ValorReferencia>> = {
  'muestra#meses': { valor: 6, unidad: 'meses ficticios', periodo: '2030' },
  'muestra#divisor': { valor: 1234.5, unidad: 'divisor ficticio', periodo: '2030' },
  'muestra#porcentaje': { valor: 45, unidad: '% ficticio', periodo: '2030' },
  'serie#2026': { valor: 2000, unidad: 'divisor transitorio ficticio', periodo: '2026' },
};
const resolver = (ref: RefParametro): ValorReferencia | undefined =>
  PARAMETROS[`${ref.fichero}#${ref.id}`];

const FORMULA: FormulaEstructurada = EsquemaFormula.parse({
  titulo: 'Fórmula ficticia',
  alcance: 'completa',
  ecuaciones: [
    {
      izquierda: { tipo: 'simbolo', id: 'media' },
      derecha: {
        tipo: 'cociente',
        numerador: {
          tipo: 'sumatorio',
          variable: 'indice',
          hasta: { tipo: 'numero', ref: { fichero: 'muestra', id: 'meses' }, etiqueta: 'Meses' },
          cuerpo: {
            tipo: 'simbolo',
            id: 'valor',
            subindice: { tipo: 'simbolo', id: 'indice' },
          },
        },
        denominador: {
          tipo: 'numero',
          ref: { fichero: 'muestra', id: 'divisor' },
          transitorio: 'serie',
        },
      },
    },
    {
      izquierda: { tipo: 'simbolo', id: 'total' },
      derecha: {
        tipo: 'producto',
        factores: [
          { tipo: 'simbolo', id: 'media' },
          { tipo: 'numero', ref: { fichero: 'muestra', id: 'porcentaje' }, como: 'porcentaje' },
        ],
      },
    },
  ],
  simbolos: [
    { id: 'media', notacion: 'M', nombre: 'Media', significado: 'Valor medio.', unidad: 'euros' },
    { id: 'valor', notacion: 'V', nombre: 'Valor', significado: 'Cada valor.', unidad: 'euros' },
    { id: 'indice', notacion: 'i', nombre: 'Índice', significado: 'Orden.', unidad: null },
    { id: 'total', notacion: 'Total', nombre: 'Total', significado: 'Resultado.', unidad: 'euros' },
  ],
  notas: ['Una nota.'],
});

describe('fórmulas estructuradas', () => {
  it('lista los símbolos y las referencias que usa', () => {
    expect(simbolosUsados(FORMULA).sort()).toEqual(['indice', 'media', 'total', 'valor']);
    expect(referenciasUsadas(FORMULA).map((r) => r.ref.id)).toEqual([
      'meses',
      'divisor',
      'porcentaje',
    ]);
  });

  it('una fórmula coherente no da problemas', () => {
    expect(comprobarFormula(FORMULA, resolver, resolver as never)).toEqual([]);
  });

  it('resuelve las cifras con el valor del dato, en es-ES, y las explica en la leyenda', () => {
    const f = resolverFormula(FORMULA, resolver, {
      anioVigente: 2026,
      resolverSerie: (fichero, id) => PARAMETROS[`${fichero}#${id}`],
    });
    expect(f.cifras.map((c) => c.texto)).toEqual(['6', '1.234,5', '45 %']);
    expect(f.cifras[0]?.descripcion).toBe('Meses');
    // Sin etiqueta, la leyenda usa la unidad del dato.
    expect(f.cifras[1]?.descripcion).toBe('divisor ficticio');
    expect(f.cifras[1]?.transitorio).toEqual({
      texto: '2.000',
      periodo: '2026',
      descripcion: 'divisor transitorio ficticio',
    });
    expect(f.alcance).toBe('completa');
    expect(f.simbolos).toHaveLength(4);
    expect(f.notas).toEqual(['Una nota.']);
  });

  it('el sumatorio empieza en uno si no se indica otra cosa', () => {
    const f = resolverFormula(FORMULA, resolver);
    const derecha = f.ecuaciones[0]?.derecha;
    if (derecha?.tipo !== 'cociente' || derecha.numerador.tipo !== 'sumatorio') throw new Error();
    expect(derecha.numerador.desde).toEqual({ tipo: 'numero', texto: '1' });
    expect(derecha.numerador.hasta).toEqual({ tipo: 'numero', texto: '6' });
  });

  it('lee cada ecuación en palabras, con los nombres de la leyenda y las cifras de los datos', () => {
    const f = resolverFormula(FORMULA, resolver);
    expect(f.ecuaciones[0]?.lectura).toBe(
      'Media es igual a suma, para i desde 1 hasta 6, de valor sub i dividido entre 1.234,5.',
    );
    expect(f.ecuaciones[1]?.lectura).toBe('Total es igual a media por 45 %.');
  });

  it('señala un símbolo sin leyenda, una leyenda sin uso y un identificador repetido', () => {
    const sinLeyenda: FormulaEstructurada = {
      ...FORMULA,
      simbolos: FORMULA.simbolos.filter((s) => s.id !== 'valor'),
    };
    expect(comprobarFormula(sinLeyenda, resolver, resolver as never).join('|')).toMatch(
      /«valor» de la fórmula no está en la leyenda/,
    );
    const sobrante: FormulaEstructurada = {
      ...FORMULA,
      simbolos: [
        ...FORMULA.simbolos,
        { id: 'otro', notacion: 'X', nombre: 'Otro', significado: 'Sin uso.', unidad: null },
      ],
    };
    expect(comprobarFormula(sobrante, resolver, resolver as never).join('|')).toMatch(
      /«otro» de la leyenda no aparece en la fórmula/,
    );
    const repetido: FormulaEstructurada = {
      ...FORMULA,
      simbolos: [...FORMULA.simbolos, ...FORMULA.simbolos.slice(0, 1)],
    };
    expect(comprobarFormula(repetido, resolver, resolver as never).join('|')).toMatch(
      /«media» está repetido/,
    );
  });

  it('señala una referencia que no existe y no resuelve una fórmula con problemas', () => {
    const rota = EsquemaFormula.parse({
      ...FORMULA,
      ecuaciones: [
        {
          izquierda: { tipo: 'simbolo', id: 'total' },
          derecha: { tipo: 'numero', ref: { fichero: 'muestra', id: 'no-existe' } },
        },
      ],
      simbolos: [FORMULA.simbolos[3]],
    });
    expect(comprobarFormula(rota, resolver).join('|')).toMatch(/muestra#no-existe/);
    expect(() => resolverFormula(rota, resolver)).toThrow(/no válida/);
  });

  it('el esquema rechaza expresiones mal formadas', () => {
    expect(
      EsquemaFormula.safeParse({
        ...FORMULA,
        ecuaciones: [
          {
            izquierda: { tipo: 'simbolo', id: 'total' },
            derecha: { tipo: 'suma', terminos: [{ tipo: 'simbolo', id: 'media' }] },
          },
        ],
      }).success,
    ).toBe(false);
    // Una cifra escrita a mano no es una expresión válida: solo hay referencias.
    expect(
      EsquemaFormula.safeParse({
        ...FORMULA,
        ecuaciones: [
          {
            izquierda: { tipo: 'simbolo', id: 'total' },
            derecha: { tipo: 'numero', valor: 3 },
          },
        ],
      }).success,
    ).toBe(false);
  });
});
