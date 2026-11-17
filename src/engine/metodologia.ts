/**
 * Recuentos de la página «Metodología» (Fase «Metodología»).
 *
 * Función pura: recibe el contenido ya leído de los ficheros del repositorio (`EntradasMetodologia`)
 * y devuelve los números que muestra la página. No lee ficheros ni importa React ni DOM: de leerlos
 * se ocupa `scripts/lib/entradas-metodologia.ts` (Node), y el resultado llega a la página en tiempo
 * de compilación (módulo virtual `virtual:recuentos-metodologia` de `vite.config.ts`). Ninguna cifra
 * de la página está escrita a mano; `scripts/metodologia-fase.test.ts` recalcula cada recuento con
 * otro procedimiento.
 */

export type NivelConfianza = 'alta' | 'media' | 'baja';

/** Un fichero JSON de `/data` (ruta relativa a `data/`) ya interpretado. */
export interface FicheroDatos {
  readonly ruta: string;
  readonly json: unknown;
}

export interface EntradasMetodologia {
  /** Texto de `docs/FUENTES.md`. */
  readonly fuentesMd: string;
  /** Rutas de todos los ficheros de `data/`, relativas a `data/` (con barras, también `.csv` y `.md`). */
  readonly ficherosData: readonly string[];
  /** JSON de `data/` ya interpretados. */
  readonly datosJson: readonly FicheroDatos[];
  /** `docs/claims.json` interpretado. */
  readonly claims: unknown;
  /** `docs/revision-actuarial/aplicacion-tanda3.json` interpretado. */
  readonly aplicacionTanda3: unknown;
  /** Texto de `docs/ESTADO_AJUSTES_ACTUARIALES_3.md` (de él se toma la fecha de las respuestas). */
  readonly estadoAjustes3Md: string;
  /** `src/engine/config/lecturas-por-defecto.json` interpretado. */
  readonly lecturas: unknown;
  /** Texto de `docs/INVENTARIO_CASOS_ORO.md`. */
  readonly casosOroMd: string;
  /** `docs/auditoria-independiente.json` interpretado. */
  readonly auditoria: unknown;
  /** `docs/comprobacion-urls.json` interpretado. */
  readonly comprobacionUrls: unknown;
  /** Rutas de los ficheros de pruebas automáticas (`*.test.ts` y `*.test.tsx`). */
  readonly ficherosTest: readonly string[];
  /** Rutas de los scripts de `scripts/etl/` (`*.py`). */
  readonly ficherosEtl: readonly string[];
  /** Descripciones de `docs/modelos/`: nombre del fichero (`M1_descripcion.md`, …) y primera línea. */
  readonly descripcionesModelos: readonly { readonly fichero: string; readonly titulo: string }[];
  /** Rutas de los ficheros de pruebas que importan las listas de `scripts/lib/valoraciones.ts`. */
  readonly pruebasConListas: readonly string[];
  /** `package.json` interpretado. */
  readonly paquete: unknown;
  /** Texto de `CLAUDE.md`. */
  readonly reglasMd: string;
  /** Texto de `data/README.md`. */
  readonly leemeDatosMd: string;
  /** Texto de `data/proyecciones/README.md`. */
  readonly leemeProyeccionesMd: string;
  /** Texto de `modelos/README.md`. */
  readonly leemeModelosMd: string;
  /** Número de términos de cada lista de `scripts/lib/valoraciones.ts`. */
  readonly listasDeTerminos: {
    readonly valoracion: number;
    readonly valoracionReformas: number;
    readonly veredicto: number;
  };
}

export interface RecuentoPendiente {
  readonly id: string;
  readonly ubicacion: string;
  readonly pregunta: string;
  /** `true` si la afirmación no figura entre las filas de la tercera tanda (se añadió después). */
  readonly posteriorATanda3: boolean;
}

export interface RecuentoGrupoRevision {
  readonly referencia: string;
  readonly afirmaciones: number;
}

