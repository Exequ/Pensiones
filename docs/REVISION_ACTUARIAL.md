# Revisión actuarial

Lista de las afirmaciones de `docs/claims.json` que requieren criterio actuarial (no son la transcripción literal de una norma o de una cifra publicada): reglas de cálculo de la pensión de jubilación, reglas de evolución futura, definiciones y las definiciones de salario medio. Para cada una: el identificador del claim, qué se afirma y una pregunta concreta sobre qué debe comprobar el actuario y con qué dato o fórmula. Generado por `scripts/etl/fuentes_claims.py` (diccionario `REVISION`); la pregunta también está en el campo `preguntaActuarial` de `docs/claims.json`.

**Resto de afirmaciones (107)**: no llevan `revisionActuarial` y heredan `revisionActuarialPorDefecto: "no-requiere"` — no requieren revisión actuarial (transcripción literal de una norma o de una cifra publicada, contrastada con su fuente). Para cambiar el estado de una afirmación basta con añadirle `revisionActuarial` (`revisada`, `rechazada` o `pendiente` con `preguntaActuarial`); `npm run validate:data` exige la pregunta en las pendientes.

Para marcar una revisión: poner `revisionActuarial: "revisada"` (o `"rechazada"`) en la afirmación de `docs/claims.json` y anotar el criterio en `notas`.

## Reglas de cálculo de la pensión de jubilación

### 1. `param-escala-porcentajes-jubilacion`

**Afirmación**: Escala de porcentajes por años cotizados (jubilación): 50 % por los primeros 15 años; desde el año 16,º, 0,19 % por cada mes entre el 1 y el 248 y 0,18 % por cada uno de los 16 meses siguientes; máximo 100 % (regla) en 2027.

**Qué debe comprobar el actuario**: Comprobar que la escala de porcentajes por años cotizados vigente en 2027 reproduce el art. 210 TRLGSS. Fórmula: recalcular el porcentaje con data/parametros/escala-porcentajes-jubilacion (50 % a los 15 años; 0,19 % por mes del 1 al 248 y 0,18 % por los 16 siguientes) para 15, 25, 35 y 38,5 años y verificar que el 100 % se alcanza en el número de meses que fija la norma y que cuadra con carrera-jubilacion-65.

**Datos**: parametros/escala-porcentajes-jubilacion.json#2027

### 2. `param-divisor-base-reguladora`

**Afirmación**: Divisor de la base reguladora de jubilación: 378 (divisor) en 2037.

**Qué debe comprobar el actuario**: Comprobar la relación entre el divisor y el número de bases computadas: divisor = meses computados × 14 / 12 (378 = 324 × 14/12 en 2037). Verificar año a año (data/parametros/divisor-base-reguladora y periodo-calculo-base-reguladora) que cada divisor sale de esa fórmula y que el redondeo es el de la norma.

**Datos**: parametros/divisor-base-reguladora.json#2037

### 3. `param-periodo-calculo-base-reguladora`

**Afirmación**: Periodo de cálculo de la base reguladora de jubilación: 348 (meses) en 2037.

**Qué debe comprobar el actuario**: Comprobar la regla «ventana de N meses de la que se toman las M bases de mayor importe» (en 2037, ventana de 348 meses y 324 bases): confirmar con el art. 209 TRLGSS y la DT 4.ª que N y M de cada año son los de la norma y que los meses descartados (24) se elijen por mayor base, no por antigüedad.

**Datos**: parametros/periodo-calculo-base-reguladora.json#2037

### 4. `param-lagunas-integracion`

**Afirmación**: Integración de lagunas de cotización en el cálculo de la base reguladora de jubilación (por versión): 50 (% de la base mínima (el resto de los meses con laguna)) en 2026.

**Qué debe comprobar el actuario**: Comprobar la integración de lagunas por versión (48 meses al 100 % de la base mínima y el resto al 50 %; en 2026 cambia la referencia de la base mínima): ejemplo numérico con una carrera con 60 meses de laguna usando data/parametros/lagunas-integracion y base-minima-rg, y contrastar con art. 209.1.b TRLGSS y las versiones 2010, 2013 y 2016.

**Datos**: parametros/lagunas-integracion.json#2026-tramo2-pct-base-minima

### 5. `param-actualizacion-bases`

**Afirmación**: Actualización de las bases de cotización en el cálculo de la base reguladora de jubilación (por versión): 24 (meses más recientes (anteriores al mes previo al del hecho causante) que se computan sin actualizar) en 2026.

