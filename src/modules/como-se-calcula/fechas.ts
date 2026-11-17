/** Fechas de los ejemplos en lenguaje llano: «1 de enero de 1965», «enero de 1987». */
const OPCIONES_DIA = { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' } as const;
const OPCIONES_MES = { month: 'long', year: 'numeric', timeZone: 'UTC' } as const;

const partes = (iso: string): [number, number, number] => {
  const [anio = 0, mes = 1, dia = 1] = iso.split('-').map(Number);
  return [anio, mes, dia];
};

export function fechaLarga(iso: string): string {
  const [anio, mes, dia] = partes(iso);
  return new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString('es-ES', OPCIONES_DIA);
}

/** `AAAA-MM` → «enero de 1987». */
export function mesLargo(mes: string): string {
  const [anio, m] = partes(mes);
  return new Date(Date.UTC(anio, m - 1, 1)).toLocaleDateString('es-ES', OPCIONES_MES);
}
