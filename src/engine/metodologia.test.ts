import { describe, expect, it } from 'vitest';
import { calcularRecuentos, filasDeFuentes, type EntradasMetodologia } from './metodologia';

/** Entradas mínimas y pequeñas, con resultados que se cuentan a mano. */
const FUENTES = [
  '# Fuentes',
  '',
  '| Organismo | Documento | URL | Descargado | Ficheros |',
  '| --- | --- | --- | --- | --- |',
  '| BOE | Ley A | <https://boe.es/a> | 2026-01-01 | x.json |',
  '| BOE | Ley B | <https://boe.es/b> | 2026-01-01 | x.json |',
  '| INE | Tabla | <https://ine.es/t> | 2026-01-01 | y.json |',
  '',
  '## Huellas de los ficheros brutos (tablas)',
  '',
  '| Tabla | Periodo | URL | SHA-256 |',
  '| --- | --- | --- | --- |',
  '| t | 2025 | <https://ine.es/huella> | `abc` |',
].join('\n');

const entradas: EntradasMetodologia = {
  fuentesMd: FUENTES,
  ficherosData: ['a/x.json', 'a/y.csv', 'b/z.json', 'b/LEEME.md'],
  datosJson: [
    { ruta: 'a/x.json', json: { data: [{ confidence: 'alta' }, { confidence: 'media' }] } },
    { ruta: 'b/z.json', json: { series: [{ confidence: 'baja', otra: { confidence: 'alta' } }] } },
    {
      ruta: 'proyecciones/m1-a.json',
      json: {
        modelo: { id: 'm1' },
        confidence: 'media',
        fetchedAt: '2026-11-14',
        escenario: { legislacion: 'congelada' },
      },
    },
    {
      ruta: 'proyecciones/m1-b.json',
      json: {
        modelo: { id: 'm1' },
        confidence: 'media',
        fetchedAt: '2026-11-16',
        escenario: { legislacion: 'congelada' },
      },
    },
  ],
  claims: {
    revisionActuarialPorDefecto: 'no-requiere',
    claims: [
      { id: 'a', estado: 'verificada' },
      {
        id: 'b',
        estado: 'verificada',
        revisionActuarial: 'revisada',
        respuestaActuarial: 'Tanda 3, parte A, n.º 1',
      },
      {
        id: 'c',
        estado: 'pendiente',
        revisionActuarial: 'revisada',
        respuestaActuarial: 'Revisión del 14-11-2026',
      },
      {
        id: 'd',
        estado: 'pendiente',
        revisionActuarial: 'pendiente',
        ubicacion: 'u',
        preguntaActuarial: 'p',
      },
      {
        id: 'e',
        estado: 'pendiente',
        revisionActuarial: 'pendiente',
        ubicacion: 'u',
        preguntaActuarial: 'q',
      },
    ],
  },
  aplicacionTanda3: {
    filas: [
      { n: 1, parte: 'A', id: 'b', estado: 'revisada' },
      { n: 2, parte: 'A', id: 'd', estado: 'pendiente' },
      { n: 3, parte: 'B', id: 'x', estado: 'revisada' },
      { n: 3, parte: 'B', id: 'y', estado: 'pendiente' },
    ],
  },
  estadoAjustes3Md: 'Tercera tanda (respuestas del 16-11-2026).',
  lecturas: {
    lecturas: [
      { id: 'jubilacion.a', estado: 'decidida', fecha: '2026-11-13' },
      { id: 'jubilacion.b', estado: 'pendiente', fecha: '2026-11-16' },
      { id: 'mei.c', estado: 'provisional', fecha: '2026-11-16' },
    ],
  },
  casosOroMd: '| Motor | Casos |\n| **Total** | **10** | **4** | **6** | | |',
  auditoria: {
    generado: '2026-11-13',
    registros: [{ resultado: 'coincide' }, { resultado: 'difiere' }],
  },
  comprobacionUrls: { fecha: '2026-11-11', resultados: [{ estado: 'responde' }] },
  ficherosTest: ['src/a.test.ts', 'scripts/b.test.ts'],
  ficherosEtl: ['scripts/etl/a.py'],
  descripcionesModelos: [
    { fichero: 'M2_descripcion.md', titulo: '# M2 · Dos: pregunta' },
    { fichero: 'M1_descripcion.md', titulo: '# M1 · Uno: pregunta' },
    { fichero: 'M1_v2_descripcion.md', titulo: '# otro' },
  ],
  pruebasConListas: ['scripts/b.test.ts'],
  paquete: { engines: { node: '>=22.12.0' } },
  reglasMd: '## Comandos\n\n```bash\nnpm test  # Vitest\n```\n',
  leemeDatosMd:
    '## Regenerar `docs/FUENTES.md`\n\n```bash\nnpm ci  # uno\npython3 -I x.py\n```\n\n## Formato\n',
  leemeProyeccionesMd: 'Paso: `python3 -I scripts/etl/modelos_salidas.py` (lee)',
  leemeModelosMd:
    'Ejecución (desde la carpeta de cada modelo): `a`, `b`. Las salidas `.csv` no se versionan.',
  listasDeTerminos: { valoracion: 3, valoracionReformas: 2, veredicto: 1 },
};

