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
