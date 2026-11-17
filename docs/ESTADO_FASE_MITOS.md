# Estado de la fase «Mitos y realidades»

Rama `feat/fase-mitos`, creada desde `origin/main` (commit `313f9e061e2100c41faaa94d823659f861ab1c74`, con CI y despliegue en verde). Sustituye el marcador en construcción de la sección «Mitos y realidades» por una página que, para cada una de las doce afirmaciones del catálogo `data/mitos/afirmaciones-circulantes.json` (nº 18 a 29 de la tercera tanda de la revisión actuarial, parte B), muestra los datos y las definiciones que permiten contrastarla, **sin veredicto**. No se tocan el motor, «Tu pensión», «Proyecciones» ni `data-raw/` y `modelos/`. El inventario previo está en `docs/INVENTARIO_MITOS.md`; las decisiones, en `docs/DECISIONES.md` («Fase “Mitos y realidades”»).

Antes de empezar se comprobó (regla 12) con `git log` que los últimos cambios en `data-raw/` y `modelos/` son del 16-11-2026 (LEEME de las liquidaciones 2010-2016 y sensibilidades de M4) y ya están reflejados en `main` y en sus tests (CI de `main` en verde en `313f9e0`); la página no lee esos ficheros, solo ficheros de `/data` ya validados.

## Qué muestra cada tarjeta

Orden del catálogo, sin resaltar ninguna. Cada tarjeta: la afirmación tal como circula, «Qué se puede medir», gráficos y tablas con fuente, fecha de descarga y confianza, «Cómo leerlo», definiciones alternativas lado a lado, qué no se puede concluir, qué falta, enlaces a las páginas ya construidas y estado de la revisión actuarial.

| n.º     | Afirmación (id)                             | Qué muestra                                                                                                                                                                   | Ficheros de `/data`                                                                                                                                     | Estado        |
| ------- | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------- |
| 1 (18)  | `hucha-vaciada`                             | Valor del Fondo al cierre de cada año, importe retirado cada año, meses de gasto con las dos referencias de «La hucha» y tabla de máximo, último valor y mayor retirada       | `sistema/fondo-reserva-series`, `fondo-reserva-anual`, liquidaciones y ejecución del presupuesto, `pensiones-vigor-*` (vía el cargador de «Hucha»)      | Revisada      |
| 2 (19)  | `pensiones-con-impuestos`                   | Cotizaciones frente a transferencias corrientes del Estado y su peso sobre los ingresos no financieros; gastos «impropios» y préstamo, sin sumarlos                           | `sistema/deficit-presupuestario-seguridad-social`, `presupuesto-ss-ejecucion`, `gastos-impropios`, `parametros/prestamos-estado-seguridad-social`       | Revisada      |
| 3 (20)  | `menos-cotizantes-por-pensionista`          | Tres cocientes de afiliados por pensionista o pensión y dos proyecciones del Ageing Report; «afiliado» como situación de alta                                                 | `sistema/relacion-afiliados-pensiones`, `…-alternativa-1`, `demografia/ageing-report-2024-espana`                                                       | Revisada      |
| 4 (21)  | `jubilados-cobran-mas-de-lo-cotizado`       | **Solo el marco**: piezas del cálculo y qué hay en `/data`; sin gráficos ni cifras de lo cotizado o lo cobrado                                                                | `internacional/ocde-espana` (solo como fuente de la medida de riqueza de pensiones)                                                                     | **Pendiente** |
| 5 (22)  | `sistema-en-deficit`                        | Tres medidas del saldo lado a lado y sus diferencias por pares (sin conciliar)                                                                                                | `sistema/deficit-presupuestario-seguridad-social`, `deficit-sec-fondos-seguridad-social`, `deficit-definiciones`, `gastos-impropios`                    | Revisada      |
| 6 (23)  | `edad-real-de-jubilacion-65`                | Edad legal por año, edad media de las altas y salida efectiva de la OCDE (hombres y mujeres); edad actual de la OCDE y periodos cotizados                                     | `parametros/edad-ordinaria-jubilacion`, `carrera-jubilacion-65`, `sistema/edad-media-altas-jubilacion`, `internacional/ocde-espana`, `contraste-espana` | Revisada      |
| 7 (24)  | `pensiones-publicas-insostenibles`          | Gasto proyectado sobre el PIB (Ageing Report y OCDE) y balance; criterio legal de la DA 2.ª del RDL 2/2023 y media propia del gasto en el periodo de la norma                 | `demografia/ageing-report-2024-espana`, `internacional/ocde-espana`, `parametros/mei-reglas`                                                            | Revisada      |
| 8 (25)  | `mayores-en-pobreza`                        | AROPE de Eurostat y pobreza de renta de la OCDE (perímetro no verificado); pensión mínima de jubilación y PNC en euros al año, sin umbral                                     | `internacional/eurostat-espana`, `ocde-espana`, `parametros/pension-minima-jubilacion`, `pnc-importe-anual`                                             | **Pendiente** |
| 9 (26)  | `pensiones-sustituyen-casi-todo-el-salario` | Tasas de reposición teóricas de la OCDE y cocientes empíricos con cuatro denominadores de salario medio                                                                       | `internacional/ocde-espana`, `contraste-espana`, `ocde-supuestos-reposicion`                                                                            | Revisada      |
| 10 (27) | `espana-gasta-mas-que-europa`               | Cuatro medidas de gasto sobre el PIB con su definición (perímetro no verificado en tres); sin ajuste por edades                                                               | `internacional/eurostat-espana`, `eurostat-indicadores`, `ocde-espana`, `contraste-espana`                                                              | **Pendiente** |
| 11 (28) | `pensiones-siempre-con-el-ipc`              | Tabla año a año de la revalorización y el IPC (media y diciembre) con diferencias solo donde hay las dos cifras; gráfico de las diferencias; regla vigente. **Sin acumulado** | `parametros/revalorizacion-general`, `revalorizacion-regla`, `ipc-variacion-media-anual`, `ipc-variacion-diciembre`                                     | Revisada      |
| 12 (29) | `sin-nacimientos-no-hay-pensiones`          | Fecundidad observada y proyectada, cuatro tasas de dependencia y saldo migratorio                                                                                             | `demografia/fecundidad-indicadores`, `proyecciones-hipotesis`, `europop2025-indicadores`, `migraciones-exterior-anual`, `ageing-report-2024-espana`     | Revisada      |

