import type { EntradaIndice } from '../../components/anclas';
import { apartadoEnlaceFinanciero } from '../proyecciones/apartados';

/**
 * Apartados de la página: el mismo texto pinta el encabezado (`<h2>`) y su entrada en el índice
 * «En esta página». Sin cifras.
 */
export const APARTADOS = {
  valor: { destino: 'valor', titulo: 'Cuánto vale el Fondo y cómo se mueve' },
  meses: { destino: 'meses', titulo: 'El Fondo en meses de gasto en pensiones' },
  reglas: { destino: 'reglas', titulo: 'Reglas de dotación y de disposición' },
  origen: {
    destino: 'origen',
    titulo: 'De dónde procede el dinero: transferencias, préstamos y gastos impropios',
  },
  transferencias: {
    destino: 'transferencias',
    titulo: 'Las transferencias del Estado a la Seguridad Social en el tiempo',
  },
  fondoTransferencias: {
    destino: 'fondo-transferencias',
    titulo: 'El Fondo de Reserva frente a las transferencias',
  },
  posicion: {
    destino: 'posicion',
    titulo: 'El Fondo, la deuda con el Estado y las transferencias: dos lecturas separadas',
  },
  prestamos: {
    destino: 'prestamos',
    titulo: 'Préstamos del Estado y Fondo de Reserva según el Tribunal de Cuentas',
  },
  contraste: {
    destino: 'contraste-liquidacion',
    titulo: 'Un ejercicio con las dos fuentes: la liquidación frente a la ejecución',
  },
} as const satisfies Record<string, EntradaIndice>;

export const INDICE: readonly EntradaIndice[] = [
  ...Object.values(APARTADOS),
  apartadoEnlaceFinanciero('hucha'),
];
