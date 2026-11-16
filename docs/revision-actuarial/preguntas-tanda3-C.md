# Dudas actuariales, tercera tanda, parte C: Demografía, comparativa internacional y páginas nuevas (21 afirmaciones)

Formato de respuesta, una fila por afirmación, en una tabla con estas columnas:
| nº | id | respuesta (confirmo / corrijo / retiro) | confianza (alta / media / baja) | fuente o norma que lo respalda (artículo, documento, página) | cambio de texto propuesto, si corrijo |

Reglas: no confirmes por defecto. Si no puedes respaldar una afirmación con una fuente o con un cálculo que puedas reproducir, responde «corrijo» o «retiro», o «confirmo» con confianza baja y di qué falta. Las cifras no se tocan: son las de los ficheros descargados; lo que se revisa es la interpretación, la definición y la redacción. Al final, lista las que has dejado con confianza baja.


## Triangulación de la mortalidad (Fase 1B-4) (5)

**1. `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-hombres-85-2010-2020`**  
Afirmación: Dato derivado: supervivencia publicada a 10 años de los hombres de 85 años en 2010 dividida por Π(1 − qx) (tablas del INE); un valor inferior a 1 significa que la población publicada pierde más efectivos que los que implica qx aplicado a la población a 1 de enero.: 0,8726 (razón) en 2020.  
Pregunta: Comprobar que el desfase entre la supervivencia publicada y Π(1 − qx) se debe a la convención de edades: qx es la probabilidad entre las edades exactas x y x+1, y la cohorte con x años cumplidos a 1 de enero pasa durante el año de edad exacta media x+0,5 a x+1,5. Reproducir con data/demografia/triangulacion-cohortes y triangulacion-factor-qx el factor medio (defunciones registradas de la generación / población × qx, 1,04 a 1,08) y compararlo con (qx + qx+1)/2 ÷ qx; decidir si el modelo debe usar qx desplazado, la probabilidad de Lexis o una conversión desde la tasa central mx.

**2. `demografia-triangulacion-mortalidad-supervivencia-publicada-sobre-qx-lexis-hombres-85-2010-2020`**  
Afirmación: Dato derivado: ídem con (qx + qx+1)/2 en lugar de qx (convención de Lexis).: 0,9528 (razón) en 2020.  
Pregunta: Valorar el residuo que queda en hombres de 85 años en 2010-2020 tras la convención de Lexis (supervivencia publicada algo inferior a la de la tabla y a la de las defunciones registradas de la generación): comprobar si se debe al ajuste intercensal de 2012-2020, a la migración o a la población de partida, comparando las ventanas de data/demografia/triangulacion-cohortes (2000-2010, 2010-2020, 2015-2020 y 2021-2024) y decidir si el modelo debe corregir la población de edades altas o solo qx.

**3. `demografia-triangulacion-mortalidad-factor-real-sobre-qx-mujeres-85-2010-2019`**  
Afirmación: Dato derivado: ídem para mujeres.: 1,0751 (razón) en 2019.  
Pregunta: Comprobar el factor entre las defunciones registradas de la cohorte y población × qx (mujeres de 85 años, media 2010-2019) y su estabilidad por edad y año (mínimo y máximo en data/demografia/triangulacion-factor-qx); decidir si un factor constante desde los 75 años (como el 1,07 a 1,10 del modelo) es una aproximación aceptable de la corrección de Lexis o si debe variar con la edad (la pendiente de qx).

**4. `demografia-triangulacion-mortalidad-muertes-implicitas-pensiones-jubilacion-lexis`**  
Afirmación: Dato derivado: ídem con (qx + qx+1)/2.: 263776 (personas) en 2025.  
Pregunta: Conciliar las muertes implícitas en las tablas entre las pensiones de jubilación (aproximación con la distribución por edad de octubre de 2026) con las bajas definitivas de jubilación de 2025 de la Seguridad Social: la fuente no desglosa las causas de baja (fallecimiento u otras) y las pensiones no son pensionistas. Determinar qué dato haría falta (pensionistas por edad simple y causa de baja) y si la diferencia restante es relevante para el modelo.

**5. `demografia-triangulacion-mortalidad-ine-tablas-recalculo-censo-2021`**  
Afirmación: Con el censo de 2021 se calcularon en 2023 nuevas series intercensales (2012-2020) y en noviembre de 2023 se publicaron las tablas de mortalidad sobre la nueva base poblacional.  
Pregunta: Confirmar con el INE qué años de la serie de tablas 1991-2024 cambiaron en la edición de noviembre de 2023 (la metodología indica que se recalcularon las series intercensales de 2012-2020 con el censo de 2021 y que las de 1981-2001 se recalcularon en 2014) y comparar las tablas actuales con la edición anterior para medir el cambio en qx de las edades altas.


