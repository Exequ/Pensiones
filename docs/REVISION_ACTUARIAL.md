# Revisión actuarial

Lista de las afirmaciones de `docs/claims.json` que requieren criterio actuarial (no son la transcripción literal de una norma o de una cifra publicada): reglas de cálculo de la pensión de jubilación, reglas de evolución futura, reglas de incapacidad permanente y de muerte y supervivencia, definiciones y las definiciones de salario medio. Para cada una: el identificador del claim, qué se afirma y una pregunta concreta sobre qué debe comprobar el actuario y con qué dato o fórmula. Generado por `scripts/etl/fuentes_claims.py` (diccionario `REVISION`); la pregunta también está en el campo `preguntaActuarial` de `docs/claims.json`.

**Revisadas (71)**: afirmaciones de `docs/claims-web.json` que llevan `revisionActuarial: "revisada"` (la revisión actuarial del 14-11-2026 está incorporada; el criterio está en `notas`); no figuran en las listas siguientes. **Resto de afirmaciones (228)**: no llevan `revisionActuarial` y heredan `revisionActuarialPorDefecto: "no-requiere"` — no requieren revisión actuarial (transcripción literal de una norma o de una cifra publicada, contrastada con su fuente). Para cambiar el estado de una afirmación basta con añadirle `revisionActuarial` (`revisada`, `rechazada` o `pendiente` con `preguntaActuarial`); `npm run validate:data` exige la pregunta en las pendientes.

Para marcar una revisión: poner `revisionActuarial: "revisada"` (o `"rechazada"`) en la afirmación de `docs/claims.json` y anotar el criterio en `notas`.

## Reglas de cálculo de la pensión de jubilación

### 1. `param-actualizacion-bases`

**Afirmación**: Actualización de las bases de cotización en el cálculo de la base reguladora de jubilación (por versión): 24 (meses más recientes (anteriores al mes previo al del hecho causante) que se computan sin actualizar) en 2026.

**Qué debe comprobar el actuario**: El enlace de 2001 (índice obtenido de las variaciones anuales de 2002 del INE, confianza media) no coincide a siete decimales con los factores de 2001 de los informes del autocálculo de la Seguridad Social (desviación de hasta 0,04 %, efecto de céntimos); desde 2002 sí coinciden. ¿Se sustituyen los meses de 2001 por los índices implícitos de los informes (solo cubren de junio a diciembre) o se mantiene el enlace? El suelo de uno (lectura actualizacionFactorMinimo, provisional) es una decisión de gestión derivada de esos informes, no del art. 209.

**Datos**: parametros/actualizacion-bases.json#2026-meses-nominales

### 2. `param-jubilacion-coeficientes-voluntaria-limite`

**Afirmación**: Aplicación gradual de los coeficientes reductores sobre el límite de pensión (DT 34.ª TRLGSS, 2024-2033): 4,0 (% de reducción aplicado sobre el límite de pensión (art. 210.3, párr. 2.º)) en 2033.

**Qué debe comprobar el actuario**: Decidir qué lectura del apartado 1 de la DT 34.ª es la correcta: (A, por defecto en el motor) comparar con la pensión que habría correspondido con las normas de 2021, calculada con la pensión máxima que solo sube con el IPC (sin el incremento adicional de 0,115 puntos) y reducida un 0,50 % por trimestre; (B) no comparar (equivale a comparar con la pensión máxima nominal de 2021, que nunca actúa). La norma dice que la pensión no ha de resultar «en ningún caso inferior a la que habría correspondido con la aplicación de las normas vigentes en 2021», pero no dice con qué pensión máxima se compara; la exposición de motivos de la Ley 21/2021 (ya en el repo) no lo aclara: falta un criterio del INSS. El motor no calcula 2022-2023 (rige la redacción original del art. 210.3).

**Datos**: parametros/jubilacion-coeficientes-voluntaria-limite.json#2033-t4-9

### 3. `param-jubilacion-demora-reglas`

**Afirmación**: Complemento por jubilación demorada: porcentaje adicional, pago único y opción mixta (art. 210.2 TRLGSS, Ley 21/2021 y RD 371/2023): 20260828 (fecha AAAAMMDD desde la que rige la redacción del art. 3 del RD 371/2023 que se transcribe) en 2026.

**Qué debe comprobar el actuario**: En la opción de tanto alzado y en la mixta, ¿la «pensión inicial anual» incluye el porcentaje adicional del 4 % de la parte mixta, limitada a la máxima? El art. 2.1.b del RD 371/2023 solo dice que, si la pensión reconocida supera la máxima, se toma como pensión inicial anual la cuantía de la pensión máxima; la inclusión del 4 % es lectura nuestra.

