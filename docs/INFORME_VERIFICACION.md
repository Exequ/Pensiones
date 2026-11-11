# Informe de verificación de datos clave (Fase 1A)

Fecha: 2026-11-11. Método: cada dato se contrasta con **otra norma descargada** distinta de la que lo originó (Ley de PGE, otro real decreto-ley o real decreto del mismo año) buscando el valor formateado en es-ES en el documento. La prueba es mecánica (`scripts/etl/verificacion.py`): comprueba presencia del valor, no su contexto.

Resultado: **11 de 21** datos coinciden en todas las segundas fuentes consultadas; 1 coinciden solo en parte; 9 no tienen segunda fuente descargada que recoja el concepto (por ejemplo, la Ley de PGE fija la base máxima pero no enuncia el límite de pensión pública ni la revalorización en el mismo formato). «No localizado» no es una discrepancia: significa que ese documento no contiene el dato.

| Dato                                                             | Valor     | Fuente del dato                  | Segundas fuentes (coincide)                                   |
| ---------------------------------------------------------------- | --------- | -------------------------------- | ------------------------------------------------------------- |
| Pensión máxima 2021 (euros/mes)                                  | 2.707,49  | BOE-A-2021-1135                  | BOE-A-2020-17339: sí                                          |
| Pensión máxima 2022 (euros/mes)                                  | 2.819,18  | BOE-A-2022-1189                  | BOE-A-2021-21653: no localizado                               |
| Pensión máxima 2023 (euros/mes)                                  | 3.058,81  | BOE-A-2022-22694                 | BOE-A-2022-22128: no localizado                               |
| Pensión máxima 2025 (euros/mes)                                  | 3.267,60  | BOE-A-2025-1560                  | BOE-A-2025-999: sí; BOE-A-2025-1560: sí; BOE-A-2025-7660: sí  |
| Pensión máxima 2026 (euros/mes)                                  | 3.359,60  | BOE-A-2026-2548                  | BOE-A-2026-1484: sí; BOE-A-2026-2548: sí; BOE-A-2026-6977: sí |
| Pensión mínima jubilación 65 años, sin cónyuge, 2021 (euros/año) | 9.655,80  | BOE-A-2020-17339                 | BOE-A-2020-17339: sí                                          |
| Pensión mínima jubilación 65 años, sin cónyuge, 2022 (euros/año) | 10.103,80 | BOE-A-2022-1189                  | BOE-A-2021-21653: no localizado                               |
| Pensión mínima jubilación 65 años, sin cónyuge, 2023 (euros/año) | 10.963,40 | BOE-A-2022-22694                 | BOE-A-2022-22128: no localizado                               |
| Pensión mínima jubilación 65 años, sin cónyuge, 2025 (euros/año) | 12.241,60 | BOE-A-2025-7660                  | BOE-A-2025-999: sí; BOE-A-2025-7660: sí                       |
| Pensión mínima jubilación 65 años, sin cónyuge, 2026 (euros/año) | 13.106,80 | BOE-A-2026-6977                  | BOE-A-2026-2548: sí                                           |
| Revalorización general 2022 (%)                                  | 2,50      | BOE-A-2022-1189                  | BOE-A-2021-21653: no localizado                               |
| Revalorización general 2023 (%)                                  | 8,50      | BOE-A-2022-22694                 | BOE-A-2022-22128: no localizado                               |
| Revalorización general 2025 (%)                                  | 2,80      | BOE-A-2025-7660                  | BOE-A-2025-999: sí; BOE-A-2025-7660: sí                       |
| Revalorización general 2026 (%)                                  | 2,70      | BOE-A-2026-6977                  | BOE-A-2026-2548: sí                                           |
| Pensión no contributiva 2023 (euros/año)                         | 6.402,20  | BOE-A-2022-22694                 | BOE-A-2022-22128: no localizado                               |
| Pensión no contributiva 2025 (euros/año)                         | 7.905,80  | BOE-A-2025-7660                  | BOE-A-2025-999: sí; BOE-A-2025-7660: sí                       |
| Pensión no contributiva 2026 (euros/año)                         | 8.803,20  | BOE-A-2026-6977                  | BOE-A-2026-2548: sí                                           |
| Base máxima de cotización 2025 (euros/mes)                       | 4.909,50  | BOE-A-2025-3780                  | BOE-A-2025-1560: no localizado                                |
| Base máxima de cotización 2026 (euros/mes)                       | 5.101,20  | BOE-A-2026-7296                  | BOE-A-2026-2548: sí; BOE-A-2026-1484: no localizado           |
| Tipo MEI 2025 (puntos porcentuales)                              | 0,80      | BOE-A-2025-3780 / TRLGSS DT 43.ª | BOE-A-2025-1560: sí                                           |
| Base máxima 2024 (euros/mes)                                     | 4.720,50  | BOE-A-2024-1691                  | BOE-A-2023-26452: no localizado                               |

