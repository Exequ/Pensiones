/**
 * Traducción de los errores del motor (`EntradaInvalida`, `DatoNoDisponible`, `NoImplementada`) a
 * mensajes en español con la acción que la persona puede hacer. Texto sin cifras de datos.
 */
import type { ErrorMotor } from '../../engine/fachada';
import type { IdPrestacion } from './tipos';

export interface MensajeError {
  readonly codigo: ErrorMotor['codigo'];
  readonly titulo: string;
  readonly mensaje: string;
  /** Qué puede hacer la persona. */
  readonly accion: string;
  /** Campo del formulario al que llevar el foco, si se sabe. */
  readonly campo?:
    'hechoCausanteAnio' | 'ipcSupuesto' | 'inicioAnio' | 'baseMensual' | 'baseReguladora';
}

/** Cómo se llama en los mensajes la fecha en que termina la carrera de cada prestación. */
const FECHA: Record<IdPrestacion, { fecha: string; elegir: string; pensionDe: string }> = {
  jubilacion: {
    fecha: 'La fecha de jubilación',
    elegir: 'otra fecha de jubilación, más cercana al presente',
    pensionDe: 'una jubilación en el año indicado',
  },
  incapacidad: {
    fecha: 'La fecha del hecho causante',
    elegir: 'otra fecha del hecho causante, más cercana al presente',
    pensionDe: 'un hecho causante en el año indicado',
  },
  viudedad: {
    fecha: 'La fecha del fallecimiento',
    elegir: 'otra fecha de fallecimiento, más cercana al presente',
    pensionDe: 'un fallecimiento en el año indicado',
  },
  orfandad: {
    fecha: 'La fecha del fallecimiento',
    elegir: 'otra fecha de fallecimiento, más cercana al presente',
    pensionDe: 'un fallecimiento en el año indicado',
  },
};

const esSupervivencia = (p: IdPrestacion): boolean => p === 'viudedad' || p === 'orfandad';

/**
 * Hecho causante anterior al primer año que cubre el motor de supervivencia: se dice la fecha y el
 * motivo (la redacción aplicable era otra y exigía requisitos que el motor no tiene) y no se calcula.
 */
function mensajeHechoAnterior(error: ErrorMotor, texto: string): MensajeError | undefined {
  const anio = /hecho causante en (\d{4})/.exec(texto)?.[1];
  if (anio === undefined) return undefined;
  const regla = error.regla ?? '';
  const detalle =
    regla === '' ? texto : texto.slice(texto.indexOf(regla) + regla.length).replace(/^\.\s*/, '');
  return {
    codigo: error.codigo,
    titulo: 'Fallecimiento anterior al periodo que calcula el simulador',
    mensaje: `La fecha del fallecimiento que has indicado (año ${anio}) es anterior al primer año que cubre el cálculo de viudedad y orfandad. Para fechas anteriores la ley aplicable era otra redacción, con requisitos propios que el simulador no recoge (el artículo sobre la viudedad de las parejas de hecho, por ejemplo, tuvo una redacción anterior distinta); el simulador no los sustituye por otros ni los estima. Detalle técnico: ${detalle}`,
    accion:
      'Elige una fecha de fallecimiento posterior; no se muestra ninguna cifra para la fecha indicada.',
    campo: 'hechoCausanteAnio',
  };
}