**Qué debe comprobar el actuario**: Comprobar la actualización de las bases de cotización por versión (meses sin actualizar e índice de referencia): reproducir la actualización de una carrera de ejemplo con data/parametros/actualizacion-bases y el IPC de data/parametros/ipc-*, y verificar que los 24 meses más recientes se computan nominalmente en la versión de 2026.

**Datos**: parametros/actualizacion-bases.json#2026-meses-nominales

### 6. `param-opcion-25-anos-ventana`

**Afirmación**: Opción de 25 años (DT 4.ª.7 TRLGSS): ventana de cálculo por año del hecho causante (2026-2043): 318 (meses) en 2043.

**Qué debe comprobar el actuario**: Comprobar la opción de 25 años de la DT 4.ª.7 TRLGSS: que la ventana (en 2043, 318 meses) y su divisor (371) son los de la norma, la regla de 2041-2043 y qué ocurre con el 31/12/2040, que la DT deja ambiguo (decisión documentada en docs/DECISIONES.md). Fórmula: divisor = ventana × 14/12 cuando se computan todas las bases.

**Datos**: parametros/opcion-25-anos-ventana.json#2043

### 7. `param-opcion-25-anos-divisor`

**Afirmación**: Opción de 25 años (DT 4.ª.7 TRLGSS): divisor por año del hecho causante (2026-2043): 371 (divisor (14 pagas: meses × 14/12)) en 2043.

**Qué debe comprobar el actuario**: Comprobar el divisor de la opción de 25 años (en 2043, 371) frente a ventana × 14/12 (318 × 14/12 = 371) y frente a lo que dice literalmente la DT 4.ª.7; confirmar el redondeo y los años 2026-2040 (300 meses, divisor 350).

**Datos**: parametros/opcion-25-anos-divisor.json#2043

## Reglas de evolución (mínimas, revalorización, base y pensión máximas, MEI)

### 8. `param-pension-minima-regla`

**Afirmación**: Regla de evolución de las pensiones mínimas (art. 58.2, DA 53.ª TRLGSS): 100 (% de la brecha entre la cuantía de referencia y el umbral de pobreza de un hogar de dos adultos que se reduce ese año) en 2027.

**Qué debe comprobar el actuario**: Comprobar la regla de la DA 53.ª TRLGSS: reducción de la brecha entre la cuantía de referencia y el umbral de pobreza de un hogar de dos adultos (20 %, 30 %, 50 % y 100 % en 2024-2027 según data/parametros/pension-minima-regla). Verificar que esos porcentajes, el multiplicador del umbral unipersonal (1,5) y el factor del resto de mínimas (50 %) son los de la norma, y recalcular la mínima de jubilación con cónyuge a cargo de 2027 con la fórmula.

**Datos**: parametros/pension-minima-regla.json#2027-brecha-reducida

### 9. `param-revalorizacion-regla`

**Afirmación**: Regla vigente de revalorización anual de las pensiones contributivas (art. 58 TRLGSS): 11 (mes del año anterior (1-12): noviembre) en 2024.

**Qué debe comprobar el actuario**: Comprobar el art. 58 TRLGSS vigente: meses de IPC, último mes de medición (noviembre), suelo e indicadores de data/parametros/revalorizacion-regla; recalcular la revalorización de 2024, 2025 y 2026 con data/parametros/ipc-variacion-* y comparar con revalorizacion-general.

**Datos**: parametros/revalorizacion-regla.json#2024-ultimo-mes-medicion

### 10. `param-base-maxima-incremento-futuro`

**Afirmación**: Incremento anual de la base máxima de cotización sobre el IPC (2024-2050): 1,2 (puntos porcentuales sobre el porcentaje de revalorización de las pensiones (art. 58.2)) en 2050.

**Qué debe comprobar el actuario**: Comprobar la DT 38.ª TRLGSS: la base máxima crece cada año el porcentaje de revalorización más 1,2 puntos (2024-2050). Verificar que la base máxima de 2026 de data/parametros/base-maxima-rg es la de 2025 × (1 + (revalorización + 1,2)/100) y la lectura «acumulativa» (efecto compuesto) frente a la alternativa de sumar siempre sobre la cifra inicial.

**Datos**: parametros/base-maxima-incremento-futuro.json#2050