## Coherencia interna: base mínima de cotización (grupos 4-7) frente al SMI × 14/12

La base mínima de los grupos 4 a 7 equivale al SMI incrementado en un sexto, con redondeo de la Orden. Tolerancia: 1 euro.

| Año  | Base mínima (Orden) | SMI × 14/12 | Coincide |
| ---- | ------------------- | ----------- | -------- |
| 2013 | 753,00              | 752,85      | sí       |
| 2014 | 753,00              | 752,85      | sí       |
| 2015 | 756,60              | 756,70      | sí       |
| 2016 | 764,40              | 764,40      | sí       |
| 2017 | 825,60              | 825,65      | sí       |
| 2018 | 858,60              | 858,55      | sí       |
| 2019 | 1.050,00            | 1.050,00    | sí       |
| 2022 | 1.166,70            | 1.166,67    | sí       |
| 2023 | 1.260,00            | 1.260,00    | sí       |
| 2024 | 1.323,00            | 1.323,00    | sí       |
| 2025 | 1.381,20            | 1.381,33    | sí       |
| 2026 | 1.424,40            | 1.424,50    | sí       |

## Contrastes incorporados en los propios datos

Además de los anteriores, 190 datos de `data/parametros` llevan un campo `crossCheck` con una segunda fuente (Ley de PGE, otra norma del año o la Orden anual); 188 coinciden y 2 difieren (todas explicadas en `docs/DISCREPANCIAS.md`).

## Segunda fuente de la Seguridad Social (carencia)

La página de requisitos de la jubilación de la Seguridad Social (descargada) cita «15 años»: coincide con la serie de carencia (180 meses).

## Limitaciones

- Las series anteriores a 2021 se contrastaron ya durante la extracción con la Ley de PGE de cada año (campo `crossCheck` de cada dato); este informe añade un contraste independiente de los años recientes.
- La presencia del valor en el texto no garantiza que corresponda al mismo concepto: las coincidencias sin contexto deben revisarse por muestreo (actuario).

## Fase 1B-1: sistema (pensiones, afiliación, altas y bajas)

Fecha: 2026-11-11. Método: cada dato clave se contrasta con **otra publicación de la misma fuente oficial** (otro fichero de la Seguridad Social). No hay segunda fuente independiente porque MITES (anuario y boletín de estadísticas laborales) no es accesible desde el entorno (ver `docs/DESCARGAS_MANUALES.md`). La prueba es mecánica (`scripts/etl/verificacion_1b1.py`).

Resultado: **24 de 27** datos coinciden exactamente con la segunda publicación.

