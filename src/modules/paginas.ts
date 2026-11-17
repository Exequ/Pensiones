import { lazy, type ComponentType } from 'react';
import type { SlugSeccion } from './secciones';

/**
 * «Tu pensión» se carga solo al visitarla: arrastra el motor y los ficheros de /data/parametros
 * (`import.meta.glob`), que no deben engordar el resto de la web.
 */
const TuPension = lazy(() => import('./tu-pension/Pagina'));

/**
 * Las páginas históricas (Fase 5-A) también se cargan solo al visitarlas: arrastran sus ficheros de
 * /data (en particular, la ejecución del presupuesto en CSV) y Observable Plot.
 */
const CotizantesYPensionistas = lazy(() => import('./cotizantes-y-pensionistas/Pagina'));
const FinanciacionYDeficit = lazy(() => import('./financiacion-y-deficit/Pagina'));
const Hucha = lazy(() => import('./hucha/Pagina'));

/** «Proyecciones» (Fase 5-B1) también se carga solo al visitarla: arrastra las salidas de los modelos. */
const Proyecciones = lazy(() => import('./proyecciones/Pagina'));

/**
 * «Otros sistemas» y «Tipos de pensión» (Fase 5-C) se cargan solo al visitarlas: arrastran las
 * tablas de la OCDE y de Eurostat y los ficheros de normativa y de parámetros, respectivamente.
 */
const OtrosSistemas = lazy(() => import('./otros-sistemas/Pagina'));
const TiposDePension = lazy(() => import('./tipos-de-pension/Pagina'));

/**
 * «Cómo se calcula» se carga solo al visitarla: arrastra el motor, los ficheros de parámetros y
 * Observable Plot.
 */
const ComoSeCalcula = lazy(() => import('./como-se-calcula/Pagina'));

/**
 * «Reformas» se carga solo al visitarla: arrastra la cronología de normas, algunos ficheros de
 * parámetros y Observable Plot.
 */
const Reformas = lazy(() => import('./reformas/Pagina'));

/** «Mitos y realidades» se carga solo al visitarla: arrastra los cargadores de las páginas históricas. */
const MitosYRealidades = lazy(() => import('./mitos-y-realidades/Pagina'));

/**
 * «Metodología» se carga solo al visitarla: arrastra los recuentos calculados al compilar, el
 * registro de lecturas del motor y las tablas de datos.
 */
const Metodologia = lazy(() => import('./metodologia/Pagina'));

/** Componente de página de cada sección, indexado por su ruta. */
export const PAGINAS: Record<SlugSeccion, ComponentType> = {
  'tu-pension': TuPension,
  'tipos-de-pension': TiposDePension,
  'como-se-calcula': ComoSeCalcula,
  reformas: Reformas,
  'financiacion-y-deficit': FinanciacionYDeficit,
  hucha: Hucha,
  'cotizantes-y-pensionistas': CotizantesYPensionistas,
  proyecciones: Proyecciones,
  'otros-sistemas': OtrosSistemas,
  'mitos-y-realidades': MitosYRealidades,
  metodologia: Metodologia,
};
