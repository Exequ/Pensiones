import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('tipos-de-pension');

/** Módulo «tipos-de-pension». Fase 0: página en construcción. */
export default function TiposDePension() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('tipos-de-pension')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