export interface RecuentoParteTanda {
  readonly parte: string;
  readonly preguntasRevisadas: number;
  readonly preguntasPendientes: number;
  readonly afirmacionesRevisadas: number;
}

export interface RecuentoLecturasMotor {
  readonly motor: string;
  readonly total: number;
  readonly decidida: number;
  readonly provisional: number;
  readonly pendiente: number;
}

export interface RecuentoModelo {
  /** `M1` … `M6`. */
  readonly modelo: string;
  /** Título de su descripción en `docs/modelos/`, sin la pregunta que sigue a los dos puntos. */
  readonly titulo: string;
  /** Ficheros de `data/proyecciones/` de ese modelo. */
  readonly ficheros: number;
  /** Confianza de sus ficheros, o `null` si no tiene salidas en `/data`. */
  readonly confianza: NivelConfianza | null;
  /** Fecha de ejecución más reciente (`AAAA-MM-DD`), o `null`. */
  readonly ejecutadoEl: string | null;
  /** `true` si los ficheros declaran legislación congelada. */
  readonly legislacionCongelada: boolean;
}

export interface RecuentosMetodologia {
  readonly fuentes: {
    readonly distintas: number;
    readonly organismos: number;
    readonly porOrganismo: readonly { readonly organismo: string; readonly fuentes: number }[];
  };
  readonly datos: {
    readonly ficheros: number;
    readonly json: number;
    readonly csv: number;
    readonly porCarpeta: readonly {
      readonly carpeta: string;
      readonly json: number;
      readonly csv: number;
    }[];
    readonly elementosConConfianza: Readonly<Record<NivelConfianza | 'total', number>>;
  };
  readonly afirmaciones: {
    readonly total: number;
    readonly estado: Readonly<Record<'verificada' | 'pendiente' | 'retirada', number>>;
    readonly revision: Readonly<
      Record<'noRequiere' | 'revisada' | 'rechazada' | 'pendiente', number>
    >;
    readonly pendientes: readonly RecuentoPendiente[];
    readonly pendientesPosterioresATanda3: number;
  };
  readonly tandas: {
    /** Revisiones con su referencia literal («Revisión del 14-11-2026», «Tanda 3, parte A»…). */
    readonly gruposRevisados: readonly RecuentoGrupoRevision[];
    readonly tanda3: {
      /** Fecha de las respuestas (`AAAA-MM-DD`), tomada de `docs/ESTADO_AJUSTES_ACTUARIALES_3.md`. */
      readonly fecha: string | null;
      readonly preguntas: number;
      readonly filasRevisadas: number;
      readonly filasPendientes: number;
      /** Preguntas con una fila revisada y otra pendiente (una pregunta separada en dos afirmaciones). */
      readonly preguntasSeparadas: number;
      readonly partes: readonly RecuentoParteTanda[];
    };
  };
  readonly lecturas: {
    readonly total: number;
    readonly estado: Readonly<Record<'decidida' | 'provisional' | 'pendiente', number>>;
    readonly porMotor: readonly RecuentoLecturasMotor[];
    readonly porFecha: readonly { readonly fecha: string; readonly lecturas: number }[];
  };
  readonly casosOro: {
    readonly total: number;
    readonly independientes: number;
    readonly derivados: number;
  };
  readonly auditoria: {
    readonly series: number;
    readonly porResultado: readonly { readonly resultado: string; readonly series: number }[];
    readonly fecha: string | null;
  };
  readonly urls: {
    readonly muestra: number;
    readonly porEstado: readonly { readonly estado: string; readonly urls: number }[];
    readonly fecha: string | null;
  };
  readonly pruebas: { readonly ficheros: number; readonly conListasDeTerminos: number };
  readonly reproduccion: {
    /** Versión mínima de Node que declara `package.json` (`engines`), o `null`. */
    readonly node: string | null;
    /** Comandos del apartado «Comandos» de `CLAUDE.md`, con su comentario. */
    readonly comandos: readonly { readonly comando: string; readonly comentario: string }[];
    /** Comandos de regeneración que constan en `data/README.md`. */
    readonly regenerarFuentes: readonly string[];
    /** Comando que regenera las salidas de los modelos (`data/proyecciones/README.md`). */
    readonly regenerarModelos: string | null;
    /** Comandos de ejecución de los modelos (`modelos/README.md`). */
    readonly ejecutarModelos: readonly string[];
  };
  readonly etl: { readonly ficheros: number };
  readonly modelos: readonly RecuentoModelo[];
  readonly listasDeTerminos: EntradasMetodologia['listasDeTerminos'];
}

