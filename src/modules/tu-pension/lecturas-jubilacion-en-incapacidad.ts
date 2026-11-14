/**
 * Lecturas de jubilación (`jubilacion.*`) que también rigen en el cálculo de la incapacidad
 * permanente (ajustes actuariales 1). El motor de incapacidad comparte con la jubilación el contexto
 * (IPC mensual y límites de base y de pensión máxima: `jubilacion/contexto.ts`) y la base reguladora
 * por ventana (`comun/base-reguladora.ts`: lagunas y actualización de las bases). No le afectan la
 * opción de periodo más largo ni la demora, que solo existen en la jubilación.
 *
 * La lista está comprobada contra el código del motor por `scripts/lecturas-jubilacion-incapacidad.test.ts`
 * (qué lecturas lee el motor de incapacidad). En la incapacidad esas lecturas no se pueden cambiar: se
 * aplican con el valor por defecto del registro (el mapeador solo pasa al motor las `incapacidad.*`).
 */
import { lecturaPorId, type EstadoLectura } from '../../engine/lecturas.ts';
import { TEXTOS_LECTURAS } from './textos-lecturas.ts';

export const LECTURAS_JUBILACION_EN_INCAPACIDAD: readonly string[] = [
  'jubilacion.baseMaxima',
  'jubilacion.pensionMaxima',
  'jubilacion.maximaDesde2051',
  'jubilacion.interpolacionIPC',
  'jubilacion.referenciaBaseMinimaLagunas',
  'jubilacion.lagunasAnterioresAlPrimerAlta',
  'jubilacion.actualizacionFactorMinimo',
];

export interface FilaLecturaJubilacion {
  readonly id: string;
  readonly titulo: string;
  /** Etiqueta del valor aplicado, leído del registro en tiempo de ejecución. */
  readonly valorAplicado: string;
  readonly estado: EstadoLectura;
}

/** Filas de la nota: título, valor aplicado y estado de cada lectura, leídos del registro. */
export function filasLecturasJubilacionEnIncapacidad(): readonly FilaLecturaJubilacion[] {
  return LECTURAS_JUBILACION_EN_INCAPACIDAD.flatMap((id) => {
    const l = lecturaPorId(id);
    if (l === undefined) return [];
    const textos = TEXTOS_LECTURAS[id];
    return [
      {
        id,
        titulo: textos?.titulo ?? l.descripcion,
        valorAplicado: textos?.valores[l.porDefecto]?.etiqueta ?? l.porDefecto,
        estado: l.estado,
      },
    ];
  });
}
