/** Reglas de las pensiones no contributivas que el motor no calcula (docs/MOTOR_NO_CONTRIBUTIVAS_MEI.md). */
export const LIMITACIONES_PNC: readonly { readonly regla: string; readonly motivo: string }[] = [
  {
    regla: 'Complementos autonómicos y regímenes de haciendas forales',
    motivo: 'Fuera de alcance: dependen de cada comunidad autónoma o territorio foral.',
  },
  {
    regla: 'Años anteriores a 2022 y posteriores a 2026 (cuantía anual)',
    motivo:
      'Las citas de /data se han comprobado desde 2022 (NoImplementada) y la cuantía de cada año la fija una norma de revalorización (DatoNoDisponible si falta).',
  },
  {
    regla: 'Complemento de alquiler de 2024',
    motivo:
      'El RDL 8/2023 descargado no repite el importe (PENDIENTE_DATOS.md): DatoNoDisponible en 2024.',
  },
  {
    regla: 'Compatibilidad con el trabajo (art. 366) con el IPREM de 2024 a 2026',
    motivo: 'El IPREM de esos años no está en /data (PENDIENTE_DATOS.md): DatoNoDisponible.',
  },
  {
    regla: 'Baremo de la discapacidad y de la necesidad de tercera persona (art. 367)',
    motivo: 'El grado se recibe como dato; el baremo lo aprueba el Gobierno y no está en /data.',
  },
  {
    regla: 'Clasificación de las rentas computables y valoración de bienes (art. 363.5)',
    motivo:
      'El motor recibe las rentas computables ya calculadas (incluidas las reglas de la Ley 4/2026 sobre indemnizaciones por responsabilidad civil, en vigor desde el 23/10/2026).',
  },
  {
    regla:
      'Recuperación automática del derecho tras un trabajo (art. 363.1), extinción, revisión y suspensión',
    motivo: 'El motor calcula la pensión inicial de una solicitud.',
  },
  {
    regla: 'Revalorización posterior y proyección de la cuantía anual',
    motivo:
      'La cuantía de cada año la fija la ley de presupuestos o el real decreto de revalorización.',
  },
  {
    regla: 'Varios beneficiarios con rentas distintas en la unidad económica',
    motivo:
      'El motor calcula la pensión de un solicitante y supone la misma pensión para los demás.',
  },
];
