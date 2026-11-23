/**
 * Fórmulas estructuradas de `normativa/prestaciones.json` (Fase R5): resolución de las referencias
 * a `data/parametros`, comprobaciones de coherencia y lectura en texto para tecnologías de apoyo.
 *
 * TypeScript puro, sin React ni DOM. La interfaz recibe el resultado (`FormulaResuelta`) y lo dibuja
 * con MathML; aquí no se escribe ninguna cifra: todas salen del dato referenciado.
 */
import type {
  ExprFormula,
  FormulaEstructurada,
  RefParametro,
  SimboloFormula,
} from './esquema-datos.ts';
import { formatearNumero, formatearPorcentaje } from './formato.ts';

/** Dato numérico al que apunta una referencia. */
export interface ValorReferencia {
  readonly valor: number;
  /** Unidad o descripción del dato (`unit`), que explica qué es la cifra. */
  readonly unidad: string;
  readonly periodo: string;
}

/** Busca un dato de `data/parametros`; `undefined` si no existe o no es numérico. */
export type ResolverReferencia = (ref: RefParametro) => ValorReferencia | undefined;

/** Expresión ya resuelta: lo que dibuja el componente. */
export type NodoMath =
  | { readonly tipo: 'simbolo'; readonly texto: string; readonly subindice?: NodoMath | undefined }
  | { readonly tipo: 'numero'; readonly texto: string }
  | { readonly tipo: 'suma'; readonly terminos: readonly NodoMath[] }
  | { readonly tipo: 'producto'; readonly factores: readonly NodoMath[] }
  | { readonly tipo: 'cociente'; readonly numerador: NodoMath; readonly denominador: NodoMath }
  | {
      readonly tipo: 'sumatorio';
      readonly variable: NodoMath;
      readonly desde: NodoMath;
      readonly hasta: NodoMath;
      readonly cuerpo: NodoMath;
    }
  | {
      readonly tipo: 'grupo';
      readonly cuerpo: NodoMath;
      readonly delimitador: 'parentesis' | 'corchetes';
    };

/** Cifra de la fórmula, con el dato del que sale. */
export interface CifraFormula {
  /** Valor tal como se escribe en la fórmula. */
  readonly texto: string;
  readonly valor: number;
  readonly referencia: RefParametro;
  /** Qué es la cifra, según el dato referenciado. */
  readonly descripcion: string;
  readonly periodo: string;
  /** Valor del calendario transitorio del año de referencia, si la cifra lo tiene. */
  readonly transitorio?: {
    readonly texto: string;
    readonly periodo: string;
    readonly descripcion: string;
  };
}

export interface FormulaResuelta {
  readonly titulo: string;
  readonly alcance: 'completa' | 'parcial';
  readonly ecuaciones: readonly {
    readonly izquierda: NodoMath;
    readonly derecha: NodoMath;
    /** Lectura de la ecuación en palabras. */
    readonly lectura: string;
  }[];
  readonly simbolos: readonly SimboloFormula[];
  readonly cifras: readonly CifraFormula[];
  readonly notas: readonly string[];
}

/** Hijos de una expresión, para recorrerla. */
function hijos(expr: ExprFormula): readonly ExprFormula[] {
  switch (expr.tipo) {
    case 'simbolo':
      return expr.subindice ? [expr.subindice] : [];
    case 'numero':
      return [];
    case 'suma':
      return expr.terminos;
    case 'producto':
      return expr.factores;
    case 'cociente':
      return [expr.numerador, expr.denominador];
    case 'sumatorio':
      return [...(expr.desde ? [expr.desde] : []), expr.hasta, expr.cuerpo];
    case 'grupo':
      return [expr.cuerpo];
  }
}

function recorrer(expr: ExprFormula, visita: (e: ExprFormula) => void): void {
  visita(expr);
  for (const h of hijos(expr)) recorrer(h, visita);
}

function expresionesDe(f: FormulaEstructurada): ExprFormula[] {
  return f.ecuaciones.flatMap((e) => [e.izquierda, e.derecha]);
}