| Dato                                            | Valor      | Segunda publicación                              | Valor      | Coincide |
| ----------------------------------------------- | ---------- | ------------------------------------------------ | ---------- | -------- |
| Pensiones contributivas en vigor a 1 dic. 2008  | 8.464.342  | PTAS, serie histórica (Pnes y ptas)              | 8.464.342  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2009  | 8.604.119  | PTAS, serie histórica (Pnes y ptas)              | 8.604.119  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2010  | 8.739.732  | PTAS, serie histórica (Pnes y ptas)              | 8.739.732  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2011  | 8.866.277  | PTAS, serie histórica (Pnes y ptas)              | 8.866.277  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2012  | 8.999.045  | PTAS, serie histórica (Pnes y ptas)              | 8.999.045  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2013  | 9.145.966  | PTAS, serie histórica (Pnes y ptas)              | 9.145.966  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2014  | 9.270.942  | PTAS, serie histórica (Pnes y ptas)              | 9.270.942  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2015  | 9.360.799  | PTAS, serie histórica (Pnes y ptas)              | 9.360.799  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2016  | 9.473.482  | PTAS, serie histórica (Pnes y ptas)              | 9.473.482  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2017  | 9.581.770  | PTAS, serie histórica (Pnes y ptas)              | 9.581.770  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2018  | 9.696.272  | PTAS, serie histórica (Pnes y ptas)              | 9.696.272  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2019  | 9.801.379  | PTAS, serie histórica (Pnes y ptas)              | 9.801.379  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2020  | 9.809.019  | PTAS, serie histórica (Pnes y ptas)              | 9.809.019  | sí       |
| Pensiones contributivas en vigor a 1 dic. 2021  | 9.916.915  | PTAS, serie histórica (Pnes y ptas)              | 9.916.966  | no       |
| Pensiones contributivas en vigor a 1 dic. 2022  | 9.994.793  | PTAS, serie histórica (Pnes y ptas)              | 9.994.836  | no       |
| Pensiones contributivas en vigor a 1 dic. 2023  | 10.111.955 | PTAS, serie histórica (Pnes y ptas)              | 10.111.991 | no       |
| Pensiones contributivas en vigor a 1 dic. 2024  | 10.281.477 | PTAS, serie histórica (Pnes y ptas)              | 10.281.477 | sí       |
| Pensiones contributivas en vigor a 1 dic. 2025  | 10.434.856 | PTAS, serie histórica (Pnes y ptas)              | 10.434.856 | sí       |
| Afiliados medios diciembre 2021 (total sistema) | 19.824.911 | Fichero «Afiliados Medios» del año, hoja 1. EDAD | 19.824.911 | sí       |
| Afiliados medios diciembre 2022 (total sistema) | 20.296.271 | Fichero «Afiliados Medios» del año, hoja 1. EDAD | 20.296.271 | sí       |
| Afiliados medios diciembre 2023 (total sistema) | 20.836.010 | Fichero «Afiliados Medios» del año, hoja 1. EDAD | 20.836.010 | sí       |
| Afiliados medios diciembre 2024 (total sistema) | 21.337.962 | Fichero «Afiliados Medios» del año, hoja 1. EDAD | 21.337.962 | sí       |
| Afiliados medios diciembre 2025 (total sistema) | 21.844.414 | Fichero «Afiliados Medios» del año, hoja 1. EDAD | 21.844.414 | sí       |
| Altas iniciales de jubilación 2022              | 327.872    | EVO, hoja de altas de jubilación por edad        | 327.872    | sí       |
| Altas iniciales de jubilación 2023              | 326.949    | EVO, hoja de altas de jubilación por edad        | 326.949    | sí       |
| Altas iniciales de jubilación 2024              | 368.065    | EVO, hoja de altas de jubilación por edad        | 368.065    | sí       |
| Altas iniciales de jubilación 2025              | 375.324    | EVO, hoja de altas de jubilación por edad        | 375.324    | sí       |

Comprobaciones internas adicionales (tests de coherencia, `scripts/coherencia-sistema.test.ts`): suma de clases, regímenes y sexos igual al total; afiliados mensuales igual a la suma de regímenes; ratios entre 1,5 y 3.

## Fase 1A-bis: reglas de evolución futura y de cálculo

Fecha: 2026-11-11. Método: cada dato se contrasta con una segunda fuente descargada (RDL 2/2023 en su texto original para los puntos 1, 2 y 5; el art. 209 de 2016 para 300/350; la Ley 3/2012 para las lagunas de 2013) buscando la cita literal en su texto, y los resultados numéricos se comprueban contra los datos observados (test `scripts/coherencia-reglas-futuras.test.ts`: la base máxima de 2024-2026 crece la revalorización más 1,2 puntos y la pensión máxima de 2025-2026 la revalorización más 0,115 puntos).

Resultado: **129 de 129** contrastes con segunda fuente coinciden.

