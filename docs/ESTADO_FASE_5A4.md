# Estado de la Fase 5-A4

Rama `feat/fase-5a4-descargas`, creada desde `origin/main` (`7aef595`, el commit con los cuatro PDF). Hecho: inventario, tres ETL reproducibles (liquidación de 2025, complementos por brecha de género y por maternidad, RDL 8/2010 y RD 1794/2010), contraste con datos ya cargados, y cambios en tres páginas («Tipos de pensión», «Hucha» y «Mitos y realidades»). No se ha tocado el motor, «Tu pensión», «Proyecciones», `data-raw/` ni `modelos/`. Inventario en `docs/INVENTARIO_5A4.md`, decisiones en `docs/DECISIONES.md` («Fase 5-A4»), diferencias en `docs/DISCREPANCIAS.md`, huecos en `docs/PENDIENTE_DATOS.md` y descargas en `docs/DESCARGAS_MANUALES.md`.

## Paso 0

Main actualizado (`7aef595`). Los cuatro ficheros existen; **el de género está en `data-raw/seg-social-fin/`, no en `data-raw/seg-social/`** como decía el encargo. Huellas SHA-256 calculadas hoy (no hay LEEME: pendiente para Sergio, sin referencia): género `499b1f7e…eda3`, liquidación de 2025 `ee831fa5…6034`, RDL 8/2010 `25b8e0e9…d2de` y RD 1794/2010 `205019a5…d12e`. CI de `main`: el del PR #44 (Mitos y realidades) en verde; el del commit de las descargas (`7aef595`) terminó en verde (ejecución número 110) y el despliegue de ese commit también (ejecución número 110 del workflow de despliegue).

## Qué es cada PDF y qué cierra

| PDF                                  | Qué es                                                                                                                                | Qué cierra                                                                                                          | Qué NO cierra (comprobado en el texto)                                                                                                                               |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `Brecha de género.pdf`               | Recuento de las pensiones en vigor a 1-10-2026 con complemento por brecha de género y por maternidad, por comunidad, provincia y sexo | Número e importe medio de los complementos por territorio y sexo (el encargo lo esperaba)                           | **La brecha publicada por año (DA 37.ª; n.º 44)**: «brecha de género» es allí el nombre del complemento; no hay serie anual ni brecha de las pensiones de jubilación |
| `2025_SISTEMA.pdf`                   | Liquidación del presupuesto del Sistema de la Seguridad Social de 2025 (nueve páginas; sin la página de liquidación del gasto)        | El MEI como **derechos reconocidos** de 2024 y 2025 con un segundo documento; la liquidación de 2025 como contraste | **La recaudación de caja del MEI por mes (n.º 46)**: no hay columna de caja ni cifras mensuales                                                                      |
| `RDL-8-2010.pdf`, `RD-1794-2010.pdf` | Suspensión de la revalorización de 2011 (RDL, art. 4) y real decreto de revalorización de 2011                                        | La regla de 2011 con cita, artículo y página                                                                        | 2012, el acumulado y la paga por desviación de 2001 a 2009; el RD recoge un **pago único ligado a 2010** (DA 1.ª) y remite a la Ley 39/2010, no descargada           |

## Qué se extrajo

- **Liquidación de 2025** (`scripts/etl/ssf_liquidacion_2025.py`, reutiliza el ETL de 2010-2016): 9 páginas, 336 cifras (sin los incrementos, que no cuadran en dos partidas) en `liquidacion-ss-2025-extraccion` y 208 contrastes con la ejecución en `liquidacion-ss-2025-contraste`. **No se une a la serie de 2010-2016**: coincide con la ejecución (203 de 208 contrastes; los cinco que difieren son de 2024) y la ruptura de serie de «Hucha» sigue rotulada.
- **Complementos de género** (`ss_complementos_genero.py`): 14 páginas; 6 tablas de 63 filas (378) y 26 indicadores. Un solo corte (1-10-2026): no hay serie.
- **RDL y RD de 2011** (`boe_revalorizacion_2011.py`): seis datos con cita literal, artículo y página (`data/normativa/revalorizacion-2011-regla.json`). La serie `revalorizacion-general` no cambia (la usa el motor).
- **Fuera**: la página de liquidación del gasto de 2025 (no está en el PDF), los incrementos, los anexos del RD y el resto del RDL.

## Validaciones y discrepancias nuevas

- **Liquidación**: 107 sumas de las propias tablas y 59 coherencias liquidación-comparación, todas correctas; 80 relaciones entre tablas, tres incorrectas y registradas (capítulo 4 de 2024 frente a la partida 4 de gastos: 0,54; y los dos incrementos de pensiones, 1,36 = la partida DANA de 2025). **Contraste con la ejecución: coinciden las 74 cifras de 2025 de la comparación, las 60 de presupuesto o previsión y 69 de 74 de 2024**; difieren cinco del capítulo 4 de 2024 (0,57 millones en el total contributivo). El MEI de 2024 y 2025 coincide con la ejecución; frente a las dotaciones al Fondo, 135,60 y 579,43 millones de diferencia, sin causa atribuida.
- **Género**: 386 comprobaciones, ninguna incorrecta (provincias = comunidad, comunidades = total, ambos sexos = hombres + mujeres, número = tramos + «sin número de hijos» de las notas, importes del encabezado = importe de 2026 de los datos, indicadores = totales, variaciones porcentuales = absoluta/(número menos absoluta)). Observación: el importe medio de la brecha es un 0,9 % menor que el calculado con los importes nominales por tramo; sin causa atribuida.
- **BOE**: las seis citas están en la página indicada (ETL falla si no); numeración de página del BOE consecutiva. El porcentaje general de 2011 no consta: el «0 %» es derivado (confianza media).
- **Idempotencia**: los tres ETL dan salida idéntica en dos ejecuciones y es la versionada (test).

