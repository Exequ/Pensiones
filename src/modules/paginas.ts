import { lazy, type ComponentType } from 'react';
import type { SlugSeccion } from './secciones';
import TiposDePension from './tipos-de-pension/Pagina';
import ComoSeCalcula from './como-se-calcula/Pagina';
import Reformas from './reformas/Pagina';
import OtrosSistemas from './otros-sistemas/Pagina';
import MitosYRealidades from './mitos-y-realidades/Pagina';
import Metodologia from './metodologia/Pagina';

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

/** Componente de página de cada sección, indexado por su ruta. */
export const PAGINAS: Record<SlugSeccion, ComponentType> = {
  'tu-pension': TuPension,
  'tipos-de-pension': TiposDePension,
  'como-se-calcula': ComoSeCalcula,
  reformas: Reformas,
  'financiacion-y-deficit': FinanciacionYDeficit,
  hucha: Hucha,
  'cotizantes-y-pensionistas': CotizantesYPensionistas,
  'otros-sistemas': OtrosSistemas,
  'mitos-y-realidades': MitosYRealidades,
  metodologia: Metodologia,
};
