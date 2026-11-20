# Revisión actuarial

Lista de las afirmaciones de `docs/claims.json` que requieren criterio actuarial (no son la transcripción literal de una norma o de una cifra publicada): reglas de cálculo de la pensión de jubilación, reglas de evolución futura, reglas de incapacidad permanente y de muerte y supervivencia, definiciones y las definiciones de salario medio. Para cada una: el identificador del claim, qué se afirma y una pregunta concreta sobre qué debe comprobar el actuario y con qué dato o fórmula. Generado por `scripts/etl/fuentes_claims.py` (diccionario `REVISION`); la pregunta también está en el campo `preguntaActuarial` de `docs/claims.json`.

**Revisadas (83)**: afirmaciones de `docs/claims-web.json` que llevan `revisionActuarial: "revisada"` (la revisión actuarial del 14-11-2026 está incorporada; el criterio está en `notas`); no figuran en las listas siguientes. **Resto de afirmaciones (228)**: no llevan `revisionActuarial` y heredan `revisionActuarialPorDefecto: "no-requiere"` — no requieren revisión actuarial (transcripción literal de una norma o de una cifra publicada, contrastada con su fuente). Para cambiar el estado de una afirmación basta con añadirle `revisionActuarial` (`revisada`, `rechazada` o `pendiente` con `preguntaActuarial`); `npm run validate:data` exige la pregunta en las pendientes.

Para marcar una revisión: poner `revisionActuarial: "revisada"` (o `"rechazada"`) en la afirmación de `docs/claims.json` y anotar el criterio en `notas`.

## Reglas de cálculo de la pensión de jubilación

### 1. `param-jubilacion-coeficientes-voluntaria-limite`

**Afirmación**: Aplicación gradual de los coeficientes reductores sobre el límite de pensión (DT 34.ª TRLGSS, 2024-2033): 4,0 (% de reducción aplicado sobre el límite de pensión (art. 210.3, párr. 2.º)) en 2033.

**Qué debe comprobar el actuario**: Qué lectura del apartado 1 de la DT 34.ª aplica la entidad gestora: (A, por defecto) comparar con la pensión de las normas de 2021 calculada con la máxima que solo sube con la revalorización y reducida un 0,50 % por trimestre; (B) comparar con la cuantía de 2021, que no llega a actuar. Ni la norma ni la exposición de motivos de la Ley 21/2021 lo precisan: falta un criterio de la entidad gestora. Mientras tanto, el simulador muestra las dos.

**Datos**: parametros/jubilacion-coeficientes-voluntaria-limite.json#2033-t4-9

### 2. `param-lagunas-integracion-brecha-genero`

**Afirmación**: Integración de lagunas con porcentajes adicionales de las mensualidades 49.ª a 84.ª (DT 41.ª TRLGSS): 5 (% de brecha de género de las pensiones de jubilación por encima del cual rige la medida) en 2026.

**Qué debe comprobar el actuario**: (2) ¿Se aplica la DT 41.ª también a la opción de 25 años de la DT 4.ª.7 (que aplica la redacción de 2023 del art. 209) aunque salga menos favorable? La parte (3) se cerró en la cuarta tanda con la brecha calculada con las altas iniciales de jubilación; la brecha publicada por año sigue sin descargar.

**Datos**: parametros/lagunas-integracion-brecha-genero.json#2026-umbral-brecha-pct

## Reglas de evolución (mínimas, revalorización, base y pensión máximas, MEI)

## Reglas de cálculo de la incapacidad permanente

## Reglas de las pensiones no contributivas y del MEI

### 3. `param-pnc-reglas`

**Afirmación**: Pensiones no contributivas: requisitos (mayor de 18 y menor de 65 años con discapacidad de al menos el 65 % y cinco años de residencia en incapacidad; 65 años y diez años de residencia en jubilación), cuantía íntegra anual, reducción de las rentas propias que superan el 35 %, mínimo del 25 %, límite de acumulación de recursos de la unidad económica (70 % por cada conviviente adicional), complemento del 50 % por tercera persona y compatibilidad con el trabajo (arts. 363 a 370 TRLGSS y guías del IMSERSO); el cálculo sobre la cuantía íntegra, el límite de compatibilidad con el trabajo y el límite con el complemento de tercera persona se apoyan en la guía del IMSERSO y no en el texto de la ley.