## Qué cambia en la web

- **«Tipos de pensión»**: sección «Complementos por hijos: cuántas pensiones los llevan y dónde» (selector brecha de género o maternidad; tablas por comunidad, desplegable de provincias, desglose por hijos y variación publicada, con fuente, «Cómo leerlo» y el aviso de que **no es la brecha de la DA 37.ª**). Elegida frente a una página nueva porque es donde la web describe las prestaciones y cuántas hay.
- **«Hucha»**: sección «Un ejercicio con las dos fuentes» (liquidación frente a ejecución con selector de ejercicio, y MEI frente a dotaciones al Fondo), con «Cómo leerlo» (misma definición; no une series; sin caja mensual).
- **«Mitos y realidades»**: la tarjeta del IPC añade «La regla de 2011 en las normas descargadas» (suspensión, 1 % de las excluidas, referencia del pago único), el párrafo de huecos distingue el año con regla del que sigue sin norma, y **no hay acumulado**. Los textos del catálogo (n.º 28) se actualizan.
- Sin dígitos escritos a mano: los años, los recuentos y las cifras salen de los datos con `formato.ts` (los tests de cifras y de neutralidad recorren los textos nuevos).

## Norma que falta

- **2012**: ningún texto descargado enuncia la revalorización de 2012; constan citadas la Ley 2/2012 de PGE (BOE-A-2012-8745), el RDL 28/2012 (BOE-A-2012-14695, que dejó sin efecto la actualización de 2012) y el RDL 20/2011 (BOE-A-2011-20638, sin texto en `data-raw/boe/`).
- **2001-2010**: el pago único de cada ejercicio consta en el real decreto del año siguiente (como en el RD 1794/2010 para 2010); faltan los de 2002 a 2010 en texto completo. Detalle y URL en `docs/DESCARGAS_MANUALES.md`.

## Playwright pendiente de «Mitos y realidades»

El informe de esa fase dice que el primer recorrido completo (466 pruebas) dio una fallida —la de desbordes en móvil de `/mitos-y-realidades` en `e2e/sitio.spec.ts`— y que, tras acortar las etiquetas, solo se volvieron a ejecutar las 47 pruebas de tres ficheros; **el recorrido completo con la compilación final no se repitió en local** (lo repetía el CI). Esa es la prueba pendiente: el recorrido completo en local con la compilación final dio **487 pruebas correctas, ninguna fallida y una omitida**: la de desbordes en móvil de `e2e/mitos.spec.ts`, que se omitía a propósito en el proyecto de escritorio (`test.skip`). Se quitó la omisión (la prueba ahora comprueba también el escritorio) y se repitieron `mitos.spec.ts` y `descargas-5a4.spec.ts`: 60 de 60 correctas y ninguna omitida. La prueba que falló en aquella fase —`sitio.spec.ts`, «/mitos-y-realidades no desborda horizontalmente ni corta texto»— pasa en escritorio y en móvil, igual que las de consola y axe de la ruta.

## Batería local

`npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`: 162 ficheros JSON), `npx tsc -b --force` (typecheck sin caché incremental, con los ficheros de test), `npm test` (123 ficheros, 2.567 pruebas) y `npm run build` pasan. Playwright completo en local: ver el apartado anterior. Pruebas nuevas: `scripts/etl/test_etl_5a4.py` (18, casos hechos a mano), `scripts/extraccion-pdf-5a4.test.ts` (34: huellas, sumas recalculadas desde el CSV sin el ETL, continuidad, contraste con la ejecución y con el Fondo, citas en los PDF e idempotencia), pruebas de componentes de las tres páginas y `e2e/descargas-5a4.spec.ts` (22: consola, peticiones externas, móvil sin desbordes con las tablas abiertas, axe por sección). Los tests existentes de cifras escritas a mano y de neutralidad recorren los textos nuevos; el de procedencia de la 5-C gana la rama `extraccion-pdf` sin quitar comprobaciones.

## CI y despliegue

- **CI del PR [#45](https://github.com/Exequ/Pensiones/pull/45)**: en verde en el commit `4fe5a4de18b87fa8b7c70808c19cc942f9804ffb` (workflow «CI», ejecución número 111: lint, tipos, tests, validación de datos, compilación y Playwright, 14 minutos). Los commits siguientes solo quitan una omisión de una prueba de Playwright y añaden esta sección; el CI se repite sobre el último antes de fusionar.
- **Despliegue de `main`**: se produce al fusionar el PR (squash). Su resultado y la comprobación de las rutas publicadas a 1360 y 390 px constan en el informe final de la sesión y no en este fichero, para no abrir un PR solo de documentación (misma práctica que las fases anteriores).

## Pendientes para Sergio

- **Actuariales**: n.º 44 (parte (3): brecha de la DA 37.ª por año; el PDF no la trae) y n.º 46 (caja por mes del MEI; hipótesis: se dota lo recaudado, con desfase); si se quiere un acumulado frente al IPC cuando haya 2012 y los pagos únicos de 2002 a 2010; si el 0 % derivado de 2011 se acepta como dato de la serie (hoy solo está en el fichero de la regla); criterio para el importe medio de la brecha (0,9 % menor que el nominal).
- **Descargas manuales** (por prioridad, con URL exacta en `docs/DESCARGAS_MANUALES.md`): Ley 2/2012, RDL 28/2012, RDL 20/2011 (texto), Ley 39/2010, los reales decretos de revalorización de 2002 a 2010, la brecha anual de la DA 37.ª y la recaudación de caja por mes del MEI; y el **LEEME de los cuatro PDF** (URL exacta de cada fichero y huellas de referencia).
- **Modelos y otros**: ninguno. La fase no usa las salidas de los modelos.
