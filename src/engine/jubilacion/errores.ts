/** Errores propios del motor de jubilación. */

/** La regla existe en la ley pero el motor no la implementa (véase `LIMITACIONES`). */
export class NoImplementada extends Error {
  readonly regla: string;
  constructor(regla: string, motivo: string) {
    super(`No implementada: ${regla}. ${motivo}`);
    this.name = 'NoImplementada';
    this.regla = regla;
  }
}

/** Falta un dato de /data (o del escenario) que el cálculo necesita; nunca se inventa. */
export class DatoNoDisponible extends Error {
  constructor(mensaje: string) {
    super(`Dato no disponible: ${mensaje}`);
    this.name = 'DatoNoDisponible';
  }
}

/** Reglas de la ley que el motor no calcula, con el motivo. Se muestran en docs/MOTOR_JUBILACION.md. */
export const LIMITACIONES: readonly { readonly regla: string; readonly motivo: string }[] = [
  {
    regla: 'Hechos causantes anteriores a 2013 (escala de porcentajes por años)',
    motivo: 'La escala anterior a 2013 no se ha estructurado en /data (PENDIENTE_DATOS.md).',
  },
  {
    regla: 'Jubilaciones anticipadas y demora con hechos causantes anteriores a 2022',
    motivo: 'Los cuadros de coeficientes de /data son los de la Ley 21/2021 (en vigor desde 2022).',
  },
  {
    regla:
      'Jubilación anticipada por actividades penosas, discapacidad o mutualistas (arts. 206, 206 bis; DT 4.ª.2)',
    motivo: 'Coeficientes reductores de la edad por actividad: no recogidos en /data.',
  },
  {
    regla: 'Jubilación flexible y jubilación activa (art. 213.1, art. 214)',
    motivo: 'Compatibilidad con el trabajo: fuera del alcance del cálculo de la pensión inicial.',
  },
  {
    regla: 'Pensiones concurrentes, totalización internacional y prorrata temporis',
    motivo: 'Exigen datos de otras pensiones o de otros países.',
  },
  {
    regla: 'Límite de ingresos de los mínimos con cónyuge a cargo',
    motivo: 'El límite con cónyuge a cargo no está en /data (PENDIENTE_DATOS.md).',
  },
  {
    regla: 'Reducción de la brecha de las mínimas con el umbral de pobreza (DA 53.ª, 2027)',
    motivo:
      'Exige el umbral de pobreza de la ECV, no descargado. Desde 2027 las mínimas se revalorizan con el IPC del escenario.',
  },
  {
    regla: 'Salvaguarda de la DT 34.ª.1 (no inferior a la pensión con las normas de 2021)',
    motivo: 'Exige calcular la pensión con la normativa de 2021, no transcrita.',
  },
  {
    regla: 'Límite de los incrementos salariales de los dos últimos años (art. 209.2-4)',
    motivo: 'Depende del convenio colectivo aplicable.',
  },
  {
    regla:
      'Regímenes especiales y RETA; bases de cotización por contingencias distintas de las comunes',
    motivo: 'El motor modela el Régimen General con una base de cotización por mes.',
  },
];
