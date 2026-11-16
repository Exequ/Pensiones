# Revisión actuarial, tercera tanda, parte C: Demografía, comparativa internacional y páginas nuevas

Respuesta del chat de revisión actuarial (Claude Opus 5.5), recibida el 16-11-2026, a docs/revision-actuarial/preguntas-tanda3-C.md. Las cifras que cita el revisor son cálculos suyos: no se publican sin recalcularlas desde /data o comprobarlas en una fuente descargada.

Reviso los datos de demografía, comparativa y Hucha en el repo antes de responder.

He revisado las 21 afirmaciones con los ficheros de `/data` y el código de M2. Todo lo que se podía reproducir lo he recalculado. La certeza es un juicio mío.

## Mortalidad (1-5)

| nº | id | respuesta | confianza | fuente o cálculo | cambio de texto propuesto |
|---|---|---|---|---|---|
| 1 | `…supervivencia-publicada-sobre-qx-hombres-85-2010-2020` | corrijo | alta (mecanismo) | `triangulacion-factor-qx`: el factor real medio va de 1,04 a 1,08 y el de Lexis, (qx + qx+1)/2 ÷ qx, de 1,03 a 1,07. A los 85 años: hombres 1,0635 frente a 1,0584; mujeres 1,0751 frente a 1,0745 | El desfase se explica por la convención de edades. La población con x años cumplidos a 1 de enero vive el año entre las edades exactas x+0,5 y x+1,5, y la probabilidad de esa cohorte es (qx + qx+1)/2, o 1 − exp(−(mx + mx+1)/2) si se parte de mx. El modelo debe usar esa probabilidad por edad, no qx sin desplazar. Añadir a la nota: «el valor inferior a 1 se debe sobre todo a la convención de edades, no a un error de los datos» |
| 2 | `…-lexis-hombres-85-2010-2020` | confirmo | media | `triangulacion-cohortes`, hombres de 85 años. Publicada ÷ defunciones de la generación: 1,09 (2000-2010), 0,967 (2010-2020), 0,988 (2015-2020), 0,9985 (2021-2024) | El residuo no viene de qx: la población de 2020 queda un 3,3 % por debajo de la de 2010 menos las defunciones registradas. Se concentra en ventanas que parten de poblaciones anteriores a la revisión con el censo de 2021, y desaparece en 2021-2024. Lo más probable es el cierre intercensal: la serie 2012-2020 se ajustó al censo de 2021 y absorbe un exceso de mayores en la base anterior. Decisión: no corregir qx. Calibrar solo con poblaciones de 2021 en adelante, que es lo que ya hace el modelo desde 2026 |
| 3 | `…factor-real-sobre-qx-mujeres-85-2010-2019` | corrijo | alta | `triangulacion-factor-qx` | Un factor constante de 1,07 a 1,10 desde los 75 años no sirve. El factor varía con la edad: hombres 1,056 (75), 1,062 (80), 1,054 (95); mujeres 1,066 (75), 1,079 (80), 1,062 (95). El 1,10 supera la media de todas las edades. Sustituir por (qx + qx+1)/2 edad a edad, lo que elimina el factor |
| 4 | `…muertes-implicitas-pensiones-jubilacion-lexis` | confirmo | media | Bajas definitivas de jubilación en 2025: 269.250 (`altas-bajas-anual-clase-sexo`). Lexis: 263.776 (−2,0 %). Con qx sin desplazar: 247.621 (−8,0 %) | La versión de Lexis concilia dentro del 2 %, lo que también confirma el punto 1. Para cerrar faltan las bajas por causa (fallecimiento) y los pensionistas por edad simple. Para el modelo la diferencia no es relevante |
| 5 | `…ine-tablas-recalculo-censo-2021` | confirmo | media | La metodología del INE de noviembre de 2023 dice que la población de referencia son las Estimaciones Intercensales de Población hasta 2020 y las cifras de población de los Censos anuales desde 2021. Indicio indirecto: Idescat revisó sus indicadores porque los datos de 2012-2021 se revisaron el 20 de octubre de 2023 al incorporar las poblaciones intercensales del mismo periodo | Añadir que lo más probable es que cambiaran los años 2012-2020, y quizá 2021. Hay que confirmarlo comparando con la edición anterior (Claude Code puede descargarla de INEbase). Ese contraste también mediría el efecto que se ve en el punto 2 |

## Gasto y salarios (6, 7, 14-17)

