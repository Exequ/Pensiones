# Dudas actuariales, tercera tanda, parte A: Parámetros (22 afirmaciones)

Formato de respuesta, una fila por afirmación, en una tabla con estas columnas:
| nº | id | respuesta (confirmo / corrijo / retiro) | confianza (alta / media / baja) | fuente o norma que lo respalda (artículo, documento, página) | cambio de texto propuesto, si corrijo |

Reglas: no confirmes por defecto. Si no puedes respaldar una afirmación con una fuente o con un cálculo que puedas reproducir, responde «corrijo» o «retiro», o «confirmo» con confianza baja y di qué falta. Las cifras no se tocan: son las de los ficheros descargados; lo que se revisa es la interpretación, la definición y la redacción. Al final, lista las que has dejado con confianza baja.


## Datos de parámetros (módulo «Cómo se calcula» y «Metodología») (22)

**30. `param-actualizacion-bases`**  
Afirmación: Actualización de las bases de cotización en el cálculo de la base reguladora de jubilación (por versión): 24 (meses más recientes (anteriores al mes previo al del hecho causante) que se computan sin actualizar) en 2026.  
Pregunta: Comprobar la actualización de las bases de cotización por versión (meses sin actualizar e índice de referencia): reproducir la actualización de una carrera de ejemplo con data/parametros/actualizacion-bases y el IPC mensual de data/parametros/ipc-indice-mensual, y verificar que los 24 meses más recientes se computan nominalmente en la versión de 2026. Dos dudas. (1) IPC mensual (Fase 2-D): el motor usa por defecto el índice mensual real del INE (lectura interpolacionIPC = mensual-ine, mejora de datos y no una lectura legal; alternativas: medias anuales interpoladas y escalón anual). De 2002 en adelante es la serie del INE sin transformar; el INE no publica el índice de 2001 en la base vigente y advierte de que no se pueden calcular variaciones entre IPC-92 e IPC-2001, de modo que 2001 se obtiene con las variaciones anuales de 2002 que publica el INE y 1992-2000 con la serie de base 1992 enlazada (confianza media). Confirmar que el autocálculo de la Seguridad Social usa el mismo índice para los meses anteriores a 2002 (sus informes muestran el factor de cada mes). (2) Suelo del factor de actualización (lectura actualizacionFactorMinimo, por defecto suelo-1 desde la Fase 2-E, lectura provisional): los nueve informes del autocálculo aportados nunca muestran un factor inferior a 1,0000000; cuando el índice del mes de referencia es menor que el del mes de la base, el factor sale 1. El art. 209 TRLGSS habla de actualizar «de acuerdo con la evolución del IPC» y no menciona ese suelo: decidir si el motor aplica el suelo de uno (lectura suelo-1) o deja que el factor baje de uno. Efecto medido en docs/INFORME_VERIFICACION.md (Fase 2-D): hasta 0,3 euros al mes (0,014 %) en los casos de Sergio; la evidencia de los informes está en docs/REVISION_PRIORIZADA.md.

**31. `param-base-maxima-incremento-futuro`**  
Afirmación: Incremento anual de la base máxima de cotización sobre el IPC (2024-2050): 1,2 (puntos porcentuales sobre el porcentaje de revalorización de las pensiones (art. 58.2)) en 2050.  
Pregunta: Comprobar la DT 38.ª TRLGSS: la base máxima crece cada año el porcentaje de revalorización más 1,2 puntos (2024-2050). Verificar que la base máxima de 2026 de data/parametros/base-maxima-rg es la de 2025 × (1 + (revalorización + 1,2)/100) y la lectura «acumulativa» (efecto compuesto) frente a la alternativa de sumar siempre sobre la cifra inicial.

**32. `param-base-minima-rg`**  
Afirmación: Base mínima de cotización del Régimen General (grupos 4 a 7): 1424,4 (euros/mes) en 2026.  
Pregunta: La base mínima de 2020 (1.108,50, del anexo al informe económico-financiero de los presupuestos de la Seguridad Social de 2021) consta con confianza alta, y la de 2021 es un valor deducido (confianza media: la Ley 11/2020 la incrementa en el porcentaje del SMI, que no cambió hasta el 1-9-2021; desde esa fecha fue 1.125,90, y el fichero guarda un valor por año). La ley no fija su evolución posterior a 2026 en /data: el motor la proyecta con el IPC del escenario desde 2027. Confirmar la cuantía de 2020 y 2021 con una orden o resolución y aportar la regla de evolución (vinculada al SMI).