type Objeto = Record<string, unknown>;

const esObjeto = (v: unknown): v is Objeto =>
  typeof v === 'object' && v !== null && !Array.isArray(v);
const lista = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
const texto = (v: unknown): string => (typeof v === 'string' ? v : '');

function contar<T>(items: readonly T[], clave: (t: T) => string): Map<string, number> {
  const m = new Map<string, number>();
  for (const i of items) m.set(clave(i), (m.get(clave(i)) ?? 0) + 1);
  return m;
}

function ordenado(m: Map<string, number>): [string, number][] {
  return [...m.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'es'));
}

/** Filas de la tabla de fuentes de `docs/FUENTES.md` (antes de la tabla de huellas). */
export function filasDeFuentes(fuentesMd: string): { organismo: string; url: string }[] {
  const parteFuentes = fuentesMd.split('## Huellas')[0] ?? '';
  const filas: { organismo: string; url: string }[] = [];
  for (const linea of parteFuentes.split('\n')) {
    if (!linea.startsWith('|')) continue;
    const celdas = linea.split('|').map((c) => c.trim());
    const url = /^<(https?:\/\/[^>]+)>$/.exec(celdas[3] ?? '')?.[1];
    if (url !== undefined) filas.push({ organismo: celdas[1] ?? '', url });
  }
  return filas;
}

/** Objetos con un campo `confidence` válido, en cualquier punto del JSON. */
function contarConfianzas(json: unknown, acumulado: Record<NivelConfianza, number>): void {
  if (Array.isArray(json)) {
    for (const e of json) contarConfianzas(e, acumulado);
  } else if (esObjeto(json)) {
    const c = json['confidence'];
    if (c === 'alta' || c === 'media' || c === 'baja') acumulado[c] += 1;
    for (const v of Object.values(json)) contarConfianzas(v, acumulado);
  }
}

function recuentoDatos(e: EntradasMetodologia): RecuentosMetodologia['datos'] {
  const json = e.ficherosData.filter((f) => f.endsWith('.json'));
  const csv = e.ficherosData.filter((f) => f.endsWith('.csv'));
  const carpetas = new Set([...json, ...csv].map((f) => f.split('/')[0] ?? ''));
  const porCarpeta = [...carpetas]
    .sort((a, b) => a.localeCompare(b, 'es'))
    .map((carpeta) => ({
      carpeta,
      json: json.filter((f) => f.startsWith(`${carpeta}/`)).length,
      csv: csv.filter((f) => f.startsWith(`${carpeta}/`)).length,
    }));
  const confianzas: Record<NivelConfianza, number> = { alta: 0, media: 0, baja: 0 };
  for (const f of e.datosJson) contarConfianzas(f.json, confianzas);
  return {
    ficheros: json.length + csv.length,
    json: json.length,
    csv: csv.length,
    porCarpeta,
    elementosConConfianza: {
      ...confianzas,
      total: confianzas.alta + confianzas.media + confianzas.baja,
    },
  };
}

interface FilaTanda {
  readonly n: number;
  readonly parte: string;
  readonly id: string;
  readonly estado: string;
}

function filasTanda(v: unknown): FilaTanda[] {
  return lista(esObjeto(v) ? v['filas'] : [])
    .filter(esObjeto)
    .map((f) => ({
      n: Number(f['n']),
      parte: texto(f['parte']),
      id: texto(f['id']),
      estado: texto(f['estado']),
    }));
}

