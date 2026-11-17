/**
 * Ficheros de /data que importa directamente `datos-mitos.ts` (página «Mitos y realidades»). El test
 * de procedencia comprueba que cada uno tiene fuente, fecha de descarga y confianza, y que el módulo
 * importa exactamente estos. Además, la página usa los cargadores de «Hucha», «Financiación y
 * déficit», «Cotizantes y pensionistas» y «Otros sistemas», con sus propias listas.
 */
export const FICHEROS_MITOS = [
  'data/demografia/ageing-report-2024-espana.json',
  'data/demografia/europop2025-indicadores.json',
  'data/demografia/fecundidad-indicadores.json',
  'data/demografia/migraciones-exterior-anual.json',
  'data/demografia/proyecciones-hipotesis.json',
  'data/internacional/eurostat-espana.json',
  'data/internacional/ocde-espana.json',
  'data/mitos/afirmaciones-circulantes.json',
  'data/parametros/carrera-jubilacion-65.json',
  'data/parametros/edad-ordinaria-jubilacion.json',
  'data/parametros/ipc-variacion-diciembre.json',
  'data/parametros/ipc-variacion-media-anual.json',
  'data/parametros/mei-reglas.json',
  'data/parametros/pension-minima-jubilacion.json',
  'data/parametros/pnc-importe-anual.json',
  'data/normativa/revalorizacion-2011-regla.json',
  'data/parametros/revalorizacion-general.json',
  'data/parametros/revalorizacion-regla.json',
] as const;
