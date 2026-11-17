/**
 * Formato de lo que devuelve el motor para mostrarlo en la página: valores de los pasos y de los
 * requisitos según su unidad, y los números que el motor escribe dentro de sus textos («29999.72»).
 * No calcula nada: solo da formato es-ES (formato.ts).
 */
import {
  formatearDuracion,
  formatearEuros,
  formatearNumero,
  formatearPorcentaje,
} from '../../engine/formato';

/** Reescribe los decimales con punto de un texto del motor («361.67») en formato es-ES («361,67»). */
export function numerosEnTexto(texto: string): string {
  return texto.replace(/(?<![\w.])\d+\.\d{2,}(?![\w.])/g, (n) => {
    const decimales = n.split('.')[1]?.length ?? 2;
    return formatearNumero(Number(n), { maxDecimales: Math.min(decimales, 4) });
  });
}

const esEntero = (v: number): boolean => Number.isInteger(v);

/** Valor de un paso o requisito del motor con su unidad, en español. */
export function valorConUnidad(valor: number | string | boolean, unidad: string): string {
  if (typeof valor === 'boolean') return valor ? 'Sí' : 'No';
  if (typeof valor === 'string') return numerosEnTexto(valor);
  switch (unidad) {
    case 'euros/mes':
      return `${formatearEuros(valor, { decimales: 2 })} al mes`;
    case 'euros/año':
    case 'euros':
      return `${formatearEuros(valor, { decimales: 2 })}${unidad === 'euros/año' ? ' al año' : ''}`;
    case '%':
      return formatearPorcentaje(valor / 100, { maxDecimales: 2 });
    case 'indicador':
      return valor === 0 ? 'No' : 'Sí';
    case 'días':
    case 'dias':
      return `${formatearNumero(valor)} ${valor === 1 ? 'día' : 'días'}`;
    case 'meses':
    case 'meses cotizados':
    case 'meses de edad':
    case 'meses cotizados en la ventana':
    case 'meses de margen':
      return esEntero(valor) && valor >= 0
        ? formatearDuracion(valor)
        : `${formatearNumero(valor, { maxDecimales: 2 })} meses`;
    default:
      return `${formatearNumero(valor, { maxDecimales: 4 })} ${unidad}`.trim();
  }
}
