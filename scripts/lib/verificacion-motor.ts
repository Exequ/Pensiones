/**
 * Verificación independiente del motor de jubilación: recorre una muestra de combinaciones
 * (año de jubilación 2026-2050 × perfil de carrera) y comprueba invariantes:
 *  - ningún resultado es NaN ni infinito;
 *  - la pensión nunca supera el máximo del año;
 *  - nunca baja del mínimo cuando corresponde (cumple requisitos, sin rentas, a los 65 o más);
 *  - es monótona (no decreciente) en los años cotizados y en el nivel de las bases.
 * Cada comprobación usa solo la API pública del motor y los datos de /data.
 */
import { calcularJubilacionConParametros } from '../../src/engine/jubilacion/calculo.ts';
import { crearContexto } from '../../src/engine/jubilacion/contexto.ts';
import type { PeriodoCarrera, ResultadoJubilacion } from '../../src/engine/jubilacion/tipos.ts';
import { construirEntrada, type CasoM5 } from './contraste-m5.ts';
import { parametrosDesdeDisco } from './motor-jubilacion.ts';

export interface Perfil {
  readonly nombre: string;
  readonly rel: number;
  readonly edadInicio: number;
}

export const PERFILES: readonly Perfil[] = [
  { nombre: 'salario bajo, desde los 22', rel: 0.45, edadInicio: 22 },
  { nombre: 'salario medio, desde los 22', rel: 1, edadInicio: 22 },
  { nombre: 'salario medio, desde los 32', rel: 1, edadInicio: 32 },
  { nombre: 'salario alto, desde los 22', rel: 2.5, edadInicio: 22 },
  { nombre: 'salario 0,8, desde los 27', rel: 0.8, edadInicio: 27 },
  { nombre: 'salario 1,6, desde los 30', rel: 1.6, edadInicio: 30 },
];

export interface FilaVerificacion {
  readonly anio: number;
  readonly perfil: string;
  readonly pensionAnual: number;
  readonly estado: string;
}

export interface InformeVerificacion {
  readonly combinaciones: number;
  readonly comprobaciones: number;
  readonly violaciones: string[];
  readonly filas: FilaVerificacion[];
}

const params = parametrosDesdeDisco();
const ESCENARIO_ID = { ipc: 0.02, sustituirHistoricoIPC: true } as const;

function periodoConBases(
  p: PeriodoCarrera,
  factor: number,
  descartarPrimeros: number,
): PeriodoCarrera {
  if (!('basesPorMes' in p)) throw new Error('se esperaban bases por mes');
  const claves = Object.keys(p.basesPorMes).sort().slice(descartarPrimeros);
  const primero = claves[0];
  const ultimo = claves[claves.length - 1];
  if (primero === undefined || ultimo === undefined) throw new Error('carrera vacía');
  return {
    desde: primero,
    hasta: ultimo,
    basesPorMes: Object.fromEntries(claves.map((k) => [k, (p.basesPorMes[k] ?? 0) * factor])),
  };
}

export function ejecutarVerificacion(completa = false): InformeVerificacion {
  const anios = Array.from({ length: 25 }, (_, i) => 2026 + i);
  const todas = anios.flatMap((anio) => PERFILES.map((perfil) => ({ anio, perfil })));
  const muestra = completa ? todas : todas.filter((_, i) => i % 5 === 0);
  const violaciones: string[] = [];
  const filas: FilaVerificacion[] = [];
  let comprobaciones = 0;
  const comprueba = (cond: boolean, mensaje: string) => {
    comprobaciones++;
    if (!cond) violaciones.push(mensaje);
  };

  for (const { anio, perfil } of muestra) {
    const etiqueta = `${anio} · ${perfil.nombre}`;
    const caso: CasoM5['entrada'] = {
      rel: perfil.rel,
      g: 0.01,
      edad_inicio: perfil.edadInicio,
      anio_jubilacion: anio,
    };
    const x = construirEntrada(caso);
    const calcular = (carrera: PeriodoCarrera[]): ResultadoJubilacion =>
      calcularJubilacionConParametros(
        params,
        carrera,
        x.nacimiento,
        x.fechaJubilacion,
        'ordinaria',
        { ...x.opciones, escenario: ESCENARIO_ID, huecoBaseMinima: 'anterior' },
      );
    const base = x.carrera[0];
    if (!base) throw new Error('sin carrera');
    const r = calcular(x.carrera);
    filas.push({ anio, perfil: perfil.nombre, pensionAnual: r.pensionAnual, estado: r.estado });
    const ctx = crearContexto(params, { escenario: ESCENARIO_ID });

    for (const [nombre, v] of [
      ['pensión mensual', r.pensionMensual],
      ['pensión anual', r.pensionAnual],
      ['base reguladora', r.baseReguladora],
      ['porcentaje', r.porcentaje],
    ] as const) {
      comprueba(Number.isFinite(v), `${etiqueta}: ${nombre} no es un número finito (${v})`);
    }
    comprueba(
      r.pensionMensual <= ctx.pensionMaxima(anio).valor + 1e-6,
      `${etiqueta}: la pensión (${r.pensionMensual}) supera el máximo`,
    );
    const minima = ctx.pensionMinimaAnual(anio, 'jub65-unipersonal').valor / r.pagas;
    comprueba(
      r.pensionMensual >= minima - 1e-6,
      `${etiqueta}: la pensión (${r.pensionMensual}) baja de la mínima (${minima})`,
    );
    comprueba(r.pensionMensual > 0, `${etiqueta}: pensión nula con requisitos cumplidos`);

    // Monótona en años cotizados: quitar los primeros 12, 60 y 120 meses de carrera
    let anterior = r.pensionMensual;
    for (const quitar of [12, 60, 120]) {
      const menos = calcular([periodoConBases(base, 1, quitar)]);
      comprueba(
        menos.pensionMensual <= anterior + 1e-9,
        `${etiqueta}: con ${quitar} meses menos la pensión sube (${menos.pensionMensual} > ${anterior})`,
      );
      anterior = menos.pensionMensual;
    }
    // Monótona en la base: +10 %
    const mas = calcular([periodoConBases(base, 1.1, 0)]);
    comprueba(
      mas.pensionMensual >= r.pensionMensual - 1e-9,
      `${etiqueta}: con bases un 10 % más altas la pensión baja (${mas.pensionMensual} < ${r.pensionMensual})`,
    );
    const menosBase = calcular([periodoConBases(base, 0.9, 0)]);
    comprueba(
      menosBase.pensionMensual <= r.pensionMensual + 1e-9,
      `${etiqueta}: con bases un 10 % más bajas la pensión sube`,
    );
  }
  return { combinaciones: muestra.length, comprobaciones, violaciones, filas };
}
