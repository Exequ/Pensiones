/**
 * Casos de oro «independientes» del motor de pensiones no contributivas: cada cifra esperada es la
 * que publica el IMSERSO en su «Guía resumen de aplicación de las pensiones no contributivas de la
 * Seguridad Social» del año (documento oficial, descargado en la sesión de la Fase 2-B-3 y guardado
 * en data-raw/imserso/ con su huella). El motor no se ha ajustado para coincidir: los datos de
 * entrada son escenarios sencillos que producen la situación que la guía ilustra.
 */
import { describe, expect, it } from 'vitest';
import { calcularPNCInvalidez } from './repositorio.ts';
import type { OpcionesPNC, SolicitantePNC } from './tipos.ts';

const URL_GUIA: Record<number, string> = {
  2022: 'https://imserso.es/documents/20123/98526/pncresumen2022.pdf/5ca7393f-30e3-4c31-dcaa-90ee082dea6a',
  2023: 'https://imserso.es/documents/20123/1595507/pncresumen2023.pdf/0d138a8e-b367-38b9-7826-11238afb437f',
  2024: 'https://imserso.es/documents/20123/1595507/pncresumen2024.pdf/62e24a0f-cede-5580-326e-2baebbf2ad3c',
  2025: 'https://blogceadac.imserso.es/documents/d/global/pncresumen2025',
  2026: 'https://imserso.es/documents/20123/1595507/pncresumen2026.pdf/c4b41c80-63fe-942d-7231-f3ee20e28694',
};

const base = (anio: number): SolicitantePNC => ({
  nacimiento: '1980-05-05',
  fechaSolicitud: `${anio - 1}-12-10`,
  residenciaLegalMeses: 120,
  residenciaRecienteMeses: 60,
  gradoDiscapacidad: 70,
  rentasAnuales: 0,
});

interface Caso {
  readonly id: string;
  readonly anio: number;
  readonly guia: string;
  readonly solicitante: SolicitantePNC;
  readonly opciones?: OpcionesPNC;
  /** Cifras de la guía: pensión anual y, si la publica, mensual. */
  readonly anual: number;
  readonly mensual?: number;
  /** Derecho: por defecto sí. */
  readonly derecho?: boolean;
}

const g = (anio: number) => `Guía resumen del IMSERSO ${anio}: ${URL_GUIA[anio]}`;
const unidad = (n: number): OpcionesPNC => ({
  unidadEconomica: { convivientes: n, beneficiarios: n, rentasUnidadAnuales: 0 },
});

