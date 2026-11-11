import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('como-se-calcula');

/** Módulo «como-se-calcula». Fase 0: página en construcción. */
export default function ComoSeCalcula() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('como-se-calcula')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
