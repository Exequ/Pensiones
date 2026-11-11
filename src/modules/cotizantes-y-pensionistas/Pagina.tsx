import { UnderConstruction } from '../../components/UnderConstruction';
import { antetituloSeccion, buscarSeccion } from '../secciones';

const seccion = buscarSeccion('cotizantes-y-pensionistas');

/** Módulo «cotizantes-y-pensionistas». Fase 0: página en construcción. */
export default function CotizantesYPensionistas() {
  return (
    <UnderConstruction
      kicker={antetituloSeccion('cotizantes-y-pensionistas')}
      titulo={seccion.titulo}
      resumen={seccion.resumen}
      previsto={seccion.previsto}
    />
  );
}