| nº | id | respuesta | confianza | fuente o cálculo | cambio de texto propuesto |
|---|---|---|---|---|---|
| 6 | `…gasto-pensiones-contributivas-sobre-pib` | corrijo | alta | La ejecución separa el complemento a mínimos en otra fila. Ageing Report 2024 (II.1.64), gasto público en pensiones: 13,1 % del PIB en 2022 | Precisar el nombre: «pensiones contributivas del Sistema, sin complemento a mínimos, sin Clases Pasivas ni PNC». Para comparar con OCDE, Eurostat y el Ageing Report, el modelo debe usar contributivas + mínimos + Clases Pasivas + PNC. El 10,8 % sirve solo para lo interno |
| 7 | `…pension-altas-sobre-salario-eaes` | confirmo | alta | 0,742 con EAES; 0,794 con ETCL × 12; 0,829 con base media × 12; 0,556 con Contabilidad Nacional | Añadir: «no es una tasa de reposición: mezcla carreras de distinta duración y compara con el salario medio de todos los trabajadores». La referencia empírica natural es la del Ageing Report (II.1.80, tasa bruta de reposición a la jubilación: 77,2 % en 2022), que mide un concepto parecido. Denominador recomendado: EAES |
| 14 | `macro-…-eaes-ambos` | confirmo | alta | 29.540,26 ÷ 12 ÷ base máxima = 0,52 (2024) | Advertir que no cubre agricultura ni hogares, y que es un corte transversal: no es la carrera de una persona |
| 15 | `macro-…-etcl-coste-salarial-total` | confirmo | media | ETCL × 12 frente a EAES en 2024: 27.622 ÷ 29.540 = 0,935 | Las pagas extraordinarias van en el trimestre en que se cobran, así que × 12 da el año. Advertir que la cobertura y el tratamiento del tiempo parcial difieren de la EAES y explican la diferencia del 6,5 % |
| 16 | `macro-…-cn-remuneracion-por-asalariado-puesto` | confirmo | alta | En SEC 2010, la remuneración de asalariados (D.1) suma sueldos y salarios (D.11) y cotizaciones a cargo del empleador (D.12). Por persona: 41.981 en 2025 | Para comparar con la EAES, descargar directamente la D.11 del INE en lugar de restar cotizaciones estimadas, y dividir por personas (o por puestos equivalentes a tiempo completo si se compara con jornada completa) |
| 17 | `macro-…-base-media-cotizacion-rg-ambos` | confirmo | alta | Razón con la base máxima: 0,466 (2025). Base media × 12 frente a EAES en 2024: 0,896 | Añadir que la base mensual ya incluye la parte proporcional de las pagas extra (el año es × 12, no × 14) y que no se puede usar como salario de la carrera antes de 2018 |

## Comparativa internacional (8-13)

| nº | id | respuesta | confianza | fuente o cálculo | cambio de texto propuesto |
|---|---|---|---|---|---|
| 8 | `internacional-ocde-…-gprr100…` | confirmo | media | Cálculo con las reglas propias y los supuestos de la OCDE (carrera completa, salario medio, crecimiento real 1,25 %, inflación 2 %, sin tope): **81,8 %**, frente al 80,4 % de la OCDE | La tasa bruta se reproduce con 1,4 puntos de diferencia. La neta no es comparable hasta descargar los «Country Profiles» |
| 9 | `…entrada-mercado-laboral-22` | confirmo | alta | `contraste-espana`: 516 meses de carrera de los 22 a los 65 | 516 meses superan los 462 que dan la jubilación a los 65 (DT 7.ª, desde 2027) y los 444 del 100 % de la escala: la carrera de la OCDE es compatible con las reglas propias |
| 10 | `…crecimiento-real-salarios-base` | confirmo | alta | Reglas propias con inflación del 2 %: 87,2 % (0,75 % real), 81,8 % (1,25 %), 76,8 % (1,75 %). Crecimiento real observado de la EAES, 2008-2024: **0,07 % anual**. Ageing Report: productividad por hora del 1,75 % en 2050 (II.1.17) | Añadir que el 1,25 % de la OCDE está muy por encima del crecimiento real observado desde 2008 y que cada 0,5 puntos de crecimiento real mueven la tasa unos 5 puntos |
| 11 | `…politica-fiscal-constante` | confirmo | media | Supuesto leído del informe | Sin cambios. La comparabilidad de la tasa neta queda pendiente de los perfiles de país |
| 12 | `…sensibilidad-espana-valorizacion-precios` | confirmo | alta | Reglas propias: el escenario alternativo (0,75 % real, 1 % de inflación) da **88,8 %**, frente al 88,0 % de la OCDE. La subida es de 7,0 puntos, frente a 7,6: unos 5,4 por el menor crecimiento real y 1,5 por la menor inflación | El mecanismo es el del art. 209.1.d: bases actualizadas con el IPC y 24 meses sin actualizar. Añadir que la inflación también cuenta, por esos 24 meses nominales |
| 13 | `internacional-sistema-esp-9` | confirmo | media | Ageing Report 2024 (II.1.64): 13,1 % (2022) → 17,3 % (2050), +4,2 puntos | Añadir el contraste: la AIReF proyecta 1,1 puntos menos en 2050. La diferencia viene del año base, la demografía y el empleo. La definición de gasto de la AIReF no está descargada y no la puedo comprobar |