### 11. `param-pension-maxima-incremento-futuro`

**Afirmación**: Incremento anual de la pensión máxima inicial sobre el IPC (2025-2050): 0,115 (puntos porcentuales sobre el porcentaje de revalorización de las pensiones (art. 58.2)) en 2050.

**Qué debe comprobar el actuario**: Comprobar la DT 39.ª TRLGSS: la pensión máxima inicial crece el porcentaje de revalorización más 0,115 puntos (2025-2050). Verificar con data/parametros/pension-maxima que 2025 y 2026 cuadran y justificar la lectura compuesta frente a la lineal (decisión documentada en docs/DECISIONES.md).

**Datos**: parametros/pension-maxima-incremento-futuro.json#2050

### 12. `param-mei-tipo-total`

**Afirmación**: Tipo de cotización del Mecanismo de Equidad Intergeneracional (MEI): 1,2 (puntos porcentuales) en 2029.

**Qué debe comprobar el actuario**: Comprobar la senda del Mecanismo de Equidad Intergeneracional (0,6 puntos en 2023 hasta 1,2 en 2029; empresa 0,5 a 1,0 y trabajador 0,1 a 0,2): que data/parametros/mei-tipo-total, mei-tipo-empresa y mei-tipo-trabajador suman y se reparten como dice el art. 127 bis TRLGSS y sobre qué base de cotización se aplica (contingencias comunes, con topes).

**Datos**: parametros/mei-tipo-total.json#2029

### 13. `param-mei-destino`

**Afirmación**: Destino de la cotización finalista del MEI (art. 127 bis TRLGSS): 1 (indicador (1 = no computa para prestaciones)) en 2023.

**Qué debe comprobar el actuario**: Comprobar la afirmación sobre el destino del MEI (art. 127 bis: nutre el Fondo de Reserva y no computa a efectos de prestaciones). Contrastar la recaudación (derechos reconocidos de «Mecanismo de Equidad Intergeneracional» en la ejecución del presupuesto) con las dotaciones anuales del Fondo de data/sistema/fondo-reserva-series y explicar la diferencia.

**Datos**: parametros/mei-destino.json#no-computable-prestaciones

## Definiciones (ratio afiliados/pensionistas, pensionistas y pensiones, déficit, Fondo de Reserva)

### 14. `sistema-relacion-afiliados-pensiones-afiliados-diciembre-por-pensionista`

**Afirmación**: Afiliados medios de diciembre (total sistema) por pensionista (personas) a diciembre: 2,31 (razón (afiliados por pensionista o por pensión)) en 2025.

**Qué debe comprobar el actuario**: Comprobar el significado de la relación afiliados/pensionistas: el numerador son afiliados (relaciones laborales, con pluriempleo, y media mensual de diciembre) y el denominador pensionistas (personas) a 1 de diciembre; no son cotizantes ni personas ocupadas. Comparar las cuatro definiciones de data/sistema/relacion-afiliados-pensiones y la Alternativa 1 (último día de diciembre entre pensiones a 1 de enero) y decidir cuál se usa en el modelo; las alternativas sin doble cómputo están en PENDIENTE_DATOS.

**Datos**: sistema/relacion-afiliados-pensiones.json#afiliados-diciembre-por-pensionista

### 15. `sistema-relacion-afiliados-pensiones-alternativa-1-afiliados-por-pension-alternativa-1`

**Afirmación**: Alternativa 1: afiliados a último día de diciembre ÷ pensiones en vigor a 1 de enero siguiente: 2,07 (afiliados por pensión) en 2025.

**Qué debe comprobar el actuario**: Comprobar la definición de la Alternativa 1: afiliados a último día de diciembre del año t entre pensiones en vigor a 1 de enero de t+1 (data/sistema/relacion-afiliados-pensiones-alternativa-1). Verificar que el numerador es el total del sistema a último día (incluye empleados de hogar y regímenes especiales) y que las pensiones de enero (fichero REG) son un stock a 1 de enero; calcular la diferencia con la definición con datos de diciembre.

**Datos**: sistema/relacion-afiliados-pensiones-alternativa-1.json#afiliados-por-pension-alternativa-1

### 16. `sistema-pensionistas-pensiones-historico-pensionistas`

**Afirmación**: Pensionistas del sistema contributivo (personas) a diciembre: 9438579 (personas) en 2025.

