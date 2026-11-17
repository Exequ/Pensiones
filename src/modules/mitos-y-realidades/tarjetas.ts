import type { ComponentType } from 'react';
import type { Mito } from './Afirmacion';
import { TarjetaIpc } from './TarjetaIpc';
import { TarjetaGasto, TarjetaPobreza, TarjetaReposicion } from './TarjetasComparacion';
import { TarjetaHucha, TarjetaImpuestos, TarjetaSaldo } from './TarjetasFondo';
import { TarjetaCotizantes, TarjetaEdad, TarjetaJubilados } from './TarjetasPersonas';
import { TarjetaNatalidad, TarjetaSostenibilidad } from './TarjetasSostenibilidad';

interface PropsTarjeta {
  readonly mito: Mito;
  readonly indice: number;
  readonly total: number;
}

/** Tarjeta de cada afirmación del catálogo, por su identificador. */
export const TARJETAS: Readonly<Record<string, ComponentType<PropsTarjeta>>> = {
  'hucha-vaciada': TarjetaHucha,
  'pensiones-con-impuestos': TarjetaImpuestos,
  'menos-cotizantes-por-pensionista': TarjetaCotizantes,
  'jubilados-cobran-mas-de-lo-cotizado': TarjetaJubilados,
  'sistema-en-deficit': TarjetaSaldo,
  'edad-real-de-jubilacion-65': TarjetaEdad,
  'pensiones-publicas-insostenibles': TarjetaSostenibilidad,
  'mayores-en-pobreza': TarjetaPobreza,
  'pensiones-sustituyen-casi-todo-el-salario': TarjetaReposicion,
  'espana-gasta-mas-que-europa': TarjetaGasto,
  'pensiones-siempre-con-el-ipc': TarjetaIpc,
  'sin-nacimientos-no-hay-pensiones': TarjetaNatalidad,
};
