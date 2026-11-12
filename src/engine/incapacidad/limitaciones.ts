/** Reglas de la incapacidad permanente que el motor no calcula (se muestran en docs/MOTOR_INCAPACIDAD.md). */
export const LIMITACIONES_INCAPACIDAD: readonly {
  readonly regla: string;
  readonly motivo: string;
}[] = [
  {
    regla: 'Hechos causantes anteriores a 2022',
    motivo:
      'Las reglas de /data se han verificado para la normativa vigente desde 2022 (lanza NoImplementada).',
  },
  {
    regla:
      'Base reguladora de las contingencias profesionales (accidente de trabajo y enfermedad profesional)',
    motivo:
      'Se calcula con el salario real del Reglamento de accidentes de trabajo de 1956, que no está en la legislación consolidada del BOE (DESCARGAS_MANUALES.md). Lanza NoImplementada salvo que se pase calculada (opciones.baseReguladoraProfesional).',
  },
  {
    regla: 'Lesiones permanentes no incapacitantes (art. 201 TRLGSS)',
    motivo: 'Indemnizaciones por baremo: no son pensión y el baremo no está en /data.',
  },
  {
    regla:
      'Indemnización a tanto alzado sustitutiva de la total para menores de 60 años (art. 196.2)',
    motivo: 'La regula la Orden de 31/07/1972; no se ha estructurado en /data.',
  },
  {
    regla: 'Recargo de prestaciones por falta de medidas de seguridad (art. 164 TRLGSS)',
    motivo: 'Depende de una resolución sobre la responsabilidad de la empresa (30 a 50 %).',
  },
  {
    regla:
      'Actividades penosas, regímenes especiales, RETA, pluriactividad (art. 195.5) y pensiones concurrentes',
    motivo: 'El motor modela el Régimen General con una base de cotización por mes.',
  },
  {
    regla: 'Trabajo de pensionistas de absoluta o gran incapacidad antes del 22/12/2024',
    motivo: 'La redacción anterior del art. 198.2 no se ha transcrito (lanza NoImplementada).',
  },
  {
    regla:
      'Revisión del grado, cambio de clase de la mínima con la edad y paso a jubilación a los 67 años (art. 200)',
    motivo:
      'La revalorización proyecta la pensión inicial; la clase de la mínima es la de la edad en el hecho causante.',
  },
  {
    regla:
      'Límite de ingresos de los mínimos con cónyuge a cargo y tope de los complementos por mínimos',
    motivo: 'El límite con cónyuge a cargo no está en /data (como en la jubilación).',
  },
  {
    regla:
      'Integración parcial de meses con obligación de cotizar solo en parte (art. 197.4, párrafo 2.º)',
    motivo: 'La carrera del motor tiene una base por mes completo.',
  },
];
