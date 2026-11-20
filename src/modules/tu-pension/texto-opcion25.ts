/**
 * Texto de la opción de la disposición transitoria cuarta, apartado séptimo, del TRLGSS («opción de
 * 25 años»), con todas las cifras sacadas de /data (Ajustes actuariales 4, punto 3): periodos,
 * divisores y años salen de `opcion-25-anos-ventana`, `opcion-25-anos-divisor` y
 * `opcion-25-anos-aplicable` (resumidos por el motor, `resumenOpcion25`), y la fecha de la redacción
 * que se aplica, de la cita literal de la norma guardada en el propio dato.
 *
 * La opción usa un periodo más corto o igual que el de la regla general y no descarta ninguna base
 * (el test del motor `opcion25.test.ts` lo comprueba año a año): no es un «periodo más largo».
 */
import { ArchivoDatos } from '../../engine/esquema-datos';
import { formatearNumero } from '../../engine/formato';
import { resumenOpcion25, type ResumenOpcion25 } from '../../engine/jubilacion/opcion25';
import {
  leerParametroDeRepositorio,
  parametrosDelRepositorio,
} from '../../engine/jubilacion/parametros-datos';
import type { TextoLectura } from './textos-lecturas';

export const ID_LECTURA_OPCION25 = 'jubilacion.opcion25EnUltimoDia2040';

const MESES = [
  'enero',
  'febrero',
  'marzo',
  'abril',
  'mayo',
  'junio',
  'julio',
  'agosto',
  'septiembre',
  'octubre',
  'noviembre',
  'diciembre',
];

/** Fecha de la redacción que aplica la opción, leída de la cita de la norma en /data («1 de enero de 2023»). */
export function fechaRedaccionOpcion25(): string {
  const archivo = ArchivoDatos.parse(leerParametroDeRepositorio('opcion-25-anos-ventana'));
  for (const d of archivo.data ?? []) {
    const m = /redacción vigente el día (\d{1,2}) de ([a-z]+) de (\d{4})/.exec(d.quote ?? '');
    if (m?.[1] && m[2] && m[3] && MESES.includes(m[2])) return `${m[1]} de ${m[2]} de ${m[3]}`;
  }
  throw new RangeError('opcion-25-anos-ventana: la cita no contiene la fecha de la redacción');
}

/** «a, b y c». */
function lista(elementos: readonly string[]): string {
  if (elementos.length <= 1) return elementos.join('');
  return `${elementos.slice(0, -1).join(', ')} y ${elementos[elementos.length - 1] ?? ''}`;
}

const n = (v: number) => formatearNumero(v);

/** Años de la ventana base («25»): meses ÷ doce, solo si es exacto. */
function anios(r: ResumenOpcion25): string {
  return r.mesesBase % 12 === 0
    ? n(r.mesesBase / 12)
    : formatearNumero(r.mesesBase / 12, { maxDecimales: 2 });
}

export function resumenOpcion25DelRepositorio(): ResumenOpcion25 {
  return resumenOpcion25(parametrosDelRepositorio());
}

/** Rótulo de la lectura `jubilacion.opcion25EnUltimoDia2040`. */
export function tituloOpcion25(r: ResumenOpcion25 = resumenOpcion25DelRepositorio()): string {
  return `Último día en que rige la opción de calcular la base reguladora con los últimos ${anios(r)} años (DT 4.ª.7)`;
}

/** Explicación de la opción (texto del punto 3 de la cuarta tanda actuarial, con cifras de /data). */
export function explicacionOpcion25(
  r: ResumenOpcion25 = resumenOpcion25DelRepositorio(),
  fecha: string = fechaRedaccionOpcion25(),
): string {
  const partes = [
    `Hasta ${String(r.ultimoAnio)}, si resulta más favorable, la base reguladora se calcula con la regla vigente el ${fecha}: las bases de los últimos ${n(r.mesesBase)} meses (${anios(r)} años) divididas entre ${n(r.divisorBase)}, sin descartar ninguna y con la integración de lagunas de esa regla.`,
  ];
  if (r.transicion.length > 0) {
    partes.push(
      `En ${lista(r.transicion.map((t) => String(t.anio)))} el periodo es de ${lista(r.transicion.map((t) => n(t.meses)))} meses (divisores ${lista(r.transicion.map((t) => n(t.divisor)))}).`,
    );
  }
  partes.push(
    'Se aplica el resultado más favorable entre esta opción y la regla general.',
    `Desde ${String(r.primerAnioSinOpcion)} solo rige la regla general.`,
  );
  return partes.join(' ');
}

/** Textos del selector para la lectura de la opción, con las cifras de /data. */
export function textoLecturaOpcion25(): TextoLectura {
  return {
    titulo: tituloOpcion25(),
    valores: {
      incluida: {
        etiqueta: 'El último día queda dentro de la opción',
        queCambia: `Quien se jubila ese último día puede usar la opción. ${explicacionOpcion25()}`,
      },
      excluida: {
        etiqueta: 'El último día queda fuera de la opción',
        queCambia:
          'Quien se jubila ese último día no puede usar la opción y se le aplica la regla general. Solo afecta a una jubilación en esa fecha exacta.',
      },
    },
  };
}
