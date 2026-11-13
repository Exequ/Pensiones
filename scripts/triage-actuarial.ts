/**
 * Triage actuarial (Fase 2-C): mide el efecto de las lecturas abiertas del grupo A en tres casos
 * representativos y comprueba por código las lecturas que se pueden cerrar con evidencia.
 * Genera `docs/triage-actuarial.json` (lo lee `scripts/triage-actuarial-md.ts`).
 * Uso: npx tsx scripts/triage-actuarial.ts
 */
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { calcularIncapacidadPermanenteConParametros } from '../src/engine/incapacidad/calculo.ts';
import { construirParametrosIncapacidad } from '../src/engine/incapacidad/parametros.ts';
import type {
  Carrera,
  LecturasIncapacidad,
  OpcionesIncapacidad,
} from '../src/engine/incapacidad/tipos.ts';
import { calcularJubilacionConParametros } from '../src/engine/jubilacion/calculo.ts';
import type { LecturasAbiertas, PeriodoCarrera } from '../src/engine/jubilacion/tipos.ts';
import { cotizacionAdicionalMensual } from '../src/engine/mei/calculo.ts';
import { construirParametrosMEI } from '../src/engine/mei/parametros.ts';
import type { LecturasMEI } from '../src/engine/mei/tipos.ts';
import {
  calcularPNCInvalidezConParametros,
  calcularPNCJubilacionConParametros,
} from '../src/engine/no-contributivas/calculo.ts';
import { construirParametrosPNC } from '../src/engine/no-contributivas/parametros.ts';
import type {
  LecturasPNC,
  OpcionesPNC,
  SolicitantePNC,
} from '../src/engine/no-contributivas/tipos.ts';
import { calcularSupervivenciaConParametros } from '../src/engine/supervivencia/calculo.ts';
import { construirParametrosSupervivencia } from '../src/engine/supervivencia/parametros.ts';
import type {
  Beneficiarios,
  Causante,
  LecturasSupervivencia,
  ResultadoSupervivencia,
} from '../src/engine/supervivencia/tipos.ts';
import { RAIZ, leerParametroDeDisco, parametrosDesdeDisco } from './lib/motor-jubilacion.ts';

export interface Caso {
  readonly descripcion: string;
  readonly magnitud: string;
  readonly defecto: number;
  readonly alternativa: number;
}
export interface Medida {
  readonly id: string;
  readonly alternativa: string;
  readonly casos: readonly Caso[];
}
export interface Evidencia {
  readonly id: string;
  readonly texto: string;
}

const pj = parametrosDesdeDisco();
const pi = construirParametrosIncapacidad(leerParametroDeDisco);
const ps = construirParametrosSupervivencia(leerParametroDeDisco);
const pp = construirParametrosPNC(leerParametroDeDisco);
const pm = construirParametrosMEI(leerParametroDeDisco);
const c = (desde: string, hasta: string, baseMensual = 2000) => ({ desde, hasta, baseMensual });

// ---------------------------------------------------------------------------------------------
// Jubilación
// ---------------------------------------------------------------------------------------------
function jub(
  carrera: PeriodoCarrera[],
  nacimiento: string,
  fecha: string,
  lecturas: Partial<LecturasAbiertas>,
): number {
  return calcularJubilacionConParametros(pj, carrera, nacimiento, fecha, 'ordinaria', {
    escenario: { ipc: 0.02 },
    usarOpcion25Anos: false,
    calcularAunqueNoCumpla: true,
    aplicarMinimos: false,
    lecturas,
  }).pensionMensual;
}

function casosJubilacion(
  desc: string[],
  fechas: [PeriodoCarrera[], string, string][],
  alt: Partial<LecturasAbiertas>,
): Caso[] {
  return fechas.map(([carrera, nac, fecha], k) => ({
    descripcion: desc[k] ?? '',
    magnitud: 'pensión de jubilación €/mes por paga (sin complementos a mínimos)',
    defecto: jub(carrera, nac, fecha, {}),
    alternativa: jub(carrera, nac, fecha, alt),
  }));
}

