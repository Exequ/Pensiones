/**
 * Efecto de cada lectura abierta del motor de incapacidad permanente sobre un caso típico.
 * Uso: npx tsx scripts/lecturas-abiertas-incapacidad.ts   (salida a docs/INFORME_VERIFICACION.md)
 */
import { calcularIncapacidadPermanenteConParametros } from '../src/engine/incapacidad/calculo.ts';
import { construirParametrosIncapacidad } from '../src/engine/incapacidad/parametros.ts';
import type {
  Carrera,
  GradoIncapacidad,
  LecturasIncapacidad,
  OpcionesIncapacidad,
  OrigenIncapacidad,
  ResultadoIncapacidad,
} from '../src/engine/incapacidad/tipos.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const params = construirParametrosIncapacidad(leerParametroDeDisco);
const f = (n: number, d = 2) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

function calc(
  carrera: Carrera,
  nacimiento: string,
  hc: string,
  grado: GradoIncapacidad,
  origen: OrigenIncapacidad,
  lecturas: Partial<LecturasIncapacidad>,
  extra: OpcionesIncapacidad = {},
): ResultadoIncapacidad {
  return calcularIncapacidadPermanenteConParametros(
    params,
    carrera,
    nacimiento,
    hc,
    grado,
    origen,
    {
      escenario: { ipc: 0.02 },
      huecoBaseMinima: 'anterior',
      aplicarMinimos: false,
      calcularAunqueNoCumpla: true,
      lecturasIncapacidad: lecturas,
      ...extra,
    },
  );
}

const filas: string[] = [];
function fila(
  lectura: string,
  caso: string,
  alternativa: string,
  magnitud: string,
  a: number,
  b: number,
): void {
  const v = a === 0 ? 0 : (b / a - 1) * 100;
  filas.push(
    `| ${lectura} | ${caso} | ${alternativa} | ${magnitud} | ${f(a)} | ${f(b)} | ${f(v)} % |`,
  );
}

const corta: Carrera = [{ desde: '2010-07', hasta: '2026-05', baseMensual: 2000 }];
// (a) Edad de la ficción
{
  const args = [corta, '1968-01-20', '2026-06-15', 'absoluta', 'enfermedad-comun'] as const;
  const a = calc(...args, {});
  const b = calc(...args, { edadFiccion: 'edad-general' });
  fila(
    '(a) edad de la ficción (art. 197.1.b)',
    '58 años, 191 meses cotizados, 2026',
    'edad general sin carrera larga',
    'pensión €/mes',
    a.pensionMensual,
    b.pensionMensual,
  );
}
// (b) Cómputo de los años añadidos
{
  const args = [corta, '1968-01-20', '2026-06-15', 'absoluta', 'enfermedad-comun'] as const;
  const a = calc(...args, {});
  const b = calc(...args, { computoFiccion: 'anios-completos' });
  fila(
    '(b) años añadidos por meses o años completos',
    'el mismo caso',
    'años completos',
    'pensión €/mes',
    a.pensionMensual,
    b.pensionMensual,
  );
}
// (c) Redondeo de la edad del periodo mínimo
{
  const carrera: Carrera = [
    {
      desde: '2018-01',
      hasta: '2026-05',
      basesPorAnio: Object.fromEntries(
        [2018, 2019, 2020, 2021, 2022, 2023, 2024, 2025, 2026].map((a, i) => [
          String(a),
          1500 + 100 * i,
        ]),
      ),
    },
  ];
  const args = [carrera, '1981-01-10', '2026-06-15', 'absoluta', 'enfermedad-comun'] as const;
  const a = calc(...args, {});
  const b = calc(...args, { redondeoEdadCarencia: 'medio-anio' });
  const ex = (r: ResultadoIncapacidad) =>
    r.requisitos.find((q) => q.id === 'carencia')?.exigido ?? 0;
  fila(
    '(c) redondeo de la edad a medios años (RD 1799/1985)',
    '45 años y 5 meses, 2026',
    'medio año',
    'meses exigidos',
    ex(a),
    ex(b),
  );
  fila(
    '(c) ídem, efecto en la base del periodo corto',
    'bases crecientes (100 € al año)',
    'medio año',
    'pensión €/mes',
    a.pensionMensual,
    b.pensionMensual,
  );
}
// (d) Divisor del periodo corto
{
  const carrera: Carrera = [{ desde: '2000-01', hasta: '2026-05', baseMensual: 2000 }];
  const args = [carrera, '1984-03-10', '2026-06-15', 'absoluta', 'enfermedad-comun'] as const;
  const a = calc(...args, {});
  const b = calc(...args, { divisorPeriodoCorto: 'catorce-doceavos' });
  fila(
    '(d) divisor del periodo corto (art. 197.2)',
    '42 años, 2026',
    'meses × 14/12',
    'pensión €/mes',
    a.pensionMensual,
    b.pensionMensual,
  );
}
// (e) Lagunas en el accidente no laboral
{
  const carrera: Carrera = [
    { desde: '2010-01', hasta: '2024-12', baseMensual: 1500 },
    { desde: '2025-07', hasta: '2026-05', baseMensual: 1500 },
  ];
  const args = [carrera, '1981-03-10', '2026-06-15', 'total', 'accidente-no-laboral'] as const;
  const a = calc(...args, {}, { periodoElegidoDesde: '2024-06' });
  const b = calc(
    ...args,
    { lagunasAccidenteNoLaboral: 'integrar' },
    { periodoElegidoDesde: '2024-06' },
  );
  fila(
    '(e) meses sin cotizar en el accidente no laboral',
    '24 meses elegidos con 6 sin cotizar, 2026',
    'integrarlos con la base mínima',
    'pensión €/mes',
    a.pensionMensual,
    b.pensionMensual,
  );
}
// (f) Días de la parcial
{
  const carrera: Carrera = [{ desde: '2021-07', hasta: '2026-05', baseMensual: 2000 }];
  const args = [carrera, '1980-01-01', '2026-06-15', 'parcial', 'enfermedad-comun'] as const;
  const dias = (r: ResultadoIncapacidad) =>
    r.requisitos.find((q) => q.id === 'carencia-parcial')?.valor ?? 0;
  const a = calc(...args, {});
  const b = calc(...args, { diasCotizadosParcial: 'treinta-por-mes' });
  fila(
    '(f) días cotizados de la parcial',
    '59 meses cotizados',
    'treinta días por mes',
    'días acreditados',
    dias(a),
    dias(b),
  );
}

console.log('| Lectura | Caso | Alternativa | Magnitud | Por defecto | Alternativa | Variación |');
console.log('| ------- | ---- | ----------- | -------- | ----------: | ----------: | --------: |');
for (const l of filas) console.log(l);
