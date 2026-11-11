import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('financiacion-y-deficit');

/** Módulo «financiacion-y-deficit». Fase 0: página en construcción. */
export default function FinanciacionYDeficit() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('financiacion-y-deficit')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