/** «2026-11-16» a partir de «respuestas del 16-11-2026»; `null` si no consta. */
function fechaDeLasRespuestas(md: string): string | null {
  const m = /respuestas del (\d{2})-(\d{2})-(\d{4})/.exec(md);
  return m === null ? null : `${m[3]}-${m[2]}-${m[1]}`;
}

function recuentoAfirmaciones(e: EntradasMetodologia): {
  afirmaciones: RecuentosMetodologia['afirmaciones'];
  grupos: RecuentoGrupoRevision[];
  porParte: Map<string, number>;
} {
  const registro = esObjeto(e.claims) ? e.claims : {};
  const porDefecto = texto(registro['revisionActuarialPorDefecto']) || 'pendiente';
  const claims = lista(registro['claims']).filter(esObjeto);
  const estado = { verificada: 0, pendiente: 0, retirada: 0 };
  const revision = { noRequiere: 0, revisada: 0, rechazada: 0, pendiente: 0 };
  const idsTanda3 = new Set(filasTanda(e.aplicacionTanda3).map((f) => f.id));
  const pendientes: RecuentoPendiente[] = [];
  const referencias: string[] = [];
  for (const c of claims) {
    const est = texto(c['estado']);
    if (est === 'verificada' || est === 'pendiente' || est === 'retirada') estado[est] += 1;
    const rev = texto(c['revisionActuarial']) || porDefecto;
    if (rev === 'no-requiere') revision.noRequiere += 1;
    else if (rev === 'revisada') revision.revisada += 1;
    else if (rev === 'rechazada') revision.rechazada += 1;
    else if (rev === 'pendiente') {
      revision.pendiente += 1;
      pendientes.push({
        id: texto(c['id']),
        ubicacion: texto(c['ubicacion']),
        pregunta: texto(c['preguntaActuarial']),
        posteriorATanda3: !idsTanda3.has(texto(c['id'])),
      });
    }
    const respuesta = texto(c['respuestaActuarial']);
    if (rev === 'revisada' && respuesta !== '') {
      const m = /^(Tanda \d+, parte [A-Z]|Revisión del \d{2}-\d{2}-\d{4})/.exec(respuesta);
      if (m !== null) referencias.push(m[1] ?? '');
    }
  }
  const grupos = [...contar(referencias, (r) => r).entries()]
    .sort((a, b) => a[0].localeCompare(b[0], 'es'))
    .map(([referencia, afirmaciones]) => ({ referencia, afirmaciones }));
  const porParte = new Map<string, number>();
  for (const g of grupos) {
    const m = /^Tanda 3, parte ([A-Z])$/.exec(g.referencia);
    if (m !== null) porParte.set(m[1] ?? '', g.afirmaciones);
  }
  return {
    afirmaciones: {
      total: claims.length,
      estado,
      revision,
      pendientes,
      pendientesPosterioresATanda3: pendientes.filter((p) => p.posteriorATanda3).length,
    },
    grupos,
    porParte,
  };
}

function recuentoTanda3(
  e: EntradasMetodologia,
  porParte: Map<string, number>,
): RecuentosMetodologia['tandas']['tanda3'] {
  const filas = filasTanda(e.aplicacionTanda3);
  const partes = [...new Set(filas.map((f) => f.parte))].sort().map((parte) => {
    const deLaParte = filas.filter((f) => f.parte === parte);
    return {
      parte,
      preguntasRevisadas: new Set(deLaParte.filter((f) => f.estado === 'revisada').map((f) => f.n))
        .size,
      preguntasPendientes: new Set(
        deLaParte.filter((f) => f.estado === 'pendiente').map((f) => f.n),
      ).size,
      afirmacionesRevisadas: porParte.get(parte) ?? 0,
    };
  });
  return {
    fecha: fechaDeLasRespuestas(e.estadoAjustes3Md),
    preguntas: new Set(filas.map((f) => f.n)).size,
    filasRevisadas: filas.filter((f) => f.estado === 'revisada').length,
    filasPendientes: filas.filter((f) => f.estado === 'pendiente').length,
    preguntasSeparadas: [...new Set(filas.map((f) => f.n))].filter((n) => {
      const suyas = filas.filter((f) => f.n === n);
      return (
        suyas.some((f) => f.estado === 'revisada') && suyas.some((f) => f.estado === 'pendiente')
      );
    }).length,
    partes,
  };
}

