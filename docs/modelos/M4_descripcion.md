# M4 · Modelo financiero del sistema (v1)

## 1. Qué responde
¿Cuánto costarán las pensiones contributivas, cuánto ingresará el sistema y qué saldo queda, con la legislación actual congelada? Y: ¿cuánto aguanta el Fondo de Reserva? Junta los tres modelos anteriores: número de pensiones (M3), cotizantes y bases (M2) y población (M1).

## 2. Cómo funciona
- **Gasto en pensiones** = número de pensiones de cada clase (jubilación, viudedad, incapacidad, orfandad, favor de familiares) × pensión media × 14 pagas × un factor de calibración de cada clase. Cada año todas las pensiones se revalorizan con el IPC; salen las bajas y entran las altas con una pensión algo mayor (las personas que se jubilan han cotizado más y mejor que las que fallecen). Por eso la pensión media sube algo más que los precios, en torno a un punto al año. En la v1, la pensión de las altas de jubilación sigue además las reglas de cálculo del modelo M5 (opción de 25 años hasta 2043, topes de base y de pensión máxima, actualización de las bases con los precios).
- **Factor de calibración (devengo).** Multiplicar pensiones por pensión media por 14 da un 5,2 % más que el gasto en pensiones que declara el presupuesto de 2025. El modelo corrige cada clase con el cociente de 2025 (jubilación 0,956, viudedad 0,913, incapacidad 0,961, orfandad 0,858, favor de familiares 0,914; 0,948 en conjunto) y lo mantiene constante. Hipótesis sobre su origen: el presupuesto contabiliza aparte los complementos a mínimos (8.707 M€ en 2025), y con ellos sumados el cociente sube a 0,993, así que los números cuadran con que la pensión media estadística los incluya; está pendiente de confirmar en la metodología de la fuente. El resto de la diferencia (0,7 %) sería el desfase entre contar las pensiones a 1 de diciembre y el promedio del año. Si la hipótesis es cierta, los complementos a mínimos pasan al «resto de gastos», que crece con el PIB y no con el número de pensiones.
- **Ingresos** = cotizaciones, más transferencias del Estado y otros ingresos. Las cotizaciones **ya incluyen el MEI** (en el presupuesto el MEI es una partida de las cotizaciones sociales): las cotizaciones sin MEI de 2025 se escalan con la masa de bases de M2, y el MEI se calcula aparte con su tipo legal (del 0,8 % de 2025 al 1,2 % en 2029, constante hasta 2050) sobre esa misma base. La columna «mei» del CSV es un desglose de las cotizaciones, no un ingreso adicional. La cotización adicional que se pruebe como palanca también se suma a las cotizaciones.
- **Saldo** = ingresos − gasto en pensiones − resto de gastos (bajas por enfermedad, maternidad, complementos a mínimos, pensiones no contributivas, Ingreso Mínimo Vital, personal...). Se muestran tres medidas: «cotizaciones − pensiones», «saldo sin transferencias» (cotizaciones − pensiones − resto de gastos, es decir, sin las transferencias del Estado ni otros ingresos) y «saldo no financiero» (con todo).
- **Fondo de Reserva**: lo nutre el MEI (la dotación es una proporción constante del MEI, la de 2025). Desde 2033 puede cubrir déficit con un límite legal anual en porcentaje del PIB (del 0,10 % en 2033 al 0,91 % en 2047). La necesidad de cada año es el déficit una vez descontada la dotación; lo que el Fondo no cubre aparece como «financiación adicional» (necesidad menos disposición).
- Calibrado con la ejecución presupuestaria de 2025: el modelo reproduce el gasto en pensiones por clase (por construcción, con el factor anterior) y el saldo de ese año.

## 3. Resultados de referencia (g = 1 %, IPC = 2 %, legislación congelada)
| | 2026 | 2035 | 2040 | 2050 |
|---|---|---|---|---|
| Gasto en pensiones contributivas, % del PIB | 11,0 | 12,8 | 14,2 | 16,1 |
| Cotizaciones − pensiones, % del PIB | −0,5 | −2,3 | −3,6 | −5,5 |
| Saldo no financiero, % del PIB | −0,6 | −2,4 | −3,7 | −5,6 |
| Fondo de Reserva, mil M€ | 19 | 91 | 122 | 26 |

