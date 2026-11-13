# Contraste del motor con M5

Fase 2-A. Los 37 casos de `data-raw/casos-oro/casos_oro_m5.json` (modelo simplificado de Python `m5_v1.py`) se reproducen con el motor (`scripts/lib/contraste-m5.ts`, test `scripts/contraste-m5.test.ts`). Tolerancia fijada: 1,5 %. **No se ha ajustado el motor para que coincida.**

## Cómo se reproduce

M5 supone una carrera continua desde la edad de inicio hasta la edad ordinaria, salario individual = salario relativo × salario medio (EAES 2024 de `data/macro`, entre 12) que crece `(1 + g)(1 + IPC)` al año, IPC constante (también en el pasado), jubilación el 1 de enero del año T. El adaptador construye esa carrera **mes a mes con la misma fórmula** y la da al motor como _entrada_ (bases por mes); el motor aplica las reglas legales con `escenario: { ipc, sustituirHistoricoIPC: true }`. Los topes, la actualización y la mínima se activan o apagan como en cada caso (`topes`, `actualizar`). La edad es la de M5 (65 años si los meses potenciales hasta los 65 alcanzan la carrera de la DT 7.ª; si no, la edad del año).

## Efecto del IPC mensual del INE (Fase 2-D)

Sin cambios: el contraste reproduce M5 con un escenario de IPC constante que **sustituye** también el histórico del IPC (`sustituirHistoricoIPC`), de modo que ni el índice mensual del INE ni el suelo del factor de actualización intervienen. La tabla siguiente es idéntica antes y después de la Fase 2-D (diferencia máxima 0,41 %; 37 de 37 casos dentro del 0,5 %). El desfase respecto a M5 sigue siendo el de la regla del mes previo; no se tocó `modelos/` ni `docs/modelos/`.

## Resultado

Diferencia máxima: 0,41 %; casos con diferencia ≤ 0,5 %: 37 de 37; ≤ 1,5 %: 37 de 37.