**Datos**: parametros/jubilacion-demora-reglas.json#mixta-vigencia-desde

### 4. `param-lagunas-integracion-brecha-genero`

**Afirmación**: Integración de lagunas con porcentajes adicionales de las mensualidades 49.ª a 84.ª (DT 41.ª TRLGSS): 5 (% de brecha de género de las pensiones de jubilación por encima del cual rige la medida) en 2026.

**Qué debe comprobar el actuario**: (2) ¿Se aplica la DT 41.ª también a la opción de 25 años de la DT 4.ª.7 (que aplica la redacción de 2023 del art. 209) aunque salga menos favorable? (3) ¿Sigue la brecha de la DA 37.ª por encima del 5 % en cada año? El fichero descargado el 2026-11-16 («Brecha de género.pdf») es el recuento de complementos por brecha de género y por maternidad a 1 de octubre de 2026, no la brecha de la DA 37.ª; sigue faltando la brecha publicada por año (DESCARGAS_MANUALES.md).

**Datos**: parametros/lagunas-integracion-brecha-genero.json#2026-umbral-brecha-pct

## Reglas de evolución (mínimas, revalorización, base y pensión máximas, MEI)

### 5. `param-mei-destino`

**Afirmación**: Destino de la cotización finalista del MEI (art. 127 bis TRLGSS): dos indicadores separados en 2023: 1 (indicador (1 = la recaudación del MEI nutre el Fondo de Reserva)) y 1 (indicador (1 = no computa para prestaciones)).

**Qué debe comprobar el actuario**: Explicar la diferencia entre los derechos reconocidos del MEI y las dotaciones anuales al Fondo con cargo al MEI (data/sistema/fondo-reserva-series): hipótesis a comprobar: se dota lo recaudado y no los derechos, con desfase de un mes. Los derechos reconocidos de 2024 y 2025 se han contrastado con la liquidación de 2025 y coinciden con la ejecución; sigue faltando la recaudación de caja por mes del MEI, que la liquidación no da.

**Datos**: parametros/mei-destino.json#destino-fondo-reserva, parametros/mei-destino.json#no-computable-prestaciones

## Reglas de cálculo de la incapacidad permanente

### 6. `param-incapacidad-permanente-reglas`

**Afirmación**: Base reguladora de la incapacidad permanente: por enfermedad común, bases de 96 meses entre 112 (con menos de ocho años exigidos, tantas bases como meses exigidos y divisor × 1,1666) por el porcentaje de la escala con los años que faltan hasta la edad ordinaria; por accidente no laboral en alta, 24 meses elegidos en siete años entre 28 (arts. 197 TRLGSS, 5 RD 1799/1985 y 7 Decreto 1646/1972).

**Qué debe comprobar el actuario**: (b) «los años que le resten» de la edad ordinaria: ¿meses completos (por defecto) o años completos? (d) Accidente no laboral en alta: el RD 1799/1985, art. 5.4, párr. 2.º, remite a las normas anteriores a la Ley 26/1985 (Decreto 1646/1972, art. 7.1, sin integración de lagunas); confianza actuarial del 60 % en sin-integrar: ¿es firme la lectura frente al art. 5.5 del mismo RD?

**Datos**: parametros/incapacidad-permanente-reglas.json#br-ec-escala-con-anios-hasta-edad, parametros/incapacidad-permanente-reglas.json#br-ec-meses, parametros/incapacidad-permanente-reglas.json#br-ec-divisor, parametros/incapacidad-permanente-reglas.json#br-periodo-corto-coeficiente-divisor, parametros/incapacidad-permanente-reglas.json#br-anl-meses, parametros/incapacidad-permanente-reglas.json#br-anl-divisor

### 7. `param-incapacidad-permanente-reglas-carencia`

**Afirmación**: Periodo mínimo de cotización de la incapacidad permanente por enfermedad común: un tercio del tiempo desde los 16 años (menores de 31) o un cuarto desde los 20 (mínimo cinco años, un quinto en los diez últimos); parcial, 1.800 días en diez años; sin alta, quince años (art. 195 TRLGSS y art. 4 RD 1799/1985).

**Qué debe comprobar el actuario**: (a) ¿Sigue aplicándose el redondeo de la edad a medios años del art. 4.1 del RD 1799/1985 con la regla del art. 195 TRLGSS? (por defecto, no: meses cumplidos). (c) El motor toma el hecho causante como fecha de extinción de la incapacidad temporal: es una simplificación que debe quedar escrita.

