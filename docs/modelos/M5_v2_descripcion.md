# M5 v2 · Tasa de reposición con topes, lagunas, edad por meses cotizados y requisitos

## 1. Pregunta que responde
¿Qué pensión inicial cobra, y qué fracción de su salario representa, una persona que se jubila el 1 de enero del año T con la ley tal como está hoy? Es un cálculo («si la ley no cambia, esto sale»), no una previsión.

## 2. Qué cambia respecto a v1
- **El mes previo no entra en la base reguladora.** La ley toma los meses anteriores al «mes previo» al de la jubilación. Quien se jubila el 1 de enero tiene como mes previo diciembre, así que su base reguladora empieza en noviembre. Ese diciembre sí cuenta como mes cotizado para el porcentaje. Efecto: una pensión entre un 0,05 % y un 0,5 % menor que en v1, el equivalente a un mes de subida de salarios.
- **Los meses sin cotizar anteriores a la primera alta se rellenan.** Si la ventana es más larga que la carrera, los meses de antes de empezar a trabajar se integran con la base mínima de cada mes: los 48 más cercanos a la jubilación al 100 % y el resto al 50 %. v1 los dejaba en cero y subestimaba la base reguladora de las carreras cortas.
- **La edad se decide con los meses cotizados.** Se jubila a los 65 solo si los meses cotizados hasta esa edad (sin contar lagunas) llegan a 459 en 2026 y a 462 desde 2027 (38 años y 6 meses). Si no, se jubila a la edad ordinaria del año (66 años y 10 meses en 2026, 67 desde 2027). v1 miraba los meses «posibles» y no descontaba las lagunas.
- **La base mensual no baja de la base mínima.** Un trabajador a jornada completa no puede cotizar por menos de la base mínima del año. En v1 un salario relativo bajo (en torno a 0,5) podía quedar por debajo de ese mínimo legal, y entonces las lagunas, rellenadas con la base mínima, subían la pensión. Ahora la base de cada mes es el mayor entre el salario y la base mínima de ese año.

## 3. Cómo funciona
1. Se fija la edad de jubilación según los meses cotizados. Las lagunas, si las hay, son los últimos meses antes de jubilarse.
2. Cada mes de la carrera tiene una base: el salario relativo × salario medio, con suelo en la base mínima del año y techo en la base máxima. Los meses sin cotizar no tienen base.
3. Se comprueban los requisitos: 180 meses cotizados y, al menos, 24 de ellos dentro de los 180 meses anteriores. Si no se cumplen, no hay pensión.
4. Base reguladora: se toma la ventana del año (de 300 a 348 meses según el año de jubilación) a partir del mes anterior al mes previo. Los meses sin cotizar se rellenan con la base mínima. Se actualizan por IPC todas las bases salvo las de los 24 meses más recientes de la ventana, se eligen las mejores (por ejemplo 324 de 348) y se dividen por el divisor. Hasta 2043 se compara con la opción de 25 años y se toma la más favorable.
5. Porcentaje según los meses cotizados (50 % con 15 años, 100 % con 37 desde 2027). Pensión = base reguladora × porcentaje × 14 pagas, con suelo en la pensión mínima y techo en la máxima.

## 4. Resultados que produce
| Resultado | Qué significa |
|---|---|
| `edad_jubilacion` | Edad a la que se jubila: 65 o la ordinaria del año. |
| `edad_65_por_carrera` | Verdadero si se jubila a los 65 por tener carrera suficiente. |
| `meses_cotizados_a_65` / `meses_exigidos_para_65` | Lo cotizado hasta los 65 y lo que exige la ley ese año. Explican por qué se jubila a los 65 o a los 67. |
| `meses_cotizados` | Meses cotizados al jubilarse, sin contar lagunas. Determina el porcentaje. |
| `lagunas_meses` | Meses sin cotizar al final de la carrera (dato de entrada). |
| `lagunas_en_ventana` | Meses de la ventana que se han rellenado con la base mínima (finales y anteriores a la primera alta). |
| `lagunas_previas_primera_alta` | De ellos, los anteriores a empezar a trabajar. |
| `causa_derecho` | Falso si no se cumple la carencia o el periodo previo; entonces la pensión es 0. |
| `porcentaje` | Porcentaje de la base reguladora que se cobra. |
| `base_reguladora_mensual` | La base reguladora elegida (€/mes). Con `base_reguladora_general` y `base_reguladora_opcion_25` se ven las dos. |
| `opcion_25_mejor` | Verdadero si ha ganado la opción de 25 años. |
| `pension_calculada` / `pension_final` | Pensión por la fórmula y pensión tras la mínima y la máxima (€/año, 14 pagas). |
| `estado` | `contributiva`, `minima`, `maxima` o `no-causa-derecho`. |
| `rr_ultimo_salario` / `rr_salario_medio` | Pensión ÷ último salario y pensión ÷ salario medio de la economía (definición tipo OCDE). |

## 5. Datos de entrada (de `data/parametros`)
Los de v1 (base máxima y mínima, pensión máxima y mínima, lagunas, opción de 25 años, edad ordinaria, carrera para los 65, periodo, divisor y escala) más `carencia-jubilacion`, `jubilacion-periodo-previo` y `lagunas-integracion-brecha-genero`. Nada está escrito a mano en el código.