/** Identificadores de símbolo que usa la fórmula (incluidos los índices de los sumatorios). */
export function simbolosUsados(f: FormulaEstructurada): string[] {
  const ids: string[] = [];
  const anotar = (id: string) => {
    if (!ids.includes(id)) ids.push(id);
  };
  for (const expr of expresionesDe(f)) {
    recorrer(expr, (e) => {
      if (e.tipo === 'simbolo') anotar(e.id);
      if (e.tipo === 'sumatorio') anotar(e.variable);
    });
  }
  return ids;
}

/** Referencias a datos de la fórmula, en orden de aparición y sin repetir. */
export function referenciasUsadas(f: FormulaEstructurada): ExprNumero[] {
  const vistas: ExprNumero[] = [];
  for (const expr of expresionesDe(f)) {
    recorrer(expr, (e) => {
      if (e.tipo !== 'numero') return;
      if (!vistas.some((v) => v.ref.fichero === e.ref.fichero && v.ref.id === e.ref.id))
        vistas.push(e);
    });
  }
  return vistas;
}

type ExprNumero = Extract<ExprFormula, { tipo: 'numero' }>;

/**
 * Comprueba la coherencia de una fórmula: cada símbolo usado está en la leyenda y cada símbolo de la
 * leyenda se usa; los identificadores de la leyenda no se repiten; cada referencia apunta a un dato
 * numérico existente. Devuelve los problemas (vacío si todo es correcto).
 */
export function comprobarFormula(
  f: FormulaEstructurada,
  resolver: ResolverReferencia,
  resolverSerie?: (fichero: string, id: string) => ValorReferencia | undefined,
): string[] {
  const problemas: string[] = [];
  const enLeyenda = f.simbolos.map((s) => s.id);
  for (const [i, id] of enLeyenda.entries()) {
    if (enLeyenda.indexOf(id) !== i)
      problemas.push(`El símbolo «${id}» está repetido en la leyenda`);
  }
  const usados = simbolosUsados(f);
  for (const id of usados) {
    if (!enLeyenda.includes(id))
      problemas.push(`El símbolo «${id}» de la fórmula no está en la leyenda`);
  }
  for (const id of enLeyenda) {
    if (!usados.includes(id))
      problemas.push(`El símbolo «${id}» de la leyenda no aparece en la fórmula`);
  }
  for (const e of referenciasUsadas(f)) {
    if (resolver(e.ref) === undefined) {
      problemas.push(
        `La referencia ${e.ref.fichero}#${e.ref.id} no apunta a un dato numérico existente`,
      );
    }
    if (e.transitorio !== undefined && resolverSerie === undefined) {
      problemas.push(`No se puede comprobar la serie transitoria ${e.transitorio}`);
    }
  }
  return problemas;
}

function capitalizar(texto: string): string {
  return texto.charAt(0).toUpperCase() + texto.slice(1);
}

function textoCifra(e: ExprNumero, v: ValorReferencia): string {
  return e.como === 'porcentaje'
    ? formatearPorcentaje(v.valor / 100, { maxDecimales: 2 })
    : formatearNumero(v.valor);
}

/**
 * Resuelve la fórmula: sustituye cada referencia por el valor del dato (formateado en es-ES) y
 * reúne la leyenda de símbolos, las cifras con su origen y la lectura en texto.
 *
 * `resolverSerie(fichero, id)` busca el dato del calendario transitorio (id = año); `anioVigente`
 * es el año cuyo valor se muestra junto a las cifras que lo tienen.
 */
