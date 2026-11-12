# M2 · Cotizantes y bases de cotización (v0)

## 1. Qué responde
¿Cuántas personas estarán afiliadas y cotizando en los próximos años si cambia la demografía, y cuánto cotizarían en conjunto? Es la otra mitad de la ecuación de las pensiones: M3 cuenta las pensiones, M2 cuenta a quienes las financian.

## 2. Cómo funciona
Para cada sexo y tramo de edad se toma la proporción de personas afiliadas (o cotizantes del Régimen General) en 2025 y se aplica a la población que proyecta M1. Si la población de un tramo baja, bajan sus cotizantes. La base de cotización media de cada tramo, observada en 2025, crece cada año con el salario real (g) y los precios (IPC). La recaudación de contingencias comunes del Régimen General es la base total por el tipo vigente (28,3 %: 23,6 % empresa y 4,7 % trabajador).

## 3. Resultados de referencia (g = 1 %, IPC = 2 %, tasas constantes)
- Afiliados (todos los regímenes, diciembre): 22,0 M en 2026, 22,9 M en 2035, 21,9 M en 2050.
- Cotizantes del Régimen General: 17,2 M en 2026, 17,8 M en 2035, 17,0 M en 2050.
- Recaudación de contingencias comunes del Régimen General: 138 mil M€ en 2026, 186 mil M€ en 2035, 280 mil M€ en 2050 (euros nominales).
- Afiliados por pensión (con M3): 2,09 en 2026, 1,78 en 2035, 1,39 en 2050.
- Contraste con el Ageing Report 2024 (índice de cotizantes por pensionista, 2026 = 100): diferencias de –2,1 pp (2030), –2,0 pp (2035), –1,0 pp (2040) y +3,6 pp (2050). Coinciden en la forma; el modelo baja algo menos al final.

## 4. Cómo interpretar los resultados
- Con tasas constantes, el número de cotizantes sigue a la población en edad de trabajar. No es una previsión del empleo: responde «qué pasaría si cada edad se comportara como en 2025».
- El indicador clave es afiliados por pensión: cada pensión cuenta con menos afiliados detrás según avanza el tiempo.
- La recaudación crece sobre todo por salarios y precios, no por más cotizantes. En euros reales de 2025 la base sube de 477 a 602 mil M€ entre 2026 y 2050.
- «Cotizantes del RG» y «afiliados» no son lo mismo: los afiliados incluyen autónomos y demás regímenes y se miden en diciembre; los cotizantes del RG son media anual.
- La recaudación no es el ingreso total de la Seguridad Social: solo cubre contingencias comunes del Régimen General y sirve como orden de magnitud (M4 lo completará).

## 5. Variables
Entradas por tramo: tasa de afiliación (diciembre 2025 ÷ población), tasa de cotización del RG (media anual 2025 ÷ población), base media mensual 2025, tipo de cotización. Salidas por año: afiliados, cotizantes del RG, base total, recaudación, base total en euros reales de 2025, afiliados por pensión.

## 6. Datos de entrada
`data/sistema/afiliados-sexo-edad.csv`, `data/macro/base-media-cotizacion-rg-mensual.csv`, `data/parametros` (tipos de cotización), población proyectada de M1, pensiones de M3 y Ageing Report 2024 para contrastar.

## 7. Qué se puede modificar
- g e IPC: solo cambian importes, no personas.
- Palancas de M1: fecundidad, mortalidad, migración. La migración pesa mucho: sin migración habría 16,1 M de afiliados en 2050; con la mitad, 19,0 M; con fecundidad +20 %, 22,1 M.
- Convergencia de mujeres (0 a 1): en 2050 las mujeres de 25 a 64 años alcanzan las tasas de los hombres de su tramo; con 1, 22,8 M de afiliados.
- Tasa de 55 a 64 años (×1,1 en 2050): 22,3 M de afiliados.
- Tasa global (×1,05 en 2050): 23,0 M de afiliados.
- Los cambios llegan de forma lineal hasta 2050.

## 8. Limitaciones
Tasas constantes sin ciclo económico ni paro; autónomos y otros regímenes solo en los afiliados totales, sin su recaudación; sin topes de base ni bases mínimas por persona; la base media no cambia por la composición por edades salvo por el peso de cada tramo; legislación actual congelada; más allá de 2050 es ilustrativo.

## 9. Contrastes y pendiente
Contraste con el Ageing Report 2024 hecho (punto 3). Pendiente: incorporar el RETA, calibrar las tasas con la EPA y conectar con M4 (saldo financiero).