// ---------------------------------------------------------------------------------------------
// Incapacidad
// ---------------------------------------------------------------------------------------------
function inc(carrera: Carrera, desde: string, lecturas: Partial<LecturasIncapacidad>): number {
  const extra: OpcionesIncapacidad = { periodoElegidoDesde: desde };
  return calcularIncapacidadPermanenteConParametros(
    pi,
    carrera,
    '1981-03-10',
    '2026-06-15',
    'total',
    'accidente-no-laboral',
    {
      escenario: { ipc: 0.02 },
      huecoBaseMinima: 'anterior',
      aplicarMinimos: false,
      calcularAunqueNoCumpla: true,
      lecturasIncapacidad: lecturas,
      ...extra,
    },
  ).pensionMensual;
}

// ---------------------------------------------------------------------------------------------
// Supervivencia
// ---------------------------------------------------------------------------------------------
const ALTA: Causante = {
  fechaFallecimiento: '2026-03-15',
  causa: 'enfermedad-comun',
  situacion: 'alta',
  carrera: [c('2010-01', '2026-02')],
};
const CONYUGE = {
  vinculo: 'conyuge',
  nacimiento: '1976-05-01',
  fechaMatrimonio: '2005-06-01',
} as const;
function sup(
  k: Causante,
  b: Beneficiarios,
  l: Partial<LecturasSupervivencia>,
  medida: (r: ResultadoSupervivencia) => number,
): number {
  return medida(
    calcularSupervivenciaConParametros(ps, k, b, {
      aplicarMinimos: false,
      lecturasSupervivencia: l,
    }),
  );
}
const viud = (r: ResultadoSupervivencia) => r.viudedad[0]?.pensionMensual ?? 0;
const fam = (r: ResultadoSupervivencia) => r.favorFamiliares[0]?.pensionMensual ?? 0;
const orf = (r: ResultadoSupervivencia) => r.orfandad[0]?.pensionMensual ?? 0;
const nieto = {
  parentesco: 'nieto',
  nacimiento: '2016-01-01',
  convivenciaMeses: 36,
  huerfanoDePadreYMadre: true,
} as const;

function casosSup(
  etiquetas: string[],
  magnitud: string,
  datos: [Causante, Beneficiarios][],
  alt: Partial<LecturasSupervivencia>,
  medida: (r: ResultadoSupervivencia) => number,
): Caso[] {
  return datos.map(([k, b], i) => ({
    descripcion: etiquetas[i] ?? '',
    magnitud,
    defecto: sup(k, b, {}, medida),
    alternativa: sup(k, b, alt, medida),
  }));
}

// ---------------------------------------------------------------------------------------------
// PNC y MEI
// ---------------------------------------------------------------------------------------------
const INC: SolicitantePNC = {
  nacimiento: '1980-05-05',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 120,
  residenciaRecienteMeses: 60,
  gradoDiscapacidad: 70,
  rentasAnuales: 0,
};
function pnc(s: SolicitantePNC, o: OpcionesPNC, l: Partial<LecturasPNC>): number {
  const r = calcularPNCInvalidezConParametros(pp, s, { ...o, lecturasPNC: l });
  return r.cumpleRequisitos ? r.pensionAnual : 0;
}
void calcularPNCJubilacionConParametros;

