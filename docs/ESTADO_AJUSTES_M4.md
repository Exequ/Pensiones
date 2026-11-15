# Estado de Ajustes de M4

Rama `feat/ajustes-m4`, creada desde `origin/main` (con la descripción nueva de M4 y los escenarios ya fusionados). Hecho: verificación reproducible de la descripción de M4 con los datos descargados, textos de la página «Proyecciones» (bloque financiero) reescritos para decir solo lo verificado, y escenarios de sensibilidad con la fila observada de 2025 en la web. No se tocan «Tu pensión», el motor de prestaciones ni otras secciones; no se ejecutan modelos ni se editan `docs/modelos/` ni `data-raw/`. Decisiones en `docs/DECISIONES.md` («Ajustes de M4»); resultados de la verificación en `docs/DISCREPANCIAS.md` («Ajustes de M4»); huecos en `docs/PENDIENTE_DATOS.md`.

## Paso 0: la descripción es la versión nueva

`docs/modelos/M4_descripcion.md` en `main` trae las secciones sobre el factor de calibración (devengo), el MEI como desglose de las cotizaciones, `saldo_sin_transferencias` y el Fondo (precio de adquisición y rentabilidad constante). No hubo que parar.

## Paso 1: verificación (`scripts/verificacion-m4.ts`)

| Comprobación                                                  | Resultado                                                                                                                                                   |
| ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| (a) MEI dentro de las cotizaciones y desglose                 | Verificado (25 años; desviaciones de 10⁻¹⁶; en la ejecución de 2025 el MEI es una de las partidas de las cotizaciones sociales)                             |
| (b) Cociente gasto de 2025 / (pensiones × pensión media × 14) | Verificado: 0,948 en conjunto; por clase 0,956, 0,913, 0,9605, 0,858 y 0,914; el CSV de M4 reproduce el del conjunto, no el de cada clase                   |
| (c) Complementos a mínimos como partida aparte                | Partida verificada (8.706,91 M€ en 2025; con ellos el cociente es 0,993). **Que la pensión media los incluya y que expliquen la diferencia: no verificado** |
| (d) `saldo_sin_transferencias`                                | Verificado en las 155 filas de los dos CSV y con la ejecución de 2025                                                                                       |
| (e) Valor inicial del Fondo a precio de adquisición           | Verificado con el informe a las Cortes de 2025 (14.069,81 M€ a precio de adquisición; 14.030,07 a mercado)                                                  |

Hallazgos que no se imponen a la descripción (se anotan para Sergio): cociente de incapacidad 0,9605 (la descripción da 0,961) y exceso del producto sobre el gasto de 5,5 % (la descripción dice 5,2 %).

## Paso 2: textos y afirmaciones

- Nuevo apartado «Del número de pensiones al gasto: el factor de calibración» (`FinancieroCalibracion.tsx`): tabla por clase y total con el cociente calculado con los datos, los complementos a mínimos como partida aparte y, en «Cómo leerlo», la atribución a los complementos como **hipótesis del autor del modelo no verificada contra la metodología de la fuente**.
- «Cómo funciona este modelo» (sin dígitos), nota del gasto, definiciones de saldo (con `saldo sin transferencias` y los complementos en el resto de gastos) y texto del Fondo (valor de partida a precio de adquisición y rentabilidad constante supuesta, mostrados desde la fila observada y la salida) actualizados.
- `docs/claims-web.json`: seis afirmaciones nuevas con prefijo `web-fin-` (cinco verificadas y `web-fin-complementos-hipotesis` pendiente); `web-hist-complemento-pension` sigue pendiente. `docs/claims.json` y `docs/FUENTES.md` regenerados.

## Paso 3: escenarios y fila de 2025

Había CSV (`m4_escenarios.csv`, con LEEME), así que se hizo: `data/proyecciones/m4-escenarios.json` (cinco escenarios × 25 años, `escenarios`, `parametrosComunes` y `filaObservada` de 2025 aparte), ETL ampliado (`scripts/etl/modelos_salidas.py`, que comprueba que el base reproduce `m4_financiero.csv` y que la fila de 2025 es igual en los cinco), esquema ampliado y selector accesible de escenario en el bloque financiero (base por defecto; cambia todos los gráficos y tablas; tabla de escenarios, comparación en el último año, punto de partida de 2025 y «Cómo leerlo»). La salida de escenarios la ejecutó Claude, no Sergio: consta en las notas y en `docs/PENDIENTE_DATOS.md`.

## Pruebas

- `scripts/verificacion-m4.test.ts`, `scripts/proyecciones-m4-escenarios.test.ts`, `src/modules/proyecciones/series-escenarios.test.ts`, `src/modules/proyecciones/financiero-escenarios.test.tsx`, casos de motor en `src/engine/proyecciones.test.ts`, neutralidad ampliada (`valoraciones.ts`, `neutralidad-5a2.test.ts`) y `e2e/proyecciones-escenarios.spec.ts`.
- Cambios mínimos en tests existentes (sin quitar comprobaciones): lista de ficheros de `data/proyecciones`, el texto «único escenario» y el recuento de «Cómo leerlo» de dos specs.

## Tamaños (`npm run build`, kB sin comprimir / gzip)

| Trozo                                               | Antes         | Ahora          |
| --------------------------------------------------- | ------------- | -------------- |
| Bloque financiero (`Financiero-*.js`, bajo demanda) | 57,68 / 19,24 | 116,57 / 44,06 |

El trozo crece porque lleva la salida de los cinco escenarios (125 filas, antes 25) y los componentes nuevos; sigue cargándose solo al visitar «Proyecciones».

## Qué quedó fuera

Sensibilidades de la descripción sin salida (revalorización, cotización adicional, altas topadas, demografía, empleo; g = 1,5 % y 1,8 %); reproducción de los escenarios en local por Sergio; confirmación de la hipótesis de los complementos a mínimos con la metodología de la fuente; textos desfasados de `docs/modelos/M4_descripcion.md`. Todo en `docs/PENDIENTE_DATOS.md`.

## CI y despliegue

- PR [Exequ/Pensiones#34](https://github.com/Exequ/Pensiones/pull/34): CI en verde en su último SHA (lint, tipos, tests, datos y compilación; Playwright; compilación para Pages); fusionado con squash como `5809ed1`. En local, antes del PR: `npm run lint` (con `validate:data`), `tsc -b --force`, `npm test` (104 ficheros, 2.166 tests), `npm run build` y Playwright completo (346 tests, escritorio y móvil) en verde.
- Un test de axe en móvil falló una vez en local con dos procesos en paralelo (la página con las tablas abiertas tarda unos 28 s en analizarse, al borde de los 30 s por defecto); se amplió su margen a 120 s en los tres specs que recorren el bloque, sin quitar comprobaciones.
- Despliegue en GitHub Pages del SHA fusionado: terminado con éxito; la URL pública responde 200.
- **Ruta publicada comprobada** con Chromium contra `https://exequ.github.io/Pensiones/#/proyecciones` a 1360 y 390 px: carga el bloque financiero, el escenario base está seleccionado, elegir «g 2 %» cambia las curvas del gasto, sin desbordes horizontales y con cero errores de consola. Capturas locales revisadas a 1360 y 390 px de los apartados nuevos (escenarios y factor de calibración).