**33. `param-carrera-jubilacion-65`**  
Afirmación: Cotización exigida para jubilarse a los 65 años: 462 (meses cotizados) en 2027.  
Pregunta: Comprobar cómo se aplica la DT 7.ª: (1) la carrera que permite jubilarse a los 65 años se mide con los meses cotizados al hecho causante (jubilación ordinaria); (2) en las anticipadas, con los meses que habría cotizado hasta los 65 años (proyección) y el calendario del año del hecho causante, no el del año en que cumpliría la edad; (3) los meses se cuentan completos y sin parte proporcional de pagas extra. Confirmar (2), que es la que decide la anticipación.

**34. `param-divisor-base-reguladora`**  
Afirmación: Divisor de la base reguladora de jubilación: 378 (divisor) en 2037.  
Pregunta: Comprobar la relación entre el divisor y el número de bases computadas: divisor = meses computados × 14 / 12 (378 = 324 × 14/12 en 2037). Verificar año a año (data/parametros/divisor-base-reguladora y periodo-calculo-base-reguladora) que cada divisor sale de esa fórmula y que el redondeo es el de la norma.

**35. `param-escala-jubilacion-tramos`**  
Afirmación: Escala de porcentajes de la jubilación por meses cotizados (DT 9.ª y art. 210.1 TRLGSS), en forma numérica: 0,18 (% de la base reguladora por cada mes adicional del segundo tramo) en 2027.  
Pregunta: Comprobar que la escala en forma numérica (50 % a los 15 años; 0,21 % y 0,19 % por mes según DT 9.ª hasta 2026; 0,19 % y 0,18 % desde 2027) reproduce el texto de la DT 9.ª y del art. 210.1: con el motor, para 15, 25, 35 y 37 años cotizados en 2026 y en 2027 debe dar 50 %, 77,x %, 95,x % y 100 %; y que los meses para el 100 % coinciden con data/parametros/cotizacion-para-100 (hay un test que lo comprueba).

**36. `param-escala-porcentajes-jubilacion`**  
Afirmación: Escala de porcentajes por años cotizados (jubilación): 50 % por los primeros 15 años; desde el año 16,º, 0,19 % por cada mes entre el 1 y el 248 y 0,18 % por cada uno de los 16 meses siguientes; máximo 100 % (regla) en 2027.  
Pregunta: Comprobar que la escala de porcentajes por años cotizados vigente en 2027 reproduce el art. 210 TRLGSS. Fórmula: recalcular el porcentaje con data/parametros/escala-porcentajes-jubilacion (50 % a los 15 años; 0,19 % por mes del 1 al 248 y 0,18 % por los 16 siguientes) para 15, 25, 35 y 38,5 años y verificar que el 100 % se alcanza en el número de meses que fija la norma y que cuadra con carrera-jubilacion-65.

**40. `param-jubilacion-coeficientes-involuntaria`**  
Afirmación: Coeficientes reductores de la jubilación anticipada por causa no imputable al trabajador (art. 207.2 TRLGSS): 534 (meses cotizados desde los que se aplica el tramo) en 2022.  
Pregunta: Comprobar el cuadro del art. 207.2 (coeficientes por mes de anticipación, 1 a 48, y por tramo de periodo cotizado). Dudas de aplicación del motor: (1) «cada mes o fracción de mes que le falte» se aplica como redondeo hacia arriba de los meses entre el hecho causante y la edad legal; (2) la edad legal es la que correspondería «de haber seguido cotizando» hasta cumplirla: el motor proyecta la cotización hasta los 65 años para decidir si la edad legal es 65 años o la de la DT 7.ª de ese año del hecho causante; (3) el tramo se elige con los meses cotizados reales al hecho causante, sin proyectar. Confirmar las tres lecturas.

**41. `param-jubilacion-coeficientes-voluntaria-limite`**  
Afirmación: Aplicación gradual de los coeficientes reductores sobre el límite de pensión (DT 34.ª TRLGSS, 2024-2033): 4,0 (% de reducción aplicado sobre el límite de pensión (art. 210.3, párr. 2.º)) en 2033.  
Pregunta: Comprobar la aplicación de la DT 34.ª: cuando BR × % supera el límite de pensión, el coeficiente de cada año 2024-2033 se aplica sobre el límite (art. 210.3, párr. 2.º). El motor no aplica la salvaguarda del apartado 1 de la DT 34.ª (pensión no inferior a la que habría correspondido con las normas de 2021, que no están transcritas) y no calcula 2022-2023 (rige la redacción original del art. 210.3). Valorar la magnitud de ambas omisiones.

