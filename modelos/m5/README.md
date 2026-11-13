# M5 v0 · Tasa de reposición por cohortes

## Preparación (una sola vez)
1. Clona el repositorio junto a esta carpeta:  `git clone https://github.com/Exequ/Pensiones`
   (más adelante: `git pull` para traer los datos nuevos de Claude Code).
2. Instala pandas:  `pip install pandas`

Estructura esperada:
```
trabajo/
├── Pensiones/          <- repositorio (los datos están en Pensiones/data/parametros)
└── m5/                 <- esta carpeta (m5_reposicion.py, test_m5.py)
```

## Uso
```
cd m5
python m5_reposicion.py ../Pensiones/data/parametros      # tabla de ejemplo y m5_resultados.csv
python test_m5.py                                         # tests
```

## Cómo usarlo desde Python
```python
from m5_reposicion import Parametros, simular, tabla
p = Parametros.desde_repo("../Pensiones/data/parametros")
simular(rel=1.0, g=0.01, edad_inicio=25, anio_jub=2045, p=p)
```

## Qué lee de /data/parametros
edad-ordinaria-jubilacion, carrera-jubilacion-65, periodo-calculo-base-reguladora,
divisor-base-reguladora, escala-porcentajes-jubilacion. Nada de las reglas está escrito a mano,
salvo el fin de la opción de 25 años (2040), que Claude Code aún no ha estructurado en /data.

## Limitaciones de la v0 (ver cabecera de m5_reposicion.py)
Sin topes (base máxima, pensión máxima y mínima), sin lagunas, sin jubilación anticipada o demorada,
euros constantes. Por eso el resultado no depende todavía del salario relativo: es lineal.
Los topes y la pensión mínima (Fase 1A parte 2) son los que harán aparecer las diferencias entre niveles.

## M5 v2 (corrige tres defectos de v1)
`m5_v2.py` sustituye a `m5_v1.py` (que se conserva sin cambios). Misma interfaz que v1 (`ParamsV2.desde_repo(...)` y `simular(...)`) con tres correcciones: la ventana de la base reguladora excluye el mes previo al hecho causante, las lagunas anteriores a la primera alta se integran con la base mínima, y la edad de jubilación (65 o la ordinaria) se decide con los meses cotizados y no con los potenciales. Además lee la carencia y el periodo previo de `data/parametros` (estado `no-causa-derecho`) y admite la integración reforzada de lagunas (DT 41.ª) como opción apagada por defecto.

```
python -m pytest -q test_m5.py test_m5_v1.py test_m5_v2.py test_m6.py     # 50 tests
python m5_v2.py ../../data/parametros                                      # tabla de ejemplo y m5_v2_resultados.csv
python casos_oro_m5.py ../../data/parametros                               # regenera casos_oro_m5.json (51 casos, M5 v2)
```
Tras regenerar los casos de oro hay que copiar `casos_oro_m5.json` a `data-raw/casos-oro/` para el contraste con el motor TypeScript.