describe('calcularRecuentos', () => {
  const r = calcularRecuentos(entradas);

  it('cuenta las fuentes del registro y no las huellas', () => {
    expect(filasDeFuentes(FUENTES)).toHaveLength(3);
    expect(r.fuentes).toEqual({
      distintas: 3,
      organismos: 2,
      porOrganismo: [
        { organismo: 'BOE', fuentes: 2 },
        { organismo: 'INE', fuentes: 1 },
      ],
    });
  });

  it('cuenta los ficheros de datos y los elementos con confianza, también los anidados', () => {
    expect(r.datos.json).toBe(2);
    expect(r.datos.csv).toBe(1);
    expect(r.datos.porCarpeta).toEqual([
      { carpeta: 'a', json: 1, csv: 1 },
      { carpeta: 'b', json: 1, csv: 0 },
    ]);
    expect(r.datos.elementosConConfianza).toEqual({ alta: 2, media: 3, baja: 1, total: 6 });
  });

  it('cuenta las afirmaciones por estado y por revisión, y lista las pendientes una a una', () => {
    expect(r.afirmaciones.total).toBe(5);
    expect(r.afirmaciones.estado).toEqual({ verificada: 2, pendiente: 3, retirada: 0 });
    expect(r.afirmaciones.revision).toEqual({
      noRequiere: 1,
      revisada: 2,
      rechazada: 0,
      pendiente: 2,
    });
    expect(r.afirmaciones.pendientes.map((p) => [p.id, p.posteriorATanda3])).toEqual([
      ['d', false],
      ['e', true],
    ]);
    expect(r.afirmaciones.pendientesPosterioresATanda3).toBe(1);
  });

  it('cuenta las tandas por referencia y por parte', () => {
    expect(r.tandas.gruposRevisados).toEqual([
      { referencia: 'Revisión del 14-11-2026', afirmaciones: 1 },
      { referencia: 'Tanda 3, parte A', afirmaciones: 1 },
    ]);
    expect(r.tandas.tanda3).toMatchObject({
      fecha: '2026-11-16',
      preguntas: 3,
      filasRevisadas: 2,
      filasPendientes: 2,
      preguntasSeparadas: 1,
    });
    expect(r.tandas.tanda3.partes).toEqual([
      { parte: 'A', preguntasRevisadas: 1, preguntasPendientes: 1, afirmacionesRevisadas: 1 },
      { parte: 'B', preguntasRevisadas: 1, preguntasPendientes: 1, afirmacionesRevisadas: 0 },
    ]);
  });

  it('cuenta las lecturas por estado, motor y fecha', () => {
    expect(r.lecturas.estado).toEqual({ decidida: 1, provisional: 1, pendiente: 1 });
    expect(r.lecturas.porMotor).toEqual([
      { motor: 'jubilacion', total: 2, decidida: 1, provisional: 0, pendiente: 1 },
      { motor: 'mei', total: 1, decidida: 0, provisional: 1, pendiente: 0 },
    ]);
    expect(r.lecturas.porFecha).toEqual([
      { fecha: '2026-11-13', lecturas: 1 },
      { fecha: '2026-11-16', lecturas: 2 },
    ]);
  });

  it('lee la fila de totales de los casos de oro, la auditoría y las direcciones', () => {
    expect(r.casosOro).toEqual({ total: 10, independientes: 4, derivados: 6 });
    expect(r.auditoria.series).toBe(2);
    expect(r.urls.porEstado).toEqual([{ estado: 'responde', urls: 1 }]);
  });

  it('ordena los modelos por número, ignora los ficheros que no son descripciones y toma los metadatos', () => {
    expect(r.modelos.map((m) => m.modelo)).toEqual(['M1', 'M2']);
    expect(r.modelos[0]).toEqual({
      modelo: 'M1',
      titulo: 'M1 · Uno',
      ficheros: 2,
      confianza: 'media',
      ejecutadoEl: '2026-11-16',
      legislacionCongelada: true,
    });
    expect(r.modelos[1]).toMatchObject({ ficheros: 0, confianza: null, ejecutadoEl: null });
  });

  it('extrae los comandos y las versiones de los documentos', () => {
    expect(r.reproduccion).toEqual({
      node: '22.12.0',
      comandos: [{ comando: 'npm test', comentario: 'Vitest' }],
      regenerarFuentes: ['npm ci', 'python3 -I x.py'],
      regenerarModelos: 'python3 -I scripts/etl/modelos_salidas.py',
      ejecutarModelos: ['a', 'b'],
    });
    expect(r.pruebas).toEqual({ ficheros: 2, conListasDeTerminos: 1 });
    expect(r.etl.ficheros).toBe(1);
  });
});
