/**
 * Textos y cifras formateadas de la comparación entre las lecturas elegidas y las lecturas por
 * defecto (Fase 3-B2). Lógica pura: formatea con `src/engine/formato.ts` los importes que calcula
 * `compararLecturas`; no calcula nada. El tono es neutro: describe qué se ha cambiado y cuánto
 * cambia el resultado, sin decir qué lectura es mejor o más correcta.
 */
import type {
  ComparacionLecturas,
  DiferenciaImporte,
  LecturaCambiada,
} from '../../engine/comparar-lecturas';
import { formatearEuros, formatearNumero, formatearPorcentaje } from '../../engine/formato';
import { TEXTOS } from './textos';
import { TEXTOS_LECTURAS } from './textos-lecturas';

const redondear = (v: number): number => (Math.abs(v) < 0.005 ? 0 : Math.round(v * 100) / 100);

export const eurosConSigno = (v: number): string =>
  formatearEuros(redondear(v), { decimales: 2, conSigno: true });
export const eurosPlano = (v: number): string => formatearEuros(v, { decimales: 2 });

export function porcentajeConSigno(p: number | undefined): string {
  if (p === undefined) return '—';
  const r = Math.abs(p) < 0.005 ? 0 : p;
  return formatearPorcentaje(r / 100, { decimales: 2, conSigno: true });
}

const titulo = (id: string): string => TEXTOS_LECTURAS[id]?.titulo ?? id;
const etiqueta = (id: string, valor: string): string =>
  TEXTOS_LECTURAS[id]?.valores[valor]?.etiqueta ?? valor;

/** «“Título” (de «X» a «Y»); …» para las lecturas que la persona ha cambiado. */
export function describirCambios(cambiadas: readonly LecturaCambiada[]): string {
  return cambiadas
    .map(
      (c) =>
        `«${titulo(c.id)}» (de «${etiqueta(c.id, c.porDefecto)}» a «${etiqueta(c.id, c.valor)}»)`,
    )
    .join('; ');
}

const cuantas = (n: number): string => (n === 1 ? 'una lectura' : `${formatearNumero(n)} lecturas`);

/** Frase neutra que resume la comparación; es también el texto de la región `aria-live`. */
export function fraseComparacion(c: ComparacionLecturas, restablecidas = false): string {
  if (c.tipo === 'sin-cambios') {
    return restablecidas ? TEXTOS.lecturasRestablecidas : TEXTOS.comparacionSinCambios;
  }
  if (c.tipo === 'no-comparable') {
    return `No se ha podido comparar con las lecturas por defecto: ${c.error.mensaje}`;
  }
  const quien = `Has cambiado ${cuantas(c.cambiadas.length)} respecto a las de por defecto: ${describirCambios(c.cambiadas)}.`;
  const e = c.elegido.detalle;
  const d = c.porDefecto.detalle;
  if (e.cumpleRequisitos && d.cumpleRequisitos) {
    const dif = c.diferencia.pension;
    const resultado =
      dif.euros === 0 || Math.abs(dif.euros) < 0.005
        ? 'la pensión mensual bruta no cambia'
        : `la diferencia en la pensión mensual bruta es de ${eurosConSigno(dif.euros)} al mes (${porcentajeConSigno(dif.porcentaje)})`;
    return `${quien} Con tus lecturas la pensión mensual bruta es ${eurosPlano(e.pensionMensual)}; con las lecturas por defecto, ${eurosPlano(d.pensionMensual)}: ${resultado}.`;
  }
  if (!e.cumpleRequisitos && !d.cumpleRequisitos) {
    return `${quien} Ni con tus lecturas ni con las de por defecto se cumplen los requisitos de la jubilación ordinaria: no hay pensión que comparar.`;
  }
  return e.cumpleRequisitos
    ? `${quien} Con tus lecturas se cumplen los requisitos y la pensión mensual bruta es ${eurosPlano(e.pensionMensual)}; con las lecturas por defecto no se cumplen y no hay pensión.`
    : `${quien} Con tus lecturas no se cumplen los requisitos y no hay pensión; con las lecturas por defecto se cumplen y la pensión mensual bruta es ${eurosPlano(d.pensionMensual)}.`;
}

export interface FilaComparacion {
  readonly concepto: string;
  readonly conTusLecturas: string;
  readonly porDefecto: string;
  readonly diferenciaEuros: string;
  readonly diferenciaPorcentaje: string;
}

const fila = (
  concepto: string,
  elegido: number,
  porDefecto: number,
  dif: DiferenciaImporte,
): FilaComparacion => ({
  concepto,
  conTusLecturas: eurosPlano(elegido),
  porDefecto: eurosPlano(porDefecto),
  diferenciaEuros: eurosConSigno(dif.euros),
  diferenciaPorcentaje: porcentajeConSigno(dif.porcentaje),
});

/** Filas de la tabla de comparación; vacía si no hay pensión en los dos cálculos. */
export function filasComparacion(c: ComparacionLecturas): readonly FilaComparacion[] {
  if (c.tipo !== 'comparado') return [];
  const e = c.elegido.detalle;
  const d = c.porDefecto.detalle;
  if (!e.cumpleRequisitos || !d.cumpleRequisitos) return [];
  return [
    fila(TEXTOS.comparacionFilaPension, e.pensionMensual, d.pensionMensual, c.diferencia.pension),
    fila(
      TEXTOS.comparacionFilaBase,
      e.baseReguladora,
      d.baseReguladora,
      c.diferencia.baseReguladora,
    ),
  ];
}
