# Casos de oro del motor de jubilación (construidos a mano)

Fase 2-A. Seis casos con cuentas que se pueden repetir con una calculadora a partir del texto de la ley y de los datos de `/data` citados. Están en `src/engine/jubilacion/casos-oro-motor.test.ts`. Todos usan bases **constantes y sin actualizar** (para que la cuenta sea de cabeza) y el IPC del escenario (2 %) solo para los años sin dato (2027 en adelante). Se apaga la opción de 25 años salvo que se diga lo contrario. Las cifras de los casos son de **prueba, ficticias**: no son datos de ninguna persona.

Datos de `/data` que usan (referencias `data/parametros/fichero.json#id`):

| Dato                                       | Valor                                         | Referencia                                                                   |
| ------------------------------------------ | --------------------------------------------- | ---------------------------------------------------------------------------- |
| Periodo de cómputo 2030                    | 320 meses                                     | `periodo-calculo-base-reguladora#2037` (rige «a partir de 2037»; 2030 = 320) |
| Divisor 2030                               | 361,67 (310 bases)                            | `divisor-base-reguladora#2030`                                               |
| Divisor 2031                               | 364 (312 bases)                               | `divisor-base-reguladora#2031`                                               |
| Escala desde 2027                          | 50 % + 0,19 % × 248 meses + 0,18 % × 16 meses | `escala-jubilacion-tramos#2027-*`                                            |
| Edad con carrera larga                     | 65 años (780 meses) con 462 meses desde 2027  | `jubilacion-edad-65`, `carrera-jubilacion-65#2027`                           |
| Pensión máxima 2026                        | 3.359,60 €/mes (14 pagas)                     | `pension-maxima#2026`; DT 39.ª: `pension-maxima-incremento-futuro` (0,115)   |
| Mínima 2026 (jub. 65, sin cónyuge a cargo) | 13.106,80 €/año                               | `pension-minima-jubilacion#2026-jub65-unipersonal`                           |

## 1 · Jubilación ordinaria con carrera completa

Nacida el 1-1-1965, se jubila el 1-1-2030 a los 65 años; 43 años cotizados (1-1987 a 12-2029, 516 meses) a 2.500 €/mes.

1. **Edad**: 780 meses cumplidos; con 516 ≥ 462 meses la edad exigida es de 65 años. Cumple. Carencia: 516 ≥ 180. Periodo previo: 180 meses en la ventana ≥ 24.
2. **Base reguladora** (DT 40.ª, 2030): se toman las 310 mejores bases de las 320 anteriores al mes previo (todas valen 2.500) y se dividen entre 361,67: `310 × 2.500 / 361,67 = 775.000 / 361,67 =` **2.142,84 €**.
3. **Porcentaje**: 516 meses ≥ 444 (180 + 248 + 16): 100 %.
4. **Pensión**: 2.142,84 € por paga, **29.999,72 € al año** (14 pagas). Menor que la máxima (3.652,97) y mayor que la mínima (1.013,37): contributiva.

## 2 · Jubilación anticipada voluntaria (12 meses)

Nacida el 1-1-1966, se jubila el 1-1-2030 a los 64 años; 42 años cotizados (504 meses) a 2.500 €/mes.

1. **Edad legal**: con la cotización proyectada hasta los 65 años (504 + 12 = 516 ≥ 462) es de 65 años: 1-1-2031. Anticipación: **12 meses** (máximo 24, art. 208.1.a).
2. **Cotización efectiva**: 504 ≥ 420 meses (35 años, art. 208.1.b).
3. **Base reguladora y porcentaje**: igual que el caso 1 (2.142,84 €; 100 %).
4. **Coeficiente** (art. 208.2): 504 meses está en el tramo «41 años y 6 meses a menos de 44 años y 6 meses» (498 ≤ 504 < 534); 12 meses de anticipación → **5,00 %** (`jubilacion-coeficientes-voluntaria#t3-12`).
5. **Pensión**: `2.142,84 × (1 − 0,05) =` **2.035,70 €** por paga, 28.499,74 € al año.
6. **Requisito del art. 208.1.c**: 28.499,74 > mínima de 2030 a los 65 años (13.106,80 × 1,02⁴ = 14.187,22). Cumple.

