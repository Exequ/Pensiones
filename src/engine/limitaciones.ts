/** Limitaciones consolidadas de todos los motores, por motor (docs/MOTOR.md). */
import { LIMITACIONES_INCAPACIDAD } from './incapacidad/limitaciones.ts';
import { LIMITACIONES } from './jubilacion/errores.ts';
import { LIMITACIONES_MEI } from './mei/limitaciones.ts';
import { LIMITACIONES_PNC } from './no-contributivas/limitaciones.ts';
import { LIMITACIONES_SUPERVIVENCIA } from './supervivencia/limitaciones.ts';

export interface Limitacion {
  readonly motor: 'jubilacion' | 'incapacidad' | 'supervivencia' | 'no-contributivas' | 'mei';
  readonly regla: string;
  readonly motivo: string;
}

const con = (
  motor: Limitacion['motor'],
  l: readonly { regla: string; motivo: string }[],
): Limitacion[] => l.map((x) => ({ motor, regla: x.regla, motivo: x.motivo }));

export const LIMITACIONES_MOTOR: readonly Limitacion[] = [
  ...con('jubilacion', LIMITACIONES),
  ...con('incapacidad', LIMITACIONES_INCAPACIDAD),
  ...con('supervivencia', LIMITACIONES_SUPERVIVENCIA),
  ...con('no-contributivas', LIMITACIONES_PNC),
  ...con('mei', LIMITACIONES_MEI),
];
