# Contraste del motor con M5 v2

Los 51 casos de `data-raw/casos-oro/casos_oro_m5.json` (copia idéntica de `modelos/m5/casos_oro_m5.json`, generada por `modelos/m5/casos_oro_m5.py` con el modelo simplificado de Python `m5_v2.py`; descripción en `docs/modelos/M5_v2_descripcion.md`) se reproducen con el motor (`scripts/lib/contraste-m5.ts`, test `scripts/contraste-m5.test.ts`). Tolerancia fijada: 1e-6 (relativa). **No se ha ajustado el motor para que coincida**: el adaptador traduce a entrada del motor los supuestos de M5 y el motor aplica las reglas legales.

## Cómo se reproduce

```bash
npx vitest run scripts/contraste-m5.test.ts   # 51 casos, tolerancia 1e-6
npx tsx scripts/contraste-m5.ts               # imprime la tabla de este documento
cd modelos/m5 && python casos_oro_m5.py ../../data/parametros   # regenera el JSON de M5 con los datos de /data
cp modelos/m5/casos_oro_m5.json data-raw/casos-oro/casos_oro_m5.json
```

M5 supone una carrera continua desde la edad de inicio hasta la edad de jubilación, salario individual = salario relativo × salario medio (EAES 2024 de `data/macro`, entre 12) que crece `(1 + g)(1 + IPC)` al año, IPC constante (también en el pasado) y jubilación el 1 de enero del año T. El adaptador construye esa carrera **mes a mes con la misma fórmula** y la da al motor como _entrada_ (bases por mes); el motor aplica las reglas legales con `escenario: { ipc, sustituirHistoricoIPC: true }`. Los topes, la actualización y la mínima se activan o apagan como en cada caso (`topes`, `actualizar`). Las reglas de M5 v2 que el adaptador reproduce son:

- **Edad**: 65 años si los meses cotizados hasta los 65 (meses desde el inicio hasta esa edad menos las lagunas) alcanzan la carrera de la DT 7.ª; si no, la edad ordinaria del año.
- **Suelo de la base mínima**: la base de cada mes es el mayor entre el salario y la base mínima de su año (`suelo_base_minima`, activo por defecto). Los meses anteriores al primer año con base mínima en `/data` (2000) quedan fuera de toda ventana.
- **Lagunas anteriores a la primera alta**: se integran (`lagunas_previas = «integrar»`) o se ignoran (`«ignorar»`) con la lectura `lagunasAnterioresAlPrimerAlta` del motor.
- **Integración reforzada de la DT 41.ª** de las lagunas: apagada por defecto, activable por caso (`integracion_reforzada`, opción `integracionReforzadaLagunas`).
- **Años sin base mínima en `/data`**: `huecoBaseMinima: «anterior»`, como M5 (`hueco_base_minima = «anterior»`).

## Resultado

**Los 51 casos coinciden; diferencia relativa máxima: 5,54e-15** (ruido de coma flotante; el umbral del test es 1e-6). El estado (`contributiva`, `minima`, `maxima`, `no-causa-derecho`) coincide también en los 51. Reparto de estados: 37 contributivas, 9 con pensión máxima, 3 con pensión mínima y 2 que no causan derecho (con M5, pensión final 0). En estos dos últimos casos la «diferencia» de la tabla es la pensión del motor, que es 0 (no se puede dividir entre 0); la base reguladora de M5 figura como 0 porque M5 no la calcula si no hay derecho, mientras que el motor sí la calcula.

