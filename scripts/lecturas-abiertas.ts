/**
 * Efecto de cada lectura abierta del motor de jubilación sobre un caso típico.
 * Uso: npx tsx scripts/lecturas-abiertas.ts   (la salida se copia a docs/INFORME_VERIFICACION.md)
 */
import { calcularJubilacionConParametros } from '../src/engine/jubilacion/calculo.ts';
import type {
  LecturasAbiertas,
  OpcionesJubilacion,
  PeriodoCarrera,
  ResultadoJubilacion,
} from '../src/engine/jubilacion/tipos.ts';
import { parametrosDesdeDisco } from './lib/motor-jubilacion.ts';

const params = parametrosDesdeDisco();
const ESC = { ipc: 0.02 } as const;
const f = (n: number, d = 0) =>
  n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });

function por(
  carrera: PeriodoCarrera[],
  nacimiento: string,
  fecha: string,
  modalidad: 'ordinaria' | 'demorada',
  lecturas: Partial<LecturasAbiertas>,
  extra: OpcionesJubilacion = {},
): ResultadoJubilacion {
  return calcularJubilacionConParametros(params, carrera, nacimiento, fecha, modalidad, {
    escenario: ESC,
    usarOpcion25Anos: false,
    calcularAunqueNoCumpla: true,
    lecturas,
    ...extra,
  });
}

const filas: string[] = [];
function fila(
  titulo: string,
  caso: string,
  lectura: string,
  defecto: ResultadoJubilacion,
  alternativa: ResultadoJubilacion,
  campo: 'baseReguladora' | 'pensionMensual',
) {
  const a = defecto[campo];
  const b = alternativa[campo];
  filas.push(
    `| ${titulo} | ${caso} | ${lectura} | ${f(a, 2)} | ${f(b, 2)} | ${f((b / a - 1) * 100, 2)} % |`,
  );
}

// (a) «acumulativos»: salario muy alto (topado), jubilación el 1-1-2040
const topado = [{ desde: '2000-01', hasta: '2039-12', baseMensual: 20000 }];
const ta = (l: Partial<LecturasAbiertas>) =>
  por(topado, '1975-01-01', '2040-01-01', 'ordinaria', l);
fila(
  '(a) DT 38.ª, base máxima',
  'topado por la base máxima, 2040',
  '«sobre la cifra inicial»',
  ta({}),
  ta({ baseMaxima: 'sobre-cifra-inicial' }),
  'baseReguladora',
);
fila(
  '(a) DT 39.ª, pensión máxima',
  'topado, 2040',
  '«incremento creciente»',
  ta({}),
  ta({ pensionMaxima: 'incremento-creciente' }),
  'pensionMensual',
);

// (b) base mínima de las lagunas: 40 meses sin cotizar al final, 2040
const lag = [{ desde: '2000-01', hasta: '2036-07', baseMensual: 2000 }];
const tb = (l: Partial<LecturasAbiertas>) => por(lag, '1975-01-01', '2040-01-01', 'ordinaria', l);
fila(
  '(b) lagunas, base mínima',
  '40 meses de laguna finales, 2040',
  'base mínima del hecho causante',
  tb({}),
  tb({ referenciaBaseMinimaLagunas: 'hecho-causante' }),
  'baseReguladora',
);

// (c) 31/12/2040: salarios con crecimiento real del 2 %
const crec: PeriodoCarrera = {
  desde: '2005-01',
  hasta: '2040-12',
  basesPorAnio: Object.fromEntries(
    Array.from({ length: 36 }, (_, i) => [String(2005 + i), Math.round(1500 * Math.pow(1.04, i))]),
  ),
};
const tc = (l: Partial<LecturasAbiertas>) =>
  por([crec], '1975-12-31', '2040-12-31', 'ordinaria', l, { usarOpcion25Anos: true });
fila(
  '(c) opción de 25 años el 31/12/2040',
  'salarios con +2 % real, 31/12/2040',
  'excluida',
  tc({}),
  tc({ opcion25EnUltimoDia2040: 'excluida' }),
  'baseReguladora',
);

// (d) otras
const corta = [{ desde: '2015-01', hasta: '2029-12', baseMensual: 2500 }];
const td = (l: Partial<LecturasAbiertas>) => por(corta, '1965-01-01', '2030-01-01', 'ordinaria', l);
fila(
  '(d) lagunas anteriores a la primera alta',
  '15 años cotizados, 2030',
  'ignorar',
  td({}),
  td({ lagunasAnterioresAlPrimerAlta: 'ignorar' }),
  'baseReguladora',
);
const media = [{ desde: '1995-01', hasta: '2025-12', baseMensual: 2000 }];
const te = (l: Partial<LecturasAbiertas>) => por(media, '1961-01-01', '2026-01-01', 'ordinaria', l);
fila(
  '(d) IPC mensual',
  '31 años a 2.000 €, 2026',
  'escalón anual',
  te({}),
  te({ interpolacionIPC: 'escalon-anual' }),
  'baseReguladora',
);
fila(
  '(d) IPC mensual interpolado',
  '31 años a 2.000 €, 2026',
  'medias anuales interpoladas',
  te({}),
  te({ interpolacionIPC: 'interpolada' }),
  'baseReguladora',
);
// Con el índice de referencia (septiembre de 2024) por debajo del de los meses anteriores de 2024.
const sueloCarrera = [{ desde: '1995-01', hasta: '2026-10', baseMensual: 2000 }];
const ts = (l: Partial<LecturasAbiertas>) =>
  por(sueloCarrera, '1961-11-15', '2026-11-15', 'ordinaria', l);
fila(
  '(d) suelo del factor de actualización',
  '31 años a 2.000 €, noviembre de 2026',
  'sin suelo (por defecto: suelo de uno, Fase 2-E)',
  ts({}),
  ts({ actualizacionFactorMinimo: 'sin-suelo' }),
  'baseReguladora',
);
const dem = [{ desde: '1986-01', hasta: '2030-12', baseMensual: 2500 }];
const tf = (l: Partial<LecturasAbiertas>) => por(dem, '1964-01-01', '2030-10-01', 'demorada', l);
fila(
  '(d) fracción de la demora',
  '1 año y 9 meses de demora',
  'desde el primer año',
  tf({}),
  tf({ fraccionDemora: 'desde-primer-anio' }),
  'pensionMensual',
);
const alta2055 = [{ desde: '2020-01', hasta: '2054-12', baseMensual: 40000 }];
const tg = (l: Partial<LecturasAbiertas>) =>
  por(alta2055, '1990-01-01', '2055-01-01', 'ordinaria', l, { escenario: { ipc: 0.02 } });
fila(
  '(d) pensión máxima desde 2051',
  'topado, 2055',
  'incremento anual literal',
  tg({}),
  tg({ maximaDesde2051: 'incremento-anual-literal' }),
  'pensionMensual',
);

console.log('| Lectura | Caso | Alternativa | Por defecto | Alternativa (€) | Variación |');
console.log('| ------- | ---- | ----------- | ----------: | --------------: | --------: |');
for (const x of filas) console.log(x);
