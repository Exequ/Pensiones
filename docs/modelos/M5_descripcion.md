# M5 · Tasa de reposición por cohortes (jubilación ordinaria)

## 1. Qué pregunta responde
«Si una persona con una carrera laboral concreta se jubila en un año determinado, aplicando la ley
tal como está hoy (con sus calendarios de transición), ¿qué pensión inicial cobra y qué parte de su
sueldo representa?»

No es una previsión de lo que pasará. Es un cálculo: «si la ley no cambia, esto sale». Sirve para
comparar generaciones (quien se jubila en 2030 frente a quien lo hace en 2050) y escenarios (si los
salarios suben más o menos).

## 2. Cómo funciona, en cinco pasos
1. Se construye la carrera: desde la edad de inicio hasta la jubilación, con un salario que crece
   cada año en términos reales a un ritmo `g`.
2. Se decide cuándo se jubila: a los 65 si la carrera es suficientemente larga y, si no, a la edad
   ordinaria de ese año (que sube gradualmente hasta los 67).
3. Se calcula la **base reguladora**: un promedio de las bases de cotización de los últimos años
   (25 años, o 29 con los 27 mejores según el año; se aplica la más favorable hasta 2040).
4. Se calcula el **porcentaje** de esa base que se cobra, según los años cotizados (50 % con 15 años
   y hasta el 100 % con la carrera completa).
5. **Pensión = base reguladora × porcentaje**, en 14 pagas. La tasa de reposición compara esa
   pensión con el salario.

## 3. Cómo leer los resultados
| Resultado | Qué significa |
|---|---|
| `anio_jubilacion` | Año en que se jubila. Determina qué reglas se aplican. |
| `edad_jubilacion` | Edad a la que se jubila (65 o la edad ordinaria del año). |
| `anios_cotizados` | Años de cotización acumulados al jubilarse. |
| `porcentaje` | Porcentaje de la base reguladora que se cobra (0–100). |
| `base_reguladora_mensual` | Base reguladora, en unidades del salario medio (ver nota). |
| `pension_anual` | Pensión de un año completo (14 pagas), en las mismas unidades. |
| `rr_ultimo_salario` | Pensión anual ÷ último salario anual. Es la tasa de reposición que entiende la gente: «cobro el X % de lo que ganaba». |
| `rr_salario_medio` | Pensión anual ÷ salario medio de toda la economía. Es la medida comparable entre países (tipo OCDE). |

**Nota sobre unidades.** El modelo trabaja en «euros constantes del año de jubilación» y con el
salario medio de la economía igual a 1 al mes (12 al año). No son euros reales: sirven para
calcular proporciones. Cuando incorporemos el salario medio del INE, se podrá pasar a euros.

**Ejemplo.** `simular(rel=1.0, g=0.01, edad_inicio=25, anio_jub=2045)`: se jubila a los 65 con 40
años cotizados, porcentaje 100 %, base reguladora 0,751 (el 75,1 % del salario medio mensual) y
tasa de reposición del 87,7 %. La base reguladora es inferior al último salario porque promedia los
últimos 25 años, en los que los salarios reales eran menores.

## 4. Datos de entrada (carpeta `Pensiones/data/parametros`, generados por Claude Code)
| Fichero | Para qué se usa |
|---|---|
| `edad-ordinaria-jubilacion` | Edad de jubilación según el año. |
| `carrera-jubilacion-65` | Meses de cotización necesarios para jubilarse a los 65. |
| `periodo-calculo-base-reguladora` | Meses que entran en el cálculo de la base reguladora. |
| `divisor-base-reguladora` | Divisor de la base reguladora (recoge las 14 pagas). |
| `escala-porcentajes-jubilacion` | Regla del porcentaje según años cotizados. |

Nada de esto está escrito a mano en el código, salvo el año hasta el que se puede elegir la regla de
25 años (2040). Si se actualizan los datos (`git pull`), el modelo se actualiza solo.

## 5. Qué se puede modificar
| Parámetro | Qué es | Valores razonables | Qué esperar |
|---|---|---|---|
| `rel` | Salario ÷ salario medio | 0,5–1,5 | En la v0 no cambia el resultado (no hay topes ni mínimos todavía) |
| `g` | Crecimiento real anual del salario | 0 %–2 % | A más crecimiento, menor tasa de reposición sobre el último salario |
| `edad_inicio` | Edad a la que empieza a cotizar | 18–35 | Más tarde, menos años cotizados y posible jubilación a edad ordinaria |
| `anio_jub` | Año de jubilación | 2013–2060 | Cambian edad, periodo de cálculo y escala |

Dentro del fichero se pueden editar también `edad_inicio` y `g` en `tabla(...)` para generar
barridos de escenarios.

## 6. Pruebas sugeridas y qué deberías ver
1. **Sin crecimiento (`g=0`) y carrera larga:** 100 %. Es la comprobación básica de que 14 pagas
   equivalen a 12 bases.
2. **Escalón de 2040 a 2041** (`g=0,01`, inicio a los 22): 88,6 % en 2040 y 87,7 % en 2041. Hasta 2040
   rige la opción de 25 años; después, la regla general.
3. **Carrera tardía:** `edad_inicio=35`, `anio_jub=2030`: se jubila a los 67 con 32 años cotizados,
   porcentaje 88,76 % y tasa de reposición del 78,6 %.
4. **Efecto del crecimiento salarial:** con `g` de 0 %, 1 % y 2 %, la tasa baja de 100 % a 87,7 % y a
   77,5 % (cohorte de 2045).

## 7. Limitaciones de esta versión (importante)
- **Carreras de menos de 25 años cotizados: resultado no fiable.** El modelo no rellena los huecos
  («integración de lagunas» con la base mínima, que sí hace la ley), así que la base reguladora sale
  demasiado baja. Ejemplo: 15 años cotizados dan un porcentaje del 50 %, correcto, pero una tasa de
  reposición del 30 %, que subestima la real.
- Sin topes: no se aplican la base máxima ni la pensión máxima ni las mínimas. Por eso `rel` no
  influye aún.
- Todo en euros constantes: la actualización de bases por IPC se da por neutra.
- Sin jubilación anticipada ni demorada, y sin lagunas.
- Se asume que la ley no cambia, y para años posteriores al último dato se mantiene el último valor.

## 8. Cómo ejecutarlo
`python test_m5.py` (7 comprobaciones) y `python m5_reposicion.py` (tabla de ejemplo y
`m5_resultados.csv`). Para pruebas propias, importar `Parametros`, `simular` y `tabla`.
