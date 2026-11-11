import { formatearEuros, formatearNumero, formatearPorcentaje } from '../engine/formato';

export type TipoColumna = 'texto' | 'numero' | 'euros' | 'porcentaje';

export type ValorCelda = string | number | null;

const SIN_DATO = '—';

export function formatearCelda(valor: ValorCelda, tipo: TipoColumna, decimales?: number): string {
  if (valor === null) return SIN_DATO;
  if (typeof valor === 'string') return valor;
  const opciones = decimales === undefined ? {} : { decimales };
  switch (tipo) {
    case 'euros':
      return formatearEuros(valor, opciones);
    case 'porcentaje':
      return formatearPorcentaje(valor, opciones);
    case 'numero':
    case 'texto':
      return formatearNumero(valor, opciones);
  }
}
