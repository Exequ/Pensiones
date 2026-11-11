# Discrepancias detectadas

Fecha: 2026-11-11.

- **Base máxima de cotización 2026 (euros/mes)** (revisar): valor 5.101,20 (fuente BOE-A-2026-7296); coincide en BOE-A-2026-2548 pero no se localiza en BOE-A-2026-1484.
- **base-maxima-rg 2018**: el contraste con BOE-A-2018-9268 no coincide. Localización: artículo sobre bases y tipos de cotización. La Ley 6/2018 (julio de 2018) elevó el tope desde el primer día del mes siguiente a su entrada en vigor; la orden de enero de 2018 recogía el tope de la prórroga. No es una discrepancia: son dos periodos del mismo año. Cita: «tope máximo de la base de cotización en cada uno de los Regímenes de la Seguridad Social que lo tengan establecido, queda fijado, a partir del día primero del mes siguiente al de la entrada en vigor de la presente norma, en la cuantía de 3.803,70 euros mensuales».
- **pension-minima-viudedad 2013**: el contraste con BOE-A-2012-15651 no coincide. Importe distinto en otra norma del mismo año; se toma la norma posterior (en el orden de NORMAS), que prevalece.

## Fase 1B-1

- **Pensiones contributivas en vigor a 1 dic. 2021**: 9.916.915 en la fuente del dato frente a 9.916.966 en «PTAS, serie histórica (Pnes y ptas)» (diferencia -51). No se ha corregido: la Seguridad Social revisa las series históricas; se conserva cada cifra con su origen.
- **Pensiones contributivas en vigor a 1 dic. 2022**: 9.994.793 en la fuente del dato frente a 9.994.836 en «PTAS, serie histórica (Pnes y ptas)» (diferencia -43). No se ha corregido: la Seguridad Social revisa las series históricas; se conserva cada cifra con su origen.
- **Pensiones contributivas en vigor a 1 dic. 2023**: 10.111.955 en la fuente del dato frente a 10.111.991 en «PTAS, serie histórica (Pnes y ptas)» (diferencia -36). No se ha corregido: la Seguridad Social revisa las series históricas; se conserva cada cifra con su origen.
- **Suma de regímenes en 2008 (jubilación, ambos sexos)**: 14 pensiones menos que el total del sistema en el mismo fichero (celdas «no consta» de la fuente).
- **Afiliados por sexo y edad (2021-2025)**: entre 36 y 49 afiliados sin sexo y entre 94 y 194 sin tramo de edad respecto del total, según el año; la suma por sexo o por tramo no coincide exactamente con el total.

## Fase 1B-2

- **Eurostat, 2000-2001**: el subsector S.1314 incluye la sanidad hasta 2002 (nota de España en los metadatos de Eurostat); la serie no es comparable antes y después de 2002.
- **Fondo de Reserva (valor)**: el valor publicado difiere hasta en 1 millón de dotaciones + rendimientos + disposiciones por redondeo de las tablas (comprobado en tests con tolerancia de 2).
- **Pasivos financieros 2017-2025**: coinciden con los importes autorizados por las leyes de PGE de 2021, 2022 y 2023; en 2018, 2019, 2024 y 2025 (presupuestos prorrogados) los importes repiten los de 2021 (13.830,09) y 2023 (10.003,81) sin que se haya descargado la norma que los autoriza.
- No hay discrepancias numéricas entre las publicaciones contrastadas.

<!-- discrepancias-1b3:inicio -->
## Fase 1B-3