**Qué debe comprobar el actuario**: (d) Con derecho al complemento de tercera persona, ¿el límite de acumulación de recursos se calcula con el complemento o solo sobre la cuantía íntegra? La guía del IMSERSO lo calcula con el complemento; el art. 363.1.d remite al art. 364.1, más cerca de la cuantía sin complemento. Lectura provisional; falta el criterio publicado (real decreto de revalorización o resolución del IMSERSO).

**Datos**: parametros/pnc-reglas.json#incapacidad-edad-minima-meses, parametros/pnc-reglas.json#incapacidad-grado-minimo-pct, parametros/pnc-reglas.json#incapacidad-residencia-total-meses, parametros/pnc-reglas.json#jubilacion-residencia-total-meses, parametros/pnc-reglas.json#unidad-economica-limite-pct-convivientes, parametros/pnc-reglas.json#rentas-compatibles-pct, parametros/pnc-reglas.json#cuantia-minima-pct, parametros/pnc-reglas.json#complemento-tercera-persona-pct, parametros/pnc-reglas.json#compatibilidad-trabajo-limite-iprem, parametros/pnc-reglas.json#limite-acumulacion-con-tercera-persona

## Reglas de cálculo de muerte y supervivencia

### 4. `param-supervivencia-reglas-cuantia`

**Afirmación**: Cuantía de la viudedad, la orfandad y el favor de familiares: viudedad 52 % de la base reguladora (60 % con 65 o más años sin otras rentas; 70 % con cargas familiares y rentas bajas), orfandad y familiares 20 % por beneficiario, incremento del 52 % repartido en la orfandad absoluta; separados y divorciados hasta la pensión compensatoria y, si concurren varios, en proporción al tiempo convivido con el 40 % garantizado al cónyuge o pareja superviviente. Cuando el causante es pensionista, la pensión se incrementa con las mejoras o revalorizaciones de las prestaciones de igual naturaleza por muerte y supervivencia (art. 7.3 del Decreto 1646/1972): el motor usa la revalorización general, que difiere en los años de revalorización diferenciada (por ejemplo, 2013).

**Qué debe comprobar el actuario**: (b) La pensión de un excónyuge limitada por la compensatoria, ¿recibe el complemento a mínimos? Falta un criterio del INSS. La parte (c) se cerró en la cuarta tanda (art. 23.2 de la Orden de 1967, que remite al art. 17.2).

**Datos**: parametros/supervivencia-reglas.json#viudedad-pct, parametros/supervivencia-reglas.json#viudedad-65-pct, parametros/supervivencia-reglas.json#viudedad-cargas-pct, parametros/supervivencia-reglas.json#viudedad-cargas-reduccion-limite, parametros/supervivencia-reglas.json#orfandad-pct, parametros/supervivencia-reglas.json#orfandad-absoluta-incremento-pct, parametros/supervivencia-reglas.json#familiares-cuantia-igual-orfandad, parametros/supervivencia-reglas.json#familiares-incremento-sin-viudo, parametros/supervivencia-reglas.json#divorcio-limite-compensatoria, parametros/supervivencia-reglas.json#concurrencia-garantia-pct

### 5. `param-supervivencia-reglas-limites`

**Afirmación**: Límite conjunto de muerte y supervivencia: la suma de las pensiones no excede de la base reguladora (salvo viudedad de más del 52 % con varias orfandades, que pueden llegar al 48 %), con preferencia de la orfandad sobre los familiares y orden nietos y hermanos, padres, abuelos, hijos y hermanos de pensionistas (art. 229 TRLGSS); parejas de hecho y prestación temporal de dos años (arts. 221 y 222). Requisitos de la pareja de hecho (art. 221.2) por periodos: del 2-1-2016 al 31-12-2021, con o sin hijos, convivencia de al menos cinco años más inscripción o documento público con dos años de antelación; del 1-1-2022 al 20-10-2026, con hijos en común basta acreditar la constitución de la pareja; desde el 21-10-2026, con hijos en común se exige una convivencia de al menos dos años ininterrumpidos.

**Qué debe comprobar el actuario**: (e) El desarrollo reglamentario del art. 226.2 (hijos y hermanos de pensionistas mayores de 45 años) no se ha localizado. La parte (a) queda como lectura provisional con su alternativa (cuarta tanda).

