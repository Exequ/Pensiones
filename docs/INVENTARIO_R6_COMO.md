# Inventario de la fase R6 «Cómo se calcula»

Inventario previo al código. Parte de `origin/main` en `bc582ffe446517d4cf7ba49709e5da112ada28b1` (PR [Exequ/Pensiones#55](https://github.com/Exequ/Pensiones/pull/55), fase R5): «CI» y «Despliegue en GitHub Pages» de ese commit en verde (ejecuciones 146). Existen `docs/ESTADO_FASE_R5.md` y los `ESTADO_*` e `INVENTARIO_*` previos. Lo que ya está hecho se anota como tal y no se repite.

## 1. Secciones de la página (`src/modules/como-se-calcula`)

`Pagina.tsx`: cabecera, nota al margen, aviso, índice «En esta página» (`apartados.ts`, `INDICE`), `Terminos` y una `SeccionPrestacion` por prestación (jubilación, incapacidad permanente, viudedad, orfandad; textos en `esquemas.ts`), y `ContenidoPagina` con `seccion.previsto`. Cada `SeccionPrestacion` tiene «Quién la cobra», «Cómo se calcula, paso a paso» (`EsquemaPasos`), «Parámetros vigentes» (`TablaParametros`), solo en la jubilación «La escala y los coeficientes, en gráficos» (`GraficosJubilacion`), «Ejemplos calculados con el motor» (`EjemploPasoAPaso`), «Lecturas que influyen» (`LecturasQueInfluyen`) y «Qué no calcula esta web» (`QueNoCalcula`).

## 2. Dónde aparecen hoy artículos, normas, citas y ubicaciones en el cuerpo o en tablas

Recuento sobre la página renderizada con todos los desplegables abiertos (535 líneas con cita; 288 `li`, 203 `td`, 34 `p`, 21 `dd`, 5 `th`, 2 `h4`).

| Lugar                                               | Qué muestra hoy                                                                                                                                                                                                                                           | Origen                                                                           |
| --------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- |
| `EsquemaPasos`, cada paso                           | Línea «Norma: art. 205 TRLGSS; DT 7.ª TRLGSS…» (todas las normas del paso)                                                                                                                                                                                | `PasoEsquema.normas` → `normas.ts` (`etiqueta`)                                  |
| `Pagina.tsx`, nota al margen                        | «Cada paso cita el artículo de la norma…»                                                                                                                                                                                                                 | texto del componente                                                             |
| `TablaParametros`                                   | Columna «Dónde está en la norma» (artículo y versión de la norma); texto de introducción «Cada uno lleva su ubicación en la norma»; la `SourceLine` ya recibe los `Dato` con `quote` y `location`, pero sin rótulo                                        | `Dato.location` de `data/parametros`                                             |
| `EjemploPasoAPaso`, tabla «Requisitos»              | Columna «Norma» con el artículo de cada requisito («art. 205.1.a) TRLGSS»…)                                                                                                                                                                               | `requisitos[].articulo` del motor                                                |
| `EjemploPasoAPaso`, tabla «Cálculo paso a paso»     | Columna «Norma» con el artículo de cada paso del motor                                                                                                                                                                                                    | `pasos[].articulo` del motor                                                     |
| `EjemploPasoAPaso`, «Parámetros que sostienen…»     | Cada elemento termina con la ubicación entre paréntesis («(art. 210.1 TRLGSS…)»); la `SourceLine` ya recibe los `Dato` sin rótulo                                                                                                                         | `Dato.location`                                                                  |
| `LecturasQueInfluyen`, título, motivo y alternativa | Artículos y normas dentro de la frase («El art. 209.1.d actualiza…»), frases «Norma: art. 209.1.b TRLGSS («…»)», «Normas: RD 1799/1985, art. 5.4…» y citas literales entre «» (hay dos títulos con «(DT 4.ª.7)» en el `h4` y motivos con «art. 197.1.b…») | `src/engine/lecturas.ts` (motivos y títulos del motor, **no se tocan**)          |
| `GraficosJubilacion`                                | Sin números de artículo en el cuerpo («el artículo sobre la cuantía de la pensión y de su disposición transitoria»); la cita de cada cuadro ya va en la `SourceLine` de cada gráfico                                                                      | notas del componente                                                             |
| `Terminos`, `QueNoCalcula`, `EsquemaPasos` (textos) | Sin artículos ni citas (los textos de `esquemas.ts` no llevan números de artículo)                                                                                                                                                                        | `esquemas.ts`, `limitaciones.ts`                                                 |
| `esquemas.ts`, `quien` de la jubilación             | «Qué exige cada modalidad (ordinaria, anticipada, demorada o parcial)… está en «Tipos de pensión»»: **ya no es cierto** desde R5 (las modalidades salieron de esa página)                                                                                 | texto del módulo                                                                 |
| `secciones.ts`, `previsto` de la página             | Sin artículos                                                                                                                                                                                                                                             | texto del módulo (sin dígitos, lo comprueba `scripts/sistemas-tipos-5c.test.ts`) |

Ya hecho (R2, R5, no se repite): el desplegable `SourceLine` con «Se refiere a» (`DatoRotulado`), «Cita» y «Ubicación en el documento»; `quitarCitas`, `citasDeTexto` y `ubicacionDeBloque` en `src/engine/citas-normativas.ts`; el campo `calculo.formulaEstructurada`, `resolverFormula` y el componente `Formula` con leyenda.

## 3. Fórmulas en texto

En esta página no hay fórmulas escritas: los textos de `esquemas.ts` describen las reglas en prosa, y los cálculos van en los ejemplos del motor. Las fórmulas de las modalidades de jubilación están solo en `data/normativa/prestaciones.json` (`calculo.formula`, texto libre) y R5 las dejó fuera de «Tipos de pensión» para R6. Fórmula cerrada en la norma y estado de `formulaEstructurada`:

| Modalidad (`prestaciones.json`)            | Fórmula cerrada en la norma                                                                               | `formulaEstructurada` hoy               |
| ------------------------------------------ | --------------------------------------------------------------------------------------------------------- | --------------------------------------- |
| `jubilacion-ordinaria`                     | Sí                                                                                                        | Sí (R5)                                 |
| `jubilacion-anticipada-voluntaria`         | Sí (pensión = base reguladora × porcentaje × (1 − coeficiente); coeficiente sobre el límite en otro caso) | No                                      |
| `jubilacion-anticipada-involuntaria`       | Sí (igual, más el tope por trimestre de anticipación)                                                     | No                                      |
| `jubilacion-demorada`                      | Sí, dos: porcentaje adicional y pago único                                                                | No                                      |
| `jubilacion-parcial`                       | Sí (base reguladora × porcentaje × reducción de jornada; la cifra es variable)                            | No                                      |
| `jubilacion-activa`, `jubilacion-flexible` | Sí en el texto, pero sus cifras no constan en `data/parametros` (no hay parámetros de estas dos)          | No (se anota, no se inventan los datos) |

## 4. Figuras y datos de anticipo y demora que ya existen

`GraficosJubilacion.tsx` (cuatro figuras `GraficoSeries`) con `graficos.ts` (`datosEscala`, `datosAnticipo`, `datosDemora`; usa `coeficienteReductor`, `porcentajeEscala`, `tiempoDemora` y `porcentajeAdicional` del motor):

| Figura                                     | Datos de `data/parametros`                                                                                                                     |
| ------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| Porcentaje de la base reguladora por meses | `escala-jubilacion-tramos.json` (la fuente que muestra) y `escala-porcentajes-jubilacion.json`                                                 |
| Coeficientes de la anticipada voluntaria   | `jubilacion-coeficientes-voluntaria.json` (cuadro del art. 208.2: 24 meses × 4 tramos, desde 2022; umbrales `umbral-t2…t4`)                    |
| Coeficientes de la anticipada involuntaria | `jubilacion-coeficientes-involuntaria.json` (cuadro del art. 207.2: 48 meses × 4 tramos, desde 2022)                                           |
| Porcentaje adicional de la demora          | `jubilacion-demora-reglas.json` (`porcentaje-adicional-anual`, `…-semestre`, `fraccion-minima-meses`) y la lectura `jubilacion.fraccionDemora` |

No tienen figura, y alimentan el motor: `jubilacion-coeficientes-voluntaria-limite.json` (coeficientes sobre el límite de pensión en la voluntaria, aplicación gradual 2024-2033 de la DT 34.ª; en 2033 coinciden con los del art. 208.2) y `jubilacion-anticipada-reglas.json` (anticipo máximo, cotización exigida, tope por trimestre `involuntaria-tope-pension-pct-trimestre`, salvaguarda de la DT 34.ª). Esos dos no entran en la tabla del efecto: el primero solo rige cuando la pensión supera el límite y el segundo es la interacción con la pensión máxima, excluida del alcance de la tabla.

Los cuadros tienen **una sola versión** (periodo 2022): no hay más de un coeficiente para el mismo caso según el hecho causante, salvo el cuadro sobre el límite (por año, hasta 2033). La escala sí tiene versiones por año.

## 5. Frase que remite a «Tipos de pensión» para «qué exige cada modalidad»

`esquemas.ts`, campo `quien` de la jubilación: «Qué exige cada modalidad (ordinaria, anticipada, demorada o parcial), cuántas pensiones hay y cuál es su cuantía media está en «Tipos de pensión»…». Tras R5, «Tipos de pensión» describe la ordinaria y remite a «Cómo se calcula» para las demás modalidades: la frase pasa a decir lo cierto y a apuntar al apartado de modalidades de esta página.

## 6. Apartado de modalidades y enlace desde «Tipos de pensión»

No existe un apartado de modalidades con ancla: la modalidad es un paso («Se ajusta según la modalidad») dentro de la sección de jubilación. En «Tipos de pensión», `FichaPrestacion.tsx` enlaza con `Link to="/como-se-calcula"` (R5), a la página sin ancla. El componente de enlace interno de R3 (`InternalLink`) solo sirve dentro de la misma página; para ir a un apartado de otra, el patrón existente es el estado de la navegación (`Link state={{ ancla }}` en `EnlaceFinanciero.tsx`), que no toca la ruta ni los parámetros del hash.

## 7. Qué se hace en la fase (sin repetir lo existente)

1. Citas al desplegable «Fuentes» en esta página (pasos, requisitos, pasos del motor, parámetros, lecturas), con los mismos mecanismos de R5.
2. Apartado «Modalidades de la jubilación» con ancla estable, entrada en el índice y enlace desde la ficha de jubilación.
3. `formulaEstructurada` en las modalidades con fórmula cerrada y cifras en `data/parametros`.
4. Función pura del motor y tabla del efecto de adelantar o retrasar la jubilación, con «Cómo leerlo» y enlace a «Tu pensión» y a la lectura de la DT 34.ª.
5. Las cuatro figuras de coeficientes y demora se mantienen.
