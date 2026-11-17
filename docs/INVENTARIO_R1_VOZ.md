# Inventario de la fase R1: voz de la web

Estado de partida: `main` en `0d3fd98`. Generado con una utilidad temporal (no se versiona) que aplica la lista de `scripts/lib/voz.ts` y recorre los literales de texto de `src/` (sin pruebas), los textos de `data/`, de `src/engine/config/` y de `docs/claims-web.json` y el generador `scripts/etl/fuentes_claims.py`. Para cada hallazgo se comprobó si se renderizaba: se renderizaron las 19 rutas de la web (las del HashRouter, con las tres variantes de «Tu pensión» `p=inc|viu|orf`) antes y después del cambio y se buscó la ventana de texto de cada hallazgo en el texto de cada ruta.

Límites del método: (1) el recorrido alcanza el estado inicial de cada página (no lo que aparece al rellenar el simulador); los avisos del motor que se muestran tras calcular (`src/engine/{jubilacion,incapacidad,supervivencia}`) se revisaron a mano y solo se tocó lo que usa «Tu pensión»; `src/engine/{mei,no-contributivas}` no llegan a ninguna página y no se tocaron. (2) En frases cortas la coincidencia es aproximada. (3) Un texto que no se renderiza no se toca.

## Resumen

- Hallazgos totales (apariciones de una expresión de la lista o de una forma tolerada): 3077.
- Se renderizaban fuera de la zona permitida y se han corregido: 285 apariciones (208 distintas): tabla A.
- Se renderizan solo en «Metodología» (zona permitida): 197: tabla B.
- No se renderizan en ninguna ruta: 998: tabla C.
- Formas toleradas hasta R2 (línea de fuente, título de fuente y título de las salidas de los modelos): 1597: tabla D.
- Persisten fuera de la zona permitida (sin contar las toleradas): 0.

## A. Se renderizaban fuera de la zona permitida: corregidos

