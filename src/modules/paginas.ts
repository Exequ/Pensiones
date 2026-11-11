import type { ComponentType } from 'react';
import type { SlugSeccion } from './secciones';
import TuPension from './tu-pension/Pagina';
import TiposDePension from './tipos-de-pension/Pagina';
import ComoSeCalcula from './como-se-calcula/Pagina';
import Reformas from './reformas/Pagina';
import FinanciacionYDeficit from './financiacion-y-deficit/Pagina';
import Hucha from './hucha/Pagina';
import CotizantesYPensionistas from './cotizantes-y-pensionistas/Pagina';
import OtrosSistemas from './otros-sistemas/Pagina';
import MitosYRealidades from './mitos-y-realidades/Pagina';
import Metodologia from './metodologia/Pagina';

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
