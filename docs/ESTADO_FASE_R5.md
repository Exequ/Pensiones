# Estado de la fase R5 «Tipos de pensión»

Rama `feat/r5-tipos-de-pension`, creada desde `origin/main` (`c82922bcee3ef3f5250dc90aa74e1b718b1fe30f`, PR [Exequ/Pensiones#54](https://github.com/Exequ/Pensiones/pull/54); CI y despliegue de ese commit en verde). Inventario: `docs/INVENTARIO_R5_TIPOS.md`. Decisiones: `docs/DECISIONES.md` («Fase R5»). No toca «Cómo se calcula», «Reformas», `modelos/`, `docs/modelos/`, `data-raw/` ni `docs/DISCREPANCIAS.md`; sin interpretaciones ni dependencias nuevas.

## Qué se hizo

- **Citas al desplegable «Fuentes»**: el cuerpo y las tablas de las siete fichas ya no muestran artículos, abreviaturas de normas, citas literales ni ubicaciones. `quitarCitas` (`src/engine/citas-normativas.ts`) saca el texto sin citas de los datos, que no cambian. Cada bloque tiene su línea de fuentes (quién puede cobrarla; requisitos con duración y compatibilidades; cálculo y límites; porcentajes; cuantías; número de pensiones; norma) con un `Dato` por fragmento (`location` = artículos) y un rótulo opcional (`DatoRotulado`) que el desplegable muestra como «Se refiere a». Los textos de introducción de la página, la nota al margen y `secciones.ts` dicen que las normas están en «Fuentes».
- **Requisitos**: la tabla pierde la columna «Norma»; el artículo de cada requisito está en el desplegable de esa tabla con la descripción del requisito como rótulo.
- **Jubilación**: sin la lista de modalidades; una frase con enlace a «Cómo se calcula». Ninguna otra ficha tenía lista de modalidades ni de grados con artículos.
- **Fórmulas legibles**: campo `calculo.formulaEstructurada` (esquema, `validate:data` y `scripts/formulas-datos.test.ts`), cifras solo por referencia a `data/parametros`; componente `Formula` (MathML nativo, leyenda de símbolos y de cifras, nombre accesible con la lectura de cada ecuación); ejemplo ficticio en `/diseno`. Aplicado a la jubilación ordinaria (fórmula completa, con calendario transitorio del divisor y del periodo leído de los datos) y al complemento de la gran incapacidad (parcial).
- **Afirmaciones**: tres actualizadas y dos nuevas en `docs/claims-web.json` y `docs/claims.json`.
- **Pruebas**: `src/engine/citas-normativas.test.ts`, `src/engine/formulas.test.ts`, `src/components/Formula.test.tsx`, `scripts/formulas-datos.test.ts`; `src/modules/tipos-de-pension/tipos.test.tsx` actualizado (sin columna «Norma», sin citas en el cuerpo, citas en cada desplegable, jubilación sin modalidades, fórmula y leyenda, nombres de fuentes únicos); `e2e/tipos-fuentes-formula.spec.ts` (1360 y 390 px, tres fichas, «Fuentes» de los requisitos, fórmula con leyenda y sin desborde, ampliación de gráficos, axe con la página y con «Fuentes» abierto).

## Qué quedó fuera y por qué

- **Fórmula estructurada en viudedad, orfandad, en favor de familiares, incapacidad parcial, total y absoluta, y no contributivas**: la norma no da una fórmula cerrada (porcentaje reglamentario, baremo reglamentario, cuantía fijada en normas de desarrollo, reglas de rentas y unidad económica). Se mantiene la regla en texto.
- **Modalidades de jubilación** (anticipada, demorada, activa, flexible y parcial): tienen fórmulas cerradas pero no se muestran en esta página; quedan para R6.
- **Enlace a un apartado concreto de «Cómo se calcula»**: no hay encabezado propio de modalidades con ancla y la página no se toca; el enlace lleva a la página.
- **Filas de las cuantías mínimas**: se conserva el rótulo de cada fila del Anexo I (identifica el importe); su cita completa y ubicación están en «Fuentes».

## Pendientes para Sergio

- **Actuariales**: confirmar que la leyenda de la fórmula de la jubilación (nombres, significados y unidades de BR, B, I, i, P y pensión) es la que se quiere publicar, y si la fórmula debe mostrarse con los valores transitorios del año en lugar de los del texto completo (hoy se muestran los del texto completo y, en la leyenda de cifras, el valor transitorio del año).
- **Descargas manuales**: ninguna.
- **Modelos**: ninguno.
- **Otros**: decidir el rótulo de las filas de las cuantías mínimas (hoy, el nombre de la fila del anexo); R6 debe corregir la frase de «Cómo se calcula» que remite a «Tipos de pensión» para «qué exige cada modalidad» y puede añadir un ancla de modalidades; si se vuelve a ejecutar `scripts/etl/prestaciones.py`, `formulaEstructurada` hay que reinsertarla.

## Batería local

- `npm run lint` (ESLint, Prettier, estilos, contraste, `validate:data` con la comprobación de las fórmulas y `validate:interpretaciones`) en verde.
- `npx tsc -b --force` (sin caché incremental, con los ficheros de test) sin errores.
- `npm test`: 161 ficheros y 3.245 pruebas en verde (antes de la fase, 157 y 3.200).
- `npm run build` correcto. Trozo principal `index-*.js`: 280.403 bytes (88.406 comprimidos con `gzip -c`); en `main`, 280.262 bytes: +141 bytes. `Formula` y el motor de fórmulas van en un trozo propio (`formulas-*.js`, 7.108 bytes, y su CSS, 1.685 bytes) que cargan las páginas que lo usan.
- Playwright completo en local: 720 en verde y 8 en rojo, **los mismos ocho de `e2e/sitio.spec.ts`** (`INPUT border-radius 50%` en `SegmentedPills`, propio del Chromium local, en `/diseno`, `/cotizantes-y-pensionistas`, `/financiacion-y-deficit` y `/hucha`, escritorio y móvil). El spec nuevo `e2e/tipos-fuentes-formula.spec.ts` (10 pruebas, 1360 y 390 px, con axe) en verde.
- Capturas a 1360 y 390 px de la ficha de jubilación (cuerpo, fórmula con leyenda y «Fuentes» de los requisitos abierto) revisadas: sin desbordes; la caja de la fórmula mide lo que la columna de texto.

## CI y despliegue

- **CI del PR** ([Exequ/Pensiones#55](https://github.com/Exequ/Pensiones/pull/55)): run 144 en verde sobre `03043dada43929129193d5ddb0411bb1b7c6d140` (todo el código de la fase): «Lint, tipos, tests, datos y compilación» e «Interfaz (Playwright)» completo. El commit siguiente solo añade este apartado. «Despliegue en GitHub Pages» del PR (run 144, evento `pull_request`): en verde.
- **Despliegue de `main` tras la fusión** y comprobación de la URL publicada (`/tipos-de-pension` a 1360 y 390 px, «Fuentes» de una tabla y la fórmula): constan en el informe final de la sesión (como en R3, R4, RA y RI).
