/** Reglas del MEI y de la solidaridad que el motor no calcula (docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md). */
export const LIMITACIONES_MEI: readonly { readonly regla: string; readonly motivo: string }[] = [
  {
    regla: 'RETA, regímenes especiales y sistemas especiales',
    motivo:
      'El motor aplica el tipo general del Régimen General (el RETA se hará al final del proyecto).',
  },
  {
    regla: 'Proyecciones del MEI y de la solidaridad',
    motivo:
      'Una función por año, con la ley vigente; después de 2050 el MEI lanza NoImplementada y las bases máximas posteriores a 2026 exigen un escenario.',
  },
  {
    regla:
      'Exclusiones del MEI en prácticas formativas y en el sector marítimo-pesquero (art. 127 bis.2 y DT 47.ª)',
    motivo:
      'No se estructuran: se indica el caso con una base de cotización cero o se calcula fuera.',
  },
  {
    regla:
      'Cuota de solidaridad de los trabajadores por cuenta propia y de la actividad compatible con la pensión',
    motivo: 'Régimen distinto del art. 19 bis (RETA y art. 214): fuera de alcance.',
  },
  {
    regla: 'Tipos de contingencias comunes posteriores a 2026',
    motivo: 'Reparto de la solidaridad: DatoNoDisponible salvo opciones.tiposContingenciasComunes.',
  },
];
