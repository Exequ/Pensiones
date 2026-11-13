/**
 * Sondeo de los años en que cada función de la fachada lanza `DatoNoDisponible` o `NoImplementada`.
 * Uso: npx tsx scripts/anios-futuros.ts   (tabla para docs/PENDIENTE_DATOS.md)
 *
 * Para cada función se pide un caso típico con hecho causante en marzo de cada año de 2022 a 2062,
 * sin escenario económico y con un escenario de IPC del 2 %, y se anota el primer año con error de
 * cada tipo y el mensaje. No inventa nada: solo lee lo que el motor hace con los datos de /data.
 */
import { crearMotor, type Motor, type ResultadoError } from '../src/engine/index.ts';
import { leerParametroDeDisco } from './lib/motor-jubilacion.ts';

const PRIMER_ANIO = 2022;
const ULTIMO_ANIO = 2062;

type Llamada = (
  anio: number,
  motor: Motor,
  escenario: boolean,
) => { readonly ok: true } | ResultadoError;

const esc = (activo: boolean): { escenario?: { ipc: number } } =>
  activo ? { escenario: { ipc: 0.02 } } : {};

const carreraHasta = (anio: number): { desde: string; hasta: string; baseMensual: number }[] => [
  { desde: `${anio - 40}-01`, hasta: `${anio}-02`, baseMensual: 2000 },
];

const causante = (anio: number) => ({
  fechaFallecimiento: `${anio}-03-15`,
  causa: 'enfermedad-comun' as const,
  situacion: 'alta' as const,
  carrera: [{ desde: `${anio - 16}-01`, hasta: `${anio}-02`, baseMensual: 2000 }],
});

const LLAMADAS: [string, Llamada][] = [
  [
    'jubilación ordinaria',
    (a, m, e) =>
      m.jubilacion({
        carrera: carreraHasta(a),
        nacimiento: `${a - 67}-01-15`,
        fechaJubilacion: `${a}-03-01`,
        modalidad: 'ordinaria',
        opciones: esc(e),
      }),
  ],
  [
    'incapacidad permanente total (enfermedad común)',
    (a, m, e) =>
      m.incapacidadPermanente({
        carrera: carreraHasta(a),
        nacimiento: `${a - 55}-01-20`,
        fechaHechoCausante: `${a}-03-15`,
        grado: 'total',
        origen: 'enfermedad-comun',
        opciones: esc(e),
      }),
  ],
  [
    'viudedad',
    (a, m, e) =>
      m.viudedad({
        causante: causante(a),
        viudos: [
          { vinculo: 'conyuge', nacimiento: `${a - 50}-05-01`, fechaMatrimonio: `${a - 20}-06-01` },
        ],
        opciones: esc(e),
      }),
  ],
  [
    'viudedad con requisito de ingresos (70 %)',
    (a, m, e) =>
      m.viudedad({
        causante: causante(a),
        viudos: [
          {
            vinculo: 'conyuge',
            nacimiento: `${a - 50}-05-01`,
            fechaMatrimonio: `${a - 20}-06-01`,
            cargasFamiliares: { miembrosUnidadFamiliar: 2, rendimientosUnidadFamiliar: 9000 },
          },
        ],
        opciones: esc(e),
      }),
  ],
  [
    'orfandad',
    (a, m, e) =>
      m.orfandad({
        causante: causante(a),
        huerfanos: [{ nacimiento: `${a - 12}-01-01` }],
        opciones: esc(e),
      }),
  ],
  [
    'favor de familiares (madre)',
    (a, m, e) =>
      m.favorFamiliares({
        causante: causante(a),
        familiares: [
          {
            parentesco: 'madre',
            nacimiento: `${a - 70}-01-01`,
            convivenciaMeses: 30,
            estadoCivilCumple: true,
          },
        ],
        opciones: esc(e),
      }),
  ],
  [
    'PNC de incapacidad',
    (a, m) =>
      m.pncIncapacidad({
        solicitante: {
          nacimiento: `${a - 45}-05-05`,
          fechaSolicitud: `${a}-03-10`,
          residenciaLegalMeses: 120,
          residenciaRecienteMeses: 60,
          gradoDiscapacidad: 80,
          necesitaTerceraPersona: true,
          rentasAnuales: 2000,
        },
      }),
  ],
  [
    'PNC de jubilación',
    (a, m) =>
      m.pncJubilacion({
        solicitante: {
          nacimiento: `${a - 70}-03-03`,
          fechaSolicitud: `${a}-03-10`,
          residenciaLegalMeses: 240,
          residenciaRecienteMeses: 60,
          rentasAnuales: 0,
        },
      }),
  ],
  [
    'MEI y cotización de solidaridad',
    (a, m, e) => m.cotizacionAdicional({ anio: a, retribucionMensual: 6000, opciones: esc(e) }),
  ],
];

function resumenAnios(anios: number[]): string {
  if (anios.length === 0) return '—';
  const tramos: string[] = [];
  let ini = anios[0] as number;
  let ant = ini;
  for (const a of anios.slice(1)) {
    if (a !== ant + 1) {
      tramos.push(ini === ant ? `${ini}` : `${ini}-${ant}`);
      ini = a;
    }
    ant = a;
  }
  tramos.push(ini === ant ? `${ini}` : `${ini}-${ant}`);
  return tramos.join(', ');
}

export interface FilaSondeo {
  readonly funcion: string;
  readonly escenario: boolean;
  readonly sinError: number[];
  readonly datoNoDisponible: Map<string, number[]>;
  readonly noImplementada: Map<string, number[]>;
  readonly entradaInvalida: Map<string, number[]>;
}

export function sondear(): FilaSondeo[] {
  const filas: FilaSondeo[] = [];
  for (const escenario of [false, true]) {
    const motor = crearMotor(leerParametroDeDisco, {});
    for (const [funcion, llamar] of LLAMADAS) {
      const fila: FilaSondeo = {
        funcion,
        escenario,
        sinError: [],
        datoNoDisponible: new Map(),
        noImplementada: new Map(),
        entradaInvalida: new Map(),
      };
      for (let a = PRIMER_ANIO; a <= ULTIMO_ANIO; a++) {
        const r = llamar(a, motor, escenario);
        if (r.ok) {
          fila.sinError.push(a);
          continue;
        }
        const destino =
          r.error.codigo === 'DatoNoDisponible'
            ? fila.datoNoDisponible
            : r.error.codigo === 'NoImplementada'
              ? fila.noImplementada
              : fila.entradaInvalida;
        const msg = r.error.mensaje.replace(/\d{4}/g, 'AAAA').slice(0, 180);
        destino.set(msg, [...(destino.get(msg) ?? []), a]);
      }
      filas.push(fila);
    }
  }
  return filas;
}

if (import.meta.url === `file://${process.argv[1]}`) {
  for (const f of sondear()) {
    console.log(`\n## ${f.funcion} (${f.escenario ? 'con' : 'sin'} escenario de IPC del 2 %)`);
    console.log(`  sin error: ${resumenAnios(f.sinError)}`);
    for (const [titulo, mapa] of [
      ['DatoNoDisponible', f.datoNoDisponible],
      ['NoImplementada', f.noImplementada],
      ['EntradaInvalida', f.entradaInvalida],
    ] as const) {
      for (const [msg, anios] of mapa) console.log(`  ${titulo} [${resumenAnios(anios)}]: ${msg}`);
    }
  }
}