export function resolverFormula(
  f: FormulaEstructurada,
  resolver: ResolverReferencia,
  opciones: {
    readonly anioVigente?: number;
    readonly resolverSerie?: (fichero: string, id: string) => ValorReferencia | undefined;
  } = {},
): FormulaResuelta {
  const problemas = comprobarFormula(f, resolver, opciones.resolverSerie ?? (() => undefined));
  if (problemas.length > 0)
    throw new Error(`Fórmula «${f.titulo}» no válida: ${problemas.join('; ')}`);
  const simbolo = (id: string): SimboloFormula => {
    const s = f.simbolos.find((x) => x.id === id);
    if (!s) throw new Error(`Falta el símbolo «${id}»`);
    return s;
  };
  const valor = (e: ExprNumero): ValorReferencia => {
    const v = resolver(e.ref);
    if (!v) throw new Error(`Falta ${e.ref.fichero}#${e.ref.id}`);
    return v;
  };
  const nodo = (e: ExprFormula): NodoMath => {
    switch (e.tipo) {
      case 'simbolo':
        return {
          tipo: 'simbolo',
          texto: simbolo(e.id).notacion,
          ...(e.subindice ? { subindice: nodo(e.subindice) } : {}),
        };
      case 'numero':
        return { tipo: 'numero', texto: textoCifra(e, valor(e)) };
      case 'suma':
        return { tipo: 'suma', terminos: e.terminos.map(nodo) };
      case 'producto':
        return { tipo: 'producto', factores: e.factores.map(nodo) };
      case 'cociente':
        return { tipo: 'cociente', numerador: nodo(e.numerador), denominador: nodo(e.denominador) };
      case 'sumatorio':
        return {
          tipo: 'sumatorio',
          variable: { tipo: 'simbolo', texto: simbolo(e.variable).notacion },
          desde: e.desde ? nodo(e.desde) : { tipo: 'numero', texto: formatearNumero(1) },
          hasta: nodo(e.hasta),
          cuerpo: nodo(e.cuerpo),
        };
      case 'grupo':
        return {
          tipo: 'grupo',
          cuerpo: nodo(e.cuerpo),
          delimitador: e.delimitador ?? 'parentesis',
        };
    }
  };
  /** Un subíndice se lee con su notación («i», «25»), no con el nombre del símbolo. */
  const lecturaIndice = (e: ExprFormula): string =>
    e.tipo === 'simbolo' ? simbolo(e.id).notacion : lectura(e);
  const lectura = (e: ExprFormula): string => {
    switch (e.tipo) {
      case 'simbolo': {
        const base = simbolo(e.id).nombre.toLowerCase();
        return e.subindice ? `${base} sub ${lecturaIndice(e.subindice)}` : base;
      }
      case 'numero':
        return textoCifra(e, valor(e));
      case 'suma':
        return e.terminos.map(lectura).join(' más ');
      case 'producto':
        return e.factores.map(lectura).join(' por ');
      case 'cociente':
        return `${lectura(e.numerador)} dividido entre ${lectura(e.denominador)}`;
      case 'sumatorio': {
        const desde = e.desde ? lectura(e.desde) : formatearNumero(1);
        return `suma, para ${simbolo(e.variable).notacion} desde ${desde} hasta ${lectura(e.hasta)}, de ${lectura(e.cuerpo)}`;
      }
      case 'grupo':
        return `(${lectura(e.cuerpo)})`;
    }
  };
  const cifras = referenciasUsadas(f).map((e): CifraFormula => {
    const v = valor(e);
    const base = {
      texto: textoCifra(e, v),
      valor: v.valor,
      referencia: e.ref,
      descripcion: e.etiqueta ?? v.unidad,
      periodo: v.periodo,
    };
    if (e.transitorio !== undefined && opciones.anioVigente !== undefined) {
      const t = opciones.resolverSerie?.(e.transitorio, String(opciones.anioVigente));
      if (t) {
        return {
          ...base,
          transitorio: {
            texto: textoCifra(e, t),
            periodo: t.periodo,
            descripcion: t.unidad,
          },
        };
      }
    }
    return base;
  });
  return {
    titulo: f.titulo,
    alcance: f.alcance,
    ecuaciones: f.ecuaciones.map((q) => ({
      izquierda: nodo(q.izquierda),
      derecha: nodo(q.derecha),
      lectura: `${capitalizar(lectura(q.izquierda))} es igual a ${lectura(q.derecha)}.`,
    })),
    simbolos: f.simbolos,
    cifras,
    notas: f.notas ?? [],
  };
}
