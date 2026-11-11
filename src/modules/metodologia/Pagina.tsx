import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('metodologia');

/** Módulo «metodologia». Fase 0: página en construcción. */
export default function Metodologia() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('metodologia')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