| Fichero                            | Datos | Contraste con segunda fuente | Segunda fuente (BOE)                               | Sin segunda fuente                                                                                                                                   |
| ---------------------------------- | ----- | ---------------------------- | -------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------- |
| `base-maxima-incremento-futuro`    | 27    | 27 de 27                     | BOE-A-2023-6967                                    | —                                                                                                                                                    |
| `pension-maxima-incremento-futuro` | 26    | 26 de 26                     | BOE-A-2023-6967                                    | —                                                                                                                                                    |
| `revalorizacion-regla`             | 5     | 2 de 2                       | BOE-A-2023-6967                                    | 2024-suelo, 2024-incluye-complemento-brecha-genero, 2024-actualiza-pension-maxima                                                                    |
| `pension-minima-regla`             | 9     | 8 de 8                       | BOE-A-2023-6967                                    | 2024-pp-adicionales-sobre-revalorizacion-general                                                                                                     |
| `opcion-25-anos-ventana`           | 18    | 18 de 18                     | BOE-A-2015-11724, BOE-A-2023-6967                  | —                                                                                                                                                    |
| `opcion-25-anos-divisor`           | 18    | 18 de 18                     | BOE-A-2015-11724, BOE-A-2023-6967                  | —                                                                                                                                                    |
| `opcion-25-anos-aplicable`         | 19    | 19 de 19                     | BOE-A-2015-11724, BOE-A-2023-6967                  | —                                                                                                                                                    |
| `lagunas-integracion`              | 11    | 9 de 9                       | BOE-A-1994-14960, BOE-A-2012-9110, BOE-A-2023-6967 | 2010-tramo1-meses, 2010-tramo1-pct-base-minima                                                                                                       |
| `actualizacion-bases`              | 8     | 2 de 2                       | BOE-A-2023-6967                                    | 2010-meses-nominales, 2010-mes-indice-referencia, 2013-meses-nominales, 2013-mes-indice-referencia, 2016-meses-nominales, 2016-mes-indice-referencia |

Sin segunda fuente: la versión de 2010 de la integración de lagunas y las versiones de 2010, 2013 y 2016 de la actualización de bases (cada una consta solo en su texto consolidado; los textos de 2010 y 2013 coinciden entre sí en los 24 meses nominales), el suelo del art. 58.3 y los indicadores de aplicación de la revalorización (el RDL 2/2023 no modificó el apartado 3), y el factor sobre la mínima del art. 58.2.

## Fase 1B-2: financiación

Fecha: 2026-11-11. Método: cada dato clave se contrasta con **otra publicación** de la misma fuente oficial (la liquidación del presupuesto frente a la ejecución a diciembre; el fichero REG frente a la tabla por edades; la identidad B.9 = TR − TE de Eurostat). No hay segunda fuente independiente: la IGAE, la AIReF y Hacienda no son accesibles desde el entorno (`docs/DESCARGAS_MANUALES.md`). Además, el Fondo de Reserva se genera cruzando tres informes a las Cortes que se solapan (2017 en los tres; 2018-2024 en dos) y el proceso falla si alguna cifra difiere: no hubo diferencias.

Resultado: **37 de 37** contrastes coinciden.