**Qué debe comprobar el actuario**: Comprobar la diferencia entre pensionistas (personas) y pensiones (una persona puede percibir varias: 10.434.856 pensiones para 9.438.579 pensionistas en 2025, 1,11 pensiones por pensionista, según data/sistema/pensionistas-pensiones-historico): qué denominador corresponde a cada uso (gasto por persona, ratio de dependencia, tasa de reposición) y cómo se trata la acumulación de viudedad con jubilación.

**Datos**: sistema/pensionistas-pensiones-historico.json#pensionistas

### 17. `sistema-deficit-presupuestario-seguridad-social-saldo-presupuestario-no-financiero`

**Afirmación**: Saldo presupuestario no financiero (derechos reconocidos netos menos obligaciones reconocidas por operaciones no financieras): -7187,89 (millones de euros) en 2025.

**Qué debe comprobar el actuario**: Comprobar la definición de déficit presupuestario: derechos reconocidos netos menos obligaciones reconocidas por operaciones no financieras (excluye pasivos financieros y préstamos del Estado), frente al saldo con transferencias del Estado y al saldo contributivo ajustado. Contrastar con data/sistema/deficit-definiciones y deficit-presupuestario-seguridad-social.

**Datos**: sistema/deficit-presupuestario-seguridad-social.json#saldo-presupuestario-no-financiero

### 18. `sistema-deficit-sec-fondos-seguridad-social-b9-mio-eur`

**Afirmación**: Capacidad (+) / necesidad (-) de financiación (B.9) de los fondos de la Seguridad Social, SEC 2010: -5612,0 (millones de euros) en 2025.

**Qué debe comprobar el actuario**: Comprobar la definición SEC 2010 (B.9, capacidad o necesidad de financiación del subsector Fondos de la Seguridad Social, S.1314): criterios de devengo y de sectorización frente al saldo presupuestario; ruptura de 2002 por la sanidad (docs/DISCREPANCIAS.md). Contrastar 2025 con data/sistema/deficit-presupuestario-seguridad-social.

**Datos**: sistema/deficit-sec-fondos-seguridad-social.json#b9-mio-eur

### 19. `sistema-fondo-reserva-series-valor-fin-ano`

**Afirmación**: Valor del Fondo de Reserva a 31 de diciembre: 14070 (millones de euros) en 2025.

**Qué debe comprobar el actuario**: Comprobar el criterio de valoración del Fondo de Reserva: el informe a las Cortes lo da a precio de adquisición (no a mercado). Contrastar el valor de 31 de diciembre con dotaciones, rendimientos y disposiciones de data/sistema/fondo-reserva-series (diferencias por redondeo de hasta 2 millones) y decidir qué valoración usa el modelo.

**Datos**: sistema/fondo-reserva-series.json#valor-fin-ano

## Definiciones de salario medio

### 20. `macro-salario-medio-definiciones-eaes-ambos`

**Afirmación**: EAES: salario medio bruto anual por trabajador, ambos: 29540,26 (euros/año) en 2024.

**Qué debe comprobar el actuario**: Comprobar el concepto y la cobertura de la ganancia media anual de la EAES (devengos brutos anuales por asalariado, centros de cotización de industria, construcción y servicios con alta todo el mes de octubre; excluye agricultura y parte de las Administraciones Públicas) y su idoneidad como proxy del salario de la carrera; calcular su razón con la base máxima (data/macro/salario-medio-razon-base-maxima).

**Datos**: macro/salario-medio-definiciones.json#eaes-ambos

### 21. `macro-salario-medio-definiciones-etcl-coste-salarial-total`

**Afirmación**: ETCL: coste salarial total por trabajador y mes, media de los cuatro trimestres, ambas jornadas: 2376,55 (euros/mes) en 2025.

**Qué debe comprobar el actuario**: Comprobar el concepto de la ETCL (coste salarial por trabajador y mes, media de trimestres) y la conversión a año (12 veces la media mensual, sin pagas aparte porque los pagos extraordinarios van en el trimestre en que se pagan); verificar frente a la EAES en los años comunes (2008-2024) y su cobertura sectorial.

**Datos**: macro/salario-medio-definiciones.json#etcl-coste-salarial-total

### 22. `macro-salario-medio-definiciones-cn-remuneracion-por-asalariado-puesto`

**Afirmación**: Contabilidad Nacional: remuneración de asalariados / asalariados (puestos de trabajo): 41132,88 (euros/año) en 2025.

