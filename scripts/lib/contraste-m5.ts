/**
 * Contraste con el modelo simplificado M5 (data-raw/casos-oro/m5_v1.py): reproduce los casos de
 * data-raw/casos-oro/casos_oro_m5.json con el motor y compara la pensión final.
 *
 * M5 es un modelo teórico (carrera continua, salario relativo constante, crecimiento real g, IPC
 * constante). Aquí se construye la carrera mes a mes con la misma fórmula que M5, como *entrada*
 * del motor; el motor aplica las reglas legales.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calcularJubilacionConParametros } from '../../src/engine/jubilacion/calculo.ts';
import { valorEn } from '../../src/engine/jubilacion/parametros.ts';
import { sumarMeses } from '../../src/engine/jubilacion/tiempo.ts';
import type { OpcionesJubilacion, PeriodoCarrera } from '../../src/engine/jubilacion/tipos.ts';
import { RAIZ, parametrosDesdeDisco } from './motor-jubilacion.ts';

export interface CasoM5 {
  nombre: string;
  entrada: {
    rel: number;
    g: number;
    edad_inicio: number;
    anio_jubilacion: number;
    lagunas_meses?: number;
    ipc?: number;
    topes?: boolean;
    actualizar?: boolean;
    salario_medio_ref?: number;
  };
  salida: {
    pension_final: number;
    estado: string;
    edad_jubilacion: number;
    meses_cotizados: number;
    base_reguladora_mensual: number;
  };
}
export const casos: CasoM5[] = (
  JSON.parse(readFileSync(path.join(RAIZ, 'data-raw/casos-oro/casos_oro_m5.json'), 'utf8')) as {
    casos: CasoM5[];
  }
).casos;

/** Salario medio de referencia de M5: EAES (ambos sexos) de 2024, entre 12, de data/macro. */
function salarioReferencia(): number {
  const j = JSON.parse(
    readFileSync(path.join(RAIZ, 'data/macro/salario-medio-definiciones.json'), 'utf8'),
  ) as {
    series: { id: string; points: { period: string; value: number }[] }[];
  };
  const punto = j.series
    .find((s) => s.id === 'eaes-ambos')
    ?.points.find((p) => p.period === '2024');
  if (!punto) throw new Error('Falta la EAES 2024');
  return punto.value / 12;
}

const params = parametrosDesdeDisco();

export interface ResultadoContraste {
  readonly motor: number;
  readonly estadoMotor: string;
  readonly cumple: boolean;
  readonly baseReguladora: number;
  readonly diferenciaRelativa: number;
}

export interface EntradaMotor {
  readonly carrera: PeriodoCarrera[];
  readonly nacimiento: string;
  readonly fechaJubilacion: string;
  readonly opciones: OpcionesJubilacion;
}

/** Traduce los supuestos de M5 (carrera continua, salario relativo, crecimiento real, IPC constante) a la entrada del motor. */
export function construirEntrada(e: CasoM5['entrada']): EntradaMotor {
  const ipc = e.ipc ?? 0.02;
  const T = e.anio_jubilacion;
  const ref = e.salario_medio_ref ?? salarioReferencia();
  // Edad de jubilación de M5: 65 años si el máximo de meses cotizables hasta los 65 alcanza la carrera de la DT 7.ª
  const mesesA65 = Math.round((65 - e.edad_inicio) * 12);
  const edadMeses =
    mesesA65 >= valorEn(params.carrera65, T).valor
      ? params.edad65Meses
      : valorEn(params.edadOrdinaria, T).valor;
  const meses = Math.round(edadMeses - e.edad_inicio * 12);
  const lagunas = Math.min(e.lagunas_meses ?? 0, meses);
  // Base de cada mes, a k meses del 1 de enero de T (k = 1 es el mes previo al hecho causante)
  const basesPorMes: Record<string, number> = {};
  let primero = '';
  let ultimo = '';
  for (let k = meses; k > lagunas; k--) {
    const abs = T * 12 - k;
    const clave = `${Math.floor(abs / 12)}-${String((abs % 12) + 1).padStart(2, '0')}`;
    const t = T - k / 12;
    basesPorMes[clave] = e.rel * ref * Math.pow((1 + e.g) * (1 + ipc), t - 2024);
    if (primero === '') primero = clave;
    ultimo = clave;
  }
  const f = sumarMeses({ anio: T, mes: 1, dia: 1 }, -edadMeses);
  return {
    carrera: [{ desde: primero, hasta: ultimo, basesPorMes }],
    nacimiento: `${f.anio}-${String(f.mes).padStart(2, '0')}-${String(f.dia).padStart(2, '0')}`,
    fechaJubilacion: `${T}-01-01`,
    opciones: {
      escenario: { ipc, sustituirHistoricoIPC: true },
      topeBases: e.topes ?? true,
      aplicarPensionMaxima: e.topes ?? true,
      actualizarBases: e.actualizar ?? true,
      calcularAunqueNoCumpla: true,
    },
  };
}

export function reproducir(c: CasoM5): ResultadoContraste {
  const x = construirEntrada(c.entrada);
  const r = calcularJubilacionConParametros(
    params,
    x.carrera,
    x.nacimiento,
    x.fechaJubilacion,
    'ordinaria',
    x.opciones,
  );
  return {
    motor: r.pensionAnual,
    estadoMotor: r.estado,
    cumple: r.cumpleRequisitos,
    baseReguladora: r.baseReguladora,
    diferenciaRelativa: (r.pensionAnual - c.salida.pension_final) / c.salida.pension_final,
  };
}
