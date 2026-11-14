# Estado de la Fase 5-B2

Rama `feat/fase-5b2-financiero`, creada desde `origin/main` (con la fase 5-B1 fusionada como #29). Hecho: el bloque «Sistema financiero (M4)» de la sección «Proyecciones», con la salida del modelo financiero M4 (gasto en pensiones contributivas, pensión media, cotizaciones y MEI, saldos, Fondo de Reserva y financiación adicional), el histórico observado donde existe y el contraste del gasto sobre el PIB con el Ageing Report. Decisiones en `docs/DECISIONES.md` («Fase 5-B2»); discrepancias en `docs/DISCREPANCIAS.md`; huecos en `docs/PENDIENTE_DATOS.md`. No se han ejecutado los modelos ni tocado `modelos/`, `docs/modelos/` ni `data-raw/modelos-salidas/`.

## Paso 1: reconocimiento de M4

CSV `data-raw/modelos-salidas/m4/m4_financiero.csv`: 25 filas (2026-2050), 22 columnas, un único escenario (g = 1 %, IPC = 2 %, legislación congelada, ejecutado el 2026-11-14 con el código de `modelos/` en el commit del LEEME). Todas las columnas se usan. Importes en millones de euros corrientes salvo las pensiones medias (euros al mes) y las columnas en porcentaje del PIB aproximado.

| Columna                                                                                             | Definición que da `M4_descripcion.md` (o, si no la da, de dónde sale)                                                                                                                                                               | Gráfico                |
| --------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------- |
| `pensiones_oct`                                                                                     | Número de pensiones de cada clase (M3), octubre                                                                                                                                                                                     | (coherencia)           |
| `pension_media_jub`, `pension_media_total`                                                          | Pensión media; las pensiones se revalorizan con el IPC y las altas entran con una pensión algo mayor (descripción, «cómo funciona»)                                                                                                 | b                      |
| `gasto_pensiones`                                                                                   | «Número de pensiones de cada clase × pensión media × 14 pagas» (no reproduce exactamente la fórmula: factor de devengo del código; ver DISCREPANCIAS)                                                                               | a, c, f                |
| `cotizaciones`                                                                                      | «Cotizaciones de 2025 escaladas con la masa de bases de M2, más el MEI»; en la salida el MEI está incluido (ver DISCREPANCIAS)                                                                                                      | c, d                   |
| `mei`                                                                                               | Cotización extra con tipo creciente hasta su último año de vigencia en el modelo (tipo de `data/parametros`)                                                                                                                        | c                      |
| `otros_gastos`                                                                                      | «Resto de gastos (bajas por enfermedad, maternidad, pensiones no contributivas, Ingreso Mínimo Vital, personal…)»                                                                                                                   | (definición de saldos) |
| `transferencias_y_otros`                                                                            | «Transferencias del Estado y otros ingresos»                                                                                                                                                                                        | (definición de saldos) |
| `saldo_cotizaciones_menos_pensiones`                                                                | Medida «cotizaciones − pensiones» (apartado 4); la descripción la compara con el balance del Ageing Report                                                                                                                          | d                      |
| `saldo_sin_transferencias`                                                                          | **No la define la descripción por su nombre.** Se define por la aritmética entre columnas: cotizaciones − gasto en pensiones − resto de gastos (saldo no financiero − transferencias y otros ingresos); se comprueba en los 25 años | d                      |
| `saldo_no_financiero`                                                                               | «Saldo = ingresos − gasto en pensiones − resto de gastos» (con transferencias y otros ingresos); «añade el resto de gastos e ingresos del sistema»                                                                                  | d                      |
| `dotacion_fondo`                                                                                    | «El Fondo de Reserva lo nutre el MEI»; en la salida es una proporción constante del MEI, igual a la de 2025                                                                                                                         | e                      |
| `disposicion_fondo`                                                                                 | «Desde [el primer año de límite] puede cubrir déficit con un límite legal anual en porcentaje del PIB»                                                                                                                              | e                      |
| `fondo_reserva`                                                                                     | Valor del Fondo a fin de año (partida: valor de fin del último año observado); la rentabilidad no consta en la descripción                                                                                                          | e                      |
| `financiacion_adicional`                                                                            | «Lo que no cubre el Fondo aparece como financiación adicional»                                                                                                                                                                      | e                      |
| `pib_proxy`                                                                                         | «Indicador aproximado: afiliados × salario nominal. No es una previsión macroeconómica»                                                                                                                                             | a, d (denominador)     |
| `gasto_pensiones_pct_pib`, `saldo_cot_pens_pct_pib`, `saldo_no_financiero_pct_pib`, `fondo_pct_pib` | Importe entre el PIB aproximado, por cien (aritmética, comprobada)                                                                                                                                                                  | a, d, f                |
| `afiliados_por_pension`                                                                             | Afiliados (M2) por pensión (M3) (apartado 5, salidas)                                                                                                                                                                               | (coherencia con M2)    |

Datos que se unen (de `/data`, ver `src/modules/proyecciones/ficheros.ts`): ejecución del presupuesto (suma de pensiones, cotizaciones, MEI, obligaciones y derechos no financieros), PIB corriente del INE, pensión media en vigor (`pensiones-vigor-pension-media`), IPC medio anual del INE, Fondo de Reserva (`fondo-reserva-series`), límite legal de disposición (`parametros/fondo-reserva-desembolso-maximo`) y cuatro series del Ageing Report 2024 (gasto en pensiones, balance del sistema de pensiones, tasa de reposición bruta y crecimiento del PIB potencial).

## Qué se muestra y de qué ficheros

Todo en el bloque «Sistema financiero (modelo M4)» de `#/proyecciones`, tras «Cotizantes y bases»; cada gráfico con título, unidad, descripción, tabla accesible con la columna «Naturaleza del dato», línea de fuente (con «naturaleza: …»), nota de proyección y «Cómo leerlo».

- **a. Gasto en pensiones contributivas** (selector euros corrientes / % del PIB): ejecución (suma de pensiones) y M4; en % del PIB, PIB del INE en lo observado y PIB aproximado de M4 en lo proyectado, con nota visible, rótulo «Proyección (otro PIB) →», columna «PIB utilizado» y tabla del PIB de cada año.
- **b. Pensión media** de jubilación y de todas las clases (selector euros corrientes / constantes de 2025 con el IPC supuesto de los metadatos).
- **c. Cotizaciones, MEI y gasto en pensiones**: ejecución (el MEI solo desde su creación) y M4.
- **d. Saldos**: las tres medidas (euros o % del PIB) con sus equivalentes observados derivados de la ejecución y, en %, el balance del sistema de pensiones del Ageing Report; tabla con la definición de cada una y enlace a «Financiación y déficit».
- **e. Fondo de Reserva**: valor a fin de año; dotaciones del MEI y disposiciones con el límite legal en euros (porcentaje del PIB de `data/parametros` por el PIB aproximado de M4) y tabla límite/disposición; disposición y financiación adicional. Enlace a «Hucha»; aviso de la valoración a precio de adquisición en el histórico.
- **f. Contraste con el Ageing Report**: gasto sobre el PIB en índice (2026 = 100) de M4 y del Ageing Report, tabla de diferencias con los niveles, y tabla de magnitudes relacionadas con los candidatos de la descripción («no verificados»).
- **g. «Cómo funciona este modelo»**: plegable, sin cifras, con las frases con valoración de la descripción reformuladas.
- **Enlaces cruzados**: «Hucha» y «Financiación y déficit» enlazan al bloque (el enlace lleva al encabezado); el bloque enlaza a las dos.

## Coherencias internas de M4

Todas exactas (`scripts/proyecciones-5b2.test.ts`, ver la lista en `docs/DISCREPANCIAS.md`): las que declara la descripción (afiliados por pensión de M2/M3, MEI con su tipo legal, disposición bajo el límite legal, cotizaciones escaladas con M2) y la aritmética evidente (saldos, porcentajes del PIB, PIB aproximado, evolución del Fondo con rentabilidad implícita constante). Lo que no se cumple tal como lo escribe la descripción está en `docs/DISCREPANCIAS.md` y no se impone: el MEI incluido en las cotizaciones, el factor del gasto, el saldo sin transferencias sin definición, el redondeo de 2035.

## Tamaños de los trozos (`npm run build`, kB sin comprimir / gzip)

| Trozo                                                                     | `origin/main`     | Esta rama                         |
| ------------------------------------------------------------------------- | ----------------- | --------------------------------- |
| Página «Proyecciones» (`Pagina-*.js`)                                     | 1.296,14 / 288,15 | 1.298,34 / 288,61 (+2,20 / +0,46) |
| Bloque financiero (`Financiero-*.js`, bajo demanda)                       | —                 | 57,68 / 19,24                     |
| Datos del Fondo y del límite legal (trozos de JSON, bajo demanda)         | —                 | 26,65 y 3,81                      |
| `EnlaceFinanciero-*.js` (enlace desde «Hucha» y «Financiación y déficit») | —                 | 1,63                              |

El trozo de la página crece 2,2 kB: el `Suspense` y la carga diferida, dos propiedades nuevas en `GraficoProyeccion` compartido por los dos bloques y los textos de la introducción. La salida de M4 (JSON de 25 filas), las series, los componentes y los textos del bloque no entran en él. El resto de trozos cambia por la redistribución de módulos comunes que hace el empaquetador (p. ej., los datos del Fondo ya no van dentro del de los préstamos).

## Pruebas

- Datos: `scripts/proyecciones-5b2.test.ts` (procedencia, huella SHA-256, el JSON reproduce el CSV, descripciones sin cifras, coherencias internas, lo que la salida cumple sin que la descripción lo declare, reproducción de la tabla de la descripción redondeada y respaldo en la ejecución del presupuesto) y `scripts/proyecciones-modulo-5b2.test.ts` (ficheros declarados e importados, carga diferida, sin cifras escritas a mano). `scripts/proyecciones-5b1.test.ts` y `proyecciones-modulo-5b1.test.ts` se acotaron a su ámbito (siete ficheros más M4; los bloques de M1 a M3 no leen M4).
- Motor (`src/engine/proyecciones.test.ts`): euros constantes con IPC supuesto, límite en euros, porcentaje del PIB, índice base cien y tasas, con casos calculados a mano.
- Página: `series-financiero.test.ts` (series, unidades, naturaleza, cálculos independientes) y `financiero.test.tsx` (cada gráfico, selectores, plegable, avisos de definición, enlaces, sin valoraciones).
- Neutralidad: `valoraciones.ts` ampliado; `neutralidad-5a2.test.ts` y `historico/neutralidad.test.tsx` recorren el bloque.
- Playwright: `e2e/proyecciones-financiero.spec.ts` (consola, peticiones externas, carga en trozo aparte, los tres selectores cambian las curvas, contraste desde cien, plegable con teclado, enlaces cruzados, sin desborde con las tablas abiertas, 44 px, axe en escritorio y móvil) y los cambios mínimos de `e2e/proyecciones.spec.ts` (cuatro plegables; esperar al bloque).

## Qué quedó fuera

Ver `docs/PENDIENTE_DATOS.md`, sección «Fase 5-B2»: cobertura del Ageing Report, serie histórica del PIB con la definición de M4, valoración y rentabilidad del Fondo en M4, factor de devengo, valores de 2025 y sensibilidades de M4 (no hay CSV) y confirmación actuarial de la confianza. Sin FdEA ni mecanismos de equilibrio; sin PDF de liquidaciones ni del Tribunal de Cuentas (fase 5-A3); sin tocar motor, simulador ni lecturas; sin proyectar más allá de 2050.

## CI y despliegue

Se anota en el PR y en el informe final (el resultado del CI y del despliegue no se conoce hasta después de fusionar y no se escribe aquí de antemano).