**Solo con marco o sin gráfico**: la tarjeta 4 (faltan los historiales de cotización: sin datos no hay contraste). Las tarjetas 8 y 10 tienen gráfico pero con el perímetro de las fuentes sin verificar, por eso conservan la revisión pendiente.

## Definiciones alternativas mostradas y perímetros no verificados

- Las definiciones del catálogo se muestran todas, lado a lado, sin elegir una (de 3 a 6 por tarjeta).
- Cifras con **más de una medida** en la misma tarjeta: saldo (tres), relación afiliados/pensiones (tres, más dos proyecciones), edad de jubilación (cuatro más dos referencias), gasto sobre el PIB (cuatro), pobreza (dos), reposición (teórica bruta y neta y cociente empírico con cuatro salarios), IPC (media y diciembre), dependencia (cuatro).
- **«Perímetro no verificado en las fuentes descargadas»** consta en: gasto de la OCDE y de Eurostat (tarjetas 7 y 10), pobreza de Eurostat y de la OCDE —umbral, contenido del indicador y alquiler imputado— (tarjeta 8).

## Qué quedó fuera por falta de datos

Ver `docs/PENDIENTE_DATOS.md`, «Fase “Mitos y realidades”», y `docs/DESCARGAS_MANUALES.md` (misma sección): historiales de cotización (MCVL); metadatos de AROPE y de la OCDE; metadatos de gasto de Eurostat y de la OCDE; población de 65 o más años de la UE-27 para el ajuste por edades; revalorizaciones de 2011 y 2012 y paga por desviación; desglose de las transferencias por finalidad; relación sin doble cómputo; saldo contributivo ajustado de la AIReF. No se hace OCR, interpolación ni estimación.

## Neutralidad y textos