| Caso                                                        | M5 (€/año) | Motor (€/año) | Diferencia | Estado M5 / motor                   | Base reguladora M5 / motor (€/mes) |
| ----------------------------------------------------------- | ---------: | ------------: | ---------: | ----------------------------------- | ---------------------------------: |
| base T2026 rel0.5 g0.0                                      |     14.856 |        14.856 |          0 | contributiva / contributiva         |                        1061 / 1061 |
| base T2026 rel0.5 g0.015                                    |     13.107 |        13.107 |          0 | minima / minima                     |                          913 / 913 |
| base T2026 rel1.0 g0.0                                      |     29.492 |        29.492 |          0 | contributiva / contributiva         |                        2107 / 2107 |
| base T2026 rel1.0 g0.015                                    |     25.331 |        25.331 |          0 | contributiva / contributiva         |                        1809 / 1809 |
| base T2026 rel2.0 g0.0                                      |     47.034 |        47.034 |          0 | maxima / maxima                     |                        3623 / 3623 |
| base T2026 rel2.0 g0.015                                    |     47.034 |        47.034 |          0 | maxima / maxima                     |                        3511 / 3511 |
| base T2035 rel0.5 g0.0                                      |     18.402 |        18.402 |          0 | contributiva / contributiva         |                        1314 / 1314 |
| base T2035 rel0.5 g0.015                                    |     17.564 |        17.564 |          0 | contributiva / contributiva         |                        1255 / 1255 |
| base T2035 rel1.0 g0.0                                      |     35.246 |        35.246 |          0 | contributiva / contributiva         |                        2518 / 2518 |
| base T2035 rel1.0 g0.015                                    |     34.613 |        34.613 |          0 | contributiva / contributiva         |                        2472 / 2472 |
| base T2035 rel2.0 g0.0                                      |     56.783 |        56.783 |          0 | maxima / maxima                     |                        4643 / 4643 |
| base T2035 rel2.0 g0.015                                    |     56.783 |        56.783 |          0 | maxima / maxima                     |                        4694 / 4694 |
| base T2043 rel0.5 g0.0                                      |     22.144 |        22.144 |          0 | contributiva / contributiva         |                        1582 / 1582 |
| base T2043 rel0.5 g0.015                                    |     22.887 |        22.887 |          0 | contributiva / contributiva         |                        1635 / 1635 |
| base T2043 rel1.0 g0.0                                      |     41.292 |        41.292 |          0 | contributiva / contributiva         |                        2949 / 2949 |
| base T2043 rel1.0 g0.015                                    |     45.205 |        45.205 |          0 | contributiva / contributiva         |                        3229 / 3229 |
| base T2043 rel2.0 g0.0                                      |     67.133 |        67.133 |          0 | maxima / maxima                     |                        5674 / 5674 |
| base T2043 rel2.0 g0.015                                    |     67.133 |        67.133 |          0 | maxima / maxima                     |                        5999 / 5999 |
| base T2050 rel0.5 g0.0                                      |     26.032 |        26.032 |          0 | contributiva / contributiva         |                        1859 / 1859 |
| base T2050 rel0.5 g0.015                                    |     29.013 |        29.013 |          0 | contributiva / contributiva         |                        2072 / 2072 |
| base T2050 rel1.0 g0.0                                      |     47.430 |        47.430 |          0 | contributiva / contributiva         |                        3388 / 3388 |
| base T2050 rel1.0 g0.015                                    |     57.429 |        57.429 |          0 | contributiva / contributiva         |                        4102 / 4102 |
| base T2050 rel2.0 g0.0                                      |     77.726 |        77.726 |          0 | maxima / maxima                     |                        6730 / 6730 |
| base T2050 rel2.0 g0.015                                    |     77.726 |        77.726 |          0 | maxima / maxima                     |                        7529 / 7529 |
| carrera corta 15 anios                                      |     14.187 |        14.187 |          0 | minima / minima                     |                        1717 / 1717 |
| inicio tardio 35                                            |     35.819 |        35.819 |          0 | contributiva / contributiva         |                        2883 / 2883 |
| topada maxima                                               |     70.003 |        70.003 |          0 | maxima / maxima                     |                        6385 / 6385 |
| minima                                                      |     14.187 |        14.187 |          0 | minima / minima                     |                        1002 / 1002 |
| lagunas 12                                                  |     45.902 |        45.902 |          0 | contributiva / contributiva         |                        3279 / 3279 |
| lagunas 48                                                  |     43.462 |        43.462 |          0 | contributiva / contributiva         |                        3104 / 3104 |
| lagunas 60                                                  |     42.470 |        42.470 |          0 | contributiva / contributiva         |                        3034 / 3034 |
| ipc 0                                                       |     31.885 |        31.885 |          0 | contributiva / contributiva         |                        2278 / 2278 |
| ipc 4                                                       |     66.975 |        66.975 |          0 | contributiva / contributiva         |                        4784 / 4784 |
| sin topes                                                   |    139.137 |       139.137 |          0 | contributiva / contributiva         |                        9938 / 9938 |
| sin actualizar                                              |     37.786 |        37.786 |          0 | contributiva / contributiva         |                        2699 / 2699 |
| opcion25 2040                                               |     42.048 |        42.048 |          0 | contributiva / contributiva         |                        3003 / 3003 |
| salario medio de referencia 2000                            |     37.681 |        37.681 |          0 | contributiva / contributiva         |                        2691 / 2691 |
| edad 65: justo 462 meses (T2045)                            |     46.379 |        46.379 |          0 | contributiva / contributiva         |                        3313 / 3313 |
| edad 67: 461 meses (T2045)                                  |     46.379 |        46.379 |          0 | contributiva / contributiva         |                        3313 / 3313 |
| edad 65: justo 459 meses (T2026)                            |     26.607 |        26.607 |          0 | contributiva / contributiva         |                        1901 / 1901 |
| edad 66a10m: 458 meses (T2026)                              |     26.607 |        26.607 |          0 | contributiva / contributiva         |                        1901 / 1901 |
| lagunas 54 (462 cotizados a los 65)                         |     42.965 |        42.965 |          0 | contributiva / contributiva         |                        3069 / 3069 |
| lagunas 55 (461 cotizados a los 65)                         |     42.882 |        42.882 |          0 | contributiva / contributiva         |                        3063 / 3063 |
| carrera corta sin opcion25 inicio 45 T2045                  |     27.675 |        27.675 |          0 | contributiva / contributiva         |                        2997 / 2997 |
| carrera corta con opcion25 inicio 45 T2035                  |     21.524 |        21.524 |          0 | contributiva / contributiva         |                        2331 / 2331 |
| carrera corta inicio 49 T2040 (hueco base minima 2020-2021) |     19.121 |        19.121 |          0 | contributiva / contributiva         |                        2403 / 2403 |
| carrera corta ignorando lagunas previas                     |     25.451 |        25.451 |          0 | contributiva / contributiva         |                        2756 / 2756 |
| sin carencia (144 meses)                                    |          0 |             0 |          0 | no-causa-derecho / no-causa-derecho |                           0 / 2142 |
| periodo previo justo (156 lagunas)                          |     28.519 |        28.519 |          0 | contributiva / contributiva         |                        2295 / 2295 |
| sin periodo previo (157 lagunas)                            |          0 |             0 |          0 | no-causa-derecho / no-causa-derecho |                           0 / 2287 |
| integracion reforzada 84 lagunas                            |     40.530 |        40.530 |          0 | contributiva / contributiva         |                        2895 / 2895 |