## 3 · Jubilación anticipada involuntaria (24 meses)

Nacida el 1-1-1967, se jubila el 1-1-2030 a los 63 años; 41 años cotizados (492 meses) a 2.500 €/mes.

1. **Anticipación**: 24 meses (máximo 48, art. 207.1.a). Cotización efectiva: 492 ≥ 396.
2. **Coeficiente** (art. 207.2): 492 meses está en el tramo «38 años y 6 meses a menos de 41 años y 6 meses» (462 ≤ 492 < 498); 24 meses → **14,00 %** (`jubilacion-coeficientes-involuntaria#t2-24`).
3. **Pensión**: `2.142,84 × (1 − 0,14) =` **1.842,84 €** por paga.
4. **Tope** (art. 210.4): la pensión máxima de 2030 reducida un 0,50 % por trimestre de anticipación (8 trimestres → 4 %): no se alcanza.

## 4 · Jubilación demorada (dos años)

Nacida el 1-1-1964: cumple 65 años el 1-1-2029 con 516 meses cotizados (1-1986 a 12-2028), así que esa es su edad ordinaria. Sigue cotizando dos años más (hasta 12-2030, 540 meses en total, 2.500 €/mes) y se jubila el 1-1-2031.

1. **Base reguladora** (2031: 312 mejores bases de 324 meses entre 364): `312 × 2.500 / 364 =` **2.142,86 €**.
2. **Porcentaje**: 100 % por 540 meses. **Porcentaje adicional** (art. 210.2.a): 2 años completos × 4 % = **8 %**. Total 108 %.
3. **Pensión**: `2.142,86 × 1,08 =` **2.314,29 €** por paga, 32.400,00 € al año. No alcanza la máxima de 2031.
4. **Variante a tanto alzado** (art. 210.2.b): la pensión no lleva el 8 % (2.142,86 €); pago único por año completo `800 × (2.142,86 × 14 / 500)^(1/1,65) = 800 × 60,00^(0,606) =` **9.566,60 €** (se usa 800 porque a los 65 años había 516 < 534 meses cotizados); por 2 años: **19.133,19 €**.

## 5 · Pensión topada

Bases de 9.000 €/mes de 1-1988 a 12-2029 (se reducen a la base máxima de cada mes, que crece +1,2 puntos sobre el IPC desde 2027) con actualización con el IPC: la base reguladora supera la pensión máxima.

- **Pensión máxima de 2030** (DT 39.ª): `3.359,60 × (1 + 0,02 + 0,00115)⁴ = 3.359,60 × 1,02115⁴ =` **3.652,97 €** por paga.
- La pensión calculada (BR × 100 %) es mayor: el estado es «máxima» y la pensión es 3.652,97 €.

## 6 · Pensión mínima

Bases de 900 €/mes de 1-1988 a 12-2029 (sin actualizar), 100 %: base reguladora `310 × 900 / 361,67 = 771,43 €`; la pensión contributiva queda por debajo de la mínima.

- **Mínima de 2030** (jubilación a los 65 años, sin cónyuge a cargo): `13.106,80 × 1,02⁴ = 14.187,22 € al año`, es decir, **1.013,37 € por paga** (÷ 14). Estado «mínima»; el complemento es la diferencia.

## Verificación independiente

Las cifras de los casos 1 a 6 se recalcularon aparte con un cálculo directo en Python a partir de los JSON de `data/parametros` (no con el motor); los valores coinciden con los del motor hasta el céntimo. Los tests comparan el motor con esas cifras (`toBeCloseTo`) y con las fórmulas escritas de forma independiente en el propio test.
