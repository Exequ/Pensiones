/**
 * Auditoría estática de estilos: hace cumplir las prohibiciones del sistema
 * de diseño «Editorial» (sin sombras, degradados, desenfoques, radios > 2 px,
 * animaciones ni colores fuera de los tokens).
 */

export interface Infraccion {
  readonly fichero: string;
  readonly linea: number;
  readonly regla: string;
  readonly detalle: string;
}

const COLORES_CON_NOMBRE = [
  'white',
  'black',
  'red',
  'green',
  'blue',
  'yellow',
  'orange',
  'purple',
  'pink',
  'gray',
  'grey',
  'brown',
  'cyan',
  'magenta',
  'navy',
  'teal',
  'olive',
  'maroon',
  'silver',
  'gold',
  'beige',
  'ivory',
  'tan',
  'crimson',
  'coral',
  'salmon',
  'khaki',
  'lime',
  'aqua',
  'fuchsia',
  'indigo',
  'violet',
  'wheat',
  'linen',
  'snow',
  'whitesmoke',
  'gainsboro',
  'lightgray',
  'darkgray',
  'dimgray',
  'slategray',
  'darkred',
  'firebrick',
];

const PATRON_COLOR_LITERAL =
  /#[0-9a-fA-F]{3,8}\b|\b(?:rgba?|hsla?|hwb|lab|lch|oklab|oklch|color)\(/g;
const PATRON_COLOR_NOMBRE = new RegExp(
  String.raw`(?:^|[\s:,'"(])(${COLORES_CON_NOMBRE.join('|')})(?=[\s;,'")!]|$)`,
  'i',
);
const PROPIEDADES_COLOR =
  /^\s*(?:color|background(?:-color)?|border(?:-[a-z]+)*(?:-color)?|outline(?:-color)?|fill|stroke|text-decoration(?:-color)?|caret-color|accent-color|column-rule(?:-color)?)\s*:/i;

function quitarComentariosCss(texto: string): string {
  return texto.replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '));
}

function quitarComentariosTs(texto: string): string {
  return texto
    .replace(/\/\*[\s\S]*?\*\//g, (c) => c.replace(/[^\n]/g, ' '))
    .replace(/(^|[^:'"`])\/\/.*$/gm, (_m, previo: string) => previo);
}

function radioExcesivo(valor: string): boolean {
  const limpio = valor.replace(/!important/, '').trim();
  if (/^var\(--radio\)$/.test(limpio)) return false;
  for (const parte of limpio.split(/[\s/]+/).filter(Boolean)) {
    const m = /^(-?\d*\.?\d+)(px|%|r?em|vw|vh)?$/.exec(parte);
    if (!m) return true; // valor desconocido: se considera sospechoso
    const numero = Number(m[1]);
    const unidad = m[2] ?? '';
    if (numero === 0) continue;
    if (unidad !== 'px' || numero > 2) return true;
  }
  return false;
}

/**
 * Audita un fichero. `permitirColores` solo debe ser true para tokens.css.
 */
export function auditarFichero(
  fichero: string,
  contenido: string,
  opciones: { permitirColores?: boolean } = {},
): Infraccion[] {
  const esCss = fichero.endsWith('.css');
  const texto = esCss ? quitarComentariosCss(contenido) : quitarComentariosTs(contenido);
  const infracciones: Infraccion[] = [];
  const anotar = (linea: number, regla: string, detalle: string): void => {
    infracciones.push({ fichero, linea, regla, detalle: detalle.trim() });
  };

  texto.split('\n').forEach((linea, i) => {
    const n = i + 1;
    if (/(box-shadow|text-shadow|boxShadow|textShadow)\s*:\s*(?!\s*['"]?none\b)/i.test(linea)) {
      anotar(n, 'sin-sombras', linea);
    }
    if (/drop-shadow\(/i.test(linea)) anotar(n, 'sin-sombras', linea);
    if (/gradient\s*\(/i.test(linea)) anotar(n, 'sin-degradados', linea);
    if (/backdrop-filter|backdropFilter|blur\s*\(/i.test(linea)) {
      anotar(n, 'sin-glassmorphism', linea);
    }
    if (/(^|[\s{;])(animation|transition)(-[a-z]+)?\s*:\s*(?!\s*none\b)/i.test(linea)) {
      anotar(n, 'sin-animaciones', linea);
    }
    if (/@keyframes/i.test(linea)) anotar(n, 'sin-animaciones', linea);

    const radio = /(?:border(?:-[a-z]+)*-radius|borderRadius)\s*:\s*['"]?([^;'"}]+)/i.exec(linea);
    if (radio?.[1] && radioExcesivo(radio[1])) {
      anotar(n, 'radio-maximo-2px', linea);
    }

    if (!opciones.permitirColores) {
      const literales = linea.match(PATRON_COLOR_LITERAL);
      if (literales) anotar(n, 'colores-solo-tokens', `${literales.join(', ')} en «${linea}»`);
      const declaraciones = esCss ? linea.split(/[{;}]/) : [];
      for (const declaracion of declaraciones) {
        if (PROPIEDADES_COLOR.test(declaracion)) {
          const valor = declaracion.slice(declaracion.indexOf(':') + 1);
          const nombre = PATRON_COLOR_NOMBRE.exec(valor);
          if (nombre?.[1]) anotar(n, 'colores-solo-tokens', `color con nombre «${nombre[1]}»`);
        }
        if (
          /^\s*font-family\s*:/.test(declaracion) &&
          !/^\s*font-family\s*:\s*(var\(--fuente-[a-z-]+\)|inherit)\s*$/.test(declaracion)
        ) {
          anotar(n, 'fuentes-solo-tokens', declaracion);
        }
      }
      if (!esCss && /\b(fill|stroke|color|background)\s*[:=]\s*['"]/.test(linea)) {
        const nombre = new RegExp(`['"](${COLORES_CON_NOMBRE.join('|')})['"]`, 'i').exec(linea);
        if (nombre?.[1]) anotar(n, 'colores-solo-tokens', `color con nombre «${nombre[1]}»`);
      }
    }

    if (
      /url\(\s*['"]?(https?:)?\/\//i.test(linea) ||
      /@import\s+(url\()?['"]?https?:/i.test(linea)
    ) {
      anotar(n, 'sin-recursos-externos', linea);
    }
  });
  return infracciones;
}

/** Variables CSS definidas en un texto CSS. */
export function variablesDefinidas(css: string): Set<string> {
  const definidas = new Set<string>();
  for (const m of quitarComentariosCss(css).matchAll(/(--[a-zA-Z0-9-]+)\s*:/g)) {
    if (m[1]) definidas.add(m[1]);
  }
  return definidas;
}

/** Referencias var(--x) que no están definidas en ningún CSS del proyecto. */
export function variablesNoDefinidas(
  fichero: string,
  contenido: string,
  definidas: ReadonlySet<string>,
): Infraccion[] {
  const infracciones: Infraccion[] = [];
  contenido.split('\n').forEach((linea, i) => {
    for (const m of linea.matchAll(/var\(\s*(--[a-zA-Z0-9-]+)/g)) {
      const nombre = m[1];
      if (nombre && !definidas.has(nombre) && !nombre.startsWith('--plot-')) {
        infracciones.push({
          fichero,
          linea: i + 1,
          regla: 'variables-definidas',
          detalle: `${nombre} no está definida en los tokens`,
        });
      }
    }
  });
  return infracciones;
}
