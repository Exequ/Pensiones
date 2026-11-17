/**
 * Lectura de los ficheros del repositorio que alimentan los recuentos de la página «Metodología».
 * Solo Node: la lógica de los recuentos está en `src/engine/metodologia.ts` (función pura). La usan
 * `vite.config.ts` (módulo virtual `virtual:recuentos-metodologia`) y las pruebas.
 */
import { readdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import type { EntradasMetodologia, FicheroDatos } from '../../src/engine/metodologia.ts';
import {
  PALABRAS_DE_VALORACION,
  PALABRAS_DE_VALORACION_REFORMAS,
  PALABRAS_DE_VEREDICTO,
} from './valoraciones.ts';

/** Rutas relativas (con barras) de los ficheros de una carpeta, de forma recursiva y ordenadas. */
export function ficherosDe(raiz: string, carpeta: string): string[] {
  const salida: string[] = [];
  const recorrer = (relativa: string) => {
    for (const e of readdirSync(path.join(raiz, carpeta, relativa), { withFileTypes: true })) {
      const ruta = relativa === '' ? e.name : `${relativa}/${e.name}`;
      if (e.isDirectory()) {
        if (e.name !== 'node_modules' && e.name !== '__pycache__') recorrer(ruta);
      } else salida.push(ruta);
    }
  };
  recorrer('');
  return salida.sort();
}

const leerTexto = (raiz: string, ruta: string) => readFileSync(path.join(raiz, ruta), 'utf8');
const leerJson = (raiz: string, ruta: string): unknown => JSON.parse(leerTexto(raiz, ruta));

/** Ficheros que alimentan la página, para que `vite.config.ts` los vigile en desarrollo. */
export const FICHEROS_DE_ENTRADA = [
  'docs/FUENTES.md',
  'docs/claims.json',
  'docs/revision-actuarial/aplicacion-tanda3.json',
  'docs/ESTADO_AJUSTES_ACTUARIALES_3.md',
  'src/engine/config/lecturas-por-defecto.json',
  'docs/INVENTARIO_CASOS_ORO.md',
  'docs/auditoria-independiente.json',
  'docs/comprobacion-urls.json',
  'package.json',
  'CLAUDE.md',
  'data/README.md',
  'data/proyecciones/README.md',
  'modelos/README.md',
] as const;

export function leerEntradasMetodologia(raiz: string): EntradasMetodologia {
  const ficherosData = ficherosDe(raiz, 'data');
  const datosJson: FicheroDatos[] = ficherosData
    .filter((f) => f.endsWith('.json'))
    .map((ruta) => ({ ruta, json: leerJson(raiz, `data/${ruta}`) }));
  const prueba = (f: string) => /\.test\.tsx?$/.test(f);
  const ficherosTest = [
    ...ficherosDe(raiz, 'src')
      .filter(prueba)
      .map((f) => `src/${f}`),
    ...ficherosDe(raiz, 'scripts')
      .filter(prueba)
      .map((f) => `scripts/${f}`),
  ];
  return {
    fuentesMd: leerTexto(raiz, 'docs/FUENTES.md'),
    ficherosData,
    datosJson,
    claims: leerJson(raiz, 'docs/claims.json'),
    aplicacionTanda3: leerJson(raiz, 'docs/revision-actuarial/aplicacion-tanda3.json'),
    estadoAjustes3Md: leerTexto(raiz, 'docs/ESTADO_AJUSTES_ACTUARIALES_3.md'),
    lecturas: leerJson(raiz, 'src/engine/config/lecturas-por-defecto.json'),
    casosOroMd: leerTexto(raiz, 'docs/INVENTARIO_CASOS_ORO.md'),
    auditoria: leerJson(raiz, 'docs/auditoria-independiente.json'),
    comprobacionUrls: leerJson(raiz, 'docs/comprobacion-urls.json'),
    ficherosTest: [
      ...ficherosDe(raiz, 'src')
        .filter(prueba)
        .map((f) => `src/${f}`),
      ...ficherosDe(raiz, 'scripts')
        .filter(prueba)
        .map((f) => `scripts/${f}`),
    ],
    ficherosEtl: ficherosDe(raiz, 'scripts/etl')
      .filter((f) => f.endsWith('.py') && !f.includes('/') && !f.startsWith('test_'))
      .map((f) => `scripts/etl/${f}`),
    descripcionesModelos: ficherosDe(raiz, 'docs/modelos').map((fichero) => ({
      fichero,
      titulo: leerTexto(raiz, `docs/modelos/${fichero}`).split('\n')[0] ?? '',
    })),
    pruebasConListas: ficherosTest.filter((f) => /lib\/valoraciones/.test(leerTexto(raiz, f))),
    paquete: leerJson(raiz, 'package.json'),
    reglasMd: leerTexto(raiz, 'CLAUDE.md'),
    leemeDatosMd: leerTexto(raiz, 'data/README.md'),
    leemeProyeccionesMd: leerTexto(raiz, 'data/proyecciones/README.md'),
    leemeModelosMd: leerTexto(raiz, 'modelos/README.md'),
    listasDeTerminos: {
      valoracion: PALABRAS_DE_VALORACION.length,
      valoracionReformas: PALABRAS_DE_VALORACION_REFORMAS.length,
      veredicto: PALABRAS_DE_VEREDICTO.length,
    },
  };
}
