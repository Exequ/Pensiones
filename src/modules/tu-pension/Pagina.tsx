import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('tu-pension');

/** Módulo «tu-pension». Fase 0: página en construcción. */
export default function TuPension() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('tu-pension')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