**Datos**: parametros/incapacidad-permanente-reglas.json#carencia-general-divisor, parametros/incapacidad-permanente-reglas.json#carencia-joven-divisor, parametros/incapacidad-permanente-reglas.json#carencia-reciente-divisor, parametros/incapacidad-permanente-reglas.json#carencia-redondeo-edad-medio-anio-meses, parametros/incapacidad-permanente-reglas.json#carencia-parcial-dias

## Reglas de las pensiones no contributivas y del MEI

### 8. `param-pnc-reglas`

**Afirmación**: Pensiones no contributivas: requisitos (mayor de 18 y menor de 65 años con discapacidad de al menos el 65 % y cinco años de residencia en incapacidad; 65 años y diez años de residencia en jubilación), cuantía íntegra anual, reducción de las rentas propias que superan el 35 %, mínimo del 25 %, límite de acumulación de recursos de la unidad económica (70 % por cada conviviente adicional), complemento del 50 % por tercera persona y compatibilidad con el trabajo (arts. 363 a 370 TRLGSS y guías del IMSERSO); el cálculo sobre la cuantía íntegra, el límite de compatibilidad con el trabajo y el límite con el complemento de tercera persona se apoyan en la guía del IMSERSO y no en el texto de la ley.

**Qué debe comprobar el actuario**: (d) Art. 363.2: con derecho al complemento de tercera persona, ¿el límite de acumulación de recursos se calcula con el complemento o solo sobre la cuantía íntegra? La guía del IMSERSO lo calcula con el complemento; el texto de la ley no lo dice.

**Datos**: parametros/pnc-reglas.json#incapacidad-edad-minima-meses, parametros/pnc-reglas.json#incapacidad-grado-minimo-pct, parametros/pnc-reglas.json#incapacidad-residencia-total-meses, parametros/pnc-reglas.json#jubilacion-residencia-total-meses, parametros/pnc-reglas.json#unidad-economica-limite-pct-convivientes, parametros/pnc-reglas.json#rentas-compatibles-pct, parametros/pnc-reglas.json#cuantia-minima-pct, parametros/pnc-reglas.json#complemento-tercera-persona-pct, parametros/pnc-reglas.json#compatibilidad-trabajo-limite-iprem, parametros/pnc-reglas.json#limite-acumulacion-con-tercera-persona

## Reglas de cálculo de muerte y supervivencia

### 9. `param-supervivencia-reglas-cuantia`

**Afirmación**: Cuantía de la viudedad, la orfandad y el favor de familiares: viudedad 52 % de la base reguladora (60 % con 65 o más años sin otras rentas; 70 % con cargas familiares y rentas bajas), orfandad y familiares 20 % por beneficiario, incremento del 52 % repartido en la orfandad absoluta; separados y divorciados hasta la pensión compensatoria y, si concurren varios, en proporción al tiempo convivido con el 40 % garantizado al cónyuge o pareja superviviente. Cuando el causante es pensionista, la pensión se incrementa con las mejoras o revalorizaciones de las prestaciones de igual naturaleza por muerte y supervivencia (art. 7.3 del Decreto 1646/1972): el motor usa la revalorización general, que difiere en los años de revalorización diferenciada (por ejemplo, 2013).

**Qué debe comprobar el actuario**: (b) La pensión de un excónyuge limitada por la compensatoria, ¿recibe el complemento a mínimos? Falta un criterio del INSS. (c) Confirmar que el apoyo del incremento de familiares es el art. 23.2 de la Orden de 1967 (remite al 17.2, vigente) y no el art. 39 del Decreto 3158/1966.

**Datos**: parametros/supervivencia-reglas.json#viudedad-pct, parametros/supervivencia-reglas.json#viudedad-65-pct, parametros/supervivencia-reglas.json#viudedad-cargas-pct, parametros/supervivencia-reglas.json#viudedad-cargas-reduccion-limite, parametros/supervivencia-reglas.json#orfandad-pct, parametros/supervivencia-reglas.json#orfandad-absoluta-incremento-pct, parametros/supervivencia-reglas.json#familiares-cuantia-igual-orfandad, parametros/supervivencia-reglas.json#familiares-incremento-sin-viudo, parametros/supervivencia-reglas.json#divorcio-limite-compensatoria, parametros/supervivencia-reglas.json#concurrencia-garantia-pct

### 10. `param-supervivencia-reglas-limites`

**Afirmación**: Límite conjunto de muerte y supervivencia: la suma de las pensiones no excede de la base reguladora (salvo viudedad de más del 52 % con varias orfandades, que pueden llegar al 48 %), con preferencia de la orfandad sobre los familiares y orden nietos y hermanos, padres, abuelos, hijos y hermanos de pensionistas (art. 229 TRLGSS); parejas de hecho y prestación temporal de dos años (arts. 221 y 222). Requisitos de la pareja de hecho (art. 221.2) por periodos: del 2-1-2016 al 31-12-2021, con o sin hijos, convivencia de al menos cinco años más inscripción o documento público con dos años de antelación; del 1-1-2022 al 20-10-2026, con hijos en común basta acreditar la constitución de la pareja; desde el 21-10-2026, con hijos en común se exige una convivencia de al menos dos años ininterrumpidos.

