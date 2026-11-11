/**
 * Lectura de los tokens de color y criterios de validación de la paleta.
 */
import { contraste, deltaE, hexALab, simularDaltonismo, type TipoDaltonismo } from './color.ts';

/** Extrae los tokens de color (resolviendo alias var()) de tokens.css. */
export function leerTokensColor(css: string): Map<string, string> {
  const crudos = new Map<string, string>();
  const sinComentarios = css.replace(/\/\*[\s\S]*?\*\//g, '');
  for (const m of sinComentarios.matchAll(/(--color-[a-z0-9-]+)\s*:\s*([^;]+);/g)) {
    if (m[1] && m[2]) crudos.set(m[1], m[2].trim());
  }
  const resolver = (nombre: string, visitados: Set<string>): string => {
    const valor = crudos.get(nombre);
    if (valor === undefined) throw new Error(`Token no definido: ${nombre}`);
    const alias = /^var\((--[a-z0-9-]+)\)$/.exec(valor);
    if (alias?.[1]) {
      if (visitados.has(alias[1])) throw new Error(`Alias circular en ${nombre}`);
      return resolver(alias[1], new Set([...visitados, nombre]));
    }
    if (!/^#[0-9a-fA-F]{6}$/.test(valor))
      throw new Error(`${nombre}: se espera #RRGGBB, hay ${valor}`);
    return valor.toUpperCase();
  };
  const tokens = new Map<string, string>();
  for (const nombre of crudos.keys()) tokens.set(nombre, resolver(nombre, new Set()));
  return tokens;
}

export type UsoPar = 'texto' | 'grafico';

export interface ParContraste {
  readonly primerPlano: string;
  readonly fondo: string;
  readonly uso: UsoPar;
  readonly donde: string;
}

/** Umbral WCAG 2.x AA: 4,5:1 para texto normal y 3:1 para objetos gráficos y controles. */
export const UMBRAL: Record<UsoPar, number> = { texto: 4.5, grafico: 3 };

/** Pares de color que usa la interfaz. Si añades un par nuevo en CSS, añádelo aquí. */
export const PARES: readonly ParContraste[] = [
  { primerPlano: '--color-tinta', fondo: '--color-papel', uso: 'texto', donde: 'Texto principal' },
  {
    primerPlano: '--color-tinta-2',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Texto secundario, notas',
  },
  {
    primerPlano: '--color-apagado',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Pies, fuentes, metadatos',
  },
  { primerPlano: '--color-acento', fondo: '--color-papel', uso: 'texto', donde: 'Kicker, enlaces' },
  {
    primerPlano: '--color-acento-oscuro',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Enlaces al pasar el ratón',
  },
  {
    primerPlano: '--color-papel',
    fondo: '--color-tinta',
    uso: 'texto',
    donde: 'DevBanner, píldora activa',
  },
  {
    primerPlano: '--color-tinta',
    fondo: '--color-filete',
    uso: 'texto',
    donde: 'Píldora al pasar el ratón',
  },
  {
    primerPlano: '--color-cat-granate',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Etiqueta directa categoría 1',
  },
  {
    primerPlano: '--color-cat-azul',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Etiqueta directa categoría 2',
  },
  {
    primerPlano: '--color-cat-ocre-texto',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Etiqueta directa categoría 3',
  },
  {
    primerPlano: '--color-cat-verde',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Etiqueta directa categoría 4',
  },
  {
    primerPlano: '--color-cat-gris-texto',
    fondo: '--color-papel',
    uso: 'texto',
    donde: 'Etiqueta directa categoría 5',
  },
  {
    primerPlano: '--color-cat-granate',
    fondo: '--color-papel',
    uso: 'grafico',
    donde: 'Marca categoría 1',
  },
  {
    primerPlano: '--color-cat-azul',
    fondo: '--color-papel',
    uso: 'grafico',
    donde: 'Marca categoría 2',
  },
  {
    primerPlano: '--color-cat-ocre',
    fondo: '--color-papel',
    uso: 'grafico',
    donde: 'Marca categoría 3',
  },
  {
    primerPlano: '--color-cat-verde',
    fondo: '--color-papel',
    uso: 'grafico',
    donde: 'Marca categoría 4',
  },
  {
    primerPlano: '--color-cat-gris',
    fondo: '--color-papel',
    uso: 'grafico',
    donde: 'Marca categoría 5',
  },
  {
    primerPlano: '--color-tinta',
    fondo: '--color-papel',
    uso: 'grafico',
    donde: 'Ejes, bordes de controles',
  },
  {
    primerPlano: '--color-acento',
    fondo: '--color-papel',
    uso: 'grafico',
    donde: 'Anillo de foco, marca resaltada',
  },
  {
    primerPlano: '--color-resaltado',
    fondo: '--color-resto',
    uso: 'grafico',
    donde: 'Resaltado frente al resto',
  },
];

/** Colores categóricos que deben distinguirse entre sí. */
export const CATEGORICOS = [
  '--color-cat-granate',
  '--color-cat-azul',
  '--color-cat-ocre',
  '--color-cat-verde',
  '--color-cat-gris',
] as const;

/** Diferencia mínima de luminosidad L* entre dos colores categóricos cualesquiera. */
export const DELTA_L_MINIMO = 7;
/** Diferencia mínima de color (CIE76) entre pares, para visión típica y simulada. */
export const DELTA_E_MINIMO = 12;

export const VISIONES: readonly ('normal' | TipoDaltonismo)[] = [
  'normal',
  'protanopia',
  'deuteranopia',
  'tritanopia',
];

export interface ResultadoPar extends ParContraste {
  readonly ratio: number;
  readonly cumple: boolean;
}

export function evaluarPares(tokens: ReadonlyMap<string, string>): ResultadoPar[] {
  return PARES.map((par) => {
    const a = tokens.get(par.primerPlano);
    const b = tokens.get(par.fondo);
    if (!a || !b) throw new Error(`Par con token inexistente: ${par.primerPlano} / ${par.fondo}`);
    const ratio = contraste(a, b);
    return { ...par, ratio, cumple: ratio >= UMBRAL[par.uso] };
  });
}

export interface ResultadoSeparacion {
  readonly vision: string;
  readonly a: string;
  readonly b: string;
  readonly valor: number;
  readonly minimo: number;
  readonly cumple: boolean;
}

/** Para cada visión, el par de categóricos más parecido; y la menor diferencia de L*. */
export function evaluarSeparacion(tokens: ReadonlyMap<string, string>): ResultadoSeparacion[] {
  const colores = CATEGORICOS.map((nombre) => {
    const hex = tokens.get(nombre);
    if (!hex) throw new Error(`Falta ${nombre}`);
    return { nombre, hex };
  });
  const resultados: ResultadoSeparacion[] = [];
  const peorPar = (
    medida: (a: string, b: string) => number,
  ): { a: string; b: string; valor: number } => {
    let peor = { a: '', b: '', valor: Number.POSITIVE_INFINITY };
    for (const [i, ci] of colores.entries()) {
      for (const cj of colores.slice(i + 1)) {
        const valor = medida(ci.hex, cj.hex);
        if (valor < peor.valor) peor = { a: ci.nombre, b: cj.nombre, valor };
      }
    }
    return peor;
  };
  const lum = peorPar((a, b) => Math.abs(hexALab(a)[0] - hexALab(b)[0]));
  resultados.push({
    vision: 'luminosidad (ΔL*)',
    ...lum,
    minimo: DELTA_L_MINIMO,
    cumple: lum.valor >= DELTA_L_MINIMO,
  });
  for (const vision of VISIONES) {
    const par = peorPar((a, b) =>
      vision === 'normal'
        ? deltaE(a, b)
        : deltaE(simularDaltonismo(a, vision), simularDaltonismo(b, vision)),
    );
    resultados.push({
      vision: `${vision} (ΔE)`,
      ...par,
      minimo: DELTA_E_MINIMO,
      cumple: par.valor >= DELTA_E_MINIMO,
    });
  }
  return resultados;
}

/** La secuencial debe oscurecerse de forma monótona de papel a granate. */
export function evaluarSecuencial(tokens: ReadonlyMap<string, string>): boolean {
  const luminosidades = [1, 2, 3, 4, 5].map((i) => {
    const hex = tokens.get(`--color-sec-${i}`);
    if (!hex) throw new Error(`Falta --color-sec-${i}`);
    return hexALab(hex)[0];
  });
  return luminosidades.every(
    (l, i) => i === 0 || l < (luminosidades[i - 1] ?? Number.POSITIVE_INFINITY),
  );
}