- Gasto en euros nominales: 193 mil M€ en 2026, 305 en 2035, 387 en 2040 y 575 en 2050.
- Pensión media de todas las clases: 1.376 €/mes en 2026 y 2.745 €/mes en 2050, en euros nominales con IPC del 2 % anual.
- Fondo de Reserva: crece hasta 2040 gracias al MEI, y desde 2033 se usa. En 2050 quedan 26 mil M€, menos que la disposición de ese año (29 mil M€), así que se agotaría poco después.
- **Contraste con el Ageing Report 2024** (gasto sobre PIB, índice 2026 = 100): M4 da 129 en 2040 y 147 en 2050; el Ageing Report, 117 y 125. M4 proyecta un coste más alto. Con crecimiento real de salarios de 1,8 % (la productividad que supone el Ageing Report a largo plazo) baja a 135 en 2050. Enlazar la pensión de las altas con M5 apenas cambia el resultado (menos de 0,1 puntos del PIB en 2050): para una carrera normal, M5 da una tasa de reposición estable entre generaciones, mientras que el Ageing Report supone que cae de 77 % a 65 %. Esa diferencia de supuestos explica buena parte de la brecha, aunque no se ha podido comprobar con los datos disponibles. Los niveles no son comparables: el Ageing Report incluye clases pasivas y otros regímenes públicos (13,7 % del PIB en 2025 frente al 10,8 % de M4).

## 4. Cómo interpretar los resultados
- «Con legislación actual congelada» no es una predicción: dice qué pasaría si no se reformara nada y la economía siguiera las hipótesis elegidas. Un resultado de −5,6 % del PIB es un aviso de tensión, no un pronóstico.
- La mayor parte del aumento del gasto en % del PIB viene de más pensiones (+49 % hasta 2050), no de pensiones más altas en términos reales.
- El saldo «cotizaciones − pensiones» se parece a la medida del Ageing Report (−0,4 % del PIB en 2025, M4 −0,3 % en 2025). El «saldo no financiero» añade el resto de gastos e ingresos del sistema.
- Las cifras en euros son nominales (con inflación); las comparaciones entre años se leen mejor en porcentaje del PIB.
- El PIB es un indicador aproximado: afiliados × salario nominal. No es una previsión macroeconómica.
- Fiabilidad de M4: media. Hereda la incertidumbre de M2 (cotizantes y bases, fiabilidad baja), de M1 y de M3. La calibración con 2025 asegura el punto de partida, no la trayectoria.

## 5. Variables
**Entradas:** pensiones por clase (M3), afiliados y masa de bases (M2), pensión media 2026, altas y bajas de 2025, gasto e ingresos de 2025, tipo MEI, límite de disposición del Fondo y valor del Fondo a fin de 2025 (14.070 M€, a precio de adquisición).

**Columnas del CSV de salida** (millones de euros corrientes, salvo indicación):
| Columna | Qué es |
|---|---|
| `pensiones_oct` | Número de pensiones de las cinco clases (M3, octubre del año). |
| `pension_media_jub`, `pension_media_total` | Pensión media mensual de jubilación y de todas las clases (euros al mes). |
| `gasto_pensiones` | Gasto en pensiones contributivas (con el factor de calibración, por eso no es exactamente pensiones × pensión media × 14). |
| `cotizaciones` | Cotizaciones sociales, **incluido el MEI**. |
| `mei` | Parte de las cotizaciones que corresponde al MEI (desglose). |
| `otros_gastos` | Resto de gastos del sistema (puede incluir los complementos a mínimos; ver sección 2); crece con el PIB o con los precios, según se elija. |
| `transferencias_y_otros` | Transferencias del Estado y otros ingresos que no son cotizaciones. Se mantienen en el % del PIB de 2025. |
| `saldo_cotizaciones_menos_pensiones` | Cotizaciones − gasto en pensiones. |
| `saldo_sin_transferencias` | Cotizaciones − gasto en pensiones − otros gastos: el saldo sin transferencias del Estado ni otros ingresos. |
| `saldo_no_financiero` | Saldo con todos los ingresos y gastos: `saldo_sin_transferencias` + `transferencias_y_otros`. |
| `dotacion_fondo`, `disposicion_fondo`, `fondo_reserva` | Dinero que entra al Fondo (parte del MEI), dinero que sale (hasta el límite legal desde 2033) y valor a fin de año. |
| `financiacion_adicional` | Déficit que el Fondo no cubre. |
| `pib_proxy` | PIB aproximado: afiliados × salario nominal. |
| `…_pct_pib` | Los importes anteriores divididos por `pib_proxy`, en %. |
| `afiliados_por_pension` | Afiliados (M2) entre pensiones (M3). |