## 6. Qué se puede modificar
`rel` (salario ÷ medio), `g` (crecimiento real), `ipc`, `edad_inicio`, año T, `lagunas_meses`, `salario_medio_ref`, `tipo_minima` y los interruptores `topes`, `minima` y `actualizar`. Nuevos en v2:
- `suelo_base_minima`: verdadero por defecto. Falso permite ver el efecto de dejar que el salario baje de la base mínima.
- `lagunas_previas`: `"integrar"` (por defecto) o `"ignorar"` (lectura de v1).
- `hueco_base_minima`: `"anterior"` (por defecto) o `"error"`.
- `integracion_reforzada`: falso por defecto. Si es verdadero, los meses 49 a 60 de laguna cuentan al 100 % de la base mínima y los 61 a 84 al 80 %.

## 7. Pruebas sugeridas (valores obtenidos)
- Base: salario medio, g 1 %, IPC 2 %, entrada a los 25, T = 2045: 46.379 €/año (v1: 46.494), reposición 84,3 % sobre el último salario.
- Con 36 meses de laguna: se jubila a los 67 con 468 meses cotizados y cobra 44.465 €/año (v1 mantenía los 65 años).
- Umbral de los 65: entrada a los 26 años y 6 meses en 2045, 462 meses, se jubila a los 65. Con un mes más tarde de entrada, 461 meses, se jubila a los 67. Con entrada a los 22 y 54 meses de laguna, a los 65; con 55, a los 67.
- Carrera corta: entrada a los 50, T = 2030. Se jubila a los 67 con 204 meses y 54,56 %. Base reguladora de 1.717 €/mes (v1: 1.518). La pensión es la mínima, 14.187 €/año, igual que en v1.
- Entrada a los 45, T = 2045: 264 meses cotizados y 85 meses anteriores al primer alta. Pensión 27.622 €/año; con `lagunas_previas="ignorar"`, 25.451.
- Entrada a los 55: 144 meses, sin carencia. `no-causa-derecho`, pensión 0.
- Entrada a los 22, T = 2045: con 156 meses de laguna sí causa derecho (24 meses cotizados en los 180 previos); con 157 no.
- 84 meses de laguna: 40.131 €/año; con la integración reforzada, 40.530.
- Salario relativo 0,4, T = 2030: pensión mínima, 14.187 €/año. Salario relativo 3, T = 2045: pensión máxima, 70.003 €/año, reposición 42,4 %.
- Efecto del suelo de la base mínima: con salario relativo 0,5 la pensión sube un 1,7 % (2045) o un 1,8 % (2030) respecto a no aplicarlo; con 0,7 o más no cambia.

## 8. Resultados que pueden sorprender
- Unas pocas lagunas pueden retrasar la jubilación dos años: bajar de 462 a 461 meses cotizados cambia los 65 por los 67. Es lo que dice la ley, no un fallo.
- En carreras cortas, la base reguladora sube pero la pensión puede seguir igual: si queda por debajo de la mínima, se paga la mínima.
- Con salario relativo de 0,5 o menos, la reposición sobre el último salario puede superar el 100 %: la base mínima legal (en 2026, unos 1.424 €/mes) está por encima de ese salario, y la reposición se calcula contra el salario indicado, no contra la base mínima.

## 9. Limitaciones
- Las lagunas van siempre justo antes de jubilarse, también cuando eso retrasa la jubilación a los 67.
- La integración de lagunas anteriores a la primera alta es una lectura: el texto de la ley no distingue entre meses anteriores y posteriores al primer alta, y no he encontrado fuente que lo zanje. Con `lagunas_previas="ignorar"` se ve el efecto (puede llegar al 8 % de la pensión).
- El suelo de la base mínima supone jornada completa. Con jornada parcial las bases pueden ser menores; el modelo no lo recoge.
- La serie de base mínima no tiene datos de 2020 y 2021: se usa 1.050 €, exacto hasta agosto de 2021 y un 7 % bajo después (1.125,90 €).
- La integración reforzada de la DT 41.ª rige solo mientras la brecha de género de las pensiones supere el 5 %. La Dirección General de Ordenación de la Seguridad Social la extiende a los hombres en su criterio 17/2025. Está apagada por defecto.
- IPC constante, revalorización igual al IPC. Mínimas y base mínima posteriores a 2026 crecen solo con el IPC. Sin test de ingresos del hogar. Sin jubilación anticipada ni demorada. Salario medio de referencia: EAES 2024 (INE).

## 10. Contraste
- **Motor TypeScript de la Fase 2-A:** los 51 casos de oro coinciden con una diferencia máxima de 0 % (con v1 la diferencia llegaba al 0,41 %). El motor se programó aparte, con las reglas del texto legal, así que el acuerdo es una comprobación independiente. Prueba que las dos implementaciones son coherentes entre sí, no que la lectura de la ley sea correcta.
- **OCDE (carrera completa desde los 22, jubilación a los 65 en 2067, IPC 2 %):** con g = 1,25 % salen 81,6 % (mitad del salario medio y salario medio) y 47,1 % (doble); la OCDE publica 80,6 %, 80,4 % y 49,9 %. Con g = 0 % salen 96,1 % (medio) y con g = 2 %, 68,6 %. Los supuestos de la OCDE no se han podido leer, así que 1,25 % es una referencia y no un dato verificado.

## 11. Ejecución
`cd m5` y `python -m pytest -q test_m5.py test_m5_v1.py test_m5_v2.py test_m6.py` (50 tests), luego `python m5_v2.py` (genera `m5_v2_resultados.csv`) y `python casos_oro_m5.py` (regenera `casos_oro_m5.json`).