## Datos demográficos y macroeconómicos (Fase 1B-3) (6)

**6. `internacional-contraste-espana-gasto-pensiones-contributivas-sobre-pib`**  
Afirmación: Obligaciones reconocidas por «suma de pensiones» (contributivas) del Sistema de la Seguridad Social sobre el PIB: 10,8 (% del PIB) en 2025.  
Pregunta: Comprobar la delimitación del gasto: la fila «suma de pensiones» de la ejecución (obligaciones reconocidas) excluye Clases Pasivas, pensiones no contributivas y el complemento a mínimos (que va en otra fila, ver docs/INFORME_VERIFICACION.md). Decidir qué delimitación comparable con OCDE, Eurostat y Ageing Report usará el modelo.

**7. `internacional-contraste-espana-pension-altas-sobre-salario-eaes`**  
Afirmación: Cociente entre la pensión media de las altas iniciales de jubilación (ambos sexos) × 14 pagas y el salario medio «eaes»: 0,74 (razón) en 2024.  
Pregunta: Comprobar que el cociente entre la pensión media de las altas de jubilación (14 pagas) y la ganancia media de la EAES no es una tasa de reposición: mezcla carreras de distinta duración y compara con el salario de todos los trabajadores del ámbito de la EAES. Decidir si debe usarse como referencia empírica de sensibilidad frente a la tasa teórica de la OCDE y con qué definición de salario (EAES, ETCL, Contabilidad Nacional, base media).

**14. `macro-salario-medio-definiciones-eaes-ambos`**  
Afirmación: EAES: salario medio bruto anual por trabajador, ambos: 29540,26 (euros/año) en 2024.  
Pregunta: Comprobar el concepto y la cobertura de la ganancia media anual de la EAES (devengos brutos anuales por asalariado, centros de cotización de industria, construcción y servicios con alta todo el mes de octubre; excluye agricultura y parte de las Administraciones Públicas) y su idoneidad como proxy del salario de la carrera; calcular su razón con la base máxima (data/macro/salario-medio-razon-base-maxima).

**15. `macro-salario-medio-definiciones-etcl-coste-salarial-total`**  
Afirmación: ETCL: coste salarial total por trabajador y mes, media de los cuatro trimestres, ambas jornadas: 2376,55 (euros/mes) en 2025.  
Pregunta: Comprobar el concepto de la ETCL (coste salarial por trabajador y mes, media de trimestres) y la conversión a año (12 veces la media mensual, sin pagas aparte porque los pagos extraordinarios van en el trimestre en que se pagan); verificar frente a la EAES en los años comunes (2008-2024) y su cobertura sectorial.

**16. `macro-salario-medio-definiciones-cn-remuneracion-por-asalariado-puesto`**  
Afirmación: Contabilidad Nacional: remuneración de asalariados / asalariados (puestos de trabajo): 41132,88 (euros/año) en 2025.  
Pregunta: Comprobar que la remuneración de asalariados de la Contabilidad Nacional incluye cotizaciones sociales del empleador (no es salario bruto) y que dividida por asalariados (puestos, ETC o personas) da tres cifras distintas; decidir qué denominador y qué ajuste (restar cotizaciones empresariales) se necesita para compararla con la EAES o con la base media.

**17. `macro-salario-medio-definiciones-base-media-cotizacion-rg-ambos`**  
Afirmación: TGSS: base media de cotización por contingencias comunes del Régimen General, media anual ponderada, ambos: 2286,22 (euros/mes) en 2025.  
Pregunta: Comprobar que la base media de cotización (Régimen General, contingencias comunes, personas físicas con al menos un día cotizado, topada por la base máxima y sin agrario, hogar ni artistas) no es un salario: está topada, mezcla jornadas y meses parciales y solo existe desde 2018 en el fichero descargado. Valorar su uso para la tasa de reposición y el efecto del tope (razón con la base máxima).


## Comparativa internacional (Fase 1C) (5)

**8. `internacional-ocde-espana-gprr100-hombres-z-m-pt-earn-g-pre-ret-inc-2024`**  
Afirmación: Gross pension replacement rate at 100% of average wage: 80,4 (Percentage of gross pre-retirement earnings at the same income level) en 2024.  
Pregunta: Comprobar la comparabilidad de la tasa de reposición teórica bruta de la OCDE (carrera completa desde los 22 años, pensión obligatoria, 100 % del salario medio, parámetros de 2024) con una tasa calculada con las reglas propias (data/parametros: escala de porcentajes, periodo de cálculo, actualización de bases, pensión máxima) y con los cocientes empíricos de data/internacional/contraste-espana; en concreto: los supuestos de crecimiento del salario (real 1,25 % anual), inflación (2 %) y carrera (de los 22 a los 65 años) que hay detrás del 80,4 % ya están en ocde-supuestos-reposicion (elementos ocde-pag-2025-*); falta saber si la tasa neta (86,3 %) usa los mismos impuestos y cotizaciones que el cálculo propio, porque el detalle del IRPF y de las cotizaciones del pensionista está en los «Country Profiles» en línea, aún no descargados.

