/**
 * Traducción de los errores del motor (`EntradaInvalida`, `DatoNoDisponible`, `NoImplementada`) a
 * mensajes en español con la acción que la persona puede hacer. Texto sin cifras de datos.
 */
import type { ErrorMotor } from '../../engine/fachada';

export interface MensajeError {
  readonly codigo: ErrorMotor['codigo'];
  readonly titulo: string;
  readonly mensaje: string;
  /** Qué puede hacer la persona. */
  readonly accion: string;
  /** Campo del formulario al que llevar el foco, si se sabe. */
  readonly campo?: 'jubilacionAnio' | 'ipcSupuesto' | 'inicioAnio' | 'baseMensual';
}

export function traducirError(error: ErrorMotor): MensajeError {
  const texto = error.mensaje;
  switch (error.codigo) {
    case 'EntradaInvalida': {
      if (/posterior al nacimiento/i.test(texto)) {
        return {
          codigo: error.codigo,
          titulo: 'Las fechas no son coherentes',
          mensaje: 'La fecha de jubilación debe ser posterior a la de nacimiento.',
          accion: 'Revisa el mes y el año de nacimiento y de jubilación.',
          campo: 'jubilacionAnio',
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
            'Para esa fecha de jubilación hay meses sin dato publicado de IPC y el cálculo necesita un supuesto.',
          accion:
            'Escribe un IPC anual supuesto en el apartado «Escenario económico» y vuelve a calcular.',
          campo: 'ipcSupuesto',
        };
      }
      if (/sin versión de la regla|sin dato para|revalorización de/i.test(texto)) {
        return {
          codigo: error.codigo,
          titulo: 'No hay reglas cargadas para esa fecha',
          mensaje:
            'El simulador no tiene las normas necesarias para una jubilación en el año indicado.',
          accion: 'Elige otra fecha de jubilación, más cercana al presente.',
          campo: 'jubilacionAnio',
        };
      }
      return {
        codigo: error.codigo,
        titulo: 'Falta un dato necesario',
        mensaje: `El cálculo necesita un dato que no está disponible. Detalle técnico: ${texto}`,
        accion:
          'Prueba con otra fecha de jubilación. Si persiste, consulta «Metodología» para ver qué datos faltan.',
      };
    }
    case 'NoImplementada': {
      const regla = error.regla ?? texto;
      return {
        codigo: error.codigo,
        titulo: 'Este caso queda fuera del simulador',
        mensaje: `La ley regula este supuesto, pero el simulador todavía no lo calcula: ${regla}.`,
        accion: 'Elige otra fecha de jubilación; las limitaciones del cálculo se listan más abajo.',
        campo: 'jubilacionAnio',
      };
    }
  }
}
