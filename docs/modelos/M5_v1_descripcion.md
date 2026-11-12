# M5 v1 · Tasa de reposición con topes, lagunas, actualización de bases y mínimas

## 1. Pregunta que responde
¿Qué pensión inicial cobra, y qué fracción de su salario representa, una persona que se jubila en el año T, una vez aplicados los topes del sistema, las lagunas de cotización, la actualización de bases por inflación y las pensiones mínimas?

## 2. Cómo funciona
Parte de M5 v0 y trabaja ya en euros nominales con un IPC constante elegido por el usuario. Cada mes de la carrera genera una base: salario individual (relativo al medio), limitado por la base máxima de ese año. Las bases anteriores a los últimos 24 meses se actualizan por IPC hasta el mes 25 previo a la jubilación. Los meses de laguna (sin cotizar, justo antes de jubilarse) se integran: los primeros 48 al 100 % de la base mínima y el resto al 50 %. La base reguladora sale de la ventana y el divisor vigentes en T, o de la opción de 25 años si T la permite (hasta 2043 según /data) y es mejor. Se aplica el porcentaje por meses cotizados, y el resultado se compara con la pensión mínima (suelo) y la máxima (techo) de ese año.

## 3. Resultados que produce
Por escenario: edad de jubilación, meses cotizados, porcentaje, base reguladora, pensión calculada y final (€/año, 14 pagas), si queda en mínima, contributiva o máxima, y dos tasas de reposición (sobre el último salario y sobre el salario medio).

## 4. Datos de entrada (de /data/parametros)
base-maxima-rg, base-minima-rg, pension-maxima, base-maxima-incremento-futuro (1,2 pp), pension-maxima-incremento-futuro (0,115 pp), lagunas-integracion, opcion-25-anos-aplicable/ventana/divisor, pension-minima-jubilacion, y los de v0 (edad ordinaria, carrera para 65, periodo, divisor, escala).

## 5. Parámetros modificables
rel (salario/medio), g (crecimiento real), ipc, edad de inicio, año T, lagunas_meses, salario_medio_ref, tipo_minima, y los interruptores topes, minima, actualizar.

## 6. Pruebas sugeridas (valores obtenidos)
- Con ipc=0 y sin topes/mínima/actualización coincide con v0 (2045, g 1 %, inicio 25: reposición 87,7 %).
- Base: rel 1, g 1 %, ipc 2 %, inicio 25, T=2045: pensión 46.494 €/año, reposición 84,5 %.
- Con 36 meses de laguna: 44.490 €/año (-4,3 %), pese a integrarse las bases.
- rel 0,4, T=2030: queda en la mínima (14.187 €/año).
- rel 3, T=2045: topada en la máxima (70.003 €/año), reposición 42,4 %.

## 7. Limitaciones
El salario medio de referencia es el de la EAES (INE) 2024, ambos sexos (29.540 €/año, 2.462 €/mes), proyectado con crecimiento real g e IPC; otras definiciones (ETCL, Contabilidad Nacional, base media de cotización) darían otro nivel y están en data/macro. IPC constante y revalorización = IPC. Mínimas y base mínima posteriores a 2026 crecen solo con el IPC (la regla real puede darles más). Sin test de ingresos del hogar para los complementos. Lagunas solo al final de la carrera. Sin jubilación anticipada ni demorada. Salario pasado deflactado con el IPC del escenario, no el real, mientras los topes pasados sí son reales. La tasa sobre último salario con lagunas usa el último salario previo a la laguna.

## 7 bis. Contraste con la OCDE
La OCDE publica, para España, una tasa de reposición bruta teórica (carrera completa desde los 22 años, pensión obligatoria, parámetros de 2024): 80,6 % con la mitad del salario medio, 80,4 % con el salario medio y 49,9 % con el doble. Con este modelo, para una persona que entra a trabajar a los 22 años en 2024 y se jubila a los 65 en 2067, con salarios que crecen un 1,25 % real al año y una inflación del 2 %, salen 81,8 % (mitad del salario medio y salario medio) y 47,1 % (doble del salario medio, topada por la pensión máxima). La coincidencia es buena, pero depende del supuesto de crecimiento salarial: con 0 % salen 96,3 % y con 2 % salen 68,6 % para el salario medio. Los supuestos de la OCDE no se han podido leer (la OCDE bloquea la descarga de sus perfiles), así que los valores 1,25 % y 2 % son una referencia y no un dato verificado. La diferencia entre las tasas de la OCDE y el cociente entre la pensión media real y el salario medio (entre el 55 % y el 83 % según la definición de salario) no se puede explicar solo con los datos: la OCDE modela una carrera completa y el cociente real mezcla carreras cortas, mínimos y topes.

## 8. Ejecución
`cd m5` y `python -m pytest -q test_m5.py test_m5_v1.py` (18 tests), luego `python m5_v1.py` (genera m5_v1_resultados.csv).