**Qué debe comprobar el actuario**: Comprobar que la remuneración de asalariados de la Contabilidad Nacional incluye cotizaciones sociales del empleador (no es salario bruto) y que dividida por asalariados (puestos, ETC o personas) da tres cifras distintas; decidir qué denominador y qué ajuste (restar cotizaciones empresariales) se necesita para compararla con la EAES o con la base media.

**Datos**: macro/salario-medio-definiciones.json#cn-remuneracion-por-asalariado-puesto

### 23. `macro-salario-medio-definiciones-base-media-cotizacion-rg-ambos`

**Afirmación**: TGSS: base media de cotización por contingencias comunes del Régimen General, media anual ponderada, ambos: 2286,22 (euros/mes) en 2025.

**Qué debe comprobar el actuario**: Comprobar que la base media de cotización (Régimen General, contingencias comunes, personas físicas con al menos un día cotizado, topada por la base máxima y sin agrario, hogar ni artistas) no es un salario: está topada, mezcla jornadas y meses parciales y solo existe desde 2018 en el fichero descargado. Valorar su uso para la tasa de reposición y el efecto del tope (razón con la base máxima).

**Datos**: macro/salario-medio-definiciones.json#base-media-cotizacion-rg-ambos

## Comparativa internacional (comparabilidad de la tasa de reposición y del gasto)

### 24. `internacional-ocde-espana-gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024`

**Afirmación**: Gross pension replacement rate at 100% of average wage: 80,4 (Percentage of gross pre-retirement earnings at the same income level) en 2024.

**Qué debe comprobar el actuario**: Comprobar la comparabilidad de la tasa de reposición teórica bruta de la OCDE (carrera completa desde los 22 años, pensión obligatoria, 100 % del salario medio, parámetros de 2024) con una tasa calculada con las reglas propias (data/parametros: escala de porcentajes, periodo de cálculo, actualización de bases, pensión máxima) y con los cocientes empíricos de data/internacional/contraste-espana; en concreto, qué supuestos de crecimiento del salario y de indexación hay detrás del 80,4 % y si la tasa neta (86,3 %) usa los mismos impuestos y cotizaciones que el cálculo propio.

**Datos**: internacional/ocde-espana.json#gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024

### 25. `internacional-contraste-espana-pension-altas-sobre-salario-eaes`

**Afirmación**: Cociente entre la pensión media de las altas iniciales de jubilación (ambos sexos) × 14 pagas y el salario medio «eaes»: 0,74 (razón) en 2024.

**Qué debe comprobar el actuario**: Comprobar que el cociente entre la pensión media de las altas de jubilación (14 pagas) y la ganancia media de la EAES no es una tasa de reposición: mezcla carreras de distinta duración y compara con el salario de todos los trabajadores del ámbito de la EAES. Decidir si debe usarse como referencia empírica de sensibilidad frente a la tasa teórica de la OCDE y con qué definición de salario (EAES, ETCL, Contabilidad Nacional, base media).

**Datos**: internacional/contraste-espana.json#pension-altas-sobre-salario-eaes

### 26. `internacional-contraste-espana-gasto-pensiones-contributivas-sobre-pib`

**Afirmación**: Obligaciones reconocidas por «suma de pensiones» (contributivas) del Sistema de la Seguridad Social sobre el PIB: 10,8 (% del PIB) en 2025.

**Qué debe comprobar el actuario**: Comprobar la delimitación del gasto: la fila «suma de pensiones» de la ejecución (obligaciones reconocidas) excluye Clases Pasivas, pensiones no contributivas y el complemento a mínimos (que va en otra fila, ver docs/INFORME_VERIFICACION.md). Decidir qué delimitación comparable con OCDE, Eurostat y Ageing Report usará el modelo.

**Datos**: internacional/contraste-espana.json#gasto-pensiones-contributivas-sobre-pib

## Afirmaciones circulantes (definiciones de cada una)

### 27. `mito-hucha-vaciada`

**Afirmación**: Afirmación circulante: «La hucha de las pensiones se ha vaciado.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar el criterio de valoración (precio de adquisición) y la secuencia dotaciones, rendimientos y disposiciones del Fondo de Reserva; decidir con qué referencia (valor máximo, saldo actual, años de gasto cubiertos) se formula «vaciado» y calcular los meses de gasto en pensiones que cubre el valor de cada año.

