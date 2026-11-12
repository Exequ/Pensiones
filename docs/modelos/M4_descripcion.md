# M4 · Modelo financiero del sistema (v1)

## 1. Qué responde
¿Cuánto costarán las pensiones contributivas, cuánto ingresará el sistema y qué saldo queda, con la legislación actual congelada? Y: ¿cuánto aguanta el Fondo de Reserva? Junta los tres modelos anteriores: número de pensiones (M3), cotizantes y bases (M2) y población (M1).

## 2. Cómo funciona
- **Gasto en pensiones** = número de pensiones de cada clase (jubilación, viudedad, incapacidad, orfandad, favor de familiares) × pensión media × 14 pagas. Cada año todas las pensiones se revalorizan con el IPC; salen las bajas y entran las altas con una pensión algo mayor (las personas que se jubilan han cotizado más y mejor que las que fallecen). Por eso la pensión media sube algo más que los precios, en torno a un punto al año. En la v1, la pensión de las altas de jubilación sigue además las reglas de cálculo del modelo M5 (opción de 25 años hasta 2043, topes de base y de pensión máxima, actualización de las bases con los precios).
- **Ingresos** = cotizaciones de 2025 escaladas con la masa de bases de M2, más el MEI (cotización extra que sube del 0,8 % de 2025 al 1,2 % en 2029 y se mantiene hasta 2050), más transferencias del Estado y otros ingresos.
- **Saldo** = ingresos − gasto en pensiones − resto de gastos (bajas por enfermedad, maternidad, pensiones no contributivas, Ingreso Mínimo Vital, personal...).
- **Fondo de Reserva**: lo nutre el MEI. Desde 2033 puede cubrir déficit con un límite legal anual en porcentaje del PIB (del 0,10 % en 2033 al 0,91 % en 2047). Lo que no cubre el Fondo aparece como «financiación adicional».
- Calibrado con la ejecución presupuestaria de 2025: el modelo reproduce el gasto en pensiones por clase y el saldo de ese año.

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

## 5. Variables
Entradas: pensiones por clase (M3), afiliados y masa de bases (M2), pensión media 2026, altas y bajas de 2025, gasto e ingresos de 2025, tipo MEI, límite de disposición del Fondo, valor del Fondo a fin de 2025 (14.070 M€). Salidas por año: gasto, cotizaciones, MEI, saldos (en M€ y en % del PIB), disposición y valor del Fondo, financiación adicional, afiliados por pensión.

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
- Transferencias del Estado como % del PIB, rentabilidad del Fondo, y si el Fondo se usa o no.

## 8. Limitaciones
Legislación congelada; autónomos solo dentro de los totales; sin ciclo económico; el resto de gastos y las transferencias del Estado van con el PIB sin depender de la demografía; la pensión de las altas sigue a M5 solo para dos perfiles de carrera (una central y una topada) y no para la distribución real de salarios de quien se jubila; M5 no reproduce la caída de la tasa de reposición que supone el Ageing Report (77 % a 65 %); el MEI solo hasta 2050; más allá de 2050 no se calcula.

## 9. Contrastes y pendiente
Contraste con el Ageing Report hecho (punto 3): M4 resulta más caro. Candidatos para la diferencia, no verificados: la caída de la tasa de reposición que supone el Ageing Report (M5 no la reproduce) y el crecimiento del PIB. Pendiente: calibrar la distribución de salarios de las altas, incorporar el RETA, y las proyecciones a 2076.