function recuentoLecturas(e: EntradasMetodologia): RecuentosMetodologia['lecturas'] {
  const lecturas = lista(esObjeto(e.lecturas) ? e.lecturas['lecturas'] : []).filter(esObjeto);
  const estado = { decidida: 0, provisional: 0, pendiente: 0 };
  for (const l of lecturas) {
    const s = texto(l['estado']);
    if (s === 'decidida' || s === 'provisional' || s === 'pendiente') estado[s] += 1;
  }
  const motores = [...new Set(lecturas.map((l) => texto(l['id']).split('.')[0] ?? ''))].sort();
  const porMotor = motores.map((motor) => {
    const suyas = lecturas.filter((l) => texto(l['id']).startsWith(`${motor}.`));
    const cuenta = (s: string) => suyas.filter((l) => l['estado'] === s).length;
    return {
      motor,
      total: suyas.length,
      decidida: cuenta('decidida'),
      provisional: cuenta('provisional'),
      pendiente: cuenta('pendiente'),
    };
  });
  const porFecha = [...contar(lecturas, (l) => texto(l['fecha'])).entries()]
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([fecha, n]) => ({ fecha, lecturas: n }));
  return { total: lecturas.length, estado, porMotor, porFecha };
}

function recuentoCasosOro(md: string): RecuentosMetodologia['casosOro'] {
  const fila = md.split('\n').find((l) => l.startsWith('| **Total**'));
  const celdas = (fila ?? '').split('|').map((c) => Number(c.replace(/\*/g, '').trim()));
  return { total: celdas[2] ?? 0, independientes: celdas[3] ?? 0, derivados: celdas[4] ?? 0 };
}