## Páginas nuevas (66-69)

| nº | id | respuesta | confianza | fuente o cálculo | cambio de texto propuesto |
|---|---|---|---|---|---|
| 66 | `web-hucha-complemento-minimos-clasificacion` | confirmo | media | Deducción a partir de los PDF | La serie vale para comparar. Hay que decir que es una deducción: «que las clases incluyan el complemento en 2010-2013 se deduce de que los PDF no reclasifican los años anteriores; no consta en una nota de la fuente». Buscar la nota en el informe económico-financiero de los presupuestos de la Seguridad Social de 2015 |
| 67 | `web-hucha-prestamos-por-anio` | confirmo | alta | Pasivos financieros (ingresos) de la ejecución: 2018 13.830; 2019 13.830; 2020 30.330; 2021 13.830; 2022 6.982; 2023 10.004. Suma 2018-2022: 78.802, más 10.192 de 2017 = 88.994 (Tribunal de Cuentas: 88.994,0). Con 2023: 98.998 (98.997,8) | La asignación queda corroborada por una fuente independiente: el año en que la ejecución registra el préstamo. Reescribir: «año en que la ejecución registra el préstamo como pasivo financiero, coherente con el inicio del plazo de cancelación al año siguiente» |
| 68 | `web-sis-comparabilidad` | corrijo | (1) baja; (2) alta; (3) alta; (4) media | (3) `contraste-espana` | (1) No basta con llamarlas «delimitaciones distintas del mismo concepto»: Eurostat (vejez + supervivencia) incluye prestaciones en especie, y la OCDE mide prestaciones monetarias. Descargar los metadatos de las dos antes de afirmar el perímetro. (2) Correcto. (3) Correcto: los 65 de la OCDE corresponden a la rama de 38 años y 6 meses cotizados. (4) Añadir que son dos ejes distintos: cómo se financia (reparto o capitalización) y cómo se fija la prestación (definida o de aportación definida). Las cuentas nocionales son reparto con aportación definida. Usar como fuente el glosario de «Pensions at a Glance» |
| 69 | `web-fin-sensibilidades-empleo-parametro` | corrijo | alta | `modelos/m2/m2_cotizantes.py`: `k = (t − 2026)/24`, 0 en 2026 y 1 en 2050. El factor multiplica las **tasas de afiliación y de cotización** (afiliados ÷ población por tramo), no las tasas de empleo de la EPA | Rotular «tasas de afiliación de 55 a 64 años × 1,1 en 2050, con avance lineal desde 2026». El avance desde 2026 y la aplicación a tasas, no a números, quedan confirmados. Advertir que M3 no cambia: si se presenta como retraso de la jubilación, falta el menor número de pensiones y el efecto queda sesgado |

## Lo que cambia algo de verdad

- **Factor de mortalidad (1 y 3).** Hay que quitar el factor constante y usar (qx + qx+1)/2 edad a edad. Con esa convención, las muertes implícitas cuadran con las bajas reales con un 2 % de diferencia (punto 4).
- **Tasas de reposición (8, 10, 12).** Las reglas propias reproducen las tasas de la OCDE con una diferencia de un punto y medio en las dos hipótesis. El supuesto del 1,25 % de crecimiento real está muy por encima de lo observado (0,07 % anual desde 2008).
- **Sensibilidad de empleo de M4 (69).** Mueve la afiliación, no el empleo de la EPA, y no toca las pensiones.

## Con confianza baja

- **68 (1):** perímetro del gasto de la OCDE frente al de Eurostat.

En media quedan **2**, **4**, **5**, **11**, **13** y **66**.