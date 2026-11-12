/**
 * Ayudas para los tests del motor de jubilación (no forma parte de la API): parámetros del
 * repositorio, carreras sintéticas y atajos de cálculo.
 */
import { calcularJubilacionConParametros } from './calculo.ts';
import { crearContexto } from './contexto.ts';
import { parametrosDelRepositorio } from './parametros-datos.ts';
import type {
  Carrera,
  Modalidad,
  OpcionesJubilacion,
  PeriodoCarrera,
  ResultadoJubilacion,
} from './tipos.ts';

export const PARAMS = parametrosDelRepositorio();

/** Escenario sin inflación ni sustitución del histórico: nada crece tras 2026 salvo la regla legal. */
export const ESCENARIO_2PC = { ipc: 0.02 } as const;
export const ESCENARIO_TEORICO_2PC = { ipc: 0.02, sustituirHistoricoIPC: true } as const;

export function continua(desde: string, hasta: string, baseMensual: number): PeriodoCarrera {
  return { desde, hasta, baseMensual };
}

export function calc(
  carrera: Carrera,
  nacimiento: string,
  fecha: string,
  modalidad: Modalidad = 'ordinaria',
  opciones: OpcionesJubilacion = {},
): ResultadoJubilacion {
  return calcularJubilacionConParametros(PARAMS, carrera, nacimiento, fecha, modalidad, opciones);
}

export function contexto(opciones: OpcionesJubilacion = {}) {
  return crearContexto(PARAMS, opciones);
}

export function paso(r: ResultadoJubilacion, id: string) {
  const p = r.pasos.find((x) => x.id === id);
  if (!p) throw new Error(`Sin paso ${id}; hay ${r.pasos.map((x) => x.id).join(', ')}`);
  return p;
}

export function requisito(r: ResultadoJubilacion, id: string) {
  const q = r.requisitos.find((x) => x.id === id);
  if (!q) throw new Error(`Sin requisito ${id}; hay ${r.requisitos.map((x) => x.id).join(', ')}`);
  return q;
}
