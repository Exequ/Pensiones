/**
 * Genera `docs/REVISION_PRIORIZADA.md` (triage actuarial de la Fase 2-C) a partir de
 * `docs/triage-actuarial.json` (mediciones), `docs/claims.json`, `docs/REVISION_ACTUARIAL.md`
 * y el registro de lecturas. Uso: npx tsx scripts/triage-actuarial-md.ts
 */
import { execFileSync } from 'node:child_process';
import { readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { LECTURAS_ABIERTAS, type LecturaAbierta } from '../src/engine/lecturas.ts';
import type { Evidencia, Medida } from './triage-actuarial.ts';
import { RAIZ } from './lib/motor-jubilacion.ts';

type Grupo = 'A' | 'B' | 'C' | 'cerrada';

// ---------------------------------------------------------------------------------------------
// Clasificación (la mide el script de triage o la toma de docs/INFORME_VERIFICACION.md)
// ---------------------------------------------------------------------------------------------
interface Clasificacion {
  readonly grupo: Grupo;
  /** Efecto medido o referencia a la fila del informe. */
  readonly efecto: string;
  readonly motivo: string;
}

const LECTURA: Record<string, Clasificacion> = {
  'jubilacion.baseMaxima': {
    grupo: 'cerrada',
    efecto: '−0,48 % (solo con la base topada)',
    motivo:
      'Las bases máximas oficiales de 2025 y 2026 coinciden con la lectura compuesta y no con la alternativa (evidencia por código).',
  },
  'jubilacion.pensionMaxima': {
    grupo: 'cerrada',
    efecto: '+14,25 % (topado, 2040)',
    motivo:
      'La pensión máxima oficial de 2026 coincide con el incremento constante y no con el creciente (evidencia por código).',
  },
  'jubilacion.referenciaBaseMinimaLagunas': {
    grupo: 'C',
    efecto: '+0,09 %',
    motivo: 'Diferencia inferior al 1 % con 40 meses de laguna.',
  },
  'jubilacion.opcion25EnUltimoDia2040': {
    grupo: 'B',
    efecto: '−1,74 % (solo el 31/12/2040)',
    motivo: 'Efecto menor pero real; afecta a un único día de jubilación.',
  },
  'jubilacion.lagunasAnterioresAlPrimerAlta': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Más del 5 % en carreras cortas.',
  },
  'jubilacion.interpolacionIPC': {
    grupo: 'C',
    efecto: '−0,95 %',
    motivo: 'Inferior al 1 %; se resuelve con la serie mensual del INE (docs/PENDIENTE_DATOS.md).',
  },
  'jubilacion.fraccionDemora': {
    grupo: 'B',
    efecto: '+1,92 %',
    motivo: 'Efecto menor pero real en la demora con fracción de año.',
  },
  'jubilacion.maximaDesde2051': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Más del 5 % para todo quien se jubile topado desde 2051.',
  },
  'incapacidad.edadFiccion': {
    grupo: 'cerrada',
    efecto: '0,00 % en todas las combinaciones probadas',
    motivo:
      'Las dos lecturas dan el mismo resultado en todo el dominio soportado (comprobación por código).',
  },
  'incapacidad.computoFiccion': {
    grupo: 'B',
    efecto: '−1,31 %',
    motivo: 'Efecto menor pero real (hasta 11 meses menos de escala).',
  },
  'incapacidad.divisorPeriodoCorto': { grupo: 'C', efecto: '−0,01 %', motivo: 'Inferior al 1 %.' },
  'incapacidad.lagunasAccidenteNoLaboral': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Más del 5 % con meses sin cotizar dentro del periodo elegido.',
  },
  'incapacidad.redondeoEdadCarencia': {
    grupo: 'B',
    efecto: '−1,32 % de los meses exigidos',
    motivo: 'Un mes de periodo exigido; puede decidir el derecho en el límite.',
  },
  'incapacidad.diasCotizadosParcial': {
    grupo: 'B',
    efecto: '−1,45 % de los días acreditados',
    motivo: 'Solo decide el derecho cerca de los 1.800 días.',
  },
  'supervivencia.ventanaBaseReguladora': {
    grupo: 'B',
    efecto: '+1,23 %',
    motivo: 'Solo si el mes previo al hecho causante es de los mejores.',
  },
  'supervivencia.diasCotizados': {
    grupo: 'B',
    efecto: '−1,16 % de los días acreditados',
    motivo: 'Solo decide el derecho cerca de los 500 días.',
  },
  'supervivencia.carenciaOrfandad': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Todo o nada para la orfandad con causante en alta y menos de 500 días.',
  },
  'supervivencia.carenciaFamiliaresAccidenteNoLaboral': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Todo o nada para el favor de familiares tras accidente no laboral.',
  },
  'supervivencia.reduccionViudedad70': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Más del 5 % en la viudedad del 70 % con rentas cercanas al límite.',
  },
  'supervivencia.comparacionCompensatoria': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: '+16,7 % en toda viudedad de excónyuge limitada por la compensatoria.',
  },
  'supervivencia.incrementoFamiliares': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Entre −56 % y −72 % en el favor de familiares sin viudo ni huérfanos.',
  },
  'supervivencia.reduccionLimiteConjunto': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Más del 10 % en la viudedad cuando se supera el límite conjunto.',
  },
  'no-contributivas.baseRentasCompatibles': {
    grupo: 'cerrada',
    efecto: '−7,04 %',
    motivo:
      'La guía del IMSERSO de 2026 aplica el 35 % sobre el importe anual de la pensión, también en unidad económica.',
  },
  'no-contributivas.limiteTrabajo': {
    grupo: 'cerrada',
    efecto: '−40,79 %',
    motivo: 'La guía del IMSERSO suma el IPREM y la cuantía íntegra y cifra el límite.',
  },
  'no-contributivas.rentasConTrabajoEnCuatroAnios': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Todo o nada en la pensión durante los cuatro primeros años de actividad.',
  },
  'no-contributivas.limiteConTerceraPersona': {
    grupo: 'cerrada',
    efecto: '−100 % (sin derecho)',
    motivo:
      'La guía del IMSERSO de 2026 publica los límites con el complemento de tercera persona.',
  },
  'mei.baseMEI': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Más del 17 % de la cuota del MEI con retribución por encima de la base máxima.',
  },
};