export function traducirError(
  error: ErrorMotor,
  prestacion: IdPrestacion = 'jubilacion',
): MensajeError {
  const texto = error.mensaje;
  const nombre = FECHA[prestacion];
  switch (error.codigo) {
    case 'EntradaInvalida': {
      if (/posterior al nacimiento/i.test(texto)) {
        return {
          codigo: error.codigo,
          titulo: 'Las fechas no son coherentes',
          mensaje: `${nombre.fecha} debe ser posterior a la de nacimiento.`,
          accion: `Revisa el mes y el año de nacimiento y ${prestacion === 'jubilacion' ? 'de jubilación' : prestacion === 'incapacidad' ? 'del hecho causante' : 'del fallecimiento'}.`,
          campo: 'hechoCausanteAnio',
        };
      }
      if (/Periodo .* (el fin es anterior|falta la base)|solap/i.test(texto)) {
        return {
          codigo: error.codigo,
          titulo: 'La carrera no es coherente',
          mensaje: 'Las fechas de la carrera de cotización no forman un periodo válido.',
          accion: 'Revisa el inicio de la cotización y los meses sin cotizar.',
          campo: 'inicioAnio',
        };
      }
      return {
        codigo: error.codigo,
        titulo: 'Algún dato no es coherente',
        mensaje: `El cálculo no puede usar los datos introducidos. Detalle técnico: ${texto}`,
        accion: 'Revisa los datos del formulario y vuelve a calcular.',
      };
    }
    case 'DatoNoDisponible': {
      if (/IPC/i.test(texto) && /escenario/i.test(texto)) {
        return {
          codigo: error.codigo,
          titulo: 'Falta un IPC supuesto',
          mensaje:
            prestacion === 'jubilacion'
              ? 'Para esa fecha de jubilación hay meses sin dato publicado de IPC y el cálculo necesita un supuesto.'
              : prestacion === 'incapacidad'
                ? 'Para esa fecha del hecho causante hay meses sin dato publicado de IPC y el cálculo necesita un supuesto.'
                : 'Para esa fecha de fallecimiento hay meses sin dato publicado de IPC y el cálculo necesita un supuesto.',
          accion:
            'Escribe un IPC anual supuesto en el apartado «Escenario económico» y vuelve a calcular.',
          campo: 'ipcSupuesto',
        };
      }
      if (/sin versión de la regla|sin dato para|revalorización de/i.test(texto)) {
        return {
          codigo: error.codigo,
          titulo: 'No hay reglas cargadas para esa fecha',
          mensaje: `El simulador no tiene las normas necesarias para ${nombre.pensionDe}.`,
          accion: `Elige ${nombre.elegir}.`,
          campo: 'hechoCausanteAnio',
        };
      }
      return {
        codigo: error.codigo,
        titulo: 'Falta un dato necesario',
        mensaje: `El cálculo necesita un dato que no está disponible. Detalle técnico: ${texto}`,
        accion: `Prueba con ${prestacion === 'jubilacion' ? 'otra fecha de jubilación' : prestacion === 'incapacidad' ? 'otra fecha del hecho causante' : 'otra fecha de fallecimiento'}. Si persiste, consulta «Metodología» para ver qué datos faltan.`,
      };
    }
    case 'NoImplementada': {
      const regla = error.regla ?? texto;
      if (esSupervivencia(prestacion)) {
        const anterior = mensajeHechoAnterior(error, texto);
        if (anterior) return anterior;
        if (/DT 13/i.test(`${regla} ${texto}`)) {
          return {
            codigo: error.codigo,
            titulo: 'Separación o divorcio anteriores a la disposición transitoria decimotercera',
            mensaje: `La ley regula este supuesto con una regla transitoria que el simulador todavía no calcula: ${regla}.`,
            accion:
              'Si la separación o el divorcio no son anteriores a esa fecha, cambia la respuesta; si lo son, el simulador no puede calcular este caso.',
            campo: 'hechoCausanteAnio',
          };
        }
      }
      if (/contingencias profesionales|accidente de trabajo/i.test(`${regla} ${texto}`)) {
        // Accidente de trabajo y enfermedad profesional: el motor necesita la base reguladora ya
        // calculada y no admite el caso sin alta.
        return {
          codigo: error.codigo,
          titulo: 'Falta un dato de las contingencias profesionales',
          mensaje: `Con accidente de trabajo o enfermedad profesional, el simulador solo calcula la prestación con la base reguladora que escribas tú y en alta o situación asimilada: ${regla}.`,
          accion:
            'Escribe la base reguladora mensual (la de tu resolución o la que hayas calculado por tu cuenta) y elige «En alta o situación asimilada».',
          campo: 'baseReguladora',
        };
      }
      return {
        codigo: error.codigo,
        titulo: 'Este caso queda fuera del simulador',
        mensaje: `La ley regula este supuesto, pero el simulador todavía no lo calcula: ${regla}.`,
        accion:
          prestacion === 'jubilacion'
            ? 'Elige otra fecha de jubilación; las limitaciones del cálculo se listan más abajo.'
            : prestacion === 'incapacidad'
              ? 'Cambia la fecha del hecho causante o las opciones del cálculo; las limitaciones del cálculo se listan más abajo.'
              : 'Cambia la fecha del fallecimiento o los datos del caso; las limitaciones del cálculo se listan más abajo.',
        campo: 'hechoCausanteAnio',
      };
    }
  }
}
