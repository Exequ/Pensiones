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
