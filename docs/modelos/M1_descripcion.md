# M1 · Modelo demográfico: cuántas personas habrá y de qué edades

## 1. Pregunta que responde
¿Cuántas personas vivirán en España cada año, por sexo y edad, hasta 2076, y qué pasa con la población si cambian los nacimientos, la esperanza de vida o la inmigración? Es la base de los demás modelos: cuántos mayores habrá, cuántas personas en edad de trabajar y, por tanto, la relación entre ambos grupos.

## 2. Cómo funciona
Parte de la población a 1 de enero (la última publicada por el INE, 2026) y la hace avanzar un año cada vez. Cada persona sube un año de edad; una parte fallece según la probabilidad de muerte de su sexo y edad; se suman los inmigrantes y se restan los emigrantes de cada edad; y nacen niños según cuántas mujeres de cada edad hay y cuántos hijos tienen de media. Es el método de cohortes-componentes, el mismo que usan los institutos de estadística. Las edades llegan hasta 100, y «100» significa 100 o más.

## 3. Resultados que produce
Para cada año: la población por sexo y edad, y resúmenes: total, menores de 16, de 16 a 64, de 65 o más, de 80 o más, y la «tasa de dependencia de mayores» (personas de 65 o más por cada persona de 16 a 64). También los nacimientos. Una tasa de 0,32 significa 32 mayores por cada 100 personas en edad de trabajar. Es un cociente demográfico, no económico: no dice cuántos trabajan ni cuántos cobran pensión.

## 4. Datos de entrada
Todos del repositorio (carpeta de demografía): población por edad y sexo, tablas de mortalidad, fecundidad por edad de la madre y migraciones del INE, más las hipótesis de las proyecciones del INE 2026-2076, que usamos como escenario base.

## 5. Qué se puede modificar para probar
- **Fecundidad:** un factor sobre las tasas del INE (1,2 = un 20 % más de hijos).
- **Mortalidad:** una mejora anual adicional (0,01 = las probabilidades de morir bajan un 1 % más cada año que en el INE).
- **Migración:** un factor sobre el saldo del INE (0 = sin inmigración neta, 0,5 = la mitad).
- **Ajuste de mortalidad desde los 75 años:** un factor sobre las probabilidades de morir de 75 años en adelante, para ver la sensibilidad a las edades altas (1,0 = tablas del INE tal cual).
- Año de partida y de fin, y la proporción de niños que nacen varones.

## 6. Pruebas sugeridas (valores obtenidos)
El horizonte de presentación son 25 años (hasta 2050). El modelo calcula hasta 2076, pero lo posterior debe leerse como ilustrativo, no como previsión. Tasa de dependencia de mayores (65 o más entre 16-64) en 2050: escenario base, 0,52 (16,5 millones de personas de 65 o más). Con fecundidad +20 %: 0,51; con fecundidad -20 %: 0,53. Con migración a la mitad: 0,60. Sin migración neta: 0,70. Con mortalidad mejorando un 1 % anual de más: 0,55 (17,4 millones de 65 o más). Observa que la fecundidad mueve la tasa poco antes de 2050, porque los niños de hoy no están en el grupo de 16 a 64 hasta dentro de 16 años, mientras que la migración la mueve mucho antes. En 2076 (ilustrativo), el escenario base da 0,55 y sin migración 0,91.

## 7. Cómo de fiable es: comprobaciones realizadas
- **Contraste con el INE:** con las hipótesis del INE, el modelo reproduce su proyección con diferencias pequeñas: población total, entre 0 % y -0,8 % en todo el periodo (-0,2 % en 2050). En mayores de 65 sale un 0,1 % por encima en 2030, un 0,7 % en 2050 y un 1,6 % en 2076, y en menores de 16 un 2,2 % por debajo en 2050. El INE no publica exactamente su método, y esa diferencia es la que cabe esperar de una versión simplificada.
- **Prueba hacia atrás:** partiendo de 2010 con las tasas realmente observadas, el modelo acierta la población de 2025 con un error del -0,5 % en el total, un +0,15 % en mayores de 65 y un -0,7 % en la de 16 a 64 años. Por tramos de edad: 0,0 % de 65 a 79, +0,6 % de 80 a 89 y +0,5 % a partir de 90.
- **Un error mío corregido.** La primera versión daba un 1,9 % de más en mayores de 65 (un 10 % de más a partir de los 90). La comprobación posterior con las defunciones registradas (Fase 1B-4) mostró que no era una incoherencia del INE, sino de cómo usaba yo las tablas: la probabilidad de morir de la tabla es entre las edades exactas x y x+1, pero quien tiene x años cumplidos a 1 de enero va, durante el año, de x años y medio a x años y medio más uno. Por eso se usa la media de la probabilidad de la edad y la de la siguiente. Con esa corrección el desfase desaparece, y coincide con el factor de 1,07 a 1,10 que había encontrado. Queda un resto pequeño en hombres de edades altas que no explica la tabla sino la población publicada o la migración, y no se puede contrastar con los datos descargados.

## 8. Limitaciones
No modela la economía ni el empleo. Las hipótesis de fecundidad, mortalidad y migración son las del INE (edición 2026-2076): no son predicciones, son escenarios, y cualquier cambio de hipótesis cambia el resultado. La mortalidad en el último tramo (100 o más) está aproximada. Las migraciones históricas vienen de dos series del INE que no encajan del todo en 2021. Los nacimientos se calculan con las mujeres expuestas a mitad de año de forma simplificada. No hay estructura por nacionalidad, región ni estado civil.

## 9. Ejecución
En la carpeta `m1`: `python -m pytest -q test_m1.py` (6 tests) y `python m1_demografia.py`. Genera `m1_contraste_ine.csv`, `m1_backtest.csv` y `m1_escenarios.csv`. Hace falta haber hecho `git pull` para tener `data/demografia`.
