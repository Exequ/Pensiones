import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('otros-sistemas');

/** Módulo «otros-sistemas». Fase 0: página en construcción. */
export default function OtrosSistemas() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('otros-sistemas')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
