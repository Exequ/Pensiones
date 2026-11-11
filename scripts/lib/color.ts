/**
 * Utilidades de color para validar la paleta: contraste WCAG 2.x,
 * luminosidad CIELAB y simulación de daltonismo (Machado et al., 2009).
 * TypeScript puro, sin dependencias.
 */

export type Rgb = readonly [number, number, number];
export type Lab = readonly [number, number, number];

export function hexARgb(hex: string): Rgb {
  const limpio = hex.trim().replace(/^#/, '');
  const completo =
    limpio.length === 3
      ? limpio
          .split('')
          .map((c) => c + c)
          .join('')
      : limpio;
  if (!/^[0-9a-fA-F]{6}$/.test(completo)) {
    throw new Error(`Color hexadecimal no válido: ${hex}`);
  }
  return [0, 2, 4].map((i) => parseInt(completo.slice(i, i + 2), 16) / 255) as unknown as Rgb;
}

export function rgbAHex(rgb: Rgb): string {
  return (
    '#' +
    rgb
      .map((c) =>
        Math.round(Math.min(1, Math.max(0, c)) * 255)
          .toString(16)
          .padStart(2, '0'),
      )
      .join('')
      .toUpperCase()
  );
}

const aLineal = (c: number): number => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
const aGamma = (c: number): number => (c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055);

export function rgbLineal(rgb: Rgb): Rgb {
  return rgb.map(aLineal) as unknown as Rgb;
}

/** Luminancia relativa según WCAG 2.x. */
export function luminanciaRelativa(hex: string): number {
  const [r, g, b] = rgbLineal(hexARgb(hex));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/** Relación de contraste WCAG 2.x entre dos colores (1 a 21). */
export function contraste(a: string, b: string): number {
  const la = luminanciaRelativa(a);
  const lb = luminanciaRelativa(b);
  const [claro, oscuro] = la > lb ? [la, lb] : [lb, la];
  return (claro + 0.05) / (oscuro + 0.05);
}

/** Convierte un color a CIELAB (D65). */
export function hexALab(hex: string): Lab {
  return rgbLinealALab(rgbLineal(hexARgb(hex)));
}

function rgbLinealALab([r, g, b]: Rgb): Lab {
  const x = (0.4124564 * r + 0.3575761 * g + 0.1804375 * b) / 0.95047;
  const y = 0.2126729 * r + 0.7151522 * g + 0.072175 * b;
  const z = (0.0193339 * r + 0.119192 * g + 0.9503041 * b) / 1.08883;
  const f = (t: number): number => (t > 216 / 24389 ? Math.cbrt(t) : ((24389 / 27) * t + 16) / 116);
  const [fx, fy, fz] = [f(x), f(y), f(z)];
  return [116 * fy - 16, 500 * (fx - fy), 200 * (fy - fz)];
}

function labARgbLineal([l, a, bb]: Lab): Rgb {
  const fy = (l + 16) / 116;
  const fx = fy + a / 500;
  const fz = fy - bb / 200;
  const inv = (t: number): number =>
    t ** 3 > 216 / 24389 ? t ** 3 : (116 * t - 16) / (24389 / 27);
  const x = inv(fx) * 0.95047;
  const y = inv(fy);
  const z = inv(fz) * 1.08883;
  return [
    3.2404542 * x - 1.5371385 * y - 0.4985314 * z,
    -0.969266 * x + 1.8760108 * y + 0.041556 * z,
    0.0556434 * x - 0.2040259 * y + 1.0572252 * z,
  ];
}

/** Interpola dos colores en CIELAB (t entre 0 y 1). */
export function interpolarLab(desde: string, hasta: string, t: number): string {
  const a = hexALab(desde);
  const b = hexALab(hasta);
  const lab: Lab = [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
  return rgbAHex(labARgbLineal(lab).map(aGamma) as unknown as Rgb);
}

/** Diferencia de color CIE76 (distancia euclídea en CIELAB). */
export function deltaE(a: string, b: string): number {
  const [l1, a1, b1] = hexALab(a);
  const [l2, a2, b2] = hexALab(b);
  return Math.hypot(l1 - l2, a1 - a2, b1 - b2);
}

export type TipoDaltonismo = 'protanopia' | 'deuteranopia' | 'tritanopia' | 'acromatopsia';

/** Matrices de Machado, Oliveira y Fernandes (2009), severidad 1,0, en RGB lineal. */
type Matriz3x3 = readonly [number, number, number, number, number, number, number, number, number];

const MATRICES: Record<Exclude<TipoDaltonismo, 'acromatopsia'>, Matriz3x3> = {
  protanopia: [
    0.152286, 1.052583, -0.204868, 0.114503, 0.786281, 0.099216, -0.003882, -0.048116, 1.051998,
  ],
  deuteranopia: [
    0.367322, 0.860646, -0.227968, 0.280085, 0.672501, 0.047413, -0.01182, 0.04294, 0.968881,
  ],
  tritanopia: [
    1.255528, -0.076749, -0.178779, -0.078411, 0.930809, 0.147602, 0.004733, 0.691367, 0.3039,
  ],
};

/** Simula cómo percibe un color una persona con el tipo de daltonismo indicado. */
export function simularDaltonismo(hex: string, tipo: TipoDaltonismo): string {
  const [r, g, b] = rgbLineal(hexARgb(hex));
  let salida: Rgb;
  if (tipo === 'acromatopsia') {
    const y = 0.2126 * r + 0.7152 * g + 0.0722 * b;
    salida = [y, y, y];
  } else {
    const [m0, m1, m2, m3, m4, m5, m6, m7, m8] = MATRICES[tipo];
    salida = [m0 * r + m1 * g + m2 * b, m3 * r + m4 * g + m5 * b, m6 * r + m7 * g + m8 * b];
  }
  return rgbAHex(salida.map((c) => aGamma(Math.min(1, Math.max(0, c)))) as unknown as Rgb);
}