| Fichero:línea                                                  | Expresión                                 | Dónde se mostraba                               | Decisión                                                                               |
| -------------------------------------------------------------- | ----------------------------------------- | ----------------------------------------------- | -------------------------------------------------------------------------------------- |
| `data/ejemplos/como-se-calcula.json:15`                        | ruta docs/…, modelos/…, src/… o scripts/… | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/ejemplos/como-se-calcula.json:15`                        | .ts                                       | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/ejemplos/como-se-calcula.json:189`                       | ruta docs/…, modelos/…, src/… o scripts/… | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/ejemplos/como-se-calcula.json:189`                       | .ts                                       | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/ejemplos/como-se-calcula.json:325`                       | ruta docs/…, modelos/…, src/… o scripts/… | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/ejemplos/como-se-calcula.json:325`                       | .ts                                       | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:30`                  | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:34`                  | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:80`                  | ruta docs/…, modelos/…, src/… o scripts/… | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:80`                  | .md                                       | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:132`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:135`                 | ruta docs/…, modelos/…, src/… o scripts/… | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:135`                 | .md                                       | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:159`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:173`                 | ruta docs/…, modelos/…, src/… o scripts/… | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:173`                 | .md                                       | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:207`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:212`                 | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/mitos/afirmaciones-circulantes.json:215`                 | ruta docs/…, modelos/…, src/… o scripts/… | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:215`                 | .md                                       | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:235`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:245`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:250`                 | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/mitos/afirmaciones-circulantes.json:250`                 | Literal de la fuente                      | mitos-y-realidades                              | Quitada la etiqueta y el literal del cuerpo; el literal sigue en los datos             |
| `data/mitos/afirmaciones-circulantes.json:261`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:329`                 | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/mitos/afirmaciones-circulantes.json:334`                 | Literal de la fuente                      | mitos-y-realidades                              | Quitada la etiqueta y el literal del cuerpo; el literal sigue en los datos             |
| `data/mitos/afirmaciones-circulantes.json:345`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:418`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:445`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:455`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:457`                 | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/mitos/afirmaciones-circulantes.json:457`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/mitos/afirmaciones-circulantes.json:463`                 | revisor                                   | mitos-y-realidades                              | Reescrito: el hecho se conserva como «no comprobado en las fuentes consultadas»        |
| `data/mitos/afirmaciones-circulantes.json:501`                 | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:21`                            | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/normativa/cronologia.json:21`                            | la descarga (de los ficheros)             | reformas                                        | Quitado (anotación interna de la descarga)                                             |
| `data/normativa/cronologia.json:21`                            | repositorio                               | reformas                                        | Reescrito sin mención al repositorio                                                   |
| `data/normativa/cronologia.json:21`                            | ruta docs/…, modelos/…, src/… o scripts/… | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:21`                            | .md                                       | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:81`                            | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/normativa/cronologia.json:81`                            | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:81`                            | .json                                     | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:81`                            | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/normativa/cronologia.json:81`                            | .json                                     | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:170`                           | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/normativa/cronologia.json:249`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:249`                           | .json                                     | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:249`                           | .json                                     | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:727`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:727`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:841`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:843`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:901`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:903`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:996`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:998`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:1032`                          | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/cronologia.json:1034`                          | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/normativa/prestaciones.json:583`                         | descargado/a(s)                           | tipos-de-pension                                | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/normativa/prestaciones.json:583`                         | descargado/a(s)                           | tipos-de-pension                                | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `data/parametros/mei-destino.json:19`                          | ruta data/…                               | hucha                                           | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/parametros/mei-destino.json:19`                          | ruta data/…                               | hucha                                           | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/parametros/mei-destino.json:19`                          | .json                                     | hucha                                           | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/parametros/mei-destino.json:19`                          | .json                                     | hucha                                           | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/parametros/prestamos-estado-seguridad-social.json:19`    | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/parametros/prestamos-estado-seguridad-social.json:19`    | .json                                     | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `data/sistema/gastos-impropios.json:35`                        | ruta data/…                               | mitos-y-realidades                              | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `docs/claims-web.json:2490`                                    | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/app/Inicio.tsx:26`                                        | revisión actuarial                        | inicio                                          | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/config.ts:12`                                             | revisión actuarial                        | inicio, tu-pension, tipos-de-pension y 13 más   | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/engine/config/lecturas-por-defecto.json:9`                | ruta docs/…, modelos/…, src/… o scripts/… | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/config/lecturas-por-defecto.json:9`                | .md                                       | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/config/lecturas-por-defecto.json:9`                | ruta docs/…, modelos/…, src/… o scripts/… | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/config/lecturas-por-defecto.json:9`                | .md                                       | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/config/lecturas-por-defecto.json:9`                | ruta docs/…, modelos/…, src/… o scripts/… | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/config/lecturas-por-defecto.json:9`                | .md                                       | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/config/lecturas-por-defecto.json:25`               | revisión actuarial                        | tu-pension, como-se-calcula                     | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/engine/config/lecturas-por-defecto.json:41`               | revisión actuarial                        | tu-pension, como-se-calcula                     | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/engine/config/lecturas-por-defecto.json:57`               | revisión actuarial                        | tu-pension, como-se-calcula                     | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/engine/config/lecturas-por-defecto.json:112`              | revisión actuarial                        | como-se-calcula, tu-pension                     | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/engine/config/lecturas-por-defecto.json:176`              | revisión actuarial                        | como-se-calcula, tu-pension                     | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/engine/config/lecturas-por-defecto.json:192`              | revisión actuarial                        | como-se-calcula, tu-pension                     | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/engine/incapacidad/limitaciones.ts:9`                     | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/incapacidad/limitaciones.ts:15`                    | repositorio                               | como-se-calcula, tu-pension                     | Reescrito sin mención al repositorio                                                   |
| `src/engine/incapacidad/limitaciones.ts:15`                    | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/incapacidad/limitaciones.ts:19`                    | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/incapacidad/limitaciones.ts:24`                    | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/incapacidad/limitaciones.ts:48`                    | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/carrera.ts:63`                          | ruta data/…                               | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/errores.ts:25`                          | ruta data/…                               | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/errores.ts:25`                          | .md                                       | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/errores.ts:29`                          | ruta data/…                               | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/errores.ts:34`                          | ruta data/…                               | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/errores.ts:46`                          | ruta data/…                               | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/errores.ts:46`                          | .md                                       | tu-pension, como-se-calcula                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/jubilacion/errores.ts:51`                          | descargado/a(s)                           | tu-pension, como-se-calcula                     | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/engine/supervivencia/calculo.ts:101`                      | ruta data/…                               | tu-pension, como-se-calcula, mitos-y-realidades | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/supervivencia/limitaciones.ts:9`                   | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/supervivencia/limitaciones.ts:15`                  | repositorio                               | como-se-calcula, tu-pension                     | Reescrito sin mención al repositorio                                                   |
| `src/engine/supervivencia/limitaciones.ts:15`                  | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/supervivencia/limitaciones.ts:21`                  | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/supervivencia/limitaciones.ts:27`                  | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/supervivencia/limitaciones.ts:51`                  | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/engine/supervivencia/limitaciones.ts:56`                  | ruta data/…                               | como-se-calcula, tu-pension                     | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/como-se-calcula/EjemploPasoAPaso.tsx:99`          | ruta data/…                               | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/como-se-calcula/normas.ts:20`                     | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/como-se-calcula/Pagina.tsx:33`                    | descargado/a(s)                           | como-se-calcula                                 | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/como-se-calcula/Pagina.tsx:33`                    | ruta data/…                               | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/como-se-calcula/SeccionPrestacion.tsx:54`         | ruta data/…                               | como-se-calcula                                 | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/cotizantes-y-pensionistas/Relacion.tsx:48`        | descargado/a(s)                           | cotizantes-y-pensionistas                       | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/cotizantes-y-pensionistas/Relacion.tsx:112`       | descargado/a(s)                           | cotizantes-y-pensionistas                       | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/Ejecucion.tsx:144`         | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/Ejecucion.tsx:150`         | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/GastoPib.tsx:70`           | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/GastoPib.tsx:70`           | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/GastoPib.tsx:127`          | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/GastoPib.tsx:127`          | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/Saldos.tsx:38`             | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/Saldos.tsx:77`             | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/Saldos.tsx:90`             | Literal de la fuente                      | financiacion-y-deficit, mitos-y-realidades      | Quitada la etiqueta y el literal del cuerpo; el literal sigue en los datos             |
| `src/modules/financiacion-y-deficit/Saldos.tsx:146`            | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/Saldos.tsx:243`            | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/financiacion-y-deficit/Saldos.tsx:254`            | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionContraste.tsx:152`                   | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionOrigen.tsx:206`                      | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionOrigen.tsx:219`                      | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionOrigen.tsx:225`                      | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionPosicion.tsx:80`                     | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionPosicion.tsx:483`                    | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionPrestamos.tsx:205`                   | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionTransferencias.tsx:165`              | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/hucha/SeccionTransferencias.tsx:356`              | descargado/a(s)                           | hucha                                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/metodologia/respaldo.ts:54`                       | ruta docs/…, modelos/…, src/… o scripts/… | reformas, mitos-y-realidades, metodologia       | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/metodologia/respaldo.ts:54`                       | .md                                       | reformas, mitos-y-realidades, metodologia       | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/metodologia/respaldo.ts:170`                      | revisión actuarial                        | tu-pension, como-se-calcula                     | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/metodologia/respaldo.ts:341`                      | descargado/a(s)                           | reformas, metodologia                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/metodologia/SeccionConfianza.tsx:70`              | revisión actuarial                        | inicio, tu-pension, tipos-de-pension y 13 más   | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/metodologia/SeccionConfianza.tsx:71`              | revisión actuarial                        | inicio, tu-pension, tipos-de-pension y 13 más   | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/metodologia/SeccionConfianza.tsx:86`              | revisión actuarial                        | inicio, tu-pension, tipos-de-pension y 13 más   | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/mitos-y-realidades/Afirmacion.tsx:92`             | revisión actuarial                        | mitos-y-realidades                              | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/mitos-y-realidades/Pagina.tsx:34`                 | fichero(s) de datos o de salida           | mitos-y-realidades                              | Reescrito: «los datos» / «la salida del modelo»                                        |
| `src/modules/mitos-y-realidades/TarjetaIpc.tsx:113`            | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetaIpc.tsx:114`            | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetaIpc.tsx:114`            | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetaIpc.tsx:114`            | revisión actuarial                        | mitos-y-realidades                              | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/mitos-y-realidades/TarjetaIpc.tsx:131`            | fichero(s) de datos o de salida           | mitos-y-realidades                              | Reescrito: «los datos» / «la salida del modelo»                                        |
| `src/modules/mitos-y-realidades/TarjetaIpc.tsx:138`            | descargado/a(s)                           | tipos-de-pension, mitos-y-realidades            | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasComparacion.tsx:42`    | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasComparacion.tsx:68`    | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasComparacion.tsx:78`    | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasComparacion.tsx:78`    | Literal de la fuente                      | mitos-y-realidades                              | Quitada la etiqueta y el literal del cuerpo; el literal sigue en los datos             |
| `src/modules/mitos-y-realidades/TarjetasComparacion.tsx:299`   | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasFondo.tsx:307`         | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasFondo.tsx:394`         | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasPersonas.tsx:197`      | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasPersonas.tsx:297`      | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/mitos-y-realidades/TarjetasSostenibilidad.tsx:90` | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionEstructura.tsx:46`          | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionGasto.tsx:83`               | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionGasto.tsx:110`              | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionGasto.tsx:141`              | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionGasto.tsx:155`              | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionGasto.tsx:187`              | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionReposicion.tsx:245`         | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/otros-sistemas/SeccionReposicion.tsx:347`         | descargado/a(s)                           | otros-sistemas                                  | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/proyecciones/Demografia.tsx:291`                  | fichero(s) de datos o de salida           | proyecciones                                    | Reescrito: «los datos» / «la salida del modelo»                                        |
| `src/modules/proyecciones/Demografia.tsx:337`                  | fichero(s) de datos o de salida           | proyecciones                                    | Reescrito: «los datos» / «la salida del modelo»                                        |
| `src/modules/proyecciones/Demografia.tsx:422`                  | fichero(s) de datos o de salida           | proyecciones                                    | Reescrito: «los datos» / «la salida del modelo»                                        |
| `src/modules/proyecciones/Demografia.tsx:440`                  | repositorio                               | proyecciones                                    | Reescrito sin mención al repositorio                                                   |
| `src/modules/proyecciones/FinancieroCalibracion.tsx:36`        | descargado/a(s)                           | hucha, mitos-y-realidades                       | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/proyecciones/Introduccion.tsx:84`                 | fichero(s) de datos o de salida           | proyecciones                                    | Reescrito: «los datos» / «la salida del modelo»                                        |
| `src/modules/reformas/FichaReforma.tsx:8`                      | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/FichaReforma.tsx:9`                      | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/FichaReforma.tsx:10`                     | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/FichaReforma.tsx:12`                     | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/FichaReforma.tsx:53`                     | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/FichaReforma.tsx:70`                     | repositorio                               | reformas                                        | Reescrito sin mención al repositorio                                                   |
| `src/modules/reformas/FichaReforma.tsx:98`                     | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/FichaReforma.tsx:110`                    | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/FichaReforma.tsx:118`                    | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/FichaReforma.tsx:128`                    | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/FichaReforma.tsx:155`                    | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/ids-datos.ts:59`                         | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/ids-datos.ts:140`                        | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/ids-datos.ts:153`                        | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/ids-datos.ts:162`                        | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/ids-datos.ts:248`                        | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/Pagina.tsx:40`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/Pagina.tsx:45`                           | descargado/a(s)                           | reformas, metodologia                           | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/Pagina.tsx:55`                           | repositorio                               | inicio, reformas                                | Reescrito sin mención al repositorio                                                   |
| `src/modules/reformas/Pagina.tsx:57`                           | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/Pagina.tsx:58`                           | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/Pagina.tsx:72`                           | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/reformas/Pagina.tsx:80`                           | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/reformas/TablaReforma.tsx:44`                     | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/secciones.ts:71`                                  | repositorio                               | inicio, reformas                                | Reescrito sin mención al repositorio                                                   |
| `src/modules/secciones.ts:73`                                  | ruta data/…                               | reformas                                        | Quitada la ruta; el hecho se conserva con su fuente                                    |
| `src/modules/secciones.ts:76`                                  | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/secciones.ts:77`                                  | descargado/a(s)                           | reformas                                        | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/secciones.ts:94`                                  | descargado/a(s)                           | financiacion-y-deficit                          | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/secciones.ts:158`                                 | Literal de la fuente                      | otros-sistemas                                  | Quitada la etiqueta y el literal del cuerpo; el literal sigue en los datos             |
| `src/modules/secciones.ts:172`                                 | descargado/a(s)                           | mitos-y-realidades                              | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/secciones.ts:182`                                 | revisión actuarial                        | inicio, metodologia                             | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/tipos-de-pension/FichaPrestacion.tsx:170`         | descargado/a(s)                           | tipos-de-pension                                | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/tipos-de-pension/Pagina.tsx:48`                   | descargado/a(s)                           | tipos-de-pension                                | Reescrito con la forma estándar («consultado», «no consta en las fuentes consultadas») |
| `src/modules/tu-pension/supuestos.ts:32`                       | revisión actuarial                        | tu-pension, como-se-calcula, metodologia        | Quitada la mención (la revisión consta solo en «Metodología»)                          |
| `src/modules/tu-pension/textos.ts:67`                          | revisión actuarial                        | tu-pension                                      | Quitada la mención (la revisión consta solo en «Metodología»)                          |

## B. Solo en «Metodología»: se mantienen (zona permitida)

| Fichero                                             | Apariciones | Líneas                                                      |
| --------------------------------------------------- | ----------- | ----------------------------------------------------------- |
| `data/proyecciones/m1-backtest.json`                | 2           | 10                                                          |
| `data/proyecciones/m1-contraste-ine.json`           | 2           | 10                                                          |
| `data/proyecciones/m1-escenarios.json`              | 2           | 10                                                          |
| `data/proyecciones/m2-cotizantes.json`              | 2           | 10                                                          |
| `data/proyecciones/m2-relacion-pensiones.json`      | 2           | 10                                                          |
| `data/proyecciones/m3-pensiones.json`               | 2           | 10                                                          |
| `data/proyecciones/m3-resumen.json`                 | 2           | 10                                                          |
| `data/proyecciones/m4-escenarios.json`              | 2           | 10                                                          |
| `data/proyecciones/m4-financiero.json`              | 2           | 10                                                          |
| `data/proyecciones/m4-sensibilidades.json`          | 2           | 10                                                          |
| `docs/claims-web.json`                              | 5           | 1973, 2521, 3450                                            |
| `scripts/etl/fuentes_claims.py`                     | 1           | 332                                                         |
| `src/engine/esquema-datos.ts`                       | 3           | 266, 273, 280                                               |
| `src/engine/lecturas.ts`                            | 4           | 51, 59                                                      |
| `src/engine/metodologia.ts`                         | 1           | 286                                                         |
| `src/modules/metodologia/apartados.ts`              | 3           | 21, 42, 47                                                  |
| `src/modules/metodologia/modelos.ts`                | 2           | 107, 125                                                    |
| `src/modules/metodologia/Pagina.tsx`                | 1           | 39                                                          |
| `src/modules/metodologia/respaldo.ts`               | 115         | 34, 35, 39, 44, 49, 50, 59, 64, 65, 69, 74, 75… (64 líneas) |
| `src/modules/metodologia/SeccionComprobaciones.tsx` | 2           | 34, 96                                                      |
| `src/modules/metodologia/SeccionConfianza.tsx`      | 11          | 20, 23, 52, 72, 77, 84, 99, 181, 196                        |
| `src/modules/metodologia/SeccionDatos.tsx`          | 7           | 36, 53, 73, 79, 89, 99                                      |
| `src/modules/metodologia/SeccionLecturas.tsx`       | 2           | 33, 51                                                      |
| `src/modules/metodologia/SeccionLimites.tsx`        | 1           | 16                                                          |
| `src/modules/metodologia/SeccionModelos.tsx`        | 7           | 24, 25, 36, 76, 77, 87                                      |
| `src/modules/metodologia/SeccionNeutralidad.tsx`    | 3           | 49                                                          |
| `src/modules/metodologia/SeccionReproducir.tsx`     | 5           | 21, 25, 36                                                  |
| `src/modules/secciones.ts`                          | 4           | 186, 190, 191, 192                                          |

## C. No se renderizan: no se tocan

| Fichero                                                        | Apariciones | Líneas                                                                            |
| -------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------- |
| `data/demografia/eurostat-poblacion-edad-sexo.json`            | 1           | 5                                                                                 |
| `data/demografia/triangulacion-mortalidad.json`                | 1           | 110                                                                               |
| `data/ejemplos/personas.json`                                  | 1           | 5                                                                                 |
| `data/internacional/contraste-espana.json`                     | 14          | 5, 18, 528, 543                                                                   |
| `data/internacional/eurostat-indicadores.json`                 | 1           | 74                                                                                |
| `data/internacional/ocde-espana.json`                          | 51          | 45, 1746, 1763, 1780, 1797, 1831, 1899, 1950, 1967, 2001, 2052, 2103… (23 líneas) |
| `data/internacional/ocde-pag.json`                             | 2           | 64                                                                                |
| `data/internacional/ocde-supuestos-reposicion.json`            | 18          | 5, 37, 71, 377, 411, 513, 530, 547, 564, 581                                      |
| `data/internacional/paises-sistemas.json`                      | 3           | 5, 20                                                                             |
| `data/macro/base-media-cotizacion-rg-mensual.json`             | 3           | 5, 59                                                                             |
| `data/macro/eaes-salario-sexo-edad.json`                       | 2           | 44                                                                                |
| `data/macro/salario-medio-razon-base-maxima.json`              | 5           | 5, 270                                                                            |
| `data/mitos/afirmaciones-circulantes.json`                     | 4           | 5, 176, 460                                                                       |
| `data/normativa/cronologia.json`                               | 3           | 127, 279, 391                                                                     |
| `data/normativa/prestaciones.json`                             | 8           | 555, 909                                                                          |
| `data/normativa/revalorizacion-2011-regla.json`                | 8           | 22, 37, 39, 56, 73, 90, 107                                                       |
| `data/parametros/base-minima-rg-2021-tramos.json`              | 3           | 5, 20, 39                                                                         |
| `data/parametros/base-minima-rg.json`                          | 3           | 370                                                                               |
| `data/parametros/complemento-brecha-genero.json`               | 1           | 5                                                                                 |
| `data/parametros/divisor-base-reguladora.json`                 | 12          | 456, 473, 490, 507, 524, 541, 558, 575, 592, 609, 626, 643                        |
| `data/parametros/escala-jubilacion-tramos.json`                | 1           | 5                                                                                 |
| `data/parametros/incapacidad-permanente-reglas.json`           | 3           | 83, 1010                                                                          |
| `data/parametros/ipc-indice-medio-anual.json`                  | 2           | 5                                                                                 |
| `data/parametros/ipc-indice-mensual.json`                      | 2           | 5                                                                                 |
| `data/parametros/lagunas-integracion-brecha-genero.json`       | 1           | 19                                                                                |
| `data/parametros/limite-ingresos-complementos-minimos.json`    | 1           | 5                                                                                 |
| `data/parametros/pension-maxima-incremento-2051-2065.json`     | 2           | 19                                                                                |
| `data/parametros/pension-maxima-incremento-futuro.json`        | 52          | 19                                                                                |
| `data/parametros/pension-minima-incapacidad.json`              | 2           | 972                                                                               |
| `data/parametros/pension-minima-jubilacion.json`               | 2           | 530                                                                               |
| `data/parametros/periodo-calculo-base-reguladora.json`         | 12          | 456, 473, 490, 507, 524, 541, 558, 575, 592, 609, 626, 643                        |
| `data/parametros/pnc-complemento-alquiler.json`                | 4           | 20                                                                                |
| `data/parametros/pnc-importe-anual.json`                       | 2           | 5                                                                                 |
| `data/parametros/pnc-iprem-anual-sin-pagas-extra.json`         | 1           | 5                                                                                 |
| `data/parametros/pnc-reglas.json`                              | 1           | 494                                                                               |
| `data/parametros/supervivencia-reglas.json`                    | 2           | 35, 931                                                                           |
| `data/proyecciones/m1-backtest.json`                           | 2           | 28, 31                                                                            |
| `data/proyecciones/m1-contraste-ine.json`                      | 2           | 28, 31                                                                            |
| `data/proyecciones/m1-escenarios.json`                         | 2           | 28, 31                                                                            |
| `data/proyecciones/m2-cotizantes.json`                         | 2           | 28, 31                                                                            |
| `data/proyecciones/m2-relacion-pensiones.json`                 | 2           | 27, 30                                                                            |
| `data/proyecciones/m3-pensiones.json`                          | 2           | 27, 30                                                                            |
| `data/proyecciones/m3-resumen.json`                            | 2           | 27, 30                                                                            |
| `data/proyecciones/m4-escenarios.json`                         | 7           | 27, 30, 3341, 3344, 3371                                                          |
| `data/proyecciones/m4-financiero.json`                         | 6           | 27, 30, 362                                                                       |
| `data/proyecciones/m4-sensibilidades.json`                     | 4           | 27, 30, 6500                                                                      |
| `data/sistema/afiliados-sexo-edad.json`                        | 2           | 63                                                                                |
| `data/sistema/altas-bajas-anual-clase-sexo.json`               | 2           | 53                                                                                |
| `data/sistema/complementos-genero-indicadores.json`            | 3           | 5, 49, 87                                                                         |
| `data/sistema/complementos-genero-territorio.json`             | 3           | 5, 69, 112                                                                        |
| `data/sistema/complementos-minimos-regimen-clase-sexo.json`    | 3           | 78                                                                                |
| `data/sistema/deficit-definiciones.json`                       | 8           | 4, 5, 10, 19, 51, 58                                                              |
| `data/sistema/deficit-presupuestario-seguridad-social.json`    | 9           | 17                                                                                |
| `data/sistema/deuda-pde-seguridad-social.json`                 | 2           | 17, 540                                                                           |
| `data/sistema/fondo-reserva-anual.json`                        | 2           | 88                                                                                |
| `data/sistema/fondo-reserva-series.json`                       | 6           | 17                                                                                |
| `data/sistema/imserso-pnc-evolucion.json`                      | 1           | 53                                                                                |
| `data/sistema/liquidacion-ss-2025-extraccion.json`             | 3           | 5, 54, 97                                                                         |
| `data/sistema/liquidacion-ss-extraccion.json`                  | 11          | 5, 54, 93, 97, 103, 109, 115, 121, 127, 133                                       |
| `data/sistema/liquidacion-ss-series.json`                      | 35          | 5, 19, 810                                                                        |
| `data/sistema/mites-anuario-pen1-sexo-clase.json`              | 3           | 63                                                                                |
| `data/sistema/mites-bel-pen31-cuantias.json`                   | 6           | 38                                                                                |
| `data/sistema/mites-bel-pensiones.json`                        | 2           | 5, 78                                                                             |
| `data/sistema/pensiones-vigor-edad-clase-sexo.json`            | 2           | 53                                                                                |
| `data/sistema/pensiones-vigor-numero.json`                     | 36          | 17                                                                                |
| `data/sistema/pensiones-vigor-pension-media.json`              | 36          | 17                                                                                |
| `data/sistema/pensionistas-pensiones-historico.json`           | 2           | 112                                                                               |
| `data/sistema/relacion-afiliados-pensiones-alternativa-1.json` | 2           | 194                                                                               |
| `data/sistema/relacion-afiliados-pensiones.json`               | 8           | 17, 112, 207                                                                      |
| `data/sistema/tribunal-cuentas-cge2023-prestamos.json`         | 4           | 49, 88, 92                                                                        |
| `data/sistema/tribunal-cuentas-cge2023-ss.json`                | 49          | 5, 20, 37, 54, 71, 88, 105, 122, 139, 156, 173, 190… (25 líneas)                  |
| `docs/claims-web.json`                                         | 221         | 3, 376, 502, 507, 540, 582, 612, 644, 676, 848, 867, 941… (84 líneas)             |
| `scripts/etl/fuentes_claims.py`                                | 187         | 1, 10, 12, 13, 14, 25, 79, 87, 88, 153, 156, 166… (100 líneas)                    |
| `src/engine/config/lecturas-por-defecto.json`                  | 12          | 2, 9, 160, 224                                                                    |
| `src/engine/esquema-datos.ts`                                  | 5           | 224, 265, 295, 310                                                                |
| `src/engine/incapacidad/calculo.ts`                            | 6           | 144, 180, 204, 640, 817                                                           |
| `src/engine/jubilacion/calculo.ts`                             | 3           | 164, 813, 931                                                                     |
| `src/engine/jubilacion/contexto.ts`                            | 7           | 73, 144, 175, 230, 237, 370                                                       |
| `src/engine/jubilacion/parametros-datos.ts`                    | 2           | 14, 16                                                                            |
| `src/engine/jubilacion/parametros.ts`                          | 2           | 183                                                                               |
| `src/engine/jubilacion/porcentajes.ts`                         | 2           | 29, 79                                                                            |
| `src/engine/mei/calculo.ts`                                    | 4           | 86, 239                                                                           |
| `src/engine/metodologia.ts`                                    | 2           | 456                                                                               |
| `src/engine/no-contributivas/calculo.ts`                       | 1           | 69                                                                                |
| `src/engine/no-contributivas/limitaciones.ts`                  | 6           | 10, 15, 19, 23                                                                    |
| `src/engine/no-contributivas/parametros.ts`                    | 3           | 57                                                                                |
| `src/engine/supervivencia/calculo.ts`                          | 2           | 142, 157                                                                          |
| `src/engine/supervivencia/causante.ts`                         | 2           | 157                                                                               |
| `src/modules/como-se-calcula/normas.ts`                        | 6           | 21, 22, 23, 24, 25, 26                                                            |
| `src/modules/metodologia/respaldo.ts`                          | 8           | 7, 51, 66, 88, 135, 165, 299                                                      |
| `src/modules/proyecciones/datos-proyecciones.ts`               | 1           | 245                                                                               |
| `src/modules/proyecciones/FinancieroComoFunciona.tsx`          | 1           | 22                                                                                |
| `src/modules/proyecciones/FinancieroSensibilidades.tsx`        | 2           | 131                                                                               |
| `src/modules/reformas/ficheros.ts`                             | 1           | 24                                                                                |
| `src/modules/tu-pension/datos.ts`                              | 2           | 31, 52                                                                            |
| `src/modules/tu-pension/referencias.ts`                        | 2           | 67, 102                                                                           |
| `src/modules/tu-pension/textos-incapacidad.ts`                 | 1           | 72                                                                                |
| `src/modules/tu-pension/textos-supervivencia.ts`               | 1           | 204                                                                               |
| `src/modules/tu-pension/tramos.ts`                             | 1           | 376                                                                               |

## D. Formas toleradas hasta R2

| Fichero                                                          | Apariciones | Líneas                     |
| ---------------------------------------------------------------- | ----------- | -------------------------- |
| `data/normativa/prestaciones.json`                               | 8           | 555                        |
| `data/normativa/revalorizacion-2011-regla.json`                  | 6           | 20, 37, 54, 71, 88, 105    |
| `data/parametros/actualizacion-bases.json`                       | 2           | 109                        |
| `data/parametros/base-maxima-incremento-futuro.json`             | 27          | 13                         |
| `data/parametros/complemento-brecha-genero-reglas.json`          | 6           | 13                         |
| `data/parametros/escala-jubilacion-tramos.json`                  | 28          | 13                         |
| `data/parametros/fondo-reserva-desembolso-maximo.json`           | 21          | 13                         |
| `data/parametros/incapacidad-permanente-reglas.json`             | 45          | 294                        |
| `data/parametros/jubilacion-anticipada-reglas.json`              | 16          | 13                         |
| `data/parametros/jubilacion-coeficientes-involuntaria.json`      | 195         | 13                         |
| `data/parametros/jubilacion-coeficientes-voluntaria-limite.json` | 960         | 13                         |
| `data/parametros/jubilacion-coeficientes-voluntaria.json`        | 99          | 13                         |
| `data/parametros/jubilacion-demora-reglas.json`                  | 11          | 13, 152                    |
| `data/parametros/jubilacion-edad-65.json`                        | 2           | 13                         |
| `data/parametros/jubilacion-periodo-previo.json`                 | 2           | 13                         |
| `data/parametros/lagunas-integracion-brecha-genero.json`         | 7           | 13                         |
| `data/parametros/lagunas-integracion.json`                       | 3           | 201                        |
| `data/parametros/mei-destino.json`                               | 2           | 13                         |
| `data/parametros/opcion-25-anos-aplicable.json`                  | 19          | 13                         |
| `data/parametros/opcion-25-anos-divisor.json`                    | 18          | 13                         |
| `data/parametros/opcion-25-anos-ventana.json`                    | 18          | 13                         |
| `data/parametros/pension-maxima-incremento-2051-2065.json`       | 16          | 13                         |
| `data/parametros/pension-maxima-incremento-futuro.json`          | 26          | 13                         |
| `data/parametros/pension-minima-regla.json`                      | 9           | 13                         |
| `data/parametros/revalorizacion-regla.json`                      | 5           | 13                         |
| `data/parametros/supervivencia-reglas.json`                      | 1           | 637                        |
| `data/proyecciones/m1-backtest.json`                             | 1           | 21                         |
| `data/proyecciones/m1-contraste-ine.json`                        | 1           | 21                         |
| `data/proyecciones/m1-escenarios.json`                           | 1           | 21                         |
| `data/proyecciones/m2-cotizantes.json`                           | 1           | 9                          |
| `data/proyecciones/m2-relacion-pensiones.json`                   | 1           | 9                          |
| `data/proyecciones/m3-pensiones.json`                            | 1           | 20                         |
| `data/proyecciones/m3-resumen.json`                              | 1           | 20                         |
| `data/proyecciones/m4-escenarios.json`                           | 1           | 20                         |
| `data/proyecciones/m4-financiero.json`                           | 1           | 20                         |
| `data/proyecciones/m4-sensibilidades.json`                       | 1           | 20                         |
| `data/sistema/complementos-genero-indicadores.json`              | 1           | 83                         |
| `data/sistema/complementos-genero-territorio.json`               | 1           | 108                        |
| `data/sistema/liquidacion-ss-2025-contraste.json`                | 1           | 78                         |
| `data/sistema/liquidacion-ss-2025-extraccion.json`               | 1           | 93                         |
| `docs/claims-web.json`                                           | 30          | 44, 1899, 3422, 3427, 3432 |
| `src/components/SourceLine.tsx`                                  | 1           | 28                         |