- `scripts/lib/valoraciones.ts`: nueva lista `PALABRAS_DE_VEREDICTO` («mito», «falso», «verdadero», «desmentido», «confirmado», «bulo», «refutado», «tiene razón», «es cierto»…) incluida en la lista general que usan todos los tests de neutralidad, y función `veredictosEn`. Solo se admite el nombre de la sección, «Mitos y realidades». Las afirmaciones entrecomilladas, tal como circulan, se comprueban aparte (sin veredictos, con las valoraciones propias de la afirmación).
- Los tests recorren el texto renderizado de la página (con fuentes y tablas), el catálogo (enunciados, definiciones, límites, faltantes, pregunta), la entrada de `secciones.ts` y el título, las notas y las citas de los ficheros que la página muestra.
- Sin dígitos escritos a mano en los textos de la página ni en `secciones.ts` (tests). Las cifras salen de `/data` a través de `formato.ts`; los años de los huecos se calculan.
- Las cifras del revisor no se copian. Dos retoques de redacción en textos existentes para cumplir la lista ampliada (ver `docs/DECISIONES.md`).
- Claims: trece afirmaciones nuevas `web-mitos-*` en `docs/claims-web.json` (diez revisadas con su `respuestaActuarial`, tres pendientes con su pregunta reducida: 21, 25 y 27). Pendientes totales: 19 (tope 70). `docs/FUENTES.md` no cambia: ninguna fuente nueva.

## Pruebas

- Unitarias: `src/engine/mitos.test.ts` (huecos, tramos, media de un periodo, filas de revalorización sin acumulado, proporciones, diferencias, conversiones).
- Componentes: `src/modules/mitos-y-realidades/mitos.test.tsx` (una tarjeta por afirmación y en el orden del catálogo, enunciado literal, definiciones, «Cómo leerlo» y fuente en cada una, gráficos con imagen con nombre, tabla y fuente, índice y foco, enlaces, estado de la revisión, sin acumulado, sin cifras en la tarjeta 4) y `neutralidad.test.tsx`.
- Procedencia, cifras, catálogo y claims: `scripts/mitos-fase.test.ts`.
- Playwright: `e2e/mitos.spec.ts` (consola y peticiones externas, orden de las tarjetas, teclado en el índice, enlaces entre páginas, un axe por tarjeta con sus tablas abiertas y uno de la página, móvil sin desbordes con las tablas abiertas). Sin clic forzado ni plazos ajustados: el más lento tarda menos de la mitad de su límite.

## Tamaño del trozo de la página

«Mitos y realidades» (`npm run build`): 218,62 kB (49,16 kB comprimido) el trozo de la página. Reutiliza trozos ya existentes de otras páginas (cargadores de datos de «Hucha», «Financiación y déficit», «Cotizantes y pensionistas» y «Otros sistemas», `Chart` y Observable Plot) y el fichero del Ageing Report, que no engordan el resto de la web porque la página se carga bajo demanda (`lazy`).

## Batería local

`npm run lint` (ESLint, Prettier, estilos, contraste y `validate:data`), `npx tsc -b --force` (typecheck sin caché incremental, con los ficheros de test), `npm test` (122 ficheros, 2.511 pruebas) y `npm run build` pasan. `npm run test:e2e`: el primer recorrido completo (466 pruebas) dio 464 correctas y una fallida, la de desbordes en móvil de `/mitos-y-realidades` (`e2e/sitio.spec.ts`: dos etiquetas directas de gráfico más largas que el ancho de 390 px); se acortaron las etiquetas y, con la compilación final, pasan las 47 pruebas de `mitos.spec.ts`, de `sitio.spec.ts` (ruta de la sección) y de `ajustes-actuariales-3.spec.ts` (ruta de la sección). El CI repite todo el recorrido. La prueba de axe más lenta tarda unos 25 s de un límite de 90 s.

## CI y despliegue

@@CI@@

## Pendientes para Sergio

- **Actuariales**: las tres afirmaciones pendientes (21, 25 y 27) con su pregunta reducida en `docs/claims.json`; el criterio de la media propia del gasto del Ageing Report en el periodo de la DA 2.ª (¿se prefiere otra lectura de «gasto medio», p. ej. cociente de sumas?); si se quiere mostrar el acumulado frente al IPC cuando se completen los datos.
- **Descargas manuales** (por prioridad, con URL en `docs/DESCARGAS_MANUALES.md`): MCVL; metadatos de pobreza y de gasto (Eurostat y OCDE); BOE de 2011 y 2012 y paga por desviación; población por edad de la Unión Europea.
- **Modelos y otros**: ninguno. La página no usa las salidas de los modelos; las tarjetas de sostenibilidad y de nacimientos enlazan a «Proyecciones».
