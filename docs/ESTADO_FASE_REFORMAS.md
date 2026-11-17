# Estado de la fase «Reformas»

Rama `feat/fase-reformas`, creada desde `origin/main` (`c607ee94ebd4fd2652fc595555d46f4be486c923`, el PR #46; el CI y el despliegue de ese commit estaban en verde: ejecución 117 de «CI» y de «Despliegue en GitHub Pages»). Sustituye el marcador en construcción de la sección «Reformas» por una cronología con una ficha por norma. **No se ha cambiado el motor, «Tu pensión», «Proyecciones», `data-raw/` ni `modelos/`** (solo el texto de las limitaciones del Reglamento de 1956, paso 7 del encargo).

## Qué muestra la página

- Una línea del tiempo (lista ordenada por fecha de aprobación, sin otro criterio) y diecinueve fichas con la misma estructura: la norma (rango, aprobación, publicación, entrada en vigor con su base y su cita, si hay texto completo en el repositorio), qué cambia (artículo o disposición, antes, después y cita literal), parámetros afectados con el valor anterior y el posterior de `/data` (y el aviso de que un cambio de parámetro no equivale a un efecto sobre la pensión de una persona), calendario de aplicación (transición y tabla), enlaces a «Cómo se calcula», «Tipos de pensión» y la hucha, y la línea de fuente.
- Tres gráficos de parámetros que cambian con el calendario (edad ordinaria de jubilación, periodo de cálculo de la base reguladora y cotización con la que se alcanza el máximo de la escala), con su tabla de datos, fuente, definición y «Cómo leerlo».
- Detalle de cada norma, de lo respaldado y de lo que no: `docs/INVENTARIO_REFORMAS.md`.

## Datos

- Se reutiliza `data/normativa/cronologia.json`; se le añaden `entradaEnVigor` y `textoDescargado` por norma (`scripts/etl/cronologia_vigor.py`). Once normas tienen fecha de entrada en vigor respaldada (cinco con la disposición final del texto descargado) y ocho declaran «No consta en los textos descargados».
- Valores antes y después de `/data`: `edad-ordinaria-jubilacion`, `periodo-calculo-base-reguladora` y `cotizacion-para-100` (Ley 27/2011 y RDL 2/2023, y valores de 2000 a 2002 de la Ley 24/1997), `mei-tipo-total` y `cuota-solidaridad-calendario` (RDL 2/2023), `jubilacion-demora-reglas` (Ley 21/2021), `carencia-jubilacion` y `edad-ordinaria-jubilacion` en 2000 (RDLeg 1/1994) y `revalorizacion-general` (RDL 28/2012, RDL 28/2018, RD 316/2025 y RD 241/2026). Las demás normas dicen que no hay serie en `/data`.
- Pendientes de datos y descargas manuales: `docs/PENDIENTE_DATOS.md` y `docs/DESCARGAS_MANUALES.md`, secciones «Fase “Reformas”».

## Neutralidad y estructura homogénea

- Los resúmenes y las descripciones de la cronología se reescribieron sin calificativos ni finalidades que no constan en la cita literal.
- `PALABRAS_DE_VALORACION_REFORMAS` (`scripts/lib/valoraciones.ts`) recoge «recorte», «blindaje», «contrarreforma», «histórica», «necesaria», «injusta», «insuficiente» y otros; los tests la aplican al texto renderizado de la página (sin los títulos oficiales ni las citas literales), a los campos propios de la cronología y al código de la página.
- Un test comprueba que todas las normas y todos los cambios tienen los mismos campos y que todas las fichas tienen los mismos apartados, las mismas tres fechas, una cita por cambio, el aviso y la fuente.

## Pruebas

- Unitarios: `src/modules/reformas/datos-reformas.test.ts` (ids de `/data`, valores antes y después contra el JSON sin tratar, gráficos) y `scripts/reformas-fase.test.ts` (procedencia, entrada en vigor, citas contra los textos descargados, sin cifras escritas a mano, neutralidad, afirmaciones, inventario y pendientes).
- Componentes: `src/modules/reformas/pagina.test.tsx` (estructura de cada ficha, mismos apartados, tablas, enlaces, navegación con teclado, números, neutralidad).
- Playwright: `e2e/reformas.spec.ts`.

## Tamaño del chunk de la página

`dist/assets/Pagina-CwWuaXUn.js`: 23.386 bytes (6.659 bytes comprimidos con gzip), propio de la página y cargado solo al visitarla (`lazy` en `src/modules/paginas.ts`). Arrastra además trozos de datos y de código compartidos: `cronologia-wM_g9Q2K.js` (65.107 bytes; 15.216 comprimidos), `periodo-calculo-base-reguladora-21G6EkHA.js` (145.071 bytes; 8.604 comprimidos), `esquema-datos-Cz-J7WXK.js` (113.151 bytes; 32.426 comprimidos), el de `revalorizacion-general` y el de `GraficoSeries` con Observable Plot, compartido con las páginas históricas. No carga el motor ni `limitaciones-*.js` (1,6 MB), y el trozo principal (`index-*.js`, 275.991 bytes) no cambia de tamaño. La CSS de la página ocupa 4.144 bytes.

## Revisión de capturas

A 1360 y a 390 px se revisaron la cabecera con el alcance, la línea del tiempo, la ficha de la Ley 27/2011 (con tablas y «Cómo leerlo» abiertos) y los gráficos: sin desbordes, sin errores de consola y con el mismo orden de apartados en las dos anchuras.

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`) en verde.
- `npx tsc -b --force` (sin caché incremental, con los ficheros de test) sin errores.
- `npm test`: 132 ficheros y 2.904 pruebas en verde (antes de la fase, 129 y 2.814).
- `npm run build` correcto.
- Playwright completo: 538 pruebas en verde (escritorio y móvil, 17,2 minutos), de ellas 24 de `e2e/reformas.spec.ts`; las 514 anteriores siguen pasando.

## CI y despliegue

El resultado del CI del PR y del despliegue de `main`, y la comprobación de la ruta publicada a 1360 y 390 px, constan en el informe final de la sesión y no en este fichero, para no abrir un PR solo de documentación (misma práctica que las fases anteriores).
