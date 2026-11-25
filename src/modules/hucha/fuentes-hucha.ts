/**
 * Fuentes de la página «La hucha» para el desplegable «Fuentes» (fase R8): da el `Dato` de cada
 * referencia de las definiciones del módulo con los ficheros que la página ya carga, y los datos
 * con la cita de los rótulos literales de la fuente (que no se escriben en el cuerpo).
 */
import { Dato } from '../../engine/esquema-datos';
import type { DatoRotulado } from '../../components/fuentes';
import {
  datosFilasEjecucion,
  datosFinanciacion,
  ejecucionDelPresupuesto,
  fuentesDefinicionFinanciacion,
} from '../historico/datos-financiacion';
import { datosHucha, type DatoCargado } from '../historico/datos-hucha';
import { FICHERO_PLAZO_AMPLIADO, ROTULO_FUENTE } from './ids-datos';

/** Definiciones del módulo que se añadieron para esta página (fase R8). */
export const DEFINICIONES_DE_ESTA_PAGINA: readonly string[] = [
  'fondo-de-reserva',
  'fondo-de-reserva-limite-de-desembolso',
  'prestamos-del-estado-a-la-seguridad-social',
  'transferencias-corrientes-del-estado',
  'fondo-menos-deuda',
  'deuda-mas-transferencias-acumuladas',
  'fondo-en-meses-de-gasto',
  'fondo-en-meses-de-transferencias',
];

/** Rótulo («Se refiere a») de cada dato suelto que cita una definición. */
const ROTULO_DATO: Readonly<Record<string, string>> = {
  'aportaciones-estado-presupuestos': 'Las aportaciones del Estado como recurso del sistema',
  'no-contributiva-aportaciones-estado': 'Financiación de la modalidad no contributiva',
  'contributivas-financiacion-basica': 'Financiación de las prestaciones contributivas',
  'naturaleza-no-contributiva-minimos':
    'Complementos por mínimos entre las prestaciones no contributivas',
  'origen-prestamos-gestion-ordinaria':
    'Origen de los préstamos recientes, según el Tribunal de Cuentas',
  'condiciones-prestamos-recientes':
    'Condiciones de los préstamos recientes, según el Tribunal de Cuentas',
  'prestamos-sin-devolver-y-prorrogados':
    'Estado de los préstamos antiguos, según el Tribunal de Cuentas',
  '2021-plazo-maximo-anios': 'Plazo y tipo de interés de los préstamos de una ley de presupuestos',
  'apartado-1-plazo-anios': 'Nuevo plazo de cancelación de préstamos antiguos',
  'destino-fondo-reserva': 'Destino de la cotización del Mecanismo de Equidad Intergeneracional',
};

const conRotulo = (dato: Dato, rotulo: string | undefined): DatoRotulado =>
  rotulo === undefined ? dato : { ...dato, rotulo };

const datoSuelto = (
  registro: Readonly<Record<string, DatoCargado>>,
  id: string,
): DatoRotulado | undefined => {
  const d = registro[id];
  return d === undefined ? undefined : conRotulo(d.dato, ROTULO_DATO[id]);
};

/**
 * Datos de las filas de la ejecución y de la liquidación que la página nombra: la fuente es la de la
 * tabla y la cita, el rótulo de la fila o partida tal como figura en la fuente.
 */
export function datosFilasHucha(): {
  readonly transferenciasEjecucion: DatoRotulado;
  readonly transferenciasLiquidacion: DatoRotulado;
  readonly meiEjecucion: DatoRotulado;
} {
  const d = datosHucha();
  const { dato } = ejecucionDelPresupuesto();
  return {
    transferenciasEjecucion: {
      ...Dato.parse({
        ...dato,
        quote: ROTULO_FUENTE.transferenciasEjecucion,
        location: 'Ejecución de ingresos, capítulo de transferencias corrientes',
      }),
      rotulo: 'Rótulo de la partida de transferencias del Estado en la ejecución del presupuesto',
    },
    transferenciasLiquidacion: {
      ...Dato.parse({
        ...d.liquidacion.delEstado.dato,
        quote: ROTULO_FUENTE.transferenciasLiquidacion,
        location: 'Liquidación del presupuesto de ingresos, capítulo de transferencias corrientes',
      }),
      rotulo: 'Rótulos de las dos partidas que se suman en las liquidaciones',
    },
    meiEjecucion: {
      ...Dato.parse({
        ...dato,
        quote: ROTULO_FUENTE.meiEjecucion,
        location: 'Ejecución de ingresos, capítulo de cotizaciones',
      }),
      rotulo: 'Rótulo de la cotización del Mecanismo de Equidad Intergeneracional en la ejecución',
    },
  };
}

/**
 * `Dato` (o `Dato`s) de cada referencia de las definiciones del módulo que muestra la página. Devuelve
 * `undefined` si la referencia no es de esta página.
 */
export function fuentesDefinicionHucha(
  referencia: string,
  idDefinicion: string,
): DatoRotulado | readonly DatoRotulado[] | undefined {
  // Las definiciones de «Financiación y déficit» (R7) se leen con las fuentes de esa página.
  if (!DEFINICIONES_DE_ESTA_PAGINA.includes(idDefinicion))
    return fuentesDefinicionFinanciacion(referencia, idDefinicion);
  const d = datosHucha();
  const filas = datosFilasEjecucion();
  const propias = datosFilasHucha();
  const [fichero, id] = referencia.split('#');
  switch (fichero) {
    case 'sistema/fondo-reserva-anual.json':
      return d.flujos.dato;
    case 'sistema/fondo-reserva-series.json':
      return id === 'valor-fin-ano' ? d.valor.dato : undefined;
    case 'parametros/mei-destino.json':
      return id === undefined
        ? undefined
        : { ...d.destinoMei.dato, rotulo: ROTULO_DATO[id] ?? 'Destino de la cotización' };
    case 'parametros/fondo-reserva-desembolso-maximo.json':
      return {
        ...d.limiteDesembolso.dato,
        rotulo: 'Límite del primer año de la tabla de desembolsos máximos',
      };
    case 'normativa/trlgss-financiacion.json':
      return id === undefined ? undefined : datoSuelto(d.trlgss, id);
    case 'sistema/prestamos-transferencias-tribunal-cuentas.json':
      return id === undefined ? undefined : datoSuelto(d.tribunal, id);
    case 'parametros/prestamos-estado-seguridad-social.json':
      return id === undefined ? undefined : datoSuelto(d.prestamosLeyes, id);
    case FICHERO_PLAZO_AMPLIADO:
      return id === undefined ? undefined : datoSuelto(d.prestamosPlazo, id);
    case 'sistema/deuda-pde-seguridad-social.json':
      return id === 'deuda-pde-fin-ano' ? d.deuda.finAno.dato : undefined;
    case 'sistema/deficit-presupuestario-seguridad-social.json':
      return id === 'transferencias-estado-corrientes'
        ? datosFinanciacion().presupuesto.transferenciasEstado.dato
        : undefined;
    case 'sistema/presupuesto-ss-ejecucion.json':
      if (idDefinicion === 'transferencias-corrientes-del-estado')
        return [propias.transferenciasEjecucion];
      if (idDefinicion === 'fondo-en-meses-de-transferencias')
        return [propias.transferenciasEjecucion];
      if (idDefinicion === 'fondo-en-meses-de-gasto')
        return [filas.sumaPensiones, filas.complementoMinimos];
      return ejecucionDelPresupuesto().dato;
    default:
      return undefined;
  }
}