| Dato                                                                          | Valor      | Segunda publicación                     | Valor      | Coincide |
| ----------------------------------------------------------------------------- | ---------- | --------------------------------------- | ---------- | -------- |
| Cotizaciones sociales (derechos reconocidos netos), 2020                      | 119.952,25 | Liquidación del presupuesto (99SISTEMA) | 119.952,25 | sí       |
| Transferencias corrientes, ingresos (derechos reconocidos netos), 2020        | 45.577,83  | Liquidación del presupuesto (99SISTEMA) | 45.577,82  | sí       |
| Pasivos financieros, ingresos (derechos reconocidos netos), 2020              | 30.330,09  | Liquidación del presupuesto (99SISTEMA) | 30.330,09  | sí       |
| Total ingresos (derechos reconocidos netos), 2020                             | 199.700,90 | Liquidación del presupuesto (99SISTEMA) | 199.700,89 | sí       |
| Transferencias corrientes, gastos (obligaciones reconocidas), 2020            | 175.900,44 | Liquidación del presupuesto (99SISTEMA) | 175.900,44 | sí       |
| Total gastos (obligaciones reconocidas), 2020                                 | 182.023,57 | Liquidación del presupuesto (99SISTEMA) | 182.023,56 | sí       |
| Cotizaciones sociales (derechos reconocidos netos), 2021                      | 131.856,51 | Liquidación del presupuesto (99SISTEMA) | 131.856,51 | sí       |
| Transferencias corrientes, ingresos (derechos reconocidos netos), 2021        | 48.002,14  | Liquidación del presupuesto (99SISTEMA) | 48.002,13  | sí       |
| Pasivos financieros, ingresos (derechos reconocidos netos), 2021              | 13.830,09  | Liquidación del presupuesto (99SISTEMA) | 13.830,09  | sí       |
| Total ingresos (derechos reconocidos netos), 2021                             | 194.796,62 | Liquidación del presupuesto (99SISTEMA) | 194.796,60 | sí       |
| Transferencias corrientes, gastos (obligaciones reconocidas), 2021            | 188.028,68 | Liquidación del presupuesto (99SISTEMA) | 188.028,68 | sí       |
| Total gastos (obligaciones reconocidas), 2021                                 | 192.149,13 | Liquidación del presupuesto (99SISTEMA) | 192.149,13 | sí       |
| Cotizaciones sociales (derechos reconocidos netos), 2022                      | 140.247,68 | Liquidación del presupuesto (99SISTEMA) | 140.247,68 | sí       |
| Transferencias corrientes, ingresos (derechos reconocidos netos), 2022        | 42.696,95  | Liquidación del presupuesto (99SISTEMA) | 42.696,95  | sí       |
| Pasivos financieros, ingresos (derechos reconocidos netos), 2022              | 6.981,59   | Liquidación del presupuesto (99SISTEMA) | 6.981,59   | sí       |
| Total ingresos (derechos reconocidos netos), 2022                             | 193.767,30 | Liquidación del presupuesto (99SISTEMA) | 193.767,29 | sí       |
| Transferencias corrientes, gastos (obligaciones reconocidas), 2022            | 187.092,17 | Liquidación del presupuesto (99SISTEMA) | 187.092,17 | sí       |
| Total gastos (obligaciones reconocidas), 2022                                 | 194.063,82 | Liquidación del presupuesto (99SISTEMA) | 194.063,82 | sí       |
| Cotizaciones sociales (derechos reconocidos netos), 2023                      | 154.399,60 | Liquidación del presupuesto (99SISTEMA) | 154.399,60 | sí       |
| Transferencias corrientes, ingresos (derechos reconocidos netos), 2023        | 43.985,97  | Liquidación del presupuesto (99SISTEMA) | 43.985,97  | sí       |
| Pasivos financieros, ingresos (derechos reconocidos netos), 2023              | 10.003,81  | Liquidación del presupuesto (99SISTEMA) | 10.003,81  | sí       |
| Total ingresos (derechos reconocidos netos), 2023                             | 211.536,47 | Liquidación del presupuesto (99SISTEMA) | 211.536,47 | sí       |
| Transferencias corrientes, gastos (obligaciones reconocidas), 2023            | 204.092,62 | Liquidación del presupuesto (99SISTEMA) | 204.092,62 | sí       |
| Total gastos (obligaciones reconocidas), 2023                                 | 213.341,31 | Liquidación del presupuesto (99SISTEMA) | 213.341,31 | sí       |
| Cotizaciones sociales (derechos reconocidos netos), 2024                      | 165.577,07 | Liquidación del presupuesto (99SISTEMA) | 165.577,07 | sí       |
| Transferencias corrientes, ingresos (derechos reconocidos netos), 2024        | 48.120,85  | Liquidación del presupuesto (99SISTEMA) | 48.120,85  | sí       |
| Pasivos financieros, ingresos (derechos reconocidos netos), 2024              | 10.003,81  | Liquidación del presupuesto (99SISTEMA) | 10.003,81  | sí       |
| Total ingresos (derechos reconocidos netos), 2024                             | 228.473,92 | Liquidación del presupuesto (99SISTEMA) | 228.473,92 | sí       |
| Transferencias corrientes, gastos (obligaciones reconocidas), 2024            | 220.480,34 | Liquidación del presupuesto (99SISTEMA) | 220.480,34 | sí       |
| Total gastos (obligaciones reconocidas), 2024                                 | 231.866,86 | Liquidación del presupuesto (99SISTEMA) | 231.866,86 | sí       |
| Pensiones en vigor octubre 2026, por edad, clase «total», total               | 10.565.782 | Fichero REG del mismo mes (por clase)   | 10.565.782 | sí       |
| Pensiones en vigor octubre 2026, por edad, clase «incapacidad», total         | 1.062.509  | Fichero REG del mismo mes (por clase)   | 1.062.509  | sí       |
| Pensiones en vigor octubre 2026, por edad, clase «jubilacion», total          | 6.777.927  | Fichero REG del mismo mes (por clase)   | 6.777.927  | sí       |
| Pensiones en vigor octubre 2026, por edad, clase «viudedad», total            | 2.344.467  | Fichero REG del mismo mes (por clase)   | 2.344.467  | sí       |
| Pensiones en vigor octubre 2026, por edad, clase «orfandad», total            | 333.841    | Fichero REG del mismo mes (por clase)   | 333.841    | sí       |
| Pensiones en vigor octubre 2026, por edad, clase «favor-familiares», total    | 47.038     | Fichero REG del mismo mes (por clase)   | 47.038     | sí       |
| Eurostat S.1314: B.9 = ingresos totales − gastos totales (26 años, 2000-2025) | 26         | Series TR y TE del mismo conjunto       | 26         | sí       |

