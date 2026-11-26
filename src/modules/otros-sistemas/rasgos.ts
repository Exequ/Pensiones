/**
 * Etiquetas de los rasgos de la estructura de los sistemas (`paises-sistemas`). Tres etiquetas de los
 * datos empiezan por la ubicación del dato en el informe («tabla …, panel …»); la ubicación pertenece
 * al desplegable «Fuentes» y no al cuerpo, de modo que se quita de la frase que se ve.
 */

const UBICACION_DE_TABLA = /^tabla \d+\.\d+(?:, panel [A-Z])?(?: \(([^)]*)\))?:\s*(.+)$/;

const conMayuscula = (texto: string): string => texto.charAt(0).toUpperCase() + texto.slice(1);

/**
 * Etiqueta sin la ubicación en una tabla del informe. Si la ubicación llevaba un contexto entre
 * paréntesis (qué legislación recoge el panel), se conserva como inicio de la frase; una referencia a
 * otro panel se sustituye por lo que ese panel recoge.
 */
export function quitarUbicacionDeTabla(etiqueta: string): string {
  const partes = UBICACION_DE_TABLA.exec(etiqueta);
  const contexto = partes?.[1];
  const resto = partes?.[2];
  if (resto === undefined) return etiqueta;
  if (contexto === undefined) return conMayuscula(resto);
  const sinPanel = contexto.replace(
    /difiere del panel [A-Z]/,
    'difiere de la legislación más reciente',
  );
  return `${conMayuscula(sinPanel)}: ${resto}`;
}