**Datos**: sistema/fondo-reserva-series.json#valor-fin-ano, sistema/fondo-reserva-series.json#disposiciones-anuales, parametros/mei-destino.json#destino-fondo-reserva

### 28. `mito-pensiones-con-impuestos`

**Afirmación**: Afirmación circulante: «Las pensiones se pagan con los impuestos.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar la separación de fuentes de financiación (contributivas frente a no contributivas) y el desglose de las transferencias por finalidad; decidir cómo se atribuyen los complementos a mínimos y las reducciones de cuotas al calcular la proporción financiada con cotizaciones.

**Datos**: sistema/deficit-presupuestario-seguridad-social.json#transferencias-estado-corrientes, sistema/gastos-impropios.json#transferencia-prevista-pge-2021, parametros/prestamos-estado-seguridad-social.json#2021-importe-maximo

### 29. `mito-menos-cotizantes-por-pensionista`

**Afirmación**: Afirmación circulante: «Hay cada vez menos cotizantes por pensionista.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar qué es un «cotizante» frente a un afiliado (pluriempleo, regímenes especiales, situaciones sin cotización) y un «pensionista» frente a una pensión; elegir la definición coherente con el uso en el modelo y valorar el efecto del doble cómputo sobre el nivel y la tendencia.

**Datos**: sistema/relacion-afiliados-pensiones.json#afiliados-diciembre-por-pensionista, sistema/relacion-afiliados-pensiones.json#afiliados-media-anual-por-pension, sistema/relacion-afiliados-pensiones-alternativa-1.json#afiliados-por-pension-alternativa-1, demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-84, demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-59

### 30. `mito-jubilados-cobran-mas-de-lo-cotizado`

**Afirmación**: Afirmación circulante: «Los jubilados de ahora cobran más de lo que cotizaron.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Definir el cociente valor actual de prestaciones / valor actual de cotizaciones por cohorte (tipo de descuento, mortalidad de data/demografia, cotización de trabajador y de empresa) y decidir qué datos de historiales de cotización harían falta; comparar con la riqueza de pensiones de la OCDE.

**Datos**: sistema/pensiones-vigor-pension-media.json#jubilacion-ambos, demografia/esperanza-vida-anual.json#esperanza-vida-65-hombres, demografia/esperanza-vida-anual.json#esperanza-vida-65-mujeres

### 31. `mito-sistema-en-deficit`

**Afirmación**: Afirmación circulante: «El sistema de pensiones está en déficit.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar las definiciones de déficit (presupuestario no financiero, total, SEC 2010 y saldo contributivo ajustado de la AIReF) y su reconciliación (criterio de caja o devengo, sectorización, tratamiento de transferencias y préstamos); decidir cuál se usa en cada magnitud del modelo.

**Datos**: sistema/deficit-presupuestario-seguridad-social.json#saldo-presupuestario-no-financiero, sistema/deficit-presupuestario-seguridad-social.json#saldo-presupuestario-total, sistema/deficit-sec-fondos-seguridad-social.json#b9-mio-eur, sistema/deficit-sec-fondos-seguridad-social.json#b9-pc-gdp, sistema/gastos-impropios.json#deficit-estimado-2023

### 32. `mito-edad-real-de-jubilacion-65`

**Afirmación**: Afirmación circulante: «La edad de jubilación real es 65.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar qué mide cada edad (legal, de alta, efectiva de salida del mercado laboral, de la OCDE para carrera completa), con la dependencia de la carrera cotizada y las modalidades anticipadas, y decidir cuál debe alimentar la edad de jubilación del modelo.

**Datos**: parametros/edad-ordinaria-jubilacion.json#2025, parametros/carrera-jubilacion-65.json#2025, sistema/edad-media-altas-jubilacion.json#edad-media-altas-jubilacion, internacional/ocde-espana.json#crplf22-hombres-z-z-y-2024, internacional/ocde-espana.json#elmea-hombres-z-z-y, internacional/contraste-espana.json#meses-carrera-completa-desde-22-hasta-65

### 33. `mito-pensiones-publicas-insostenibles`

**Afirmación**: Afirmación circulante: «Las pensiones públicas son insostenibles.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar los criterios de sostenibilidad aplicables (gasto/PIB, saldo, ratio de dependencia, mecanismos automáticos como el MEI), la sensibilidad a las hipótesis de fecundidad, mortalidad y migración (INE, EUROPOP2025, Ageing Report) y las reglas vigentes de revalorización y base máxima.