// ---------------------------------------------------------------------------------------------
export function medir(): { medidas: Medida[]; evidencias: Evidencia[] } {
  const medidas: Medida[] = [];

  // Jubilación: lagunas anteriores a la primera alta
  const corta = (anios: number): PeriodoCarrera[] => [
    { desde: `${2030 - anios}-01`, hasta: '2029-12', baseMensual: 2500 },
  ];
  medidas.push({
    id: 'jubilacion.lagunasAnterioresAlPrimerAlta',
    alternativa: 'ignorar',
    casos: casosJubilacion(
      [
        '15 años cotizados (2015-2029), base 2.500 €, 2030',
        '18 años cotizados, base 2.500 €, 2030',
        '22 años cotizados, base 2.500 €, 2030',
      ],
      [
        [corta(15), '1965-01-01', '2030-01-01'],
        [corta(18), '1965-01-01', '2030-01-01'],
        [corta(22), '1965-01-01', '2030-01-01'],
      ],
      { lagunasAnterioresAlPrimerAlta: 'ignorar' },
    ),
  });

  // Jubilación: pensión máxima desde 2051
  const topado = (hasta: number): PeriodoCarrera[] => [
    { desde: '2020-01', hasta: `${hasta - 1}-12`, baseMensual: 40000 },
  ];
  medidas.push({
    id: 'jubilacion.maximaDesde2051',
    alternativa: 'incremento-anual-literal',
    casos: casosJubilacion(
      ['topado por la pensión máxima, jubilación en 2052', 'topado, 2055', 'topado, 2060'],
      [
        [topado(2052), '1990-01-01', '2052-01-01'],
        [topado(2055), '1990-01-01', '2055-01-01'],
        [topado(2060), '1990-01-01', '2060-01-01'],
      ],
      { maximaDesde2051: 'incremento-anual-literal' },
    ),
  });

  // Incapacidad: lagunas en el accidente no laboral
  const conLaguna = (finPrimero: string, inicioSegundo: string): Carrera => [
    { desde: '2010-01', hasta: finPrimero, baseMensual: 1500 },
    { desde: inicioSegundo, hasta: '2026-05', baseMensual: 1500 },
  ];
  medidas.push({
    id: 'incapacidad.lagunasAccidenteNoLaboral',
    alternativa: 'integrar',
    casos: [
      ['6 meses sin cotizar dentro de los 24 elegidos', conLaguna('2024-12', '2025-07')],
      ['3 meses sin cotizar dentro de los 24 elegidos', conLaguna('2025-03', '2025-07')],
      ['12 meses sin cotizar dentro de los 24 elegidos', conLaguna('2024-12', '2026-01')],
    ].map(([d, car]) => ({
      descripcion: `accidente no laboral, incapacidad total, base 1.500 €, ${d as string}, 2026`,
      magnitud: 'pensión de incapacidad total €/mes (sin complementos a mínimos)',
      defecto: inc(car as Carrera, '2024-06', {}),
      alternativa: inc(car as Carrera, '2024-06', { lagunasAccidenteNoLaboral: 'integrar' }),
    })),
  });

  // Supervivencia
  medidas.push({
    id: 'supervivencia.carenciaOrfandad',
    alternativa: 'rd-1647-1997',
    casos: casosSup(
      [
        '6 meses cotizados (2025-09 a 2026-02), un huérfano',
        '12 meses cotizados, un huérfano',
        '15 meses cotizados, un huérfano',
      ],
      'orfandad €/mes',
      [
        [
          { ...ALTA, carrera: [c('2025-09', '2026-02')] },
          { huerfanos: [{ nacimiento: '2016-01-01' }] },
        ],
        [
          { ...ALTA, carrera: [c('2025-02', '2026-01')] },
          { huerfanos: [{ nacimiento: '2016-01-01' }] },
        ],
        [
          { ...ALTA, carrera: [c('2024-12', '2026-02')] },
          { huerfanos: [{ nacimiento: '2016-01-01' }] },
        ],
      ],
      { carenciaOrfandad: 'rd-1647-1997' },
      orf,
    ),
  });
  const ANL: Causante = { ...ALTA, causa: 'accidente-no-laboral' };
  medidas.push({
    id: 'supervivencia.carenciaFamiliaresAccidenteNoLaboral',
    alternativa: 'exenta',
    casos: casosSup(
      [
        'nieto huérfano, 13 meses cotizados',
        'nieto huérfano, 8 meses cotizados',
        'nieto huérfano, 15 meses cotizados',
      ],
      'favor de familiares €/mes',
      [
        [{ ...ANL, carrera: [c('2025-02', '2026-02')] }, { familiares: [nieto] }],
        [{ ...ANL, carrera: [c('2025-07', '2026-02')] }, { familiares: [nieto] }],
        [{ ...ANL, carrera: [c('2024-12', '2026-02')] }, { familiares: [nieto] }],
      ],
      { carenciaFamiliaresAccidenteNoLaboral: 'exenta' },
      fam,
    ),
  });
  const cargas = (rend: number, unidad: number) =>
    ({
      viudos: [
        {
          ...CONYUGE,
          nacimiento: '1981-01-01',
          rendimientosAnuales: rend,
          cargasFamiliares: { miembrosUnidadFamiliar: 3, rendimientosUnidadFamiliar: unidad },
        },
      ],
    }) satisfies Beneficiarios;
  medidas.push({
    id: 'supervivencia.reduccionViudedad70',
    alternativa: 'sin-suelo',
    casos: casosSup(
      [
        'cargas familiares, rentas propias 9.000 €, unidad 12.000 €',
        'rentas propias 7.000 €, unidad 12.000 €',
        'rentas propias 10.000 €, unidad 14.000 €',
      ],
      'viudedad €/mes',
      [
        [ALTA, cargas(9000, 12000)],
        [ALTA, cargas(7000, 12000)],
        [ALTA, cargas(10000, 14000)],
      ],
      { reduccionViudedad70: 'sin-suelo' },
      viud,
    ),
  });
  const exc = (comp: number): Beneficiarios => ({
    viudos: [{ vinculo: 'excónyuge', nacimiento: '1976-01-01', pensionCompensatoriaAnual: comp }],
  });
  medidas.push({
    id: 'supervivencia.comparacionCompensatoria',
    alternativa: 'mensual',
    casos: casosSup(
      [
        'excónyuge con compensatoria de 6.000 €/año',
        'compensatoria de 4.500 €/año',
        'compensatoria de 9.000 €/año',
      ],
      'viudedad €/mes',
      [
        [ALTA, exc(6000)],
        [ALTA, exc(4500)],
        [ALTA, exc(9000)],
      ],
      { comparacionCompensatoria: 'mensual' },
      viud,
    ),
  });
  medidas.push({
    id: 'supervivencia.incrementoFamiliares',
    alternativa: 'sin-incremento',
    casos: casosSup(
      [
        'un nieto huérfano, sin viudo ni huérfanos',
        'dos nietos huérfanos, sin viudo ni huérfanos',
        'un hermano huérfano, sin viudo ni huérfanos',
      ],
      'favor de familiares €/mes (primer beneficiario)',
      [
        [ALTA, { familiares: [nieto] }],
        [ALTA, { familiares: [nieto, { ...nieto, nacimiento: '2018-01-01' }] }],
        [ALTA, { familiares: [{ ...nieto, parentesco: 'hermano' }] }],
      ],
      { incrementoFamiliares: 'sin-incremento' },
      fam,
    ),
  });
  const huerf = (n: number) =>
    Array.from({ length: n }, (_, k) => ({ nacimiento: `201${k + 1}-01-01` }));
  medidas.push({
    id: 'supervivencia.reduccionLimiteConjunto',
    alternativa: 'proporcional',
    casos: casosSup(
      [
        'viudedad del 52 % y tres huérfanos',
        'viudedad del 52 % y cuatro huérfanos',
        'viudedad del 52 % y cinco huérfanos',
      ],
      'viudedad €/mes',
      [3, 4, 5].map((n): [Causante, Beneficiarios] => [
        ALTA,
        { viudos: [CONYUGE], huerfanos: huerf(n) },
      ]),
      { reduccionLimiteConjunto: 'proporcional' },
      viud,
    ),
  });

  // PNC
  const trabajo = (ingresos: number) => ({
    trabajo: { ingresosActividadAnuales: ingresos, mesesDesdeInicio: 12 },
  });
  medidas.push({
    id: 'no-contributivas.rentasConTrabajoEnCuatroAnios',
    alternativa: 'se-suman',
    casos: [
      [
        'rentas de 10.000 € (todas de la actividad), 2023',
        { ...INC, fechaSolicitud: '2023-03-10', rentasAnuales: 10000 },
        trabajo(10000),
      ],
      [
        'rentas de 3.000 €, actividad de 6.000 €, 2026',
        { ...INC, rentasAnuales: 3000 },
        trabajo(6000),
      ],
      [
        'rentas de 8.000 € (todas de la actividad), 2025',
        { ...INC, fechaSolicitud: '2025-03-10', rentasAnuales: 8000 },
        trabajo(8000),
      ],
    ].map(([d, s, o]) => ({
      descripcion: `PNC de incapacidad, grado 70 %, ${d as string}`,
      magnitud: 'pensión €/año',
      defecto: pnc(s as SolicitantePNC, o as OpcionesPNC, {}),
      alternativa: pnc(s as SolicitantePNC, o as OpcionesPNC, {
        rentasConTrabajoEnCuatroAnios: 'se-suman',
      }),
    })),
  });

  // MEI
  const mei = (retribucion: number, l: Partial<LecturasMEI>) =>
    cotizacionAdicionalMensual(pm, 2026, retribucion, { lecturasMEI: l }).mei.cuotaTotal;
  medidas.push({
    id: 'mei.baseMEI',
    alternativa: 'retribucion-completa',
    casos: [6000, 8000, 12000].map((r) => ({
      descripcion: `retribución de ${r.toLocaleString('es-ES')} €/mes, 2026`,
      magnitud: 'cuota total del MEI €/mes',
      defecto: mei(r, {}),
      alternativa: mei(r, { baseMEI: 'retribucion-completa' }),
    })),
  });

  // DT 41.ª: integración reforzada de lagunas (opción del motor, no es una lectura registrada)
  const reforzada = (finCarrera: string, activa: boolean): number =>
    calcularJubilacionConParametros(
      pj,
      [{ desde: '2000-01', hasta: finCarrera, baseMensual: 2500 }],
      '1960-01-15',
      '2026-03-01',
      'ordinaria',
      {
        escenario: { ipc: 0.02 },
        usarOpcion25Anos: false,
        calcularAunqueNoCumpla: true,
        aplicarMinimos: false,
        sexo: 'mujer',
        huecoBaseMinima: 'anterior',
        integracionReforzadaLagunas: activa,
      },
    ).pensionMensual;
  medidas.push({
    id: 'jubilacion.integracionReforzadaLagunas (opción, DT 41.ª)',
    alternativa: 'apagada (sin la integración reforzada)',
    casos: [
      ['60 meses de laguna (carrera hasta 2020-12)', '2020-12'],
      ['72 meses de laguna (carrera hasta 2019-12)', '2019-12'],
      ['84 meses de laguna (carrera hasta 2018-12)', '2018-12'],
    ].map(([d, fin]) => ({
      descripcion: `mujer, jubilación ordinaria en 2026, base 2.500 €, ${d as string}`,
      magnitud: 'pensión de jubilación €/mes por paga (sin complementos a mínimos)',
      defecto: reforzada(fin as string, true),
      alternativa: reforzada(fin as string, false),
    })),
  });

  // Coeficientes reductores: cotas a partir de los cuadros (un mes de diferencia; un tramo de diferencia)
  const leer = (fichero: string): Map<string, number> =>
    new Map(
      (
        JSON.parse(readFileSync(path.join(RAIZ, 'data/parametros', `${fichero}.json`), 'utf8')) as {
          data: { id: string; value: number }[];
        }
      ).data.map((x) => [x.id, x.value]),
    );
  for (const [id, fichero, mes] of [
    [
      'jubilacion.coeficientesInvoluntaria (art. 207.2: lecturas 1 a 3 de la pregunta)',
      'jubilacion-coeficientes-involuntaria',
      24,
    ],
    [
      'jubilacion.coeficientesVoluntaria (art. 208.2: lecturas 1 a 3 de la pregunta)',
      'jubilacion-coeficientes-voluntaria',
      12,
    ],
  ] as const) {
    const tabla = leer(fichero);
    const pension = 1500; // pensión sin reducir, €/mes por paga
    const con = (t: number, m: number): number =>
      pension * (1 - (tabla.get(`t${t}-${m}`) ?? NaN) / 100);
    medidas.push({
      id,
      alternativa: 'otra lectura de la anticipación o del tramo',
      casos: [
        {
          descripcion: `un mes más de anticipación (redondeo hacia arriba), ${mes} frente a ${mes - 1} meses, tramo 2`,
          magnitud: 'pensión reducida €/mes por paga (pensión sin reducir de 1.500 €)',
          defecto: con(2, mes),
          alternativa: con(2, mes - 1),
        },
        {
          descripcion: `tramo 2 frente a tramo 3 (otra carrera para elegir el tramo), ${mes} meses`,
          magnitud: 'pensión reducida €/mes por paga (pensión sin reducir de 1.500 €)',
          defecto: con(2, mes),
          alternativa: con(3, mes),
        },
        {
          descripcion: `tramo 1 frente a tramo 4, ${mes} meses`,
          magnitud: 'pensión reducida €/mes por paga (pensión sin reducir de 1.500 €)',
          defecto: con(1, mes),
          alternativa: con(4, mes),
        },
      ],
    });
  }

  // ------------------------------------------------------------------------------------------
  // Evidencias para las lecturas que se pueden cerrar
  // ------------------------------------------------------------------------------------------
  const evidencias: Evidencia[] = [];
  const dato = (fichero: string, id: string): number =>
    Number(
      (
        (
          JSON.parse(
            readFileSync(path.join(RAIZ, 'data/parametros', `${fichero}.json`), 'utf8'),
          ) as { data: { id: string; value: number }[] }
        ).data.find((x) => x.id === id) ?? { value: NaN }
      ).value,
    );
  const bm = (a: number) => dato('base-maxima-rg', String(a));
  const rv = (a: number) => dato('revalorizacion-general', String(a));
  const pmx = (a: number) => dato('pension-maxima', String(a));
  const f2 = (n: number) =>
    n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  // Base máxima: compuesto frente a sobre-cifra-inicial, con la cifra de 2023 como inicial (años 2025 y 2026)
  const filasBM: string[] = [];
  for (const a of [2025, 2026]) {
    const compuesto = bm(a - 1) * (1 + (rv(a) + 1.2) / 100);
    const alt = bm(a - 1) * (1 + rv(a) / 100) + (bm(2023) * 1.2) / 100;
    filasBM.push(
      `${a}: oficial ${f2(bm(a))}; compuesto ${f2(compuesto)} (diferencia ${f2(Math.abs(compuesto - bm(a)))}); sobre la cifra de 2023 ${f2(alt)} (diferencia ${f2(Math.abs(alt - bm(a)))})`,
    );
  }
  evidencias.push({ id: 'jubilacion.baseMaxima', texto: filasBM.join('. ') });
  const filasPM: string[] = [];
  for (const a of [2025, 2026]) {
    const compuesto = pmx(a - 1) * (1 + (rv(a) + 0.115) / 100);
    const k = a - 2024;
    const creciente = pmx(a - 1) * (1 + (rv(a) + 0.115 * k) / 100);
    filasPM.push(
      `${a}: oficial ${f2(pmx(a))}; incremento constante ${f2(compuesto)} (diferencia ${f2(Math.abs(compuesto - pmx(a)))}); incremento creciente ${f2(creciente)} (diferencia ${f2(Math.abs(creciente - pmx(a)))})`,
    );
  }
  evidencias.push({ id: 'jubilacion.pensionMaxima', texto: filasPM.join('. ') });
  // edadFiccion: rejilla de hechos causantes
  let distintos = 0;
  let total = 0;
  for (let anio = 2022; anio <= 2050; anio += 2) {
    for (const edad of [40, 45, 50, 55, 58, 60, 62, 64, 66]) {
      for (const anios of [10, 15, 20, 30, 38]) {
        const nac = `${anio - edad}-01-20`;
        const hc = `${anio}-06-15`;
        const carrera: Carrera = [
          { desde: `${anio - anios}-01`, hasta: `${anio}-05`, baseMensual: 2000 },
        ];
        const f = (l: Partial<LecturasIncapacidad>) => {
          try {
            return calcularIncapacidadPermanenteConParametros(
              pi,
              carrera,
              nac,
              hc,
              'absoluta',
              'enfermedad-comun',
              {
                escenario: { ipc: 0.02 },
                huecoBaseMinima: 'anterior',
                aplicarMinimos: false,
                calcularAunqueNoCumpla: true,
                lecturasIncapacidad: l,
              },
            ).pensionMensual;
          } catch {
            return NaN;
          }
        };
        const a = f({});
        const b = f({ edadFiccion: 'edad-general' });
        if (Number.isNaN(a) && Number.isNaN(b)) continue;
        total++;
        if (a !== b) distintos++;
      }
    }
  }
  evidencias.push({
    id: 'incapacidad.edadFiccion',
    texto: `${total} combinaciones (hecho causante de 2022 a 2050 cada dos años, edades de 40 a 66, carreras de 10 a 38 años, incapacidad absoluta por enfermedad común): las dos lecturas dan un resultado distinto en ${distintos}`,
  });
  return { medidas, evidencias };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const r = medir();
  writeFileSync(path.join(RAIZ, 'docs/triage-actuarial.json'), JSON.stringify(r, null, 1) + '\n');
  for (const m of r.medidas) {
    console.log(m.id);
    for (const k of m.casos)
      console.log(
        `   ${k.descripcion}: ${k.defecto.toFixed(2)} → ${k.alternativa.toFixed(2)} (${(((k.alternativa - k.defecto) / k.defecto) * 100).toFixed(2)} %)`,
      );
  }
  for (const e of r.evidencias) console.log(e.id, '·', e.texto);
}
void parametrosDesdeDisco;
