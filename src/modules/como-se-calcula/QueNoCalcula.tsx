import { quitarCitas } from '../../engine/citas-normativas';
import { LIMITACIONES_MOTOR } from '../../engine/limitaciones';
import type { Esquema } from './esquemas';

const MOTOR: Record<Esquema['id'], 'jubilacion' | 'incapacidad' | 'supervivencia'> = {
  jubilacion: 'jubilacion',
  incapacidad: 'incapacidad',
  viudedad: 'supervivencia',
  orfandad: 'supervivencia',
};

/** Lo que esta web no calcula: las limitaciones del motor y lo que queda para otras fases. */
export function QueNoCalcula({ esquema }: { readonly esquema: Esquema }) {
  const limitaciones = LIMITACIONES_MOTOR.filter((l) => l.motor === MOTOR[esquema.id]);
  return (
    <ul className="como-no-calcula">
      {esquema.noCalcula.map((t) => (
        <li key={t}>{quitarCitas(t)}</li>
      ))}
      {limitaciones.map((l) => (
        <li key={l.regla}>
          <strong>{quitarCitas(l.regla)}.</strong> {quitarCitas(l.motivo)}
        </li>
      ))}
    </ul>
  );
}