| Caso                             | M5 (€/año) | Motor (€/año) | Diferencia | Estado M5 / motor                                       | Base reguladora M5 / motor (€/mes) |
| -------------------------------- | ---------: | ------------: | ---------: | ------------------------------------------------------- | ---------------------------------: |
| base T2026 rel0.5 g0.0           |     14.770 |        14.746 |    -0,16 % | contributiva / contributiva                             |                        1055 / 1053 |
| base T2026 rel0.5 g0.015         |     13.107 |        13.107 |     0,00 % | minima / minima                                         |                          907 / 905 |
| base T2026 rel1.0 g0.0           |     29.541 |        29.492 |    -0,16 % | contributiva / contributiva                             |                        2110 / 2107 |
| base T2026 rel1.0 g0.015         |     25.404 |        25.331 |    -0,29 % | contributiva / contributiva                             |                        1815 / 1809 |
| base T2026 rel2.0 g0.0           |     47.034 |        47.034 |     0,00 % | maxima / maxima                                         |                        3631 / 3623 |
| base T2026 rel2.0 g0.015         |     47.034 |        47.034 |     0,00 % | maxima / maxima                                         |                        3520 / 3511 |
| base T2035 rel0.5 g0.0           |     17.652 |        17.623 |    -0,16 % | contributiva / contributiva                             |                        1261 / 1259 |
| base T2035 rel0.5 g0.015         |     17.357 |        17.307 |    -0,29 % | contributiva / contributiva                             |                        1240 / 1236 |
| base T2035 rel1.0 g0.0           |     35.304 |        35.246 |    -0,16 % | contributiva / contributiva                             |                        2522 / 2518 |
| base T2035 rel1.0 g0.015         |     34.713 |        34.613 |    -0,29 % | contributiva / contributiva                             |                        2480 / 2472 |
| base T2035 rel2.0 g0.0           |     56.783 |        56.783 |     0,00 % | maxima / maxima                                         |                        4653 / 4643 |
| base T2035 rel2.0 g0.015         |     56.783 |        56.783 |     0,00 % | maxima / maxima                                         |                        4707 / 4694 |
| base T2043 rel0.5 g0.0           |     20.680 |        20.646 |    -0,16 % | contributiva / contributiva                             |                        1477 / 1475 |
| base T2043 rel0.5 g0.015         |     22.668 |        22.603 |    -0,29 % | contributiva / contributiva                             |                        1619 / 1614 |
| base T2043 rel1.0 g0.0           |     41.360 |        41.292 |    -0,16 % | contributiva / contributiva                             |                        2954 / 2949 |
| base T2043 rel1.0 g0.015         |     45.336 |        45.205 |    -0,29 % | contributiva / contributiva                             |                        3238 / 3229 |
| base T2043 rel2.0 g0.0           |     67.133 |        67.133 |     0,00 % | maxima / maxima                                         |                        5686 / 5674 |
| base T2043 rel2.0 g0.015         |     67.133 |        67.133 |     0,00 % | maxima / maxima                                         |                        6014 / 5999 |
| base T2050 rel0.5 g0.0           |     23.754 |        23.715 |    -0,16 % | contributiva / contributiva                             |                        1697 / 1694 |
| base T2050 rel0.5 g0.015         |     28.798 |        28.714 |    -0,29 % | contributiva / contributiva                             |                        2057 / 2051 |
| base T2050 rel1.0 g0.0           |     47.509 |        47.430 |    -0,16 % | contributiva / contributiva                             |                        3393 / 3388 |
| base T2050 rel1.0 g0.015         |     57.595 |        57.429 |    -0,29 % | contributiva / contributiva                             |                        4114 / 4102 |
| base T2050 rel2.0 g0.0           |     77.726 |        77.726 |     0,00 % | maxima / maxima                                         |                        6743 / 6730 |
| base T2050 rel2.0 g0.015         |     77.726 |        77.726 |     0,00 % | maxima / maxima                                         |                        7550 / 7529 |
| carrera corta 15 anios           |     14.187 |        14.187 |     0,00 % | minima / minima                                         |                        1518 / 1717 |
| inicio tardio 35                 |     35.908 |        35.819 |    -0,25 % | contributiva / contributiva                             |                        2890 / 2883 |
| topada maxima                    |     70.003 |        70.003 |     0,00 % | maxima / maxima                                         |                        6402 / 6385 |
| minima                           |     14.187 |        14.187 |     0,00 % | minima / minima                                         |                          858 / 856 |
| lagunas 12                       |     45.974 |        45.902 |    -0,16 % | contributiva / contributiva                             |                        3284 / 3279 |
| lagunas 48                       |     43.484 |        43.462 |    -0,05 % | contributiva / contributiva                             |                        3106 / 3104 |
| lagunas 60                       |     42.491 |        42.470 |    -0,05 % | contributiva / contributiva (no causa derecho a los 65) |                        3035 / 3034 |
| ipc 0                            |     31.912 |        31.885 |    -0,08 % | contributiva / contributiva                             |                        2279 / 2278 |
| ipc 4                            |     67.250 |        66.975 |    -0,41 % | contributiva / contributiva                             |                        4804 / 4784 |
| sin topes                        |    139.482 |       139.137 |    -0,25 % | contributiva / contributiva                             |                        9963 / 9938 |
| sin actualizar                   |     37.879 |        37.786 |    -0,25 % | contributiva / contributiva                             |                        2706 / 2699 |
| opcion25 2040                    |     42.187 |        42.048 |    -0,33 % | contributiva / contributiva                             |                        3013 / 3003 |
| salario medio de referencia 2000 |     37.774 |        37.681 |    -0,25 % | contributiva / contributiva                             |                        2698 / 2691 |

Los 37 casos coinciden con el motor dentro del 0,5 %; ninguno supera el umbral que obligaría a explicar la diferencia. Aun así, se documentan las causas.

## Por qué el motor queda un 0,05 % a 0,41 % por debajo de M5 en las pensiones contributivas