function recuentoModelos(e: EntradasMetodologia): RecuentoModelo[] {
  const documentados = e.descripcionesModelos
    .map((d) => ({ modelo: /^(M\d+)_descripcion\.md$/.exec(d.fichero)?.[1], titulo: d.titulo }))
    .filter((d): d is { modelo: string; titulo: string } => d.modelo !== undefined)
    .sort((a, b) => Number(a.modelo.slice(1)) - Number(b.modelo.slice(1)));
  return documentados.map(({ modelo, titulo }) => {
    const suyos = e.datosJson
      .filter((f) => f.ruta.startsWith('proyecciones/') && esObjeto(f.json))
      .map((f) => f.json as Objeto)
      .filter((j) => esObjeto(j['modelo']) && texto(j['modelo']['id']).toUpperCase() === modelo);
    const confianzas = [...new Set(suyos.map((j) => texto(j['confidence'])))];
    const nivel = confianzas.length === 1 ? confianzas[0] : undefined;
    const fechas = suyos.map((j) => texto(j['fetchedAt'])).sort();
    return {
      modelo,
      titulo: titulo.replace(/^#\s*/, '').split(':')[0] ?? titulo,
      ficheros: suyos.length,
      confianza: nivel === 'alta' || nivel === 'media' || nivel === 'baja' ? nivel : null,
      ejecutadoEl: fechas[fechas.length - 1] ?? null,
      legislacionCongelada:
        suyos.length > 0 &&
        suyos.every(
          (j) => esObjeto(j['escenario']) && j['escenario']['legislacion'] === 'congelada',
        ),
    };
  });
}

/** Líneas `comando   # comentario` del primer bloque de código del apartado «Comandos» de CLAUDE.md. */
function comandosDeLasReglas(md: string): { comando: string; comentario: string }[] {
  const apartado = md.split(/^## Comandos\s*$/m)[1] ?? '';
  const bloque = /```bash\n([\s\S]*?)```/.exec(apartado)?.[1] ?? '';
  return bloque
    .split('\n')
    .filter((l) => l.trim() !== '')
    .map((l) => {
      const [comando = '', ...resto] = l.split('#');
      return { comando: comando.trim(), comentario: resto.join('#').trim() };
    });
}

/** Líneas de los bloques de código `bash` de un apartado de un LEEME (los comentarios `#` se descartan). */
function bloquesDeApartado(md: string, encabezado: string): string[] {
  const cuerpo = md.split(/^## /m).find((a) => a.startsWith(encabezado)) ?? '';
  return [...cuerpo.matchAll(/```bash\n([\s\S]*?)```/g)]
    .flatMap((m) => (m[1] ?? '').split('\n'))
    .map((l) => l.split('#')[0]?.trim() ?? '')
    .filter((l) => l !== '');
}

function recuentoReproduccion(e: EntradasMetodologia): RecuentosMetodologia['reproduccion'] {
  const motor = esObjeto(e.paquete) && esObjeto(e.paquete['engines']) ? e.paquete['engines'] : {};
  const nodo = texto(motor['node']).replace(/^[^\d]*/, '');
  const regenerar = /`(python3 -I scripts\/etl\/modelos_salidas\.py)`/.exec(e.leemeProyeccionesMd);
  const ejecucion = /^Ejecución \(desde la carpeta de cada modelo\):(.*)$/m.exec(e.leemeModelosMd);
  return {
    node: nodo === '' ? null : nodo,
    comandos: comandosDeLasReglas(e.reglasMd),
    regenerarFuentes: bloquesDeApartado(e.leemeDatosMd, 'Regenerar `docs/FUENTES.md`'),
    regenerarModelos: regenerar?.[1] ?? null,
    ejecutarModelos: [...((ejecucion?.[1] ?? '').split('. ')[0] ?? '').matchAll(/`([^`]+)`/g)].map(
      (m) => m[1] ?? '',
    ),
  };
}

export function calcularRecuentos(e: EntradasMetodologia): RecuentosMetodologia {
  const filasFuentes = filasDeFuentes(e.fuentesMd);
  const porOrganismo = ordenado(contar(filasFuentes, (f) => f.organismo)).map(
    ([organismo, fuentes]) => ({ organismo, fuentes }),
  );
  const { afirmaciones, grupos, porParte } = recuentoAfirmaciones(e);
  const registros = lista(esObjeto(e.auditoria) ? e.auditoria['registros'] : []).filter(esObjeto);
  const urls = lista(esObjeto(e.comprobacionUrls) ? e.comprobacionUrls['resultados'] : []).filter(
    esObjeto,
  );
  return {
    fuentes: {
      distintas: new Set(filasFuentes.map((f) => f.url)).size,
      organismos: porOrganismo.length,
      porOrganismo,
    },
    datos: recuentoDatos(e),
    afirmaciones,
    tandas: { gruposRevisados: grupos, tanda3: recuentoTanda3(e, porParte) },
    lecturas: recuentoLecturas(e),
    casosOro: recuentoCasosOro(e.casosOroMd),
    auditoria: {
      series: registros.length,
      porResultado: ordenado(contar(registros, (r) => texto(r['resultado']))).map(
        ([resultado, series]) => ({ resultado, series }),
      ),
      fecha: esObjeto(e.auditoria) ? texto(e.auditoria['generado']) || null : null,
    },
    urls: {
      muestra: urls.length,
      porEstado: ordenado(contar(urls, (r) => texto(r['estado']))).map(([estado, n]) => ({
        estado,
        urls: n,
      })),
      fecha: esObjeto(e.comprobacionUrls) ? texto(e.comprobacionUrls['fecha']) || null : null,
    },
    pruebas: { ficheros: e.ficherosTest.length, conListasDeTerminos: e.pruebasConListas.length },
    reproduccion: recuentoReproduccion(e),
    etl: { ficheros: e.ficherosEtl.length },
    modelos: recuentoModelos(e),
    listasDeTerminos: e.listasDeTerminos,
  };
}