**Datos**: parametros/supervivencia-reglas.json#limite-conjunto-pct-br, parametros/supervivencia-reglas.json#limite-excepcion-viudedad-umbral-pct, parametros/supervivencia-reglas.json#limite-orfandad-max-pct, parametros/supervivencia-reglas.json#limite-preferencia-orfandad, parametros/supervivencia-reglas.json#limite-viudedad-orfandad-orden-1967, parametros/supervivencia-reglas.json#pareja-convivencia-meses, parametros/supervivencia-reglas.json#prestacion-temporal-meses

## Definiciones (ratio afiliados/pensionistas, pensionistas y pensiones, déficit, Fondo de Reserva)

## Definiciones de salario medio

## Comparativa internacional (comparabilidad de la tasa de reposición y del gasto)

## Afirmaciones circulantes (definiciones de cada una)

### 6. `mito-mayores-en-pobreza`

**Afirmación**: Afirmación circulante: «Los pensionistas españoles viven en la pobreza.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar en los metadatos de Eurostat (AROPE) y de la OCDE el umbral de pobreza (60 % y 50 % de la mediana según el revisor), si AROPE incluye más que la pobreza monetaria y si alguna de las dos imputa el alquiler de la vivienda propia; mostrar las dos variantes del umbral si ambas están en /data.

**Datos**: internacional/eurostat-espana.json#pobreza-o-exclusion-total-y-ge65-pc, internacional/ocde-espana.json#oaip-total-y-ge66-z-pt-pop-sex-age

## Mortalidad en edades altas y supuestos de la OCDE

### 7. `demografia-triangulacion-mortalidad-ine-tablas-recalculo-censo-2021`

**Afirmación**: Con el censo de 2021 se calcularon en 2023 nuevas series intercensales (2012-2020) y en noviembre de 2023 se publicaron las tablas de mortalidad sobre la nueva base poblacional.

**Qué debe comprobar el actuario**: Comparar la edición actual de las tablas de mortalidad del INE con la anterior a noviembre de 2023 para saber qué años de 1991-2024 cambiaron (lo más probable según el revisor: 2012-2020 y quizá 2021); ese contraste mediría también el residuo del n.º 2.

**Datos**: demografia/triangulacion-mortalidad.json#ine-tablas-recalculo-censo-2021

### 8. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-politica-fiscal-constante`

**Afirmación**: Impuestos y cotizaciones de la tasa neta: se supone que no cambian en el futuro; los parámetros de «valor» (mínimos exentos, topes de cotización) se ajustan cada año con el salario medio y los de «tipo» (escala del IRPF, tipos de cotización) no varían.

**Qué debe comprobar el actuario**: Comparar la tasa neta de reposición de la OCDE con una tasa neta calculada con las reglas propias, con los «Country Profiles» de España de la OCDE (tipos del IRPF y cotizaciones, mínimos exentos y topes actualizados con el salario medio).

**Datos**: internacional/ocde-supuestos-reposicion.json#ocde-pag-2025-politica-fiscal-constante

## Revisadas con la tercera tanda de la revisión actuarial

Afirmaciones que salieron de la lista de pendientes en los Ajustes actuariales 3. Cada una lleva en `docs/claims.json` el campo `respuestaActuarial` (tanda, parte y número de la respuesta en `docs/revision-actuarial/respuestas-tanda3-*.md`); qué se comprobó y qué cambió consta en `docs/ESTADO_AJUSTES_ACTUARIALES_3.md` y en `docs/revision-actuarial/aplicacion-tanda3.json`.

