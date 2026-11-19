import { Link } from 'react-router-dom';
import { DataTable } from '../../components/DataTable';
import { Definition } from '../../components/Definition';
import { formatearNumero } from '../../engine/formato';
import { LECTURAS_ABIERTAS } from '../../engine/lecturas';
import { ETIQUETA_ESTADO, EXPLICACION_ESTADO } from '../tu-pension/supuestos';
import { recuentos } from './recuentos';
import { Respaldo } from './Respaldo';
import { tituloApartado } from './apartados';

const ETIQUETA_MOTOR: Readonly<Record<string, string>> = {
  jubilacion: 'Jubilación',
  incapacidad: 'Incapacidad permanente',
  supervivencia: 'Muerte y supervivencia',
  'no-contributivas': 'Pensiones no contributivas',
  mei: 'Mecanismo de Equidad Intergeneracional',
};

const etiquetaMotor = (motor: string): string => ETIQUETA_MOTOR[motor] ?? motor;

/** Apartado «Lecturas del motor». */
export function SeccionLecturas() {
  const { lecturas } = recuentos;
  return (
    <section
      className="seccion prosa met-seccion"
      id="met-lecturas"
      aria-labelledby="met-lecturas-titulo"
    >
      <h2 id="met-lecturas-titulo" tabIndex={-1}>
        {tituloApartado('met-lecturas')}
      </h2>
      <p>
        El motor de cálculo es el programa del proyecto que calcula una pensión a partir de las
        normas y de los parámetros de /data. Cuando una norma admite más de una interpretación, el
        motor no elige en silencio: la deja como una lectura abierta.
      </p>
      <Definition termino="Lectura abierta">
        Duda de interpretación de la norma que el motor no decide por su cuenta. Está implementada
        como una opción explícita, con un valor por defecto (la lectura más sencilla, documentada) y
        una o varias alternativas.
      </Definition>
      <h3>Los tres estados</h3>
      <ul>
        {(['decidida', 'provisional', 'pendiente'] as const).map((e) => (
          <li key={e}>
            <strong>{ETIQUETA_ESTADO[e]}.</strong> {EXPLICACION_ESTADO[e]}
          </li>
        ))}
      </ul>
      <p>
        El estado informa sobre la revisión actuarial; no es un consejo. Una lectura pendiente no
        impide calcular: el cálculo usa el valor por defecto mientras no se revise.
      </p>

      <h3>Recuento actual</h3>
      <p>
        Hay {formatearNumero(lecturas.total)} lecturas abiertas:{' '}
        {formatearNumero(lecturas.estado.decidida)} decididas,{' '}
        {formatearNumero(lecturas.estado.provisional)} provisionales y{' '}
        {formatearNumero(lecturas.estado.pendiente)} pendientes. El recuento se calcula al compilar
        la web desde el fichero de valores por defecto del motor.
      </p>
      <DataTable
        titulo="Lecturas abiertas por prestación y estado"
        columnas={[
          { clave: 'motor', titulo: 'Motor' },
          { clave: 'decidida', titulo: 'Decididas', tipo: 'numero' },
          { clave: 'provisional', titulo: 'Provisionales', tipo: 'numero' },
          { clave: 'pendiente', titulo: 'Pendientes', tipo: 'numero' },
          { clave: 'total', titulo: 'Total', tipo: 'numero' },
        ]}
        filas={lecturas.porMotor.map((m) => ({
          motor: etiquetaMotor(m.motor),
          decidida: m.decidida,
          provisional: m.provisional,
          pendiente: m.pendiente,
          total: m.total,
        }))}
      />

      <h3>Todas las lecturas</h3>
      <p>Se listan todas, también las pendientes, con el valor que usa el cálculo por defecto.</p>
      <DataTable
        titulo="Lecturas abiertas del motor, con su estado y su valor por defecto"
        columnas={[
          { clave: 'lectura', titulo: 'Lectura' },
          { clave: 'estado', titulo: 'Estado' },
          { clave: 'porDefecto', titulo: 'Valor por defecto' },
          { clave: 'decide', titulo: 'Qué decide' },
        ]}
        filas={LECTURAS_ABIERTAS.map((l) => ({
          lectura: l.id,
          estado: ETIQUETA_ESTADO[l.estado],
          porDefecto: l.porDefecto,
          decide: l.descripcion,
        }))}
      />
      <p className="texto-interfaz">
        Dónde se ven en la web: <Link to="/tu-pension">Tu pensión</Link> permite elegir otro valor
        de las lecturas de cada prestación y ver cómo cambia el resultado;{' '}
        <Link to="/como-se-calcula">Cómo se calcula</Link> muestra, prestación a prestación, las
        lecturas que influyen en la cuantía.
      </p>
      <Respaldo apartado="lecturas" />
    </section>
  );
}
