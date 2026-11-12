# M6 · Cuentas nocionales frente al sistema español

## 1. Qué pregunta responde
«Si la misma persona, con la misma carrera y la misma cotización, estuviera en un sistema de cuentas
nocionales (como el sueco) en lugar del sistema español, ¿qué pensión cobraría y qué rendimiento
obtendría por lo que cotiza?»

Sirve para ver las ventajas e inconvenientes de cada diseño: el sistema nocional liga la pensión a
lo aportado y a la esperanza de vida; el español, a la base reguladora y a la ley.

## 2. Cómo funciona un sistema de cuentas nocionales, en cinco pasos
1. Cada mes se anota en una cuenta virtual un porcentaje del salario (el tipo de cotización `c`).
2. Ese saldo «crece» cada año a un tipo nocional `r` (aquí, el crecimiento de los salarios).
3. Al jubilarse, se divide el saldo entre un **divisor de anualidad**: el valor actual de cobrar 1 € al
   año de por vida, según cuánto se espera vivir.
4. Más esperanza de vida significa divisor mayor y, para el mismo saldo, pensión inicial menor.
5. Durante la jubilación, la pensión se actualiza según el tipo nocional menos un tipo «norma»
   (convención sueca del 1,6 %).

## 3. Cómo leer los resultados
| Resultado | Qué significa |
|---|---|
| `edad_jub`, `anios_cot` | Edad de jubilación y años cotizados (los mismos que en M5). |
| `e_ret` | Años que se espera vivir tras jubilarse, con la mortalidad usada. |
| `divisor_G` | Divisor de anualidad. Más alto significa pensión inicial más baja. |
| `rr_es` | Tasa de reposición del sistema español (pensión ÷ último salario), tomada de M5. |
| `rr_ndc` | Tasa de reposición en cuentas nocionales. |
| `tir_es`, `tir_ndc` | **TIR real implícita**: el rendimiento anual (por encima de la inflación) de lo cotizado. Si una persona ingresara sus cotizaciones en una cuenta con ese rendimiento, obtendría exactamente las pensiones esperadas. |

**Cómo interpretar la TIR.** En el sistema nocional sale igual al crecimiento salarial, porque está
diseñado para ser actuarialmente justo. La del sistema español puede ser mayor o menor según la
carrera, la longevidad y el esfuerzo contributivo que se compare. Una TIR mayor significa que el
sistema devuelve más de lo aportado, y alguien tiene que financiar la diferencia.

**Ejemplo** (cohorte de 2045, hombre, inicio a los 22, `g=1 %`, cotización del 16 %, sin mejora de
longevidad): vive 19 años tras jubilarse, `divisor_G = 16,4`, la pensión nocional es el 41,9 % del
último salario y la española el 87,7 %. Con mejora de la mortalidad del 1 % anual, vive 22 años, el
divisor sube a 18,5 y la nocional baja a 37,2 %, mientras que la española sigue en 87,7 %.

## 4. Datos de entrada
- Los de M5 (`Pensiones/data/parametros`) para la pensión española.
- Tipo de cotización por contingencias comunes (`tipo-cc-empresa` y `tipo-cc-trabajador`): 28,3 %
  en 2026.
- **Mortalidad provisional, no oficial:** ley de Gompertz calibrada a una esperanza de vida a los
  65 de 19 años en hombres y 23 en mujeres (valores de prueba). Se sustituirá por las tablas del
  INE.

## 5. Qué se puede modificar
| Parámetro | Qué es | Valores razonables | Qué esperar |
|---|---|---|---|
| `c` | Tipo de cotización destinado a pensiones | 16 % – 28,3 % | Más tipo, más saldo y más pensión nocional. Se muestra como rango |
| `g` | Crecimiento real del salario | 0 % – 2 % | Afecta a las dos tasas |
| `r_real` | Tipo nocional | por defecto igual a `g` | Si es menor que `g`, el sistema nocional rinde menos |
| `norma` | Tipo del divisor y de la indexación | 1,6 % | Más alto: divisor menor y pensión inicial mayor pero con menos revalorización |
| `sexo` | `H` o `M` | | Las mujeres viven más: divisor mayor y pensión nocional menor |
| `mejora` | Mejora anual de la mortalidad | 0 % – 2 % | Más longevidad, menos pensión nocional |
| `edad_inicio`, `anio_jub` | Como en M5 | | |

**Decisiones adoptadas:** el tipo nocional es igual al crecimiento salarial, la norma es del 1,6 % y
el esfuerzo contributivo se muestra como **rango** (16 % y 28,3 %).

## 6. Pruebas sugeridas y qué deberías ver (hombre, inicio a los 22, g = 1 %, c = 16 %, 2045)
| Caso | `e_ret` | `divisor_G` | `rr_ndc` | `rr_es` |
|---|---|---|---|---|
| Hombre, sin mejora | 19,0 | 16,4 | 41,9 % | 87,7 % |
| Hombre, mejora 1 % | 22,0 | 18,5 | 37,2 % | 87,7 % |
| Mujer, sin mejora | 23,0 | 19,2 | 35,8 % | 87,7 % |
| Mujer, mejora 1 % | 26,5 | 21,4 | 32,1 % | 87,7 % |

La TIR del sistema nocional sale del 1,0 % en los cuatro casos, igual a `g`. La del español sube con
la longevidad (3,5 % a 4,1 %), porque cobra durante más años por la misma cotización.

## 7. Limitaciones (importante)
- **La mortalidad es provisional**: todos los números dependen de ella. No interpretar como
  resultado final.
- **El 28,3 % es un límite superior** de lo que «corresponde» a pensiones, porque ese tipo
  financia también incapacidad temporal, maternidad y otras prestaciones.
- Sin topes ni lagunas, y sin mortalidad antes de jubilarse. No incluye pensiones de viudedad,
  incapacidad ni complementos.
- No incluye el mecanismo de equilibrio financiero del sistema sueco real, que ajusta el tipo
  nocional según la situación del sistema.
- La TIR compara solo la pensión de jubilación de una persona. No dice nada del conjunto del sistema
  ni de su equilibrio financiero.

## 8. Cómo ejecutarlo
`python test_m6.py` (7 comprobaciones) y `python m6_nocional.py` (tabla de 12 escenarios y
`m6_resultados.csv`). Para pruebas propias, `comparar(p, rel, g, edad_inicio, anio_jub, c, sexo, mejora)`.