/** Preguntas de docs/REVISION_ACTUARIAL.md por identificador de afirmación. */
const PREGUNTA: Record<string, Clasificacion> = {
  'param-escala-porcentajes-jubilacion': {
    grupo: 'cerrada',
    efecto: '—',
    motivo:
      'La escala de 2026 y 2027 coincide con la web de la Seguridad Social (contraste de docs/AUDITORIA_DATOS.md) y con `cotizacion-para-100` (test).',
  },
  'param-divisor-base-reguladora': {
    grupo: 'cerrada',
    efecto: '—',
    motivo:
      'Divisores de 2026 a 2037 coinciden con la web de la Seguridad Social; el test comprueba divisor = bases × 14/12.',
  },
  'param-periodo-calculo-base-reguladora': {
    grupo: 'cerrada',
    efecto: '—',
    motivo:
      'La web de la Seguridad Social usa las bases de mayor importe dentro de la ventana y coincide en los 12 años.',
  },
  'param-lagunas-integracion': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo:
      'Lectura «lagunas anteriores a la primera alta» (−14,6 % en el caso del informe); la base mínima de la laguna es C.',
  },
  'param-actualizacion-bases': {
    grupo: 'C',
    efecto: '−0,95 %',
    motivo: 'Interpolación del IPC mensual.',
  },
  'param-opcion-25-anos-ventana': {
    grupo: 'B',
    efecto: '−1,74 %',
    motivo: 'Solo el 31/12/2040; el resto de la ventana coincide con la web (cerrado).',
  },
  'param-opcion-25-anos-divisor': {
    grupo: 'cerrada',
    efecto: '—',
    motivo: 'Divisores y ventanas de 2026 a 2043 coinciden con la web de la Seguridad Social.',
  },
  'param-escala-jubilacion-tramos': {
    grupo: 'cerrada',
    efecto: '—',
    motivo: 'Porcentajes por mes de 2026 y 2027 coinciden con la web de la Seguridad Social.',
  },
  'param-jubilacion-coeficientes-involuntaria': {
    grupo: 'B',
    efecto: 'hasta 3,53 % (cota por los cuadros)',
    motivo: 'Un mes de redondeo: 0,67 %; cambiar de tramo: 1,16 % a 3,53 %.',
  },
  'param-jubilacion-coeficientes-voluntaria': {
    grupo: 'C',
    efecto: 'hasta 0,79 % (cota por los cuadros)',
    motivo: 'Un mes: 0,33 %; cambiar de tramo: 0,26 % a 0,79 %.',
  },
  'param-jubilacion-coeficientes-voluntaria-limite': {
    grupo: 'B',
    efecto: 'no medible',
    motivo:
      'La salvaguarda de la DT 34.ª.1 y 2022-2023 no están en `/data` (docs/PENDIENTE_DATOS.md).',
  },
  'param-jubilacion-demora-reglas': {
    grupo: 'B',
    efecto: '+1,92 %',
    motivo:
      'Fracción de la demora; las otras tres lecturas no tienen opción en el motor y no se han medido.',
  },
  'param-lagunas-integracion-brecha-genero': {
    grupo: 'B',
    efecto: '−0,7 % a −1,9 %',
    motivo:
      'Integración reforzada de la DT 41.ª activada o no (opción del motor, 60 a 84 meses de laguna).',
  },
  'param-carrera-jubilacion-65': {
    grupo: 'B',
    efecto: 'no medido',
    motivo:
      'Las cifras coinciden con la web (cerrado); la lectura 2 (carrera proyectada en las anticipadas) no tiene opción en el motor.',
  },
  'param-pension-minima-regla': {
    grupo: 'B',
    efecto: 'no medible',
    motivo:
      'Falta el umbral de pobreza de la ECV (docs/PENDIENTE_DATOS.md): la DA 53.ª de 2027 no se aplica.',
  },
  'param-revalorizacion-regla': {
    grupo: 'cerrada',
    efecto: '—',
    motivo:
      'El porcentaje de 2022 a 2026 coincide con la media de las variaciones del IPC del INE de diciembre a noviembre.',
  },
  'param-base-maxima-incremento-futuro': {
    grupo: 'cerrada',
    efecto: '−0,48 %',
    motivo: 'Lectura compuesta confirmada por la base máxima oficial de 2025 y 2026.',
  },
  'param-pension-maxima-incremento-futuro': {
    grupo: 'cerrada',
    efecto: '+14,25 %',
    motivo: 'Incremento constante confirmado por la pensión máxima oficial de 2026.',
  },
  'param-mei-tipo-total': {
    grupo: 'cerrada',
    efecto: '—',
    motivo:
      'Tipos y reparto de 2023 a 2026 coinciden con las órdenes de cotización y la web; empresa + trabajador = total (test).',
  },
  'param-mei-destino': {
    grupo: 'C',
    efecto: 'solo documental',
    motivo: 'Contraste de la recaudación con las dotaciones del Fondo de Reserva.',
  },
  'param-pension-maxima-incremento-2051-2065': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Incremento acumulado frente a anual literal: +6 % a +38 % en la máxima.',
  },
  'param-base-minima-rg': {
    grupo: 'B',
    efecto: 'no medible',
    motivo:
      'Falta la base mínima de 2020 y 2021 y la regla posterior a 2026; la base de cada año de /data coincide con el SMI de Eurostat.',
  },
  'param-incapacidad-permanente-reglas': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo:
      'Lagunas del accidente no laboral (+13 % a +92 %); edad de la ficción cerrada; cómputo B; divisor C.',
  },
  'param-incapacidad-permanente-reglas-carencia': {
    grupo: 'B',
    efecto: '−1,3 % / −1,45 %',
    motivo: 'Redondeo de la edad y días de la parcial; deciden el derecho en el límite.',
  },
  'param-incapacidad-permanente-reglas-cuantia': {
    grupo: 'B',
    efecto: 'no medido',
    motivo:
      'La lectura (a) (50 % desde los 67 años sin derecho a jubilación) consta en la web de la Seguridad Social (cerrada); (b)-(d) no tienen opción; (e) depende del Reglamento de 1956.',
  },
  'param-pnc-reglas': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo:
      'Rentas del trabajo en los cuatro primeros años (todo o nada); (a), (b) y (d) cerradas con la guía del IMSERSO.',
  },
  'param-mei-reglas': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Base del MEI (+17,6 % a +135 % de la cuota).',
  },
  'param-supervivencia-reglas': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Carencia de la orfandad y del favor de familiares (todo o nada); ventana y días B.',
  },
  'param-supervivencia-reglas-cuantia': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Reducción del 70 %, compensatoria e incremento de familiares.',
  },
  'param-supervivencia-reglas-limites': {
    grupo: 'A',
    efecto: 'ver ficha',
    motivo: 'Reducción por el límite conjunto (−10,7 % a −34,2 %).',
  },
};
function clasificacionDe(id: string): Clasificacion {
  const c = LECTURA[id];
  if (c === undefined) throw new Error(`Lectura sin clasificar: ${id}`);
  return c;
}
const grupoDe = (id: string): Grupo => clasificacionDe(id).grupo;

