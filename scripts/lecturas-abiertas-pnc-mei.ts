/**
 * Efecto de cada lectura abierta de los motores de PNC y MEI sobre un caso típico.
 * Uso: npx tsx scripts/lecturas-abiertas-pnc-mei.ts   (tabla para docs/INFORME_VERIFICACION.md)
 */
import { calcularPNCInvalidezConParametros } from '../src/engine/no-contributivas/calculo.ts';
import { construirParametrosPNC } from '../src/engine/no-contributivas/parametros.ts';
import type {
  LecturasPNC,
  OpcionesPNC,
  SolicitantePNC,
} from '../src/engine/no-contributivas/tipos.ts';
import { cotizacionAdicionalMensual } from '../src/engine/mei/calculo.ts';
import { construirParametrosMEI } from '../src/engine/mei/parametros.ts';
import type { LecturasMEI } from '../src/engine/mei/tipos.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const pnc = construirParametrosPNC(leerParametroDeDisco);
const mei = construirParametrosMEI(leerParametroDeDisco);
const f = (n: number) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const INC: SolicitantePNC = {
  nacimiento: '1980-05-05',
  fechaSolicitud: '2026-03-10',
  residenciaLegalMeses: 120,
  residenciaRecienteMeses: 60,
  gradoDiscapacidad: 70,
  rentasAnuales: 0,
};

const filas: [string, string, string, string, number, number][] = [];
function filaPNC(
  lectura: string,
  caso: string,
  alt: string,
  s: SolicitantePNC,
  o: OpcionesPNC,
  cambio: Partial<LecturasPNC>,
): void {
  const a = calcularPNCInvalidezConParametros(pnc, s, o);
  const b = calcularPNCInvalidezConParametros(pnc, s, { ...o, lecturasPNC: cambio });
  filas.push([
    lectura,
    caso,
    alt,
    'pensión €/año',
    a.cumpleRequisitos ? a.pensionAnual : 0,
    b.cumpleRequisitos ? b.pensionAnual : 0,
  ]);
}

filaPNC(
  '(a) base del 35 % de las rentas',
  'dos beneficiarios, rentas propias de 4.000 €, 2026',
  'sobre la cuantía por beneficiario',
  { ...INC, rentasAnuales: 4000 },
  { unidadEconomica: { convivientes: 2, beneficiarios: 2, rentasUnidadAnuales: 8000 } },
  { baseRentasCompatibles: 'cuantia-por-beneficiario' },
);
filaPNC(
  '(b) límite del art. 366',
  'rentas ajenas de 14.000 €, 10.000 € de actividad, 2023',
  'pensión reconocida',
  { ...INC, fechaSolicitud: '2023-03-10', rentasAnuales: 14000 },
  { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 12 } },
  { limiteTrabajo: 'pension-reconocida' },
);
filaPNC(
  '(c) rentas del trabajo en los cuatro primeros años',
  '10.000 € de actividad, 2023',
  'se suman las dos reducciones',
  { ...INC, fechaSolicitud: '2023-03-10', rentasAnuales: 10000 },
  { trabajo: { ingresosActividadAnuales: 10000, mesesDesdeInicio: 12 } },
  { rentasConTrabajoEnCuatroAnios: 'se-suman' },
);
filaPNC(
  '(d) límite de acumulación con tercera persona',
  'dos convivientes, rentas de la unidad de 20.000 €, 2026',
  'sin complemento',
  { ...INC, gradoDiscapacidad: 80, necesitaTerceraPersona: true },
  { unidadEconomica: { convivientes: 2, rentasUnidadAnuales: 20000 } },
  { limiteConTerceraPersona: 'sin-complemento' },
);

const cotiz = (l: Partial<LecturasMEI>) =>
  cotizacionAdicionalMensual(mei, 2026, 6000, { lecturasMEI: l }).mei.cuotaTotal;
filas.push([
  '(e) base del MEI',
  'retribución de 6.000 €/mes, 2026',
  'retribución completa',
  'cuota MEI €/mes',
  cotiz({}),
  cotiz({ baseMEI: 'retribucion-completa' }),
]);

console.log('| Lectura | Caso | Alternativa | Magnitud | Por defecto | Alternativa | Variación |');
console.log('| ------- | ---- | ----------- | -------- | ----------: | ----------: | --------: |');
for (const [l, k, a, m, d, v] of filas) {
  const variacion =
    d === 0 ? (v === 0 ? '0,00 %' : `de 0 a ${f(v)}`) : `${f(((v - d) / d) * 100)} %`;
  console.log(`| ${l} | ${k} | ${a} | ${m} | ${f(d)} | ${f(v)} | ${variacion} |`);
}
