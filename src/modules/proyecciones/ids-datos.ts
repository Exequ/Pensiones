/**
 * Identificadores de las columnas de las salidas de los modelos (data/proyecciones/*.json) y rótulos
 * de los modelos. Algunos llevan cifras (el nombre de la columna «65_mas»): son identificadores de
 * /data, no cifras de datos, y por eso viven aparte (el test de «sin cifras escritas a mano» los
 * excluye, igual que `ficheros.ts` y `datos-proyecciones.ts`).
 */
export const COL = {
  anio: 'anio',
  escenario: 'escenario',
  total: 'total',
  totalM1: 'total_m1',
  menores: '0_15',
  activos: '16_64',
  mayores: '65_mas',
  muyMayores: '80_mas',
  dependencia: 'dep_65',
  menoresM1: '0_15_m1',
  activosM1: '16_64_m1',
  mayoresM1: '65_mas_m1',
  muyMayoresM1: '80_mas_m1',
  dependenciaM1: 'dep_65_m1',
  mayoresIne: '65_mas_ine',
  dependenciaIne: 'dep_65_ine',
  errTotal: 'err_total_%',
  errMayores: 'err_65_mas_%',
  errActivos: 'err_16_64_%',
  errMenores: 'err_0_15_%',
  afiliados: 'afiliados_dic',
  cotizantesRg: 'cotizantes_rg',
  baseCorrientes: 'base_total_rg_meur',
  baseReales: 'base_total_rg_meur_reales_2025',
  recaudacion: 'recaudacion_cc_rg_meur',
  pensionesOct: 'pensiones_oct',
  afiliadosPorPension: 'afiliados_por_pension',
  pensionistas: 'pensionistas_aprox',
  clase: 'clase',
  sexo: 'sexo',
  grupoEdad: 'grupo_edad',
  pensiones: 'pensiones',
} as const;

/** Rótulos de los modelos («M1» no se escribe en los textos: sale de aquí). */
export const MODELO = { m1: 'M1', m2: 'M2', m3: 'M3' } as const;