const CASOS: readonly Caso[] = [
  // Cuantía íntegra de cada año (la de 2023 incluye el incremento extraordinario del RDL 20/2022).
  {
    id: 'integra-2022',
    anio: 2022,
    guia: g(2022),
    solicitante: base(2022),
    anual: 5899.6,
    mensual: 421.4,
  },
  {
    id: 'integra-2023',
    anio: 2023,
    guia: g(2023),
    solicitante: base(2023),
    anual: 6784.54,
    mensual: 484.61,
  },
  {
    id: 'integra-2024',
    anio: 2024,
    guia: g(2024),
    solicitante: base(2024),
    anual: 7250.6,
    mensual: 517.9,
  },
  {
    id: 'integra-2025',
    anio: 2025,
    guia: g(2025),
    solicitante: base(2025),
    anual: 7905.8,
    mensual: 564.7,
  },
  {
    id: 'integra-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    anual: 8803.2,
    mensual: 628.8,
  },
  // Complemento de tercera persona (íntegra incrementada).
  {
    id: 'tercera-persona-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: { ...base(2026), gradoDiscapacidad: 75, necesitaTerceraPersona: true },
    anual: 13204.8,
    mensual: 943.2,
  },
  // Cuantía individual con varios beneficiarios en la misma unidad económica (tabla de la guía de 2026).
  {
    id: 'dos-beneficiarios-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: unidad(2),
    anual: 7482.72,
    mensual: 534.48,
  },
  {
    id: 'tres-beneficiarios-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: unidad(3),
    anual: 7042.56,
    mensual: 503.04,
  },
  {
    id: 'cuatro-beneficiarios-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: unidad(4),
    anual: 6822.48,
    mensual: 487.32,
  },
  {
    id: 'cinco-beneficiarios-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: unidad(5),
    anual: 6690.43,
    mensual: 477.89,
  },
  // Mínimo del 25 % (2.200,80 euros; 157,20 al mes): tres convivientes, un beneficiario, rentas de la unidad casi en el límite de 21.127,68.
  {
    id: 'minimo-25-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: { unidadEconomica: { convivientes: 3, rentasUnidadAnuales: 21000 } },
    anual: 2200.8,
    mensual: 157.2,
  },
  // Compatibilidad con el trabajo: límite = IPREM + cuantía íntegra (la guía publica cada límite).
  {
    id: 'trabajo-limite-2022',
    anio: 2022,
    guia: g(2022),
    solicitante: { ...base(2022), rentasAnuales: 10000 },
    opciones: { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 6 } },
    anual: 12847.84 - 10000,
  },
  {
    id: 'trabajo-limite-2023',
    anio: 2023,
    guia: g(2023),
    solicitante: { ...base(2023), rentasAnuales: 10000 },
    opciones: { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 6 } },
    anual: 13984.54 - 10000,
  },
  {
    id: 'trabajo-limite-2024',
    anio: 2024,
    guia: g(2024),
    solicitante: { ...base(2024), rentasAnuales: 10000 },
    opciones: { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 6 } },
    anual: 14450.6 - 10000,
  },
  {
    id: 'trabajo-limite-2025',
    anio: 2025,
    guia: g(2025),
    solicitante: { ...base(2025), rentasAnuales: 10000 },
    opciones: { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 6 } },
    anual: 15105.8 - 10000,
  },
  {
    id: 'trabajo-limite-2026',
    anio: 2026,
    guia: g(2026),
    solicitante: { ...base(2026), rentasAnuales: 8000 },
    opciones: { trabajo: { ingresosActividadAnuales: 8000, mesesDesdeInicio: 6 } },
    anual: 16003.2 - 8000,
  },
  // Límite de acumulación de recursos (tablas de la guía de 2026): justo por debajo, hay derecho; en el límite, no.
  {
    id: 'limite-2-convivientes-por-debajo',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 14965.43 } },
    anual: 8803.2,
  },
  {
    id: 'limite-2-convivientes-en-el-limite',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 14965.44 } },
    anual: 0,
    derecho: false,
  },
  {
    id: 'limite-10-convivientes-en-el-limite',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: { unidadEconomica: { convivientes: 10, rentasUnidadAnuales: 64263.36 } },
    anual: 0,
    derecho: false,
  },
  {
    id: 'limite-2-convivientes-descendientes',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: {
      unidadEconomica: {
        convivientes: 2,
        convivenciaAscendientesDescendientes: true,
        rentasUnidadAnuales: 37413.6,
      },
    },
    anual: 0,
    derecho: false,
  },
  {
    id: 'limite-5-convivientes-descendientes',
    anio: 2026,
    guia: g(2026),
    solicitante: base(2026),
    opciones: {
      unidadEconomica: {
        convivientes: 5,
        convivenciaAscendientesDescendientes: true,
        rentasUnidadAnuales: 83630.4,
      },
    },
    anual: 0,
    derecho: false,
  },
  {
    id: 'limite-2-convivientes-tercera-persona',
    anio: 2026,
    guia: g(2026),
    solicitante: { ...base(2026), gradoDiscapacidad: 75, necesitaTerceraPersona: true },
    opciones: { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 22448.15 } },
    anual: 0,
    derecho: true,
  },
  {
    id: 'limite-2-convivientes-tercera-persona-en-el-limite',
    anio: 2026,
    guia: g(2026),
    solicitante: { ...base(2026), gradoDiscapacidad: 75, necesitaTerceraPersona: true },
    opciones: { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 22448.16 } },
    anual: 0,
    derecho: false,
  },
];

describe('Casos de oro independientes de pensiones no contributivas (guías del IMSERSO)', () => {
  it('hay casos independientes, todos con la URL de la guía', () => {
    expect(CASOS.length).toBeGreaterThanOrEqual(12);
    for (const k of CASOS) expect(k.guia).toMatch(/https:\/\//);
  });

  for (const k of CASOS) {
    it(`${k.id} (independiente)`, () => {
      const r = calcularPNCInvalidez(k.solicitante, k.opciones ?? {});
      expect(r.anioNormativa).toBe(k.anio);
      if (k.derecho === false) {
        expect(r.cumpleRequisitos).toBe(false);
        return;
      }
      expect(r.cumpleRequisitos).toBe(true);
      // Casos con complemento: la guía publica la íntegra incrementada (pensión + complemento).
      const total = r.pensionAnual + r.complementoTerceraPersonaAnual;
      if (k.id.startsWith('limite-')) {
        // El límite está en el borde: solo se comprueba el derecho (la cuantía depende de la reducción).
        expect(total).toBeGreaterThan(0);
        return;
      }
      expect(total).toBeCloseTo(k.anual, 2);
      if (k.mensual !== undefined) expect(r.pensionMensual).toBeCloseTo(k.mensual, 2);
    });
  }
});