| Afirmación                                                                                        | Respuesta actuarial      |
| ------------------------------------------------------------------------------------------------- | ------------------------ |
| `demografia-triangulacion-mortalidad-factor-real-sobre-qx-mujeres-85-2010-2019`                   | Tanda 3, parte C, n.º 3  |
| `demografia-triangulacion-mortalidad-muertes-implicitas-pensiones-jubilacion-lexis`               | Tanda 3, parte C, n.º 4  |
| `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-hombres-85-2010-2020`       | Tanda 3, parte C, n.º 1  |
| `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020` | Tanda 3, parte C, n.º 2  |
| `internacional-contraste-espana-gasto-pensiones-contributivas-sobre-pib`                          | Tanda 3, parte C, n.º 6  |
| `internacional-contraste-espana-pension-altas-sobre-salario-eaes`                                 | Tanda 3, parte C, n.º 7  |
| `internacional-ocde-espana-gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024`                        | Tanda 3, parte C, n.º 8  |
| `internacional-ocde-supuestos-reposicion-ocde-pag-2025-crecimiento-real-salarios-base`            | Tanda 3, parte C, n.º 10 |
| `internacional-ocde-supuestos-reposicion-ocde-pag-2025-sensibilidad-espana-valorizacion-precios`  | Tanda 3, parte C, n.º 12 |
| `internacional-ocde-supuestos-reposicion-ocde-pag-entrada-mercado-laboral-22`                     | Tanda 3, parte C, n.º 9  |
| `internacional-sistema-esp-9`                                                                     | Tanda 3, parte C, n.º 13 |
| `macro-salario-medio-definiciones-base-media-cotizacion-rg-ambos`                                 | Tanda 3, parte C, n.º 17 |
| `macro-salario-medio-definiciones-cn-remuneracion-por-asalariado-puesto`                          | Tanda 3, parte C, n.º 16 |
| `macro-salario-medio-definiciones-eaes-ambos`                                                     | Tanda 3, parte C, n.º 14 |
| `macro-salario-medio-definiciones-etcl-coste-salarial-total`                                      | Tanda 3, parte C, n.º 15 |
| `mito-edad-real-de-jubilacion-65`                                                                 | Tanda 3, parte B, n.º 23 |
| `mito-hucha-vaciada`                                                                              | Tanda 3, parte B, n.º 18 |
| `mito-menos-cotizantes-por-pensionista`                                                           | Tanda 3, parte B, n.º 20 |
| `mito-pensiones-con-impuestos`                                                                    | Tanda 3, parte B, n.º 19 |
| `mito-pensiones-publicas-insostenibles`                                                           | Tanda 3, parte B, n.º 24 |
| `mito-pensiones-siempre-con-el-ipc`                                                               | Tanda 3, parte B, n.º 28 |
| `mito-pensiones-sustituyen-casi-todo-el-salario`                                                  | Tanda 3, parte B, n.º 26 |
| `mito-sin-nacimientos-no-hay-pensiones`                                                           | Tanda 3, parte B, n.º 29 |
| `mito-sistema-en-deficit`                                                                         | Tanda 3, parte B, n.º 22 |
| `param-base-maxima-incremento-futuro`                                                             | Tanda 3, parte A, n.º 31 |
| `param-base-minima-rg`                                                                            | Tanda 3, parte A, n.º 32 |
| `param-carrera-jubilacion-65`                                                                     | Tanda 3, parte A, n.º 33 |
| `param-divisor-base-reguladora`                                                                   | Tanda 3, parte A, n.º 34 |
| `param-escala-jubilacion-tramos`                                                                  | Tanda 3, parte A, n.º 35 |
| `param-escala-porcentajes-jubilacion`                                                             | Tanda 3, parte A, n.º 36 |
| `param-incapacidad-permanente-reglas-cuantia`                                                     | Tanda 3, parte B, n.º 39 |
| `param-jubilacion-coeficientes-involuntaria`                                                      | Tanda 3, parte A, n.º 40 |
| `param-jubilacion-coeficientes-voluntaria`                                                        | Tanda 3, parte A, n.º 42 |
| `param-lagunas-integracion`                                                                       | Tanda 3, parte A, n.º 45 |
| `param-mei-reglas`                                                                                | Tanda 3, parte B, n.º 47 |
| `param-mei-tipo-total`                                                                            | Tanda 3, parte A, n.º 48 |
| `param-opcion-25-anos-divisor`                                                                    | Tanda 3, parte A, n.º 49 |
| `param-opcion-25-anos-ventana`                                                                    | Tanda 3, parte A, n.º 50 |
| `param-pension-maxima-incremento-2051-2065`                                                       | Tanda 3, parte A, n.º 51 |
| `param-pension-maxima-incremento-futuro`                                                          | Tanda 3, parte A, n.º 52 |
| `param-pension-minima-regla`                                                                      | Tanda 3, parte A, n.º 53 |
| `param-periodo-calculo-base-reguladora`                                                           | Tanda 3, parte A, n.º 54 |
| `param-revalorizacion-regla`                                                                      | Tanda 3, parte A, n.º 56 |
| `param-supervivencia-reglas`                                                                      | Tanda 3, parte B, n.º 57 |
| `sistema-deficit-presupuestario-seguridad-social-saldo-presupuestario-no-financiero`              | Tanda 3, parte B, n.º 60 |
| `sistema-deficit-sec-fondos-seguridad-social-b9-mio-eur`                                          | Tanda 3, parte B, n.º 61 |
| `sistema-fondo-reserva-series-valor-fin-ano`                                                      | Tanda 3, parte B, n.º 62 |
| `sistema-pensionistas-pensiones-historico-pensionistas`                                           | Tanda 3, parte B, n.º 63 |
| `sistema-relacion-afiliados-pensiones-afiliados-diciembre-por-pensionista`                        | Tanda 3, parte B, n.º 65 |
| `sistema-relacion-afiliados-pensiones-alternativa-1-afiliados-por-pension-alternativa-1`          | Tanda 3, parte B, n.º 64 |
| `web-cot-afiliado-definicion`                                                                     | Tanda 3, parte B, n.º 20 |
| `web-fin-saldos-diferencia`                                                                       | Tanda 3, parte B, n.º 22 |
| `web-fin-sensibilidades-empleo-parametro`                                                         | Tanda 3, parte C, n.º 69 |
| `web-hucha-complemento-minimos-clasificacion`                                                     | Tanda 3, parte C, n.º 66 |
| `web-hucha-prestamos-por-anio`                                                                    | Tanda 3, parte C, n.º 67 |
| `web-mitos-cotizantes`                                                                            | Tanda 3, parte B, n.º 20 |
| `web-mitos-edad`                                                                                  | Tanda 3, parte B, n.º 23 |
| `web-mitos-hucha`                                                                                 | Tanda 3, parte B, n.º 18 |
| `web-mitos-impuestos`                                                                             | Tanda 3, parte B, n.º 19 |
| `web-mitos-ipc`                                                                                   | Tanda 3, parte B, n.º 28 |
| `web-mitos-ipc-sin-acumulado`                                                                     | Tanda 3, parte B, n.º 28 |
| `web-mitos-natalidad`                                                                             | Tanda 3, parte B, n.º 29 |
| `web-mitos-reposicion`                                                                            | Tanda 3, parte B, n.º 26 |
| `web-mitos-saldo`                                                                                 | Tanda 3, parte B, n.º 22 |
| `web-mitos-sostenibilidad`                                                                        | Tanda 3, parte B, n.º 24 |
| `web-sis-comparabilidad`                                                                          | Tanda 3, parte C, n.º 68 |

