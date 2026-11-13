/**
 * Contraste con el modelo simplificado M5 v2 (modelos/m5/m5_v2.py): reproduce los casos de
 * data-raw/casos-oro/casos_oro_m5.json (copia de modelos/m5/casos_oro_m5.json) con el motor y
 * compara la pensión final.
 *
 * M5 es un modelo teórico (carrera continua, salario relativo constante, crecimiento real g, IPC
 * constante). Aquí se construye la carrera mes a mes con la misma fórmula que M5, como *entrada*
 * del motor; el motor aplica las reglas legales.
 */
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { calcularJubilacionConParametros } from '../../src/engine/jubilacion/calculo.ts';
import { crearContexto } from '../../src/engine/jubilacion/contexto.ts';
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
    lagunas_previas?: 'integrar' | 'ignorar';
    integracion_reforzada?: boolean;
    suelo_base_minima?: boolean;
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
  // Edad de jubilación de M5 v2: 65 años si los meses cotizados hasta los 65 (sin las lagunas)
  // alcanzan la carrera de la DT 7.ª; si no, la edad ordinaria del año.
  const mesesA65 = Math.max(0, Math.round((65 - e.edad_inicio) * 12));
  const cotizadosA65 = Math.max(0, mesesA65 - (e.lagunas_meses ?? 0));
  const edadMeses =
    cotizadosA65 >= valorEn(params.carrera65, T).valor
      ? params.edad65Meses
      : valorEn(params.edadOrdinaria, T).valor;
  const meses = Math.round(edadMeses - e.edad_inicio * 12);
  const lagunas = Math.min(e.lagunas_meses ?? 0, meses);
  // Suelo de la base mínima (M5 v2): la base de un mes no baja de la base mínima de su año. Los
  // meses anteriores al primer año con base mínima en /data (2000) quedan fuera de toda ventana.
  const contexto = crearContexto(params, {
    escenario: { ipc, sustituirHistoricoIPC: true },
    huecoBaseMinima: 'anterior',
  });
  const suelo = e.suelo_base_minima ?? true;
  // Base de cada mes, a k meses del 1 de enero de T (k = 1 es el mes previo al hecho causante)
  const basesPorMes: Record<string, number> = {};
  let primero = '';
  let ultimo = '';
  for (let k = meses; k > lagunas; k--) {
    const abs = T * 12 - k;
    const clave = `${Math.floor(abs / 12)}-${String((abs % 12) + 1).padStart(2, '0')}`;
    const t = T - k / 12;
    const base = e.rel * ref * Math.pow((1 + e.g) * (1 + ipc), t - 2024);
    const anioMes = Math.floor(abs / 12);
    basesPorMes[clave] =
      suelo && anioMes >= params.baseMinima.primero
        ? Math.max(base, contexto.baseMinima(anioMes).valor)
        : base;
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
      huecoBaseMinima: 'anterior',
      lecturas: { lagunasAnterioresAlPrimerAlta: e.lagunas_previas ?? 'integrar' },
      integracionReforzadaLagunas: e.integracion_reforzada ?? false,
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
    // Con pensión 0 en M5 (no causa derecho) se devuelve la pensión del motor, que debe ser 0.
    diferenciaRelativa:
      c.salida.pension_final === 0
        ? r.pensionAnual
        : (r.pensionAnual - c.salida.pension_final) / c.salida.pension_final,
  };
}