**Diferencia de un mes en la ventana.** La ley excluye el «mes previo» al del hecho causante: la base reguladora empieza en el mes anterior a ese (art. 209.1). M5 incluye el mes inmediatamente anterior a la jubilación (k = 1) y actualiza las bases con el exponente `(k − 25)/12` en lugar de `(i − 25)/12` con i = k − 1. Con jubilación el 1 de enero el motor trabaja con meses un mes más antiguos y, por tanto, con salarios un mes más bajos. La diferencia relativa coincide con el crecimiento nominal de un mes, `((1 + g)(1 + IPC))^(1/12) − 1`:

| g     | IPC | Crecimiento nominal de un mes | Diferencia en los casos                                                                               |
| ----- | --- | ----------------------------- | ----------------------------------------------------------------------------------------------------- |
| 0 %   | 2 % | 0,165 %                       | −0,16 % (casos «g0.0»)                                                                                |
| 1 %   | 0 % | 0,083 %                       | −0,08 % (caso «ipc 0»)                                                                                |
| 1 %   | 2 % | 0,25 %                        | −0,25 % (casos «sin topes», «sin actualizar», «inicio tardio 35», «salario medio de referencia 2000») |
| 2 %   | 2 % | 0,33 %                        | −0,33 % (caso «opcion25 2040»)                                                                        |
| 1,5 % | 2 % | 0,29 %                        | −0,29 % (casos «g0.015»)                                                                              |
| 1 %   | 4 % | 0,41 %                        | −0,41 % (caso «ipc 4»)                                                                                |

**El motor está del lado de la ley**: el mes previo no se computa. En las pensiones topadas o mínimas no hay diferencia porque ambas dependen del tope o de la mínima, no de la base reguladora.

## Casos con una regla que distingue al motor de M5

1. **«carrera corta 15 anios»** (entrada a los 50 años, jubilación en 2030 a los 67). La ventana de 2030 es de 320 meses y la carrera solo tiene 204: los 116 meses anteriores a la primera alta son meses «sin obligación de cotizar» dentro de la ventana. **El motor los integra con la base mínima (art. 209.1.b, lectura literal); M5 los deja fuera** (divide la suma de 204 bases entre 361,67). La base reguladora del motor es un 13 % mayor (1.717 frente a 1.518 €/mes), pero la pensión final coincide porque en los dos modelos es la mínima. Esta lectura es una de las dudas abiertas (opción `lagunasAnterioresAlPrimerAlta`; con «ignorar» el motor da la base de M5; véase `docs/REVISION_ACTUARIAL.md`).
2. **«lagunas 60»** (60 meses sin cotizar al final, entrada a los 22, jubilación en 2045). Quedan 456 meses cotizados, menos de los 462 que exige la DT 7.ª desde 2027 para jubilarse a los 65 años: **la ley exige entonces 67 años**. M5 decide la edad con los meses _potenciales_ hasta los 65 (516) y supone jubilación a los 65. El motor lo señala (`cumpleRequisitos: false`, requisito «edad») y, para poder contrastar los importes, calcula igualmente con la opción `calcularAunqueNoCumpla`. El importe coincide (−0,05 %), pero en la realidad esa persona no causaría pensión a los 65 años.
3. **«lagunas 12/48/60»**. Las lagunas están al final de la carrera y se integran con la base mínima de cada mes; M5 usa la misma regla (48 meses al 100 % y el resto al 50 %) con la base mínima proyectada con el IPC. Coinciden.

## Simplificaciones de M5 que el motor no comparte (sin efecto en estos 37 casos)

- M5 no integra las lagunas anteriores a la primera alta (caso 1).
- M5 decide la edad con los meses potenciales; el motor, con los cotizados (caso 2).
- M5 solo calcula la jubilación ordinaria el 1 de enero; el motor admite cualquier fecha, las otras modalidades, la integración reforzada de la DT 41.ª (mujeres), el complemento de brecha de género, el límite de ingresos de los mínimos, los años sin dato (error en vez de repetir el último valor) y el efecto del día exacto del hecho causante.
- M5 sustituye el IPC pasado por el del escenario y el motor, por defecto, usa el IPC real de `/data` (para el contraste se activa `sustituirHistoricoIPC`).