const GRUPO_PREGUNTA_POR_DEFECTO: Clasificacion = {
  grupo: 'C',
  efecto: 'solo documental',
  motivo:
    'Definición o dato de contexto: no cambia ningún resultado del motor; se decide al usarlo en el modelo.',
};

// ---------------------------------------------------------------------------------------------
const f = (n: number, d = 2): string =>
  n.toLocaleString('es-ES', { minimumFractionDigits: d, maximumFractionDigits: d });
const variacion = (d: number, a: number): string =>
  d === 0 ? (a === 0 ? '0,00 %' : `de 0 a ${f(a)}`) : `${f(((a - d) / Math.abs(d)) * 100)} %`;
const absPct = (d: number, a: number): number =>
  d === 0 ? (a === 0 ? 0 : Infinity) : Math.abs((a - d) / d) * 100;

interface Dato {
  readonly id: string;
  readonly quote?: string;
  readonly location?: string;
  readonly source: { readonly title: string; readonly url: string };
}
const cache = new Map<string, Dato[]>();
function dato(ref: string): Dato {
  const [fichero, id] = ref.split('#') as [string, string];
  if (!cache.has(fichero))
    cache.set(
      fichero,
      (
        JSON.parse(readFileSync(path.join(RAIZ, 'data/parametros', `${fichero}.json`), 'utf8')) as {
          data: Dato[];
        }
      ).data,
    );
  const d = cache.get(fichero)?.find((x) => x.id === id);
  if (d === undefined) throw new Error(`No existe ${ref}`);
  return d;
}