**Fondo de Reserva.** El valor de partida es el de precio de adquisición del informe a las Cortes; después crece con una rentabilidad nominal anual constante del 2 % sobre el saldo del año anterior, más la dotación y menos la disposición. No es valor de mercado, y mezcla las dos bases: la rentabilidad real puede ser distinta.

## 6. Datos de entrada
`data/sistema` (ejecución presupuestaria 2025, pensiones en vigor, altas y bajas, Fondo de Reserva), `data/parametros` (MEI y límite del Fondo), `data/macro/pib-ine.json`, y el Ageing Report 2024 para contrastar.

## 7. Qué se puede modificar
- Crecimiento real de salarios (g) e IPC. Con g = 1,5 %, el gasto de 2050 baja al 15,2 % del PIB y el saldo a −4,7 %.
- Revalorización: puntos sobre el IPC (−0,5 puntos: gasto 15,2 % y saldo −4,7 % en 2050).
- Cotización adicional (puntos): +1 punto sube el saldo de 2050 de −5,6 % a −5,3 % (llega de forma gradual hasta 2030).
- Pensión de las altas (factor): más generosa o menos. Parte de las altas con carrera de salarios altos que llega a la pensión máxima (de 0 a 1): con un 20 % de altas topadas, el gasto de 2050 baja del 16,1 % al 15,9 % del PIB, porque la pensión máxima sube con el IPC más 0,115 puntos, menos que los salarios.
- Enlace con M5: se puede desactivar para volver a la v0.
- Demografía (M1): sin migración, el gasto de 2050 sube al 21,5 % del PIB y el saldo cae a −11 %. Con fecundidad +20 %, apenas cambia (16,1 % y −5,6 %).
- Empleo (M2): convergencia de las mujeres (gasto 15,5 %, saldo −5,2 %) o más empleo de 55 a 64 años (15,9 % y −5,4 %).
- Transferencias del Estado como % del PIB, rentabilidad del Fondo (2 % nominal por defecto), si el Fondo se usa o no, y si el resto de gastos crece con el PIB o con los precios.

## 8. Limitaciones
Legislación congelada; autónomos solo dentro de los totales; sin ciclo económico; el resto de gastos (que quizá incluya los complementos a mínimos) y las transferencias del Estado van con el PIB sin depender de la demografía; el factor de calibración de cada clase se mantiene constante; la pensión de las altas sigue a M5 solo para dos perfiles de carrera (una central y una topada) y no para la distribución real de salarios de quien se jubila; M5 no reproduce la caída de la tasa de reposición que supone el Ageing Report (77 % a 65 %); el MEI solo hasta 2050; el Fondo parte de un valor a precio de adquisición y crece con una rentabilidad constante; la salida empieza en 2026 y tiene un solo escenario; más allá de 2050 no se calcula.

## 9. Contrastes y pendiente
Contraste con el Ageing Report hecho (punto 3): M4 resulta más caro. Candidatos para la diferencia, no verificados: la caída de la tasa de reposición que supone el Ageing Report (M5 no la reproduce) y el crecimiento del PIB. Pendiente: calibrar la distribución de salarios de las altas, incorporar el RETA, las proyecciones a 2076, publicar la fila de 2025 y escenarios alternativos, y confirmar que la pensión media estadística incluye el complemento a mínimos.