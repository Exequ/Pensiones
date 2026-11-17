/** Reglas de muerte y supervivencia que el motor no calcula (se muestran en docs/MOTOR_SUPERVIVENCIA.md). */
export const LIMITACIONES_SUPERVIVENCIA: readonly {
  readonly regla: string;
  readonly motivo: string;
}[] = [
  {
    regla: 'Hechos causantes anteriores a 2022',
    motivo:
      'Las citas de la web se han comprobado en las redacciones vigentes desde 2022 (lanza NoImplementada).',
  },
  {
    regla:
      'Base reguladora de las contingencias profesionales (accidente de trabajo y enfermedad profesional)',
    motivo:
      'Salario real del capítulo V (arts. 58 a 63) del Reglamento de accidentes del trabajo de 1956 (Decreto de 22/06/1956, BOE núm. 197, de 15/07/1956). Su texto consta por OCR, con confianza media, pero no se ha convertido en datos del motor: lanza NoImplementada salvo base calculada fuera (causante.baseReguladoraProfesional).',
  },
  {
    regla:
      'Indemnizaciones a tanto alzado por accidente de trabajo o enfermedad profesional (art. 227) y auxilio por defunción (art. 218)',
    motivo:
      'No son pensiones; dependen de la base profesional o de una cuantía no incorporada a los datos de la web.',
  },
  {
    regla:
      'Separaciones y divorcios anteriores al 01/01/2008 (DT 13.ª) y nulidad matrimonial (art. 220.3)',
    motivo:
      'Reglas transitorias no incorporadas a los datos de la web (lanza NoImplementada o no se modela el vínculo).',
  },
  {
    regla:
      'Prestación y pensión de orfandad por violencia contra la mujer (arts. 224.1, 228 y 233.3) y supuestos del art. 231 a 234',
    motivo: 'Régimen especial (doble del SMI, 70 % y 118 %) no estructurado en esta fase.',
  },
  {
    regla: 'Subsidio temporal en favor de familiares (arts. 25 a 27 de la Orden de 1967)',
    motivo: 'No se ha estructurado (doce mensualidades para hijos y hermanos mayores de 22 años).',
  },
  {
    regla:
      'Pensiones concurrentes entre causantes (orfandad de padre y madre, varias viudedades), regímenes especiales, RETA y pluriactividad',
    motivo: 'El motor calcula las prestaciones de un causante del Régimen General.',
  },
  {
    regla:
      'Hechos posteriores al reconocimiento: extinción, suspensión por trabajo, nuevo matrimonio, recálculo del límite al extinguirse una pensión (art. 18.2 Orden de 1967), cambio de clase de la mínima y fallecimiento del viudo (art. 38.1.3.º)',
    motivo: 'La revalorización proyecta las cuantías iniciales.',
  },
  {
    regla:
      'Incremento de la orfandad de mayores de 18 incapacitados con la asignación por hijo a cargo (art. 36.Uno, párr. 2.º, Decreto 3158/1966) y tope del complemento a mínimos de la orfandad incrementada (art. 59)',
    motivo: 'La asignación por hijo a cargo no consta en los datos de la web.',
  },
  {
    regla: 'Límite de ingresos de los mínimos con cónyuge a cargo y SMI anual posterior a 2026',
    motivo:
      'No constan en los datos de la web: el SMI posterior a 2026 lanza DatoNoDisponible cuando lo exige un requisito de ingresos.',
  },
];
