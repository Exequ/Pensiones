# M3 · Pensiones contributivas en vigor: cuántas habrá

## 1. Pregunta que responde
¿Cuántas pensiones contributivas (jubilación, viudedad, incapacidad, orfandad y en favor de familiares) habrá cada año, por sexo y edad, si la proporción de personas de cada edad que cobra cada tipo de pensión se mantiene como hoy? Mide la presión demográfica sobre el sistema: cuántas pensiones hay que pagar. No dice cuánto cuestan; eso lo hará el modelo financiero (M4).

## 2. Cómo funciona
Parte de la foto real de la Seguridad Social de octubre de 2026: cuántas pensiones de cada clase cobran los hombres y las mujeres de cada grupo de edad (de cinco en cinco años). Divide cada cifra entre la población de ese grupo y obtiene una «prevalencia», por ejemplo, las pensiones de jubilación por cada hombre de 70 a 74 años. Después aplica esas prevalencias a la población de cada año que proyecta el modelo demográfico (M1). Si hay más personas de 80 años, hay más pensiones de viudedad; si hay menos jóvenes, hay menos pensiones de orfandad.

## 3. Resultados que produce
Para cada año de 2026 a 2050: pensiones por clase, sexo y grupo de edad, el total, y una estimación del número de pensionistas (personas), que es algo menor porque hay quien cobra más de una pensión (en el último dato publicado, 90 pensionistas por cada 100 pensiones). Los valores corresponden a octubre de cada año. Una pensión no es una persona: una misma persona puede cobrar, por ejemplo, jubilación y viudedad.

## 4. Datos de entrada
La foto de pensiones en vigor por edad, clase y sexo (octubre de 2026), la relación entre pensionistas y pensiones, y las proyecciones de población de M1. Como contraste, el Ageing Report 2024 de la Comisión Europea.

## 5. Qué se puede modificar para probar
- **Todas las palancas de M1:** fecundidad, mejora de mortalidad, migración y ajuste de mortalidad desde los 75 años.
- **Convergencia de las mujeres (de 0 a 1):** de forma gradual hasta 2050, la proporción de mujeres de 65 años o más que cobra jubilación se acerca a la de los hombres de su grupo. 0 = no cambia; 1 = se igualan. Es un caso extremo: hoy muchas mujeres mayores cobran viudedad en lugar de jubilación, y este modelo no reduce la viudedad al subir la jubilación. Prueba valores pequeños (0,2 o 0,3).
- El año final.

## 6. Pruebas sugeridas (valores obtenidos)
Escenario base: 10,57 millones de pensiones en octubre de 2026 (unos 9,56 millones de pensionistas), 12,9 millones en 2035 y 15,8 millones en 2050, un 49 % más que ahora. En 2050: 10,6 millones de jubilación, 3,7 de viudedad, 1,05 de incapacidad, 0,32 de orfandad y 0,06 en favor de familiares. Sin migración neta: 15,3 millones en 2050. Con la mitad de migración: 15,6. Con mortalidad de 75 años o más un 8 % más alta: 15,6. Con mortalidad mejorando un 1 % anual de más: 16,7. Con convergencia de las mujeres igual a 1 (extremo): 19,2 millones. Observa que la mayor palanca es el comportamiento (convergencia), no la demografía: en 25 años, lo que más cambia el número de pensiones es quién llega a cobrar, no cuántos nacen.

## 7. Cómo de fiable es: comprobaciones realizadas
- **Contraste con la Comisión Europea:** el número de pensionistas del Ageing Report 2024 crece un 6 % de 2026 a 2030, un 28 % hasta 2040 y un 48,5 % hasta 2050. Este modelo (que cuenta pensiones, no personas) da 10 %, 33 % y 49,5 %: crece algo más deprisa al principio, y en 2050 la diferencia es de menos de un punto. Una posible explicación (no comprobada) es que la Comisión supone un retraso gradual en la edad efectiva de jubilación y una menor proporción de pensionistas en el tramo de 65 a 69 años.
- **Comprobación de las bajas:** con la mortalidad de las tablas del INE se esperarían unas 256.000 muertes en 2025 entre los pensionistas de jubilación, y la Seguridad Social registra 269.000 bajas definitivas de jubilación, un 5 % más. La diferencia es pequeña y puede venir de bajas que no son fallecimientos o de que los pensionistas tengan una mortalidad algo distinta a la de toda la población de su edad.

## 8. Limitaciones
La prevalencia es constante, así que no recoge reformas, cambios en la edad efectiva de jubilación ni la incorporación gradual de mujeres con carreras largas (solo como palanca). Los grupos de edad son de cinco años, y dentro del grupo se reparte como la población. No hay importes: no se sabe cuánto cobra cada pensión ni cuánto cuestan. No distingue jubilación anticipada o demorada. Las pensiones de incapacidad se convierten en jubilación a los 65, y este modelo lo recoge solo porque la foto lo muestra en el grupo de 65 a 69. Se ignoran 85 pensiones de edad desconocida.

## 9. Ejecución
En la carpeta `m3` (junto a `m1` y `m5`): `python -m pytest -q test_m3.py` (7 tests) y `python m3_pensiones.py`. Genera `m3_pensiones.csv` y `m3_resumen.csv`. Necesita M1 y los datos del repo (`git pull`).