**Qué debe comprobar el actuario**: (a) La norma no dice qué pensión se reduce cuando viudedad y orfandad superan la base reguladora: el motor mantiene la viudedad y reduce las orfandades (alternativa proporcional); falta un criterio. (e) El desarrollo reglamentario del art. 226.2 (hijos y hermanos de pensionistas mayores de 45 años) no se ha localizado.

**Datos**: parametros/supervivencia-reglas.json#limite-conjunto-pct-br, parametros/supervivencia-reglas.json#limite-excepcion-viudedad-umbral-pct, parametros/supervivencia-reglas.json#limite-orfandad-max-pct, parametros/supervivencia-reglas.json#limite-preferencia-orfandad, parametros/supervivencia-reglas.json#limite-viudedad-orfandad-orden-1967, parametros/supervivencia-reglas.json#pareja-convivencia-meses, parametros/supervivencia-reglas.json#prestacion-temporal-meses

## Definiciones (ratio afiliados/pensionistas, pensionistas y pensiones, déficit, Fondo de Reserva)

## Definiciones de salario medio

## Comparativa internacional (comparabilidad de la tasa de reposición y del gasto)

## Afirmaciones circulantes (definiciones de cada una)

### 11. `mito-jubilados-cobran-mas-de-lo-cotizado`

**Afirmación**: Afirmación circulante: «Los jubilados de ahora cobran más de lo que cotizaron.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Definir el cociente valor actual de prestaciones / valor actual de cotizaciones por cohorte (mortalidad del INE por sexo; tipo de descuento: crecimiento de la masa salarial, con el bono a diez años como sensibilidad; solo la parte del tipo de contingencias comunes que financia la jubilación) y decidir qué historiales de cotización harían falta (Muestra Continua de Vidas Laborales). La riqueza de pensiones de la OCDE es valor actual entre salario, no entre cotizaciones: no es directamente comparable.

**Datos**: sistema/pensiones-vigor-pension-media.json#jubilacion-ambos, demografia/esperanza-vida-anual.json#esperanza-vida-65-hombres, demografia/esperanza-vida-anual.json#esperanza-vida-65-mujeres

### 12. `mito-mayores-en-pobreza`

**Afirmación**: Afirmación circulante: «Los pensionistas españoles viven en la pobreza.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar en los metadatos de Eurostat (AROPE) y de la OCDE el umbral de pobreza (60 % y 50 % de la mediana según el revisor), si AROPE incluye más que la pobreza monetaria y si alguna de las dos imputa el alquiler de la vivienda propia; mostrar las dos variantes del umbral si ambas están en /data.

**Datos**: internacional/eurostat-espana.json#pobreza-o-exclusion-total-y-ge65-pc, internacional/ocde-espana.json#oaip-total-y-ge66-z-pt-pop-sex-age

### 13. `mito-espana-gasta-mas-que-europa`

**Afirmación**: Afirmación circulante: «España gasta en pensiones más que la media europea.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar en los metadatos de Eurostat y de la OCDE qué incluye cada medida de gasto (prestaciones en especie, Clases Pasivas, no contributivas) y si existe un agregado de gasto en pensiones de Eurostat más adecuado que vejez más supervivencia; ajuste por estructura de edades.

**Datos**: internacional/eurostat-espana.json#gasto-old-srv-no-aplica-no-aplica-pc-gdp, internacional/ocde-espana.json#pep-no-aplica-z-z-pt-b1gq, internacional/contraste-espana.json#gasto-pensiones-contributivas-sobre-pib

## Mortalidad en edades altas y supuestos de la OCDE

### 14. `demografia-triangulacion-mortalidad-ine-tablas-recalculo-censo-2021`

**Afirmación**: Con el censo de 2021 se calcularon en 2023 nuevas series intercensales (2012-2020) y en noviembre de 2023 se publicaron las tablas de mortalidad sobre la nueva base poblacional.

**Qué debe comprobar el actuario**: Comparar la edición actual de las tablas de mortalidad del INE con la anterior a noviembre de 2023 para saber qué años de 1991-2024 cambiaron (lo más probable según el revisor: 2012-2020 y quizá 2021); ese contraste mediría también el residuo del n.º 2.

**Datos**: demografia/triangulacion-mortalidad.json#ine-tablas-recalculo-censo-2021

### 15. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-politica-fiscal-constante`

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