function lineaDeCodigo(opcion: string): string {
  try {
    const salida = execFileSync(
      'grep',
      [
        '-rn',
        '--include=*.ts',
        '--exclude=*.test.ts',
        '--exclude=tipos.ts',
        '--exclude=lecturas.ts',
        `\\b${opcion}\\b`,
        'src/engine',
      ],
      { cwd: RAIZ, encoding: 'utf8' },
    );
    const primera = salida
      .split('\n')
      .find((l) => l.trim() !== '' && !l.includes('//') && !l.includes(' * '));
    const m = /^([^:]+):(\d+):/.exec(primera ?? salida.split('\n')[0] ?? '');
    return m ? `\`${m[1]}:${m[2]}\`` : '(ver `src/engine`)';
  } catch {
    return '(ver `src/engine`)';
  }
}

/** Datos con el texto literal de la norma que cada pregunta del grupo A pone en duda. */
const NORMA: Record<string, string[]> = {
  'param-lagunas-integracion': ['lagunas-integracion#2026-tramo1-meses'],
  'param-pension-maxima-incremento-2051-2065': [
    'pension-maxima-incremento-futuro#2050',
    'pension-maxima-incremento-2051-2065#2065-convergencia-total',
  ],
  'param-incapacidad-permanente-reglas': [
    'incapacidad-permanente-reglas#br-anl-meses',
    'incapacidad-permanente-reglas#br-anl-ventana-meses',
  ],
  'param-pnc-reglas': [
    'pnc-reglas#compatibilidad-trabajo-anios-meses',
    'pnc-reglas#compatibilidad-trabajo-limite-iprem',
    'pnc-reglas#rentas-compatibles-pct',
  ],
  'param-mei-reglas': [
    'mei-reglas#aplicable-contingencia-jubilacion',
    'mei-reglas#tipo-total-2030-2050',
  ],
  'param-supervivencia-reglas': [
    'supervivencia-reglas#orfandad-alta-o-pensionista',
    'supervivencia-reglas#orfandad-carencia-rd-1647-1997-dias',
    'supervivencia-reglas#familiares-carencia-alta-dias',
    'supervivencia-reglas#familiares-sin-alta-quince-anios',
    'supervivencia-reglas#carencia-exenta-accidente-ep',
  ],
  'param-supervivencia-reglas-cuantia': [
    'supervivencia-reglas#viudedad-cargas-reduccion-limite',
    'supervivencia-reglas#divorcio-limite-compensatoria',
    'supervivencia-reglas#familiares-incremento-sin-viudo',
  ],
  'param-supervivencia-reglas-limites': [
    'supervivencia-reglas#limite-viudedad-orfandad-orden-1967',
    'supervivencia-reglas#limite-conjunto-pct-br',
    'supervivencia-reglas#limite-excepcion-viudedad-umbral-pct',
  ],
};
const ALTERNATIVAS_TEXTO: Record<string, string> = {
  'jubilacion.lagunasAnterioresAlPrimerAlta':
    'Por defecto («integrar»): los meses de la ventana anteriores al primer alta se cuentan como laguna y se rellenan con la base mínima (100 % las primeras 48 mensualidades y 50 % el resto). Alternativa («ignorar»): esos meses no se cuentan.',
  'jubilacion.maximaDesde2051':
    'Por defecto («incremento-acumulado»): la pensión máxima crece cada año la revalorización más la diferencia entre el incremento acumulado de ese año y el del anterior. Alternativa («incremento-anual-literal»): se suma a la revalorización el valor de la tabla de ese año.',
  'incapacidad.lagunasAccidenteNoLaboral':
    'Por defecto («sin-integrar»): los meses sin cotizar dentro del periodo de 24 meses elegido cuentan como cero. Alternativa («integrar»): se rellenan con la base mínima.',
  'supervivencia.carenciaOrfandad':
    'Por defecto («sin-carencia»): la orfandad con causante en alta no exige periodo previo (art. 224.1 TRLGSS). Alternativa («rd-1647-1997»): se exigen 500 días en los cinco años anteriores (art. 9.1 del RD 1647/1997, redacción de 2001).',
  'supervivencia.carenciaFamiliaresAccidenteNoLaboral':
    'Por defecto («exigir»): el favor de familiares tras un accidente no laboral exige los 500 días (Orden de 1967: solo exime el accidente de trabajo y la enfermedad profesional). Alternativa («exenta»): se exime también el accidente no laboral, como en la viudedad (art. 219.1).',
  'supervivencia.reduccionViudedad70':
    'Por defecto («no-inferior-52»): la reducción del 70 % por el límite de rendimientos no baja la pensión del 52 %. Alternativa («sin-suelo»): la pensión puede quedar por debajo del 52 %.',
  'supervivencia.comparacionCompensatoria':
    'Por defecto («anual»): la viudedad del excónyuge se compara con la compensatoria en cómputo anual (14 pagas). Alternativa («mensual»): se comparan importes mensuales (entre 12).',
  'supervivencia.incrementoFamiliares':
    'Por defecto («porcentaje-viudedad»): sin cónyuge superviviente, el incremento del favor de familiares es el porcentaje de la viudedad. Alternativa («sin-incremento»): no hay incremento.',
  'supervivencia.reduccionLimiteConjunto':
    'Por defecto («orfandad»): al superar el límite conjunto se reducen las orfandades y se mantiene la viudedad. Alternativa («proporcional»): se reducen todas las pensiones en proporción.',
  'no-contributivas.rentasConTrabajoEnCuatroAnios':
    'Por defecto («sustituye-364-2»): durante los cuatro primeros años de actividad el límite del art. 366 sustituye a la reducción general por rentas. Alternativa («se-suman»): se aplican las dos reducciones.',
  'mei.baseMEI':
    'Por defecto («base-cotizacion»): el tipo del MEI se aplica a la base de cotización por contingencias comunes (con tope). Alternativa («retribucion-completa»): se aplica a toda la retribución, también la que supera la base máxima.',
};

