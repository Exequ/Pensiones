/**
 * Efecto de cada lectura abierta del motor de muerte y supervivencia sobre un caso típico.
 * Uso: npx tsx scripts/lecturas-abiertas-supervivencia.ts   (tabla para docs/INFORME_VERIFICACION.md)
 */
import { calcularSupervivenciaConParametros } from '../src/engine/supervivencia/calculo.ts';
import { construirParametrosSupervivencia } from '../src/engine/supervivencia/parametros.ts';
import type {
  Beneficiarios,
  Causante,
  LecturasSupervivencia,
  ResultadoSupervivencia,
} from '../src/engine/supervivencia/tipos.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const params = construirParametrosSupervivencia(leerParametroDeDisco);
const f = (n: number, d = 2) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const c = (desde: string, hasta: string, baseMensual = 2000) => ({ desde, hasta, baseMensual });
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

function calc(
  k: Causante,
  b: Beneficiarios,
  lecturas: Partial<LecturasSupervivencia>,
): ResultadoSupervivencia {
  return calcularSupervivenciaConParametros(params, k, b, {
    aplicarMinimos: false,
    lecturasSupervivencia: lecturas,
  });
}

type Medida = (r: ResultadoSupervivencia) => number;
const filas: [string, string, string, string, number, number][] = [];
function fila(
  lectura: string,
  caso: string,
  alternativa: string,
  magnitud: string,
  k: Causante,
  b: Beneficiarios,
  alt: Partial<LecturasSupervivencia>,
  medida: Medida,
): void {
  filas.push([
    lectura,
    caso,
    alternativa,
    magnitud,
    medida(calc(k, b, {})),
    medida(calc(k, b, alt)),
  ]);
}
const viud: Medida = (r) => r.viudedad[0]?.pensionMensual ?? 0;
const fam: Medida = (r) => r.favorFamiliares[0]?.pensionMensual ?? 0;

fila(
  '(a) ventana de la base reguladora',
  'base de 2.000 € con subida a 2.600 € en los dos últimos meses',
  'Decreto 1646/1972 (incluye el mes previo)',
  'viudedad €/mes',
  { ...ALTA, carrera: [c('2010-01', '2025-12'), c('2026-01', '2026-02', 2600)] },
  { viudos: [CONYUGE] },
  { ventanaBaseReguladora: 'decreto-1646-1972' },
  viud,
);
fila(
  '(b) días cotizados para los 500 días',
  '17 meses cotizados (octubre 2024 a febrero 2026)',
  'treinta por mes',
  'días acreditados',
  { ...ALTA, carrera: [c('2024-10', '2026-02')] },
  { viudos: [CONYUGE] },
  { diasCotizados: 'treinta-por-mes' },
  (r) => r.requisitosCausante.find((q) => q.id === 'carencia-alta')?.valor ?? 0,
);
fila(
  '(c) periodo previo de la orfandad',
  '12 meses cotizados, en alta',
  'RD 1647/1997 (500 días)',
  'orfandad €/mes',
  { ...ALTA, carrera: [c('2025-02', '2026-01')] },
  { huerfanos: [{ nacimiento: '2016-01-01' }] },
  { carenciaOrfandad: 'rd-1647-1997' },
  (r) => r.orfandad[0]?.pensionMensual ?? 0,
);
fila(
  '(d) familiares y accidente no laboral',
  'nieto; 13 meses cotizados',
  'exento',
  'favor de familiares €/mes',
  { ...ALTA, causa: 'accidente-no-laboral', carrera: [c('2025-02', '2026-02')] },
  {
    familiares: [
      {
        parentesco: 'nieto',
        nacimiento: '2016-01-01',
        convivenciaMeses: 36,
        huerfanoDePadreYMadre: true,
      },
    ],
  },
  { carenciaFamiliaresAccidenteNoLaboral: 'exenta' },
  fam,
);
fila(
  '(e) comparación con la compensatoria',
  'excónyuge con compensatoria de 6.000 €/año',
  'mensual (entre 12)',
  'viudedad €/mes',
  ALTA,
  { viudos: [{ vinculo: 'excónyuge', nacimiento: '1976-01-01', pensionCompensatoriaAnual: 6000 }] },
  { comparacionCompensatoria: 'mensual' },
  viud,
);
fila(
  '(f) reducción del 70 %',
  'cargas familiares y 9.000 € de rentas propias',
  'sin suelo del 52 %',
  'viudedad €/mes',
  ALTA,
  {
    viudos: [
      {
        ...CONYUGE,
        nacimiento: '1981-01-01',
        rendimientosAnuales: 9000,
        cargasFamiliares: { miembrosUnidadFamiliar: 3, rendimientosUnidadFamiliar: 12000 },
      },
    ],
  },
  { reduccionViudedad70: 'sin-suelo' },
  viud,
);
fila(
  '(g) incremento de familiares sin viudo',
  'nieto, sin viudo ni huérfanos',
  'sin incremento',
  'favor de familiares €/mes',
  ALTA,
  {
    familiares: [
      {
        parentesco: 'nieto',
        nacimiento: '2016-01-01',
        convivenciaMeses: 36,
        huerfanoDePadreYMadre: true,
      },
    ],
  },
  { incrementoFamiliares: 'sin-incremento' },
  fam,
);
fila(
  '(h) reducción por el límite conjunto',
  'viudedad 52 % y cuatro huérfanos',
  'proporcional',
  'viudedad €/mes',
  ALTA,
  { viudos: [CONYUGE], huerfanos: [1, 2, 3, 4].map((k) => ({ nacimiento: `201${k}-01-01` })) },
  { reduccionLimiteConjunto: 'proporcional' },
  viud,
);

console.log('| Lectura | Caso | Alternativa | Magnitud | Por defecto | Alternativa | Variación |');
console.log('| ------- | ---- | ----------- | -------- | ----------: | ----------: | --------: |');
for (const [l, k, a, m, d, v] of filas) {
  const var_ = d === 0 ? (v === 0 ? '0,00 %' : 'de 0 a ' + f(v)) : `${f(((v - d) / d) * 100)} %`;
  console.log(`| ${l} | ${k} | ${a} | ${m} | ${f(d)} | ${f(v)} | ${var_} |`);
}