**9. `internacional-ocde-supuestos-reposicion-ocde-pag-entrada-mercado-laboral-22`**  
Afirmación: Los indicadores de «Pensions at a Glance» se calculan para trabajadores que entran en el mercado laboral a los 22 años en el año especificado.  
Pregunta: Los metadatos SDMX solo dicen que la tasa de reposición teórica se calcula para quien entra en el mercado laboral a los 22 años; el resto de supuestos (carrera, crecimiento real de los salarios, inflación, impuestos) se han leído del informe «Pensions at a Glance 2025» (elementos ocde-pag-2025-* del mismo fichero). Comprobar que la carrera modelada para España (entrada a los 22 y jubilación a la edad normal de 65 años, es decir, 43 años de carrera) es comparable con los años cotizados que exige el cálculo propio con las reglas de data/parametros antes de contrastar la tasa de la OCDE con una tasa calculada con ellas.

**10. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-crecimiento-real-salarios-base`**  
Afirmación: OCDE, supuesto de la tasa de reposición teórica (crecimiento real de los salarios, escenario base): 1,25 (% anual) en 2024.  
Pregunta: La OCDE supone para todos los países un crecimiento real del salario del 1,25 % anual, inflación del 2 % y salario individual igual al medio de la economía, y publica la sensibilidad con 0,75 % de crecimiento real y 1 % de inflación. Como España revaloriza los ingresos pasados con los precios y no con los salarios, la tasa bruta del 100 % del salario medio pasa del 80,4 % al 88,0 % con el escenario alternativo (tabla 5.4). Comprobar cómo afectan estos supuestos al cálculo con las reglas propias (periodo de cálculo, actualización de bases con el IPC, escala de porcentajes) y contrastarlos con el crecimiento real observado del salario en data/macro y con las hipótesis del Ageing Report 2024 en data/demografia.

**11. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-politica-fiscal-constante`**  
Afirmación: Impuestos y cotizaciones de la tasa neta: se supone que no cambian en el futuro; los parámetros de «valor» (mínimos exentos, topes de cotización) se ajustan cada año con el salario medio y los de «tipo» (escala del IRPF, tipos de cotización) no varían.  
Pregunta: La tasa neta de la OCDE supone que los tipos del IRPF y las cotizaciones no cambian y que los mínimos exentos y los topes se actualizan con el salario medio; el detalle de lo que pagan los pensionistas está en los «Country Profiles» en línea, que no se han descargado (PENDIENTE_DATOS). Comprobar, cuando estén disponibles, que la tasa neta de España (86,3 % al salario medio) usa la escala del IRPF, los mínimos y las cotizaciones del pensionista que se aplicarían en el cálculo propio; mientras tanto la tasa neta no es comparable con una calculada por separado.

**12. `internacional-ocde-supuestos-reposicion-ocde-pag-2025-sensibilidad-espana-valorizacion-precios`**  
Afirmación: En la sensibilidad al crecimiento y los tipos, la tasa bruta de España sube porque los ingresos pasados se revalorizan con los precios y el crecimiento real de los salarios es menor en el escenario alternativo.  
Pregunta: La OCDE atribuye la subida de España en el escenario alternativo (7,6 puntos, la mayor del grupo formado por Bélgica, Portugal, España, Türkiye y Reino Unido) a que los ingresos pasados se valorizan a los precios y el crecimiento real de los salarios es menor. Comprobar que ese mecanismo es coherente con la regla española de actualización de las bases con el IPC dentro del periodo de cálculo (data/parametros) y estimar con las reglas propias la sensibilidad de la tasa a ±0,5 puntos de crecimiento real.


## Comparativa internacional: fichas de país (Fase 1C) (1)

**13. `internacional-sistema-esp-9`**  
Afirmación: España (OCDE, Pensions at a Glance 2025): la OCDE recoge la proyección de AIReF de 2025: el gasto en pensiones sube 3,2 puntos del PIB entre 2023 y 2050 (16,1 % del PIB en 2050) con las reglas vigentes; es una proyección de AIReF citada por la OCDE, no una estimación de la OCDE.  
Pregunta: Contrastar la proyección de AIReF que cita la OCDE (gasto en pensiones de 16,1 % del PIB en 2050, +3,2 puntos entre 2023 y 2050) con la del Ageing Report 2024 (data/demografia/ageing-report-2024-espana) y con las proyecciones de gasto público de ocde-pag: definición de gasto (pensiones contributivas, Clases Pasivas, PNC), año base y supuestos demográficos y de empleo de cada una.