function ficha(
  n: number,
  id: string,
  titulo: string,
  lecturas: LecturaAbierta[],
  medidas: Medida[],
): string[] {
  const L: string[] = [
    `### Ficha ${n}: ${titulo}`,
    '',
    `Pregunta: \`${id}\` (docs/REVISION_ACTUARIAL.md, punto ${n}).`,
    '',
  ];
  L.push(
    '**Texto de la norma** (cita literal de `/data`; la fuente y el artículo están en cada dato):',
    '',
  );
  for (const ref of NORMA[id] ?? []) {
    const d = dato(ref);
    const q = (d.quote ?? '').replace(/\s+/g, ' ').trim();
    L.push(
      `> «${q.length > 700 ? `${q.slice(0, 700)}…` : q}»`,
      `> — \`${ref}\` · ${d.location ?? ''} · <${d.source.url}>`,
      '',
    );
  }
  for (const l of lecturas) {
    const m = medidas.find((x) => x.id === l.id);
    L.push(`**Lectura \`${l.id}\`** — ${l.descripcion}`, '');
    L.push(
      `- Valor por defecto actual: \`${l.porDefecto}\`. Alternativas: ${l.alternativas
        .filter((a) => a !== l.porDefecto)
        .map((a) => `\`${a}\``)
        .join(', ')}.`,
    );
    L.push(`- ${ALTERNATIVAS_TEXTO[l.id] ?? ''}`);
    L.push(
      `- Qué cambia en el código: una línea. Para adoptar la alternativa, en \`src/engine/config/lecturas-por-defecto.json\` se pone el \`valor\` de la entrada \`${l.id}\` en una de las alternativas (con \`estado\` «decidida» y la fecha) y se anota en \`docs/DECISIONES_ACTUARIALES.md\`. La rama del motor que cambia está en ${lineaDeCodigo(l.opcion)}; no hay más cambios. Quien use el motor puede elegirla sin tocar el fichero con \`lecturas['${l.id}']\` en la configuración del motor.`,
    );
    L.push(
      '',
      '| Caso | Magnitud | Por defecto | Alternativa | Variación |',
      '| --- | --- | ---: | ---: | ---: |',
    );
    for (const k of m?.casos ?? [])
      L.push(
        `| ${k.descripcion} | ${k.magnitud} | ${f(k.defecto)} | ${f(k.alternativa)} | ${variacion(k.defecto, k.alternativa)} |`,
      );
    L.push('');
  }
  return L;
}