### Historia del contraste

- **Con M5 v1** (37 casos, tolerancia 1,5 %), el motor quedaba entre un 0,05 % y un 0,41 % por debajo de M5 en las pensiones contributivas. La causa era el **mes previo**: la ley excluye de la base reguladora el mes anterior al del hecho causante (art. 209.1) y M5 v1 lo incluía, con salarios un mes más recientes; la diferencia relativa coincidía con el crecimiento nominal de un mes, `((1 + g)(1 + IPC))^(1/12) − 1`. En las pensiones topadas o mínimas no había diferencia, porque dependen del tope o de la mínima y no de la base reguladora.
- **Dos casos con una regla distinta**: «carrera corta 15 anios» (el motor integraba las lagunas anteriores a la primera alta con la base mínima y M5 v1 las dejaba fuera: base reguladora un 13 % mayor, pensión igual por ser la mínima en ambos) y «lagunas 60» (con 456 meses cotizados la ley exige 67 años; M5 v1 decidía la edad con los meses potenciales hasta los 65 y el motor, entonces, necesitaba la opción `calcularAunqueNoCumpla` para comparar importes).

### Qué corrige M5 v2

Detalle en `docs/modelos/M5_v2_descripcion.md`. Cada punto elimina una de las diferencias anteriores o añade una regla que el motor ya tenía:

1. **Mes previo excluido de la ventana** de la base reguladora (se sigue contando como mes cotizado para el porcentaje).
2. **Lagunas anteriores a la primera alta integradas** con la base mínima de cada mes (48 meses al 100 % y el resto al 50 %).
3. **Edad por meses cotizados**: 65 años solo si los meses cotizados hasta esa edad, sin lagunas, llegan a los 459 (2026) o 462 (desde 2027) de la DT 7.ª; si no, la edad ordinaria del año.
4. **Requisitos de acceso**: carencia de 180 meses y 24 de ellos dentro de los 180 meses anteriores; sin ellos la pensión es 0 (`no-causa-derecho`).
5. **Suelo de la base mínima** en las bases mensuales del modelo (decisión de este proyecto; véase `docs/DECISIONES.md`).

