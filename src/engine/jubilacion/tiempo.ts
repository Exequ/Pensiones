/**
 * Fechas y meses del motor de jubilación. Se trabaja con meses absolutos (año × 12 + mes − 1)
 * y con fechas ISO `AAAA-MM-DD`, sin `Date`, para que el cálculo no dependa de la zona horaria.
 */

export interface Fecha {
  readonly anio: number;
  /** 1-12 */
  readonly mes: number;
  /** 1-31 */
  readonly dia: number;
}

/** Mes absoluto: `anio * 12 + (mes - 1)`. */
export type MesAbs = number;

const PATRON_FECHA = /^(\d{4})-(\d{2})-(\d{2})$/;
const PATRON_MES = /^(\d{4})-(\d{2})$/;

export function diasDelMes(anio: number, mes: number): number {
  if (mes === 2) return (anio % 4 === 0 && anio % 100 !== 0) || anio % 400 === 0 ? 29 : 28;
  return [4, 6, 9, 11].includes(mes) ? 30 : 31;
}

export function parsearFecha(texto: string): Fecha {
  const m = PATRON_FECHA.exec(texto);
  if (!m) throw new RangeError(`Fecha no válida (se espera AAAA-MM-DD): «${texto}»`);
  const fecha = { anio: Number(m[1]), mes: Number(m[2]), dia: Number(m[3]) };
  if (
    fecha.mes < 1 ||
    fecha.mes > 12 ||
    fecha.dia < 1 ||
    fecha.dia > diasDelMes(fecha.anio, fecha.mes)
  ) {
    throw new RangeError(`Fecha inexistente: «${texto}»`);
  }
  return fecha;
}

/** `AAAA-MM` → mes absoluto. */
export function parsearMes(texto: string): MesAbs {
  const m = PATRON_MES.exec(texto);
  if (!m) throw new RangeError(`Mes no válido (se espera AAAA-MM): «${texto}»`);
  const mes = Number(m[2]);
  if (mes < 1 || mes > 12) throw new RangeError(`Mes inexistente: «${texto}»`);
  return Number(m[1]) * 12 + (mes - 1);
}

export function mesAbsDe(fecha: Fecha): MesAbs {
  return fecha.anio * 12 + (fecha.mes - 1);
}

export function anioDeMes(mes: MesAbs): number {
  return Math.floor(mes / 12);
}

/** Mes del año (1-12) de un mes absoluto. */
export function mesDelAnio(mes: MesAbs): number {
  return (mes % 12) + 1;
}

export function formatearMes(mes: MesAbs): string {
  return `${anioDeMes(mes)}-${String(mesDelAnio(mes)).padStart(2, '0')}`;
}

export function formatearFecha(fecha: Fecha): string {
  return `${fecha.anio}-${String(fecha.mes).padStart(2, '0')}-${String(fecha.dia).padStart(2, '0')}`;
}

/** Suma `meses` a una fecha; si el día no existe en el mes de destino, se usa el último día. */
export function sumarMeses(fecha: Fecha, meses: number): Fecha {
  const destino = mesAbsDe(fecha) + meses;
  const anio = anioDeMes(destino);
  const mes = mesDelAnio(destino);
  return { anio, mes, dia: Math.min(fecha.dia, diasDelMes(anio, mes)) };
}

export function compararFechas(a: Fecha, b: Fecha): number {
  return a.anio - b.anio || a.mes - b.mes || a.dia - b.dia;
}

/**
 * Meses completos cumplidos entre `desde` y `hasta`: el mayor `n` tal que `desde + n meses` no
 * supera a `hasta` (negativo si `hasta` es anterior). Un 31 se traslada al último día del mes.
 */
export function mesesCumplidos(desde: Fecha, hasta: Fecha): number {
  let n = mesAbsDe(hasta) - mesAbsDe(desde);
  while (compararFechas(sumarMeses(desde, n), hasta) > 0) n--;
  while (compararFechas(sumarMeses(desde, n + 1), hasta) <= 0) n++;
  return n;
}

/**
 * Meses que hay que sumar a `desde` para llegar a `hasta` o rebasarla (cada mes o fracción de
 * mes cuenta como un mes entero). Cero si `hasta` no es posterior.
 */
export function mesesHastaRedondeandoArriba(desde: Fecha, hasta: Fecha): number {
  if (compararFechas(hasta, desde) <= 0) return 0;
  const n = mesesCumplidos(desde, hasta);
  return compararFechas(sumarMeses(desde, n), hasta) === 0 ? n : n + 1;
}