// ---------------------------------------------------------------------------------------------
function principal(): void {
  const { medidas, evidencias } = JSON.parse(
    readFileSync(path.join(RAIZ, 'docs/triage-actuarial.json'), 'utf8'),
  ) as {
    medidas: Medida[];
    evidencias: Evidencia[];
  };
  const reglas = readFileSync(path.join(RAIZ, 'docs/REVISION_ACTUARIAL.md'), 'utf8');
  const preguntas = [...reglas.matchAll(/^### (\d+)\. `([^`]+)`/gm)].map((m) => ({
    n: Number(m[1]),
    id: m[2] as string,
  }));
  const claims = JSON.parse(readFileSync(path.join(RAIZ, 'docs/claims.json'), 'utf8')) as {
    claims: { id: string; texto: string }[];
  };
  const texto = new Map(claims.claims.map((c) => [c.id, c.texto]));
  const lecturasDe = (id: string): LecturaAbierta[] =>
    LECTURAS_ABIERTAS.filter((l) => l.preguntaActuarial === id);
  const impacto = (id: string): number => {
    let max = 0;
    for (const l of lecturasDe(id)) {
      const m = medidas.find((x) => x.id === l.id);
      for (const k of m?.casos ?? []) max = Math.max(max, absPct(k.defecto, k.alternativa));
    }
    for (const m of medidas.filter(
      (x) =>
        lecturasDe(id).every((l) => l.id !== x.id) &&
        x.id.startsWith('jubilacion.coef') &&
        id.includes('coeficientes'),
    )) {
      if (
        (m.id.includes('Involuntaria') && id.endsWith('involuntaria')) ||
        (m.id.includes('Voluntaria') && id.endsWith('voluntaria'))
      )
        for (const k of m.casos) max = Math.max(max, absPct(k.defecto, k.alternativa));
    }
    return max;
  };
  const clase = (id: string): Clasificacion => PREGUNTA[id] ?? GRUPO_PREGUNTA_POR_DEFECTO;
  // Coherencia: una pregunta del grupo A tiene al menos una lectura A; ninguna lectura abierta queda sin clasificar.
  for (const l of LECTURAS_ABIERTAS)
    if (LECTURA[l.id] === undefined) throw new Error(`Lectura sin clasificar: ${l.id}`);
  for (const id of Object.keys(PREGUNTA))
    if (!preguntas.some((p) => p.id === id)) throw new Error(`Pregunta desconocida: ${id}`);

  const L: string[] = [
    '# Revisión actuarial priorizada',
    '',
    `Generada por \`scripts/triage-actuarial.ts\` (mediciones) y \`scripts/triage-actuarial-md.ts\` (este documento); no edites a mano. Fecha: 2026-11-13 (Fase 2-C). Describe, no recomienda: ningún valor por defecto del motor cambia con este documento (registro en \`src/engine/config/lecturas-por-defecto.json\` y \`docs/DECISIONES_ACTUARIALES.md\`).`,
    '',
    'Criterios:',
    '',
    '- **Cerrada por evidencia**: se resuelve con un documento oficial inequívoco o con una comprobación por código. Se cita la evidencia y queda como «propuesta cerrada, pendiente de visto bueno de Sergio»; el valor por defecto del motor no cambia.',
    '- **A, decidir antes de la Fase 3**: efecto superior al 5 % en algún caso representativo, afecta a muchos perfiles o bloquea la Fase 3.',
    '- **B, decidir antes de publicar**: efecto menor pero real (entre el 1 % y el 5 %, o decide el derecho en el límite, o no es medible por falta de datos).',
    '- **C, bajo impacto**: efecto inferior al 1 %, o solo documental.',
    '',
    `Resumen: de las ${LECTURAS_ABIERTAS.length} lecturas abiertas del registro, ${Object.values(LECTURA).filter((x) => x.grupo === 'cerrada').length} se cierran por evidencia, ${Object.values(LECTURA).filter((x) => x.grupo === 'A').length} son del grupo A, ${Object.values(LECTURA).filter((x) => x.grupo === 'B').length} del B y ${Object.values(LECTURA).filter((x) => x.grupo === 'C').length} del C. De las ${preguntas.length} preguntas de \`docs/REVISION_ACTUARIAL.md\`: ${preguntas.filter((p) => clase(p.id).grupo === 'cerrada').length} cerradas por evidencia, ${preguntas.filter((p) => clase(p.id).grupo === 'A').length} del grupo A, ${preguntas.filter((p) => clase(p.id).grupo === 'B').length} del B y ${preguntas.filter((p) => clase(p.id).grupo === 'C').length} del C.`,
    '',
  ];

  // --- Grupo A ---
  const A = preguntas
    .filter((p) => clase(p.id).grupo === 'A')
    .sort((x, y) => impacto(y.id) - impacto(x.id));
  L.push(
    '## Grupo A: decidir antes de la Fase 3 (ordenadas por impacto)',
    '',
    '| Orden | Pregunta | Lecturas del grupo A | Efecto máximo medido |',
    '| ---: | --- | --- | ---: |',
  );
  A.forEach((p, k) => {
    const ls = lecturasDe(p.id).filter((l) => LECTURA[l.id]?.grupo === 'A');
    const max = impacto(p.id);
    L.push(
      `| ${k + 1} | ${p.n}. \`${p.id}\` | ${ls.map((l) => `\`${l.id}\``).join(', ') || '—'} | ${max === Infinity ? 'todo o nada' : `${f(max)} %`} |`,
    );
  });
  L.push('');
  A.forEach((p, k) => {
    const ls = lecturasDe(p.id).filter((l) => LECTURA[l.id]?.grupo === 'A');
    L.push(
      ...ficha(
        p.n,
        p.id,
        `${(texto.get(p.id) ?? p.id).split(':')[0] ?? p.id} (orden ${k + 1})`,
        ls,
        medidas,
      ),
    );
    const otras = lecturasDe(p.id).filter((l) => LECTURA[l.id]?.grupo !== 'A');
    if (otras.length > 0)
      L.push(
        `Otras lecturas de la misma pregunta: ${otras.map((l) => `\`${l.id}\` (${LECTURA[l.id]?.grupo === 'cerrada' ? 'cerrada por evidencia' : `grupo ${LECTURA[l.id]?.grupo}`}, ${LECTURA[l.id]?.efecto})`).join('; ')}.`,
        '',
      );
  });

  // --- B y C ---
  for (const g of ['B', 'C'] as const) {
    L.push(
      `## Grupo ${g}: ${g === 'B' ? 'decidir antes de publicar' : 'bajo impacto'} (ordenadas por impacto)`,
      '',
      '| Pregunta | Efecto | Motivo | Lecturas |',
      '| --- | --- | --- | --- |',
    );
    preguntas
      .filter((p) => clase(p.id).grupo === g)
      .sort((x, y) => impacto(y.id) - impacto(x.id))
      .forEach((p) =>
        L.push(
          `| ${p.n}. \`${p.id}\` | ${clase(p.id).efecto} | ${clase(p.id).motivo} | ${
            lecturasDe(p.id)
              .map((l) => `\`${l.id}\``)
              .join(', ') || '—'
          } |`,
        ),
      );
    L.push('');
  }

  // --- Cerradas ---
  L.push('## Cerradas por evidencia: propuesta cerrada, pendiente de visto bueno de Sergio', '');
  L.push('| Pregunta | Lectura o dato | Evidencia |', '| --- | --- | --- |');
  for (const p of preguntas.filter((q) => clase(q.id).grupo === 'cerrada'))
    L.push(
      `| ${p.n}. \`${p.id}\` | ${
        lecturasDe(p.id)
          .filter((l) => LECTURA[l.id]?.grupo === 'cerrada')
          .map((l) => `\`${l.id}\``)
          .join(', ') || 'cifras del dato'
      } | ${clase(p.id).motivo} |`,
    );
  L.push(
    '',
    '**Lecturas del registro cerradas** (con la evidencia medida por código o la fuente citada; el valor por defecto actual coincide con la propuesta en todas):',
    '',
  );
  for (const [id, c] of Object.entries(LECTURA).filter(([, c]) => c.grupo === 'cerrada')) {
    const e = evidencias.find((x) => x.id === id);
    L.push(
      `- \`${id}\` (por defecto \`${LECTURAS_ABIERTAS.find((l) => l.id === id)?.porDefecto}\`): ${c.motivo}${e ? ` ${e.texto}.` : ''} Efecto de la alternativa en el informe: ${c.efecto}.`,
    );
  }
  L.push(
    '',
    'Todas las evidencias de «cerrada» son de los datos oficiales descargados en esta sesión (BOE, web de la Seguridad Social, INE, IMSERSO; `docs/AUDITORIA_DATOS.md`) o de una comprobación sobre el propio motor. Una guía del IMSERSO no es norma: si se prefiere el texto de la ley, las lecturas de PNC (a), (b) y (d) pasarían al grupo A con los efectos del informe.',
    '',
  );

  // --- Lecturas del registro ---
  L.push(
    '## Lecturas del registro por grupo',
    '',
    '| Lectura | Por defecto | Grupo | Efecto | Motivo |',
    '| --- | --- | --- | --- | --- |',
  );
  const orden = { A: 0, B: 1, C: 2, cerrada: 3 } as const;
  for (const l of [...LECTURAS_ABIERTAS].sort(
    (x, y) => orden[grupoDe(x.id)] - orden[grupoDe(y.id)],
  )) {
    const c = clasificacionDe(l.id);
    const m = medidas.find((x) => x.id === l.id);
    const efecto =
      c.efecto === 'ver ficha' && m
        ? m.casos.map((k) => variacion(k.defecto, k.alternativa)).join(' / ')
        : c.efecto;
    L.push(
      `| \`${l.id}\` | \`${l.porDefecto}\` | ${c.grupo === 'cerrada' ? 'cerrada por evidencia' : c.grupo} | ${efecto} | ${c.motivo} |`,
    );
  }
  L.push('');

  // --- Todas las preguntas ---
  L.push(
    '## Todas las preguntas de `docs/REVISION_ACTUARIAL.md`',
    '',
    '| Nº | Pregunta | Grupo | Efecto | Motivo |',
    '| ---: | --- | --- | --- | --- |',
  );
  for (const p of preguntas) {
    const c = clase(p.id);
    L.push(
      `| ${p.n} | \`${p.id}\` | ${c.grupo === 'cerrada' ? 'cerrada por evidencia' : c.grupo} | ${c.efecto} | ${c.motivo} |`,
    );
  }
  L.push(
    '',
    `Las ${preguntas.filter((p) => PREGUNTA[p.id] === undefined).length} preguntas no listadas arriba con motivo propio (definiciones de ratio, déficit, salario medio, comparativa internacional, afirmaciones circulantes, mortalidad y supuestos de la OCDE) son del grupo C: no cambian ningún resultado del motor y se deciden al usarlas en el modelo.`,
    '',
  );

  writeFileSync(path.join(RAIZ, 'docs/REVISION_PRIORIZADA.md'), L.join('\n'));
  console.log(`A: ${A.length} fichas; preguntas: ${preguntas.length}`);
}
principal();