Comprobaciones internas adicionales (`scripts/coherencia-financiacion.test.ts`): ingresos y gastos igual a la suma de operaciones, cotizaciones por régimen igual al total, pensiones por clase igual a «SUMA DE PENSIONES», acumulados trimestrales crecientes, valor del Fondo igual a dotaciones + rendimientos + disposiciones, pasivos financieros igual al importe autorizado por las leyes de PGE de 2021-2023 y razón entre gasto en pensiones y número × pensión media × 14.

<!-- verificacion-1b3:inicio -->
## Fase 1B-3: demografía, macro y salarios

Comprobaciones: 34 (21 coinciden, 13 con diferencias explicadas o informativas, 0 fallos). Generado por `scripts/etl/verificacion_1b3.py`; resultado completo en `docs/verificacion-1b3.json`.

| Comprobación | Resultado | Detalle |
| --- | --- | --- |
| PNC a diciembre de 2025: pensiones de la nómina del IMSERSO frente a pensionistas del fichero técnico del IMSERSO | diferencia | nómina 462.568 frente a fichero técnico 471.309 (diferencia 8.741) |
| PNC: pensiones de jubilación e invalidez a diciembre 2019-2024 y mensuales de 2025 | ok | 2019 452.157; 2024 457.400; diciembre de 2025 462.568 |
| Eurostat: suma por edades frente al total publicado (1971-2025, ambos sexos) | ok | diferencia máxima 0 personas (ninguno); el total incluye personas de edad desconocida |
| Población total a 1 de enero, INE frente a Eurostat (1971-2025) | diferencia | 23 de 55 años idénticos; diferencia máxima 116 personas en 2022 (0,0002 %) |
| Población por grupos de edad (0-14, 15-64, 65+), INE frente a Eurostat (1971-2025) | diferencia | diferencia máxima 108 personas (2022, grupo 15-64) |
| Población de partida de las proyecciones (1-1-2026) frente a la ECP provisional | diferencia | proyección 49.590.099 frente a ECP 49.596.376 (diferencia -6.277) |
| Población: hombres + mujeres = ambos (1971-2026) | diferencia | diferencia máxima 12 personas (el INE redondea cada serie por separado) |
| Proyección: hombres + mujeres = ambos (2026-2076) | ok | diferencia máxima 0 |
| Población proyectada: INE (2026-2076), EUROPOP2025 y Ageing Report 2024 (informativo; son proyecciones con hipótesis distintas) | diferencia | 2030: INE 51,41 M, EUROPOP2025 50,92 M, Ageing Report 2024 49,32 M / 2040: INE 53,71 M, EUROPOP2025 52,83 M, Ageing Report 2024 50,28 M / 2050: INE 54,56 M, EUROPOP2025 53,79 M, Ageing Report 2024 50,43 M / 2060: INE 54,23 M, EUROPOP2025 53,33 M, Ageing Report 2024 49,22 M / 2070: INE 53,37 M, EUROPOP2025 52,22 M, Ageing Report 2024 47,69 M |
| Mortalidad INE 1975-2024: lx(0) = 100.000 | ok | desviación máxima 0,000000 |
| Mortalidad INE 1975-2024: l(x+1) = lx × (1 − qx) | ok | diferencia máxima 0,000 personas sobre 14520 pares (peor caso (2021, 'ambos', 37); el INE redondea qx a 6 decimales) |
| Mortalidad INE 1975-2024: dx = lx − l(x+1) | ok | diferencia máxima 0,000 |
| Mortalidad INE 1975-2024: ex = Tx / lx | ok | diferencia máxima 0,00000 años |
| Mortalidad proyectada 2026-2075: lx(0) = 100.000 | ok | desviación máxima 0,000000 |
| Mortalidad proyectada 2026-2075: l(x+1) = lx × (1 − qx) | ok | diferencia máxima 0,050 personas sobre 15000 pares (peor caso (2072, 'ambos', 3); el INE redondea qx a 6 decimales) |
| Mortalidad proyectada 2026-2075: dx = lx − l(x+1) | ok | diferencia máxima 0,000 |
| Mortalidad proyectada 2026-2075: ex = Tx / lx | ok | diferencia máxima 0,00000 años |
| Esperanza de vida a los 65 años por sexo: serie anual 1975-2024 | ok | 2024: hombres 19,87, mujeres 23,64 |
| Fecundidad: ICF = suma de las tasas por edad (1975-2024, ambas nacionalidades) | ok | diferencia máxima 0,0049 hijos por mujer |
| Proyección: ICF = suma de las tasas por edad (2026-2075) | ok | diferencia máxima 0,0000 |
| Migraciones EM 2008-2021: inmigración − emigración = saldo exterior (suma por edad) | diferencia | diferencia máxima 8,00 |
| Migraciones EMCR 2021-2024: saldo derivado de la tabla por edad frente al saldo exterior publicado | ok | diferencia máxima 0,00 personas |
| Migraciones: saldo exterior de 2021 en las dos series (ruptura de serie) | diferencia | EM 148.070 frente a EMCR 191.094 personas |
| PIB corriente: INE frente a Eurostat | diferencia | 27 de 31 años idénticos; diferencia máxima 17,151 millones (3,508 %) |
| PIB en volumen (euros de 2020): INE (derivado) frente a Eurostat | ok | diferencia relativa máxima 0,0001 % |
| Deflactor del PIB (2020 = 100): INE (derivado) frente a Eurostat | diferencia | diferencia relativa máxima 3,3890 % |
| EPA: activos = ocupados + parados (miles, todos los trimestres, sexos y grupos) | ok | diferencia máxima 0,10 miles (redondeo del INE a 100 personas) |
| EPA: tasa de paro publicada = parados / activos | ok | diferencia máxima 0,50 puntos (grupos con pocos activos y redondeo de miles) |
| EPA: activos hombres + mujeres = ambos sexos (total, todos los trimestres) | ok | diferencia máxima 0,10 miles |
| Salario medio anual (euros): EAES, ETCL×12, CN por puesto y por ETC y base media de cotización×12, frente a frente | diferencia | 2018: EAES 24.009; ETCL×12 23.033; CN/puesto 31.340; CN/ETC 36.523; base media ×12 21.284 / 2020: EAES 25.166; ETCL×12 22.843; CN/puesto 34.884; CN/ETC 38.771; base media ×12 23.108 / 2022: EAES 26.949; ETCL×12 25.382; CN/puesto 36.275; CN/ETC 40.496; base media ×12 23.980 / 2024: EAES 29.540; ETCL×12 27.622; CN/puesto 39.473; CN/ETC 44.103; base media ×12 26.461 |
| Razones con la base máxima calculadas con data/parametros/base-maxima-rg | ok | 2024: EAES 0,521; ETCL 0,488; CN/puesto 0,697; base media 0,467 |
| Relación afiliados/pensiones: Alternativa 1 frente a las cuatro definiciones anteriores | diferencia | 2025: Alternativa 1 2.0741; anteriores: afiliados-diciembre-por-pensionista 2,3144; afiliados-diciembre-por-pension 2,0934; afiliados-media-anual-por-pensionista 2,2922; afiliados-media-anual-por-pension 2,0734 |
| BEL PEN-1 (diciembre de 2025, total) frente al fichero REG de la Seguridad Social | ok | BEL 10.434.860 (redondeado a centenas) frente a REG 10.434.856; diferencia 4 pensiones; importe medio BEL 1317.71 frente a REG 1317.71 |
| BEL PEN-31 (máxima y mínimas) frente a data/parametros | diferencia | 306 celdas comparables: 221 iguales y 85 distintas (años 2000-2022); 106 celdas sin dato en parametros (años 1990-1999 y otras columnas) |
<!-- verificacion-1b3:fin -->
