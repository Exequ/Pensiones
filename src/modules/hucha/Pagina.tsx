import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('hucha');

/** Módulo «hucha». Fase 0: página en construcción. */
export default function Hucha() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('hucha')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