## Página «Hucha»: El Fondo en meses de gasto en pensiones (Fase 5-A3) (1)

**66. `web-hucha-complemento-minimos-clasificacion`**  
Afirmación: En las liquidaciones, el complemento a mínimos figura dentro de las cinco clases de pensión contributiva hasta el PDF de 2014 y aparte, entre las prestaciones no contributivas, desde el de 2015, que ya lo recoge para 2014; por eso la serie de pensiones contributivas con complemento a mínimos suma el complemento desde 2…  
Pregunta: ¿Es válida, para compararla con la referencia de la ejecución, la serie «pensiones contributivas con complemento a mínimos» de 2010 a 2016 (suma de las cinco clases hasta 2014 y suma de las clases y del complemento desde 2015)? Que las clases incluyan el complemento en 2010 a 2013 se deduce de que los PDF repiten sin diferencias la cifra del año anterior hasta el de 2014, y solo en 2014 se ve la reclasificación; ¿basta esa deducción o hace falta una fuente que lo diga?


## Página «Hucha»: Préstamos del Estado y Fondo de Reserva según el Tribunal de Cuentas (Fase 5-A3) (1)

**67. `web-hucha-prestamos-por-anio`**  
Afirmación: Los préstamos del Estado por año de concesión de 2017 a 2024 son una serie derivada del Anexo 10 del Tribunal de Cuentas: el anexo no da la fecha de concesión y el año se infiere del inicio del plazo de cancelación, que el Tribunal indica que empieza el año siguiente al de la concesión.  
Pregunta: ¿Es razonable asignar cada préstamo del Anexo 10 al año anterior al de inicio de su plazo de cancelación? Comprueba que la suma de los asignados hasta 2022 y hasta 2023 coincide con las cifras del Tribunal de Cuentas (88.994,0 y 98.997,8 millones) y con los pasivos financieros de la ejecución de 2017 a 2024, pero la fecha de concesión no figura en el anexo.


## Página «Otros sistemas» (Fase 5-C): comparabilidad y glosario (1)

**68. `web-sis-comparabilidad`**  
Afirmación: Las medidas de la comparativa internacional (gasto sobre el PIB de la OCDE y de Eurostat, edad normal y efectiva de jubilación y tasas de reposición bruta y neta de la OCDE) se muestran con su definición, sus supuestos y las dos versiones de cada concepto, sin elegir ninguna; los países no son directamente comparables …  
Pregunta: Cuatro cuestiones agrupadas: (1) ¿es correcta la descripción de las dos medidas de gasto (OCDE y Eurostat) como delimitaciones distintas del mismo concepto, dado que el perímetro de ninguna consta en las fuentes descargadas?; (2) ¿es adecuado presentar la tasa de reposición bruta y la neta de la OCDE lado a lado con sus supuestos y contrastarlas con cocientes empíricos propios sin considerarlas equivalentes?; (3) ¿es correcto el contraste entre la edad normal de jubilación de la OCDE (carrera completa desde los 22 años) y la edad ordinaria de la normativa española?; (4) ¿son correctas, y suficientes para un lector no especialista, las definiciones conceptuales de reparto, capitalización y cuentas nocionales del glosario, que no proceden de una fuente descargada (las citas de las fichas de país solo muestran cómo las usan las fuentes)? Comprobar con datos: la definición de cada medida en data/internacional/ocde-supuestos-reposicion y las citas de data/internacional/paises-sistemas.


## Página «Proyecciones»: bloque «Sistema financiero» (Ajustes de M4, sensibilidades) (1)

**69. `web-fin-sensibilidades-empleo-parametro`**  
Afirmación: En el caso de sensibilidad del empleo de 55 a 64 años, el parámetro que fija el LEEME es multiplicar las tasas de empleo de ese tramo por un factor en 2050, con avance lineal desde el primer año proyectado; la descripción anterior de M4 solo decía «un 10 % más de empleo de 55 a 64 años en 2050» sin precisar el parámetr…  
Pregunta: Confirmar que la lectura «tasas de empleo de 55 a 64 años multiplicadas por 1,1 en 2050, con avance lineal» es la que se quiere presentar bajo la etiqueta de la descripción («un 10 % más de empleo de 55 a 64 años en 2050»): no se ha comprobado que el avance lineal parta de 2026 ni que el factor se aplique a la tasa de empleo y no al número de empleados.
