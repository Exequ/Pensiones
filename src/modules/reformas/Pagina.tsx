import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('reformas');

/** Módulo «reformas». Fase 0: página en construcción. */
export default function Reformas() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('reformas')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