**42. `param-jubilacion-coeficientes-voluntaria`**  
Afirmación: Coeficientes reductores de la jubilación anticipada por voluntad del interesado (art. 208.2 TRLGSS): 534 (meses cotizados desde los que se aplica el tramo) en 2022.  
Pregunta: Comprobar el cuadro del art. 208.2 (1 a 24 meses) y su aplicación: mismas dudas (1) a (3) de la jubilación involuntaria. Además, el art. 208.3 aplica los coeficientes de la involuntaria si al acogerse el trabajador percibe subsidio de desempleo al menos tres meses: el motor lo hace por una opción explícita (mesesSubsidioDesempleo) y añade entonces el tope de la pensión máxima reducida por trimestres (art. 210.4). Confirmar.

**43. `param-jubilacion-demora-reglas`**  
Afirmación: Complemento por jubilación demorada: porcentaje adicional, pago único y opción mixta (art. 210.2 TRLGSS, Ley 21/2021 y RD 371/2023): 20260828 (fecha AAAAMMDD desde la que rige la redacción del art. 3 del RD 371/2023 que se transcribe) en 2026.  
Pregunta: Comprobar el complemento por demora: (1) «a partir del segundo año completo de demora» se lee como: las fracciones de más de 6 meses cuentan cuando ya hay al menos dos años completos (opción fraccionDemora: «desde el segundo año» por defecto o «desde el primer año»); (2) en la opción mixta de 2 a 8 años y 6 meses, los años completos se dividen en dos partes y el semestre va al tanto alzado (×0,5); con 9 o más años, cinco años a tanto alzado y el resto a porcentaje; (3) la «pensión inicial anual» del tanto alzado es la reconocida (con el porcentaje adicional de la parte mixta), limitada a la máxima; (4) los años de demora se cuentan con los meses cotizados (no los asimilados al alta). Confirmar las cuatro lecturas.

**44. `param-lagunas-integracion-brecha-genero`**  
Afirmación: Integración de lagunas con porcentajes adicionales de las mensualidades 49.ª a 84.ª (DT 41.ª TRLGSS): 5 (% de brecha de género de las pensiones de jubilación por encima del cual rige la medida) en 2026.  
Pregunta: Comprobar la DT 41.ª: (1) las «mensualidades» 49.ª a 84.ª son los meses de laguna ordenados desde el hecho causante hacia atrás (no los meses naturales de la ventana); (2) se aplica a la regla general del art. 209.1 y no a la opción de 25 años de la DT 4.ª.7 (que aplica la redacción de 2023), aunque la opción pueda salir menos favorable; (3) mientras la brecha de la DA 37.ª sea superior al 5 %, que no consta en /data: el motor la da por vigente para mujeres (y hombres que acrediten el art. 60.1.b) y permite apagarla. Confirmar.

**45. `param-lagunas-integracion`**  
Afirmación: Integración de lagunas de cotización en el cálculo de la base reguladora de jubilación (por versión): 50 (% de la base mínima (el resto de los meses con laguna)) en 2026.  
Pregunta: Comprobar la integración de lagunas por versión (48 meses al 100 % de la base mínima y el resto al 50 %; en 2026 cambia la referencia de la base mínima): ejemplo numérico con una carrera con 60 meses de laguna usando data/parametros/lagunas-integracion y base-minima-rg, y contrastar con art. 209.1.b TRLGSS y las versiones 2010, 2013 y 2016. Dudas del motor: (b) en 2026 la base mínima de referencia es «la que corresponda al mes respectivo»: el motor usa por defecto la del mes de la laguna (actualizada con el IPC como el resto de bases) y ofrece la del hecho causante como alternativa; (d) las lagunas se cuentan también en los meses de la ventana anteriores a la primera alta (lectura literal; opción lagunasAnterioresAlPrimerAlta). Confirmar ambas.

**46. `param-mei-destino`**  
Afirmación: Destino de la cotización finalista del MEI (art. 127 bis TRLGSS): 1 (indicador (1 = no computa para prestaciones)) en 2023.  
Pregunta: Comprobar la afirmación sobre el destino del MEI (art. 127 bis: nutre el Fondo de Reserva y no computa a efectos de prestaciones). Contrastar la recaudación (derechos reconocidos de «Mecanismo de Equidad Intergeneracional» en la ejecución del presupuesto) con las dotaciones anuales del Fondo de data/sistema/fondo-reserva-series y explicar la diferencia.

**48. `param-mei-tipo-total`**  
Afirmación: Tipo de cotización del Mecanismo de Equidad Intergeneracional (MEI): 1,2 (puntos porcentuales) en 2029.  
Pregunta: Comprobar la senda del Mecanismo de Equidad Intergeneracional (0,6 puntos en 2023 hasta 1,2 en 2029; empresa 0,5 a 1,0 y trabajador 0,1 a 0,2): que data/parametros/mei-tipo-total, mei-tipo-empresa y mei-tipo-trabajador suman y se reparten como dice el art. 127 bis TRLGSS y sobre qué base de cotización se aplica (contingencias comunes, con topes).