## Base mínima de 2020 y 2021

Hasta esta fase `/data` no tenía la base mínima de 2020 ni de 2021 y los dos modelos usaban el último año anterior con dato (1.050,00 euros/mes, de 2019). Con las cuantías añadidas (1.108,50 para 2020, dato publicado; 1.108,50 para 2021, valor deducido para enero-agosto; véanse `docs/PENDIENTE_DATOS.md` y `docs/DECISIONES.md`) se regeneró el JSON de M5 con `casos_oro_m5.py` y el contraste sigue en 51 de 51. Solo cambian seis casos de M5, los de salario relativo bajo (0,5) o carrera corta, en los que el suelo de la base mínima actúa en 2020-2021 (base reguladora algo mayor): en cuatro cambia también la pensión final (hasta un 0,24 %) y en los otros dos es la pensión mínima y no cambia. Los demás casos son idénticos. El caso «carrera corta inicio 49 T2040 (hueco base minima 2020-2021)» conserva su nombre, porque el nombre lo fija `casos_oro_m5.py`, aunque ya no hay hueco.

## Qué prueba y qué no

La coincidencia prueba que **las dos implementaciones son coherentes entre sí**: M5 v2 (Python) y el motor TypeScript se programaron aparte y calculan lo mismo en 51 situaciones, incluidos los límites (462 y 461 meses, 156 y 157 meses de laguna, 144 meses de carrera). **No prueba que la lectura legal sea correcta.** Varias reglas de las que M5 v2 y el motor comparten siguen siendo lecturas abiertas (`docs/REVISION_ACTUARIAL.md`, `docs/REVISION_PRIORIZADA.md`): en especial, la integración de las lagunas anteriores a la primera alta (el texto no distingue entre meses anteriores y posteriores a la primera alta), el alcance de la integración reforzada de la DT 41.ª (el Criterio 17/2025 de la DGOSS la extiende a hombres; el contraste la deja apagada por defecto) y la referencia de la base mínima en la integración de lagunas. Tampoco es un contraste con pensiones reales ni con el simulador de la Seguridad Social.

## Simplificaciones de M5 que el motor no comparte (sin efecto en estos 51 casos)

- M5 solo calcula la jubilación ordinaria el 1 de enero; el motor admite cualquier fecha, las otras modalidades (anticipada, demorada, parcial), el complemento de brecha de género, el límite de ingresos de los complementos por mínimos y el efecto del día exacto del hecho causante.
- M5 supone jornada completa y las lagunas siempre justo antes de la jubilación (también cuando eso retrasa la jubilación a los 67); el motor admite carreras con huecos en cualquier punto, varios periodos, bases distintas cada mes y pluriempleo.
- M5 usa un IPC constante, también en el pasado, y revalorización igual al IPC; el motor, por defecto, usa el IPC real de `/data` (índice mensual del INE desde 1992) y para el contraste se activa `sustituirHistoricoIPC`. Las mínimas y la base mínima posteriores a 2026 crecen solo con el IPC en ambos.
- M5 no tiene en cuenta los años sin dato (repite el último valor, `hueco_base_minima = «anterior»`); el motor, por defecto, devuelve un error (`DatoNoDisponible`) y solo repite el último valor con la opción `huecoBaseMinima: «anterior»`, que el contraste activa.
- M5 no distingue la base mínima de enero a agosto de 2021 de la de septiembre a diciembre (1.125,90 euros/mes por la Orden PCM/1353/2021); `/data` guarda un valor por año y el motor aplica el de enero a todo 2021 (alrededor de un 1,5 % por debajo de la base legal en esos cuatro meses).
- M5 no calcula la incapacidad permanente ni la supervivencia: esos motores no tienen contraste con un modelo propio.

## Efecto del IPC mensual del INE (Fase 2-D)

Sin cambios: el contraste reproduce M5 con un escenario de IPC constante que **sustituye** también el histórico del IPC (`sustituirHistoricoIPC`), de modo que ni el índice mensual del INE ni el suelo del factor de actualización intervienen. El resultado (51 de 51 casos, diferencia máxima ≤ 1e-6) es el mismo con y sin la serie mensual del INE, así que la Fase 2-D no cambia el resultado del contraste. No se tocó `modelos/` ni `docs/modelos/` en esa fase.