**Datos**: demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-64, demografia/ageing-report-2024-espana.json#ageing-report-2024-ii-1-74, internacional/ocde-espana.json#ppep-no-aplica-z-z-pt-b1gq, demografia/proyecciones-hipotesis.json#tasa-dependencia-proyectada, internacional/eurostat-espana.json#gasto-old-srv-no-aplica-no-aplica-pc-gdp

### 34. `mito-mayores-en-pobreza`

**Afirmación**: Afirmación circulante: «Los pensionistas españoles viven en la pobreza.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar la sensibilidad de las tasas de pobreza al umbral y a la escala de equivalencia, el tratamiento de la vivienda en propiedad y otro patrimonio, y la comparabilidad del indicador AROPE de Eurostat con el OAIP de la OCDE.

**Datos**: internacional/eurostat-espana.json#pobreza-o-exclusion-total-y-ge65-pc, internacional/ocde-espana.json#oaip-total-y-ge66-z-pt-pop-sex-age

### 35. `mito-pensiones-sustituyen-casi-todo-el-salario`

**Afirmación**: Afirmación circulante: «En España la pensión sustituye casi todo el último salario.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar la comparabilidad de la tasa de reposición teórica de la OCDE (carrera completa desde los 22, indexación de ingresos y supuestos de crecimiento) con una tasa calculada a partir de las reglas propias (escala de porcentajes, base reguladora, actualización de bases) y con los cocientes empíricos; reproducir el 100 % del salario medio con la fórmula vigente.

**Datos**: internacional/ocde-espana.json#gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024, internacional/ocde-espana.json#nprr100-hombres-z-m-pt-earn-n-pre-ret-inc-2024, internacional/ocde-espana.json#gprr200-hombres-z-m-pt-earn-g-pre-ret-inc-2024, internacional/contraste-espana.json#pension-altas-sobre-salario-eaes, internacional/contraste-espana.json#pension-vigor-sobre-salario-eaes

### 36. `mito-espana-gasta-mas-que-europa`

**Afirmación**: Afirmación circulante: «España gasta en pensiones más que la media europea.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar la comparabilidad de las definiciones de gasto (ESSPROS vejez y supervivencia, gasto público en pensiones de la OCDE, pensiones contributivas del Sistema) y plantear una comparación ajustada por estructura de edades (por ejemplo, gasto por mayor de 65 años o relativo al PIB por trabajador).

**Datos**: internacional/eurostat-espana.json#gasto-old-srv-no-aplica-no-aplica-pc-gdp, internacional/ocde-espana.json#pep-no-aplica-z-z-pt-b1gq, internacional/contraste-espana.json#gasto-pensiones-contributivas-sobre-pib

### 37. `mito-pensiones-siempre-con-el-ipc`

**Afirmación**: Afirmación circulante: «Las pensiones se revalorizan siempre con el IPC.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar año a año la diferencia entre el porcentaje de revalorización de data/parametros/revalorizacion-general y las distintas medidas de IPC (media anual, diciembre, media de 12 meses hasta noviembre), identificar los años con regla distinta y calcular el efecto acumulado sobre el poder adquisitivo con cada medida.

**Datos**: parametros/revalorizacion-regla.json#2024-ultimo-mes-medicion

### 38. `mito-sin-nacimientos-no-hay-pensiones`

**Afirmación**: Afirmación circulante: «Con menos nacimientos no se podrán pagar las pensiones.» El catálogo muestra los datos y las definiciones que la condicionan; no emite veredicto.

**Qué debe comprobar el actuario**: Comprobar la contribución relativa de fecundidad, mortalidad, migración y empleo a la tasa de dependencia y al gasto en pensiones (análisis de sensibilidad del Ageing Report y variantes de EUROPOP2025) y qué hipótesis de empleo y productividad hacen falta para pasar de la dependencia demográfica a la económica.

**Datos**: demografia/fecundidad-indicadores.json#icf-ambas, demografia/proyecciones-hipotesis.json#icf-proyectado, demografia/proyecciones-hipotesis.json#tasa-dependencia-proyectada, demografia/europop2025-indicadores.json#europop2025-olddep1, macro/pib-ine.json#pib-corriente, demografia/migraciones-exterior-anual.json#saldo-exterior-ambos-publicado-emcr