## Revisadas con la cuarta tanda de la revisión actuarial

Afirmaciones cerradas en los Ajustes actuariales 4 (respuestas del 19-11-2026, bloque A, `docs/revision-actuarial/respuestas-tanda4-A.md`). Qué se comprobó en cada una consta en `docs/revision-actuarial/aplicacion-tanda4.json` y en `docs/ESTADO_FASE_RA.md`.

| Afirmación                                     | Respuesta actuarial                                |
| ---------------------------------------------- | -------------------------------------------------- |
| `mito-espana-gasta-mas-que-europa`             | Tanda 4, parte A, n.º 8. Verificada sin perímetro  |
| `mito-jubilados-cobran-mas-de-lo-cotizado`     | Tanda 4, parte A, n.º 8. Texto sin cifras correcto |
| `param-actualizacion-bases`                    | Tanda 4, parte A, n.º 5                            |
| `param-incapacidad-permanente-reglas`          | Tanda 4, parte A, n.º 7                            |
| `param-incapacidad-permanente-reglas-carencia` | Tanda 4, parte A, n.º 7                            |
| `param-jubilacion-demora-reglas`               | Tanda 4, parte A, n.º 8. Lectura propia rotulada   |
| `param-mei-destino`                            | Tanda 4, parte A, n.º 6                            |
| `web-como-sv-orden-limites`                    | Tanda 4, parte A, n.º 2                            |
| `web-metodologia-confianza-modelos`            | Tanda 4, parte A, n.º 1                            |
| `web-mitos-gasto-europa`                       | Tanda 4, parte A, n.º 8. Verificada sin perímetro  |
| `web-mitos-jubilados-marco`                    | Tanda 4, parte A, n.º 8. Texto sin cifras correcto |
| `web-sis-perimetro-gasto`                      | Tanda 4, parte A, n.º 8. Verificada sin perímetro  |