- **Población total INE frente a Eurostat**: 32 de 55 años (1971-2025) difieren; diferencia máxima 116 personas en 2022 (0,0002 % en términos relativos).
- **Población por grupos de edad INE frente a Eurostat**: diferencia máxima 108 personas (2022, grupo 15-64). Eurostat no incluye en las edades a las personas de edad desconocida.
- **Población de 1 de enero de 2026**: la proyección del INE (publicada el 17/06/2026) parte de 49.590.099 y la ECP provisional descargada (tabla 59583, revisada en agosto de 2026) da 49.596.376 (diferencia -6.277). La metodología de la proyección dice que parte de las cifras provisionales de 1 de enero de 2026, que la ECP ha revisado después.
- **Población, hombres + mujeres frente a ambos sexos**: en las series 1971-2012 la suma de sexos difiere del total publicado hasta en 12 personas por edad y año agregados; son redondeos de las estimaciones intercensales del INE. Se publican tal cual, sin ajustar.
- **Proyecciones de población**: INE 2026-2076, EUROPOP2025 (Eurostat) y Ageing Report 2024 (Comisión Europea) parten de hipótesis y fechas distintas y dan poblaciones distintas; no son erratas sino escenarios (cifras en docs/INFORME_VERIFICACION.md).
- **Saldo migratorio exterior de 2021**: 148.070 personas en la Estadística de Migraciones (EM) y 191.094 en la Estadística de Migraciones y Cambios de Residencia (EMCR). Son dos metodologías distintas del INE; se publican por separado y no se empalman.
- **PIB corriente INE frente a Eurostat**: difieren 4 de 31 años (1995, 1996, 1997, 1998); diferencia máxima 17.151 millones de euros en 1996 (3,51 %). El resto de años (desde 1999) coincide al euro. Las dos fuentes no se han podido reconciliar con los documentos descargados; el deflactor y el volumen de esos años difieren en consecuencia.
- **Salario medio**: las cuatro definiciones (EAES, ETCL, Contabilidad Nacional y base media de cotización) dan cifras distintas por diseño: ámbito (EAES excluye agricultura y parte de las Administraciones Públicas y exige alta todo octubre), concepto (ganancia bruta, coste salarial, remuneración con cotizaciones del empleador, base de cotización) y unidad. No se han forzado a coincidir; las cifras lado a lado están en docs/INFORME_VERIFICACION.md.
- **BEL PEN-31 frente a las mínimas y la máxima de data/parametros (2000-2011)**: el BEL da importes superiores a los de las normas anuales, con un porcentaje constante por año (2001: +0,68 %, 2002: +1,86 %, 2003: +0,78 %, 2004: +1,47 %, 2005: +1,37 %, 2006: +0,59 %, 2007: +2,06 %, 2008: +0,39 %, 2010: +1,29 %, 2011: +1,88 %). Los datos de data/parametros son los de la norma publicada; el patrón sugiere que el BEL recoge los importes tras la actualización posterior por desviación del IPC, pero la fuente descargada no lo dice y no se ha verificado: queda para revisión actuarial.
- **BEL PEN-31, otras diferencias**: 2000 maxima: BEL 26.102,27 frente a 25.575,76 en data/parametros; 2012 ip-gran-invalidez-conyuge-no-cargo: BEL 12.327,00 frente a 13.327,00 en data/parametros; 2022 maxima: BEL 39.474,00 frente a 39.468,52 en data/parametros. En 2012 (gran invalidez, con cónyuge no a cargo) el texto del BOE descargado dice 13.327,00, más que la mínima unipersonal del mismo año (12.997,60) cuando debería ser menor, y fuera de la tendencia de la serie; el BEL da 12.327,00, coherente con 2011 (12.203,80) y 2013 (12.574,80). Se mantiene el valor del BOE (cita literal) y se señala el posible error del texto de la norma; confirmar con el BOE oficial.
- **Mortalidad proyectada del INE (tabla 36659), unidad de mx y qx**: la tabla se etiqueta «Tanto por mil», pero mx y qx vienen en tanto por uno (q0 de 2026 = 0,0025; en las tablas históricas del INE, 2,6 por mil). Solo con qx en tanto por uno se cumple l(x+1) = lx × (1 − qx). En data/demografia/proyecciones-mortalidad se publican multiplicados por 1.000 (por mil), como en mortalidad-ine; lx, dx, Lx, Tx y ex no se tocan.
- **Mortalidad proyectada, tabla de funciones frente a hipótesis del INE**: el riesgo de muerte a edad 0 de las mujeres en 2026 es 2,524 por mil en la tabla de funciones (36659) y 2,513 por mil en la tabla de hipótesis (36774); no se ha podido explicar con la metodología descargada (la hipótesis se formula sobre la esperanza de vida al nacimiento). Se publican las dos tablas; el modelo debería elegir una y documentarla.
- **Migraciones EM 2008-2021, saldo exterior**: la suma por edades de inmigración menos emigración difiere del saldo publicado hasta en 8 personas por año (redondeos del INE).
<!-- discrepancias-1b3:fin -->
