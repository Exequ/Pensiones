/**
 * Fuentes de la página «Otros sistemas» para el desplegable «Fuentes» (fase R10): da el `Dato` de cada
 * referencia de las definiciones del módulo con los ficheros que la página ya carga. Los literales,
 * las ubicaciones y los rótulos de la fuente no se escriben en el cuerpo: viven en la cita y en la
 * ubicación de cada `Dato`.
 */
import type { DatoRotulado } from '../../components/fuentes';
import { fuentesDefinicionFinanciacion } from '../historico/datos-financiacion';
import { aniosOcde } from './consultas';
import { datosSistemas } from './datos-sistemas';
import {
  CONTRASTE,
  MEDIDA,
  medidaReposicion,
  NIVEL_INICIAL,
  NIVELES_REPOSICION,
} from './ids-datos';

/** Definiciones del módulo que se añadieron para esta página (fase R10). */
export const DEFINICIONES_DE_ESTA_PAGINA: readonly string[] = [
  'edad-normal-de-jubilacion-ocde',
  'edad-efectiva-de-salida-del-mercado-laboral-ocde',
  'tasa-de-reposicion-teorica-bruta-ocde',
  'tasa-de-reposicion-teorica-neta-ocde',
  'reparto',
  'capitalizacion',
  'cuentas-nocionales',
  'pilares-de-un-sistema-de-pensiones',
  'ejes-de-clasificacion-de-los-sistemas',
  'diferencia-con-espana',
  'cociente-pension-media-salario-medio',
  'carrera-ininterrumpida-hasta-la-edad-menor',
];

/** Definiciones del módulo que esta página reutiliza de otras fases (R7), sin reescribirlas. */
export const DEFINICIONES_REUTILIZADAS: readonly string[] = [
  'gasto-pensiones-ocde',
  'gasto-pensiones-esspros-vejez-supervivientes',
  'gasto-pensiones-contributivas-sin-complemento',
  'gasto-sobre-pib',
  'gasto-frente-a-financiacion',
];

/** Rótulo («Se refiere a») de cada supuesto de la OCDE que cita una definición. */
const ROTULO_SUPUESTO: Readonly<Record<string, string>> = {
  'ocde-pag-2025-definicion-edad-normal-jubilacion': 'Definición de la edad normal de jubilación',
  'ocde-pag-2025-definicion-edad-efectiva-salida':
    'Definición de la edad efectiva de salida del mercado laboral',
  'ocde-pag-2025-carrera-completa': 'Carrera completa del cálculo',
  'ocde-pag-2025-duracion-carrera': 'Duración de la carrera modelada',
  'ocde-pag-2025-trabajador-que-entra-en-2024': 'Persona modelo del cálculo',
  'ocde-pag-2025-salario-relativo-constante': 'Evolución del salario de la persona modelo',
  'ocde-pag-2025-salario-medio-definicion': 'Definición del salario medio',
  'ocde-pag-2025-tasa-neta-definicion': 'Definición de la tasa de reposición neta',
  'ocde-pag-2025-politica-fiscal-constante': 'Impuestos y cotizaciones de la tasa neta',
  'ocde-pag-2025-impuestos-pensionistas-en-perfiles':
    'Dónde figuran los impuestos y cotizaciones de los pensionistas',
  'ocde-pag-2025-renta-vitalicia-indexada': 'Forma de pago de los planes de aportación definida',
  'ocde-pag-2025-rentabilidad-real-fdc-base': 'Rentabilidad real de los planes de capitalización',
  'ocde-pag-entrada-mercado-laboral-22': 'Edad de entrada en el mercado laboral del cálculo',
};

/** Medidas de la OCDE que respaldan cada definición cuya referencia es la tabla completa. */
function medidasDeTabla(idDefinicion: string): readonly string[] {
  switch (idDefinicion) {
    case 'edad-normal-de-jubilacion-ocde':
      return [MEDIDA.edadActual, MEDIDA.edadFutura];
    case 'edad-efectiva-de-salida-del-mercado-laboral-ocde':
      return [MEDIDA.edadSalida];
    case 'tasa-de-reposicion-teorica-bruta-ocde':
      return NIVELES_REPOSICION.map((n) => medidaReposicion('bruta', n.codigo));
    case 'tasa-de-reposicion-teorica-neta-ocde':
      return NIVELES_REPOSICION.map((n) => medidaReposicion('neta', n.codigo));
    default:
      // Diferencia con España: una medida de cada tipo que muestra la página.
      return [
        MEDIDA.gasto,
        MEDIDA.edadActual,
        MEDIDA.edadFutura,
        MEDIDA.edadSalida,
        medidaReposicion('bruta', NIVEL_INICIAL),
        medidaReposicion('neta', NIVEL_INICIAL),
      ];
  }
}

/** Todas las series de contraste con un `data` suelto frente a las series de `contraste-espana`. */
const SERIES_CONTRASTE: readonly string[] = [CONTRASTE.gastoPropio, ...CONTRASTE.cocientes];

/**
 * `Dato` (o `Dato`s) de cada referencia de las definiciones del módulo que muestra la página.
 * Devuelve `undefined` si la referencia no es de esta página.
 */
export function fuentesDefinicionSistemas(
  referencia: string,
  idDefinicion: string,
): DatoRotulado | readonly DatoRotulado[] | undefined {
  // Las definiciones de R7 (gasto en pensiones) se leen con las fuentes de «Financiación y déficit».
  if (!DEFINICIONES_DE_ESTA_PAGINA.includes(idDefinicion))
    return fuentesDefinicionFinanciacion(referencia, idDefinicion);
  const d = datosSistemas();
  const [fichero, id] = referencia.split('#');
  switch (fichero) {
    case 'internacional/ocde-supuestos-reposicion.json': {
      if (id === undefined) return undefined;
      return { ...d.supuesto(id).dato, rotulo: ROTULO_SUPUESTO[id] ?? 'Supuesto de la OCDE' };
    }
    case 'internacional/paises-sistemas.json':
      return d.rasgos.find((r) => r.id === id)?.datoCitado;
    case 'internacional/ocde-pag.json':
      return medidasDeTabla(idDefinicion).map((medida) => {
        const anio = aniosOcde(d.ocde.observaciones, { medida }).at(-1) ?? 0;
        return d.ocde.datoMedida(String(anio), medida);
      });
    case 'internacional/eurostat-indicadores.json': {
      const anio = Math.max(...d.eurostat.observaciones.map((o) => o.anio));
      return d.eurostat.datoGasto(String(anio));
    }
    case 'internacional/contraste-espana.json': {
      if (id === undefined) return undefined;
      return SERIES_CONTRASTE.includes(id) ? d.contraste.serie(id).dato : d.contraste.dato(id);
    }
    default:
      return undefined;
  }
}