**49. `param-opcion-25-anos-divisor`**  
Afirmación: Opción de 25 años (DT 4.ª.7 TRLGSS): divisor por año del hecho causante (2026-2043): 371 (divisor (14 pagas: meses × 14/12)) en 2043.  
Pregunta: Comprobar el divisor de la opción de 25 años (en 2043, 371) frente a ventana × 14/12 (318 × 14/12 = 371) y frente a lo que dice literalmente la DT 4.ª.7; confirmar el redondeo y los años 2026-2040 (300 meses, divisor 350).

**50. `param-opcion-25-anos-ventana`**  
Afirmación: Opción de 25 años (DT 4.ª.7 TRLGSS): ventana de cálculo por año del hecho causante (2026-2043): 318 (meses) en 2043.  
Pregunta: Comprobar la opción de 25 años de la DT 4.ª.7 TRLGSS: que la ventana (en 2043, 318 meses) y su divisor (371) son los de la norma, la regla de 2041-2043 y qué ocurre con el 31/12/2040, que la DT deja ambiguo (decisión documentada en docs/DECISIONES.md). Fórmula: divisor = ventana × 14/12 cuando se computan todas las bases.

**51. `param-pension-maxima-incremento-2051-2065`**  
Afirmación: Incrementos de la pensión máxima inicial de 2051 a 2065 (DT 39.ª.4 TRLGSS): 30 (puntos porcentuales de incremento total al que apunta el proceso de convergencia (a valorar en 2065)) en 2065.  
Pregunta: La tabla de la DT 39.ª.4 (3,2 en 2051 hasta 20,0 en 2065) se describe como «incremento anual adicional» pero enlaza con el acumulado de la DT 39.ª.1 (26 × 0,115 = 2,99 en 2050) y la propia DT apunta a «un incremento total de 30 puntos». El motor ofrece dos lecturas: «incremento acumulado» (por defecto: el límite crece la revalorización más la diferencia entre el acumulado de un año y el del anterior) y «anual literal» (se suma el valor de la tabla a la revalorización de ese año). Determinar cuál es la intención y cómo se compone con la lectura de 2025-2050 (la de /data suma 0,115 constante, no creciente).

**52. `param-pension-maxima-incremento-futuro`**  
Afirmación: Incremento anual de la pensión máxima inicial sobre el IPC (2025-2050): 0,115 (puntos porcentuales sobre el porcentaje de revalorización de las pensiones (art. 58.2)) en 2050.  
Pregunta: Comprobar la DT 39.ª TRLGSS: la pensión máxima inicial crece el porcentaje de revalorización más 0,115 puntos (2025-2050). Verificar con data/parametros/pension-maxima que 2025 y 2026 cuadran y justificar la lectura compuesta frente a la lineal (decisión documentada en docs/DECISIONES.md).

**53. `param-pension-minima-regla`**  
Afirmación: Regla de evolución de las pensiones mínimas (art. 58.2, DA 53.ª TRLGSS): 100 (% de la brecha entre la cuantía de referencia y el umbral de pobreza de un hogar de dos adultos que se reduce ese año) en 2027.  
Pregunta: Comprobar la regla de la DA 53.ª TRLGSS: reducción de la brecha entre la cuantía de referencia y el umbral de pobreza de un hogar de dos adultos (20 %, 30 %, 50 % y 100 % en 2024-2027 según data/parametros/pension-minima-regla). Verificar que esos porcentajes, el multiplicador del umbral unipersonal (1,5) y el factor del resto de mínimas (50 %) son los de la norma, y recalcular la mínima de jubilación con cónyuge a cargo de 2027 con la fórmula.

**54. `param-periodo-calculo-base-reguladora`**  
Afirmación: Periodo de cálculo de la base reguladora de jubilación: 348 (meses) en 2037.  
Pregunta: Comprobar la regla «ventana de N meses de la que se toman las M bases de mayor importe» (en 2037, ventana de 348 meses y 324 bases): confirmar con el art. 209 TRLGSS y la DT 4.ª que N y M de cada año son los de la norma y que los meses descartados (24) se elijen por mayor base, no por antigüedad.

**56. `param-revalorizacion-regla`**  
Afirmación: Regla vigente de revalorización anual de las pensiones contributivas (art. 58 TRLGSS): 11 (mes del año anterior (1-12): noviembre) en 2024.  
Pregunta: Comprobar el art. 58 TRLGSS vigente: meses de IPC, último mes de medición (noviembre), suelo e indicadores de data/parametros/revalorizacion-regla; recalcular la revalorización de 2024, 2025 y 2026 con data/parametros/ipc-variacion-* y comparar con revalorizacion-general.
