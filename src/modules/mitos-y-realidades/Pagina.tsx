import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('mitos-y-realidades');

/** Módulo «mitos-y-realidades». Fase 0: página en construcción. */
export default function MitosYRealidades() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('mitos-y-realidades')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
